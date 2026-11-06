import { PROPERTY_LABEL } from '@/lib/labels';
import type { Quotation, QuotationTemplate } from '@/types';
import { computeTotals } from '@/lib/totals';
import { QUALITY_LABEL } from '@/lib/pricing';
import {
  COLORS,
  CW,
  PAGE,
  createDoc,
  drawLogo,
  ensure,
  fillRect,
  font,
  footers,
  inr,
  kv,
  num,
  paragraphs,
  strokeRect,
  table,
  text,
  textHeight,
  toBlob,
  watermark,
  type Doc,
} from './kit';
import {
  docBusiness,
  footerLine,
  formatDate,
  type DocBusiness,
  type DocCtx,
} from './business';
import { amountInWords } from './words';
import { subsidyBox } from './subsidy';

const L = PAGE.m;
const SYSTEM: Record<string, string> = {
  'on-grid': 'On-grid (net-metered)',
  hybrid: 'Hybrid (grid + battery)',
  'off-grid': 'Off-grid (battery)',
};
const PROPERTY: Record<string, string> = PROPERTY_LABEL;
const ROOF: Record<string, string> = {
  rcc: 'RCC flat roof',
  tin: 'Tin / metal shed',
  ground: 'Ground mounted',
};

function section(doc: Doc, y: number, title: string) {
  y = ensure(doc, y + 10, 40);
  fillRect(doc, L, y + 2, 3, 11, COLORS.sun);
  font(doc, 'bold', 10.5, COLORS.navy);
  doc.text(title, L + 9, y, { baseline: 'top' });
  return y + 18;
}

function header(
  doc: Doc,
  b: DocBusiness,
  q: Quotation,
  template: QuotationTemplate,
) {
  const top = PAGE.m;
  if (template === 'modern') fillRect(doc, 0, 0, PAGE.w, top + 74, COLORS.navy);
  drawLogo(doc, b.logo, L, top, 150, 56);
  const rx = L + 200;
  const rw = CW - 200;
  font(
    doc,
    'bold',
    13,
    template === 'modern'
      ? '#ffffff'
      : template === 'minimal'
        ? COLORS.ink
        : COLORS.navy,
  );
  let y = text(doc, b.name, rx, top, { width: rw, align: 'right' });
  font(doc, 'normal', 7.8, template === 'modern' ? '#d6e0ee' : COLORS.muted);
  for (const line of b.addressLines)
    y = text(doc, line, rx, y, { width: rw, align: 'right' });
  const contact = [b.phone, b.email].filter(Boolean).join('  ·  ');
  if (contact) y = text(doc, contact, rx, y, { width: rw, align: 'right' });
  const ids = [
    b.gstin && `GSTIN: ${b.gstin}`,
    b.cin && `CIN: ${b.cin}`,
    b.registration && `Reg.: ${b.registration}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (ids) {
    font(doc, 'medium', 7.8, template === 'modern' ? '#ffffff' : COLORS.ink);
    y = text(doc, ids, rx, y, { width: rw, align: 'right' });
  }
  y = Math.max(y, top + 62) + 10;
  if (template !== 'modern') {
    fillRect(
      doc,
      L,
      y,
      CW,
      template === 'minimal' ? 1 : 3,
      template === 'minimal' ? COLORS.ink : COLORS.navy,
    );
    if (template === 'classic') fillRect(doc, L, y, CW * 0.28, 3, COLORS.sun);
  }
  const ty = y + 14;
  font(doc, 'bold', 20, template === 'minimal' ? COLORS.ink : COLORS.navy);
  doc.text('QUOTATION', L, ty, { baseline: 'top' });
  font(doc, 'normal', 9, COLORS.muted);
  const sub = `Roof solar power plant — ${num(q.capacityKw)} kWp${q.quality ? ` · ${QUALITY_LABEL[q.quality]} package` : ''}`;
  doc.text(sub, L, ty + 26, { baseline: 'top' });
  const mx = L + CW - 210;
  fillRect(doc, mx, ty - 2, 210, 54, COLORS.tint, 6);
  (
    [
      ['Quotation no.', q.quoteNumber ?? 'DRAFT'],
      ['Date', formatDate(q.quoteDate)],
      ['Valid until', formatDate(q.validUntil)],
    ] as const
  ).forEach(([k, v], i) => {
    font(doc, 'normal', 8.3, COLORS.muted);
    doc.text(k, mx + 10, ty + 5 + i * 15, { baseline: 'top' });
    font(doc, 'medium', 8.3, COLORS.ink);
    doc.text(v, mx + 200, ty + 5 + i * 15, { baseline: 'top', align: 'right' });
  });
  return ty + 64;
}

function infoBoxes(doc: Doc, q: Quotation, y: number) {
  const w = (CW - 12) / 2;
  const c = q.company;
  const customer: Array<[string, string]> = (
    [
      ['Name', q.customerName],
      ['Phone', q.phone],
      ['Email', q.email],
      ['Address', [q.address, q.city, q.state].filter(Boolean).join(', ')],
      ['GSTIN', q.gstin ?? ''],
      [
        'Consumer no.',
        [q.consumerNumber, q.discom].filter(Boolean).join(' · '),
      ],
      [
        'Sanctioned load',
        q.sanctionedLoadKw ? `${num(q.sanctionedLoadKw)} kW` : '',
      ],
      ['Monthly bill', q.monthlyBill ? inr(q.monthlyBill, 0) : ''],
    ] as Array<[string, string]>
  ).filter(([, v]) => v);
  const panels = c
    ? Math.ceil((q.capacityKw * 1000) / c.panelWattage - 1e-9)
    : 0;
  const system: Array<[string, string]> = (
    [
      [
        'Capacity',
        `${num(q.capacityKw)} kWp${c ? ` (${num((panels * c.panelWattage) / 1000)} kWp DC)` : ''}`,
      ],
      [
        'Package',
        c
          ? `${c.name} · ${QUALITY_LABEL[c.quality ?? q.quality ?? 'normal']}`
          : '',
      ],
      ['System type', SYSTEM[q.systemType] ?? q.systemType],
      ['Property', PROPERTY[q.propertyType] ?? q.propertyType],
      ['Installation', ROOF[q.roofType ?? 'rcc']],
      [
        'Solar modules',
        c
          ? `${c.panelWattage} Wp ${c.panelTechnology} × ${panels}`
          : 'As per site survey (ALMM listed)',
      ],
      [
        'Inverter',
        c
          ? `${c.inverterBrand} ${c.inverterModel}`
          : 'Grid-tie string inverter (BIS certified)',
      ],
      ['Structure', c?.structureDetails || 'GI mounting structure'],
      [
        'Est. generation',
        q.annualGenerationKwh
          ? `~${num(q.annualGenerationKwh)} units / year`
          : '',
      ],
    ] as Array<[string, string]>
  ).filter(([, v]) => v);
  font(doc, 'normal', 8.3);
  const hOf = (rows: Array<[string, string]>) =>
    rows.reduce(
      (s, [, v]) => s + Math.max(12, textHeight(doc, v, w - 100)) + 2,
      30,
    );
  const h = Math.max(hOf(customer), hOf(system));
  y = ensure(doc, y, h + 10);
  (
    [
      [L, 'QUOTATION FOR', customer],
      [L + w + 12, 'PROPOSED SYSTEM', system],
    ] as const
  ).forEach(([x, title, rows]) => {
    doc.setDrawColor(COLORS.line);
    doc.setLineWidth(0.7);
    doc.roundedRect(x, y, w, h, 6, 6, 'S');
    font(doc, 'bold', 8.6, COLORS.navy);
    doc.text(title, x + 10, y + 9, { baseline: 'top', charSpace: 0.5 });
    let ry = y + 25;
    for (const [k, v] of rows) {
      font(doc, 'normal', 8.3, COLORS.muted);
      doc.text(k, x + 10, ry, { baseline: 'top' });
      font(doc, 'medium', 8.3, COLORS.ink);
      ry = Math.max(text(doc, v, x + 92, ry, { width: w - 100 }), ry + 12) + 2;
    }
  });
  return y + h + 4;
}

export async function quotationPdf(
  q: Quotation,
  ctx: DocCtx,
  template: QuotationTemplate = 'classic',
): Promise<Blob> {
  const b = await docBusiness(ctx);
  const settings = ctx.business;
  const doc = await createDoc(
    `Quotation ${q.quoteNumber ?? ''} – ${q.customerName}`,
    b.name,
  );
  let y = header(doc, b, q, template);
  y = infoBoxes(doc, q, y);
  const items = q.items ?? [];
  const t = computeTotals(items, {
    supplyType: q.supplyType ?? 'intra',
    discountType: 'amount',
    discountValue: q.discount ?? 0,
    roundOff: true,
  });

  y = section(doc, y, 'Bill of materials & price');
  if (items.length) {
    y =
      table(doc, {
        startY: y,
        head: [
          ['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'GST', 'Taxable amt.'],
        ],
        body: items.map((l, i) => [
          String(i + 1),
          `${l.name}${l.description ? `\n${l.description}` : ''}`,
          l.hsn || '—',
          `${num(l.quantity)} ${l.unit}`,
          inr(l.rate),
          `${num(l.gstRate)}%`,
          inr(t.lines[i].taxable),
        ]),
        headStyles: { fillColor: COLORS.navy, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: COLORS.tint },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 200 },
          2: { cellWidth: 58 },
          3: { cellWidth: 52, halign: 'right' },
          4: { cellWidth: 68, halign: 'right' },
          5: { cellWidth: 34, halign: 'right' },
          6: { halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1)
            data.cell.styles.fontStyle = 'normal';
        },
      }) + 10;
  } else {
    font(doc, 'normal', 9);
    y =
      text(
        doc,
        `Indicative price for a ${num(q.capacityKw)} kWp ${SYSTEM[q.systemType] ?? ''} system from the website calculator. A detailed bill of materials follows after the free site survey.`,
        L,
        y,
        { width: CW },
      ) + 10;
  }

  // Totals + amount in words
  const rows: Array<{
    label: string;
    value: string;
    strong?: boolean;
    color?: string;
  }> = [];
  if (items.length) {
    rows.push({ label: 'Sub total', value: inr(t.subtotal) });
    if (t.itemDiscount + t.overallDiscount > 0)
      rows.push({
        label: 'Discount',
        value: `– ${inr(t.itemDiscount + t.overallDiscount)}`,
        color: COLORS.leaf,
      });
    rows.push({ label: 'Taxable value', value: inr(t.taxableAmount) });
    if ((q.supplyType ?? 'intra') === 'intra')
      rows.push(
        { label: 'CGST', value: inr(t.cgst) },
        { label: 'SGST', value: inr(t.sgst) },
      );
    else rows.push({ label: 'IGST', value: inr(t.igst) });
    if (t.roundOff) rows.push({ label: 'Round off', value: inr(t.roundOff) });
    rows.push({
      label: 'Total (incl. GST)',
      value: inr(t.grandTotal),
      strong: true,
      color: COLORS.navy,
    });
  } else
    rows.push({
      label: 'Estimated system cost',
      value: inr(q.estimatedCost, 0),
      strong: true,
      color: COLORS.navy,
    });
  const panelH = rows.length * 14 + 24;
  y = ensure(doc, y, panelH + 10);
  const px = L + CW - 232;
  fillRect(doc, px - 10, y - 6, 242, panelH, COLORS.tint, 6);
  const after = kv(doc, rows, px, y, 222);
  const grand = items.length ? t.grandTotal : q.estimatedCost;
  font(doc, 'normal', 7.8, COLORS.muted);
  doc.text('Amount in words', L, y, { baseline: 'top' });
  font(doc, 'medium', 8.8, COLORS.ink);
  let wy = text(doc, amountInWords(grand), L, y + 11, { width: CW - 262 }) + 6;
  font(doc, 'normal', 7.4, COLORS.muted);
  for (const br of t.breakup) {
    wy = text(
      doc,
      `GST @ ${num(br.gstRate)}% on ${inr(br.taxable)}: ${(q.supplyType ?? 'intra') === 'intra' ? `CGST ${inr(br.cgst)} + SGST ${inr(br.sgst)}` : `IGST ${inr(br.igst)}`}`,
      L,
      wy,
      { width: CW - 262 },
    );
  }
  y = Math.max(after, wy) + 10;

  // Subsidy breakdown: total cost, central (PM Surya Ghar), state, net payable
  if (
    settings.quotation.showSubsidy &&
    (q.subsidy > 0 || (q.stateSubsidy ?? 0) > 0)
  ) {
    y = subsidyBox(doc, y, {
      systemCost: grand,
      central: q.subsidy,
      state: q.stateSubsidy ?? 0,
      stateScheme: q.stateSubsidyScheme,
      note: 'Estimated subsidy under PM Surya Ghar: Muft Bijli Yojana' + ((q.stateSubsidy ?? 0) > 0 ? ' and the state scheme' : '') + '. It is credited by the Government directly to your bank account after installation, net-metering and inspection. You pay the full system cost above; the subsidy comes back to you. Final amounts are as per the scheme rules at the time of sanction.',
    }, template === 'minimal');
  }

  // Warranty
  const c = q.company;
  y = section(doc, y, 'Warranty');
  y =
    table(doc, {
      startY: y,
      head: [['Component', 'Warranty']],
      body: [
        [
          'Solar modules — product',
          `${c?.panelWarrantyYears ?? 12} years (manufacturer)`,
        ],
        [
          'Solar modules — performance',
          `${c?.performanceWarrantyYears ?? 25} years linear power output (manufacturer)`,
        ],
        ['Inverter', `${c?.inverterWarrantyYears ?? 5} years (manufacturer)`],
        [
          'Installation workmanship & structure',
          `${c?.workmanshipWarrantyYears ?? 5} years (${b.name})`,
        ],
      ],
      headStyles: { fillColor: COLORS.ice, textColor: COLORS.navy },
      bodyStyles: { lineWidth: { bottom: 0.5 } },
      columnStyles: { 0: { cellWidth: 200 } },
    }) + 4;

  // Scope
  // Premium plan: drone-based panel cleaning is part of the package (Normal plan: not included).
  const premiumExtra = 'Drone-based solar panel cleaning service (Premium plan)';
  const inc = q.quality === 'premium' && !settings.quotation.inclusions.some((x) => /drone/i.test(x))
    ? [...settings.quotation.inclusions, premiumExtra]
    : settings.quotation.inclusions;
  const exc = q.quality === 'normal' && !settings.quotation.exclusions.some((x) => /drone/i.test(x))
    ? [...settings.quotation.exclusions, 'Drone cleaning (available with the Premium plan or as a separate service)']
    : settings.quotation.exclusions;
  if (inc.length || exc.length) {
    y = section(doc, y, 'Scope of work');
    const w = (CW - 16) / 2;
    font(doc, 'normal', 8.3);
    const hOf = (l: string[]) =>
      l.reduce((s, x) => s + textHeight(doc, `• ${x}`, w) + 2, 16);
    y = ensure(doc, y, Math.min(300, Math.max(hOf(inc), hOf(exc))));
    const col = (x: number, title: string, list: string[], color: string) => {
      font(doc, 'bold', 8.5, color);
      let cy = text(doc, title, x, y, { width: w }) + 2;
      font(doc, 'normal', 8.3, COLORS.ink);
      for (const l of list) cy = text(doc, `• ${l}`, x, cy, { width: w }) + 2;
      return cy;
    };
    y = Math.max(
      col(L, 'Included', inc, COLORS.leaf),
      col(L + w + 16, 'Not included', exc, COLORS.clay),
    );
  }
  if (q.paymentTerms) {
    y = section(doc, y, 'Payment terms');
    y = paragraphs(doc, q.paymentTerms, L, y, CW, { numbered: true });
  }
  if (q.terms) {
    y = section(doc, y, 'Terms & conditions');
    y = paragraphs(doc, q.terms, L, y, CW, { numbered: true });
  }

  // Bank + signatures
  const bank = b.bank;
  if (bank.accountNumber || bank.upiId) {
    y = ensure(doc, y + 8, 50);
    font(doc, 'bold', 9, COLORS.navy);
    doc.text('Bank details for payment', L, y, { baseline: 'top' });
    font(doc, 'normal', 8.3, COLORS.ink);
    y = text(
      doc,
      [
        bank.accountName && `A/c name: ${bank.accountName}`,
        bank.accountNumber && `A/c no.: ${bank.accountNumber}`,
        bank.ifsc && `IFSC: ${bank.ifsc}`,
        [bank.bankName, bank.branch].filter(Boolean).join(', '),
        bank.upiId && `UPI: ${bank.upiId}`,
      ]
        .filter(Boolean)
        .join('   ·   '),
      L,
      y + 12,
      { width: CW },
    );
  }
  y = ensure(doc, y + 14, 84);
  font(doc, 'bold', 9, COLORS.navy);
  doc.text('Customer acceptance', L, y, { baseline: 'top' });
  font(doc, 'normal', 8.3, COLORS.muted);
  doc.text('I accept this quotation and its terms.', L, y + 13, {
    baseline: 'top',
  });
  doc.setDrawColor(COLORS.muted);
  doc.setLineWidth(0.6);
  doc.line(L, y + 52, L + 200, y + 52);
  doc.line(L + CW - 160, y + 52, L + CW, y + 52);
  doc.text('Customer signature & date', L, y + 56, { baseline: 'top' });
  font(doc, 'medium', 9, COLORS.ink);
  doc.text(`For ${b.name}`, L + CW, y, { baseline: 'top', align: 'right' });
  font(doc, 'normal', 8.3, COLORS.muted);
  doc.text(b.signatory, L + CW, y + 56, { baseline: 'top', align: 'right' });
  void strokeRect;

  if (q.status === 'rejected') watermark(doc, 'REJECTED', COLORS.clay);
  else if (q.status === 'accepted') watermark(doc, 'ACCEPTED', COLORS.leaf);
  else if (!q.quoteNumber || q.quoteNumber === 'DRAFT')
    watermark(doc, 'DRAFT', COLORS.muted);
  footers(doc, footerLine(b));
  return toBlob(doc);
}
