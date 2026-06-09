import { RawPostData, ExtractedPlace } from './types';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function extractPlace(raw: RawPostData, apiKey: string): Promise<ExtractedPlace> {
  const prompt = buildPrompt(raw);

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = data.content.find((b) => b.type === 'text')?.text ?? '';

  return parseClaudeResponse(text, raw);
}

function buildPrompt(raw: RawPostData): string {
  const parts = [
    `You are extracting travel location data from a ${raw.platform} post that a user has shared to a travel bucket list app called Someday.`,
    ``,
    `Post URL: ${raw.url}`,
    raw.title ? `Title/Caption: ${raw.title}` : null,
    raw.description && raw.description !== raw.title ? `Description: ${raw.description}` : null,
    raw.locationTag ? `Location tag: ${raw.locationTag}` : null,
    raw.sourceUrl ? `Source link: ${raw.sourceUrl}` : null,
    ``,
    `Extract the travel destination or experience from this post.`,
    ``,
    `Respond ONLY with a JSON object in this exact format — no preamble, no markdown, no explanation:`,
    `{`,
    `  "name": "specific place or experience name",`,
    `  "city": "city name or null",`,
    `  "country": "full country name or null",`,
    `  "lat": latitude as number or null,`,
    `  "lng": longitude as number or null,`,
    `  "tags": ["up to 5 short vibe tags like beach, hidden gem, sunrise, hiking, food"],`,
    `  "confidence": 0.0 to 1.0 (how confident you are this is a real, identifiable travel place),`,
    `  "rawDescription": "one sentence describing the place or experience"`,
    `}`,
    ``,
    `Rules:`,
    `- "name" should be the specific place (e.g. "Railay Beach", "Hallstatt", "Tsukiji Outer Market") not a generic label`,
    `- If you can identify coordinates with high confidence, include them — otherwise use null`,
    `- tags should be lowercase, 1-3 words each, travel-relevant`,
    `- confidence: 0.9+ means you are certain of the specific place; 0.6-0.9 means likely correct; below 0.6 means uncertain`,
    `- If the post is clearly not about a travel place, return confidence: 0.1 and name: null`,
  ]
    .filter(Boolean)
    .join('\n');

  return parts;
}

function parseClaudeResponse(text: string, raw: RawPostData): ExtractedPlace {
  const clean = text.replace(/```json|```/g, '').trim();

  let parsed: {
    name?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
    tags?: string[];
    confidence?: number;
    rawDescription?: string;
  };

  try {
    parsed = JSON.parse(clean);
  } catch {
    return {
      name: raw.title || 'Unknown place',
      city: null,
      country: null,
      lat: null,
      lng: null,
      tags: [],
      imageUrl: raw.imageUrl,
      sourceUrl: raw.url,
      sourcePlatform: raw.platform,
      confidence: 0.1,
      rawDescription: raw.description,
    };
  }

  return {
    name: parsed.name || raw.title || 'Unknown place',
    city: parsed.city || null,
    country: parsed.country || null,
    lat: typeof parsed.lat === 'number' ? parsed.lat : null,
    lng: typeof parsed.lng === 'number' ? parsed.lng : null,
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    imageUrl: raw.imageUrl,
    sourceUrl: raw.url,
    sourcePlatform: raw.platform,
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
    rawDescription: parsed.rawDescription || raw.description,
  };
}
