import {
  CHANNELS,
  DEFAULT_ARTICLE_TEMPLATE,
  DEFAULT_TOPIC_TEMPLATE,
  PROVIDERS,
} from './constants.js';
import { createMockArticleResult, createMockTopicResult, scoreGeneratedContent } from './mock.js';
import { formatChannels, formatLanguageMode, languageModeToList } from './templates.js';

function nowSeedIso(offsetDays = 0) {
  const date = new Date('2026-07-17T09:00:00+07:00');
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

function buildPromptTemplates() {
  return {
    topic: {
      id: `tmpl_topic_${Math.random().toString(36).slice(2, 8)}`,
      kind: 'topic',
      content: DEFAULT_TOPIC_TEMPLATE,
      updatedAt: nowSeedIso(-1),
    },
    article: {
      id: `tmpl_article_${Math.random().toString(36).slice(2, 8)}`,
      kind: 'article',
      content: DEFAULT_ARTICLE_TEMPLATE,
      updatedAt: nowSeedIso(-1),
    },
  };
}

export function createSeedState() {
  const workspace = {
    id: 'workspace_demo',
    name: 'de Writer Local Workspace',
    ownerName: 'Mai Lan',
    ownerEmail: 'owner@dewriter.local',
    timezone: 'Asia/Ho_Chi_Minh',
    defaultLanguageMode: 'vi_en',
    aiSettings: {
      provider: PROVIDERS[0].id,
      model: PROVIDERS[0].defaultModel,
    },
    providerCredentials: {
      openai: {
        provider: 'openai',
        encryptedKey: null,
        keyLast4: '',
        updatedAt: null,
      },
      anthropic: {
        provider: 'anthropic',
        encryptedKey: null,
        keyLast4: '',
        updatedAt: null,
      },
    },
    createdAt: nowSeedIso(-10),
    updatedAt: nowSeedIso(-1),
  };

  const products = [
    {
      id: 'product_sunrise',
      name: 'Sunrise Hotel & Spa',
      channels: ['facebook', 'instagram', 'tiktok'],
      languageOverride: null,
      providerOverride: null,
      modelOverride: '',
      brandContext:
        'Khách sạn nghỉ dưỡng ven biển tập trung vào trải nghiệm thư giãn, spa, ẩm thực và các combo ngắn ngày cho khách nội địa.',
      brandVoice:
        'Ấm áp, tinh tế, giàu cảm giác nghỉ dưỡng nhưng không phô trương. Ưu tiên ngôn ngữ gợi hình, nhẹ và có nhịp chậm.',
      preferredWords: 'thư giãn, biển Mỹ Khê, tinh tế, riêng tư, tái tạo năng lượng',
      avoidedWords: 'rẻ nhất, số 1, cam kết 100%, sốc, hủy diệt',
      promptTemplates: buildPromptTemplates(),
      createdAt: nowSeedIso(-7),
      updatedAt: nowSeedIso(-1),
    },
    {
      id: 'product_greenviet',
      name: 'GreenViet',
      channels: ['facebook', 'linkedin', 'website'],
      languageOverride: 'vi',
      providerOverride: 'anthropic',
      modelOverride: 'claude-sonnet-5',
      brandContext:
        'Tổ chức truyền thông về môi trường, tập trung vào giáo dục cộng đồng, chiến dịch hành động nhỏ và báo cáo tác động minh bạch.',
      brandVoice:
        'Rõ ràng, giàu trách nhiệm, lạc quan và có tính cộng đồng. Ưu tiên diễn đạt dễ làm theo hơn là kêu gọi cảm xúc cực đoan.',
      preferredWords: 'bền vững, cộng đồng, hành động nhỏ, minh bạch, đồng hành',
      avoidedWords: 'thảm họa, tuyệt vọng, đổ lỗi, duy nhất, chắc chắn',
      promptTemplates: buildPromptTemplates(),
      createdAt: nowSeedIso(-6),
      updatedAt: nowSeedIso(-2),
    },
  ];

  const sunrise = products[0];
  const sunriseBatchTopics = createMockTopicResult({
    product: sunrise,
    quantity: 3,
    additionalContext: 'Chiến dịch tháng 8 cho cặp đôi',
    notes: 'Tập trung insight nghỉ ngắn ngày',
    requirements: 'có thể dùng cho Facebook và Instagram',
  }).topics.map((topic, index) => ({
    id: `topic_seed_${index + 1}`,
    ...topic,
  }));

  const sunriseArticle = createMockArticleResult({
    product: sunrise,
    languages: languageModeToList('vi_en'),
    topic: sunriseBatchTopics[0],
    channels: sunrise.channels,
    additionalContext: 'Ưu tiên khách nội địa đi 2N1Đ hoặc 3N2Đ',
    notes: 'Giữ giọng văn giàu cảm giác thư giãn',
    requirements: 'có CTA rõ cho booking',
  });

  const sunriseBatch = {
    id: 'batch_seed_sunrise',
    productId: sunrise.id,
    quantity: 3,
    additionalContext: 'Chiến dịch tháng 8 cho cặp đôi',
    notes: 'Tập trung insight nghỉ ngắn ngày',
    requirements: 'có thể dùng cho Facebook và Instagram',
    status: 'completed',
    topics: sunriseBatchTopics,
    promptSnapshot:
      `${DEFAULT_TOPIC_TEMPLATE}\n\n[seed] languages=${formatLanguageMode('vi_en')} channels=${formatChannels(sunrise.channels)}`,
    generationRunId: 'run_seed_topics',
    createdAt: nowSeedIso(-2),
    updatedAt: nowSeedIso(-2),
  };

  const publicationRecords = sunrise.channels.map((channelId, index) => ({
    id: `pub_seed_${index + 1}`,
    channel: channelId,
    scheduledFor: index < 2 ? '2026-07-18T09:00' : '',
    publishedAt: '',
    status: index < 2 ? 'planned' : 'unscheduled',
  }));

  const posts = [
    {
      id: 'post_seed_sunrise',
      productId: sunrise.id,
      sourceBatchId: sunriseBatch.id,
      sourceTopicId: sunriseBatchTopics[0].id,
      topic: {
        title: sunriseBatchTopics[0].title,
        angle: sunriseBatchTopics[0].angle,
      },
      status: 'scheduled',
      currentContent: sunriseArticle,
      publicationRecords,
      score: scoreGeneratedContent(sunriseArticle),
      createdAt: nowSeedIso(-2),
      updatedAt: nowSeedIso(-1),
      lastExpandedAt: nowSeedIso(-1),
      generationRunIds: ['run_seed_article'],
    },
  ];

  const generationRuns = [
    {
      id: 'run_seed_topics',
      type: 'topic',
      status: 'completed',
      workspaceId: workspace.id,
      productId: sunrise.id,
      batchId: sunriseBatch.id,
      postId: null,
      provider: 'openai',
      model: 'gpt-5.6-terra',
      promptSnapshot: sunriseBatch.promptSnapshot,
      outputSnapshot: { topics: sunriseBatch.topics },
      usage: { mode: 'mock' },
      error: null,
      createdAt: nowSeedIso(-2),
      updatedAt: nowSeedIso(-2),
    },
    {
      id: 'run_seed_article',
      type: 'article',
      status: 'completed',
      workspaceId: workspace.id,
      productId: sunrise.id,
      batchId: sunriseBatch.id,
      postId: posts[0].id,
      provider: 'openai',
      model: 'gpt-5.6-terra',
      promptSnapshot:
        `${DEFAULT_ARTICLE_TEMPLATE}\n\n[seed] topic=${sunriseBatchTopics[0].title} languages=${formatLanguageMode('vi_en')}`,
      outputSnapshot: sunriseArticle,
      usage: { mode: 'mock' },
      error: null,
      createdAt: nowSeedIso(-1),
      updatedAt: nowSeedIso(-1),
    },
  ];

  return {
    version: 1,
    workspace,
    products,
    topicBatches: [sunriseBatch],
    posts,
    generationRuns,
    meta: {
      availableChannels: CHANNELS.map((channel) => channel.id),
      createdAt: nowSeedIso(-10),
      updatedAt: nowSeedIso(-1),
    },
  };
}
