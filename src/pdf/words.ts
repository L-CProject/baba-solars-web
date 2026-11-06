const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const two = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`)
const three = (n: number) => [Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} Hundred` : '', n % 100 ? two(n % 100) : ''].filter(Boolean).join(' ')

/** Indian numbering in words: 410763 → "Four Lakh Ten Thousand Seven Hundred Sixty Three". */
export function amountInWords(amount: number, prefix = 'Rupees'): string {
  const total = Math.round(Math.abs(amount) * 100)
  let r = Math.floor(total / 100)
  const paise = total % 100
  if (!r && !paise) return `${prefix} Zero Only`
  const parts: string[] = []
  const crore = Math.floor(r / 10_000_000); r %= 10_000_000
  const lakh = Math.floor(r / 100_000); r %= 100_000
  const th = Math.floor(r / 1000); r %= 1000
  if (crore) parts.push(`${crore >= 100 ? three(crore) : two(crore)} Crore`)
  if (lakh) parts.push(`${two(lakh)} Lakh`)
  if (th) parts.push(`${two(th)} Thousand`)
  if (r) parts.push(three(r))
  return `${prefix} ${parts.join(' ') || 'Zero'}${paise ? ` and ${two(paise)} Paise` : ''} Only`
}
