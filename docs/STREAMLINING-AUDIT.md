# v23 — Actions and Operations audit

## Player-facing changes

- Programs opens with Actions, a contextual priority list. Response actions also appear in their regular categories: Recover for infections/supply chain/ransomware, Detect for leakage, Protect for workforce cases, Govern for reports, freezes, regulator and FBI requests. Build and Team retain their dedicated controls.
- Operations is one ordered threats-and-requests feed plus Activity history. Clicking a row opens its action on the left. Completed/deferred FBI requests remain available under Govern. Work orders live in the existing top-bar engineering ledger, not a second Operations list.
- Building inspection is on the left on desktop, so the situation feed stays visible on the right. Recovery shows the actual price, engineer requirement and blocking reason. Available patches are included; unavailable patches are not advertised as included.
- Initial exposures remain real but unknown until inspected. No clean/unknown map badges; confirmed findings use compact name-and-count labels and footprint corners. Vendor, CVE, severity and remediation detail remain in the inspector.

## Simulation fixes

- Incident reporting no longer occupies an infected, encrypted or quarantined host and blocks its recovery.
- Engineer-led programs choose a healthy available host, rather than all competing for the identity system while other engineers sit idle.
- Interrupted outside scans, drills and briefings can be reassigned instead of remaining permanently Assigned. A new act cannot create overlapping briefings.
- Response and program purchases share their eligibility checks with the UI. Capacity, funds, prerequisites and existing jobs are enforced by the simulation, not just button styling.
- Repeated freeze requests cannot spam duplicate orders.

## Verification

- 411 unit/integration tests at release, including all three organizations' initial scanner secrecy and response eligibility, program dependency graph, shared action routing, interrupted work, replay and gateway boundaries.
- 54 full campaigns: 3 organizations × 6 pressure modifiers × 3 policies. No cash-ledger, invalid-state or termination warnings. Competent policy won 17/18; the midcap campaign-pressure run lost at 23:00. Recovery policy won 16/18; neglect lost all 18. Easy won all 12 active-policy runs. These are automated strategies, not a guarantee for every human playthrough.
- 108 pacing plans checked for increasing late-game pressure, including alternative observation counts.
- Real browser clicks on cleanup and FBI preparation across all three organizations; scanner secrecy, compact labels, categorized report/freeze cards, right-to-left links and mobile overflow checked. No JavaScript errors observed.
- Three complete browser-played staging games won: startup 7,867; midcap 6,251; enterprise 7,422. Server replay and submission tests verify the score, reject invented scores, duplicates, impossible completion times and cross-origin requests. Temporary QA rows are removed; existing player data is untouched.

## Deployment compatibility

v23 is a new simulation ruleset. Its versioned verifier uses the dedicated game tables in staging. The old v22 verifier is left unchanged; the gateway explicitly routes older open-game submissions there. Top rankings compare current rules; History retains earlier rules. No schema or RLS policy was weakened.
