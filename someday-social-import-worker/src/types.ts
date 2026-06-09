export type Platform = 'tiktok' | 'pinterest';

export interface RawPostData {
  platform: Platform;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  locationTag: string | null;    // structured location tag if platform provides one
  sourceUrl: string | null;      // original source URL (Pinterest often links back to a blog)
  rawHtml: string | null;        // partial HTML head for fallback parsing
}

export interface ExtractedPlace {
  name: string;                  // place or experience name
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  tags: string[];                // vibe/category tags e.g. ["beach", "hidden gem", "sunset"]
  imageUrl: string | null;
  sourceUrl: string;             // original post URL — always stored for B2B event logging
  sourcePlatform: Platform;
  confidence: number;            // 0–1, Claude's self-assessed confidence in the extraction
  rawDescription: string | null; // kept for seeding description field if no DB match
}

export interface WorkerResponse {
  success: boolean;
  place: ExtractedPlace | null;
  error?: string;
}
