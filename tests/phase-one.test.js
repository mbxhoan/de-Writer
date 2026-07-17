import test from 'node:test';
import assert from 'node:assert/strict';

import { decryptSecret, encryptSecret } from '../lib/phase-one/crypto.js';
import { createMockArticleResult, createMockTopicResult, scoreGeneratedContent } from '../lib/phase-one/mock.js';
import { renderTemplate, validateTemplateVariables } from '../lib/phase-one/templates.js';

test('renderTemplate replaces supported variables', () => {
  const output = renderTemplate('Hello {{product_name}} - {{quantity}}', {
    product_name: 'Sunrise',
    quantity: '4',
  });

  assert.equal(output, 'Hello Sunrise - 4');
});

test('validateTemplateVariables rejects unknown variables', () => {
  assert.throws(
    () => validateTemplateVariables('Hello {{unknown_token}}'),
    /không hỗ trợ/i,
  );
});

test('encryptSecret round-trips API keys', () => {
  const secret = 'sk-phase-one-demo';
  const encrypted = encryptSecret(secret);
  assert.ok(encrypted);
  assert.equal(decryptSecret(encrypted), secret);
});

test('createMockTopicResult returns requested topic count', () => {
  const result = createMockTopicResult({
    product: {
      name: 'Sunrise Hotel & Spa',
      brandContext: 'Khách sạn nghỉ dưỡng ven biển',
    },
    quantity: 5,
    additionalContext: 'Tháng 8',
    notes: '',
    requirements: '',
  });

  assert.equal(result.topics.length, 5);
  assert.ok(result.topics[0].title.includes('Tháng 8'));
});

test('createMockArticleResult returns bilingual content when requested', () => {
  const result = createMockArticleResult({
    product: {
      name: 'Sunrise Hotel & Spa',
      brandContext: 'Khách sạn nghỉ dưỡng ven biển',
    },
    languages: ['vi', 'en'],
    topic: {
      title: 'Combo nghỉ dưỡng + spa',
      angle: 'Tập trung vào thư giãn và chốt booking',
    },
    channels: ['facebook', 'instagram'],
    additionalContext: '',
    notes: '',
    requirements: '',
  });

  assert.deepEqual(
    result.languages.map((item) => item.language),
    ['vi', 'en'],
  );
  assert.equal(result.languages[0].channel_variants.length, 2);
  assert.ok(scoreGeneratedContent(result) >= 80);
});
