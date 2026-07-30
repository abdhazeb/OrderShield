#!/usr/bin/env node
/**
 * Locale coverage check. Run with `npm run check:i18n`.
 *
 * Three classes of bug this catches, all of which have shipped before:
 *
 *  1. A key used in a template that exists in neither locale file — renders as the raw
 *     key ("admin.dossier.view") to the user.
 *  2. A key present in `en` but missing from `ar` (or vice versa) — ngx-translate falls
 *     back to echoing the key, so one language silently breaks.
 *  3. A value the app stores canonically in English (country, product category, contact
 *     position) with no matching `country.*` / `productCategory.*` / `contactPosition.*`
 *     entry — displays untranslated even though the template is "correct".
 *
 * `zh` is deliberately excluded: Chinese is being dropped and zh.json is not kept current.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'app');
const I18N = path.join(ROOT, 'src', 'assets', 'i18n');
const LOCALES = ['en', 'ar'];

/** Namespaces whose entries mirror canonical English values stored in the database. */
const VALUE_NAMESPACES = ['country', 'productCategory', 'contactPosition', 'severity'];

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

function walk(dir, exts, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, files);
    else if (exts.some(e => entry.name.endsWith(e))) files.push(full);
  }
  return files;
}

const locales = {};
for (const lang of LOCALES) {
  locales[lang] = JSON.parse(fs.readFileSync(path.join(I18N, `${lang}.json`), 'utf8'));
}
const keys = Object.fromEntries(LOCALES.map(l => [l, flatten(locales[l])]));

const problems = [];

// ── 1 & 2: keys used in code vs. keys defined ────────────────────────────────
const sources = walk(SRC, ['.html', '.ts']);
const used = new Map(); // key -> first file that uses it

for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // 'some.key' | translate     and     translate.instant('some.key')
  const patterns = [
    /'([a-zA-Z][\w]*(?:\.[\w]+)+)'\s*\|\s*translate/g,
    /"([a-zA-Z][\w]*(?:\.[\w]+)+)"\s*\|\s*translate/g,
    /\.instant\(\s*'([a-zA-Z][\w]*(?:\.[\w]+)+)'/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) {
      if (!used.has(m[1])) used.set(m[1], rel);
    }
  }
}

for (const [key, file] of used) {
  const missingIn = LOCALES.filter(l => !keys[l].has(key));
  if (missingIn.length === LOCALES.length) {
    problems.push(`MISSING EVERYWHERE  ${key}  (used in ${file})`);
  } else if (missingIn.length > 0) {
    problems.push(`MISSING IN ${missingIn.join(',').padEnd(6)} ${key}  (used in ${file})`);
  }
}

// ── 2 (other direction): a namespace present in one locale but not the other ──
for (const lang of LOCALES) {
  for (const other of LOCALES.filter(l => l !== lang)) {
    for (const key of keys[lang]) {
      if (!keys[other].has(key)) {
        problems.push(`ASYMMETRIC          ${key}  (in ${lang}, absent from ${other})`);
      }
    }
  }
}

// ── 3: stored canonical values with no translation entry ─────────────────────
// The option values hardcoded in the submit form are the canonical set the API stores.
const formHtml = fs.readFileSync(
  path.join(SRC, 'features', 'review', 'submit-review.component.html'), 'utf8');
const formTs = fs.readFileSync(
  path.join(SRC, 'features', 'review', 'submit-review.component.ts'), 'utf8');

function keySuffix(label) {
  return label
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

const canonical = [];

// <option value="Health & Medical"> under the productCategory select
for (const m of formHtml.matchAll(/<option value="([^"]+)">\{\{ 'productCategory\./g)) {
  canonical.push(['productCategory', m[1]]);
}
// countryOptions: [{ name: 'China', ... }]
for (const m of formTs.matchAll(/\{ name: '([^']+)', code:/g)) {
  canonical.push(['country', m[1]]);
}
// contactPositionOptions: readonly string[]
const posBlock = formTs.match(/contactPositionOptions[^[]*\[([\s\S]*?)\];/);
if (posBlock) {
  for (const m of posBlock[1].matchAll(/'([^']+)'/g)) {
    canonical.push(['contactPosition', m[1]]);
  }
}

for (const [namespace, value] of canonical) {
  const key = `${namespace}.${keySuffix(value)}`;
  const missingIn = LOCALES.filter(l => !keys[l].has(key));
  if (missingIn.length > 0) {
    problems.push(`UNTRANSLATED VALUE  ${key}  ("${value}" is stored but has no ${missingIn.join(',')} entry)`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const unique = [...new Set(problems)].sort();

if (unique.length === 0) {
  const total = keys[LOCALES[0]].size;
  console.log(`i18n OK — ${total} keys, ${LOCALES.join(' + ')} in sync, all stored values translatable.`);
  console.log(`(namespaces mirroring stored values: ${VALUE_NAMESPACES.join(', ')})`);
  process.exit(0);
}

console.error(`i18n problems (${unique.length}):\n`);
for (const p of unique) console.error('  ' + p);
console.error('\nAdd the missing keys to src/assets/i18n/{en,ar}.json.');
process.exit(1);
