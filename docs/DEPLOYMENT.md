# Run and deploy your own game

## Local play

Node 24 or newer:

```sh
npm ci
npm run dev
npm test
npm run build:release
```

Without a configured backend, the full game works in practice mode. Public scores require the gateway and verifier; do not bypass verification to make local scores rank.

## Separate Supabase database tables

Use your own Supabase project. Apply `server/migrations/001_scoreboard.sql` once through your migration system. It creates `public.ciso_game_scores` and the private `ciso_game_private` schema, explicit grants and RLS. Review them before applying. Existing site tables are not touched.

```sh
npm run build:api
supabase functions deploy ciso-scoreboard-v25 --project-ref YOUR_STAGING_PROJECT --use-api --no-verify-jwt
```

JWT gateway verification is disabled **only because** the function independently requires `GAME_GATEWAY_SECRET` on every request. Generate a strong random secret and set the same value as a Supabase function secret and a Cloudflare encrypted runtime variable. Never put it in Vite variables or the repository. Supabase provides its service key only to the Edge Function runtime.

## Cloudflare Pages

Change `GAME_EDGE_URL` in `wrangler.jsonc` to your project's function URL. Create a Pages project for your fork. Configure `GAME_GATEWAY_SECRET` as an encrypted runtime variable. Use the compiled `dist` output; `_worker.js` runs privately, not as a downloadable browser asset. `_routes.json` routes only `/api/*` through the gateway.

The release workflow runs tests, simulation audits, dependency checks and a credential scan before publishing from `main`. Set repository secrets `CLOUDFLARE_API_TOKEN` (Pages Write on the intended account) and `CLOUDFLARE_ACCOUNT_ID`. Change the project name and smoke-test URL in the workflow for your fork. Do not use a global account key in GitHub.

Production for the original project is `game.zerodayclock.com`; its dedicated scoreboard tables remain in ZDC2 staging by design. The standalone game repository does not change the private main-site repository or the older database.

## Ruleset upgrades

The frontend and verifier must use the same `RULESET`, fixed timestep and scenario. Test and deploy the verifier to staging before releasing matching frontend changes. Stored legacy runs remain intact; the simple scoreboard combines all organizations on the current scenario and rules.

Deploy changed simulation rules to a **versioned function**, not over the previous verifier. v25 uses `ciso-scoreboard-v25`; v24, v23 and the original v22 verifiers remain frozen. The gateway uses `GAME_V24_EDGE_URL` for v24, `GAME_V23_EDGE_URL` for v23 and `GAME_PREVIOUS_EDGE_URL` for v22 so already-open games can finish without losing score submission. All versions use the same protected tables; rankings remain separated by ruleset. Never route to a URL supplied by a player. Forks can omit the previous URL if they have no older runs.

## Security validation

`npm test` covers input boundaries and deterministic replay. `tools/release-browser.mjs` drives all three organizations in a real browser. `tools/scoreboard-security-audit.mjs` is restricted to the original staging host and uses temporary QA tickets; it requires an authorized Supabase management token and removes its own test scores. Do not run destructive fixtures against real players.

Monitor errors, abuse and capacity before promoting an experimental ruleset. See `SECURITY.md` for limitations and the data trust boundary.
