#!/usr/bin/env node
// Syntax and sanity checks for index.html. No dependencies. Run: node tools/check.js [path/to/index.html]
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const html = fs.readFileSync(file, 'utf8');
let bad = 0;
const ok = (name, cond, extra) => { if (cond) console.log('ok   ' + name); else { bad++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); } };

const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
ok('the file has inline scripts', scripts.length > 0);
scripts.forEach((code, i) => { try { new vm.Script(code, { filename: 'index.html#script' + i }); ok('script ' + i + ' parses (' + code.length + ' bytes)', true); } catch (e) { ok('script ' + i + ' parses', false, e.message); } });
ok('no external <script src>', !/<script[^>]*\bsrc=/.test(html));
ok('no stylesheet or font loaded from the network', !/<link[^>]*(href=["']https?:)/.test(html));
ok('no CDN references at start-up', !/cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare|googleapis\.com\/css|fonts\.gstatic/.test(html));
ok('APP_VERSION is set', /window\.APP_VERSION\s*=\s*'[^']+'/.test(html));
ok('a single <title>', (html.match(/<title>/g) || []).length === 1);
const count = (re) => (html.match(re) || []).length;
ok('<div> tags balance', count(/<div(?=[\s>])/g) === count(/<\/div>/g), count(/<div(?=[\s>])/g) + ' vs ' + count(/<\/div>/g));
ok('inline handlers only name modules that exist', (() => {
  const code = scripts.join('\n'), names = new Set([...html.matchAll(/on(?:click|change|input|keydown|keyup)=\\?["']\s*(?:[A-Za-z_]+\s*\([^)]*\);\s*)*([A-Z][A-Za-z0-9_]*)\./g)].map(m => m[1]));
  const missing = [...names].filter(n => !new RegExp('(window\\.' + n + '\\s*=|(?:const|let|var)\\s+' + n + '\\b)').test(code));
  if (missing.length) console.log('     missing: ' + missing.join(', '));
  return missing.length === 0;
})());
console.log(bad ? bad + ' check(s) failed' : 'all checks passed'); process.exit(bad ? 1 : 0);
