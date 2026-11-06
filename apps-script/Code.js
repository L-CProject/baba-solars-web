/**
 * Baba Solars — website enquiry receiver (Google Apps Script Web App)
 * ─────────────────────────────────────────────────────────────────────────────
 * The website POSTs JSON (as text/plain) to this Web App:
 *   { "action": "sheet" | "email", "token": "<API_TOKEN>", "data": { submissionId, dateTime, name, mobile,
 *     email, enquiryType, requiredKw, message, city, service, source, page, createdAt } }
 *
 *  action "sheet" → adds one row to the "Enquiries" sheet (header row created automatically).
 *                   A submissionId that is already in the sheet is NOT added again.
 *  action "email" → sends a branded HTML email to ADMIN_EMAIL (MailApp). Each submissionId is
 *                   emailed only once (tracked in a hidden "EmailLog" sheet).
 *
 * The two actions are independent: an email failure never touches the sheet and vice versa.
 *
 * Script Properties (Project Settings → Script Properties):
 *   API_TOKEN    (required) same value as VITE_APPS_SCRIPT_TOKEN in the website .env
 *   ADMIN_EMAIL  (required for email) one address, or several separated by commas
 *   SHEET_ID     (optional) spreadsheet id — leave empty when this script is bound to the sheet
 *   SHEET_NAME   (optional) tab name, default "Enquiries"
 *
 * Responses: { "ok": true, "action": "...", "result": "added" | "duplicate" | "sent" | "already-sent" }
 *        or  { "ok": false, "error": "..." }   (the website then keeps the item in its retry queue)
 *
 * See SETUP.md for step-by-step deployment.
 */

var HEADERS = ['Submission ID', 'Date & Time', 'Name', 'Mobile', 'Email', 'Enquiry Type', 'Required kW', 'Message'];
var DEFAULT_SHEET_NAME = 'Enquiries';
var EMAIL_LOG_SHEET = 'EmailLog';
var BRAND = { name: 'Baba Solars', navy: '#0f2f57', navyDark: '#061630', sun: '#ffb81c', ink: '#061630', muted: '#52637c', line: '#d9e3f0', bg: '#f3f7fc' };

// ─── Entry points ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var body = parseBody_(e);
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('API_TOKEN');
    if (!expected) return json_({ ok: false, error: 'Server not configured: set the API_TOKEN script property.' });
    if (!body || typeof body.token !== 'string' || !safeEqual_(body.token, expected)) return json_({ ok: false, error: 'Unauthorized' });

    var action = body.action === 'email' ? 'email' : body.action === 'sheet' ? 'sheet' : '';
    if (!action) return json_({ ok: false, error: 'Unknown action' });

    var data = sanitize_(body.data);
    var invalid = validate_(data);
    if (invalid) return json_({ ok: false, error: invalid });

    var lock = LockService.getScriptLock();
    lock.waitLock(25000); // one write at a time → no duplicate rows from parallel retries
    try {
      if (action === 'sheet') return json_({ ok: true, action: action, result: saveRow_(data) });
      return json_({ ok: true, action: action, result: sendEmail_(data) });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Health check: open the Web App URL in a browser to confirm the deployment works. */
function doGet() {
  return json_({ ok: true, service: 'Baba Solars enquiries', time: new Date().toISOString() });
}

// ─── Google Sheet ─────────────────────────────────────────────────────────────

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: bind this script to a Google Sheet or set the SHEET_ID script property.');
  return ss;
}

/** The enquiries tab, created with a formatted header row when missing. */
function getEnquirySheet_() {
  var ss = getSpreadsheet_();
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || DEFAULT_SHEET_NAME;
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureHeader_(sheet);
  return sheet;
}

function ensureHeader_(sheet) {
  var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var hasHeader = first.join('') !== '';
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground(BRAND.navy).setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 290);
    sheet.setColumnWidth(2, 170);
    sheet.setColumnWidth(8, 420);
  }
}

/** True when the submission id is already in column A. */
function hasSubmission_(sheet, submissionId) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  return !!sheet.getRange(2, 1, last - 1, 1).createTextFinder(submissionId).matchEntireCell(true).findNext();
}

function saveRow_(d) {
  var sheet = getEnquirySheet_();
  if (hasSubmission_(sheet, d.submissionId)) return 'duplicate';
  var row = [d.submissionId, d.dateTime, d.name, d.mobile, d.email, d.enquiryType, d.requiredKw, d.message].map(cellSafe_);
  var r = sheet.getLastRow() + 1;
  var range = sheet.getRange(r, 1, 1, HEADERS.length);
  range.setNumberFormat('@'); // keep mobile numbers / kW as typed text
  range.setValues([row]);
  return 'added';
}

// ─── Email ────────────────────────────────────────────────────────────────────

function getEmailLog_() {
  var ss = getSpreadsheet_();
  var log = ss.getSheetByName(EMAIL_LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(EMAIL_LOG_SHEET);
    log.getRange(1, 1, 1, 2).setValues([['Submission ID', 'Emailed at']]).setFontWeight('bold');
    try { log.hideSheet(); } catch (e) { /* the only sheet cannot be hidden — fine */ }
  }
  return log;
}

function sendEmail_(d) {
  var to = String(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').trim();
  if (!to) throw new Error('Set the ADMIN_EMAIL script property.');
  var log = getEmailLog_();
  if (hasSubmission_(log, d.submissionId)) return 'already-sent';

  var options = {
    to: to,
    subject: emailSubject_(d),
    htmlBody: buildEmailHtml_(d),
    body: buildEmailText_(d),
    name: BRAND.name + ' Website',
  };
  if (d.email && isEmail_(d.email)) options.replyTo = d.email;
  MailApp.sendEmail(options);

  var r = log.getLastRow() + 1;
  log.getRange(r, 1, 1, 2).setNumberFormat('@').setValues([[d.submissionId, new Date().toISOString()]]);
  return 'sent';
}

function emailSubject_(d) {
  var parts = ['New enquiry', d.name];
  if (d.enquiryType) parts.push(d.enquiryType);
  if (d.requiredKw) parts.push(d.requiredKw + ' kW');
  return parts.join(' · ');
}

/** Only filled-in fields, in this order. */
function detailRows_(d) {
  return [
    ['Name', d.name],
    ['Mobile', d.mobile],
    ['Email', d.email],
    ['Enquiry type', d.enquiryType],
    ['Required kW', d.requiredKw ? d.requiredKw + ' kW' : ''],
    ['City / area', d.city],
    ['Service', d.service],
    ['Message', d.message],
    ['Submitted', d.dateTime],
  ].filter(function (r) { return r[1]; });
}

function buildEmailText_(d) {
  return 'New website enquiry — ' + BRAND.name + '\n\n' +
    detailRows_(d).map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nSubmission ID: ' + d.submissionId;
}

/** Responsive, table-based HTML (works in Gmail, Outlook and phone mail apps). Empty fields are left out. */
function buildEmailHtml_(d) {
  var esc = escapeHtml_;
  var badgeColor = d.enquiryType === 'Commercial' ? '#1f6fc4' : '#23944a';
  var badge = d.enquiryType
    ? '<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:' + badgeColor + ';color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;">' + esc(d.enquiryType) + '</span>'
    : '';
  var kw = d.requiredKw
    ? '<td class="stack" style="padding:0 0 0 12px;text-align:right;vertical-align:middle;"><div style="display:inline-block;background:' + BRAND.sun + ';color:' + BRAND.navyDark + ';border-radius:12px;padding:8px 14px;font-weight:800;font-size:22px;line-height:1;">' + esc(d.requiredKw) + ' <span style="font-size:13px;font-weight:700;">kW</span></div></td>'
    : '';

  var rows = detailRows_(d).filter(function (r) { return r[0] !== 'Message'; }).map(function (r) {
    var v = esc(r[1]);
    if (r[0] === 'Mobile') v = '<a href="tel:+91' + esc(r[1]) + '" style="color:' + BRAND.navy + ';font-weight:700;text-decoration:none;">' + v + '</a>';
    if (r[0] === 'Email') v = '<a href="mailto:' + esc(r[1]) + '" style="color:' + BRAND.navy + ';font-weight:700;text-decoration:none;">' + v + '</a>';
    return '<tr><td class="stack" style="padding:10px 0;border-bottom:1px solid ' + BRAND.line + ';color:' + BRAND.muted + ';font-size:13px;width:140px;vertical-align:top;">' + esc(r[0]) +
      '</td><td class="stack" style="padding:10px 0;border-bottom:1px solid ' + BRAND.line + ';color:' + BRAND.ink + ';font-size:15px;font-weight:600;vertical-align:top;word-break:break-word;">' + v + '</td></tr>';
  }).join('');

  var message = d.message
    ? '<p style="margin:22px 0 6px;color:' + BRAND.muted + ';font-size:13px;">Message</p><div style="background:' + BRAND.bg + ';border-left:4px solid ' + BRAND.sun + ';border-radius:8px;padding:14px 16px;color:' + BRAND.ink + ';font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;">' + esc(d.message) + '</div>'
    : '';

  var buttons = [];
  if (d.mobile) {
    buttons.push(button_('tel:+91' + d.mobile, 'Call ' + d.mobile, BRAND.navy, '#ffffff'));
    buttons.push(button_('https://wa.me/91' + d.mobile, 'WhatsApp', '#25d366', '#ffffff'));
  }
  if (d.email) buttons.push(button_('mailto:' + d.email + '?subject=' + encodeURIComponent('Re: your solar enquiry — ' + BRAND.name), 'Reply by email', '#ffffff', BRAND.navy, true));

  return '' +
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>@media only screen and (max-width:520px){.wrap{padding:12px !important}.card{padding:20px !important}.stack{display:block !important;width:100% !important;text-align:left !important;padding-left:0 !important}.btn{display:block !important;margin:0 0 8px 0 !important;text-align:center !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:' + BRAND.bg + ';font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
    '<div style="display:none;max-height:0;overflow:hidden;">' + esc(emailSubject_(d)) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + BRAND.bg + ';"><tr><td class="wrap" align="center" style="padding:28px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">' +
    // Header
    '<tr><td style="background:' + BRAND.navy + ';border-radius:16px 16px 0 0;padding:22px 28px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:.2px;"><span style="color:' + BRAND.sun + ';">&#9728;</span> ' + BRAND.name + '</td>' +
    '<td align="right" style="color:#cfdcec;font-size:12px;">Website enquiry</td></tr></table>' +
    '<div style="height:3px;background:' + BRAND.sun + ';border-radius:3px;margin-top:16px;width:64px;"></div></td></tr>' +
    // Body
    '<tr><td class="card" style="background:#ffffff;padding:28px;border-radius:0 0 16px 16px;box-shadow:0 6px 24px rgba(6,22,48,.08);">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="stack" style="vertical-align:middle;">' + badge +
    '<h1 style="margin:10px 0 2px;font-size:22px;line-height:1.3;color:' + BRAND.ink + ';">New enquiry from ' + esc(d.name) + '</h1>' +
    (d.dateTime ? '<p style="margin:0;color:' + BRAND.muted + ';font-size:13px;">' + esc(d.dateTime) + ' (IST)</p>' : '') +
    '</td>' + kw + '</tr></table>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid ' + BRAND.line + ';">' + rows + '</table>' +
    message +
    (buttons.length ? '<div style="margin-top:24px;">' + buttons.join('') + '</div>' : '') +
    '<p style="margin:26px 0 0;color:#8ea3c0;font-size:11px;">Submission ID: ' + esc(d.submissionId) + (d.page ? ' · ' + esc(d.page) : '') + '</p>' +
    '</td></tr>' +
    '<tr><td align="center" style="padding:16px;color:#8ea3c0;font-size:11px;">Sent automatically by the ' + BRAND.name + ' website.</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function button_(href, label, bg, color, outline) {
  return '<a class="btn" href="' + escapeHtml_(href) + '" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:10px;background:' + bg + ';color:' + color +
    ';font-weight:700;font-size:14px;text-decoration:none;' + (outline ? 'border:1.5px solid ' + color + ';' : '') + '">' + escapeHtml_(label) + '</a>';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try { return JSON.parse(e.postData.contents); } catch (err) { return null; }
}

function str_(v, max) { return String(v == null ? '' : v).replace(/\s+$/g, '').replace(/^\s+/g, '').slice(0, max); }

function sanitize_(raw) {
  var d = raw && typeof raw === 'object' ? raw : {};
  var type = str_(d.enquiryType, 20);
  var kw = str_(d.requiredKw, 10).replace(/[^\d.]/g, '');
  var createdAt = str_(d.createdAt, 40);
  var dateTime = str_(d.dateTime, 60);
  if (!dateTime) {
    var when = createdAt && !isNaN(Date.parse(createdAt)) ? new Date(createdAt) : new Date();
    dateTime = Utilities.formatDate(when, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a');
  }
  return {
    submissionId: str_(d.submissionId, 64),
    createdAt: createdAt,
    dateTime: dateTime,
    name: str_(d.name, 120),
    mobile: str_(d.mobile, 20).replace(/\D/g, ''),
    email: str_(d.email, 200),
    enquiryType: type === 'Home' || type === 'Commercial' ? type : '',
    requiredKw: kw && Number(kw) > 0 ? kw : '',
    message: str_(d.message, 4000),
    city: str_(d.city, 120),
    service: str_(d.service, 200),
    source: str_(d.source, 40),
    page: str_(d.page, 300),
  };
}

function validate_(d) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(d.submissionId)) return 'Missing or invalid submissionId';
  if (d.name.length < 2) return 'Missing name';
  if (!d.mobile && !d.email) return 'Mobile or email is required';
  if (d.mobile && !/^[6-9]\d{9}$/.test(d.mobile)) return 'Invalid mobile number';
  if (d.email && !isEmail_(d.email)) return 'Invalid email';
  return '';
}

function isEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

/** Stop text such as "=HYPERLINK(...)" from running as a formula in the sheet. */
function cellSafe_(v) {
  var s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Constant-time string comparison (avoids leaking the token through timing). */
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var out = 0;
  for (var i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ─── Manual helpers (run from the Apps Script editor) ────────────────────────

/** Run once after pasting: creates the "Enquiries" tab + header and asks for permissions. */
function setup() {
  var sheet = getEnquirySheet_();
  getEmailLog_();
  console.log('Ready: ' + sheet.getParent().getUrl() + ' → tab "' + sheet.getName() + '"');
}

/** Sends a sample email to ADMIN_EMAIL so you can check the template. Does not touch the sheet. */
function sendTestEmail() {
  var to = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!to) throw new Error('Set the ADMIN_EMAIL script property first.');
  var d = sanitize_({
    submissionId: 'test-' + Utilities.getUuid(), name: 'Test Customer', mobile: '9876543210', email: 'customer@example.com',
    enquiryType: 'Home', requiredKw: '5', city: 'Raipur', message: 'This is a test enquiry from the Apps Script editor.',
    createdAt: new Date().toISOString(),
  });
  MailApp.sendEmail({ to: to, subject: '[TEST] ' + emailSubject_(d), htmlBody: buildEmailHtml_(d), body: buildEmailText_(d), name: BRAND.name + ' Website' });
  console.log('Test email sent to ' + to);
}
