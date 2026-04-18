import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'

export const metadata: Metadata = {
  title: 'Map',
  description: 'Explore destinations on the map.',
}

export default function MapPage() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-violet-accent/10 border border-violet-accent/20">
          <MapPin size={28} className="text-violet-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-syne text-2xl font-bold text-white-soft">Map</h1>
        <p className="text-muted text-sm">Map coming in Session F2</p>
      </div>
    </PageContainer>
  )
}
