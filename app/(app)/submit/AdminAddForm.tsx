'use client'

import { useState } from 'react'
import AdminDestinationForm from './AdminDestinationForm'
import AdminExperienceForm from './AdminExperienceForm'

type Kind = 'destination' | 'experience'

interface Props {
  userId: string
}

export default function AdminAddForm({ userId }: Props) {
  const [kind, setKind] = useState<Kind | null>(null)

  if (kind === 'destination') {
    return <AdminDestinationForm userId={userId} onBack={() => setKind(null)} />
  }
  if (kind === 'experience') {
    return <AdminExperienceForm userId={userId} onBack={() => setKind(null)} />
  }

  return (
    <div>
      <p className="font-nunito text-[#131936]/50 text-[13px] mb-6">
        What are you adding to the database?
      </p>
      <div className="space-y-3">
        <button
          onClick={() => setKind('destination')}
          className="w-full text-left rounded-2xl border-2 border-[#fcd99a]/60 bg-white p-5 active:scale-[0.98] transition-all hover:border-[#f08c21]/40"
        >
          <div className="flex items-start gap-4">
            <span className="text-[32px] shrink-0">🗺</span>
            <div>
              <p className="font-syne font-bold text-[#131936] text-[16px]">Destination</p>
              <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5">
                A city, region, country, or natural landscape.
              </p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setKind('experience')}
          className="w-full text-left rounded-2xl border-2 border-[#fcd99a]/60 bg-white p-5 active:scale-[0.98] transition-all hover:border-[#f08c21]/40"
        >
          <div className="flex items-start gap-4">
            <span className="text-[32px] shrink-0">✨</span>
            <div>
              <p className="font-syne font-bold text-[#131936] text-[16px]">Experience</p>
              <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5">
                A specific activity, attraction, restaurant, or event.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
