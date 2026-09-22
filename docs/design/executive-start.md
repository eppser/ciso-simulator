# Executive start page

The production opening screen uses the shared component in `src/ui/start-screen.js` and its scoped stylesheet. `src/start-main.js` mounts it immediately; the 3D runtime loads after the player chooses a company and takes the chair. `start-preview.html` shares the same implementation.

Cyan identifies the game title and primary action. Warm amber emphasizes board pressure; blue-gray supporting copy stays secondary. The backdrop is generated artwork inspired by actual gameplay. The Shadowserver SVG and ZeroDayClock wordmark render independently of that artwork.

The score card reads the real public scoreboard, excludes seeded entries, and handles loading, empty, and unavailable responses. Imported reports use the existing scenario validator and stay local and practice-only. The in-game company screen includes an explicit resume action and clarifies that starting a new shift replaces the current run. Keyboard focus, native radios, the help dialog, mobile guidance, and reduced-motion preferences are supported.

“Finally, a board meeting you’ll want to replay” is unattributed promotional copy, not a customer testimonial.

## Background provenance

Asset: `public/landing/executive-incident.png`. Generated with built-in imagegen from the approved executive mockup. Prompt:

> Edit the reference into a production website BACKGROUND ART asset, landscape 16:10. Keep the same photorealistic middle-aged male security executive, office and actual game campus / Operations monitors. Remove ALL website overlay UI: no title, no navigation, no company selector, no CTA, no quotes, no logos, no footer. Only a cinematic incident-room photograph/artwork remains. The man is a bit more stressed than before: deeper furrowed brow, tense jaw, slightly rumpled shirt, loosened tie, slight sweat at temples, leaning harder forward with both hands working at the desk, believable and competent, not exaggerated or screaming. Place man at center-right around 62% across, monitors on far right showing same recognizable dark isometric game campus and Operations incidents. LEFT 43% of the image must be empty dark navy / almost black architectural shadow with no person, no objects, no text, suitable for live HTML overlay. Keep his head within upper 15%-55% height and hands around 65% height. Bottom 20% fades naturally into dark desk shadows so live UI can overlay. Cinematic cool blue screen glow with subtle warm desk lamp, realistic lighting, crisp skin and monitor details. No motivational slogans. No floating text. This is the image asset only, not a screenshot of a website.

## Validation

459 tests; production build; simulation, pacing, firewall-economy, public-release, and dependency audits. Browser checks cover initial selection and launch, return-to-company-selection, native help/Escape, resuming without losing a paused run, live scores, report validation/import, and responsive layout. No scoring or simulation rules changed.
