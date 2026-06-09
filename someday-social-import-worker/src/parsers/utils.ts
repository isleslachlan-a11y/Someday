export async function fetchHead(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Someday-Bot/1.0)',
      'Accept': 'text/html',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No body');

  let html = '';
  const decoder = new TextDecoder();
  while (html.length < 50000) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: !done });
    if (html.includes('</head>')) break;
  }
  reader.cancel();
  return html;
}

export function extractOgTag(html: string, property: string): string | null {
  const match =
    html.match(
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    ) ||
    html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    );
  return match ? decodeHtmlEntities(match[1]) : null;
}

export function extractMetaTag(html: string, name: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  );
  return match ? decodeHtmlEntities(match[1]) : null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
