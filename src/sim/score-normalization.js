// A published game-design handicap, not a percentile or player-population rating.
// Apply to outcome quality BEFORE day progress so abandoning a harder run cannot
// turn the difficulty allowance into completion credit. Zero and perfect stay fixed.
export const DIFFICULTY={startup:{label:'Easy',exponent:1},midcap:{label:'Medium',exponent:.85},enterprise:{label:'Hard',exponent:.75}};
export function normalizedPoints(max,quality,progress,org){
 const unit=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
 return Math.round(max*unit(progress)*Math.pow(unit(quality),DIFFICULTY[org]?.exponent??1));
}
