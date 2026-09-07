# One leaderboard, three difficulties

The current board ranks the same daily scenario and v24 rules across Easy, Medium and Hard. Earlier scores remain in History with a legacy label; they are not retroactively converted without replay evidence.

Three measured categories remain: Business resilience (4,000), Defense effectiveness (3,000), Response & leadership (3,000). Purchases alone award nothing. Prevention and controlled exposure use weighted ratios; spend is relative to available resources; service uptime is weighted by business value. Detection, containment and recovery delays affect leadership.

For each category, let q be measured outcome quality from 0 to 1 and p be the completed fraction of the day. Points = round(category maximum × p × q^exponent).

| Difficulty | Exponent | 50% quality, full day |
| --- | --- | --- |
| Easy | 1 | 50.0% of available points |
| Medium | 0.85 | 55.5% |
| Hard | 0.75 | 59.5% |

This is a transparent game-design handicap for higher challenge, not an empirically estimated percentile or a promise of equal win rates. Zero quality and zero progress still score zero. Perfect play has the same 10,000 ceiling on every level. Better outcomes never lower a score. Client and server replay use the exact same function. The API never trusts a submitted total.

Programs use the six [NIST CSF 2.0 functions](https://www.nist.gov/cyberframework/faqs). Identify discovers assets and weaknesses; Detect finds active attacks. Identity controls belong under Protect. Actions is a contextual shortcut, not a seventh NIST function. Staffing remains in Team; incident retainers, drills, communications and evidence handling are under Respond.
