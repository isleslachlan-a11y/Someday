import { RawPostData } from '../types';
import { fetchHead, extractOgTag } from './utils';

const OEMBED_URL = 'https://www.tiktok.com/oembed';

export async function parseTikTok(url: string): Promise<RawPostData> {
  // Strategy 1: oEmbed API (preferred — no scraping, official, reliable)
  try {
    const oembedRes = await fetch(`${OEMBED_URL}?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Someday-App/1.0' },
    });

    if (oembedRes.ok) {
      const data = (await oembedRes.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };

      return {
        platform: 'tiktok',
        url,
        title: data.title || null,
        description: data.title || null, // TikTok oEmbed puts caption in title
        imageUrl: data.thumbnail_url || null,
        locationTag: null,               // not in oEmbed — Claude infers from caption
        sourceUrl: null,
        rawHtml: null,
      };
    }
  } catch {
    // fall through to OG scrape
  }

  // Strategy 2: OG tag scrape (fallback)
  const html = await fetchHead(url);
  return {
    platform: 'tiktok',
    url,
    title: extractOgTag(html, 'og:title'),
    description: extractOgTag(html, 'og:description'),
    imageUrl: extractOgTag(html, 'og:image'),
    locationTag: null,
    sourceUrl: null,
    rawHtml: html.slice(0, 4000), // first 4KB of head only — enough for meta tags
  };
}
