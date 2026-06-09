'use client'

/**
 * MapView — city-based destination map.
 *
 * Layout:
 *   Mobile  (default): header 56px → map calc(100vh-120px) → bottom sheet for detail
 *   Desktop (lg+):     header 56px → map calc(100vh-56px) + 320px right panel for detail
 *
 * City state persisted to localStorage ('someday_map_city') and
 * profiles.map_city_preference (via Server Action on each change).
 *
 * Design tokens: lib/design-tokens.ts
 */

import { useState, useEffect, useRef } from 'react'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  ChevronDown,
  MapPin,
  X,
  Building2,
  TreePine,
  Sparkles,
  UtensilsCrossed,
  Locate,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { addPlaceToList } from '@/app/actions/bucketList'
import { saveMapCityPreference } from '@/app/actions/profile'
import type { Place } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
const LS_KEY = 'someday_map_city'

interface CityConfig {
  name: string
  country: string
  lat: number
  lng: number
}

const CITIES: CityConfig[] = [
  { name: 'Tokyo',         country: 'Japan',                lat: 35.6762,  lng: 139.6503  },
  { name: 'Bali',          country: 'Indonesia',             lat: -8.3405,  lng: 115.0920  },
  { name: 'Lisbon',        country: 'Portugal',              lat: 38.7169,  lng: -9.1399   },
  { name: 'Istanbul',      country: 'Turkey',                lat: 41.0082,  lng: 28.9784   },
  { name: 'New York',      country: 'United States',         lat: 40.7128,  lng: -74.0060  },
  { name: 'Paris',         country: 'France',                lat: 48.8566,  lng: 2.3522    },
  { name: 'London',        country: 'United Kingdom',        lat: 51.5074,  lng: -0.1278   },
  { name: 'Sydney',        country: 'Australia',             lat: -33.8688, lng: 151.2093  },
  { name: 'Barcelona',     country: 'Spain',                 lat: 41.3851,  lng: 2.1734    },
  { name: 'Amsterdam',     country: 'Netherlands',           lat: 52.3676,  lng: 4.9041    },
  { name: 'Bangkok',       country: 'Thailand',              lat: 13.7563,  lng: 100.5018  },
  { name: 'Singapore',     country: 'Singapore',             lat: 1.3521,   lng: 103.8198  },
  { name: 'Dubai',         country: 'United Arab Emirates',  lat: 25.2048,  lng: 55.2708   },
  { name: 'Mexico City',   country: 'Mexico',                lat: 19.4326,  lng: -99.1332  },
  { name: 'Buenos Aires',  country: 'Argentina',             lat: -34.6037, lng: -58.3816  },
  { name: 'Cape Town',     country: 'South Africa',          lat: -33.9249, lng: 18.4241   },
  { name: 'Marrakech',     country: 'Morocco',               lat: 31.6295,  lng: -7.9811   },
  { name: 'Copenhagen',    country: 'Denmark',               lat: 55.6761,  lng: 12.5683   },
  { name: 'Seoul',         country: 'South Korea',           lat: 37.5665,  lng: 126.9780  },
  { name: 'Melbourne',     country: 'Australia',             lat: -37.8136, lng: 144.9631  },
  { name: 'Kyoto',         country: 'Japan',                 lat: 35.0116,  lng: 135.7681  },
  { name: 'Rome',          country: 'Italy',                 lat: 41.9028,  lng: 12.4964   },
  { name: 'Berlin',        country: 'Germany',               lat: 52.5200,  lng: 13.4050   },
  { name: 'San Francisco', country: 'United States',         lat: 37.7749,  lng: -122.4194 },
  { name: 'Medellín',      country: 'Colombia',              lat: 6.2442,   lng: -75.5812  },
  { name: 'Tbilisi',       country: 'Georgia',               lat: 41.6938,  lng: 44.8015   },
  { name: 'Vienna',        country: 'Austria',               lat: 48.2082,  lng: 16.3738   },
  { name: 'Porto',         country: 'Portugal',              lat: 41.1579,  lng: -8.6291   },
  { name: 'Queenstown',    country: 'New Zealand',           lat: -45.0312, lng: 168.6626  },
  { name: 'Reykjavik',     country: 'Iceland',               lat: 64.1466,  lng: -21.9426  },
]

const DEFAULT_CITY = CITIES.find(c => c.name === 'Sydney')!

/** Pin colour by place type. */
const TYPE_COLOR: Record<string, string> = {
  city:       '#7B4FE8',  // accentViolet
  nature:     '#6ee7b7',  // green
  experience: '#FF8FAB',  // accentPink
  food:       '#fbbf24',  // amber
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  places: Place[]
  initialBucketPlaceIds: string[]
  savedCityPreference: string | null
}

// ─── MapView (root) ───────────────────────────────────────────────────────────

export default function MapView({ places, initialBucketPlaceIds, savedCityPreference }: Props) {
  const mapRef = useRef<MapRef>(null)

  const [viewState, setViewState] = useState({
    longitude: DEFAULT_CITY.lng,
    latitude:  DEFAULT_CITY.lat,
    zoom:      12,
  })
  const [activeCity,    setActiveCity]    = useState<CityConfig>(DEFAULT_CITY)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [showPicker,    setShowPicker]    = useState(false)
  const [citySearch,    setCitySearch]    = useState('')
  const [isLocating,    setIsLocating]    = useState(false)
  const [bucketIds,     setBucketIds]     = useState<Set<string>>(
    new Set(initialBucketPlaceIds),
  )

  // ── Init: restore city from localStorage → profile → geolocation ──────────
  useEffect(() => {
    // 1. localStorage (fastest — no network)
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const city = JSON.parse(raw) as CityConfig
        if (city?.lat && city?.lng && city?.name) {
          applyCity(city, false)
          return
        }
      }
    } catch {}

    // 2. Profile preference (persisted cross-device)
    if (savedCityPreference) {
      const city = CITIES.find(c => c.name === savedCityPreference)
      if (city) {
        applyCity(city, false)
        return
      }
    }

    // 3. Browser geolocation
    tryGeolocation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyCity(city: CityConfig, animate: boolean) {
    setActiveCity(city)
    if (animate && mapRef.current) {
      mapRef.current.flyTo({ center: [city.lng, city.lat], zoom: 12, duration: 1200 })
    } else {
      setViewState(v => ({ ...v, longitude: city.lng, latitude: city.lat }))
    }
  }

  function tryGeolocation() {
    if (!navigator?.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const locCity: CityConfig = {
          name:    'Your location',
          country: '',
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
        }
        setActiveCity(locCity)
        if (mapRef.current) {
          mapRef.current.flyTo({
            center:   [pos.coords.longitude, pos.coords.latitude],
            zoom:     12,
            duration: 1200,
          })
        } else {
          setViewState(v => ({
            ...v,
            longitude: pos.coords.longitude,
            latitude:  pos.coords.latitude,
          }))
        }
        setIsLocating(false)
      },
      () => setIsLocating(false),
      { timeout: 8000 },
    )
  }

  // ── Derived: places for the active city that have coordinates ─────────────
  const cityPlaces = places.filter(p => {
    if (p.lat == null || p.lng == null) return false
    const cityLower = activeCity.name.toLowerCase()
    return (
      p.country?.toLowerCase() === activeCity.country.toLowerCase() ||
      p.name.toLowerCase().includes(cityLower) ||
      (p.tags ?? []).some(t => t.toLowerCase().includes(cityLower))
    )
  })

  const filteredCities = citySearch
    ? CITIES.filter(
        c =>
          c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
          c.country.toLowerCase().includes(citySearch.toLowerCase()),
      )
    : CITIES

  // ── Handlers ──────────────────────────────────────────────────────────────
  function selectCity(city: CityConfig) {
    applyCity(city, true)
    setShowPicker(false)
    setCitySearch('')
    setSelectedPlace(null)
    try { localStorage.setItem(LS_KEY, JSON.stringify(city)) } catch {}
    saveMapCityPreference(city.name).catch(() => {})
  }

  function useMyLocation() {
    setShowPicker(false)
    setCitySearch('')
    setSelectedPlace(null)
    try { localStorage.removeItem(LS_KEY) } catch {}
    tryGeolocation()
  }

  function recentre() {
    mapRef.current?.flyTo({
      center:   [activeCity.lng, activeCity.lat],
      zoom:     12,
      duration: 800,
    })
  }

  async function handleAddToList(place: Place) {
    if (bucketIds.has(place.id)) return
    setBucketIds(prev => new Set([...prev, place.id]))
    toast.success('Added to your list ✦')
    const result = await addPlaceToList(place.id, 'map')
    if (result.error) {
      setBucketIds(prev => {
        const next = new Set(prev)
        next.delete(place.id)
        return next
      })
      toast.error('Something went wrong. Please try again.')
    }
  }

  // ── Missing token guard ───────────────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] lg:h-[calc(100vh-56px)] gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-violet-accent/10 border border-violet-accent/20 flex items-center justify-center">
          <MapPin size={24} className="text-violet-accent" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-lg font-bold text-white-soft">Map not configured</h2>
        <p className="text-muted text-sm max-w-xs leading-relaxed">
          Set{' '}
          <code className="text-lavender bg-white/5 px-1.5 py-0.5 rounded text-xs">
            NEXT_PUBLIC_MAPBOX_TOKEN
          </code>{' '}
          in <code className="text-lavender bg-white/5 px-1.5 py-0.5 rounded text-xs">.env.local</code> to enable the map.
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 h-14 bg-[#130f2a]/80 backdrop-blur-sm border-b border-white/[0.07] shrink-0">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold text-white-soft leading-none">Explore</h1>
          {cityPlaces.length > 0 && (
            <p className="text-[10px] text-muted mt-0.5 leading-none">
              {cityPlaces.length} {cityPlaces.length === 1 ? 'place' : 'places'} in {activeCity.name}
            </p>
          )}
        </div>

        {/* City selector button */}
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 pl-3 pr-2.5 h-9 rounded-xl bg-white/[0.06] border border-white/10 min-w-0 max-w-[200px] hover:bg-white/[0.1] active:scale-95 transition-all shrink-0"
        >
          <MapPin size={13} className="text-violet-accent shrink-0" />
          <span className="text-sm text-white-soft font-medium truncate">
            {isLocating ? 'Locating…' : activeCity.name}
          </span>
          <ChevronDown size={13} className="text-muted shrink-0" />
        </button>
      </div>

      {/* ── Map + desktop right panel ──────────────────────────────────────── */}
      <div className="relative flex h-[calc(100vh-120px)] lg:h-[calc(100vh-56px)]">

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            ref={mapRef}
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: '100%', height: '100%' }}
            reuseMaps
          >
            {/* Zoom controls */}
            <NavigationControl position="bottom-right" showCompass={false} />

            {/* Re-centre — top right, below nav controls */}
            <div className="absolute top-3 right-3">
              <button
                onClick={recentre}
                aria-label="Re-centre map"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#130f2a]/90 border border-white/[0.12] text-muted hover:text-white-soft hover:bg-[#130f2a] shadow-lg transition-colors active:scale-95"
              >
                <Locate size={15} strokeWidth={1.75} />
              </button>
            </div>

            {/* Place markers */}
            {cityPlaces.map(place => (
              <PlaceMarker
                key={place.id}
                place={place}
                isSelected={selectedPlace?.id === place.id}
                onClick={() =>
                  setSelectedPlace(prev => (prev?.id === place.id ? null : place))
                }
              />
            ))}
          </Map>
        </div>

        {/* Desktop right panel (lg+) */}
        {selectedPlace && (
          <div className="hidden lg:flex w-80 shrink-0 flex-col border-l border-white/[0.07] bg-[#130f2a]">
            <PlaceDetail
              place={selectedPlace}
              isAdded={bucketIds.has(selectedPlace.id)}
              onAdd={handleAddToList}
              onClose={() => setSelectedPlace(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet (below lg) — sits above the 64px bottom nav */}
      {selectedPlace && (
        <div className="lg:hidden fixed inset-x-0 bottom-16 z-40 bg-[#130f2a] border-t border-white/[0.07] rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
          <PlaceDetail
            place={selectedPlace}
            isAdded={bucketIds.has(selectedPlace.id)}
            onAdd={handleAddToList}
            onClose={() => setSelectedPlace(null)}
          />
        </div>
      )}

      {/* City picker overlay */}
      {showPicker && (
        <CityPicker
          cities={filteredCities}
          activeCity={activeCity}
          searchQuery={citySearch}
          onSearchChange={setCitySearch}
          onSelectCity={selectCity}
          onUseLocation={useMyLocation}
          onClose={() => {
            setShowPicker(false)
            setCitySearch('')
          }}
        />
      )}

    </div>
  )
}

// ─── PlaceMarker ──────────────────────────────────────────────────────────────

function PlaceTypeIcon({ type }: { type: string }) {
  const props = { size: 14, color: 'white', strokeWidth: 2 } as const
  switch (type) {
    case 'city':       return <Building2 {...props} />
    case 'nature':     return <TreePine {...props} />
    case 'experience': return <Sparkles {...props} />
    case 'food':       return <UtensilsCrossed {...props} />
    default:           return <MapPin {...props} />
  }
}

function PlaceMarker({
  place,
  isSelected,
  onClick,
}: {
  place: Place
  isSelected: boolean
  onClick: () => void
}) {
  const color = TYPE_COLOR[place.type] ?? '#7B4FE8'

  return (
    <Marker longitude={place.lng!} latitude={place.lat!} anchor="bottom">
      <button
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
        aria-label={place.name}
        style={{
          width:           36,
          height:          36,
          borderRadius:    '50%',
          backgroundColor: color,
          boxShadow:       `0 4px 12px ${color}88`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          border:          `2px solid ${isSelected ? 'rgba(255,255,255,0.9)' : 'transparent'}`,
          transform:       isSelected ? 'scale(1.15)' : 'scale(1)',
          transition:      'transform 150ms ease, border-color 150ms ease',
          cursor:          'pointer',
        }}
      >
        <PlaceTypeIcon type={place.type} />
      </button>
    </Marker>
  )
}

// ─── PlaceDetail ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  city:       'City',
  nature:     'Nature',
  experience: 'Experience',
  food:       'Food & Drink',
}

function PlaceDetail({
  place,
  isAdded,
  onAdd,
  onClose,
}: {
  place: Place
  isAdded: boolean
  onAdd: (p: Place) => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Drag handle (mobile only) */}
      <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-8 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-4 pb-3 shrink-0">
        <div className="flex-1 min-w-0">
          <span
            className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5"
            style={{
              backgroundColor: `${TYPE_COLOR[place.type] ?? '#7B4FE8'}22`,
              color:           TYPE_COLOR[place.type] ?? '#7B4FE8',
            }}
          >
            {TYPE_LABEL[place.type] ?? place.type}
          </span>
          <h3 className="font-display text-xl font-bold text-white-soft leading-tight">
            {place.name}
          </h3>
          <p className="text-sm text-muted mt-0.5">{place.country}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-muted hover:text-white-soft hover:bg-white/[0.12] transition-colors shrink-0 mt-0.5"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {place.description && (
          <p className="text-white-soft/70 text-sm leading-relaxed mb-4">
            {place.description}
          </p>
        )}

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {place.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-white/[0.07] border border-white/10 px-2.5 py-1 text-xs text-lavender"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Vibes */}
        {place.vibes && place.vibes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {place.vibes.map(vibe => (
              <span
                key={vibe}
                className="rounded-full bg-violet-accent/10 border border-violet-accent/20 px-2.5 py-1 text-xs text-lavender"
              >
                {vibe}
              </span>
            ))}
          </div>
        )}

        {/* Add to List */}
        <button
          onClick={() => !isAdded && onAdd(place)}
          disabled={isAdded}
          className={`w-full rounded-xl py-3 font-heading font-semibold text-sm transition-all active:scale-[0.98] ${
            isAdded
              ? 'bg-violet-accent/15 text-violet-accent border border-violet-accent/25 cursor-default'
              : 'bg-violet-accent hover:bg-violet-accent/90 text-white'
          }`}
        >
          {isAdded ? '✦ On your list' : 'Add to List'}
        </button>
      </div>
    </div>
  )
}

// ─── CityPicker ───────────────────────────────────────────────────────────────

function CityPickerContent({
  cities,
  activeCity,
  searchQuery,
  onSearchChange,
  onSelectCity,
  onUseLocation,
  onClose,
}: {
  cities: CityConfig[]
  activeCity: CityConfig
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelectCity: (c: CityConfig) => void
  onUseLocation: () => void
  onClose: () => void
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <h2 className="font-display font-bold text-white-soft text-base">Choose city</h2>
        <button
          onClick={onClose}
          aria-label="Close city picker"
          className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-muted hover:text-white-soft transition-colors"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3 shrink-0">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-3 h-10">
          <Search size={14} className="text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search cities…"
            autoFocus
            className="flex-1 bg-transparent text-sm text-white-soft placeholder-muted outline-none"
          />
        </div>
      </div>

      {/* Use my location */}
      <button
        onClick={onUseLocation}
        className="flex items-center gap-3 w-full px-5 py-3 text-sm text-violet-accent hover:bg-white/[0.04] transition-colors shrink-0"
      >
        <Locate size={16} strokeWidth={1.75} />
        <span className="font-medium">Use my location</span>
      </button>

      <div className="h-px bg-white/[0.07] mx-5 shrink-0" />

      {/* City list */}
      <div className="flex-1 overflow-y-auto py-2">
        {cities.length === 0 ? (
          <p className="text-center text-muted text-sm py-8">No cities match</p>
        ) : (
          cities.map(city => {
            const isActive = activeCity.name === city.name
            return (
              <button
                key={city.name}
                onClick={() => onSelectCity(city)}
                className={`flex items-center justify-between w-full px-5 py-3 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.07] min-h-[44px] ${
                  isActive ? 'bg-white/[0.04]' : ''
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${isActive ? 'text-violet-accent' : 'text-white-soft'}`}>
                    {city.name}
                  </p>
                  <p className="text-xs text-muted">{city.country}</p>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-accent shrink-0" />
                )}
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

function CityPicker(props: {
  cities: CityConfig[]
  activeCity: CityConfig
  searchQuery: string
  onSearchChange: (q: string) => void
  onSelectCity: (c: CityConfig) => void
  onUseLocation: () => void
  onClose: () => void
}) {
  return (
    <>
      {/* Shared backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={props.onClose}
      />

      {/* Mobile: bottom sheet */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[#130f2a] rounded-t-2xl max-h-[80vh] flex flex-col border-t border-white/[0.07]">
        <div className="lg:hidden flex justify-center pt-3 shrink-0">
          <div className="w-8 h-1 rounded-full bg-white/20" />
        </div>
        <CityPickerContent {...props} />
      </div>

      {/* Desktop: centered modal */}
      <div className="hidden lg:flex fixed inset-0 z-50 items-center justify-center pointer-events-none">
        <div className="w-96 max-h-[60vh] bg-[#130f2a] rounded-2xl border border-white/[0.1] shadow-2xl flex flex-col pointer-events-auto">
          <CityPickerContent {...props} />
        </div>
      </div>
    </>
  )
}
