// Pull customer / order details out of the raw text of a shipping label.
// Works on text from PDF labels (exact) or OCR (noisy). Always shown to the admin for checking.

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Orissa', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'New Delhi', 'Jammu and Kashmir',
  'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry', 'Pondicherry',
];

// [display name, pattern]
const COURIERS = [
  ['Delhivery', /\bdelhivery\b/i],
  ['Ekart', /\bekart\b/i],
  ['Xpressbees', /\bxpress\s*bees\b/i],
  ['Blue Dart', /\bblue\s*dart\b/i],
  ['DTDC', /\bdtdc\b/i],
  ['Shadowfax', /\bshadow\s*fax\b/i],
  ['Valmo', /\bvalmo\b/i],
  ['Ecom Express', /\becom\s*express\b/i],
  ['India Post', /\b(india\s*post|speed\s*post)\b/i],
  ['Amazon Shipping', /\bamazon\s*(shipping|transportation)\b/i],
  ['Professional Couriers', /\bprofessional\s*couriers?\b/i],
  ['Gati', /\bgati\b/i],
  ['Trackon', /\btrackon\b/i],
  ['Shree Maruti', /\bshree\s*maruti\b/i],
  ['Smartr', /\bsmartr\b/i],
];

const PLATFORMS = ['Meesho', 'Amazon', 'Flipkart', 'Shopify', 'Shiprocket', 'Myntra', 'Etsy', 'Instagram', 'WhatsApp', 'Nykaa', 'Ajio', 'Snapdeal', 'GlowRoad', 'JioMart'];

const TO_KEYS = /\b(ship\s*to|deliver(?:y)?\s*(?:to|address)|shipping\s*address|consignee|customer\s*(?:name|details|address)?|buyer|bill\s*to|recipient|receiver|to)\b\s*[:\-]?/i;
const FROM_KEYS = /\b(ship(?:ped)?\s*from|return\s*(?:address|to)|if\s*undelivered|sold\s*by|seller|sender|from|pickup\s*address|shipper|warehouse)\b/i;
const NOISE = /\b(order|invoice|awb|tracking|waybill|weight|dimensions?|cod|prepaid|payment|amount|qty|quantity|sku|product|item|gst|hsn|date|barcode|mode|surface|express|routing|dest(?:ination)?|origin|courier|pin\s*code\s*:?$)\b/i;
// lines that end the "deliver to" block
const BLOCK_END = /^(order|invoice|awb|tracking|product|sku|item|dimensions?|weight|payment|cod\b|prepaid|courier|mode|shipping\s*charges?)\b/i;

// 10-digit Indian mobile, digits may be split by spaces/dashes in any grouping (98765 43210, 8017 223 344)
const PHONE = /(?<![\dA-Za-z])(?:\+?91[\s-]?|0)?([6-9](?:[\s-]?\d){9})(?![\s-]?\d)/;
const PIN = /(?<!\d)([1-9]\d{2}\s?\d{3})(?!\d)/;

const clean = (s) => s.replace(/\s+/g, ' ').replace(/^[\s,:;\-|]+|[\s,:;\-|]+$/g, '').trim();
const digits = (s) => s.replace(/\D/g, '');

function firstMatch(text, regexes) {
  for (const r of regexes) {
    const m = text.match(r);
    if (m && m[1]) return clean(m[1]);
  }
  return '';
}

const digitCount = (s) => (s.match(/\d/g) || []).length;

// Value of "Order No." — on the same line, or in the next lines (table layouts put it below the header)
function findOrderNumber(lines) {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(?:sub\s*)?order\s*(?:no\b|number\b|id\b|#)\.?\s*[:#\-]?\s*(.*)$/i);
    if (!m) continue;
    const ok = (t) => /^[A-Z0-9][A-Z0-9_\-/]{4,}$/i.test(t) && digitCount(t) >= 5;
    const strip = (t) => t.replace(/_\d{1,2}$/, ''); // Meesho sub-order suffix "_1"
    // 1) value on the same line: "Order No: 12345"
    const same = m[1].split(/[\s,|]+/).find(ok);
    if (same) return strip(same);
    // 2) table layout: the value is in the next lines (skip lines that are about other numbers)
    const below = [lines[i + 1] || '', lines[i + 2] || '']
      .filter((l) => !/awb|tracking|waybill|invoice|sku\b|phone|mobile/i.test(l))
      .join(' ')
      .split(/[\s,|]+/);
    // real order IDs are mostly digits (Meesho: 18 digits) — prefer those over SKUs like IP15-BLK-LTH-001
    const tok = below.find((t) => ok(t) && digitCount(t) >= 8) || below.find(ok);
    if (tok) return strip(tok);
  }
  return firstMatch(lines.join('\n'), [/\b(?:ref(?:erence)?|po)\s*(?:no|number|#)?\.?[ \t]*[:#\-][ \t]*([A-Z0-9][A-Z0-9_\-/]{4,})/i, /#\s?(\d{4,})/]);
}

export function parseLabel(raw, fileName = '') {
  const text = (raw || '').replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map((l) => clean(l))
    .filter(Boolean);
  const flat = lines.join('\n');

  // ---- platform ----
  const isMeesho =
    /sub_order_labels/i.test(fileName) || (/if\s*undelivered,?\s*return\s*to/i.test(flat) && /product\s*details/i.test(flat) && /order\s*no/i.test(flat));
  const platform = isMeesho ? 'Meesho' : PLATFORMS.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(flat)) || '';

  // ---- order / tracking numbers ----
  const orderNumber = findOrderNumber(lines);
  let awb = firstMatch(flat, [
    /(?:awb|a\.w\.b|tracking|waybill|way\s*bill|shipment\s*id|consignment)\s*(?:no|number|id|#)?\.?[ \t]*[:#\-]?[ \t]*([A-Z0-9]{8,})/i,
  ]);
  if (!awb) {
    // labels often print the AWB alone on a line above its barcode (e.g. SF4581730617FPL, VL0086230141441)
    const stop = lines.findIndex((l) => /^product\s*details|^sku\b|bill\s*of\s*supply|tax\s*invoice/i.test(l));
    const head = stop > 0 ? lines.slice(0, stop) : lines;
    awb = head.find((l) => /^[A-Z0-9]{10,22}$/.test(l) && digitCount(l) >= 8 && l !== orderNumber && !l.startsWith(orderNumber || '§')) || '';
  }
  const courier = (COURIERS.find(([, re]) => re.test(flat)) || [''])[0];

  // ---- payment ----
  let payment = '';
  let codAmount = '';
  if (/\bprepaid\b/i.test(flat)) payment = 'Prepaid';
  else {
    const cod = flat.match(/\b(?:cod|cash\s*on\s*delivery|collect(?:able)?(?:\s*amount)?)\b[^\d\n]{0,25}(?:rs\.?|₹|inr)[ \t]*([\d,]+(?:\.\d{1,2})?)/i)
      || flat.match(/\b(?:cod\s*amount|collectable\s*amount|amount\s*to\s*(?:be\s*)?collect(?:ed)?)\b[^\d\n]{0,15}([\d,]+(?:\.\d{1,2})?)/i);
    if (cod) {
      payment = 'COD';
      codAmount = cod[1].replace(/,/g, '');
    } else if (/\b(cod|cash\s*on\s*delivery)\b|check\s*the\s*payable\s*amount/i.test(flat)) payment = 'COD';
  }

  // ---- find the "deliver to" block ----
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (FROM_KEYS.test(l) && !/\bto\b/i.test(l.replace(/return\s*to/i, ''))) continue;
    if (TO_KEYS.test(l) && !NOISE.test(l.replace(TO_KEYS, ''))) {
      start = i;
      break;
    }
  }

  let block = [];
  if (start >= 0) {
    const rest = clean(lines[start].replace(TO_KEYS, '').replace(/^(name)\s*[:\-]/i, ''));
    if (rest) block.push(rest);
    for (let i = start + 1; i < lines.length && block.length < 9; i++) {
      const l = lines[i];
      if (FROM_KEYS.test(l) || (BLOCK_END.test(l) && block.length > 1)) break;
      block.push(l);
    }
  } else {
    // no keyword: take the lines around the first pincode
    const pi = lines.findIndex((l) => PIN.test(l) && !/order|awb|invoice/i.test(l));
    if (pi >= 0) block = lines.slice(Math.max(0, pi - 4), pi + 2);
  }

  // ---- phone ----
  const phoneFrom = (arr) => {
    for (const l of arr) {
      const m = l.match(PHONE);
      if (m) return digits(m[1]);
    }
    return '';
  };
  let phone = phoneFrom(block);
  if (!phone) {
    // any phone that is not inside a "from / return" section
    let inFrom = false;
    const outside = lines.filter((l) => {
      if (FROM_KEYS.test(l)) inFrom = true;
      else if (TO_KEYS.test(l)) inFrom = false;
      return !inFrom;
    });
    phone = phoneFrom(outside);
  }

  // ---- pincode / state / city ----
  let pincode = '';
  let pinLine = -1;
  block.forEach((l, i) => {
    if (pincode) return;
    const lNoPhone = l.replace(PHONE, ' ');
    const m = lNoPhone.match(PIN);
    if (m) {
      pincode = digits(m[1]);
      pinLine = i;
    }
  });

  const blockText = block.join(', ');
  const state =
    STATES.slice()
      .sort((a, b) => b.length - a.length)
      .find((s) => new RegExp(`\\b${s.replace(/&/g, '\\&').replace(/\s+/g, '\\s*')}\\b`, 'i').test(blockText)) || '';

  let city = '';
  const cityM = blockText.match(new RegExp(`([A-Za-z][A-Za-z .]{2,30}?)\\s*[,\\-]?\\s*(?:${state ? state.replace(/\s+/g, '\\s*') : '\\b\\B'}|[1-9]\\d{2}\\s?\\d{3})`, 'i'));
  if (cityM) city = clean(cityM[1].split(',').pop()).replace(/\s+district$/i, '');
  if (city && state && city.toLowerCase() === state.toLowerCase()) city = '';

  // ---- name & address ----
  const isMeta = (l) => PHONE.test(l) && digits(l).length >= 10 && l.replace(PHONE, '').replace(/(mob(?:ile)?|ph(?:one)?|contact|tel)\.?\s*(no)?\.?\s*[:\-]?/i, '').trim().length < 3;
  const addrLines = block.filter((l) => !isMeta(l) && !NOISE.test(l));
  let name = '';
  if (addrLines.length) {
    const n = addrLines[0].replace(/^(name|mr\.?|mrs\.?|ms\.?)\s*[:\-]?\s*/i, '');
    if (/[A-Za-zऀ-ॿ]/.test(n) && !PIN.test(n) && n.length <= 40) name = clean(n);
  }
  const address = clean(
    addrLines
      .slice(name ? 1 : 0, pinLine >= 0 ? undefined : 5)
      .map((l) => l.replace(PHONE, '').replace(/(mob(?:ile)?|ph(?:one)?|contact)\.?\s*(no)?\.?\s*[:\-]?/i, ''))
      .map(clean)
      .filter(Boolean)
      .join(', ')
  );

  return { orderNumber, awb, courier, platform, payment, codAmount, name, phone, address, city, state, pincode };
}
