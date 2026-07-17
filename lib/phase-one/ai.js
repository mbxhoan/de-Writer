import 'server-only';

import { PROVIDERS } from './constants.js';

function fallbackModels(provider) {
  const providerMeta = PROVIDERS.find((item) => item.id === provider);
  if (!providerMeta) {
    return [];
  }

  if (provider === 'anthropic') {
    return ['claude-sonnet-5', 'claude-haiku-4.5', providerMeta.defaultModel];
  }

  return ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.4', providerMeta.defaultModel];
}

function extractOpenAIText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.text) {
        return content.text;
      }
    }
  }

  return '';
}

async function parseError(response) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body);
    return parsed.error?.message || parsed.message || body;
  } catch {
    return body;
  }
}

export async function listModels({ provider, apiKey }) {
  if (!apiKey) {
    return {
      provider,
      mode: 'fallback',
      models: [...new Set(fallbackModels(provider))],
    };
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/models?limit=20', {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const payload = await response.json();
    return {
      provider,
      mode: 'live',
      models: payload.data.map((model) => model.id),
    };
  }

  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = await response.json();
  const models = payload.data
    .map((model) => model.id)
    .filter((id) => id.startsWith('gpt') || id.startsWith('o'))
    .sort();

  return {
    provider,
    mode: 'live',
    models,
  };
}

export async function generateStructured({
  provider,
  model,
  apiKey,
  schemaName,
  schema,
  system,
  prompt,
  fallbackData,
}) {
  if (!apiKey) {
    return {
      mode: 'mock',
      data: fallbackData,
      usage: { mode: 'mock' },
      raw: null,
    };
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: prompt }],
        output_config: {
          format: {
            type: 'json_schema',
            schema,
          },
        },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const payload = await response.json();
    const rawText = payload.content?.[0]?.text || '';

    return {
      mode: 'live',
      data: JSON.parse(rawText),
      usage: payload.usage || null,
      raw: payload,
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const payload = await response.json();
  const rawText = extractOpenAIText(payload);

  return {
    mode: 'live',
    data: JSON.parse(rawText),
    usage: payload.usage || null,
    raw: payload,
  };
}
