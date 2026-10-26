const tokens = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length >= 2)

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

function tokensMatch(a: string, b: string) {
  if (a === b) return true
  const shortest = Math.min(a.length, b.length)
  if (shortest >= 3 && (a.startsWith(b) || b.startsWith(a))) return true
  return shortest >= 4 && editDistance(a, b) <= 1
}

// "Aland" matches an account called "Aland Martínez" or "alan"; used only to suggest, the user always confirms.
export function looksLikeSamePerson(candidate: string, accountNames: string[]) {
  const candidateTokens = tokens(candidate)
  const accountTokens = accountNames.flatMap(tokens)
  return candidateTokens.some((a) => accountTokens.some((b) => tokensMatch(a, b)))
}
