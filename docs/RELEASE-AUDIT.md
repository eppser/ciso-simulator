# Release audit · 2026-09-07

## Coverage

- **395 automated tests** across simulation, movement, incidents, economics, scoring, controls, programs, accessibility/UI contracts, vehicle footprints, rendering assets, scenario validation and replay/security boundaries.
- **54 complete strategy runs**: three organizations × six pressure modifiers × neglect/competent/recovery strategies. No invariant failures. Neglect loses; the competent strategy survives all eighteen combinations. Two midcap recovery-only strategies lose, preserving a meaningful challenge.
- **108 pacing plans** across organizations, modifiers and source-volume variants. Later acts have higher pressure than the opening.
- **Three real-browser full-game runs** at the production fixed timestep: startup 7,805, midcap 6,236, enterprise 7,351. All reached midnight. These are automated QA policies, not a claim that first-time players will obtain these scores.
- The same three journals were submitted to the live staging verifier; **all server-calculated scores matched exactly**.
- Desktop and mobile scoreboard/layout checks; opening, purchases, placement, results and leaderboard navigation. Browser audit recorded no uncaught runtime errors.
- A real-browser opt-in form submission published a verified score, disabled repeat submission and appeared in run history. The temporary test entry was removed afterward.
- Native-GPU performance retest: about **60.2 FPS during live enterprise combat**, starting with 212 threats, at 1600×1000 on an Apple M4 Max. This is hardware-specific, not a universal frame-rate guarantee.
- Dependency audit: **zero reported vulnerabilities** after updating the development toolchain.

## Fixed during this pass

1. **Queued-patch validation:** an isolated asset could accept an unrelated vulnerability's delayed patch. Queuing now verifies the product, actual unpatched flaw and patch availability model first.
2. **Stale outside-scan marker:** a completed external scan updated findings but did not clear the outdated-scan flag. It now clears it.
3. **Dialogue/entity ID coupling:** randomly timed conversation consumed the same IDs as controls and threats. Messages now use a separate sequence, making run replays stable without making dialogue scripted.
4. **Post-outcome mutation:** player command recording rejects changes after the day ends, preserving the final result.
5. **Development dependency vulnerabilities:** updated the affected test/browser/build dependencies and lockfile.

## Live scoreboard checks

- RLS is enabled on score and private ticket tables.
- Public column reads succeed; private ticket references do not.
- Anonymous INSERT/UPDATE/DELETE and privileged RPC calls are rejected.
- Authenticated roles also lack write and private-RPC privileges.
- Direct Edge Function calls without the gateway secret return 403.
- Cross-origin writes, malformed filters, HTML in public fields and oversized bodies are rejected.
- Implausibly fast completions and invented 10,000-point scores are rejected.
- Real journals save once; duplicate submissions return conflict.
- Public responses contain only score, pseudonym, superskill, difficulty/scenario/rules and result metadata.

The positive write tests used newly created QA tickets. Their clocks alone were advanced to avoid waiting twenty minutes per fixture; the unmodified clock rejection was tested first. All temporary scores and QA tickets were removed afterward. No fake players are shipped.

## Limits

This is a broad release audit, not a proof that every possible bug is absent. Automated gameplay is not usability research. Frame rate depends on hardware; earlier native-GPU checks measured approximately 60 FPS at 1600×1000 on the development Mac, not every device.

There was no Unruly integration available in this environment. Hostile request, RLS and replay tests were run directly against the isolated staging game instead.

The scoreboard validates simulation outcomes, not human identity or human-only play. A capable bot may play a legal strategy. Public nicknames require moderation if abuse occurs; no claim of fully automated content moderation is made.
