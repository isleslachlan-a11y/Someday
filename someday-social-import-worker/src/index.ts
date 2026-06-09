import { parseTikTok } from './parsers/tiktok';
import { parsePinterest } from './parsers/pinterest';
import { extractPlace } from './extractor';
import type { WorkerResponse, Platform } from './types';

interface Env {
  ANTHROPIC_API_KEY: string;
  AUTH_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://go-someday.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ success: false, place: null, error: 'Method not allowed' }, 405, corsHeaders);
    }

    const authToken = request.headers.get('X-Auth-Token');
    if (authToken !== env.AUTH_TOKEN) {
      return json({ success: false, place: null, error: 'Unauthorized' }, 401, corsHeaders);
    }

    let body: { url?: string; platform?: string };
    try {
      body = await request.json();
    } catch {
      return json({ success: false, place: null, error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const { url, platform } = body;

    if (!url || !platform) {
      return json({ success: false, place: null, error: 'Missing url or platform' }, 400, corsHeaders);
    }

    if (!['tiktok', 'pinterest'].includes(platform)) {
      return json(
        { success: false, place: null, error: `Unsupported platform: ${platform}` },
        400,
        corsHeaders,
      );
    }

    try {
      const rawData =
        platform === 'tiktok'
          ? await parseTikTok(url)
          : await parsePinterest(url);

      const place = await extractPlace(rawData, env.ANTHROPIC_API_KEY);

      const response: WorkerResponse = { success: true, place };
      return json(response, 200, corsHeaders);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Social import error [${platform}]: ${message}`);
      return json({ success: false, place: null, error: message }, 500, corsHeaders);
    }
  },
};

function json(
  data: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
