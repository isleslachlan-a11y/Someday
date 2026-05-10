'use client'

import { useState } from 'react'
import { bulkLinkImages, linkSinglePlaceImage, type BulkLinkResult } from '@/app/actions/unsplash-actions'

interface PlaceRow {
  id: string
  name: string
  country: string
  type: string
  image_url: string | null
}

interface Props {
  places: PlaceRow[]
}

export default function ImageAdminClient({ places }: Props) {
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkLinkResult | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const [singleId, setSingleId] = useState('')
  const [singleRunning, setSingleRunning] = useState(false)
  const [singleResult, setSingleResult] = useState<{ success: boolean; imageUrl?: string } | null>(null)

  async function runBulk() {
    setBulkRunning(true)
    setBulkResult(null)
    setBulkError(null)
    try {
      const result = await bulkLinkImages()
      setBulkResult(result)
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setBulkRunning(false)
    }
  }

  async function runSingle() {
    if (!singleId.trim()) return
    setSingleRunning(true)
    setSingleResult(null)
    try {
      const success = await linkSinglePlaceImage(singleId.trim())
      setSingleResult({ success })
    } finally {
      setSingleRunning(false)
    }
  }

  const unlinkedCount = places.filter(p => !p.image_url).length

  return (
    <div style={{ fontFamily: 'monospace', maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Someday Image Admin</h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.875rem' }}>
        {places.length} places total · {unlinkedCount} without images
      </p>

      {/* ── Section 1: Bulk link ─────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem', padding: '1.25rem', border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Bulk image link</h2>
        <p style={{ color: '#555', fontSize: '0.875rem' }}>
          Link images to all {unlinkedCount} places with no image_url.
          Rate limit: 50 req/hour on demo keys — approx {Math.ceil(unlinkedCount * 0.5 / 60)} min to complete.
        </p>
        <button
          onClick={runBulk}
          disabled={bulkRunning || unlinkedCount === 0}
          style={{
            padding: '0.5rem 1.25rem',
            background: bulkRunning ? '#999' : '#f08c21',
            color: '#131936',
            border: 'none',
            borderRadius: 6,
            cursor: bulkRunning ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {bulkRunning ? 'Running… do not close this page' : 'Run bulk image link'}
        </button>

        {bulkError && (
          <pre style={{ marginTop: '1rem', color: 'red', fontSize: '0.8rem' }}>Error: {bulkError}</pre>
        )}
        {bulkResult && (
          <pre style={{ marginTop: '1rem', background: '#f4f4f4', padding: '1rem', borderRadius: 6, fontSize: '0.8rem', overflowX: 'auto' }}>
            {JSON.stringify(bulkResult, null, 2)}
          </pre>
        )}
      </section>

      {/* ── Section 2: Single place ──────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem', padding: '1.25rem', border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Single place link</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={singleId}
            onChange={e => setSingleId(e.target.value)}
            placeholder="Place UUID"
            style={{ flex: 1, minWidth: 260, padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
          <button
            onClick={runSingle}
            disabled={singleRunning || !singleId.trim()}
            style={{
              padding: '0.5rem 1.25rem',
              background: singleRunning ? '#999' : '#131936',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: singleRunning ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {singleRunning ? 'Linking…' : 'Link image to this place'}
          </button>
        </div>
        {singleResult && (
          <p style={{ marginTop: '0.75rem', color: singleResult.success ? 'green' : 'red', fontSize: '0.875rem' }}>
            {singleResult.success ? '✓ Image linked successfully.' : '✗ No image found for this place.'}
          </p>
        )}
      </section>

      {/* ── Section 3: Preview table ─────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '1.1rem' }}>Places preview</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f4f4f4' }}>
                {['Name', 'Country', 'Type', 'Image', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {places.map(place => (
                <tr key={place.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{place.name}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#555' }}>{place.country}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#555', textTransform: 'capitalize' }}>{place.type}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    {place.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={place.image_url} alt={place.name} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                    ) : (
                      <span style={{ color: 'red', fontWeight: 600 }}>No image</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    {place.image_url
                      ? <span style={{ color: 'green' }}>✓ Linked</span>
                      : <span style={{ color: '#999' }}>Pending</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
