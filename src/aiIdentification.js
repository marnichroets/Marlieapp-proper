export function rankBirdMatches(matches, officialMatcher = () => false) {
  const unique = []
  for (const match of Array.isArray(matches) ? matches : []) {
    const key = `${String(match?.commonName || '').trim().toLowerCase()}|${String(match?.scientificName || '').trim().toLowerCase()}`
    if (!key || key === '|') continue
    if (!unique.some((item) => `${String(item.commonName || '').trim().toLowerCase()}|${String(item.scientificName || '').trim().toLowerCase()}` === key)) unique.push(match)
  }
  return unique.sort((a, b) => Boolean(officialMatcher(b)) - Boolean(officialMatcher(a)) || Number(b.confidence || 0) - Number(a.confidence || 0)).slice(0, 3)
}

export function identificationIsUncertain(matches, explicitlyUncertain = false) {
  return Boolean(explicitlyUncertain) || !matches?.length || Number(matches[0]?.confidence || 0) < 70
}
