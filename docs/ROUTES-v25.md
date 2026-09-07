# v25: affordable routing and fewer duplicate controls

## Firewall assessment

The old price was `scaled(4 + 2 × current segment count)`. Twenty Medium segments cost $458k after per-item rounding, more than the $300k starting budget. That discouraged the central tower-defense activity of experimenting with routes.

Segments now have a flat scaled price: Easy $3k, Medium $4k, Hard $6k. There is no count-based escalation. Remove segments immediately, independently of the tower-sale cooldown. Refunds are floored at 50% of the price actually paid, multiplied by remaining integrity. Repeated placement/removal always costs money; nearly destroyed walls provide no refund. The inspector shows the exact refund.

Wall strength stays at 180. Completely sealed routes remain breachable, valid credentials still bypass segmentation, and occupied/attacker-reserved tiles remain unavailable. Walls do not replace scanning, response, identity protection or backups.

## Focused simulation results

| Level | Route layout | Old cost | New cost | Walls only | Routes + response |
| --- | --- | --- | --- | --- | --- |
| Easy | 20 segments | $321k | $60k | Lost, hour 15 | Won, 7,836 |
| Medium | 20 segments | $458k | $80k | Lost, hour 7 | Won, 8,237 |
| Hard | 18 segments | $565k | $108k | Lost, hour 9 | Won, 8,452 |

These are scripted test strategies, not promised win rates. Hard has two occupied cells in the tested strip; placement correctly rejects them.

## Interface

- Removed the obsolete floating Operations Feed and its per-frame update. The combined Operations panel remains the sole event log, with Activity and linked threats/requests.
- Removed the leaderboard confirmation checkbox. Required username/motto validation remains, and a concise notice explains that clicking Add my score publishes them. A disabled-button guard prevents duplicate submissions while a request is pending or after success. Server validation and replay checks remain unchanged.

## Verification and release boundary

440 unit/regression tests, including exact replay on all three organizations after wall placement/removal; 54 broad campaign simulations, six routing simulations and 108 pacing checks. Local browser tests cover repeated wall removal, quoted prices, a single visible operations log, one-click submission without a checkbox, missing-field validation and duplicate suppression. Submission testing intercepted API calls; no player scores were written.

Pricing changes require ruleset v25. The matching `ciso-scoreboard-v25` verifier and frontend were deployed to staging and tested on September 7, 2026. v22, v23 and v24 verifiers remain frozen; configured gateway routes preserve their existing runs. Production publication uses the audited GitHub Actions pipeline.

Staging browser campaigns completed all three organizations with scores of 7,867, 6,677 and 7,983. The server replay matched each score exactly. Security tests rejected invented scores, impossible completion times, duplicate submissions, cross-origin requests, oversized bodies and malformed input. Both scoreboard and private-run tables have RLS enabled, and anonymous/authenticated roles lack write privileges. Direct access to all four verifier endpoints was denied.

A real browser submitted a valid score using the single-click form and confirmed its appearance on the combined board. All temporary QA scores and their test tickets were removed afterward. Separate browser checks covered NIST categories, organization selection, HUD alignment, mobile unsupported messaging, hidden-until-scanned exposure, recovery clicks, request links, flat wall pricing, rapid removal, required fields, duplicate prevention, scoreboard escaping and retry behavior. Seeded entries remain presentation-only and visibly identified; no fabricated player runs were stored.

Staging graphics profiling at 1600×1000 on an Apple M4 Max measured 60.2 FPS at opening, 60.2 FPS rendering 212 threats, and 60.0 FPS during live combat/pathfinding (95th-percentile frame time 16.8 ms). No JavaScript errors were recorded. These measurements apply to this device and viewport, not all hardware.
