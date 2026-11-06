const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

export const formatINR = (value: number): string =>
  inr.format(Math.round(value));
export const formatNumber = (value: number): string => num.format(value);

/** ₹1,65,000 → "₹1.65 lakh" for compact display */
export function formatLakh(value: number): string {
  if (value >= 100000) return `₹${num.format(value / 100000)} lakh`;
  return formatINR(value);
}

export function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatINR(min);
  return `${formatINR(min)} – ${formatINR(max)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return yyyyMm;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

export const telHref = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  const international = digits.length === 10 ? `+91${digits}` : `+${digits}`;
  return `tel:${international}`;
};
export const whatsappHref = (number: string, text?: string): string => {
  const chatUrl = `https://wa.me/${number.replace(/\D/g, '')}`;
  return text ? `${chatUrl}?text=${encodeURIComponent(text)}` : chatUrl;
};
export const mailHref = (email: string, subject = 'Solar enquiry'): string =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}`;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** "5 Nov 2026, 10:30 am" in India time. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

/** "today", "in 3 days", "2 days ago" for a YYYY-MM-DD date (India time). */
export function relativeDay(isoDate: string, today: string): string {
  const diff = Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}
