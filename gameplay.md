# CISO Simulator — gameplay plan (source of truth)

## Version 21.0 · 2026-09-06 · storm and wet-surface rendering

- New Blender v21 exports for all 20 asset classes: revised rain-coated materials and corner normals. Mesh bounds and articulated parts remain compatible; no collisions, gameplay schedules, spending or scoring changed.
- Fixed-quality animated perimeter cloud banks, pooled water reflections with wind/rain distortion, clear-coated asphalt, and 220 pooled rain-impact rings. Weather is visual only and remains outside the tactical map. IPS shots have luminous traces, impact sparks and local light; WAF has branching blue arcs.
- Thirty Blender renders paired with thirty in-game look-development captures, reviewed in five batches. Final parameters use candidate 30. These are material/lighting/weather comparisons, not 30 independent geometry rebuilds or a claim of photoreal parity with the reference.
- 375 tests and production build pass. Native Apple M4 Max / Metal at 1600×1000: opening 60.15 FPS, 212-source render fixture 60.14 FPS, live combat/pathfinding 59.99 FPS. Desktop/all-organization/mobile checks passed. Full evidence and limitations: [storm review](artifacts/storm-v21/REVIEW.md).

## Version 20.0 · 2026-09-06 · shared actions and escalating pressure

This revision supersedes conflicting schedules and audit results below.

- Programs → Actions is the shared directory for live Operations tasks, investigations, evidence, vendor offers, decisions and work. Both surfaces use the same action handlers, IDs, costs and engineer capacity. Target-specific remediation routes to Assets; construction/upgrade/sale routes to Build; staffing routes to Team. Navigation and session controls are not security programs.
- Queued/active change freezes now appear in the work ledger. Vendor offers appear in Operations as optional requests, with a link to the regular program. Programs and Operations refresh together after actions.
- Three acts: PREPARE (00:00–05:59), RESPOND (06:00–15:59), SIEGE (16:00–24:00). The first wave remains one source. Early source counts and HP are reduced; late counts rise, with two release packs on Easy/Standard and three on Enterprise during late surge/even-hour waves. Other waves provide breathing room.
- Unknown-device milestones: Easy 08/19, Standard 06/12/18/22, Enterprise 05/10/17/21, each with a seeded short delay. Workforce fraud starts at 08/07/06 respectively; insider misuse at 19/18/17; data leakage at 14/12/11. Social-engineering cadence also tightens later. Existing AI, supply-chain, zero-day and regulator milestones remain.
- Observation volume affects threat composition, not the wave-count envelope. Base combat toughness is bounded before difficulty/hour scaling. Raw observation data is unchanged. Authored hourly schedules are not inferred timestamps from daily aggregates.
- Verification: 351 tests; 54 bundled-day policy runs (34/36 managed wins, 0/18 neglect wins); 108 wave-plan checks and 18 additional full policy playthroughs across six input variants (18 wins). Desktop/mobile checks verify shared actions, target IDs, exact charges and capacity blockers. Automated policies do not establish human learning success or guarantee every input/state is recoverable. See [current audit](artifacts/actions-pacing-v20/REVIEW.md).

## Version 16.0 · 2026-09-06 · workforce risk and incident visibility

This revision supersedes conflicting historical requirements below.

- New remote-contractor alias Ben “On Mute” Carter: original imagegen portrait and 16 new ElevenLabs dialogue takes across the contractor, engineering, board, business and FBI liaison. Comedy targets identity fraud and corporate bureaucracy, not nationality. The scenarios are authored separately from Shadowserver observations.
- Remote-worker fraud starts at 07:00 on Easy, 05:00 otherwise. Insider misuse starts at 16:00 on Easy, 13:00 otherwise. One attempt of each per campaign. Active cases incur recurring cash loss and business impact. Offline infrastructure stops account activity without closing the investigation.
- Completed Staff training flags 50% of fraudulent hires and accelerates account detection; it retains its 65% social-engineering rejection mechanic. New Hiring verification requires training, costs a base $25k and takes 40 simulation seconds to activate; active verification prevents new fraudulent onboarding. It does not retroactively close an existing case. Identity, references and company-device custody are the preventive checks, not nationality.
- SIEM identifies a case after 8 simulation seconds, trained staff after 22, and the fallback access review after 45. No covert map location is shown before account identification. Admin lock reduces insider damage and cash loss by 70%.
- Detected account → free revocation → paid investigation. Revocation needs no engineer or budget and stops recurring loss immediately. Investigation costs a base $8k and takes 25 simulation seconds × job-speed multiplier, using one available engineer and evidence host. Interrupted work refunds once and returns to contained; cases close only on completed investigation. Repeated actions cannot farm score. Losses and incident response timestamps affect the existing three score categories.
- Attack log shows open incidents below event history, with active / contained / investigating tags, source, next action, cost and capacity blockers. The collapsed log button shows the open count. Map labels group confirmed incidents by building; ten pooled sprites with 5Hz state refresh bound rendering overhead. Resolved cases disappear. Unknown data leaks still require DLP, even when another incident reveals the building.
- The ? field guide now has short illustrated sections for starting, attack examples, incidents and people risk. ZeroDayClock.com retains only its red dot, without a badge border/background.
- Audit fix: ransomware now inventories each actually encrypted system; otherwise undiscovered assets were stuck in the Rebuild queue despite available money, backups and engineers. This does not reveal unrelated covert sources.
- Parallel audit: 54 full-day campaigns over all three organizations, all six modifiers of the bundled day and three policies. Active strategies won 35/36; neglect 0/18. Every organization/modifier pair had an observed winning policy. Exact coverage, automated-policy limitations and reproducible evidence: [audit](artifacts/super-audit/REVIEW.md).

## Version 15.0 · 2026-09-06 · cinematic asset and readability pass

- All 20 runtime mesh classes use the revised Blender v9 library. Prior source scenes and versions are preserved. IPS has lighter machined titanium, segmented ceramic panels, tapered barrels, rotary collars, fasteners and cooling hardware; aiming and recoil still use articulated head groups.
- Refined room-by-room illumination, rooftop equipment, metal/concrete/glass materials, car surfaces/windows/wheel detail and organic threat geometry. New imagegen IPS reference/icon and titanium surface are bundled; generated membrane texture is reused on Blender-authored biological threats.
- Night lighting lifts control silhouettes without removing the dark mood. Reflections vary with wet patches, render at 1024×768 and omit tactical overlays. Very faint GPU-instanced mist and protocol-number markers surround the platform without blocking routes or representing additional incident telemetry.
- Starting camera is closer: desktop distance 33 rather than 40; narrow-screen overview 88 rather than 110. Mouse guide is on the right below Operations Feed and above camera controls, with no background. No wave, timing, scoring, placement or incident mechanics changed.
- 170 tests, including 25 asset-contract checks. Desktop/mobile QA, production smoke and native GPU performance tests are recorded under artifacts/v9. Visual target is cinematic industrial realism; this is not a claim of Unreal rendering or photoreal parity with imagegen stills.

## Version 14.0 · 2026-09-06 · compact command, AI bosses and governance

This revision supersedes conflicting historical requirements below.

- Title: **CISO Simulator**, subtitle **Keep the company alive.** The direct name communicates the role and game genre more quickly than A Day as CISO; virality has not been measured. Large top-left title with a red ZeroDayClock.com brand button. Equal-sized opening brand slots, transparent mouse navigation, closer initial camera and a non-overlapping clock/time-left layout.
- Engineer capacity, active orders and score live in the header. Work ledger/hiring and regulator tasks open on demand. Team remains a management tab. Board trust starts at full 5/5 confidence on every level. Incidents and missed commitments can reduce it; evidence and effective briefings restore it, capped at five.
- Exactly two AI THREAT encounters at hours 8 and 20 in full-day plans. Radar removes a 40% damage shield; the underlying web/device payload retains WAF/IPS matching. These are authored gameplay encounters, not attributed Shadowserver observations.
- Regulator Helena Ward requests an asset register, recovery evidence and board risk attestation at hours 4, 12 and 18. Real prerequisites, engineer capacity, budget and 20-second board sign-off apply. Timely completion earns trust; late requests cost trust once and cannot farm rewards. Interrupted evidence jobs can be reassigned.
- Actual business impact is shown over affected buildings. Hits add a small integrity/criticality-weighted impact; ransomware's actual aggregate impact is allocated across affected buildings. Continuous downtime loss is throttled/aggregated. Labels are screen-sized and coalesced per asset, and transient effects clear on restart.
- Organic red viruses, green worms and AI membrane bodies use a built-in imagegen skin on instanced Three.js meshes; original Blender campus and security-control assets remain. New imagegen regulator portrait and seven generated ElevenLabs dialogue clips. Portraits remain stable, not lip-synced video.
- Previous operations improvements retained: critical-first asset sorting, house labels, slower 1× at 0.75 simulation seconds per real second, staffing upgrades, Head of Engineering calls and deployment/engineering ledger.
- Verification: 145 tests; production desktop/mobile smoke and targeted v14 UI checks; five full-day seeded simulations per organization (15 total), with unmodified budgets/health. Easy 5/5 wins, Standard 3/5, Expert 5/5 under rule-based policies. All 15 encounter both AI bosses and complete all three GRC tasks. This is not human playtesting or proof of monotonically increasing difficulty. Details, limitations and prompts: artifacts/v8/REVIEW.md.

## Version 12.0 · 2026-09-06 · outcome scoring and tower-defense key art

This revision supersedes conflicting historical score requirements below.

- Title remains A DAY AS CISO; subtitle is “But like Tower Defense.” New imagegen opening key art shows security controls firing at viruses, bugs and worms. The selected generated asset is bundled, with exact prompt at artifacts/v6/imagegen-prompt.json.
- Simplified player-facing cast wording and regenerated the two affected agency voice clips. No agency/data-provider endorsement is implied; the small opening note identifies satire and designed incidents.
- Scoring version 2 retains three categories totaling 10,000: Business resilience (4,000), Defense effectiveness (3,000), Response & leadership (3,000). No purchase-count bonuses or random jitter. Same scenario and choices remain deterministic.
- Resilience measures impact, critical-service-weighted uptime over the whole day and data loss. Defense measures relevant threats actually prevented and exposure controlled over time, adjusted for net spending/resources. Irrelevant internet noise does not farm points. Closing a flaw before arrival counts; simply having already-compromised targets does not.
- Leadership measures detection, containment and completed recovery delays, weighted by affected criticality. Unresolved incident milestones receive zero credit and remain in the average. Exposure control, timely reporting, trust and fatigue also contribute. Pre-deadline reporting is correctly labeled pending, not overdue.
- Live Score opens a non-pausing explanation snapshot. Final report/download includes measured evidence and incident timing records. Final scores lock at the terminal simulation step, preventing post-game sale/spend changes. Full formulas and causal-test cases: artifacts/v6/SCORING.md.
- 126 tests pass, including 13 scoring-specific regressions. Ten full-day real-budget simulations keep 8 wins/2 losses and produce 10 distinct scores from 1,621 to 8,486. Desktop/mobile QA and production smoke pass. No wave/budget balance change was needed.

## Version 11.0 · 2026-09-06 · clarity, coaching and repeatable character delivery

This revision supersedes conflicting historical requirements below.

- Opening removes the title byline, retaining support/data credits. Shadowserver uses original SVG paths with off-white dark-mode fills and no CSS background. Imagegen transparency attempt was rejected for painted checkerboard; see artifacts/v5/imagegen-prompt.json.
- Stable portraits have no zoom animation. Promotion spells out Chief Information Security Officer. Board starts at 5/5 confidence; clicking trust explains how to maintain or recover it.
- Right-click cancels selection/build mode; right-drag still orbits. Visible expandable mouse guide. Team is a separate fourth tab; the six program categories fit one line. Descriptions now match current effects, including responder limitations and Test ring prerequisites. Full audit: artifacts/v5/PROGRAM-AUDIT.md.
- Optional attack/damage log. Fixed High graphics; smaller building labels. Identified radar sources receive screen-sized category/payload/target labels, culled for overlap and capped at ten. Unlisted targets remain unnamed. Shape is not a control-resistance class.
- Social engineering: executive impersonation/help-desk attempts after hour 8 on Startup, 6 otherwise; every 60/40 seconds when the identity target is healthy and not quarantined. Staff training rejects 65%; then PAM/MFA/hardware checks apply. Successful stolen credentials move inside network defenses. This is authored gameplay, not Shadowserver-observed social-engineering data.
- Unaddressed data loss prompts source-discovery guidance after 25 seconds; detected/uncontained after 35; contained/not cleaning after 55. Persistent supply infections prompt cleanup guidance after 25 seconds. Spoken hints share a 65-second cooldown and disappear when no longer relevant; actionable cards select the right program/asset. Untraced leak location is never disclosed by hints.
- Every existing dialogue event has an alternate; new guidance and social-engineering lines also have two takes. 112 active generated voice clips, 114 files including retired vendor assets. Emotional v3 tags and per-event local rotation preserve context, captions and speech. Portraits are not claimed to be lip-synced video.
- Both poisoned updates and their local 10%-of-wave emissions verified. Existing control breaching and post-encryption external waves retained and tested.
- 113 tests plus browser/production checks. Ten full-day policy simulations: two first-look losses, two learning wins, six practiced wins; budget and health unmodified. No numerical Easy buff based on this evidence. Successful days finish in 997.3 simulation seconds. This does not guarantee human success after exactly three tries.
- Review, imagegen prompt, screenshots and hardware-specific approximately 60 FPS measurements: artifacts/v5/REVIEW.md. No new Blender mesh work in this UI/gameplay pass; prior authored assets retained.

## Version 10.0 · 2026-09-06 · live leadership, emergency selling, platform and viruses

This revision supersedes conflicting historical requirements below.

- **Title/start:** A DAY AS CISO, small “by ZeroDayClock.com”. One click on an organization card starts the day; no dropdown or second confirmation. Board promotion plays during the 45/30-second clean preparation period.
- **Credits:** ZeroDayClock support plus observation-data attribution to Shadowserver with its unmodified official logo. The game does not imply agency or data-provider endorsement.
- **Continuous time:** calls, help, menus, decisions, tab visibility and focus never freeze the simulation. Decisions are non-modal and minimizable; selecting an asset minimizes the decision so engineers remain assignable. Pending decisions no longer block building, purchases or response. Explicit Pause/Space remains. Background timers plus bounded fixed-step catch-up retain elapsed time after browser throttling. Terminal outcomes and graphics-context loss still stop safely.
- **Vendor:** only a major infection (one critical system or at least 15% of assets, minimum two) triggers sales. No clock-based pitching. One offer per continuous outbreak, minimum 240 seconds between offers. A rapid, ingratiating voice offers help without mentioning premium, regular price or equal rollout. The invoice is still exactly 150% of the standard program cost; regular Programs pricing remains discoverable. No fake rollout advantage. Offers last 100 simulation seconds.
- **Cast/outcomes:** FBI cyber liaison Dana Cole provides three satirical incident comments. Five emotional board-loss speeches rotate locally, once per new loss, with prominent portrait and caption in the end report. 50 active generated speech lines, two music beds, ten effects.
- **Enemy readability:** a pentagonal, spiked floating viral payload replaces the old virus-shaped beetle. At least a third of ordinary sufficiently populated waves use viral silhouettes; observed web payloads also use them. This presentation does not invent malware counts in the source dataset. Crawling bugs still represent exploitation attempts, worms internal movement. Web/device classification drives controls regardless of silhouette.
- **Boss:** BLACKOUT leads surges at 11:00, 17:00, 23:00; the late-siege duplicate remains. Distinct armored orbital silhouette and dedicated health HUD, doubled authored health, lower speed, decoy immunity and existing armor reduction against low-level IPS. Radar/payload guidance explains the counter.
- **World:** remove the surrounding neighborhood from rendering/loading while retaining its source files. A beveled, layered company platform with service vents and perimeter lighting replaces the plain slab. DMZ/public, Internal/business and Core/critical labels and lane seams clarify the zones; Help explains that crown jewels may exist outside Core. PBR finish/light improvements apply across the existing kit; new viruses use coated ruby capsids.
- **Verification:** 103 automated tests. Desktop/mobile start, background progression, manual pause, live decisions and purchases, all five ending rotations, agency/vendor call layouts, static 200-source and live-combat benchmarks. See artifacts/v4/qa and artifacts/v4/smoke. Measured around 60 FPS on the M4 Max at 1600×1000 High, not a universal device guarantee.
- **Art scope:** imagegen references and Blender MCP meshes were iterated in actual Three.js screenshots. “2× better” is not an objective measured result; the product remains a real-time diorama, not photoreal parity with generated concept art.

## Version 9.0 · 2026-09-06 · appointment, internal outbreaks and data loss

This revision supersedes conflicting v8/v7 text below. The title, organization-only
choice, four infrastructure zones, three left uplinks, dated input and three scores remain.

- **Opening:** a paused board appointment, not a live infection. Accepting starts
  45 seconds of preparation for Startup, 30 for other companies. Startup starts with
  $150k, two engineers, reduced early source counts, 25% less ordinary-source health,
  20% slower ordinary sources and 30% less landed exploit damage. Its first vendor
  patch is available at 02:00 (03:00 for the others). Later zero-day events remain.
  The full simulation still finishes in under 1,000 seconds, excluding player pauses.
- **Placement and facing:** all campus-grid edges are buildable except x=0, reserved
  for entry traffic. Out-of-grid paths do not exist. Free routes can skirt a barrier;
  sealing every route causes a breach. Current/next attacker tiles remain reserved.
  Cars overlapping a control are hidden; moving cars reappear after clearing it.
  IPS idles west; isolated firewall segments face west and connected runs align.
  WAF idles south. Aiming uses the authored GLTF +Z forward axis; creatures now move
  head-first. Credential animation follows actual displacement.
- **Control clarity:** all build cards show range, damage/slow/cooldown or integrity,
  with full hover explanations. IPS applies signature-based device bursts (web
  penalty, detection/age/throughput penalties retained). WAF continuously deals
  7 damage/s and 50% slow at level 1, web-only, rendered as sustained beams. Radar
  reveals exploit, category and target plus targeting lines; an IPS hit alone does
  not reveal full intelligence. Creatures are metaphors for attempts, not a claim
  that every network source is a virus. Internal malware uses worm-like propagation.
- **Supply chain:** an accepted poisoned update creates a persistent local malware
  source at its building. Each subsequent active wave emits ceil(10% of its source
  count), minimum one, spread over the wave. This is additional internal traffic,
  not a replacement for the three external uplinks. It uses network paths, can breach
  barriers and is blocked by EDR at its destination. Quarantine/IR/encryption pauses
  new emissions; completed incident response permanently clears the source. Existing
  emitted sources remain in flight. Generic lateral timers do not double-spawn it.
- **No patch:** explicit inspector guidance offers public-service shutdown (private
  operations retain 70% asset revenue), unplugging, matched IPS/WAF coverage, EDR and
  replacement where supported. Disabling service is reversible and does not remove
  the vulnerability. Emergency quarantine costs scaled $5k, immediately halts new
  spread/exfiltration and stops service revenue. Cleanup is still required.
- **Data loss:** an authored data-theft incident begins at/after 08:00, or 12:00 on
  Startup, on an available internal personal-data system. Before detection only an
  anonymous outbound stream is visible at the map edge. Programs → Detect → Data loss
  monitoring costs scaled $35k with a 20-second rollout, and uniquely traces the source.
  Radar/SIEM alone do not reveal it. Traced packets rise from the building. Quarantine
  stops data loss; a scaled $15k / 25-second engineering job removes the collector and
  rotates credentials. Monitoring alone does not stop it. Data loss adds business
  impact and can reduce trust, not a fourth score category. Units/rates are designed.
- **Unknown devices:** seeded random arrivals after hour 3 add up to two devices on
  Startup, four otherwise. They occupy free footprints and are completely absent
  from map/inventory until discovery. Discovery continuously sweeps every 8 seconds;
  nearby radar can also find them. The source model remains replaceable by dated JSON.
- **Leadership:** business, hacker and emotional board lines are expanded;
  peer CISO and opportunistic reseller join the cast. Startup receives contextual
  survival tips. Reseller offers expire after 100 simulation seconds and cost exactly
  150% of regular procurement, with identical capability/rollout. Both prices and a
  regular-procurement button are shown. No silent purchase or real-money transaction.
- **Visual feedback:** generated icons on every program and asset, trust pips, impact
  meter, sound/menu/navigation glyphs; amber identity wires, teal SIEM wires, verified
  backup rings, scanning rings, quarantine/supply markers and data packets. Crown-jewel
  outages have roof labels, red beacons/rings and a persistent incident summary.
  Critical alerts and the inspector have deliberate stacking; live buttons keep focus.
- **Media:** eight generated program-family icons cover all programs; new peer/vendor
  and welcoming-board portraits; an imagegen-led Blender context house is instanced
  around the campus. Exact prompts and review are in artifacts/v3. ElevenLabs now has
  41 spoken lines, two music beds and ten effects, no client credential. Good-quality
  talking video has not been verified; portraits remain honestly labelled rather than
  replaced with a low-quality facial animation. Photoreal imagegen parity is not claimed.
- **Verification:** 94 automated tests; real browser purchasing, placement, orientation,
  car clearance, hidden-device visibility, data-loss cleanup and vendor pricing checks.
  When all public systems are encrypted, incoming sources still follow paths and probe
  locked listeners without re-compromising them; quarantined systems are excluded.
  After actual encryption of 26 systems, browser simulation advanced into the next
  hour and recorded 30 external sources across all three entries. Native Metal GPU
  tests measure roughly 60 FPS at 1600×1000 High on this Mac; no cross-device guarantee.

Historical v8 decisions follow.

## Version 8.0 · 2026-09-06 · organization-only start, breach routing, incident clarity

These decisions supersede v7 and the older design below. The production name is
**A Day as CISO**. The only difficulty choice is the organization. One start button
begins the full 24-hour campaign (~22 minutes at 1×, excluding player pauses).
The six-hour first-shift option is no longer exposed. Daily JSON import remains
available for selecting another authorized input, not as another difficulty mode.

- Four infrastructure zones and all three left-side, three-row uplinks remain.
  Free-path flow fields are preferred. If no free route exists, a cached weighted
  breach field finds a route through controls, never through asset footprints.
  Firewalls have 180 integrity; towers have 120. Normal sources do 18 breach damage
  per second; bosses do 34. Destroyed controls disappear and free their tile, with
  no refund. Controls may seal a route, but doing so makes them attackable. Sources
  reserve both their current and next tile during placement. Sources without a
  target visibly withdraw. Credential movement still bypasses network segmentation.
- A persistent ransomware banner exposes the incident stages: foothold → encryption
  → recovery. The foothold countdown is 160 seconds. Removing the intruder before
  encryption cancels it; isolation limits spread but is not cleanup. Encrypted
  buildings black out and display an ENCRYPTED marker. Their revenue is offline.
  The playbook links to affected assets and distinguishes patching from decryption.
- Ransom decision **Rebuild** now queues every locked asset, ordered by revenue.
  Jobs dispatch as engineer capacity and budget become available. Backups are still
  required; the normal recovery price/timing and capacity rules remain. The banner
  shows locked, restoring and queued counts. Payment still takes 80 seconds and
  leaves the two highest-revenue locked systems needing recovery. No new score
  category: resilience, budget effectiveness and leadership still total 10,000.
- Seventeen individually generated reference images drive seventeen Blender MCP
  GLB classes: six building types, engineer, car, five network controls, EDR and
  three creatures. References are not presented as in-game screenshots. Art lives
  in public/concepts/v2; exact prompts live in artifacts/v2/imagegen-prompts.json.
  A separate generated graphite texture is applied to equipment/chitin. Blender
  sources live in tools/build-ciso-kit.py and public/models/v2. Preserved workshop
  suffixes are supported by the loader, including Three.js name sanitization.
- Three.js uses real recessed interiors, reflective curtain glazing, roof equipment,
  service-panel detail, HDR environment reflections, wet-ground mirrors, contact
  shadows, 4096px shadow maps, paved aprons, parking paint, leaf-card landscaping,
  articulated instanced legs/body segments, scanning control heads, recoil and
  engineer limb animation. EDR is a visible rooftop device, not only an inventory label.
  These are authored real-time approximations, not a claim of photoreal reference parity.
- ElevenLabs playback now includes 20 spoken lines, two one-minute music beds and
  ten effects. New effects: IPS discharge, WAF arc, decoy/EMP burst, claw impact,
  barrier destruction and encryption. A ten-voice Web Audio limit, per-effect rate
  limiting, stereo position and dialogue ducking prevent overwhelming combat audio.
  No provider request or API credential is needed in the player's browser.
- Validation adds sealed-route, obstacle destruction, mid-edge blockage, no-target
  withdrawal, slow recovery, crossing-tile reservation and multi-asset restoration
  regression tests. Browser verification includes native GPU rendering, live combat,
  asset detail views and ransomware recovery. Performance results are hardware-
  specific, not a promise of 60 FPS on every browser/device. Talking video remains
  blocked by the previously documented provider plan requirement.

- Live panel updates preserve button nodes and keyboard focus, instead of replacing
  whole panels every 200ms. Long engineer queues scroll within a bounded panel so
  they cannot cover Build. Calls stay until audio ends, with a 30-second fallback.

Historical v7 decisions follow for context.

Version 7.0 · 2026-09-06 · Night Shift implementation. Decisions below supersede conflicting v6.1 details; the remaining design is retained as the longer-term reference. History and rejected ideas:
`CHANGELOG-gameplay.md`. **Every agent that changes a rule, number, control, event, screen
or balance test updates this file in the same change and appends a line to the changelog.**
The production simulation is `src/sim/campaign.js`, extending the tested pathfinding and
combat engine in `game.js`. Runtime prices and timings live in `catalog.js` and
`campaign-rules.js`.

## Night Shift / implementation decisions (v7)

- Three.js campus; seven Blender-authored GLB kits; wet-ground reflections, glazing,
  rooftop equipment, shadows, traffic, rain, instanced viruses/beetles/worms and engineers
  travelling from Security Operations to assigned systems. Four zones and three separate
  left-side uplinks remain. Build / Assets / Programs replace the dense legacy HUD.
  SIEM is a Detect program; EDR is an asset action. Programs use seven short tabs,
  available from the start rather than act-gated.
- Startup is selected by default. Six-hour first shift (~4 minutes) or 24-hour full day
  (~22 minutes) are available immediately for any company, without an unlock grind.
  First-shift source counts are 70% of K-03; Scanner-day boss prevalence starts at 06:00.
  Hour 00 has one scheduled source plus the introductory contact. Simulation time stays
  below one hour; player pauses and decisions are unlimited.
- Click to inspect/deploy; drag to pan; right-drag to orbit; wheel to zoom; WASD pan;
  Q/E orbit; Space pause; Esc cancel; 1–5 build; 1×/2×/3× speeds. Early wave start skips
  prep with no cash bonus. Hidden tabs pause. High and Balanced rendering modes are explicit.
- Default observations are **2026-09-02**, not automatically yesterday. All 726 rows and
  107,025 attempts are retained. 7,431 is the sum of per-row distinct source counts,
  not a globally deduplicated total. Repeated CVEs on different products get distinct
  internal keys. Source sampling is weighted by row source counts; 62% of draws prefer
  estate-relevant rows, with authored campaign/modifier weighting. Persistence uses
  attempts/source. Timing, routes, initial exposure, zero-days, estate/cast
  and supply incidents are authored. This is not a literal replay, real source-IP
  display, attribution, live feed or risk forecast. Validated dated JSON can be imported.
- Capacity, timed engineer jobs, deployment lead times, EDR tuning overhead, alert noise,
  fatigue, shifts, response retainers and breaks are active. Reporting takes 20 seconds
  of engineer time without Comms. When everyone is busy, it queues, avoiding a paused
  dilemma deadlock. Forensics files when its engineer job completes.
- Active mechanics include patches, isolation, queued fixes, business reconnect,
  replacement, web/device controls, credential-vs-tool paths, password pushes from
  09:00, MFA/PAM, trust, backup-gated ransomware recovery, dwell, test rings, noon review,
  vendor leaks, change freeze and insurance reimbursement. The five dilemma families
  are crown-jewel response, board review, vendor access, fatigue and extortion.
  `Contain damage` always exits the ransom note without decrypting anything, allowing
  the player to fund backups instead of getting stuck.
- **Exactly three scores, maximum 10,000:** Business resilience (4,000), Budget
  effectiveness (3,000), Security leadership (3,000). All scale with shift progress.
  Efficiency uses impact and net spend after refunds; leadership uses trust, timely
  reporting and fatigue. Ranks: Breached (<3,000 or lost), Survived (3,000), Held the line
  (5,500), Ran a tight ship (7,500), Board-ready (9,000). Paying caps rank at Held the line.
  First-shift and full-day scores are labelled separately, not a common leaderboard.
  Three score cards, debrief, JSON download and clipboard summary replace the
  percentile/streak/backend/Legendary design. No fake rankings or telemetry.
- **Media:** 18 pre-generated ElevenLabs lines, two 60-second instrumental music beds,
  four generated effects, four AI portraits. Incoming calls animate portraits
  with captions, dismissal and sound controls. Talking video is **not shipped**:
  ElevenLabs Flows returned HTTP 402 `paid_plan_required` (Pro required). The video
  generator records the blocked request; no upgrade was purchased. Portrait motion is
  not generated video or lip-sync. The browser contains no API key; generation uses Keychain.
- **Deferred:** skins/ascension, server leaderboard, streaks, telemetry, exact
  audit-trail/Legendary gates, interactive false-alarm branch (a feed warning instead),
  service-account reset outage, second-breach-forensics trust penalty, articulated
  engineer animation/lip-sync, cloud deployment and automatic daily ingestion.
  Original K-27 exact balance envelopes are superseded by budget-limited production
  strategy survival tests for each company plus lifecycle and browser tests. This is
  an executable iteration, not a claim of human-validated CISO training or 10/10 balance.

The original v6.1 design below remains available for later iterations.

---

## Quick reference

**Units** (K-01): hour = 30 s wave + 10 s prep = 40 s; first prep 15 s; all durations in
seconds, rollouts in multiples of 40; early call skips the remaining prep only. Full day
≈ 16 min at 1x; speeds 1x/2x/3x.

**Companies** (K-02):

| | Difficulty | Budget | Income/h | Engineers | Base sources/h | Price scale |
|---|---|---|---|---|---|---|
| Nordlicht Labs (startup) | Easy | 110 | 20 | 1 | 13 | x0.7 |
| Halden Logistics (mid-cap) | Medium | 300 | 40 | 1 | 19 | x1.0 |
| Meridian Financial (enterprise) | Hard | 480 | 60 | 2 | 22 | x1.5 |

Prices and flat dollars scale by the last column; results below 20 round to 1, otherwise
to 5. Criticality `crit` is 1-3.

**Hour calendar** (K-03): at most two new pressures per hour; no surge in a campaign hour;
no dilemma opens in a surge hour except the ransom note; every pressure is warned an
hour ahead by Threat intel and 20 s ahead by the advisor (advisor hour-ahead lines need
Threat intel); the 06:00 handover names the morning; the 12:00 review names the
afternoon.

| h | src x | tough | new pressure |
|---|---|---|---|
| 00 | 0.45 | 1.00 | one source walking at the exploitable system; no fix for it until 09:00 |
| 01 | 0.50 | 1.00 | a source walks to a dark, unlisted shape (shadow IT) |
| 02 | 0.55 | 1.00 | a second product line targeted |
| 03 | 0.65 | 1.05 | scanner results reveal a second exploitable system |
| 04 | 0.70 | 1.05 | campaign preview |
| 05 | 0.80 | 1.10 | surge x1.4 |
| 06 | 0.85 | 1.15 | full shop; handover; zero-day #1 warned for 09 |
| 07 | 0.90 | 1.20 | false alarm (the previous shift's Outside view scan reads as an unknown source at the portal; fires for everyone) |
| 08 | 1.00 | 1.25 | campaign 08-10; office hours begin |
| 09 | 1.00 | 1.30 | zero-day #1 lands; password attacks begin |
| 10 | 1.05 | 1.35 | poisoned update #1 (warned at 06 and 09) |
| 11 | 1.10 | 1.40 | surge x1.4 |
| 12 | 1.10 | 1.45 | budget review; systems that applied zero-day #1's fix become exploitable again (the fix was incomplete) and sources re-declare targets |
| 13 | 1.20 | 1.50 | intel names the incomplete fix; second fix at 14:00; zero-day #2 warned for 15 |
| 14 | 1.25 | 1.55 | campaign 14-16; second fix for zero-day #1 |
| 15 | 1.30 | 1.60 | zero-day #2 |
| 16 | 1.40 | 1.70 | leaked vendor logins |
| 17 | 1.50 | 1.80 | surge x1.5 |
| 18 | 1.60 | 1.90 | office hours end |
| 19 | 1.70 | 2.00 | poisoned update #2 (warned at 18); Clean estate evaluated at the start of this prep |
| 20 | 1.80 | 2.10 | campaign 20-22 |
| 21 | 1.90 | 2.20 | persistent scanners double |
| 22 | 2.00 | 2.30 | negotiation leak deadline |
| 23 | 2.20 | 2.40 | final surge x1.5 (warned at 22) |

The tired-team dilemma is not on the calendar: it opens at the first eligible prep after
the tenth consecutive busy hour.

**Constants** (K-04 …):

| ID | Constant | Value |
|---|---|---|
| K-04 | Surge / campaign | sources x1.4 (Acts I-II) / x1.5 (III); campaign: that product's sources x2 (extras appended), toughness x1.3, three hours |
| K-05 | Zero-day | patch disabled until the fix lands 120 s after it appears; with Harden systems it lands 80 s later and the fix date is unchanged; #1's fix is incomplete and the second lands at 14:00 |
| K-06 | Poisoned update | 10:00 and 19:00 on the trusted system (K-20); with Test ring it runs 80 s on the ring system first |
| K-07 | Ransomware | dwell 160 s, visible only under Inside radar or a Guard agent; the ransomware-linked chip is shown on every system panel from the first scan, so the risk is telegraphed; ransom price 30% of the starting budget (33 / 90 / 144), never refunded; lock set = credential reach (R-LAT-3) minus systems whose Guard alert was cleaned within 40 s |
| K-08 | Noise | +1% per source reaching an exposed system, halves each hour, cap 25%; slows every job by that share as a rate; Inside radar x0.5; Radar tower −15% per level in range, cap −45%; Clean estate: turned-away sources add x0.5 |
| K-09 | Fatigue | busy hour = job-seconds ÷ (engineers x 40) ≥ 0.5, parallel jobs add; ten consecutive → every job +20% longer, fixes fail 10%, fast fixes 20% (appliances 40%); Third shift rotates at eight and resets the counter (fresh shift −10% for 80 s); Send them home resets after 160 s |
| K-10 | Tempo | +0.01 score per early call, max 1.05 |
| K-11 | Steering | +15% toughness on a product line per retarget (cap 2.0x), applied at spawn and to the retargeted source; turned-away sources still probe the nearest exposed system: noise plus wear damage at 30% of a normal hit (Clean estate halves the wear); sources persist across hours |
| K-12 | Audit finding | a source walking to a known-exploitable, unpatched, reachable system with nothing queued → −1 trust, once per act |
| K-13 | Unplug | ticket 5 / 8 / 12 by company, doubling each act, plus 10 s of engineer; minimum 40 s; EVERY system is reconnected by the business at 80 s unless a fix is queued, and a queued fix holds only 80 s past the start of office hours; unplugging the identity provider halves income, unplugging a trusted system stops the revenue of everything that depends on it |
| K-14 | Board trust | start 3 of 5; +1 briefing with less impact added than last act, filing early, good review; −1 crown-jewel compromise, Pay, audit finding, exploited while waiting for the window, Keep them on (at 24:00); Act I briefing: +1 if impact < 5; −2 a second compromise during a forensics hold; < 2 income −15%; ≥ 4 (evaluated before the −1 of the compromise that triggers it) releases 40 / 60 / 100 once, less any briefing spend; 5 gives a free programme ≤ 30 at 18:00 |
| K-15 | Budget review | impact < 15 → +20% income h13-23, trust +1; else Defend −15% or Concede −25% with trust +1 |
| K-16 | Insurance | 40 with Login check, Tested backups and Guard agents on every crown jewel at purchase, 70 otherwise; refunds 60% of clean and rebuild spend (never replace, never the ransom) above 10 / 20 / 30, paid at the start of the next hour; extortion excluded; scoring uses net spend |
| K-17 | Backups and spare site | no Tested backups: a locked system cannot be rebuilt; backups: rebuild 120 s; backups + Spare site: 60 s; backups halve ransomware impact; clean-ups x0.5 time |
| K-18 | Fast fix | x1.5 price, x0.4 time; fails 10% (appliances 20%); x2 under fatigue; x0.5 under Freeze changes (+40% duration; takes effect next hour, holds 120 s); a failed change leaves the system down and exploitable |
| K-19 | Towers | Decoy login re-arms 40 s (L2 wider), max 4, persistent scanners immune · IPS tower area damage in range, then total x (4/n)^0.7 beyond four in range, shown as "n in range: p%" · Radar tower L2 +25% IPS damage once per IPS, L3 shows the next target · Build wall 4 + 2 per wall owned · Sell 0.5 within 40 s of placement, 0.4 after, one sale per 40 s |
| K-20 | Trusted systems | update server, CI, hypervisor, vendor access: lateral 3x faster; Admin lock removes the 3x from vendor access and hypervisor; Test ring from update server and CI |
| K-21 | Regulator clock | starts at detection (R-DET-1): NIS2 early warning 24 h; DORA 4 h for the bank; scored at game end |
| K-22 | Clean estate | evaluated once at the start of the 19:00 prep: every exposed system patched, replaced, or unplugged with a fix queued → turned-away noise x0.5, income +10% h19-23, and for h ≥ 19 toughness = T19 + 0.5 x (table − T19) |
| K-23 | Objectives | $5k each (x price scale), six in Act I; kit items count |
| K-24 | Modifier of the day | one of six (R-VAR-1), drawn from the day's data |
| K-25 | Ascension | L1 no Threat intel; L2 +2 / 3 / 4 EOL systems; L3 budget and income −15%; L4 a zero-day at 00:00 and every 6 h; L5 all |
| K-26 | Dilemmas | at most one per 80 s; a blocked dilemma opens at the next eligible prep, and is dropped if its trigger has lapsed; the ransom note ignores both the spacing and the surge rule; one per family per act |
| K-27 | Balance envelope | doing nothing loses between hour 8 and 10 on Medium; boxes only ends Breached-to-Survived; patch only Survived-to-Held the line; the scripted competent plan averages impact < 22 over three seeds; a mutation that removes a mechanic must fail a test |
| K-28 | Daily seed | seed = the Shadowserver date as a number (20260902); #N = days since launch + 1; company = [startup, midcap, enterprise][floor(N / 7) mod 3] |

**Tune first, in playtest** (K-29): base sources (10-16 / 15-24 / 18-28) · throughput
exponent 0.7 (0.4-0.8) · startup income 20 (16-24) · zero-day window 120 s (80-160) ·
busy-hour threshold 0.5 (0.4-0.7) · steering +15% (10-25%) · ransom share 30% (20-40%).

---

## 1. Pillars and guardrails

- **R-PIL-1 Real day, real sources.** Every external source is a row of one real
  Shadowserver day. Data and design are always labelled. "Sources", never "attackers
  from X". No IP addresses drawn.
- **R-PIL-2 A CISO's day.** Every control is one a CISO can buy or decide, with its real
  cost shape (money, engineer time, downtime, politics, fatigue). Every compromise has
  real consequences.
- **R-PIL-3 Easy to start, brutal to master.** Minute one is fix-or-unplug; hour 20 is
  survivable only with a plan; every late pressure is telegraphed (K-03). Nothing is
  hidden that money could have bought.
- **R-PIL-4 Simple hands, deep head.** One click does one thing, in plain words. No
  probabilities the player cannot see: uncertain outcomes are certain and delayed. The
  only random rolls are seeded and shown as facts (which systems start exploitable).
- **R-PIL-5 Made to be shared.** Same day for everyone. One named CVE. "You beat 63%."
- **R-GRD-1** Vendors are named only with their real CVE and real source share; estates
  are labelled designed; no vendor ranking by game outcome. **R-GRD-2** Ransom "pay"
  carries its consequences and no glib copy. **R-GRD-3** Data licence checked before any
  vendor mode.

## 2. Acts and pressures

**R-ACT-1 Acts.** I First shift 00-05 (shop: Radar tower, IPS tower, Web shield, Build
wall; Fix it, Unplug it; Visibility, Threat intel, Identity) · II Pressure 06-15 (full
shop) · III Siege 16-23. Sources per hour = base (K-02) x hour multiplier (K-03) x
modifier, then campaign extras (K-04). First prep: a Radar tower pre-placed by "the
previous shift" and one source already walking at the one obviously exploitable system.

**R-SRC-1 External sources** (data): one per unique-IP share; toughness from attempts
per source. Web exploits are the Web shield's job, appliance exploits the IPS tower's.
This year's CVEs and persistent scanners mostly pass an IPS below level 3. The wave
preview says it plainly: "3 on your website, 2 on your VPN box".

**R-SRC-2 Declared targets.** Every source walks to a specific exposed, not-unplugged
system that runs its product and is still exploitable, nearest by path; the line is
drawn on the map (Radar tower L1). When a fix completes, or the target is unplugged or
compromised, the source retargets the next matching system (K-11): **patch order steers
traffic**. A source with no matching system left is **turned away**: it walks to the
nearest exposed system, adds noise and wear (K-11), and is counted on screen ("turned
away: 41"). A patched estate is a reduction, never immunity: the siege still needs towers.

**R-SRC-3 Persistent scanners** (data): the day's top attempts-per-source lines; immune
to decoys; mostly pass an IPS below level 3; double at 21:00.

**R-LAT-1 Lateral movement.** Every compromised system seeds it; trusted systems 3x
faster (K-20). Tool-based hops are spotted and stopped by a Guard agent on the target;
credential hops fail against Login check (80%; Hardware login check 95%) and Admin lock.
Credentials and trusted systems ignore walls.

**R-LAT-2 Password attacks** (from 09:00): stuffing and MFA-fatigue pushes at the
identity provider and remote access; Staff training makes pushes land 30% less.

**R-LAT-3 Credential map.** Every system holds a credential to one other (`credTo`, per
company, Section 3); the identity provider and the hypervisor hold credentials to
everything. "Reachable from" for the ransomware lock is a traversal of this map from
the compromised system, ignoring walls, not through guarded systems.

**R-EVT-1 Poisoned updates** (K-06): a malicious update lands on a trusted system with
no source walking there. With Test ring it runs 80 s on the ring system first and is
caught only if a Guard agent is on that system or Threat intel names the build;
otherwise it ships and detonates.

**R-EVT-2 Ransomware** (K-07): a crown-jewel compromise via a ransomware-linked CVE
starts the dwell. Where nothing covers the system, the ransom note is the first the
player hears. At zero, every system in the lock set is locked; encryption is instant.

**R-EVT-3 Leaked vendor logins** (16:00): a dilemma (Section 6).

**R-EVT-4 False alarm** (07:00): fires for everyone; Threat intel labels it; with Staff
training "Clean it" costs nothing; otherwise "Clean it" costs its normal time.

**R-EVT-5 Incomplete fix** (12:00): systems that applied zero-day #1's fix become
exploitable again and sources re-declare targets; intel names it at 13:00; the second
fix lands at 14:00. Applying fix #1 was still right: it held from 09:00 to 12:00.

**R-DET-1 Detection.** A compromise is detected on the first tick the player's state can
show it: coverage (Inside radar, a Guard agent, a Radar tower in range), a popup, or a
log line. Uncovered ransomware is detected at the note. The regulator clock (K-21)
starts at detection.

**R-VAR-1 Modifier of the day** (K-24): "Top campaign x2" · "Scanner day" (persistent
scanners are 30% of sources; decoys catch nothing) · "Web day" / "Appliance day" (the
Web shield or the IPS tower is the wrong buy) · "Botnet day" (fast, weak, numerous) ·
"Quiet morning" (Act I x0.7, Act III x1.15). Shown on the start card and the share card.

**R-VAR-2 Ascension** (K-25): difficulty only, unlocked by winning a company.

**R-VAR-3 Clean estate** (K-22): the earned late spike.

## 3. Companies (definitions the rules need)

| | Crown jewels (crit 3, internal) | Identity provider | Hypervisor | Vendor access edge | Test-ring system | Personal data |
|---|---|---|---|---|---|---|
| Startup | `db` | `idp` (new: "Workspace / Okta", internal, crit 3) | none | `ci` | `es` | `db`, `web`, `idp` |
| Mid-cap | `ad`, `erp`, `ot` | `ad` | none | `remote` | `monitor` | `ad`, `erp`, `mail`, `portal`, `files` |
| Enterprise | `ad`, `core`, `swift`, `sap` | `ad` | `vc` | `gp` | `siem` | `ad`, `core`, `bank`, `mail`, `sap` |

Trusted systems (K-20): startup `ci`; mid-cap `wsus`, `remote`; enterprise `wsus`-class
update path `vc`, `ci`-class `gp`. Appliances (`appliance: true`) cannot take a Guard
agent; for Legendary (R-RNK-2) an appliance crown jewel counts as guarded when patched
or not threatened. `credTo`: a per-company field; default rule when absent: the nearest
system one zone to the right. `revenue ≥ 3` is a revenue system; `crit 3 and revenue > 0`
is a critical revenue system (CAB). `personalData: true` marks the systems that start
the regulator clock.

## 4. Controls (one name per control; the button reads the label)

**R-TWR-1 Towers.** Radar tower 30 (L1 identifies and draws target lines; L2 25; L3 40)
· IPS tower 40 (L2 35: faster, wider; L3 60: no penalty on unidentified or this-year
sources) · Web shield 45 (slows and wears web exploits; L2 40 heavier) · Decoy login 20
(catches one in range; L2 20 wider) · Build wall 4 (+2 per wall owned; blocks a cell;
cannot cut every route from an uplink to an exposed system; can wall the internal
network). Behaviour in K-19.

**R-ACT-1 Per system** (price base, time in seconds). Fix it 6 + 6·crit (+8 appliance),
10 + 3·crit s (+5 appliance); office hours 08-18 add a 6 s approval on any change running
on a critical revenue system · Fix it fast (K-18) · Replace it 40 + 10·crit, 80 s offline,
EOL only · Unplug it (K-13; 10 s of engineer) · Clean it 8 + 4·crit, 16 + 3·crit s (Responders x0.5; Tested
backups x0.5 on a rebuild) · Clean and fix · Guard agent 8 + 4·crit, 8 s, not on appliances; each one costs 2% engineer speed (tuning); it stops tool-based hops, and a system it guards escapes a ransomware lock only if its alert is cleaned within 40 s.

**R-PRG-1 Programmes** (base price; rollout in seconds; effect; tradeoff):

| Track | Programme | Base | Rollout | Effect | Tradeoff |
|---|---|---|---|---|---|
| Visibility | Scanner | 35 | — | exploitability, one system per 4 s (rescan 2 s) | a one-off scan goes stale |
| | Keep scanning | 30 | — | rescans as things change | — |
| | Find everything | 25 | — | finds shadow IT | — |
| | Outside view | 40 | — | one shot, 30 s of engineer: every exposed exploitable system and exposed shadow IT | — |
| Intel | Threat intel | 10 | — | next hour in plain words; warnings an hour ahead; countdowns explained; names poisoned builds and the false alarm | — |
| Identity | Login check | 35 | 80 | 80% of password attacks and credential hops fail | buy before 09:00 |
| | Hardware login check | 25 | 40 | 95% | — |
| | Admin lock | 45 | 80 | credential hops fail; vendor access and hypervisor lose their 3x | — |
| Protect | Tested backups | 45 | 120 | K-17 | — |
| | Staff training | 15 | 40 | password pushes land 30% less; the false alarm costs nothing | — |
| | Test ring | 35 | 80 | R-EVT-1; update server and CI lose their 3x | that vendor's patches wait 80 s |
| | Harden systems | 35 | 80 | the next system that would become exploitable does not; zero-days land 80 s later (K-05) | — |
| Detect | Inside radar | 55 | 40 | lateral revealed on spawn; ransomware timers visible; Radar range +1; noise x0.5; Hunt available after 80 s up | engineer speed −5% |
| Team | Second shift | 60 | — | two jobs, 15% faster | — |
| | Third shift | 80 | — | three jobs, 30% faster; rotation (K-09) | — |
| | Responders on call | 35 | — | clean-ups half time and cost; Call the surge available | — |
| | Drill | 20 | 20 s engineer | first clean-up each hour 30% faster; Negotiate available | — |
| Recover | Spare site | 70 | 120 | K-17 | needs Tested backups |
| | Insurance | 40 / 70 | — | K-16; allows Pay | extortion excluded |
| Govern | Brief the board | 25, once per act | 20 s engineer | +1 trust per K-14 | — |
| | Comms and lawyers | 30 | — | filing costs no engineer time; disclosure trust loss halved; leak deadline +80 s; allows Pay | — |
| | Freeze changes | free toggle | next hour | K-18 | — |

**R-ECO-1 Economy.** Budget in $k; income per hour from operating systems, prorated by
seconds online; no bounties. One engineer has 960 s a day; demand at these durations is
about 55% (startup), 85% (mid-cap: the Second shift is near-mandatory and the estate rail
shows "1 of 1 busy"), 63% (enterprise with two). Money binds on Easy; engineer time binds
on Medium and Hard. Threat intel, Second shift and Drill are priced as tutorial buys on
purpose; nothing else may be dominant (K-29).

**R-ECO-2 Starting kits** (equal value by company; kit items count for objectives):
all worth 60 base: Detection (Threat intel + Decoy login + Radar tower L2 + 5 cash) ·
Patch (Scanner + Threat intel + 15 cash) · Team (Second shift; enterprise: Responders on
call + Drill + 5 cash).

## 5. HUD meters

Noise (K-08) · Fatigue (K-09) · Board trust (K-14) · Regulator clock (K-21) · Ransomware
timer (K-07, where covered) · Damage (impact, on screen from second one) · Cash · the hour
strip (no label; drawn) · "n in range: p%" on every IPS tower · "n of m busy" on the rail.

## 6. Dilemmas (five) and one event

**R-DIL-1** A dilemma pauses the game (tick is a no-op), shows one cause line (≤ 16
words), two or three buttons (≤ 3 words) each with its consequence (≤ 16 words), and
applies the choice. Spacing per K-26. Requirements on greyed buttons in brackets;
acronyms in a "?" tooltip.

**Crown jewel down** / <System> is compromised. The regulator clock is running.
- `File and rebuild` — 20 s of engineer (none with Comms and lawyers). Trust +1. Worst-case disclosure: damage +4.
- `Image, then file` — 40 s of engineer while they keep moving. Full insurance cover. Trust +1.
- `Contain and watch` [Inside radar or a Decoy login in range] — Files. Shows their next two targets. No trust change. Detonates at the next hour boundary unless cleaned.

**The CEO is calling** / <System> unplugged 40 s. Fix due <hh>:00. Sales has stopped.
- `Reconnect` — Online now. Still exploitable. Breaks the audit trail.
- `Hold the line` — Damage +2 now. Stays off until the fix lands (at most 80 s into office hours).
- `Half open` [web, office hours] — Half revenue behind a Web shield (free if one is in range). Web exploits still land, at half speed.

**The team is spent** / Ten busy hours. Every change is slower and fails more.
- `Send them home` — Half the engineers for 160 s (a one-engineer company: none), then fresh and fatigue reset.
- `Keep them on` — Everyone stays. Fatigue effects hold until midnight; no rotation; trust −1 at 24:00.
- `Call the surge` [Responders on call] — $60k. Fresh hands in 80 s; noise +30% meanwhile.

**Ransom note** / Everything reachable without a Guard agent or Tested backups is locked. Price <K-07>.
- `Pay` [Insurance or Comms and lawyers] — Back in 80 s; the two largest systems still need a rebuild. Reported. Trust −1. Rank capped at Held the line.
- `Rebuild` — 120 s; 60 with a Spare site. Impossible without Tested backups. Ends any negotiation.
- `Negotiate` [Drill] — 80 s, half price. Locked systems earn nothing meanwhile. They leak at 22:00 unless paid.

**Vendor logins leaked** / A vendor's remote login is public. The paste doesn't say which.
- `Reset every password` — Everyone logs in again: income −20% this hour; service accounts break 40 s.
- `Hunt with logs` [Inside radar up 80 s] — One engineer for 80 s. The account is found and closed.
- `Cut vendor access` — No outside support today: no fixes from that vendor, Replace it takes twice as long.

**Budget review** (event, 12:00) / Damage stands at <impact>. The board wants a number.
Under 15: no buttons — "Under budget. Income +20% until midnight, trust +1." Otherwise
`Defend the number` (income −15% for the day, trust unchanged) or `Concede` (income
−25%, trust +1). Either way: "Vendor logins leak at 16:00. Inside radar must be running by
14:00 to hunt it."

## 7. First run, onboarding, sharing

**R-ONB-1 Plain-language layer.** Every button, tower, programme, event and meter shows
its label (Section 4 names), a one-line tooltip in plain words, and the jargon in small
type. Tooltips: Radar tower "Names what is coming and draws where it goes." (NDR sensor)
· IPS tower "Stops known device attacks. New ones pass until level 3." (IPS) · Web shield
"Slows website attacks. Still fix the site." (WAF) · Decoy login "A fake login. Catches
one attacker, resets in 40 s." (honey token) · Build wall "Blocks the route. Not a stolen
admin login." (firewall segment) · Fix it "Brief reboot. Approval in office hours."
(patch) · Fix it fast "Under half the time. One in ten fails." (emergency patch) ·
Replace it "Too old to fix. Offline 80 s." (EOL) · Unplug it "Off the network. Business
reconnects at 80 s." (isolate) · Clean it "Remove the attacker. Long job." (respond) ·
Guard agent "Spots the attacker's tools on it. Not a stolen login." (EDR) · Inside radar
"Shows attackers moving inside. Halves noise." (SIEM) · Login check / Hardware login
check / Admin lock (MFA / phishing-resistant MFA / PAM) · Test ring "Updates run on one
spare system first." (vetting) · Drill (tabletop exercise) · Spare site (DR) · events:
Unlisted system (shadow IT) · New target · Focused attack (campaign) · Rush hour (surge)
· No fix yet (zero-day) · Password attacks · Poisoned update (supply chain) · Leaked
logins · Tired team · Leak deadline · Office hours (CAB) · False alarm.

**R-ONB-2 First run = first shift.** No company picker: "Yesterday, N real sources hit
the internet. Defend a small company for one shift." One button. Hours 00-05 (~4 min),
then the share screen. The full day and the company picker unlock after it.

**R-ONB-3 Objectives** (Act I; each names its button and the game pulses it; K-23):
unplug or fix the system they are already at (its panel shows Fix it / Unplug it) · buy
a Scanner (palette entry) · find the unlisted system (the dark shape a source walked to;
clicking it offers Find everything) · check whether that CVE has a fix (the panel row
"Fix available: yes / no / at hh:00") · place a Radar tower near an uplink (the uplinks
glow) · hold to 06:00 under five damage.

**R-ONB-4 Handover at 06:00**: three lines the game writes plus the morning's warnings:
"ERP unplugged, unpatched, fix due 09:00. Web shield in front of the portal. One unlisted
system found. Password attacks start at 09:00; a vendor update lands at 10:00."

**R-ONB-5 Advisor lines** (≤ 70 characters, imperative, spoken; hour-ahead lines only
with Threat intel): objectives — "Fix or unplug the system they're already at." · "Buy a
scanner. You can't fix what you can't see." · "Find the system nobody listed." · "Check
whether that CVE has a fix." · "Put a radar tower near an uplink." · "Hold to 06:00 under
five damage." Hour ahead — "Focused attack on <product> next hour. Fix that line first."
· "No fix for <CVE> next hour. Unplug or wall what runs it." · "Vendor update lands next
hour. Test ring, or trust it." · "Rush hour next. Don't start long jobs." · "Password
attacks start at 09:00. Login check must be live." · "Vendor logins leak at 16:00. Inside
radar by 14:00 to hunt." · "Team's near ten busy hours. Plan a rest." Countdowns —
"Regulator clock running. File early, or hold with a reason." · "Ransomware timer
running. Reach it before it reaches them." · "Leak deadline set. Pay by then, or the
regulator sees it." State — "Ten busy hours. Every change now slower, and fails more." ·
"Noise is up. Radar in range cuts it." · "Trust down. Under two dots, income drops." ·
"Trust at four. The emergency budget is yours, once." · "Damage under fifteen at noon
keeps the board paying." · "That source is your own scanner. Leave it." · "First fix was
incomplete. Second fix lands at 14:00." Handover — "Handover at 06:00. Three lines. Read
them, then buy." · "Fix for <system> lands at 09:00. Don't reconnect before." · "Zero-day
fix lands at <hh>:00. Queue it now."

**R-END-1 Death / end screen**: `Downed by <CVE> — <vendor product>, <hh>:00. <n> real
sources used it that day.` One counterfactual keyed to the missing control: Guard agent
"A guard agent on <system> would have held <k> more hours." · Login check "A login check
on <system> would have stopped that login." · backups "Tested backups would have cut the
lock to <k> hours." · patch "The fix for <CVE> landed at <hh>:00. It was never applied." ·
unplug "Unplugging <system> at <hh>:00 would have ended the walk there." · radar "A radar
tower at <cell> would have shown the move <k> hours earlier." · coverage "Nothing was
watching <system>. The ransom note was the first you heard." Then `You spent $<X>k on
tools and $<Y>k on people. Detected in <a> h, restored in <b> h.` and one maxim: "Patch
order steers traffic." · "Two small chokepoints beat one big one." · "A wall stops
packets, not passwords." · "Buy the login check before the first push." · "A backup you
haven't tested is a wish." · "The regulator's clock runs whether you file or not." ·
"Nothing watching means nothing warned."

**R-SHR-1 Share card** (text, copied on one click; image 1200x630 with the same content):
```
Defend The World #N · <date> · 🔥<streak>            (streak only when ≥ 2)
<Company>, <Medium>, <modifier> — you beat <p>% of players today
■■■■□□■■□□■✖ ✖■■■□□□■■■■■                             (thin space at noon)
<Rank>
Downed by <CVE> — <vendor product> at <hh>:00 · <n> real sources that day
<badge> · <badge>                                     (omitted when empty)
zerodayclock.com/play/N
```
Survivors: `Held to midnight. Worst hour <hh>:00 — <CVE>, <vendor product>.` Strip: ■
clean hour · □ a hit landed · ✖ a compromise. No raw score, no MTTD/MTTR on the card.
Image: wordmark and #N top-left, date and streak top-right; the percentile headline; the
strip full width with a tick at 12:00 and accent red on ✖ only; rank large with the
downed-by line beneath; badges left, URL right; "A game built on real scan data; the
score measures play, not any real organisation." URL scheme: `/play/N`, optional `?c=`.

**R-SHR-2 Daily.** The real yesterday (K-28), published after the honeypot pipeline; the
company rotates weekly. Streak = consecutive daily days played; a missed day can be
played late for 48 h and keeps the streak with no leaderboard entry. Daily global result
("71% of players fell to CVE-x today"; the percentile is within the day's company, so
companies never compete with each other) from one Supabase table `game_results(day, n,
seed, company, modifier, run_id, survived, downed_cve, downed_hour, impact, rank, score,
paid, badges text[], strip char(24), late bool, created_at)`, RLS insert-only for anon,
no select; a `daily_summary` view serves the percentile. "Your best" line per company.
The share screen says when tomorrow's day arrives.

**R-SHR-3 Badges** (dry, few): Clean day · Zero-day survivor · Never paid · Found
everything · Efficient (impact < 10 and net spend, after insurance refund, < 60% of
budget plus income). "Paid" is recorded and shown on the card only if the player opts in.

**Growth backlog** (not v1): vendor-estate mode and weekly vendor leaderboard (R-GRD-3
first); archive of famous days; site embed; company unlocks by rank.

## 8. Score and ranks

**R-RNK-1 Score** = (survival + health + defence + clean bonus) x company (1.0 / 1.3 /
1.6) x tempo (K-10). Survival = 3000 x hours ÷ 24 (1500 if lost); health = 3000 x (1 −
impact ÷ 100), 0 if lost; defence = min(1500, 4 x blocked + 6 x lateral blocked + 60 x
patched + 40 x restored); clean bonus 1500 for a won day with no compromise. Ranks by
score: Breached < 2000 ≤ Survived < 4500 ≤ Held the line < 7500 ≤ Ran a tight ship <
10500 ≤ Board-ready < 13500 ≤ Legendary.

**R-RNK-2 Audit trail.** Legendary also requires: no early call in Act III, no Pay, no
Reconnect while exploitable, and every crown jewel patched or guarded (appliances:
patched or not threatened) by 18:00. Pay caps the rank at Held the line.

## 9. UI rules

Start: one button on first run, company cards after (with the modifier of the day).
Play: palette left (revealed by act), objectives under it in Act I with the relevant
button pulsing, estate rail bottom, wave preview bottom-left in plain words, advisor
bottom-right, selection right with "Fix available: yes / no / at hh:00"; target lines on
the map; the meters of Section 5 in the top bar when active. Dilemmas: centred card,
paused, one cause line, big buttons with consequences, a "?" for acronyms. Everything
buyable shows cost, time and effect in one line. No modal dashboards.

## 10. Interfaces the sim exposes (names on `Game`)

`attacker.targetId · nextTargetId (Radar L3) · turnedAway · retargets` · `stats.turnedAway`
· `tower.readout = {inRange, pct}` · `countdowns()` → `[{id, kind: regulator | ransomware
| leak | reconnect | freeze, assetId, remaining, visible}]` · `pendingDilemma = {id,
family, cause, choices: [{id, label, consequence, enabled, requires}]}` with `choose(id,
choiceId)` and `paused` · `objectives()` → `[{id, text, button: {kind: asset | palette |
uplink, id}, done}]` · `handover()` (06:00) and `review()` (12:00) → `{lines, warnings,
choices?}` · `postmortem()` → `{downedBy: {cve, product, hour, sources}, counterfactual:
{key, text}, spendTools, spendPeople, detectedH, restoredH, maxim}` · `shareCard()` →
`{n, date, streak, company, difficulty, modifier, strip, rank, downedBy, badges, url}`
(percentile filled by the client from `daily_summary`) · `modifier = {id, label}` ·
`noise` · `fatigue = {busyHours, active}` · `trust` · `advisor` (queue of `{text, t}`) ·
`estate()` → `{busy, engineers}`.

## 11. Tests per build phase (five each; the last is the mutation)

1. **Clock and economy**: 24 hours x 40 s ± prep; early call skips prep and pays
   nothing; noise caps at 25% and halves hourly; ten busy hours → 20% slower change;
   *mutant*: noise factor removed → durations identical at noise 25%.
2. **Steering**: a completed fix retargets every walker to the nearest exploitable
   match; no match → `turnedAway` and integrity unchanged on arrival; an IPS with eight
   in range reads (4/8)^0.7; wall price = 4 + 2 x owned; *mutant*: steering multiplier
   removed → hp equal before and after a retarget.
3. **Calendar**: no surge in a campaign hour and ≤ 2 pressures per hour (walk the
   table); zero-day fix at +120 s, landing +80 s with hardening and the fix date
   unchanged; a poisoned update with Test ring runs 80 s on the ring system and
   detonates without a Guard agent or intel; Clean estate flips income +10%; *mutant*:
   scanner doubling at 21 removed → boss count equal at 20 and 21.
4. **Tracks**: Login check blocks 80% over 1,000 seeded pushes (±3%); Admin lock strips
   the 3x on vendor access only; insurance refunds 60% above the excess at game end and
   never the ransom; the freeze applies next hour and holds 120 s; *mutant*: the Admin
   lock check removed → hypervisor hop interval unchanged.
5. **Dilemmas**: tick advances nothing while paused; ≥ 80 s spacing except the ransom
   note; none opens in a surge hour; lock set = credential traversal minus guarded
   systems; dwell invisible without coverage until the note; *mutant*: coverage gate
   removed → `visible` true on an uncovered system.
6. **Onboarding and sharing**: six objectives each pay once, kit items count; the strip
   is 24 characters with ✖ only on compromise hours; Pay caps the rank; the seed from
   the date is stable; *mutant*: audit-trail check removed → Legendary reachable after
   Pay.
7. **Balance** (K-27) plus each of the seven knobs (K-29) moved to its range edges keeps
   the envelope; *mutant*: the existing IPS-damage-zero test.

## 12. Build plan

1. Clock and economy (K-01, K-02, R-ECO-1, per-action prices, sell, noise, fatigue,
   trust, review). 2. Steering (R-SRC-2, K-11, K-19, R-LAT-3, K-12). 3. Calendar (K-03 to
   K-06, R-EVT-*, R-SRC-3, K-22, K-24). 4. Tracks (R-PRG-1). 5. Dilemmas (Section 6, K-26,
   R-EVT-2, R-DET-1). 6. Onboarding and sharing (Section 7, R-RNK-*, K-28). 7. Balance
   (K-27, K-29, the exploit probes re-run). Each phase ships with its five tests and an
   update to this file and the changelog.

**Play risks to check first** (cheapest test): 40-s hours may be too fast to act in
(two cold reads with a click log; if more than 30% of hours see no action, tune before
phase 3) · the credential map plus a 160 s dwell may lock the whole estate from one hit
(a headless run over 20 seeds printing lock-set size; if the median exceeds 6, add a hop
cost) · Medium at 85% engineer demand may be unwinnable without a Second shift bought by
06:00 (a "patch-first, no shift" scripted plan must reach 09:00 with budget ≥ 60).
