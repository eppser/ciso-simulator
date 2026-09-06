# Security

Please report vulnerabilities privately through this repository's **Security → Report a vulnerability**, not a public issue containing credentials or personal data.

## Scoreboard trust boundary

- The browser submits a command journal, not an authoritative score. A Supabase Edge Function replays the bundled scenario at the same fixed timestep and calculates the result.
- The public site talks to a same-origin Cloudflare gateway. Its shared secret and the database service key are never shipped to the browser. Direct Edge Function access is denied.
- `public.ciso_game_scores` has RLS enabled, explicit column-level public read grants, and no public INSERT, UPDATE or DELETE permission. Run tickets and hashed rate-limit identities live in an unexposed private schema with RLS.
- A ticket has a 24-hour lifetime, four verification attempts and one atomic publication. New tickets are limited to twenty per network identity per hour. The fastest supported play speed is enforced against server time.
- Commands, payload size, steps, text fields and pagination are bounded. No arbitrary engine methods, SQL, HTML or imported source datasets are accepted.
- Public names are pseudonyms, **not verified identities**. Replay verification prevents invented scores, not bots or automated strategies. There are no prizes or financial stakes.
- The leaderboard requires explicit publication consent. No email, real name or raw IP is stored in score rows. Rate-limit hashes expire with private tickets; expired ticket rows are pruned as new games start.

## Separate infrastructure

The game uses dedicated tables in ZDC2 staging. It does not migrate or write to the older TTS database or the main site's existing tables. The game repository's release workflow can deploy Cloudflare Pages but does not hold a Supabase management token.

Only trusted `main` runs deploy. Pull-request workflows have read-only permissions and no deployment secrets. Never use `pull_request_target` to execute contributor code with secrets.

## Limitations

No audit guarantees the absence of bugs. RLS is one layer, not an anti-spam system. Rate limits are network-based and may affect shared networks. Abusive public entries can be removed by the database administrator; report the entry ID privately. Do not publish personal, confidential or offensive information as your callsign or superskill.
