import { CHANNEL_MAP } from './constants.js';
import { excerptFromBody, slugifyText } from './templates.js';

const HOTEL_TOPICS = [
  ['Combo nghỉ dưỡng + spa cho cặp đôi cuối tuần', 'Tập trung vào cảm giác thư giãn, sunset view và ưu đãi giới hạn để kéo booking nhanh.'],
  ['Checklist du lịch gia đình trong mùa cao điểm', 'Biến câu hỏi thường gặp của khách thành nội dung hữu ích, tăng niềm tin trước khi đặt phòng.'],
  ['Một ngày chậm lại ở khu spa ven biển', 'Khai thác cảm giác trải nghiệm hơn là chỉ liệt kê dịch vụ, phù hợp social và blog.'],
  ['Bữa tối buffet hải sản như một lý do để ở lại thêm một đêm', 'Đẩy câu chuyện trải nghiệm ẩm thực để bán chéo phòng và F&B.'],
  ['Gợi ý lịch trình 2N1Đ không cần đi xa', 'Phù hợp nhóm khách nội địa muốn ra quyết định nhanh cho kỳ nghỉ ngắn.'],
];

const IMPACT_TOPICS = [
  ['Sống xanh bắt đầu từ 3 thay đổi nhỏ trong tuần này', 'Nội dung dễ áp dụng, tăng khả năng chia sẻ và tương tác cộng đồng.'],
  ['Câu chuyện phía sau một chiến dịch trồng cây thành công', 'Kể chuyện bằng dữ liệu và con người để tăng độ tin cậy cho tổ chức.'],
  ['Phân loại rác tại nguồn: hiểu nhanh trong 5 phút', 'Đưa ra hướng dẫn thực hành đơn giản để chuyển người đọc sang hành động cụ thể.'],
  ['Một ngày sự kiện cộng đồng được vận hành như thế nào', 'Khai thác hậu trường để tăng kết nối với tình nguyện viên và nhà tài trợ.'],
  ['Từ thói quen văn phòng đến tác động môi trường dài hạn', 'Đặt vấn đề gần gũi để dẫn vào CTA cho chiến dịch hoặc workshop.'],
];

const GENERIC_TOPICS = [
  ['Góc nhìn hậu trường của sản phẩm', 'Dùng hậu trường để làm nội dung tin cậy và ít mang cảm giác quảng cáo.'],
  ['Tình huống khách hàng thường hỏi nhất', 'Chuyển câu hỏi lặp lại thành bài viết giáo dục và hỗ trợ bán hàng.'],
  ['Một case study nhỏ nhưng có sức thuyết phục cao', 'Chọn ví dụ cụ thể để tạo độ tin cậy và dễ chuyển đổi.'],
  ['Checklist ra quyết định nhanh', 'Nội dung ngắn, rõ, hợp social và nội dung tìm kiếm.'],
  ['Lợi ích thường bị bỏ quên của sản phẩm', 'Khai thác góc mới để tránh trùng lặp với các bài bán hàng thông thường.'],
];

function chooseTopicSet(product) {
  const haystack = `${product.name} ${product.brandContext}`.toLowerCase();
  if (haystack.includes('hotel') || haystack.includes('spa') || haystack.includes('resort')) {
    return HOTEL_TOPICS;
  }
  if (haystack.includes('môi trường') || haystack.includes('environment') || haystack.includes('green')) {
    return IMPACT_TOPICS;
  }
  return GENERIC_TOPICS;
}

function keywordFromTopic(topicTitle) {
  const bare = topicTitle.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  return bare.toLowerCase();
}

function buildViBody({ product, topic, additionalContext, notes, requirements }) {
  return [
    `${topic.title} là một góc nội dung phù hợp để ${product.name} kể câu chuyện theo hướng gần gũi nhưng vẫn có tính chuyển đổi. ${topic.angle}`,
    `${product.name} nên mở bài bằng một tình huống thật hoặc một lợi ích cụ thể, sau đó triển khai 2-3 ý chính giúp người đọc thấy rõ giá trị thay vì chỉ đọc quảng cáo. ${additionalContext || 'Nếu có dữ liệu nội bộ hoặc câu hỏi khách hàng lặp lại, nên đưa vào để bài viết có chiều sâu hơn.'}`,
    `${notes ? `Lưu ý triển khai: ${notes}. ` : ''}${requirements ? `Yêu cầu thêm cần bám sát: ${requirements}. ` : ''}Kết bài nên chốt bằng CTA ngắn, rõ, đúng giọng thương hiệu và phù hợp từng kênh.`,
  ].join('\n\n');
}

function buildEnBody({ product, topic, additionalContext, notes, requirements }) {
  return [
    `${topic.title} gives ${product.name} a useful content angle that feels practical instead of overly promotional. ${topic.angle}`,
    `${product.name} should open with a specific moment or pain point, then develop two or three clear ideas that show value before asking for action. ${additionalContext || 'If the team has recurring customer questions or campaign data, that context should be woven into the story.'}`,
    `${notes ? `Editorial note: ${notes}. ` : ''}${requirements ? `Additional requirement: ${requirements}. ` : ''}Close with a direct CTA tailored to each channel rather than repeating one generic ending everywhere.`,
  ].join('\n\n');
}

function buildHashtags(product, language, topicTitle) {
  const productTag = slugifyText(product.name).replace(/-/g, '');
  const keywordTag = slugifyText(topicTitle).replace(/-/g, '');
  const base = language === 'vi' ? ['contentmarketing', 'thuonghieu'] : ['contentops', 'brandvoice'];
  return [`#${productTag}`, `#${keywordTag}`, ...base.map((tag) => `#${tag}`)];
}

function buildAudience(product, language) {
  const haystack = `${product.name} ${product.brandContext}`.toLowerCase();
  if (haystack.includes('hotel') || haystack.includes('spa') || haystack.includes('resort')) {
    return language === 'vi'
      ? 'Khách đang cân nhắc kỳ nghỉ ngắn hoặc combo cuối tuần'
      : 'Travellers comparing short-stay packages or weekend escapes';
  }

  if (haystack.includes('môi trường') || haystack.includes('environment') || haystack.includes('green')) {
    return language === 'vi'
      ? 'Cộng đồng quan tâm đến lối sống bền vững và hành động thực tế'
      : 'Community members interested in sustainable habits and practical action';
  }

  return language === 'vi'
    ? 'Khách hàng đang tìm hiểu trước khi ra quyết định'
    : 'Prospects who need clarity before making a decision';
}

function buildChannelBody({ channelId, language, topicTitle, product, cta }) {
  const label = CHANNEL_MAP[channelId]?.label || channelId;
  if (language === 'vi') {
    return `${topicTitle}\n\nBản cho ${label}: mở bằng một hook ngắn, nhấn điểm khác biệt của ${product.name}, kết bằng CTA “${cta}”.`;
  }
  return `${topicTitle}\n\n${label} variant: start with a short hook, highlight what makes ${product.name} worth attention, and close with "${cta}".`;
}

export function scoreGeneratedContent(content) {
  let score = 62;
  const languages = content?.languages || [];

  if (languages.length) {
    score += 10;
  }

  for (const languageBlock of languages) {
    if (languageBlock.body?.trim()) score += 5;
    if (languageBlock.hashtags?.length) score += 4;
    if (languageBlock.seo?.primary_keyword) score += 5;
    if (languageBlock.seo?.meta_description) score += 4;
    if (languageBlock.cta?.trim()) score += 4;
    if (languageBlock.channel_variants?.length) score += 4;
  }

  return Math.min(96, score);
}

export function createMockTopicResult({ product, quantity, additionalContext, notes, requirements }) {
  const topics = [];
  const topicSet = chooseTopicSet(product);

  for (let index = 0; index < quantity; index += 1) {
    const [baseTitle, baseAngle] = topicSet[index % topicSet.length];
    const contextSuffix = additionalContext ? ` · ${additionalContext}` : '';
    const requirementSuffix = requirements ? ` Ưu tiên ${requirements.toLowerCase()}.` : '';
    const notesSuffix = notes ? ` Giữ ý ${notes.toLowerCase()}.` : '';

    topics.push({
      title: `${baseTitle}${contextSuffix}`,
      angle: `${baseAngle}${requirementSuffix}${notesSuffix}`.trim(),
    });
  }

  return { topics };
}

export function createMockArticleResult({
  product,
  languages,
  topic,
  channels,
  additionalContext,
  notes,
  requirements,
}) {
  return {
    languages: languages.map((language) => {
      const isVietnamese = language === 'vi';
      const body = isVietnamese
        ? buildViBody({ product, topic, additionalContext, notes, requirements })
        : buildEnBody({ product, topic, additionalContext, notes, requirements });
      const title = isVietnamese
        ? topic.title
        : `${topic.title} | ${product.name}`;
      const cta = isVietnamese
        ? `Nhắn đội ngũ ${product.name} để nhận lịch đăng hoặc ưu đãi phù hợp.`
        : `Message the ${product.name} team for the best publishing slot or offer.`;
      const primaryKeyword = keywordFromTopic(topic.title);
      const metaTitle = isVietnamese
        ? `${topic.title} | ${product.name}`
        : `${topic.title} | ${product.name}`;
      const metaDescription = excerptFromBody(body, 145);

      return {
        language,
        title,
        audience: buildAudience(product, language),
        body,
        hashtags: buildHashtags(product, language, topic.title),
        seo: {
          primary_keyword: primaryKeyword,
          meta_title: metaTitle,
          meta_description: metaDescription,
        },
        cta,
        channel_variants: channels.map((channelId) => ({
          channel: channelId,
          body: buildChannelBody({
            channelId,
            language,
            topicTitle: title,
            product,
            cta,
          }),
        })),
      };
    }),
  };
}
