// 2synth sales and licensing backend (Google Apps Script)
//
// Endpoint modes:
// - mode=claim&sessionId=cs_test_...&email=user@example.com
// - mode=activate&licenseKey=2SYNTH-...&machineHash=...&pluginVersion=...
// - mode=validate&licenseKey=2SYNTH-...&machineHash=...
//
// All storage is in a Google Sheet managed by this script.

const PRODUCT_CODE = '2synth';
const PRICE_CENTS = 1500;
const CURRENCY = 'usd';
const MAX_DEVICES = 2;

const SALES_SHEET_ID = ''; // optional: paste sheet ID. Empty = auto-create
const SHEET_LICENSES = 'Licenses';

function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const mode = String(p.mode || '').trim().toLowerCase();

    if (!mode) {
      return reply_(e, {
        ok: true,
        service: PRODUCT_CODE,
        modes: ['claim', 'activate', 'validate']
      });
    }

    if (mode === 'claim') return handleClaim_(e, p);
    if (mode === 'activate') return handleActivate_(e, p);
    if (mode === 'validate') return handleValidate_(e, p);

    return reply_(e, { ok: false, error: 'Unknown mode' });
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  }
}

function setup2SynthSalesBackend() {
  const sheet = getLicenseSheet_();
  return '2synth sales backend ready: ' + sheet.getParent().getUrl();
}

function handleClaim_(e, p) {
  const sessionId = String(p.sessionId || '').trim();
  const email = normalizeEmail_(p.email);

  if (!sessionId) return reply_(e, { ok: false, error: 'Missing sessionId' });
  if (!email) return reply_(e, { ok: false, error: 'Missing email' });

  const stripe = fetchStripeCheckoutSession_(sessionId);
  const paidEmail = normalizeEmail_(stripe.customer_details && stripe.customer_details.email);

  if (stripe.payment_status !== 'paid') {
    return reply_(e, { ok: false, error: 'Checkout session is not paid' });
  }

  if (String(stripe.currency || '').toLowerCase() !== CURRENCY) {
    return reply_(e, { ok: false, error: 'Unexpected currency' });
  }

  if (Number(stripe.amount_total || 0) !== PRICE_CENTS) {
    return reply_(e, { ok: false, error: 'Unexpected amount' });
  }

  if (!paidEmail || paidEmail !== email) {
    return reply_(e, { ok: false, error: 'Email does not match the checkout receipt email' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getLicenseSheet_();
    const state = loadLicenseState_(sheet);

    if (state.bySessionId[sessionId]) {
      const existing = state.rows[state.bySessionId[sessionId]];
      return reply_(e, {
        ok: true,
        status: 'already_claimed',
        licenseKey: existing.licenseKey,
        email: existing.email,
        maxDevices: MAX_DEVICES
      });
    }

    const licenseKey = generateLicenseKey_();
    const nowIso = new Date().toISOString();

    sheet.appendRow([
      nowIso,
      PRODUCT_CODE,
      sessionId,
      email,
      licenseKey,
      'active',
      MAX_DEVICES,
      '',
      nowIso,
      ''
    ]);

    return reply_(e, {
      ok: true,
      status: 'claimed',
      licenseKey: licenseKey,
      email: email,
      maxDevices: MAX_DEVICES
    });
  } finally {
    lock.releaseLock();
  }
}

function handleActivate_(e, p) {
  const licenseKey = String(p.licenseKey || '').trim().toUpperCase();
  const machineHash = String(p.machineHash || '').trim();
  const pluginVersion = String(p.pluginVersion || '').trim();

  if (!licenseKey) return reply_(e, { ok: false, error: 'Missing licenseKey' });
  if (!machineHash) return reply_(e, { ok: false, error: 'Missing machineHash' });

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getLicenseSheet_();
    const state = loadLicenseState_(sheet);
    const rowNum = state.byLicenseKey[licenseKey];

    if (!rowNum) return reply_(e, { ok: false, error: 'License not found' });

    const row = state.rows[rowNum];
    if (row.status !== 'active') {
      return reply_(e, { ok: false, error: 'License is not active' });
    }

    const devices = parseDevices_(row.devicesJson);
    if (devices.indexOf(machineHash) === -1) {
      if (devices.length >= Number(row.maxDevices || MAX_DEVICES)) {
        return reply_(e, {
          ok: false,
          error: 'Device limit reached',
          maxDevices: Number(row.maxDevices || MAX_DEVICES)
        });
      }
      devices.push(machineHash);
    }

    const nowIso = new Date().toISOString();
    const newDevices = JSON.stringify(devices);

    sheet.getRange(rowNum, 8).setValue(newDevices);
    sheet.getRange(rowNum, 9).setValue(nowIso);
    sheet.getRange(rowNum, 10).setValue(pluginVersion || 'unknown');

    return reply_(e, {
      ok: true,
      status: 'active',
      maxDevices: Number(row.maxDevices || MAX_DEVICES),
      devicesUsed: devices.length
    });
  } finally {
    lock.releaseLock();
  }
}

function handleValidate_(e, p) {
  const licenseKey = String(p.licenseKey || '').trim().toUpperCase();
  const machineHash = String(p.machineHash || '').trim();

  if (!licenseKey || !machineHash) {
    return reply_(e, { ok: false, error: 'Missing licenseKey or machineHash' });
  }

  const sheet = getLicenseSheet_();
  const state = loadLicenseState_(sheet);
  const rowNum = state.byLicenseKey[licenseKey];
  if (!rowNum) return reply_(e, { ok: false, error: 'License not found' });

  const row = state.rows[rowNum];
  if (row.status !== 'active') return reply_(e, { ok: false, error: 'License is not active' });

  const devices = parseDevices_(row.devicesJson);
  const allowed = devices.indexOf(machineHash) !== -1;

  return reply_(e, {
    ok: allowed,
    status: allowed ? 'valid' : 'not_activated_on_this_device',
    maxDevices: Number(row.maxDevices || MAX_DEVICES),
    devicesUsed: devices.length
  });
}

function fetchStripeCheckoutSession_(sessionId) {
  const stripeKey = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY') || '';
  if (!stripeKey) {
    throw new Error('Missing STRIPE_SECRET_KEY in Script Properties');
  }

  const url = 'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId);
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + stripeKey
    }
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Stripe API error (' + code + '): ' + body.slice(0, 300));
  }

  return JSON.parse(body);
}

function getLicenseSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ssId = SALES_SHEET_ID || props.getProperty('SALES_SHEET_ID') || '';

  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('b2nny 2synth sales');
    ssId = ss.getId();
    props.setProperty('SALES_SHEET_ID', ssId);
  }

  let sh = ss.getSheetByName(SHEET_LICENSES);
  if (!sh) sh = ss.insertSheet(SHEET_LICENSES);

  if (sh.getLastRow() === 0) {
    sh.appendRow([
      'createdAt',
      'productCode',
      'sessionId',
      'email',
      'licenseKey',
      'status',
      'maxDevices',
      'devicesJson',
      'updatedAt',
      'lastPluginVersion'
    ]);
  }

  return sh;
}

function loadLicenseState_(sheet) {
  const values = sheet.getDataRange().getValues();
  const rows = {};
  const bySessionId = {};
  const byLicenseKey = {};

  if (values.length <= 1) {
    return { rows: rows, bySessionId: bySessionId, byLicenseKey: byLicenseKey };
  }

  for (let r = 1; r < values.length; r++) {
    const rowNum = r + 1;
    const v = values[r];
    const row = {
      createdAt: String(v[0] || ''),
      productCode: String(v[1] || ''),
      sessionId: String(v[2] || '').trim(),
      email: normalizeEmail_(v[3]),
      licenseKey: String(v[4] || '').trim().toUpperCase(),
      status: String(v[5] || 'active').trim().toLowerCase(),
      maxDevices: Number(v[6] || MAX_DEVICES),
      devicesJson: String(v[7] || '[]'),
      updatedAt: String(v[8] || ''),
      lastPluginVersion: String(v[9] || '')
    };

    rows[rowNum] = row;
    if (row.sessionId) bySessionId[row.sessionId] = rowNum;
    if (row.licenseKey) byLicenseKey[row.licenseKey] = rowNum;
  }

  return { rows: rows, bySessionId: bySessionId, byLicenseKey: byLicenseKey };
}

function parseDevices_(jsonText) {
  try {
    const arr = JSON.parse(jsonText || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.map(function (x) { return String(x || '').trim(); }).filter(function (x) { return x.length > 0; });
  } catch (err) {
    return [];
  }
}

function generateLicenseKey_() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = [];

  for (let p = 0; p < 4; p++) {
    let part = '';
    for (let i = 0; i < 4; i++) {
      part += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    parts.push(part);
  }

  return '2SYNTH-' + parts.join('-');
}

function normalizeEmail_(raw) {
  return String(raw || '').trim().toLowerCase();
}

function reply_(e, obj) {
  const p = (e && e.parameter) ? e.parameter : {};
  const callback = String(p.callback || '').trim();

  if (callback) {
    const safeCb = callback.replace(/[^\w.$]/g, '');
    const js = safeCb + '(' + JSON.stringify(obj) + ');';
    return ContentService.createTextOutput(js).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
