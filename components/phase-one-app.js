'use client';

import { useDeferredValue, useEffect, useState, useTransition } from 'react';

import Icon from '@/app/icons';
import {
  CHANNELS,
  CHANNEL_MAP,
  DEFAULT_ARTICLE_TEMPLATE,
  DEFAULT_TOPIC_TEMPLATE,
  POST_STATUSES,
  PROVIDERS,
} from '@/lib/phase-one/constants';
import { ensureChannelVariants, trimBodyText } from '@/lib/phase-one/templates';

function blankProduct(workspace) {
  return {
    id: null,
    name: '',
    channels: ['facebook', 'instagram'],
    languageOverride: null,
    providerOverride: null,
    modelOverride: '',
    brandContext: '',
    brandVoice: '',
    preferredWords: '',
    avoidedWords: '',
    promptTemplates: {
      topic: { id: '', content: DEFAULT_TOPIC_TEMPLATE },
      article: { id: '', content: DEFAULT_ARTICLE_TEMPLATE },
    },
    resolvedLanguageMode: workspace.defaultLanguageMode,
  };
}

function emptyLanguageBlock(language, channelIds) {
  return {
    language,
    title: '',
    audience: '',
    body: '',
    hashtags: [],
    seo: {
      primary_keyword: '',
      meta_title: '',
      meta_description: '',
    },
    cta: '',
    channel_variants: channelIds.map((channelId) => ({ channel: channelId, body: '' })),
  };
}

function createPostDraft(post) {
  if (!post) {
    return null;
  }

  const languages = post.currentContent.languages.length
    ? post.currentContent.languages.map((block) => ({
        ...block,
        hashtags: [...block.hashtags],
        seo: { ...block.seo },
        channel_variants: ensureChannelVariants(block.channel_variants, post.channels).map((variant) => ({
          ...variant,
        })),
      }))
    : post.resolvedLanguages.map((language) => emptyLanguageBlock(language, post.channels));

  return {
    id: post.id,
    topic: { ...post.topic },
    status: post.status,
    currentContent: { languages },
    publicationRecords: post.publicationRecords.map((record) => ({ ...record })),
  };
}

function statusTone(status) {
  if (status === 'published') return 'olive';
  if (status === 'scheduled') return 'moss';
  if (status === 'ready') return 'amber';
  if (status === 'draft') return 'orange';
  return 'stone';
}

function formatDateLabel(value) {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatStatusLabel(status) {
  return {
    idea: 'Idea',
    draft: 'Draft',
    ready: 'Ready',
    scheduled: 'Scheduled',
    published: 'Published',
  }[status] || status;
}

function ProductCard({ product, selected, onClick }) {
  return (
    <button className={`product-card ${selected ? 'product-card-active' : ''}`} onClick={onClick} type="button">
      <div className="product-card-head">
        <strong>{product.name}</strong>
        <span className="mini-pill">{product.resolvedProvider}</span>
      </div>
      <p>{product.brandContext}</p>
      <div className="product-card-meta">
        <span>{product.stats.posts} bài</span>
        <span>{product.channels.map((channelId) => CHANNEL_MAP[channelId]?.shortLabel || channelId).join(' · ')}</span>
      </div>
    </button>
  );
}

function BatchTopicPicker({ batch, posts, selectedTopicIds, onToggle, onSelectAll, onSave, onDelete, isPending }) {
  const savedTopicIds = new Set(
    posts.filter((post) => post.sourceBatchId === batch.id).map((post) => post.sourceTopicId),
  );
  const pendingTopicIds = selectedTopicIds.filter((topicId) => !savedTopicIds.has(topicId));

  return (
    <>
      <div className="batch-detail-head">
        <div>
          <span className="eyebrow">{batch.productName}</span>
          <h2>{batch.quantity} chủ đề đã tạo</h2>
          <p>{formatDateLabel(batch.createdAt)} · {savedTopicIds.size} chủ đề đã lưu</p>
        </div>
        <div className="batch-actions">
          <button className="btn btn-secondary btn-small" type="button" onClick={onSelectAll} disabled={isPending}>
            Chọn tất cả chưa lưu
          </button>
          <button className="btn btn-primary btn-small" type="button" disabled={!pendingTopicIds.length || isPending} onClick={onSave}>
            Lưu {pendingTopicIds.length || ''} chủ đề
          </button>
        </div>
      </div>
      <details className="prompt-details">
        <summary>Xem prompt đã dùng</summary>
        <pre className="batch-prompt">{batch.promptSnapshot}</pre>
      </details>
      <div className="topic-grid">
        {batch.topics.map((topic) => {
          const saved = savedTopicIds.has(topic.id);
          const checked = saved || selectedTopicIds.includes(topic.id);
          return (
            <article className={`topic-option ${checked ? 'topic-option-active' : ''} ${saved ? 'topic-option-saved' : ''}`} key={topic.id}>
              <label>
                <input type="checkbox" checked={checked} disabled={saved} onChange={() => onToggle(topic.id)} />
                <span>
                  <strong>{topic.title}</strong>
                  <p>{topic.angle}</p>
                </span>
              </label>
              <div className="topic-option-foot">
                {saved ? <span className="mini-pill">Đã lưu</span> : <button className="text-button" type="button" onClick={() => onDelete(topic.id)} disabled={isPending}>Xoá</button>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function ChannelPick({ channelId, checked, onToggle }) {
  const channel = CHANNEL_MAP[channelId];
  return (
    <button
      type="button"
      className={`seg-option ${checked ? 'seg-option-active' : ''}`}
      onClick={() => onToggle(channelId)}
    >
      {channel.shortLabel}
    </button>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${statusTone(status)}`}>{formatStatusLabel(status)}</span>;
}

function VariantCopyButton({ onClick }) {
  return (
    <button className="btn btn-secondary btn-small" onClick={onClick} type="button">
      <Icon name="file" size={14} />
      Copy
    </button>
  );
}

const VIEW_IDS = ['overview', 'content', 'products', 'workspace', 'activity'];

export default function PhaseOneApp({ initialState }) {
  const [appState, setAppState] = useState(initialState);
  const [selectedProductId, setSelectedProductId] = useState(initialState.products[0]?.id || null);
  const [selectedPostId, setSelectedPostId] = useState(initialState.posts[0]?.id || null);
  const [workspaceDraft, setWorkspaceDraft] = useState({
    name: initialState.workspace.name,
    timezone: initialState.workspace.timezone,
    defaultLanguageMode: initialState.workspace.defaultLanguageMode,
    provider: initialState.workspace.aiSettings.provider,
    model: initialState.workspace.aiSettings.model,
  });
  const [credentialDrafts, setCredentialDrafts] = useState({ openai: '', anthropic: '' });
  const [availableModels, setAvailableModels] = useState({ openai: [], anthropic: [] });
  const [productDraft, setProductDraft] = useState(
    initialState.products[0] ? initialState.products[0] : blankProduct(initialState.workspace),
  );
  const [topicForm, setTopicForm] = useState({
    productId: initialState.products[0]?.id || '',
    quantity: 8,
    additionalContext: '',
    notes: '',
    requirements: '',
  });
  const [selectedTopics, setSelectedTopics] = useState({});
  const [postDraft, setPostDraft] = useState(
    initialState.posts[0] ? createPostDraft(initialState.posts[0]) : null,
  );
  const [activeLanguage, setActiveLanguage] = useState(initialState.posts[0]?.resolvedLanguages?.[0] || 'vi');
  const [postQuery, setPostQuery] = useState('');
  const [postStatusFilter, setPostStatusFilter] = useState('all');
  const [activeView, setActiveView] = useState('overview');
  const [isProductDrawerOpen, setProductDrawerOpen] = useState(false);
  const [isPostDrawerOpen, setPostDrawerOpen] = useState(false);
  const [openBatchId, setOpenBatchId] = useState(null);
  const [banner, setBanner] = useState(null);
  const [isPending, startTransition] = useTransition();
  const deferredPostQuery = useDeferredValue(postQuery);

  const selectedProduct = appState.products.find((product) => product.id === selectedProductId) || null;
  const selectedPost = appState.posts.find((post) => post.id === selectedPostId) || null;

  useEffect(() => {
    setWorkspaceDraft({
      name: appState.workspace.name,
      timezone: appState.workspace.timezone,
      defaultLanguageMode: appState.workspace.defaultLanguageMode,
      provider: appState.workspace.aiSettings.provider,
      model: appState.workspace.aiSettings.model,
    });
  }, [appState.workspace]);

  useEffect(() => {
    if (selectedProductId === null) {
      return;
    }

    const stillExists = appState.products.some((product) => product.id === selectedProductId);
    const nextProduct =
      (stillExists && appState.products.find((product) => product.id === selectedProductId)) ||
      appState.products[0] ||
      null;

    setSelectedProductId(nextProduct?.id || null);
    setTopicForm((current) => ({
      ...current,
      productId: nextProduct?.id || '',
    }));
    setProductDraft(nextProduct ? nextProduct : blankProduct(appState.workspace));
  }, [appState.products, appState.workspace, selectedProductId]);

  useEffect(() => {
    const stillExists = appState.posts.some((post) => post.id === selectedPostId);
    const nextPost =
      (stillExists && appState.posts.find((post) => post.id === selectedPostId)) ||
      appState.posts[0] ||
      null;

    setSelectedPostId(nextPost?.id || null);
    setPostDraft(nextPost ? createPostDraft(nextPost) : null);
    setActiveLanguage(nextPost?.resolvedLanguages?.[0] || 'vi');
  }, [appState.posts, selectedPostId]);

  useEffect(() => {
    function syncViewFromLocation() {
      const view = window.location.hash.replace('#', '');
      if (VIEW_IDS.includes(view)) {
        setActiveView(view);
      }
    }

    syncViewFromLocation();
    window.addEventListener('hashchange', syncViewFromLocation);
    window.addEventListener('popstate', syncViewFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncViewFromLocation);
      window.removeEventListener('popstate', syncViewFromLocation);
    };
  }, []);

  const visiblePosts = appState.posts.filter((post) => {
    const query = deferredPostQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      post.topic.title.toLowerCase().includes(query) ||
      post.productName.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query);
    const matchesStatus = postStatusFilter === 'all' || post.status === postStatusFilter;
    return matchesQuery && matchesStatus;
  });

  function applyState(nextState, options = {}) {
    setAppState(nextState);
    if (options.productId !== undefined) {
      setSelectedProductId(options.productId);
    }
    if (options.postId !== undefined) {
      setSelectedPostId(options.postId);
    }
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || 'Request thất bại.');
    }

    return response.json();
  }

  function runTask(task) {
    setBanner(null);
    startTransition(() => {
      Promise.resolve(task()).catch((error) => {
        setBanner({ type: 'error', text: error.message || 'Có lỗi xảy ra.' });
      });
    });
  }

  function saveWorkspace() {
    runTask(async () => {
      const nextState = await requestJson('/api/state', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'workspace',
          payload: workspaceDraft,
        }),
      });
      applyState(nextState, { productId: selectedProductId, postId: selectedPostId });
      setBanner({ type: 'success', text: 'Đã lưu cấu hình workspace.' });
    });
  }

  function saveCredential(provider) {
    runTask(async () => {
      const nextState = await requestJson('/api/state', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'credential',
          payload: {
            provider,
            apiKey: credentialDrafts[provider],
          },
        }),
      });
      setCredentialDrafts((current) => ({ ...current, [provider]: '' }));
      applyState(nextState, { productId: selectedProductId, postId: selectedPostId });
      setBanner({ type: 'success', text: `Đã cập nhật API key cho ${provider}.` });
    });
  }

  function loadModels(provider) {
    runTask(async () => {
      const payload = await requestJson('/api/models', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      setAvailableModels((current) => ({
        ...current,
        [provider]: payload.models,
      }));
      setBanner({
        type: 'success',
        text: `Đã tải ${payload.models.length} model cho ${provider} (${payload.mode}).`,
      });
    });
  }

  function saveProduct() {
    runTask(async () => {
      const nextState = await requestJson('/api/products', {
        method: 'POST',
        body: JSON.stringify(productDraft),
      });

      const matchingProduct =
        nextState.products.find((product) => product.name === productDraft.name) ||
        nextState.products[0] ||
        null;

      applyState(nextState, {
        productId: matchingProduct?.id || null,
        postId: selectedPostId,
      });
      setBanner({ type: 'success', text: 'Đã lưu cấu hình sản phẩm.' });
      setProductDrawerOpen(false);
    });
  }

  function deleteProduct() {
    if (!productDraft?.id) {
      return;
    }

    if (!window.confirm(`Xoá sản phẩm "${productDraft.name}" cùng toàn bộ batch/post liên quan?`)) {
      return;
    }

    runTask(async () => {
      const nextState = await requestJson(`/api/products?productId=${productDraft.id}`, {
        method: 'DELETE',
      });
      applyState(nextState);
      setBanner({ type: 'success', text: 'Đã xoá sản phẩm.' });
    });
  }

  function generateTopics() {
    runTask(async () => {
      const nextState = await requestJson('/api/topic-batches', {
        method: 'POST',
        body: JSON.stringify({
          ...topicForm,
          quantity: Number(topicForm.quantity),
        }),
      });
      applyState(nextState, { productId: topicForm.productId, postId: selectedPostId });
      setTopicForm((current) => ({ ...current, additionalContext: '', notes: '', requirements: '' }));
      setOpenBatchId(nextState.topicBatches[0]?.id || null);
      setBanner({ type: 'success', text: 'Đã tạo batch chủ đề mới.' });
    });
  }

  function saveTopicsAsPosts(batchId) {
    const topicIds = selectedTopics[batchId] || [];

    runTask(async () => {
      const nextState = await requestJson('/api/topic-batches', {
        method: 'PATCH',
        body: JSON.stringify({ batchId, topicIds }),
      });

      const createdPost = nextState.posts.find((post) => topicIds.includes(post.sourceTopicId));
      applyState(nextState, {
        productId: selectedProductId,
        postId: createdPost?.id || selectedPostId,
      });
      setBanner({ type: 'success', text: 'Đã lưu chủ đề đã chọn thành bài viết.' });
    });
  }

  function expandCurrentPost() {
    if (!selectedPost) {
      return;
    }

    runTask(async () => {
      const nextState = await requestJson(`/api/posts/${selectedPost.id}/expand`, {
        method: 'POST',
      });
      applyState(nextState, { productId: selectedProductId, postId: selectedPost.id });
      setBanner({ type: 'success', text: 'Đã mở rộng chủ đề thành bài viết.' });
    });
  }

  function saveCurrentPost() {
    if (!postDraft) {
      return;
    }

    runTask(async () => {
      const nextState = await requestJson('/api/posts', {
        method: 'PATCH',
        body: JSON.stringify({
          postId: postDraft.id,
          topic: postDraft.topic,
          status: postDraft.status,
          currentContent: postDraft.currentContent,
          publicationRecords: postDraft.publicationRecords,
        }),
      });
      applyState(nextState, { productId: selectedProductId, postId: postDraft.id });
      setBanner({ type: 'success', text: 'Đã lưu bài viết.' });
    });
  }

  function copyText(text) {
    if (!navigator?.clipboard) {
      setBanner({ type: 'error', text: 'Clipboard API không khả dụng trong trình duyệt này.' });
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => setBanner({ type: 'success', text: 'Đã copy nội dung.' }),
      () => setBanner({ type: 'error', text: 'Không thể copy nội dung.' }),
    );
  }

  function toggleProductChannel(channelId) {
    setProductDraft((current) => {
      const exists = current.channels.includes(channelId);
      return {
        ...current,
        channels: exists
          ? current.channels.filter((item) => item !== channelId)
          : [...current.channels, channelId],
      };
    });
  }

  function toggleBatchTopic(batchId, topicId) {
    setSelectedTopics((current) => {
      const currentItems = current[batchId] || [];
      const exists = currentItems.includes(topicId);
      return {
        ...current,
        [batchId]: exists
          ? currentItems.filter((item) => item !== topicId)
          : [...currentItems, topicId],
      };
    });
  }

  function selectAllBatchTopics(batch) {
    setSelectedTopics((current) => ({
      ...current,
      [batch.id]: batch.topics
        .filter((topic) => !appState.posts.some((post) => post.sourceTopicId === topic.id))
        .map((topic) => topic.id),
    }));
  }

  function deleteBatchTopic(batchId, topicId) {
    if (!window.confirm('Xoá chủ đề này khỏi batch? Thao tác này không thể hoàn tác.')) {
      return;
    }

    runTask(async () => {
      const nextState = await requestJson(`/api/topic-batches?batchId=${batchId}&topicId=${topicId}`, {
        method: 'DELETE',
      });
      applyState(nextState, { productId: selectedProductId, postId: selectedPostId });
      setSelectedTopics((current) => ({
        ...current,
        [batchId]: (current[batchId] || []).filter((id) => id !== topicId),
      }));
      setBanner({ type: 'success', text: 'Đã xoá chủ đề khỏi batch.' });
    });
  }

  function updateLanguageBlock(language, updater) {
    setPostDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        currentContent: {
          languages: current.currentContent.languages.map((block) =>
            block.language === language ? updater(block) : block,
          ),
        },
      };
    });
  }

  function updateChannelVariant(language, channelId, value) {
    updateLanguageBlock(language, (block) => ({
      ...block,
      channel_variants: block.channel_variants.map((variant) =>
        variant.channel === channelId ? { ...variant, body: value } : variant,
      ),
    }));
  }

  function updatePublication(channelId, patch) {
    setPostDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        publicationRecords: current.publicationRecords.map((record) =>
          record.channel === channelId ? { ...record, ...patch } : record,
        ),
      };
    });
  }

  function setView(view) {
    const nextView = VIEW_IDS.includes(view) ? view : 'overview';
    setActiveView(nextView);
    if (window.location.hash !== `#${nextView}`) {
      window.history.pushState(null, '', `#${nextView}`);
    }
  }

  const navigation = [
    { id: 'overview', label: 'Tổng quan', icon: 'dashboard' },
    { id: 'content', label: 'Nội dung', icon: 'file', count: appState.posts.length },
    { id: 'products', label: 'Sản phẩm', icon: 'sparkles', count: appState.products.length },
    { id: 'workspace', label: 'Workspace', icon: 'settings' },
    { id: 'activity', label: 'Hoạt động', icon: 'globe' },
  ];

  function openProduct(product) {
    if (product) {
      setSelectedProductId(product.id);
      setProductDraft(product);
      setTopicForm((current) => ({ ...current, productId: product.id }));
    } else {
      setProductDraft(blankProduct(appState.workspace));
    }
    setProductDrawerOpen(true);
  }

  function openPost(postId) {
    setSelectedPostId(postId);
    setPostDrawerOpen(true);
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <button className="sidebar-brand" type="button" onClick={() => setView('overview')}>
          <span className="phase-brand-mark"><Icon name="pen" size={19} stroke="var(--color-bg)" /></span>
          <span><strong>de Writer</strong><small>Content desk</small></span>
        </button>
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeView === item.id ? 'nav-item-active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.count !== undefined ? <em>{item.count}</em> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          {isPending ? 'Đang xử lý' : 'Sẵn sàng'}
        </div>
      </aside>

      <main className="phase-shell">
        <header className="app-topbar">
          <div className="topbar-meta">
            <span>{appState.workspace.name}</span>
            <button className="avatar" type="button" onClick={() => setView('workspace')} aria-label="Mở workspace">
              {appState.workspace.ownerEmail.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

      {banner ? (
        <div className={`banner banner-${banner.type}`}>{banner.text}</div>
      ) : null}

      {activeView === 'overview' ? (
        <section className="overview-view">
          <div className="overview-actions">
            <button className="btn btn-primary" type="button" onClick={() => setView('content')}>
              Tạo nội dung <Icon name="back" size={15} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
          <div className="overview-stats">
            <button type="button" onClick={() => setView('products')}><span>Sản phẩm</span><strong>{appState.products.length}</strong></button>
            <button type="button" onClick={() => setView('content')}><span>Bài viết</span><strong>{appState.posts.length}</strong></button>
            <button type="button" onClick={() => setView('activity')}><span>Lần tạo nội dung</span><strong>{appState.generationRuns.length}</strong></button>
          </div>
          <details className="quick-guide">
            <summary>Hướng dẫn nhanh</summary>
            <ol><li>Chọn sản phẩm và hoàn thiện prompt.</li><li>Tạo batch trong Nội dung.</li><li>Lưu chủ đề phù hợp để biên tập bài viết.</li></ol>
          </details>
        </section>
      ) : null}

      <div className={`phase-grid ${activeView === 'content' ? 'content-grid' : ''}`}>
        {activeView === 'workspace' ? <section className="card elev-md phase-card phase-card-wide">
          <div className="section-head">
            <div>
              <span className="eyebrow">Workspace</span>
              <h2>Cấu hình mặc định</h2>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Tên workspace</span>
              <input
                className="input"
                value={workspaceDraft.name}
                onChange={(event) => setWorkspaceDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Timezone</span>
              <input
                className="input"
                value={workspaceDraft.timezone}
                onChange={(event) => setWorkspaceDraft((current) => ({ ...current, timezone: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Ngôn ngữ mặc định</span>
              <select
                className="input"
                value={workspaceDraft.defaultLanguageMode}
                onChange={(event) =>
                  setWorkspaceDraft((current) => ({ ...current, defaultLanguageMode: event.target.value }))
                }
              >
                <option value="vi">VI</option>
                <option value="vi_en">VI + EN</option>
              </select>
            </label>

            <label className="field">
              <span>Provider mặc định</span>
              <select
                className="input"
                value={workspaceDraft.provider}
                onChange={(event) =>
                  setWorkspaceDraft((current) => ({ ...current, provider: event.target.value }))
                }
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Model mặc định</span>
            <input
              className="input"
              value={workspaceDraft.model}
              onChange={(event) => setWorkspaceDraft((current) => ({ ...current, model: event.target.value }))}
            />
          </label>

          <div className="action-row">
            <button className="btn btn-primary" onClick={saveWorkspace} type="button" disabled={isPending}>
              <Icon name="check" size={15} />
              Lưu workspace
            </button>
          </div>

          <div className="provider-stack">
            {PROVIDERS.map((provider) => {
              const meta = appState.workspace.providerCredentials[provider.id];
              return (
                <div className="provider-card" key={provider.id}>
                  <div className="provider-head">
                    <div>
                      <strong>{provider.label}</strong>
                      <div className="text-muted">
                        {meta.hasKey ? `Đã lưu key kết thúc bằng ****${meta.keyLast4}` : 'Chưa có API key'}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-small"
                      type="button"
                      onClick={() => loadModels(provider.id)}
                    >
                      <Icon name="sparkles" size={14} />
                      Tải models
                    </button>
                  </div>
                  <div className="provider-body">
                    <input
                      className="input"
                      type="password"
                      placeholder={`Nhập ${provider.label} API key`}
                      value={credentialDrafts[provider.id]}
                      onChange={(event) =>
                        setCredentialDrafts((current) => ({
                          ...current,
                          [provider.id]: event.target.value,
                        }))
                      }
                    />
                    <button className="btn btn-secondary" type="button" onClick={() => saveCredential(provider.id)}>
                      Lưu key
                    </button>
                  </div>
                  {availableModels[provider.id]?.length ? (
                    <div className="model-pills">
                      {availableModels[provider.id].slice(0, 8).map((modelId) => (
                        <span className="mini-pill" key={modelId}>
                          {modelId}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section> : null}

        {activeView === 'products' ? <section className="card elev-md phase-card phase-card-wide products-view">
          <div className="section-head">
            <div>
              <span className="eyebrow">Products</span>
              <h2>Sản phẩm & prompt</h2>
            </div>
            <button
              className="btn btn-secondary btn-small"
              type="button"
              onClick={() => openProduct()}
            >
              <Icon name="plus" size={14} />
              Sản phẩm mới
            </button>
          </div>

          <div className="products-grid">
            <div className="products-list">
              {appState.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selected={product.id === selectedProductId}
                  onClick={() => openProduct(product)}
                />
              ))}
            </div>

            {isProductDrawerOpen ? <div className="drawer-backdrop" onMouseDown={() => setProductDrawerOpen(false)}>
            <div className="product-editor drawer-panel" role="dialog" aria-modal="true" aria-label="Cấu hình sản phẩm" onMouseDown={(event) => event.stopPropagation()}>
              <div className="drawer-head"><div><span className="eyebrow">Sản phẩm</span><h2>{productDraft.id ? 'Chỉnh sửa sản phẩm' : 'Tạo sản phẩm mới'}</h2></div><button className="drawer-close" type="button" onClick={() => setProductDrawerOpen(false)} aria-label="Đóng">×</button></div>
              <div className="form-grid">
                <label className="field">
                  <span>Tên sản phẩm</span>
                  <input
                    className="input"
                    value={productDraft.name}
                    onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>

                <label className="field">
                  <span>Language override</span>
                  <select
                    className="input"
                    value={productDraft.languageOverride || ''}
                    onChange={(event) =>
                      setProductDraft((current) => ({
                        ...current,
                        languageOverride: event.target.value || null,
                      }))
                    }
                  >
                    <option value="">Kế thừa workspace</option>
                    <option value="vi">VI</option>
                    <option value="vi_en">VI + EN</option>
                  </select>
                </label>

                <label className="field">
                  <span>Provider override</span>
                  <select
                    className="input"
                    value={productDraft.providerOverride || ''}
                    onChange={(event) =>
                      setProductDraft((current) => ({
                        ...current,
                        providerOverride: event.target.value || null,
                      }))
                    }
                  >
                    <option value="">Kế thừa workspace</option>
                    {PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Model override</span>
                  <input
                    className="input"
                    value={productDraft.modelOverride || ''}
                    onChange={(event) =>
                      setProductDraft((current) => ({ ...current, modelOverride: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="field">
                <span>Kênh nội dung</span>
                <div className="seg product-channels">
                  {CHANNELS.map((channel) => (
                    <ChannelPick
                      key={channel.id}
                      channelId={channel.id}
                      checked={productDraft.channels.includes(channel.id)}
                      onToggle={toggleProductChannel}
                    />
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Brand context</span>
                <textarea
                  className="input"
                  value={productDraft.brandContext}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, brandContext: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Giọng thương hiệu</span>
                <textarea
                  className="input"
                  value={productDraft.brandVoice}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, brandVoice: event.target.value }))
                  }
                />
              </label>

              <div className="form-grid">
                <label className="field">
                  <span>Từ nên dùng</span>
                  <textarea
                    className="input"
                    value={productDraft.preferredWords}
                    onChange={(event) =>
                      setProductDraft((current) => ({ ...current, preferredWords: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Từ cần tránh</span>
                  <textarea
                    className="input"
                    value={productDraft.avoidedWords}
                    onChange={(event) =>
                      setProductDraft((current) => ({ ...current, avoidedWords: event.target.value }))
                    }
                  />
                </label>
              </div>

              <details className="product-prompts">
                <summary>Tùy chỉnh prompt tạo chủ đề và bài viết</summary>
                <div className="product-prompts-body">
                  <label className="field">
                    <span>Prompt tạo chủ đề</span>
                    <textarea
                      className="input prompt-area"
                      value={productDraft.promptTemplates.topic.content}
                      onChange={(event) =>
                        setProductDraft((current) => ({
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            topic: {
                              ...current.promptTemplates.topic,
                              content: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Prompt mở rộng bài viết</span>
                    <textarea
                      className="input prompt-area"
                      value={productDraft.promptTemplates.article.content}
                      onChange={(event) =>
                        setProductDraft((current) => ({
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            article: {
                              ...current.promptTemplates.article,
                              content: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </details>

              <div className="action-row">
                <button className="btn btn-primary" type="button" onClick={saveProduct}>
                  <Icon name="check" size={15} />
                  Lưu sản phẩm
                </button>
                {productDraft.id ? (
                  <button className="btn btn-secondary" type="button" onClick={deleteProduct}>
                    Xoá sản phẩm
                  </button>
                ) : null}
              </div>
            </div>
            </div> : null}
          </div>
        </section> : null}

        {activeView === 'content' ? <section className="card elev-md phase-card phase-card-wide content-topic-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Topics</span>
              <h2>Tạo batch chủ đề</h2>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Sản phẩm</span>
              <select
                className="input"
                value={topicForm.productId}
                onChange={(event) => setTopicForm((current) => ({ ...current, productId: event.target.value }))}
              >
                {appState.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Số lượng</span>
              <input
                className="input"
                type="number"
                min="1"
                max="50"
                value={topicForm.quantity}
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, quantity: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Context bổ sung</span>
              <textarea
                className="input"
                value={topicForm.additionalContext}
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, additionalContext: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Lưu ý</span>
              <textarea
                className="input"
                value={topicForm.notes}
                onChange={(event) => setTopicForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span>Yêu cầu thêm</span>
            <textarea
              className="input"
              value={topicForm.requirements}
              onChange={(event) =>
                setTopicForm((current) => ({ ...current, requirements: event.target.value }))
              }
            />
          </label>

          <div className="action-row">
            <button className="btn btn-primary" type="button" onClick={generateTopics}>
              <Icon name="sparkles" size={15} />
              Render prompt & tạo topics
            </button>
          </div>

          <div className="batch-list">
            {appState.topicBatches.map((batch) => {
              const savedCount = appState.posts.filter((post) => post.sourceBatchId === batch.id).length;
              return (
                <article className="batch-card batch-summary" key={batch.id}>
                  <div>
                    <span className="eyebrow">{batch.productName}</span>
                    <strong>{batch.topics.length} chủ đề · {savedCount} đã lưu</strong>
                    <p>{formatDateLabel(batch.createdAt)}</p>
                  </div>
                  <button className="btn btn-secondary btn-small" type="button" onClick={() => setOpenBatchId(batch.id)}>
                    Mở batch
                  </button>
                </article>
              );
            })}
          </div>
          {openBatchId ? (() => {
            const batch = appState.topicBatches.find((item) => item.id === openBatchId);
            if (!batch) return null;
            return (
              <div className="drawer-backdrop" onMouseDown={() => setOpenBatchId(null)}>
                <section className="drawer-panel batch-drawer" role="dialog" aria-modal="true" aria-label="Chi tiết batch chủ đề" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="drawer-head">
                    <div><span className="eyebrow">Topic batch</span><h2>Chọn chủ đề phù hợp</h2></div>
                    <button className="drawer-close" type="button" onClick={() => setOpenBatchId(null)} aria-label="Đóng">×</button>
                  </div>
                  <BatchTopicPicker
                    batch={batch}
                    posts={appState.posts}
                    selectedTopicIds={selectedTopics[batch.id] || []}
                    onToggle={(topicId) => toggleBatchTopic(batch.id, topicId)}
                    onSelectAll={() => selectAllBatchTopics(batch)}
                    onSave={() => saveTopicsAsPosts(batch.id)}
                    onDelete={(topicId) => deleteBatchTopic(batch.id, topicId)}
                    isPending={isPending}
                  />
                </section>
              </div>
            );
          })() : null}
        </section> : null}

        {activeView === 'content' ? <section className="card elev-md phase-card content-posts-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">Posts</span>
              <h2>Pipeline bài viết</h2>
            </div>
          </div>

          <div className="toolbar-row">
            <input
              className="input"
              placeholder="Tìm theo chủ đề, sản phẩm hoặc excerpt"
              value={postQuery}
              onChange={(event) => setPostQuery(event.target.value)}
            />
            <select
              className="input"
              value={postStatusFilter}
              onChange={(event) => setPostStatusFilter(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {POST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="posts-list">
            {visiblePosts.map((post) => (
              <button
                className={`post-row ${post.id === selectedPostId ? 'post-row-active' : ''}`}
                key={post.id}
                type="button"
                onClick={() => openPost(post.id)}
              >
                <div className="post-row-main">
                  <strong>{post.topic.title}</strong>
                  <p>{post.excerpt}</p>
                </div>
                <div className="post-row-meta">
                  <StatusBadge status={post.status} />
                  <span>{post.productName}</span>
                  <span>{post.score ? `${post.score}/100` : 'Chưa chấm'}</span>
                </div>
              </button>
            ))}
          </div>
        </section> : null}

        {isPostDrawerOpen && activeView === 'content' ? <div className="drawer-backdrop" onMouseDown={() => setPostDrawerOpen(false)}>
        <section className="card elev-md phase-card phase-card-wide drawer-panel post-drawer" role="dialog" aria-modal="true" aria-label="Biên tập bài viết" onMouseDown={(event) => event.stopPropagation()}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Editor</span>
              <h2>{selectedPost ? selectedPost.topic.title : 'Chọn một post'}</h2>
            </div>
            <div className="drawer-actions">{selectedPost ? (
              <div className="editor-actions">
                <StatusBadge status={selectedPost.status} />
                <button className="btn btn-secondary btn-small" type="button" onClick={expandCurrentPost}>
                  <Icon name="sparkles" size={14} />
                  Mở rộng bằng AI
                </button>
                <a className="btn btn-secondary btn-small" href={`/api/posts/${selectedPost.id}/export`}>
                  <Icon name="file" size={14} />
                  Export ZIP
                </a>
              </div>
            ) : null}<button className="drawer-close" type="button" onClick={() => setPostDrawerOpen(false)} aria-label="Đóng">×</button></div>
          </div>

          {postDraft ? (
            <div className="editor-grid">
              <div className="editor-sidebar">
                <label className="field">
                  <span>Topic title</span>
                  <input
                    className="input"
                    value={postDraft.topic.title}
                    onChange={(event) =>
                      setPostDraft((current) => ({
                        ...current,
                        topic: { ...current.topic, title: event.target.value },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Angle</span>
                  <textarea
                    className="input"
                    value={postDraft.topic.angle}
                    onChange={(event) =>
                      setPostDraft((current) => ({
                        ...current,
                        topic: { ...current.topic, angle: event.target.value },
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Status</span>
                  <select
                    className="input"
                    value={postDraft.status}
                    onChange={(event) =>
                      setPostDraft((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {POST_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="publication-stack">
                  {postDraft.publicationRecords.map((record) => (
                    <div className="publication-card" key={record.id}>
                      <div className="publication-head">
                        <strong>{CHANNEL_MAP[record.channel]?.label || record.channel}</strong>
                        <span className="mini-pill">{record.status}</span>
                      </div>
                      <select
                        className="input"
                        value={record.status}
                        onChange={(event) =>
                          updatePublication(record.channel, {
                            status: event.target.value,
                            publishedAt: event.target.value === 'published' ? record.publishedAt : '',
                            scheduledFor: event.target.value === 'planned' ? record.scheduledFor : '',
                          })
                        }
                      >
                        <option value="unscheduled">unscheduled</option>
                        <option value="planned">planned</option>
                        <option value="published">published</option>
                      </select>
                      {record.status === 'planned' ? (
                        <input
                          className="input"
                          type="datetime-local"
                          value={record.scheduledFor}
                          onChange={(event) =>
                            updatePublication(record.channel, { scheduledFor: event.target.value })
                          }
                        />
                      ) : null}
                      {record.status === 'published' ? (
                        <div className="text-muted">Published at: {record.publishedAt || 'now'}</div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary btn-block" type="button" onClick={saveCurrentPost}>
                  <Icon name="check" size={15} />
                  Lưu bài viết
                </button>
              </div>

              <div className="editor-main">
                <div className="lang-tabs">
                  {postDraft.currentContent.languages.map((block) => (
                    <button
                      className={`lang-tab ${activeLanguage === block.language ? 'lang-tab-active' : ''}`}
                      key={block.language}
                      type="button"
                      onClick={() => setActiveLanguage(block.language)}
                    >
                      {block.language.toUpperCase()}
                    </button>
                  ))}
                </div>

                {postDraft.currentContent.languages
                  .filter((block) => block.language === activeLanguage)
                  .map((block) => (
                    <div className="language-editor" key={block.language}>
                      <div className="toolbar-row">
                        <label className="field">
                          <span>Title</span>
                          <input
                            className="input"
                            value={block.title}
                            onChange={(event) =>
                              updateLanguageBlock(block.language, (current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Audience</span>
                          <input
                            className="input"
                            value={block.audience}
                            onChange={(event) =>
                              updateLanguageBlock(block.language, (current) => ({
                                ...current,
                                audience: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label className="field">
                        <span>Body</span>
                        <textarea
                          className="input article-body"
                          value={block.body}
                          onChange={(event) =>
                            updateLanguageBlock(block.language, (current) => ({
                              ...current,
                              body: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <div className="form-grid">
                        <label className="field">
                          <span>Hashtags</span>
                          <input
                            className="input"
                            value={block.hashtags.join(', ')}
                            onChange={(event) =>
                              updateLanguageBlock(block.language, (current) => ({
                                ...current,
                                hashtags: event.target.value
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>CTA</span>
                          <input
                            className="input"
                            value={block.cta}
                            onChange={(event) =>
                              updateLanguageBlock(block.language, (current) => ({
                                ...current,
                                cta: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="form-grid">
                        <label className="field">
                          <span>Primary keyword</span>
                          <input
                            className="input"
                            value={block.seo.primary_keyword}
                            onChange={(event) =>
                              updateLanguageBlock(block.language, (current) => ({
                                ...current,
                                seo: { ...current.seo, primary_keyword: event.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Meta title</span>
                          <input
                            className="input"
                            value={block.seo.meta_title}
                            onChange={(event) =>
                              updateLanguageBlock(block.language, (current) => ({
                                ...current,
                                seo: { ...current.seo, meta_title: event.target.value },
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label className="field">
                        <span>Meta description</span>
                        <textarea
                          className="input"
                          value={block.seo.meta_description}
                          onChange={(event) =>
                            updateLanguageBlock(block.language, (current) => ({
                              ...current,
                              seo: { ...current.seo, meta_description: event.target.value },
                            }))
                          }
                        />
                      </label>

                      <div className="variant-grid">
                        {block.channel_variants.map((variant) => (
                          <div className="variant-card" key={variant.channel}>
                            <div className="variant-head">
                              <strong>{CHANNEL_MAP[variant.channel]?.label || variant.channel}</strong>
                              <VariantCopyButton onClick={() => copyText(trimBodyText(variant.body) || trimBodyText(block.body))} />
                            </div>
                            <textarea
                              className="input"
                              value={variant.body}
                              onChange={(event) =>
                                updateChannelVariant(block.language, variant.channel, event.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">Chưa có post nào. Hãy tạo topic batch rồi lưu chủ đề thành post trước.</div>
          )}
        </section>
        </div> : null}

        {activeView === 'activity' ? <section className="card elev-md phase-card phase-card-wide">
          <div className="section-head">
            <div>
              <span className="eyebrow">Runs</span>
              <h2>Lịch sử generation</h2>
            </div>
          </div>

          <div className="runs-list">
            {appState.generationRuns.map((run) => (
              <div className="run-row" key={run.id}>
                <div>
                  <strong>{run.type === 'topic' ? 'Topic batch' : 'Article expand'}</strong>
                  <div className="text-muted">
                    {run.productName} · {run.provider}/{run.model}
                  </div>
                </div>
                <div className="run-meta">
                  <StatusBadge status={run.status === 'completed' ? 'ready' : run.status === 'failed' ? 'idea' : 'draft'} />
                  <span>{formatDateLabel(run.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section> : null}
      </div>
      </main>
    </div>
  );
}
