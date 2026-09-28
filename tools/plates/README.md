# Plates

The profile artwork in `assets/a12n4v-*` is generated here. Each plate is drawn on a canvas in headless Chromium, dithered with an 8×8 Bayer matrix in the Homonin palette, and encoded to PNG or GIF by a small encoder in `engine.js`.

```sh
node tools/plates/render.js                   # all plates -> assets/
node tools/plates/render.js a12n4v-hero       # one plate
node tools/plates/render.js --preview         # key frame PNGs -> tools/plates/out/
node tools/plates/verify.js assets/a12n4v-systema.gif 0,30   # decode check
```

Source art is the fal.ai-generated plate library from a `homonin-landing` checkout. Set `HOMONIN_MEDIA` to point at it; the default is `../homonin-landing/apps/web/public/media`. Plate I reads `src/classical-systems-banner.jpg`. Plate IV needs no source art. The renderer needs Playwright with Chromium, and the FreeSerif and Unifont fonts.

| Plate | File | Subject |
|---|---|---|
| I | `assets/a12n4v-pantheon.png` | Athena, Hermes, Asclepius |
| II | `assets/a12n4v-systema.gif` | Beer's Viable System Model, with Homonin as the hub |
| III | `assets/a12n4v-flvxvs.gif` | Data sources and formats flowing through Homonin, with feedback |
| IV | `output` branch: `a12n4v-pvlsvs.gif` | Live GitHub activity as an ECG and a dithered calendar |
| - | `assets/a12n4v-link-*.png` | Link buttons |

Glyphs are Homonin's 24×24 pixel icons, copied into `src/glyphs/`. A few more (the helm, the twin, X, mail, star, flame, people) are drawn in `plates.js` on the same grid.

## Plate IV is live

`.github/workflows/plugins.yml` runs every day and on every push to `main`. It:

1. generates the contribution snake,
2. runs `fetch-pulse.js`, which reads contributions, repos, stars, followers and languages through the GraphQL API with the workflow's `GITHUB_TOKEN`,
3. renders `a12n4v-pvlsvs` with Playwright,
4. pushes everything to the `output` branch.

If the render fails, the previous plate is kept. To render it locally with synthetic data:

```sh
node tools/plates/fetch-pulse.js --mock
node tools/plates/render.js a12n4v-pvlsvs --preview
```

Earlier plates (the hero, Peirce's signum, the organ atlas) are in git history.
