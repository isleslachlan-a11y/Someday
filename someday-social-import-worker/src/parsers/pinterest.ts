import { RawPostData } from '../types';
import { fetchHead, extractOgTag, extractMetaTag } from './utils';

export async function parsePinterest(url: string): Promise<RawPostData> {
  const html = await fetchHead(url);

  const title = extractOgTag(html, 'og:title');
  const description = extractOgTag(html, 'og:description');
  const imageUrl = extractOgTag(html, 'og:image');

  // Pinterest often embeds the source URL in og:see_also or a canonical link
  const sourceUrl =
    extractMetaTag(html, 'og:see_also') ||
    extractMetaTag(html, 'article:tag') || // sometimes contains board name
    null;

  return {
    platform: 'pinterest',
    url,
    title,
    description,
    imageUrl,
    locationTag: null, // no structured location tag on Pinterest
    sourceUrl,
    rawHtml: html.slice(0, 4000),
  };
}
