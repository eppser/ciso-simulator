# v24 interface, voice and scoring audit

- HUD: shared icon size, metric grid, numeric baselines and status rhythm. Budget, impact, confidence, engineers and score remain interactive where appropriate. Reviewed rendered screenshots at 1600px; overlap assertions also pass at 1440, 1280 and 1100px.
- Start: no organization preselected or automatically focused. Clicking Easy, Medium or Hard starts that exact estate; opening and resuming the menu preserves it.
- Programs: NIST CSF function order and short descriptions distinguish Identify from Detect. Legacy internal category IDs are mapped without changing replay command IDs. Operations links use the same mapping. Staffing stays in Team; incident services move to Respond.
- Mobile: lightweight entry gate for Android, iPhone and iPad (including desktop-style iPad UA). No canvas, game instance, Three.js or GLB downloads on tested iPhone/iPad. The public scoreboard stays readable on mobile.
- Voices: ten different predefined ElevenLabs voice IDs. Regenerated 37 affected clips with voice-specific filenames. Cache validation now includes speaker voice identity, not just identical text. Active dialogue manifest entries are checked against the cast and actual file sizes.
- Scoring: transparent difficulty allowance, same three categories and 10,000 ceiling. Formula and limitations are in [scoring-v24.md](scoring-v24.md). History retains legacy values; current Top combines all organizations. No schema or RLS changes.

## Verification

423 tests across 27 test files; 54 simulation runs and 108 pacing plans. These include successful and losing policies; an audit pass does not mean every strategy wins.

Three complete staging browser runs survived midnight: Easy 7,867; Medium 6,677; Hard 7,983. Each exactly matched server replay. Score security checks rejected invented totals, duplicate submissions, impossible completion times, cross-origin requests, malformed input and oversized bodies. Default public board returned the three temporary verified scores together. Anonymous/authenticated write privileges remain denied. Real consent/form submission and history visibility passed. Only temporary QA scores/tickets were removed; player history was preserved.

Staging browser regressions also cover scanner secrecy, remove-intruder clicks, budget blockers, FBI request links, all six program functions and HTML-escaped public text. Versioned v24 verifier leaves v22/v23 verifiers frozen for existing tabs.
