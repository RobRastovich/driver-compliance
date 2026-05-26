const NUMBER_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11',
  twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16',
  seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30',
  forty: '40', fifty: '50', sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  hundred: '100', thousand: '1000',
}

function normalize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => NUMBER_WORDS[w] ?? w)
}

export function scoreTranscription(expected: string, transcribed: string): number {
  const expectedWords = normalize(expected)
  const transcribedWords = normalize(transcribed)

  let matches = 0
  const transcribedCopy = [...transcribedWords]

  for (const word of expectedWords) {
    const idx = transcribedCopy.indexOf(word)
    if (idx !== -1) {
      matches++
      transcribedCopy.splice(idx, 1)
    }
  }

  return expectedWords.length > 0 ? matches / expectedWords.length : 0
}

export const PASSING_SCORE = 0.70
