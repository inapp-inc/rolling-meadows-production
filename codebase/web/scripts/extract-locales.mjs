// Converts the prototype's locale bundles (Docs/ui/js/locales/*.js) into JSON
// the React app can import. Re-run this if the prototype locales change.
//
//   node scripts/extract-locales.mjs
//
// The prototype files are browser IIFEs that mutate `window.RM._LOCALES`, so we
// evaluate them in a VM with a minimal window stub and dump the result.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');
const repoRoot = resolve(webRoot, '..', '..');
const localeDir = join(repoRoot, 'Docs', 'ui', 'js', 'locales');
const outDir = join(webRoot, 'src', 'i18n', 'locales');

// Load order matters — it mirrors Docs/ui/js/core/load-app.js.
const FILES = [
  'en.js',
  'es.js',
  'domain-en.js',
  'domain-es.js',
  'forms-en.js',
  'forms-es.js',
  'ui-en.js',
  'ui-es.js',
];

const sandbox = { window: {}, navigator: { language: 'en' }, document: undefined };
sandbox.globalThis = sandbox;
sandbox.window.RM = { _LOCALES: {} };
sandbox.RM = sandbox.window.RM;
vm.createContext(sandbox);

for (const file of FILES) {
  const source = readFileSync(join(localeDir, file), 'utf8');
  vm.runInContext(source, sandbox, { filename: file });
}

const locales = sandbox.window.RM._LOCALES;
mkdirSync(outDir, { recursive: true });

let total = 0;
function countLeaves(node) {
  if (typeof node === 'string') return 1;
  if (!node || typeof node !== 'object') return 0;
  return Object.values(node).reduce((sum, value) => sum + countLeaves(value), 0);
}

for (const code of Object.keys(locales)) {
  const json = JSON.stringify(locales[code], null, 2);
  writeFileSync(join(outDir, `${code}.json`), `${json}\n`, 'utf8');
  const keys = countLeaves(locales[code]);
  total += keys;
  console.log(`wrote ${code}.json — ${keys} strings`);
}
console.log(`total ${total} strings across ${Object.keys(locales).length} locales`);
