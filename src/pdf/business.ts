import type { BusinessSettings, SiteContent } from '@/types';
import { loadLogo, type LogoImage } from './kit';

export interface DocCtx {
  business: BusinessSettings;
  content: SiteContent;
}
export interface DocBusiness {
  name: string;
  legalName: string;
  addressLines: string[];
  gstin: string;
  pan: string;
  cin: string;
  phone: string;
  email: string;
  website: string;
  stateLine: string;
  logo: LogoImage | null;
  signatory: string;
  bank: BusinessSettings['bank'];
  registration: string;
}

export async function docBusiness({
  business: b,
  content,
}: DocCtx): Promise<DocBusiness> {
  const logo = await loadLogo(b.logoUrl || content.brand?.logoUrl);
  return {
    name: b.tradeName || b.legalName,
    legalName: b.legalName,
    addressLines: [
      b.address,
      [
        b.city,
        b.state && `${b.state}${b.pincode ? ` – ${b.pincode}` : ''}`,
        'India',
      ]
        .filter(Boolean)
        .join(', '),
    ].filter(Boolean),
    gstin: b.gstin,
    pan: b.pan,
    cin: b.cin,
    phone: b.phone,
    email: b.email,
    website: b.website,
    stateLine: `State Name : ${b.state}, Code : ${b.stateCode}`,
    logo,
    signatory: [b.signatoryName, b.signatoryTitle || 'Authorised Signatory']
      .filter(Boolean)
      .join(' · '),
    bank: b.bank,
    registration: b.mnreRegistration,
  };
}

export const footerLine = (b: DocBusiness) =>
  [b.name, b.phone, b.email, b.website].filter(Boolean).join('  ·  ');

export const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: iso.length === 10 ? 'UTC' : 'Asia/Kolkata',
      });
};
/** Tally style: 22-Oct-26 */
export const tallyDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return `${String(d.getUTCDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}-${String(d.getUTCFullYear()).slice(2)}`;
};
