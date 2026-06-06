'use client'

import { useState } from 'react'
import { useInView } from './useInView'

const FAQS = [
  {
    q: 'When does Someday launch?',
    a: 'We\'re in the final stages of development. Waitlist members get first access — we\'ll email you directly when the doors open.',
  },
  {
    q: 'Is it free to use?',
    // TODO: confirm with final pricing decision
    a: 'Yes. Someday is free at launch. We\'ll introduce optional premium features down the line, but the core experience will always be free.',
  },
  {
    q: 'What platforms will Someday be on?',
    a: 'We\'re launching on web first, with iOS and Android apps following shortly after. Waitlist members get notified for each.',
  },
  {
    q: 'Can I suggest places to add to the database?',
    a: 'Yes — there\'s an option to submit destinations and experiences on this page. Every suggestion is reviewed by our team before it goes live.',
  },
  {
    q: 'Who\'s building Someday?',
    // TODO: personalise
    a: 'Lachlan and Sophia — a two-person team based on the Sunshine Coast, Australia. We built Someday because we kept saying \'we should go there someday\' and never did.',
  },
]

export function FAQSection() {
  const { ref, isVisible } = useInView()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex(prev => (prev === i ? null : i))
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4'}`}
    >
      <section id="faq" className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">

          <p className="font-nunito uppercase tracking-widest text-xs text-[rgba(19,25,54,0.4)] mb-4">
            FAQ
          </p>
          {/* TODO: refine — the "answered honestly" framing is from Alloovium; keep if it fits Someday voice */}
          <h2 className="font-syne font-bold text-[#131936] text-3xl md:text-4xl leading-tight">
            Common questions,<br />answered honestly.
          </h2>

          <div className="max-w-2xl mx-auto mt-12">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-[rgba(252,217,154,0.5)] py-5">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-syne font-semibold text-[#131936] text-base">
                    {faq.q}
                  </span>
                  <span className="text-[#f08c21] text-xl font-light shrink-0 leading-none">
                    {openIndex === i ? '−' : '+'}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${openIndex === i ? 'max-h-96 pt-3 pb-1' : 'max-h-0'}`}
                >
                  <p className="font-nunito text-sm text-[rgba(19,25,54,0.5)] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  )
}
