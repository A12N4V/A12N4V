# Plates

The profile artwork in `assets/a12n4v-*` is generated here. Each plate is drawn on a canvas in headless Chromium, dithered with an 8×8 Bayer matrix in the Homonin palette, and encoded to PNG or GIF by a small encoder in `engine.js`.

```sh
node tools/plates/render.js                   # all plates -> assets/
node tools/plates/render.js a12n4v-hero       # one plate
node tools/plates/render.js --preview         # key frame PNGs -> tools/plates/out/
node tools/plates/verify.js assets/a12n4v-systema.gif 0,30   # decode check
```

Source art is the fal.ai-generated plate library from a `homonin-landing` checkout. Set `HOMONIN_MEDIA` to point at it; the default is `../homonin-landing/apps/web/public/media`. Plate I reads `src/classical-systems-banner.jpg`. The renderer needs Playwright with Chromium, and the FreeSerif and Unifont fonts.

| Plate | File | Subject |
|---|---|---|
| I | `a12n4v-pantheon.png` | Athena, Hermes, Asclepius |
| II | `a12n4v-systema.gif` | Beer's Viable System Model, with Homonin as the hub |

Earlier plates (the hero, Peirce's signum, the organ atlas) are in git history.
