import { CHANNEL_MAP, PROVIDERS, TEMPLATE_VARIABLES } from './constants.js';

export function resolveLanguageMode(workspace, product) {
  return product.languageOverride || workspace.defaultLanguageMode;
}

export function languageModeToList(mode) {
  return mode === 'vi' ? ['vi'] : ['vi', 'en'];
}

export function formatLanguageMode(mode) {
  return languageModeToList(mode)
    .map((language) => language.toUpperCase())
    .join(' + ');
}

export function resolveProviderAndModel(workspace, product) {
  const provider = product.providerOverride || workspace.aiSettings.provider;
  const providerMeta = PROVIDERS.find((item) => item.id === provider) || PROVIDERS[0];
  return {
    provider,
    model: product.modelOverride || workspace.aiSettings.model || providerMeta.defaultModel,
  };
}

export function formatChannels(channelIds) {
  return channelIds.map((channelId) => CHANNEL_MAP[channelId]?.label || channelId).join(', ');
}

export function normalizeListInput(value) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listTemplateVariables(template) {
  return [...template.matchAll(/{{\s*([a-z_]+)\s*}}/gi)].map((match) => match[1]);
}

export function validateTemplateVariables(template) {
  const allowed = new Set(TEMPLATE_VARIABLES);
  const unknown = [...new Set(listTemplateVariables(template))].filter((token) => !allowed.has(token));
  if (unknown.length) {
    throw new Error(`Template chứa biến không hỗ trợ: ${unknown.join(', ')}`);
  }
}

export function renderTemplate(template, variables) {
  return template.replace(/{{\s*([a-z_]+)\s*}}/gi, (_, key) => variables[key] ?? '');
}

export function ensureChannelVariants(channelVariants, channelIds) {
  const variantMap = new Map((channelVariants || []).map((variant) => [variant.channel, variant]));
  return channelIds.map((channelId) => ({
    channel: channelId,
    body: variantMap.get(channelId)?.body || '',
  }));
}

export function trimBodyText(text) {
  return (text || '').trim();
}

export function excerptFromBody(text, length = 160) {
  const normalized = trimBodyText(text).replace(/\s+/g, ' ');
  if (normalized.length <= length) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

export function slugifyText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
