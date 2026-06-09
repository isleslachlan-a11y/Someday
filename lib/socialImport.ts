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
  sourcePlatform: 'tiktok' | 'pinterest';
  confidence: number;
  rawDescription: string | null;
}

const WORKER_URL = process.env.NEXT_PUBLIC_SOCIAL_IMPORT_WORKER_URL!;
const AUTH_TOKEN = process.env.SOCIAL_IMPORT_AUTH_TOKEN!;

export async function importFromSocialUrl(
  url: string,
  platform: 'tiktok' | 'pinterest',
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

    const existingPlaceId = await matchPlaceInDb(place);
    if (existingPlaceId) {
      return { status: 'matched', placeId: existingPlaceId, placeName: place.name };
    }

    return { status: 'new', place };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function matchPlaceInDb(place: ExtractedPlace): Promise<string | null> {
  // TODO: query Supabase places table by name + country
  // Use fuzzy match or coordinate proximity if lat/lng available
  // Return the place UUID if found, null if not
  void place;
  return null;
}
