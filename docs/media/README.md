# Gameplay preview

The README GIF and MP4 show the real browser game: selecting an organization, placing firewall segments, deploying IPS/WAF/threat intelligence, buying a Scanner, and defending against normal campaign waves.

This is an edited, accelerated capture, not an uninterrupted playthrough. Preparation is condensed and there is a jump cut to hour eight. Captions are editorial overlays. Enemy counts, control fire, budgets, damage and placement behavior come from the game; they are not composited or invented. API calls are intercepted so recording cannot create ranked tickets or scores.

## Re-record

Run `npm run dev -- --port 5178`, install FFmpeg, and provide a Chrome executable if it is not in the default macOS location:

```sh
CHROME=/path/to/chrome GAME_TEST_URL=http://127.0.0.1:5178/ node tools/record-gameplay-preview.mjs
```

The recorder verifies successful mouse-click placements, a Scanner purchase, incoming threats and actual shooting before encoding. It writes a capture report and source frames to a new ignored `artifacts/github-demo-*` directory. Checked-in outputs are `gameplay.gif`, `gameplay.mp4` and the accompanying screenshots. Review the opening, building and combat portions before publishing.

The GIF is a compact, silent README preview. The higher-resolution MP4 is also silent. Neither is a benchmark; rendering performance is tested separately.

Still frames: [choose a company](choose-your-company.png) · [build defenses](build-defense.png) · [fund scanning](scan-exposure.png) · [live combat](campus-live.png).
