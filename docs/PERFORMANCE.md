# Runtime performance audit — 7 September 2026

This release reduces avoidable rendering work without reducing model detail,
resolution, shadows, reflection resolution, weather, post-processing or animation.
Simulation, difficulty, scoring and the **v25** verification rules are unchanged.

## Measured iterations

Same Mac, native-GPU Chrome, 1600 × 1000 CSS pixels at DPR 1. Each scene was
warmed up, then sampled for six seconds using Chrome's performance counters.
The opening and 200-threat fixtures are paused simulations with live rendering;
the separate storm test also exercises live combat and pathfinding.

| Iteration | Opening CPU ms/s | 200-threat CPU ms/s |
|---|---:|---:|
| Before | 538.5 | 802.0 |
| Separate reflection material state | 386.3 | 541.8 |
| Active buffers and render cadence | 331.2 | 515.4 |
| Per-pass synchronization and cleanup | **315.8** | **487.7** |

That is **41% less main-thread CPU time at the opening and 39% less in the
stress fixture**, not a claim about whole-device power or temperature.
Both final samples maintained approximately **60 FPS**. Mean render submission
time dropped from 8.49 to 4.77 ms and from 12.22 to 7.12 ms respectively.
Visible triangle counts were unchanged: 2,907,669 and 13,429,419.

## What changed

- The mirror camera has its own material state cache. This avoids repeatedly
  rebuilding Three.js light/program parameters between the main and reflection
  passes. Textures, visual values and compiled shader programs remain shared.
- Empty instance pools do not draw. GPU uploads cover active instances only;
  creature-part metadata is parsed once, and static parts skip identity math.
- Rendering targets 60 FPS even on 120–240 Hz displays. Fixed-step simulation
  remains independent of presentation. Hidden tabs skip rendering and discard
  offscreen transient effects, while the existing simulation timer continues.
- Sold/destroyed controls release their cloned materials. Rebuilt foliage releases
  instance buffers. Temporary environment-map resources are freed after baking.
  Shared model geometry and textures are not disposed with individual controls.

## Visual and lifetime checks

Frozen normal and incident scenes compare the cached and original reflection
paths **pixel-for-pixel**, with zero changed channels. All five creature types
also have exact matrix-comparison tests against the original animation math.

Eight consecutive restarts retained stable geometry/texture/program counts.
Post-GC heap stayed in a bounded 56.6–57.5 MB range in the final run. The cache
has a small memory cost: this is not a claim that every memory metric decreased.
The control-lifetime test repeatedly builds and removes controls, checks disposal
ownership, and verifies that hidden presentation stops while simulation advances.

## Release verification

- 455 automated tests; 54 campaign simulations; 108 pacing cases; six firewall
  economy simulations, with no audit failures.
- Staging native-GPU stress test: approximately 60 FPS at the opening, with 212
  threats, and during live combat/pathfinding (Apple M4 Max, same viewport).
- Three complete staging browser campaigns: 7,867 / 6,677 / 7,983 points for
  startup / midcap / enterprise, matching the prior v25 outcomes.
- All-level recovery/scanner/request links, HUD and difficulty selection,
  firewall building/removal, Operations, mobile fallback and scoreboard UI.
- Verified score submission and security checks: invalid/forged/duplicate runs,
  request boundaries, origin checks and restricted database write privileges.
  Temporary QA scores and their tickets were removed after testing.
- Production build, public-release credential scan and dependency audit passed.

## Reproduce

```sh
npm test
npm run dev
# In another terminal, with desktop Chrome installed:
AUDIT_LABEL=local node tools/runtime-audit.mjs
node tools/render-equivalence.mjs
node tools/runtime-lifecycle.mjs
node tools/storm-performance.mjs
```

Browser tools accept `GAME_TEST_URL` for a deployed build. They mock scoreboard
writes, save reports/screenshots under ignored `artifacts/`, and currently use
the macOS Chrome path. Run performance samples alone, without competing tests.
Compare revisions on the same hardware, browser, viewport and power settings.

This remains a detailed real-time 3D game. A busy GPU can still warm a laptop;
60 FPS and thermal behavior are not guaranteed on every device. No laptop
temperature or battery-power measurement was made in this audit.
