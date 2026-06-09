'use client'

import { useState } from 'react'
import DestinationSubmitForm from './DestinationSubmitForm'
import ExperienceSubmitForm from './ExperienceSubmitForm'

type Kind = 'destination' | 'experience'

interface Props {
  userId: string
}

export default function SubmitTypeSelector({ userId }: Props) {
  const [kind, setKind] = useState<Kind | null>(null)

  if (kind === 'destination') {
    return <DestinationSubmitForm userId={userId} onBack={() => setKind(null)} />
  }
  if (kind === 'experience') {
    return <ExperienceSubmitForm userId={userId} onBack={() => setKind(null)} />
  }

  return (
    <div>
      <h1 className="font-display text-[22px] font-bold text-[#131936] mb-2">
        Know somewhere we should add?
      </h1>
      <p className="font-nunito text-[#131936]/50 text-[14px] mb-8 leading-relaxed">
        Submit a place or experience. We review every submission personally.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => setKind('destination')}
          className="w-full text-left rounded-2xl border-2 border-[#fcd99a]/60 bg-white p-5 active:scale-[0.98] transition-all hover:border-[#f89a14]/40"
        >
          <div className="flex items-start gap-4">
            <span className="text-[36px] shrink-0">🗺</span>
            <div>
              <p className="font-display font-bold text-[#131936] text-[17px]">Destination</p>
              <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5 leading-relaxed">
                A city, country, region, or natural landscape worth travelling to.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setKind('experience')}
          className="w-full text-left rounded-2xl border-2 border-[#fcd99a]/60 bg-white p-5 active:scale-[0.98] transition-all hover:border-[#f89a14]/40"
        >
          <div className="flex items-start gap-4">
            <span className="text-[36px] shrink-0">✨</span>
            <div>
              <p className="font-display font-bold text-[#131936] text-[17px]">Experience</p>
              <p className="font-nunito text-[#131936]/50 text-[13px] mt-0.5 leading-relaxed">
                A specific activity, attraction, restaurant, or event at a destination.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
