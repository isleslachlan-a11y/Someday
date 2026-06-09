'use server'

export type SocialImportPlatform = 'tiktok' | 'pinterest';

export type SocialImportResult =
  | { status: 'matched'; placeId: string; placeName: string }
  | { status: 'new'; place: ExtractedPlace }
  | { status: 'low_confidence'; place: ExtractedPlace }
  | { status: 'error'; message: string };

export interface ExtractedPlace {
  name: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];
  imageUrl: string | null;
  sourceUrl: string;
  sourcePlatform: SocialImportPlatform;
  confidence: number;
  rawDescription: string | null;
}

export function detectPlatform(url: string): SocialImportPlatform | null {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('pinterest.com') || url.includes('pin.it')) return 'pinterest';
  return null;
}

const WORKER_URL = process.env.SOCIAL_IMPORT_WORKER_URL!;
const AUTH_TOKEN = process.env.SOCIAL_IMPORT_AUTH_TOKEN!;

export async function importFromSocialUrl(
  url: string,
  platform: SocialImportPlatform,
): Promise<SocialImportResult> {
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': AUTH_TOKEN,
      },
      body: JSON.stringify({ url, platform }),
    });

    const data = (await res.json()) as {
      success: boolean;
      place: ExtractedPlace | null;
      error?: string;
    };

    if (!data.success || !data.place) {
      return { status: 'error', message: data.error || 'Import failed' };
    }

    const place = data.place;

    if (place.confidence < 0.6) {
      return { status: 'low_confidence', place };
    }

    return { status: 'new', place };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
