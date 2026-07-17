export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-5.6-terra' },
  { id: 'anthropic', label: 'Anthropic', defaultModel: 'claude-sonnet-5' },
];

export const CHANNELS = [
  { id: 'facebook', label: 'Facebook', shortLabel: 'FB' },
  { id: 'instagram', label: 'Instagram', shortLabel: 'IG' },
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TT' },
  { id: 'linkedin', label: 'LinkedIn', shortLabel: 'LI' },
  { id: 'website', label: 'Website', shortLabel: 'WEB' },
];

export const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((channel) => [channel.id, channel]));

export const POST_STATUSES = ['idea', 'draft', 'ready', 'scheduled', 'published'];

export const PUBLICATION_STATUSES = ['unscheduled', 'planned', 'published'];

export const LANGUAGE_MODES = [
  { id: 'vi', label: 'VI' },
  { id: 'vi_en', label: 'VI + EN' },
];

export const TEMPLATE_VARIABLES = [
  'quantity',
  'product_name',
  'product_context',
  'languages',
  'topic',
  'additional_context',
  'notes',
  'requirements',
  'channels',
  'brand_voice',
  'preferred_words',
  'avoided_words',
];

export const TOPIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    topics: {
      type: 'array',
      minItems: 1,
      maxItems: 50,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          angle: { type: 'string' },
        },
        required: ['title', 'angle'],
      },
    },
  },
  required: ['topics'],
};

export const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    languages: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          language: { type: 'string', enum: ['vi', 'en'] },
          title: { type: 'string' },
          audience: { type: 'string' },
          body: { type: 'string' },
          hashtags: {
            type: 'array',
            items: { type: 'string' },
          },
          seo: {
            type: 'object',
            additionalProperties: false,
            properties: {
              primary_keyword: { type: 'string' },
              meta_title: { type: 'string' },
              meta_description: { type: 'string' },
            },
            required: ['primary_keyword', 'meta_title', 'meta_description'],
          },
          cta: { type: 'string' },
          channel_variants: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                channel: { type: 'string' },
                body: { type: 'string' },
              },
              required: ['channel', 'body'],
            },
          },
        },
        required: ['language', 'title', 'audience', 'body', 'hashtags', 'seo', 'cta', 'channel_variants'],
      },
    },
  },
  required: ['languages'],
};

export const DEFAULT_TOPIC_TEMPLATE = `Bạn là content strategist cho {{product_name}}.

Brand context:
{{product_context}}

Giọng thương hiệu:
{{brand_voice}}

Từ nên dùng:
{{preferred_words}}

Từ cần tránh:
{{avoided_words}}

Kênh nội dung:
{{channels}}

Ngôn ngữ cần hỗ trợ:
{{languages}}

Hãy tạo {{quantity}} chủ đề nội dung khác nhau, có góc khai thác rõ ràng, bám brand context và phù hợp để tiếp tục mở rộng thành bài viết hoàn chỉnh.

Context bổ sung:
{{additional_context}}

Lưu ý:
{{notes}}

Yêu cầu thêm:
{{requirements}}`;

export const DEFAULT_ARTICLE_TEMPLATE = `Bạn là senior content editor cho {{product_name}}.

Brand context:
{{product_context}}

Giọng thương hiệu:
{{brand_voice}}

Từ nên dùng:
{{preferred_words}}

Từ cần tránh:
{{avoided_words}}

Kênh nội dung:
{{channels}}

Ngôn ngữ bắt buộc:
{{languages}}

Mở rộng chủ đề sau thành bài viết hoàn chỉnh:
{{topic}}

Context bổ sung:
{{additional_context}}

Lưu ý:
{{notes}}

Yêu cầu thêm:
{{requirements}}

Trả về tiêu đề, audience, body, hashtags, SEO, CTA và biến thể theo từng kênh.`;
