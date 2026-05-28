import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

const REGION_MAP: Record<string, string> = {
  Japan: 'Asia', China: 'Asia', India: 'Asia', Thailand: 'Asia',
  Indonesia: 'Asia', Vietnam: 'Asia', Cambodia: 'Asia', Malaysia: 'Asia',
  Singapore: 'Asia', Philippines: 'Asia', 'South Korea': 'Asia',
  Taiwan: 'Asia', Nepal: 'Asia', Myanmar: 'Asia', Laos: 'Asia',
  'Sri Lanka': 'Asia', Bangladesh: 'Asia', Pakistan: 'Asia',
  Iran: 'Asia', Iraq: 'Asia', Jordan: 'Asia', Lebanon: 'Asia',
  Israel: 'Asia', Turkey: 'Asia', Georgia: 'Asia', Armenia: 'Asia',
  Azerbaijan: 'Asia', Kazakhstan: 'Asia', Uzbekistan: 'Asia',
  Mongolia: 'Asia', 'Saudi Arabia': 'Asia', UAE: 'Asia',
  'United Arab Emirates': 'Asia', Qatar: 'Asia', Kuwait: 'Asia',
  Oman: 'Asia', Yemen: 'Asia', Bahrain: 'Asia',
  France: 'Europe', Germany: 'Europe', Italy: 'Europe', Spain: 'Europe',
  Portugal: 'Europe', Netherlands: 'Europe', Belgium: 'Europe',
  Switzerland: 'Europe', Austria: 'Europe', Greece: 'Europe',
  Croatia: 'Europe', Montenegro: 'Europe', Albania: 'Europe',
  Serbia: 'Europe', Slovenia: 'Europe', Slovakia: 'Europe',
  'Czech Republic': 'Europe', Hungary: 'Europe', Poland: 'Europe',
  Romania: 'Europe', Bulgaria: 'Europe', Ukraine: 'Europe',
  Lithuania: 'Europe', Latvia: 'Europe', Estonia: 'Europe',
  Finland: 'Europe', Sweden: 'Europe', Norway: 'Europe',
  Denmark: 'Europe', Iceland: 'Europe', Ireland: 'Europe',
  'United Kingdom': 'Europe', Malta: 'Europe', Cyprus: 'Europe',
  Luxembourg: 'Europe', Monaco: 'Europe', 'Faroe Islands': 'Europe',
  Russia: 'Europe', Kosovo: 'Europe',
  'United States': 'Americas', Canada: 'Americas', Mexico: 'Americas',
  Brazil: 'Americas', Argentina: 'Americas', Chile: 'Americas',
  Colombia: 'Americas', Peru: 'Americas', Ecuador: 'Americas',
  Bolivia: 'Americas', Venezuela: 'Americas', Uruguay: 'Americas',
  Paraguay: 'Americas', Panama: 'Americas', 'Costa Rica': 'Americas',
  Guatemala: 'Americas', Cuba: 'Americas', Jamaica: 'Americas',
  'Dominican Republic': 'Americas', 'Trinidad and Tobago': 'Americas',
  Morocco: 'Africa', Egypt: 'Africa', Tunisia: 'Africa', Algeria: 'Africa',
  Ethiopia: 'Africa', Kenya: 'Africa', Tanzania: 'Africa', Uganda: 'Africa',
  Rwanda: 'Africa', Ghana: 'Africa', Nigeria: 'Africa', Senegal: 'Africa',
  'South Africa': 'Africa', Zimbabwe: 'Africa', Zambia: 'Africa',
  Mozambique: 'Africa', Madagascar: 'Africa', Namibia: 'Africa',
  Botswana: 'Africa', Angola: 'Africa', Cameroon: 'Africa',
  Somalia: 'Africa', Eritrea: 'Africa',
  Australia: 'Oceania', 'New Zealand': 'Oceania', Fiji: 'Oceania',
  'Papua New Guinea': 'Oceania', Vanuatu: 'Oceania', Samoa: 'Oceania',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!MAPBOX_TOKEN) {
    return NextResponse.json({ error: 'MAPBOX_TOKEN not configured' }, { status: 500 })
  }

  const mode  = req.nextUrl.searchParams.get('mode')
  const input = req.nextUrl.searchParams.get('input') ?? ''

  // ── AUTOCOMPLETE ──────────────────────────────────────────────────────────
  if (mode === 'autocomplete') {
    const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
    url.searchParams.set('q', input)
    url.searchParams.set('access_token', MAPBOX_TOKEN)
    url.searchParams.set('autocomplete', 'true')
    url.searchParams.set('limit', '6')
    url.searchParams.set('types', 'country,region,place,locality,neighborhood')

    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'Mapbox error' }, { status: 502 })
    const data = await res.json()

    const predictions = (data.features ?? []).map((f: Record<string, unknown>) => {
      const props   = (f.properties ?? {}) as Record<string, unknown>
      const context = (props.context ?? {}) as Record<string, Record<string, string>>
      const mainText  = props.name as string ?? ''
      const country   = context.country?.name ?? ''
      const region    = context.region?.name  ?? ''
      const secondary = [region, country].filter(Boolean).join(', ')
      const geometry  = (f.geometry ?? {}) as { coordinates?: number[] }

      return {
        place_id:        (props.mapbox_id as string | undefined) ?? (f.id as string),
        description:     (props.place_formatted as string | undefined) ?? mainText,
        main_text:       mainText,
        secondary_text:  secondary,
        lat:             geometry.coordinates?.[1] ?? null,
        lng:             geometry.coordinates?.[0] ?? null,
        country,
        region_name:     region,
        feature_type:    (props.feature_type as string | undefined) ?? null,
        mapbox_category: ((props.poi_category as string[] | undefined)?.[0]) ?? null,
      }
    })

    return NextResponse.json({ predictions })
  }

  // ── DETAILS (retrieve full feature by mapbox_id) ──────────────────────────
  if (mode === 'details') {
    const mapboxId      = req.nextUrl.searchParams.get('place_id') ?? ''
    const fallbackLat   = req.nextUrl.searchParams.get('lat')
    const fallbackLng   = req.nextUrl.searchParams.get('lng')
    const fallbackCountry = req.nextUrl.searchParams.get('country') ?? ''
    const fallbackRegion  = req.nextUrl.searchParams.get('region_name') ?? ''
    const fallbackName        = req.nextUrl.searchParams.get('name') ?? ''
    const fallbackFeatureType = req.nextUrl.searchParams.get('feature_type') ?? null

    const url = new URL(
      `https://api.mapbox.com/search/geocode/v6/retrieve/${encodeURIComponent(mapboxId)}`
    )
    url.searchParams.set('access_token', MAPBOX_TOKEN)

    const res = await fetch(url.toString(), { cache: 'no-store' })

    function buildFallback() {
      const region = (REGION_MAP[fallbackCountry] ?? 'Global') as
        'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania' | 'Global'
      return NextResponse.json({
        name:           fallbackName,
        country:        fallbackCountry,
        admin_area:     fallbackRegion,
        state_province: fallbackRegion || null,
        region,
        lat:            fallbackLat ? parseFloat(fallbackLat) : null,
        lng:            fallbackLng ? parseFloat(fallbackLng) : null,
        feature_type:   fallbackFeatureType,
      })
    }

    if (!res.ok) return buildFallback()

    const data = await res.json()
    const f = (data.features ?? [])[0] as Record<string, unknown> | undefined
    if (!f) return buildFallback()

    const props   = (f.properties ?? {}) as Record<string, unknown>
    const context = (props.context ?? {}) as Record<string, Record<string, string>>
    const country   = context.country?.name ?? fallbackCountry
    const adminArea = context.region?.name  ?? fallbackRegion
    const region = (REGION_MAP[country] ?? 'Global') as
      'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania' | 'Global'
    const geometry = (f.geometry ?? {}) as { coordinates?: number[] }

    return NextResponse.json({
      name:           (props.name as string | undefined) ?? fallbackName,
      country,
      admin_area:     adminArea,
      state_province: adminArea || null,
      region,
      lat:            geometry.coordinates?.[1] ?? null,
      lng:            geometry.coordinates?.[0] ?? null,
      feature_type:   (props.feature_type as string | undefined) ?? fallbackFeatureType,
    })
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
