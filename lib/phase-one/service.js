import 'server-only';

import JSZip from 'jszip';
import { randomUUID } from 'node:crypto';

import { generateStructured, listModels } from './ai.js';
import {
  ARTICLE_SCHEMA,
  CHANNEL_MAP,
  CHANNELS,
  POST_STATUSES,
  PROVIDERS,
  PUBLICATION_STATUSES,
  TOPIC_SCHEMA,
} from './constants.js';
import { decryptSecret, encryptSecret, last4 } from './crypto.js';
import {
  createMockArticleResult,
  createMockTopicResult,
  scoreGeneratedContent,
} from './mock.js';
import { mutateState, readState } from './store.js';
import {
  ensureChannelVariants,
  excerptFromBody,
  formatChannels,
  formatLanguageMode,
  languageModeToList,
  normalizeListInput,
  renderTemplate,
  resolveLanguageMode,
  resolveProviderAndModel,
  trimBodyText,
  validateTemplateVariables,
} from './templates.js';

function makeId(prefix) {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function getProduct(state, productId) {
  const product = state.products.find((item) => item.id === productId);
  ensure(product, 'Không tìm thấy sản phẩm.');
  return product;
}

function getPost(state, postId) {
  const post = state.posts.find((item) => item.id === postId);
  ensure(post, 'Không tìm thấy bài viết.');
  return post;
}

function getBatch(state, batchId) {
  const batch = state.topicBatches.find((item) => item.id === batchId);
  ensure(batch, 'Không tìm thấy batch chủ đề.');
  return batch;
}

function getCredential(state, provider) {
  const credential = state.workspace.providerCredentials[provider];
  ensure(credential, 'Provider không hợp lệ.');
  return credential;
}

function publicCredential(credential) {
  return {
    provider: credential.provider,
    hasKey: Boolean(credential.encryptedKey),
    keyLast4: credential.keyLast4,
    updatedAt: credential.updatedAt,
  };
}

function buildVariables({ workspace, product, quantity, topic, additionalContext, notes, requirements }) {
  const languageMode = resolveLanguageMode(workspace, product);
  return {
    quantity: quantity ? String(quantity) : '',
    product_name: product.name,
    product_context: product.brandContext,
    languages: formatLanguageMode(languageMode),
    topic: topic?.title || '',
    additional_context: additionalContext || '',
    notes: notes || '',
    requirements: requirements || '',
    channels: formatChannels(product.channels),
    brand_voice: product.brandVoice,
    preferred_words: product.preferredWords,
    avoided_words: product.avoidedWords,
  };
}

function createPublicationRecords(channelIds, existingRecords) {
  const byChannel = new Map((existingRecords || []).map((record) => [record.channel, record]));
  return channelIds.map((channelId) => {
    const current = byChannel.get(channelId);
    return {
      id: current?.id || makeId('pub'),
      channel: channelId,
      scheduledFor: current?.scheduledFor || '',
      publishedAt: current?.publishedAt || '',
      status: current?.status || 'unscheduled',
    };
  });
}

function normalizeCurrentContent(product, currentContent) {
  const normalizedLanguages = (currentContent?.languages || []).map((block) => ({
    language: block.language,
    title: block.title || '',
    audience: block.audience || '',
    body: block.body || '',
    hashtags: Array.isArray(block.hashtags)
      ? block.hashtags.filter(Boolean)
      : normalizeListInput(block.hashtags || ''),
    seo: {
      primary_keyword: block.seo?.primary_keyword || '',
      meta_title: block.seo?.meta_title || '',
      meta_description: block.seo?.meta_description || '',
    },
    cta: block.cta || '',
    channel_variants: ensureChannelVariants(block.channel_variants, product.channels),
  }));

  return {
    languages: normalizedLanguages,
  };
}

function summarizePublication(post) {
  const planned = post.publicationRecords.filter((record) => record.status === 'planned').length;
  const published = post.publicationRecords.filter((record) => record.status === 'published').length;
  return { planned, published };
}

function derivePostStatus(post) {
  const summary = summarizePublication(post);
  if (summary.published > 0) {
    return 'published';
  }
  if (summary.planned > 0) {
    return 'scheduled';
  }
  return post.status;
}

function firstLanguageBody(post) {
  return post.currentContent?.languages?.[0]?.body || post.topic.angle || '';
}

function serializeState(state) {
  const productById = new Map(state.products.map((product) => [product.id, product]));
  const postsByTopic = new Map(state.posts.map((post) => [post.sourceTopicId, post]));

  const products = state.products.map((product) => {
    const languageMode = resolveLanguageMode(state.workspace, product);
    const { provider, model } = resolveProviderAndModel(state.workspace, product);

    return {
      ...product,
      resolvedLanguageMode: languageMode,
      resolvedLanguages: languageModeToList(languageMode),
      resolvedProvider: provider,
      resolvedModel: model,
      stats: {
        posts: state.posts.filter((post) => post.productId === product.id).length,
        batches: state.topicBatches.filter((batch) => batch.productId === product.id).length,
      },
    };
  });

  const topicBatches = [...state.topicBatches]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((batch) => {
      const product = productById.get(batch.productId);
      return {
        ...batch,
        productName: product?.name || 'Unknown product',
        selectedToPost: batch.topics.filter((topic) => postsByTopic.has(topic.id)).length,
      };
    });

  const posts = [...state.posts]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((post) => {
      const product = productById.get(post.productId);
      const languageMode = product ? resolveLanguageMode(state.workspace, product) : state.workspace.defaultLanguageMode;
      const { provider, model } = product
        ? resolveProviderAndModel(state.workspace, product)
        : state.workspace.aiSettings;

      return {
        ...post,
        currentContent: normalizeCurrentContent(
          product || { channels: [] },
          post.currentContent || { languages: [] },
        ),
        productName: product?.name || 'Unknown product',
        channels: product?.channels || [],
        resolvedLanguageMode: languageMode,
        resolvedLanguages: languageModeToList(languageMode),
        resolvedProvider: provider,
        resolvedModel: model,
        excerpt: excerptFromBody(firstLanguageBody(post) || post.topic.angle),
        publicationSummary: summarizePublication(post),
      };
    });

  const generationRuns = [...state.generationRuns]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 20)
    .map((run) => ({
      ...run,
      productName: productById.get(run.productId)?.name || 'Unknown product',
    }));

  return {
    workspace: {
      ...state.workspace,
      providerCredentials: Object.fromEntries(
        Object.entries(state.workspace.providerCredentials).map(([provider, credential]) => [
          provider,
          publicCredential(credential),
        ]),
      ),
    },
    products,
    topicBatches,
    posts,
    generationRuns,
    meta: state.meta,
  };
}

function validateProductInput(input) {
  const name = (input.name || '').trim();
  const channels = [...new Set((input.channels || []).filter((channelId) => CHANNEL_MAP[channelId]))];

  ensure(name, 'Tên sản phẩm là bắt buộc.');
  ensure(channels.length > 0, 'Cần chọn ít nhất một kênh nội dung.');
  ensure(!input.languageOverride || ['vi', 'vi_en'].includes(input.languageOverride), 'Ngôn ngữ override không hợp lệ.');
  ensure(!input.providerOverride || PROVIDERS.some((provider) => provider.id === input.providerOverride), 'Provider override không hợp lệ.');

  validateTemplateVariables(input.promptTemplates.topic.content);
  validateTemplateVariables(input.promptTemplates.article.content);

  return {
    name,
    channels,
    languageOverride: input.languageOverride || null,
    providerOverride: input.providerOverride || null,
    modelOverride: (input.modelOverride || '').trim(),
    brandContext: (input.brandContext || '').trim(),
    brandVoice: (input.brandVoice || '').trim(),
    preferredWords: (input.preferredWords || '').trim(),
    avoidedWords: (input.avoidedWords || '').trim(),
    promptTemplates: {
      topic: {
        id: input.promptTemplates.topic.id || makeId('tmpl_topic'),
        kind: 'topic',
        content: input.promptTemplates.topic.content,
        updatedAt: nowIso(),
      },
      article: {
        id: input.promptTemplates.article.id || makeId('tmpl_article'),
        kind: 'article',
        content: input.promptTemplates.article.content,
        updatedAt: nowIso(),
      },
    },
  };
}

function sanitizeStatus(status) {
  ensure(POST_STATUSES.includes(status), 'Trạng thái bài viết không hợp lệ.');
  return status;
}

function sanitizePublicationRecords(channelIds, publicationRecords) {
  const records = createPublicationRecords(channelIds, publicationRecords);
  return records.map((record) => {
    ensure(PUBLICATION_STATUSES.includes(record.status), 'Trạng thái lịch đăng không hợp lệ.');
    return {
      ...record,
      scheduledFor: record.status === 'planned' ? record.scheduledFor || '' : '',
      publishedAt:
        record.status === 'published'
          ? record.publishedAt || new Date().toISOString().slice(0, 16)
          : '',
    };
  });
}

export async function getHydratedState() {
  return serializeState(await readState());
}

export async function updateWorkspace(payload) {
  await mutateState((state) => {
    ensure(['vi', 'vi_en'].includes(payload.defaultLanguageMode), 'Ngôn ngữ mặc định không hợp lệ.');
    ensure(PROVIDERS.some((provider) => provider.id === payload.provider), 'Provider mặc định không hợp lệ.');

    state.workspace.name = (payload.name || state.workspace.name).trim() || state.workspace.name;
    state.workspace.timezone = (payload.timezone || state.workspace.timezone).trim() || state.workspace.timezone;
    state.workspace.defaultLanguageMode = payload.defaultLanguageMode;
    state.workspace.aiSettings.provider = payload.provider;
    state.workspace.aiSettings.model = (payload.model || '').trim() || state.workspace.aiSettings.model;
    state.workspace.updatedAt = nowIso();
  });

  return getHydratedState();
}

export async function saveProviderCredential(payload) {
  ensure(PROVIDERS.some((provider) => provider.id === payload.provider), 'Provider không hợp lệ.');

  await mutateState((state) => {
    const credential = getCredential(state, payload.provider);
    const secret = (payload.apiKey || '').trim();

    credential.encryptedKey = secret ? encryptSecret(secret) : null;
    credential.keyLast4 = last4(secret);
    credential.updatedAt = nowIso();
  });

  return getHydratedState();
}

export async function loadProviderModels(provider) {
  const state = await readState();
  const credential = getCredential(state, provider);
  const apiKey = decryptSecret(credential.encryptedKey);
  return listModels({ provider, apiKey });
}

export async function upsertProduct(input) {
  const normalized = validateProductInput(input);

  await mutateState((state) => {
    const existing = state.products.find((product) => product.id === input.id);
    if (existing) {
      Object.assign(existing, normalized, {
        id: existing.id,
        updatedAt: nowIso(),
      });
      return;
    }

    state.products.unshift({
      id: makeId('product'),
      ...normalized,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  });

  return getHydratedState();
}

export async function removeProduct(productId) {
  await mutateState((state) => {
    const index = state.products.findIndex((product) => product.id === productId);
    ensure(index >= 0, 'Không tìm thấy sản phẩm để xoá.');
    state.products.splice(index, 1);
    state.topicBatches = state.topicBatches.filter((batch) => batch.productId !== productId);
    state.posts = state.posts.filter((post) => post.productId !== productId);
    state.generationRuns = state.generationRuns.filter((run) => run.productId !== productId);
  });

  return getHydratedState();
}

export async function createTopicBatch(payload) {
  ensure(Number.isInteger(payload.quantity) && payload.quantity >= 1 && payload.quantity <= 50, 'Số lượng chủ đề phải từ 1 đến 50.');

  const prepared = await mutateState((state) => {
    const product = getProduct(state, payload.productId);
    const { provider, model } = resolveProviderAndModel(state.workspace, product);
    const credential = getCredential(state, provider);
    const runId = makeId('run');
    const promptVariables = buildVariables({
      workspace: state.workspace,
      product,
      quantity: payload.quantity,
      additionalContext: payload.additionalContext,
      notes: payload.notes,
      requirements: payload.requirements,
    });
    const promptSnapshot = renderTemplate(product.promptTemplates.topic.content, promptVariables);

    state.generationRuns.unshift({
      id: runId,
      type: 'topic',
      status: 'pending',
      workspaceId: state.workspace.id,
      productId: product.id,
      batchId: null,
      postId: null,
      provider,
      model,
      promptSnapshot,
      outputSnapshot: null,
      usage: null,
      error: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    return {
      workspace: state.workspace,
      product,
      runId,
      provider,
      model,
      promptSnapshot,
      apiKey: decryptSecret(credential.encryptedKey),
      input: {
        quantity: payload.quantity,
        additionalContext: payload.additionalContext || '',
        notes: payload.notes || '',
        requirements: payload.requirements || '',
      },
    };
  });

  const fallbackData = createMockTopicResult({
    product: prepared.product,
    quantity: prepared.input.quantity,
    additionalContext: prepared.input.additionalContext,
    notes: prepared.input.notes,
    requirements: prepared.input.requirements,
  });

  try {
    const result = await generateStructured({
      provider: prepared.provider,
      model: prepared.model,
      apiKey: prepared.apiKey,
      schemaName: 'topic_batch',
      schema: TOPIC_SCHEMA,
      system: 'You are a senior content strategist. Return valid JSON only.',
      prompt: prepared.promptSnapshot,
      fallbackData,
    });

    const batchId = makeId('batch');

    await mutateState((state) => {
      const run = state.generationRuns.find((item) => item.id === prepared.runId);
      if (run) {
        run.status = 'completed';
        run.batchId = batchId;
        run.outputSnapshot = result.data;
        run.usage = result.usage;
        run.updatedAt = nowIso();
      }

      state.topicBatches.unshift({
        id: batchId,
        productId: prepared.product.id,
        quantity: prepared.input.quantity,
        additionalContext: prepared.input.additionalContext,
        notes: prepared.input.notes,
        requirements: prepared.input.requirements,
        status: 'completed',
        topics: (result.data.topics || []).map((topic) => ({
          id: makeId('topic'),
          title: topic.title,
          angle: topic.angle,
        })),
        promptSnapshot: prepared.promptSnapshot,
        generationRunId: prepared.runId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    });
  } catch (error) {
    await mutateState((state) => {
      const run = state.generationRuns.find((item) => item.id === prepared.runId);
      if (run) {
        run.status = 'failed';
        run.error = error.message;
        run.updatedAt = nowIso();
      }
    });
    throw error;
  }

  return getHydratedState();
}

export async function materializeTopics(payload) {
  ensure(Array.isArray(payload.topicIds) && payload.topicIds.length > 0, 'Cần chọn ít nhất một chủ đề để lưu thành bài.');

  await mutateState((state) => {
    const batch = getBatch(state, payload.batchId);
    const product = getProduct(state, batch.productId);
    const selectedIds = new Set(payload.topicIds);

    for (const topic of batch.topics) {
      if (!selectedIds.has(topic.id)) {
        continue;
      }

      const existing = state.posts.find((post) => post.sourceTopicId === topic.id);
      if (existing) {
        continue;
      }

      state.posts.unshift({
        id: makeId('post'),
        productId: product.id,
        sourceBatchId: batch.id,
        sourceTopicId: topic.id,
        topic: {
          title: topic.title,
          angle: topic.angle,
        },
        status: 'idea',
        currentContent: { languages: [] },
        publicationRecords: createPublicationRecords(product.channels, []),
        score: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastExpandedAt: null,
        generationRunIds: [],
      });
    }
  });

  return getHydratedState();
}

export async function removeTopicFromBatch(batchId, topicId) {
  await mutateState((state) => {
    const batch = getBatch(state, batchId);
    const topicIndex = batch.topics.findIndex((topic) => topic.id === topicId);
    ensure(topicIndex >= 0, 'Không tìm thấy chủ đề trong batch.');
    ensure(
      !state.posts.some((post) => post.sourceTopicId === topicId),
      'Chủ đề đã lưu thành bài viết nên không thể xoá khỏi batch.',
    );

    batch.topics.splice(topicIndex, 1);
    batch.quantity = batch.topics.length;
    batch.updatedAt = nowIso();
  });

  return getHydratedState();
}

export async function expandPost(postId) {
  const prepared = await mutateState((state) => {
    const post = getPost(state, postId);
    const product = getProduct(state, post.productId);
    const batch = getBatch(state, post.sourceBatchId);
    const { provider, model } = resolveProviderAndModel(state.workspace, product);
    const credential = getCredential(state, provider);
    const runId = makeId('run');
    const variables = buildVariables({
      workspace: state.workspace,
      product,
      topic: post.topic,
      additionalContext: batch.additionalContext,
      notes: batch.notes,
      requirements: batch.requirements,
    });
    const promptSnapshot = renderTemplate(product.promptTemplates.article.content, variables);

    state.generationRuns.unshift({
      id: runId,
      type: 'article',
      status: 'pending',
      workspaceId: state.workspace.id,
      productId: product.id,
      batchId: batch.id,
      postId: post.id,
      provider,
      model,
      promptSnapshot,
      outputSnapshot: null,
      usage: null,
      error: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    return {
      product,
      post,
      batch,
      runId,
      provider,
      model,
      promptSnapshot,
      apiKey: decryptSecret(credential.encryptedKey),
      languages: languageModeToList(resolveLanguageMode(state.workspace, product)),
    };
  });

  const fallbackData = createMockArticleResult({
    product: prepared.product,
    languages: prepared.languages,
    topic: prepared.post.topic,
    channels: prepared.product.channels,
    additionalContext: prepared.batch.additionalContext,
    notes: prepared.batch.notes,
    requirements: prepared.batch.requirements,
  });

  try {
    const result = await generateStructured({
      provider: prepared.provider,
      model: prepared.model,
      apiKey: prepared.apiKey,
      schemaName: 'article_content',
      schema: ARTICLE_SCHEMA,
      system: 'You are a senior content editor. Return valid JSON only.',
      prompt: prepared.promptSnapshot,
      fallbackData,
    });

    await mutateState((state) => {
      const run = state.generationRuns.find((item) => item.id === prepared.runId);
      const post = getPost(state, postId);

      if (run) {
        run.status = 'completed';
        run.outputSnapshot = result.data;
        run.usage = result.usage;
        run.updatedAt = nowIso();
      }

      post.currentContent = normalizeCurrentContent(prepared.product, result.data);
      post.status = post.status === 'idea' ? 'draft' : post.status;
      post.score = scoreGeneratedContent(post.currentContent);
      post.lastExpandedAt = nowIso();
      post.updatedAt = nowIso();
      post.generationRunIds = [...new Set([prepared.runId, ...(post.generationRunIds || [])])];
    });
  } catch (error) {
    await mutateState((state) => {
      const run = state.generationRuns.find((item) => item.id === prepared.runId);
      if (run) {
        run.status = 'failed';
        run.error = error.message;
        run.updatedAt = nowIso();
      }
    });
    throw error;
  }

  return getHydratedState();
}

export async function updatePost(payload) {
  await mutateState((state) => {
    const post = getPost(state, payload.postId);
    const product = getProduct(state, post.productId);
    const currentContent = normalizeCurrentContent(product, payload.currentContent);
    const publicationRecords = sanitizePublicationRecords(product.channels, payload.publicationRecords);

    post.topic = {
      title: (payload.topic?.title || post.topic.title).trim(),
      angle: (payload.topic?.angle || post.topic.angle).trim(),
    };
    post.currentContent = currentContent;
    post.publicationRecords = publicationRecords;
    post.status = sanitizeStatus(payload.status);
    post.score = scoreGeneratedContent(currentContent);
    post.updatedAt = nowIso();

    const autoStatus = derivePostStatus(post);
    if (autoStatus !== post.status && ['scheduled', 'published'].includes(autoStatus)) {
      post.status = autoStatus;
    }
  });

  return getHydratedState();
}

export async function exportPostZip(postId) {
  const state = await readState();
  const post = getPost(state, postId);
  const product = getProduct(state, post.productId);
  const languageMode = resolveLanguageMode(state.workspace, product);
  const zip = new JSZip();

  const manifest = {
    exportedAt: nowIso(),
    workspace: {
      id: state.workspace.id,
      name: state.workspace.name,
      timezone: state.workspace.timezone,
    },
    product: {
      id: product.id,
      name: product.name,
      channels: product.channels,
      languageMode,
    },
    post: {
      id: post.id,
      topic: post.topic,
      status: post.status,
      score: post.score,
      publicationRecords: post.publicationRecords,
      updatedAt: post.updatedAt,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const seoSections = [];
  for (const languageBlock of post.currentContent.languages || []) {
    seoSections.push(`# ${languageBlock.language.toUpperCase()}`);
    seoSections.push(`- Primary keyword: ${languageBlock.seo.primary_keyword}`);
    seoSections.push(`- Meta title: ${languageBlock.seo.meta_title}`);
    seoSections.push(`- Meta description: ${languageBlock.seo.meta_description}`);
    seoSections.push(`- Hashtags: ${languageBlock.hashtags.join(', ')}`);
    seoSections.push(`- CTA: ${languageBlock.cta}`);
    seoSections.push('');

    for (const variant of languageBlock.channel_variants) {
      const channelName = CHANNEL_MAP[variant.channel]?.label || variant.channel;
      const filePath = `${languageBlock.language}/${variant.channel}.md`;
      zip.file(
        filePath,
        [
          `# ${languageBlock.title}`,
          '',
          `Product: ${product.name}`,
          `Channel: ${channelName}`,
          `Audience: ${languageBlock.audience}`,
          '',
          '## Body',
          languageBlock.body,
          '',
          '## Channel Variant',
          variant.body,
          '',
          '## SEO',
          `- Primary keyword: ${languageBlock.seo.primary_keyword}`,
          `- Meta title: ${languageBlock.seo.meta_title}`,
          `- Meta description: ${languageBlock.seo.meta_description}`,
          '',
          '## CTA',
          languageBlock.cta,
          '',
          '## Hashtags',
          languageBlock.hashtags.join(' '),
          '',
        ].join('\n'),
      );
    }
  }

  zip.file('seo.md', seoSections.join('\n'));

  return {
    fileName: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${post.id}.zip`,
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
  };
}
