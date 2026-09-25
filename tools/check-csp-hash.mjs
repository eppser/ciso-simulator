// The CSP in public/_headers pins a sha256 of the inline JSON-LD block in index.html.
//
// A hash that no longer matches does not throw, does not fail the build and does not
// show on the page: the browser silently refuses the block, the structured data
// disappears from Google and from every AI crawler that reads it, and the only trace is
// a console message nobody is looking at. So it is checked here instead.
//
// Run against the BUILT output, because that is what ships.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('dist/index.html', 'utf8');
const headers = readFileSync('dist/_headers', 'utf8');

const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!block) {
  console.error('check-csp-hash: no JSON-LD block in dist/index.html — structured data is gone');
  process.exit(1);
}
try {
  JSON.parse(block[1]);
} catch (e) {
  console.error('check-csp-hash: JSON-LD does not parse —', e.message);
  process.exit(1);
}

const want = createHash('sha256').update(block[1]).digest('base64');
const pinned = [...headers.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((m) => m[1]);

if (!pinned.includes(want)) {
  console.error(`check-csp-hash: CSP does not allow the JSON-LD block.
  expected in _headers : 'sha256-${want}'
  found                : ${pinned.map((p) => `'sha256-${p}'`).join(', ') || '(none)'}
  Fix: put the expected value in public/_headers script-src and rebuild.`);
  process.exit(1);
}
console.log(`check-csp-hash: JSON-LD (${block[1].length} bytes) is allowed by CSP — sha256-${want}`);
