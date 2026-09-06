import { describe, it, expect } from 'vitest';
import { quickGuide, GUIDE_TABS } from '../src/ui/quick-guide.js';

describe('short visual field guide', () => {
 it('makes board confidence an explicit opening objective', () => {
  expect(quickGuide(0)).toContain('board trust high');
  expect(quickGuide(0)).toContain('meet deadlines in Operations → Tasks');
 });
 it.each(GUIDE_TABS.map((_, i) => i))('page %i has three illustrated examples and navigation', page => {
  const html = quickGuide(page);
  expect(html.match(/class="guide-card"/g)).toHaveLength(3);
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toContain(`data-id="${page}" aria-current="page"`);
  expect(html).toContain('aria-label="Map controls"');
  expect(html).toContain('The day keeps running.');
  expect(html).toContain('aria-label="Close guide"');
 });
 it('explains non-damaging probes without promising zero business impact', () => {
  expect(quickGuide(1)).toContain('no integrity damage');
  expect(quickGuide(1)).toContain('small probe impact');
 });
 it('explains detection is not containment or recovery', () => {
  const html = quickGuide(2);
  expect(html).toContain('Quarantine egress, then remove the collector');
  expect(html).toContain('Waves keep coming');
  expect(html).toContain('until cleaned');
 });
 it('falls back safely for invalid sections', () => {
  for (const page of [-1, 4, NaN, '1']) expect(quickGuide(page)).toBe(quickGuide(0));
 });
});
