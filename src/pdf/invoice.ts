import type { Invoice, InvoiceTemplate } from '@/types';
import { computeTotals } from '@/lib/totals';
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
  hline,
  indian,
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
  tallyDate,
  type DocBusiness,
  type DocCtx,
} from './business';
import { amountInWords } from './words';
import { subsidyBox } from './subsidy';

const L = PAGE.m;
const METHOD: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  card: 'Card',
  loan: 'Solar loan',
  other: 'Other',
};
const statusLabel = (i: Invoice) =>
  i.status === 'cancelled'
    ? 'Cancelled'
    : i.status === 'draft'
      ? 'Draft'
      : i.paymentStatus === 'paid'
        ? 'Paid'
        : i.paymentStatus === 'partial'
          ? 'Partly paid'
          : 'Unpaid';

function titleOf(inv: Invoice, b: DocBusiness) {
  const t = inv.documentTitle || 'Tax Invoice';
  return t === 'Tax Invoice' && !b.gstin ? 'Invoice' : t;
}

function businessBlock(
  doc: Doc,
  b: DocBusiness,
  x: number,
  y: number,
  w: number,
  align: 'left' | 'right',
  light = false,
) {
  font(doc, 'bold', 12, light ? '#ffffff' : COLORS.ink);
  y = text(doc, b.name, x, y, { width: w, align });
  font(doc, 'normal', 7.6, light ? '#d6e0ee' : COLORS.muted);
  for (const l of b.addressLines) y = text(doc, l, x, y, { width: w, align });
  const contact = [b.phone, b.email].filter(Boolean).join('  ·  ');
  if (contact) y = text(doc, contact, x, y, { width: w, align });
  const ids = [
    b.gstin && `GSTIN: ${b.gstin}`,
    b.pan && `PAN: ${b.pan}`,
    b.cin && `CIN: ${b.cin}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (ids) {
    font(doc, 'medium', 7.6, light ? '#ffffff' : COLORS.ink);
    y = text(doc, ids, x, y, { width: w, align });
  }
  return y;
}

function header(
  doc: Doc,
  b: DocBusiness,
  inv: Invoice,
  tpl: Exclude<InvoiceTemplate, 'tally'>,
) {
  const top = PAGE.m;
  const title = titleOf(inv, b).toUpperCase();
  if (tpl === 'modern') {
    fillRect(doc, 0, 0, PAGE.w, top + 96, COLORS.navy);
    fillRect(doc, 0, top + 96, PAGE.w, 4, COLORS.sun);
    if (b.logo) {
      fillRect(doc, L, top - 6, 132, 62, '#ffffff', 8);
      drawLogo(doc, b.logo, L + 6, top - 2, 120, 54);
    }
    businessBlock(doc, b, L + 190, top - 4, CW - 190, 'right', true);
    font(doc, 'bold', 21, COLORS.sun);
    doc.text(title, L, top + 66, { baseline: 'top' });
    const y = top + 114;
    const cards: Array<[string, string]> = [
      ['Number', inv.invoiceNumber],
      ['Date', formatDate(inv.invoiceDate)],
      ['Due date', formatDate(inv.dueDate)],
      ['Amount due', inr(inv.amountDue)],
    ];
    const w = (CW - 18) / 4;
    cards.forEach(([k, v], i) => {
      const x = L + i * (w + 6);
      const hot = i === 3 && inv.amountDue > 0;
      fillRect(doc, x, y, w, 40, hot ? '#fff4d6' : COLORS.tint, 6);
      font(doc, 'normal', 7.4, COLORS.muted);
      doc.text(k, x + 9, y + 7, { baseline: 'top' });
      font(doc, 'bold', 9.3, hot ? COLORS.sunDeep : COLORS.ink);
      doc.text(v, x + 9, y + 19, { baseline: 'top', maxWidth: w - 18 });
    });
    return y + 52;
  }
  if (tpl === 'minimal') {
    font(doc, 'bold', 26, '#111111');
    doc.text(titleOf(inv, b), L, top, { baseline: 'top' });
    font(doc, 'normal', 9, '#555555');
    doc.text(inv.invoiceNumber, L, top + 34, { baseline: 'top' });
    drawLogo(doc, b.logo, L + CW - 120, top, 120, 46);
    const y = top + 64;
    const end = businessBlock(doc, b, L, y, CW / 2 - 10, 'left');
    const mx = L + CW / 2 + 10;
    (
      [
        ['Issued', formatDate(inv.invoiceDate)],
        ['Due', formatDate(inv.dueDate)],
        ['Place of supply', inv.placeOfSupply],
        ...(inv.reference ? [['Reference', inv.reference]] : []),
      ] as Array<[string, string]>
    ).forEach(([k, v], i) => {
      font(doc, 'normal', 8.3, '#777777');
      doc.text(k, mx, y + i * 14, { baseline: 'top' });
      font(doc, 'medium', 8.3, '#111111');
      doc.text(v, L + CW, y + i * 14, { baseline: 'top', align: 'right' });
    });
    const ly = Math.max(end, y + 56) + 8;
    hline(doc, L, L + CW, ly, '#111111', 1);
    return ly + 10;
  }
  // classic
  drawLogo(doc, b.logo, L, top, 140, 56);
  let y = businessBlock(doc, b, L + 180, top, CW - 180, 'right');
  y = Math.max(y, top + 60) + 8;
  fillRect(doc, L, y, CW, 22, COLORS.navy);
  font(doc, 'bold', 12, '#ffffff');
  doc.text(title, PAGE.w / 2, y + 5, {
    baseline: 'top',
    align: 'center',
    charSpace: 1.5,
  });
  y += 22;
  const cw = CW / 4;
  (
    [
      ['Number', inv.invoiceNumber],
      ['Date', formatDate(inv.invoiceDate)],
      ['Due date', formatDate(inv.dueDate)],
      ['Place of supply', inv.placeOfSupply],
    ] as const
  ).forEach(([k, v], i) => {
    const x = L + i * cw;
    strokeRect(doc, x, y, cw, 32, COLORS.border);
    font(doc, 'normal', 7.3, COLORS.muted);
    doc.text(k, x + 6, y + 5, { baseline: 'top' });
    font(doc, 'medium', 8.2, COLORS.ink);
    doc.text(v, x + 6, y + 16, { baseline: 'top', maxWidth: cw - 12 });
  });
  return y + 40;
}

function billTo(
  doc: Doc,
  inv: Invoice,
  tpl: Exclude<InvoiceTemplate, 'tally'>,
  y: number,
) {
  const boxed = tpl !== 'minimal';
  const w = boxed ? (CW - 12) / 2 : CW;
  const lines = [
    inv.address,
    [
      inv.city,
      inv.state && `${inv.state}${inv.stateCode ? ` (${inv.stateCode})` : ''}`,
    ]
      .filter(Boolean)
      .join(', '),
    [inv.phone, inv.email].filter(Boolean).join('  ·  '),
    inv.gstin && `GSTIN: ${inv.gstin}`,
  ].filter(Boolean) as string[];
  font(doc, 'normal', 8.3);
  const st = statusLabel(inv);
  const payRows: Array<[string, string]> = [
    ['Status', st],
    ['Amount paid', inr(inv.amountPaid)],
    ['Balance due', inr(inv.amountDue)],
    ...(inv.reference
      ? [['Reference', inv.reference] as [string, string]]
      : []),
    ...(inv.paymentMethod
      ? [
          ['Method', METHOD[inv.paymentMethod] ?? inv.paymentMethod] as [
            string,
            string,
          ],
        ]
      : []),
  ];
  const h = Math.max(
    36 + lines.reduce((s, l) => s + textHeight(doc, l, w - 20), 0),
    boxed ? 28 + payRows.length * 12 : 0,
  );
  const pad = boxed ? 10 : 0;
  const box = (x: number) => {
    if (tpl === 'modern') fillRect(doc, x, y, w, h, COLORS.tint, 6);
    if (tpl === 'classic') strokeRect(doc, x, y, w, h, COLORS.border);
  };
  box(L);
  font(doc, 'bold', 7.8, COLORS.muted);
  doc.text('BILL TO', L + pad, y + 8, { baseline: 'top', charSpace: 0.8 });
  font(doc, 'bold', 10.3, COLORS.ink);
  let ty = text(doc, inv.customerName, L + pad, y + 19, { width: w - pad * 2 });
  font(doc, 'normal', 8.3, COLORS.ink);
  for (const l of lines) ty = text(doc, l, L + pad, ty, { width: w - pad * 2 });
  if (boxed) {
    const x = L + w + 12;
    box(x);
    font(doc, 'bold', 7.8, COLORS.muted);
    doc.text('PAYMENT', x + pad, y + 8, { baseline: 'top', charSpace: 0.8 });
    payRows.forEach(([k, v], i) => {
      font(doc, 'normal', 8.3, COLORS.muted);
      doc.text(k, x + pad, y + 21 + i * 12, { baseline: 'top' });
      font(
        doc,
        'medium',
        8.3,
        k === 'Status'
          ? st === 'Paid'
            ? COLORS.leaf
            : st === 'Cancelled'
              ? COLORS.clay
              : COLORS.sunDeep
          : COLORS.ink,
      );
      doc.text(v, x + w - pad, y + 21 + i * 12, {
        baseline: 'top',
        align: 'right',
      });
    });
  }
  return y + h + 12;
}

function payBankSign(doc: Doc, inv: Invoice, b: DocBusiness, y: number) {
  if (inv.payments.length) {
    y = ensure(doc, y, 60);
    font(doc, 'bold', 9, COLORS.navy);
    doc.text('Payments received', L, y, { baseline: 'top' });
    y =
      table(doc, {
        startY: y + 14,
        head: [['Date', 'Method', 'Reference', 'Amount']],
        body: inv.payments.map((p) => [
          formatDate(p.date),
          METHOD[p.method] ?? p.method,
          [p.reference, p.note].filter(Boolean).join(' · ') || '—',
          inr(p.amount),
        ]),
        headStyles: { fillColor: COLORS.ice, textColor: COLORS.navy },
        bodyStyles: { lineWidth: { bottom: 0.5 } },
        styles: { fontSize: 7.8, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 90 },
          3: { cellWidth: 100, halign: 'right' },
        },
      }) + 10;
  }
  if (inv.notes) {
    y = ensure(doc, y, 40);
    font(doc, 'bold', 9, COLORS.ink);
    doc.text('Notes', L, y, { baseline: 'top' });
    font(doc, 'normal', 8.3, COLORS.ink);
    y = text(doc, inv.notes, L, y + 13, { width: CW }) + 8;
  }
  y = ensure(doc, y, 96);
  const bank = b.bank;
  if (bank.accountNumber || bank.upiId) {
    font(doc, 'bold', 9, COLORS.ink);
    doc.text('Bank details', L, y, { baseline: 'top' });
    font(doc, 'normal', 8.3, COLORS.ink);
    let by = y + 13;
    for (const l of [
      bank.accountName && `A/c name: ${bank.accountName}`,
      bank.accountNumber && `A/c no.: ${bank.accountNumber}`,
      bank.ifsc && `IFSC: ${bank.ifsc}`,
      [bank.bankName, bank.branch].filter(Boolean).join(', '),
      bank.upiId && `UPI: ${bank.upiId}`,
    ].filter(Boolean) as string[])
      by = text(doc, l, L, by, { width: 260 });
  }
  font(doc, 'medium', 9, COLORS.ink);
  doc.text(`For ${b.legalName || b.name}`, L + CW, y, {
    baseline: 'top',
    align: 'right',
  });
  doc.setDrawColor(COLORS.muted);
  doc.setLineWidth(0.6);
  doc.line(L + CW - 160, y + 50, L + CW, y + 50);
  font(doc, 'normal', 8.3, COLORS.muted);
  doc.text(b.signatory, L + CW, y + 54, { baseline: 'top', align: 'right' });
  y += 78;
  if (inv.terms) {
    y = ensure(doc, y, 40);
    font(doc, 'bold', 9, COLORS.ink);
    doc.text('Terms & conditions', L, y, { baseline: 'top' });
    y = paragraphs(doc, inv.terms, L, y + 13, CW, { size: 7.6 });
  }
  y = ensure(doc, y + 4, 14);
  font(doc, 'normal', 7.3, COLORS.muted);
  doc.text('This is a computer-generated document.', PAGE.w / 2, y, {
    baseline: 'top',
    align: 'center',
  });
  return y;
}

function standard(
  doc: Doc,
  inv: Invoice,
  b: DocBusiness,
  tpl: Exclude<InvoiceTemplate, 'tally'>,
) {
  let y = header(doc, b, inv, tpl);
  y = billTo(doc, inv, tpl, y);
  const t = computeTotals(inv.items, {
    supplyType: inv.supplyType,
    discountType: inv.discountType,
    discountValue: inv.discountValue,
    roundOff: false,
  });
  const intra = inv.supplyType === 'intra';
  if (tpl === 'classic') {
    y =
      table(doc, {
        startY: y,
        head: [
          [
            '#',
            'Item / description',
            'HSN/SAC',
            'Qty',
            'Rate',
            'Disc.',
            'Taxable',
            intra ? 'CGST+SGST' : 'IGST',
            'Amount',
          ],
        ],
        body: inv.items.map((l, i) => [
          String(i + 1),
          `${l.name}${[l.sku && `SKU ${l.sku}`, l.description].filter(Boolean).length ? `\n${[l.sku && `SKU ${l.sku}`, l.description].filter(Boolean).join(' · ')}` : ''}`,
          l.hsn || '—',
          `${num(l.quantity)} ${l.unit}`,
          inr(l.rate),
          t.lines[i].discount ? inr(t.lines[i].discount) : '—',
          inr(t.lines[i].taxable),
          `${inr(t.lines[i].tax)}\n@ ${num(l.gstRate)}%`,
          inr(t.lines[i].total),
        ]),
        headStyles: {
          fillColor: COLORS.ice,
          textColor: COLORS.navy,
          lineWidth: 0.6,
          lineColor: COLORS.border,
        },
        bodyStyles: { lineWidth: 0.6, lineColor: COLORS.border },
        styles: { fontSize: 7.4, cellPadding: 3.5 },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 118 },
          2: { cellWidth: 48 },
          3: { cellWidth: 40, halign: 'right' },
          4: { cellWidth: 56, halign: 'right' },
          5: { cellWidth: 44, halign: 'right' },
          6: { cellWidth: 62, halign: 'right' },
          7: { cellWidth: 60, halign: 'right' },
          8: { halign: 'right' },
        },
      }) + 10;
  } else {
    y =
      table(doc, {
        startY: y,
        head: [['Item', 'Qty', 'Rate', 'GST', 'Amount']],
        body: inv.items.map((l, i) => [
          `${l.name}${[l.description, l.hsn && `HSN/SAC ${l.hsn}`, l.discountPct ? `${num(l.discountPct)}% off` : ''].filter(Boolean).length ? `\n${[l.description, l.hsn && `HSN/SAC ${l.hsn}`, l.discountPct ? `${num(l.discountPct)}% off` : ''].filter(Boolean).join(' · ')}` : ''}`,
          `${num(l.quantity)} ${l.unit}`,
          inr(l.rate),
          `${num(l.gstRate)}%`,
          inr(t.lines[i].taxable),
        ]),
        headStyles:
          tpl === 'modern'
            ? { fillColor: COLORS.navy, textColor: '#ffffff' }
            : {
                textColor: '#111111',
                lineWidth: { bottom: 1 },
                lineColor: '#111111',
              },
        alternateRowStyles: tpl === 'modern' ? { fillColor: COLORS.tint } : {},
        bodyStyles:
          tpl === 'minimal'
            ? { lineWidth: { bottom: 0.5 }, lineColor: '#d4d4d4' }
            : {},
        columnStyles: {
          0: { cellWidth: 240 },
          1: { cellWidth: 60, halign: 'right' },
          2: { cellWidth: 78, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' },
          4: { halign: 'right' },
        },
      }) + 10;
  }
  // Totals panel + amount in words + tax summary
  const rows: Array<{
    label: string;
    value: string;
    strong?: boolean;
    color?: string;
  }> = [{ label: 'Sub total', value: inr(t.subtotal) }];
  const disc = t.itemDiscount + t.overallDiscount;
  if (disc > 0)
    rows.push({
      label: 'Discount',
      value: `– ${inr(disc)}`,
      color: COLORS.leaf,
    });
  rows.push({ label: 'Taxable value', value: inr(t.taxableAmount) });
  if (intra)
    rows.push(
      { label: 'CGST', value: inr(t.cgst) },
      { label: 'SGST', value: inr(t.sgst) },
    );
  else rows.push({ label: 'IGST', value: inr(t.igst) });
  if (inv.roundOff) rows.push({ label: 'Round off', value: inr(inv.roundOff) });
  rows.push({
    label: 'Grand total',
    value: inr(inv.grandTotal),
    strong: true,
    color: tpl === 'minimal' ? '#111111' : COLORS.navy,
  });
  if (inv.amountPaid > 0)
    rows.push(
      { label: 'Paid', value: `– ${inr(inv.amountPaid)}`, color: COLORS.leaf },
      {
        label: 'Balance due',
        value: inr(inv.amountDue),
        strong: true,
        color: inv.amountDue > 0 ? COLORS.sunDeep : COLORS.leaf,
      },
    );
  const ph = rows.reduce((s, r) => s + (r.strong ? 19 : 14), 18);
  y = ensure(doc, y, ph + 10);
  const px = L + CW - 222;
  if (tpl === 'modern') fillRect(doc, px - 10, y - 6, 232, ph, COLORS.tint, 6);
  if (tpl === 'classic')
    strokeRect(doc, px - 10, y - 6, 232, ph, COLORS.border);
  const after = kv(doc, rows, px, y, 212);
  font(doc, 'normal', 7.8, COLORS.muted);
  doc.text('Amount in words', L, y, { baseline: 'top' });
  font(doc, 'medium', 8.8, COLORS.ink);
  let wy =
    text(doc, amountInWords(inv.grandTotal), L, y + 11, { width: CW - 250 }) +
    8;
  if (t.breakup.length) {
    const end = table(doc, {
      startY: wy,
      margin: { left: L, right: PAGE.w - L - (CW - 250) },
      head: [
        intra
          ? ['GST %', 'Taxable', 'CGST', 'SGST']
          : ['GST %', 'Taxable', 'IGST'],
      ],
      body: t.breakup.map((r) =>
        intra
          ? [`${num(r.gstRate)}%`, inr(r.taxable), inr(r.cgst), inr(r.sgst)]
          : [`${num(r.gstRate)}%`, inr(r.taxable), inr(r.igst)],
      ),
      styles: { fontSize: 7.2, cellPadding: 2.5 },
      headStyles: {
        fillColor: tpl === 'modern' ? COLORS.navy : COLORS.ice,
        textColor: tpl === 'modern' ? '#ffffff' : COLORS.navy,
      },
      bodyStyles: { lineWidth: { bottom: 0.4 } },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });
    wy = end;
  }
  y = Math.max(after, wy) + 12;
  y = invoiceSubsidy(doc, inv, b, y, tpl === 'minimal');
  payBankSign(doc, inv, b, y);
}

/** Subsidy information (does not change the invoice total — the Government credits it to the customer). */
function invoiceSubsidy(doc: Doc, inv: Invoice, b: DocBusiness, y: number, mono: boolean) {
  const sub = inv.subsidy;
  if (!sub?.show || !(sub.total > 0)) return y;
  return subsidyBox(
    doc,
    y,
    {
      systemCost: inv.grandTotal,
      central: sub.central,
      state: sub.state,
      stateScheme: sub.stateScheme,
      netLabel: 'Net cost after subsidy',
      note: `For a ${num(sub.capacityKw)} kW grid-connected roof solar system. The invoice amount above is payable to ${b.legalName} in full. The subsidy under PM Surya Ghar: Muft Bijli Yojana${sub.state > 0 ? ' and the state scheme' : ''} is credited by the Government to the consumer's bank account after commissioning and inspection.`,
    },
    mono,
  );
}

/** Layout of the client's TallyPrime documents (Sales Order / Tax Invoice): bordered grid, Output CGST/SGST rows, HSN summary. */
function tally(doc: Doc, inv: Invoice, b: DocBusiness) {
  const top = PAGE.m;
  const title = titleOf(inv, b).toUpperCase();
  font(doc, 'normal', 7.5, COLORS.ink);
  doc.text(
    `Printed on ${tallyDate(new Date().toISOString())} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
    L + CW,
    top - 14,
    { baseline: 'top', align: 'right' },
  );
  font(doc, 'bold', 12, '#000000');
  doc.text(title, PAGE.w / 2, top - 2, { baseline: 'top', align: 'center' });
  const gy = top + 16;
  const lw = CW * 0.52;
  const rw = CW - lw;
  const half = rw / 2;
  const cell = 34;
  // Right grid: 4 rows × 2 cells + terms of delivery
  const right: Array<[string, string]> = [
    ['Invoice No.', inv.invoiceNumber],
    ['Dated', tallyDate(inv.invoiceDate)],
    ['Delivery Note', ''],
    [
      'Mode/Terms of Payment',
      inv.paymentMethod
        ? METHOD[inv.paymentMethod]
        : inv.dueDate
          ? `Due ${tallyDate(inv.dueDate)}`
          : '',
    ],
    ["Buyer's Ref./Order No.", inv.reference],
    ['Other References', inv.quotationId ? 'Against quotation' : ''],
    ['Dispatched through', ''],
    ['Destination', inv.city],
  ];
  if (title === 'SALES ORDER') {
    right[0][0] = 'Voucher No.';
    right[2] = ['Mode/Terms of Payment', right[3][1]];
    right[3] = ['Other References', ''];
  }
  // Left blocks
  doc.setDrawColor('#000000');
  doc.setLineWidth(0.6);
  font(doc, 'bold', 8.6, '#000000');
  let ly = text(doc, `${b.legalName}`, L + 4, gy + 3, { width: lw - 8 });
  font(doc, 'normal', 8, '#000000');
  for (const l of b.addressLines)
    ly = text(doc, l, L + 4, ly, { width: lw - 8 });
  if (b.gstin)
    ly = text(doc, `GSTIN/UIN: ${b.gstin}`, L + 4, ly, { width: lw - 8 });
  if (b.cin) ly = text(doc, `CIN: ${b.cin}`, L + 4, ly, { width: lw - 8 });
  ly = text(doc, b.stateLine, L + 4, ly, { width: lw - 8 });
  if (b.email)
    ly = text(doc, `E-Mail : ${b.email}`, L + 4, ly, { width: lw - 8 });
  const sellerEnd = Math.max(ly + 4, gy + cell * 2);
  doc.line(L, sellerEnd, L + lw, sellerEnd);
  font(doc, 'normal', 7.5, '#000000');
  doc.text('Buyer (Bill to)', L + 4, sellerEnd + 3, { baseline: 'top' });
  font(doc, 'bold', 8.6, '#000000');
  let by = text(doc, inv.customerName, L + 4, sellerEnd + 13, {
    width: lw - 8,
  });
  font(doc, 'normal', 8, '#000000');
  for (const l of [
    inv.address,
    inv.city,
    inv.gstin && `GSTIN/UIN       : ${inv.gstin}`,
    `State Name      : ${inv.state}, Code : ${inv.stateCode}`,
    inv.phone && `Contact         : ${inv.phone}`,
  ].filter(Boolean) as string[])
    by = text(doc, l, L + 4, by, { width: lw - 8 });
  const gridH = Math.max(by + 6 - gy, cell * 4 + 30);
  strokeRect(doc, L, gy, CW, gridH, '#000000');
  doc.line(L + lw, gy, L + lw, gy + gridH);
  right.forEach(([k, v], i) => {
    const row = Math.floor(i / 2);
    const x = L + lw + (i % 2) * half;
    const yy = gy + row * cell;
    doc.line(L + lw, yy + cell, L + CW, yy + cell);
    if (i % 2 === 0) doc.line(x + half, yy, x + half, yy + cell);
    font(doc, 'normal', 7.3, '#000000');
    doc.text(k, x + 4, yy + 3, { baseline: 'top' });
    font(doc, 'bold', 8.3, '#000000');
    doc.text(v || '', x + 4, yy + 15, { baseline: 'top', maxWidth: half - 8 });
  });
  font(doc, 'normal', 7.3, '#000000');
  doc.text('Terms of Delivery', L + lw + 4, gy + cell * 4 + 3, {
    baseline: 'top',
  });

  // Items
  const intra = inv.supplyType === 'intra';
  const t = computeTotals(inv.items, {
    supplyType: inv.supplyType,
    discountType: inv.discountType,
    discountValue: inv.discountValue,
    roundOff: false,
  });
  const qtyByUnit = new Map<string, number>();
  inv.items.forEach((l) =>
    qtyByUnit.set(l.unit, (qtyByUnit.get(l.unit) ?? 0) + l.quantity),
  );
  const body: string[][] = inv.items.map((l, i) => [
    String(i + 1),
    `${l.name.toUpperCase()}${l.description ? `\n${l.description}` : ''}`,
    l.hsn,
    `${num(l.quantity)} ${l.unit}`,
    indian(l.rate),
    l.unit,
    l.discountPct ? `${num(l.discountPct)} %` : '',
    indian(t.lines[i].taxable),
  ]);
  const extra: string[][] = [];
  if (t.overallDiscount > 0)
    extra.push([
      '',
      'Less : Discount',
      '',
      '',
      '',
      '',
      '',
      `(-) ${indian(t.overallDiscount)}`,
    ]);
  extra.push(['', '', '', '', '', '', '', indian(t.taxableAmount)]);
  if (intra)
    extra.push(
      ['', 'Output CGST', '', '', '', '', '', indian(t.cgst)],
      ['', 'Output SGST', '', '', '', '', '', indian(t.sgst)],
    );
  else extra.push(['', 'Output IGST', '', '', '', '', '', indian(t.igst)]);
  if (inv.roundOff)
    extra.push(['', 'Round Off', '', '', '', '', '', indian(inv.roundOff)]);
  const totalRow = [
    '',
    'Total',
    '',
    [...qtyByUnit].length === 1
      ? `${num([...qtyByUnit][0][1])} ${[...qtyByUnit][0][0]}`
      : '',
    '',
    '',
    '',
    inr(inv.grandTotal),
  ];
  const firstExtra = body.length;
  let y = table(doc, {
    startY: gy + gridH,
    head: [
      [
        'Sl\nNo.',
        'Description of Goods',
        'HSN/SAC',
        'Quantity',
        'Rate',
        'per',
        'Disc. %',
        'Amount',
      ],
    ],
    body: [...body, ...extra],
    foot: [totalRow],
    showFoot: 'lastPage',
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineColor: '#000000',
      textColor: '#000000',
    },
    headStyles: {
      fontStyle: 'normal',
      lineWidth: 0.6,
      halign: 'center',
      textColor: '#000000',
    },
    footStyles: { lineWidth: 0.6, textColor: '#000000', fontStyle: 'bold' },
    bodyStyles: { lineWidth: { left: 0.6, right: 0.6 } },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 182 },
      2: { cellWidth: 56 },
      3: { cellWidth: 60, halign: 'right' },
      4: { cellWidth: 58, halign: 'right' },
      5: { cellWidth: 30 },
      6: { cellWidth: 38, halign: 'right' },
      7: { halign: 'right' },
    },
    didParseCell: (d) => {
      if (
        d.section === 'body' &&
        d.column.index === 1 &&
        d.row.index < firstExtra
      )
        d.cell.styles.fontStyle = 'bold';
      if (
        d.section === 'body' &&
        d.row.index >= firstExtra &&
        d.column.index === 1
      ) {
        d.cell.styles.fontStyle = 'bold';
        d.cell.styles.halign = 'right';
      }
      if (
        d.section === 'body' &&
        d.row.index === firstExtra + (t.overallDiscount > 0 ? 1 : 0) &&
        d.column.index === 7
      )
        d.cell.styles.lineWidth = { top: 0.6, left: 0.6, right: 0.6 };
    },
  });
  // Amount in words + HSN summary
  y = ensure(doc, y, 60);
  strokeRect(doc, L, y, CW, 34, '#000000');
  font(doc, 'normal', 7.5, '#000000');
  doc.text('Amount Chargeable (in words)', L + 4, y + 3, { baseline: 'top' });
  doc.text('E. & O.E', L + CW - 4, y + 3, { baseline: 'top', align: 'right' });
  font(doc, 'bold', 8.6, '#000000');
  doc.text(amountInWords(inv.grandTotal, 'INR'), L + 4, y + 15, {
    baseline: 'top',
    maxWidth: CW - 8,
  });
  y += 34;
  const hsn = new Map<
    string,
    { hsn: string; rate: number; taxable: number; tax: number }
  >();
  inv.items.forEach((l, i) => {
    const k = `${l.hsn}|${l.gstRate}`;
    const r = hsn.get(k) ?? {
      hsn: l.hsn || '—',
      rate: l.gstRate,
      taxable: 0,
      tax: 0,
    };
    r.taxable += t.lines[i].taxable;
    r.tax += t.lines[i].tax;
    hsn.set(k, r);
  });
  const hrows = [...hsn.values()];
  y = table(doc, {
    startY: y,
    head: [
      intra
        ? [
            'HSN/SAC',
            'Taxable Value',
            'CGST Rate',
            'CGST Amount',
            'SGST Rate',
            'SGST Amount',
            'Total Tax',
          ]
        : ['HSN/SAC', 'Taxable Value', 'IGST Rate', 'IGST Amount', 'Total Tax'],
    ],
    body: hrows.map((r) =>
      intra
        ? [
            r.hsn,
            indian(r.taxable),
            `${num(r.rate / 2)}%`,
            indian(r.tax / 2),
            `${num(r.rate / 2)}%`,
            indian(r.tax / 2),
            indian(r.tax),
          ]
        : [
            r.hsn,
            indian(r.taxable),
            `${num(r.rate)}%`,
            indian(r.tax),
            indian(r.tax),
          ],
    ),
    foot: [
      intra
        ? [
            'Total',
            indian(t.taxableAmount),
            '',
            indian(t.cgst),
            '',
            indian(t.sgst),
            indian(t.taxTotal),
          ]
        : [
            'Total',
            indian(t.taxableAmount),
            '',
            indian(t.igst),
            indian(t.taxTotal),
          ],
    ],
    styles: {
      fontSize: 7.3,
      cellPadding: 2.5,
      lineColor: '#000000',
      lineWidth: 0.6,
      textColor: '#000000',
      halign: 'right',
    },
    headStyles: { fontStyle: 'normal', halign: 'center', textColor: '#000000' },
    footStyles: { fontStyle: 'bold', textColor: '#000000' },
    columnStyles: { 0: { halign: 'left' } },
  });
  y = ensure(doc, y, 90);
  strokeRect(doc, L, y, CW, 84, '#000000');
  font(doc, 'normal', 7.8, '#000000');
  text(
    doc,
    `Tax Amount (in words) : ${amountInWords(t.taxTotal, 'INR')}`,
    L + 4,
    y + 4,
    { width: CW - 8 },
  );
  const bank = b.bank;
  if (bank.accountNumber) {
    const bx = L + CW / 2 + 4;
    doc.text("Company's Bank Details", bx, y + 22, { baseline: 'top' });
    font(doc, 'medium', 7.8, '#000000');
    text(
      doc,
      `Bank Name : ${bank.bankName}\nA/c No.       : ${bank.accountNumber}\nBranch & IFS Code : ${bank.branch} & ${bank.ifsc}${bank.upiId ? `\nUPI : ${bank.upiId}` : ''}`,
      bx,
      y + 33,
      { width: CW / 2 - 8 },
    );
  }
  font(doc, 'normal', 7.3, '#000000');
  text(
    doc,
    'Declaration\nWe declare that this document shows the actual price of the goods described and that all particulars are true and correct.',
    L + 4,
    y + 22,
    { width: CW / 2 - 12 },
  );
  y += 84;
  y = ensure(doc, y, 50);
  strokeRect(doc, L, y, CW, 46, '#000000');
  doc.line(L + CW / 2, y, L + CW / 2, y + 46);
  font(doc, 'normal', 7.5, '#000000');
  doc.text("Customer's Seal and Signature", L + 4, y + 34, { baseline: 'top' });
  font(doc, 'bold', 8, '#000000');
  doc.text(`for ${b.legalName}`, L + CW - 4, y + 3, {
    baseline: 'top',
    align: 'right',
  });
  font(doc, 'normal', 7.5, '#000000');
  doc.text('Authorised Signatory', L + CW - 4, y + 34, {
    baseline: 'top',
    align: 'right',
  });
  y += 52;
  font(doc, 'normal', 7.5, '#000000');
  doc.text('This is a Computer Generated Document', PAGE.w / 2, y, {
    baseline: 'top',
    align: 'center',
  });
  invoiceSubsidy(doc, inv, b, y + 16, true);
}

export async function invoicePdf(
  inv: Invoice,
  ctx: DocCtx,
  template?: InvoiceTemplate,
): Promise<Blob> {
  const b = await docBusiness(ctx);
  const tpl: InvoiceTemplate = template ?? inv.template ?? 'classic';
  const doc = await createDoc(
    `${inv.documentTitle ?? 'Invoice'} ${inv.invoiceNumber} – ${inv.customerName}`,
    b.name,
  );
  if (tpl === 'tally') tally(doc, inv, b);
  else standard(doc, inv, b, tpl);
  if (inv.status === 'cancelled') watermark(doc, 'CANCELLED', COLORS.clay);
  else if (inv.status === 'draft' || inv.invoiceNumber === 'DRAFT')
    watermark(doc, 'DRAFT', COLORS.muted);
  else if (inv.paymentStatus === 'paid' && tpl !== 'tally')
    watermark(doc, 'PAID', COLORS.leaf);
  footers(
    doc,
    tpl === 'tally'
      ? `${b.legalName} · ${inv.documentTitle ?? 'Invoice'} ${inv.invoiceNumber}`
      : footerLine(b),
  );
  return toBlob(doc);
}
