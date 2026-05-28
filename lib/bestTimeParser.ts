export function parseBestTimeToMonths(bestTime: string | null | undefined): {
  peak: Set<number>
  shoulder: Set<number>
} | null {
  try {
    if (!bestTime) return null
    const text = bestTime.toLowerCase()

    const monthMap: Record<string, number> = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8, sept: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11,
    }

    const foundMonths: number[] = []
    // Sort by key length descending so 'september' matches before 'sep'
    for (const key of Object.keys(monthMap).sort((a, b) => b.length - a.length)) {
      const idx = monthMap[key]
      if (text.includes(key) && !foundMonths.includes(idx)) {
        foundMonths.push(idx)
      }
    }

    if (foundMonths.length === 0) {
      if (text.includes('summer'))                       foundMonths.push(5, 6, 7)
      else if (text.includes('winter'))                  foundMonths.push(11, 0, 1)
      else if (text.includes('spring'))                  foundMonths.push(2, 3, 4)
      else if (text.includes('autumn') || text.includes('fall')) foundMonths.push(8, 9, 10)
      else return null
    }

    const peak = new Set(foundMonths)
    const rawShoulder = new Set<number>()
    for (const m of foundMonths) {
      const prev = (m - 1 + 12) % 12
      const next = (m + 1) % 12
      if (!peak.has(prev)) rawShoulder.add(prev)
      if (!peak.has(next)) rawShoulder.add(next)
    }

    const shoulder = new Set<number>()
    let count = 0
    for (const m of rawShoulder) {
      if (count >= 2) break
      shoulder.add(m)
      count++
    }

    return { peak, shoulder }
  } catch {
    return null
  }
}
