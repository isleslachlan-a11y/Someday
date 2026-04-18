'use client'

/**
 * MapLoader — thin client-component wrapper so that `ssr: false` is legal
 * (next/dynamic with ssr:false is only allowed inside client components in
 * Next.js 16+).
 */

import dynamic from 'next/dynamic'
import type { Place } from '@/lib/types'

const MapView = dynamic(() => import('./MapView'), { ssr: false })

interface Props {
  places: Place[]
  initialBucketPlaceIds: string[]
  savedCityPreference: string | null
}

export default function MapLoader(props: Props) {
  return <MapView {...props} />
}
