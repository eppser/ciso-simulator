import { describe, expect, it } from 'vitest';
import { topPlayer, companyOverview } from '../src/ui/start-screen.js';

describe('start screen public top player', () => {
  it('selects the highest real score, never a seeded display entry', () => {
    expect(topPlayer({ rows: [
      { name: 'Seed', score: 9999, seeded: true },
      { name: 'Second', score: 7000 },
      { name: 'Leader', score: 8084 },
    ] })).toEqual({ name: 'Leader', score: 8084 });
  });
  it('rejects malformed scores rather than displaying them as verified', () => {
    expect(topPlayer({ rows: [null, { name: 'Bad', score: '9000' }, { name: 'Bad', score: 11000 }, { name: '', score: 1000 }] })).toBeNull();
  });
  it('keeps empty results distinct from an invalid server response', () => {
    expect(topPlayer({ rows: [] })).toBeNull();
    expect(() => topPlayer({ error: 'Unavailable' })).toThrow();
  });
});

import { Campaign } from '../src/sim/campaign.js';
import { ORGS } from '../src/sim/orgs.js';
import { BUILTIN_DAYS, scenarioModel } from '../src/sim/scenarios.js';

it('company previews match the playable campaign, including startup allowances', () => {
  const model = scenarioModel(BUILTIN_DAYS[0]);
  for (const org of Object.values(ORGS)) {
    const game = new Campaign({ org, model, seed: 20260902, difficulty: 1, mode: 'full' });
    expect(companyOverview(org)).toEqual({ budget: game.budget, systems: game.assets.size });
  }
});
