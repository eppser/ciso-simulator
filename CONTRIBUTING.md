# Make the next shift less survivable

Bug fixes, accessible controls, new threat stories and authorized data adapters are welcome.

1. Fork the project. Use Node 24+ and run `npm ci`.
2. Run `npm run dev`, then `npm test` and `npm run build:release`.
3. Add a regression test for changes to damage, money, scores, routing or recovery.
4. Keep the opening approachable. Escalate pressure later; every incident needs a playable response.
5. Never commit credentials, raw source IPs, customer logs or private datasets. Use the normalized JSON adapter.

Changing simulation rules requires a new `RULESET` in `src/scoreboard-config.js` and a matching server deployment. Old and new rules must not compete in one ranking.

The public leaderboard accepts only its bundled scenario. Custom imports remain local practice runs. Superskill is a public joke/tagline, never a password or personal detail.

Third-party trademarks and data are not relicensed by the code's MIT license; see `docs/ATTRIBUTION.md`.
