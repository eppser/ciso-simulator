// Event guidance stays contextual; only conversational timing uses a separate RNG.
export function tickBanter(game, random = Math.random) {
  const f = game.flags;
  f.banterSchedule ??= [
    [1, 'firsttip'], [3, 'businessplan'], [5, 'hackertaunt'], [7, 'peer'],
    [11, 'patchless'], [14, 'boardpressure'], [18, 'businesshope'], [21, 'hackerlate'],
  ].map(([hour, id]) => ({ hour: hour + random() * 2, id, said: false }));
  for (const item of f.banterSchedule) {
    if (item.said || game.hour < item.hour) continue;
    if (item.id === 'boardpressure' && game.trust > 3) continue;
    if (item.id === 'businesshope' && game.impact >= 40) continue;
    if (item.id === 'patchless' && ![...game.assets.values()].some(a => [...a.vulns].some(id => !game.vuln(id)?.patchable))) continue;
    item.said = true; game.say(item.id);
  }
  if (game.trust <= 1 && !f.successionSaid && !['won', 'lost'].includes(game.phase)) {
    f.successionSaid = true; game.say('succession');
  }
}
