# Third-party notices

## EnglishMahjong-web and Autotable

The rendering in `apps/web/src/table3d/main-view.ts` derives from Bruce-pac/EnglishMahjong-web, fixed commit `6830301df3061cdd25350cf56807473e5505b311`:

- `src/table3d/main-view.ts`: actual Scene / mainGroup / viewGroup hierarchy, perspective camera configuration, four lights, viewport and disposal structure.
- `src/table3d/Table3D.tsx`: felt PlaneGeometry and four BoxGeometry wooden rim bars.
- `src/table3d/nameplate.ts`: table/rim dimensions and wood colors.

The upstream identifies Autotable as the origin of portions of its rendering structure. Both MIT texts are retained unchanged in `licenses/LICENSE-EnglishMahjong.txt` and `licenses/Autotable-COPYING.txt`. Detailed changes and asset boundaries are in `docs/UI-ADOPTION.md`. The reference snapshot remains unchanged in `handoff/references/englishmahjong/`.

No original GLB, character models, image atlas, audio, Draco binary, or bundled upstream font is shipped. Tiles are procedural rounded geometry; glyph textures are generated locally using the bundled font below (system sans-serif is only a loading/error fallback). The original screenshot is used only for source comparison in documentation, never as runtime graphics.

## Runtime dependencies

React / React DOM: MIT. Three.js: MIT (including RoundedBoxGeometry from the same installed release). Vite: MIT. Their license notices remain distributed with installed packages. No upstream account, dictionary, backend API, English game rules, or AI code is used.

## Noto Sans SC / Hanz Tile Sans

Noto Sans SC from the official [Google Fonts repository](https://github.com/google/fonts/tree/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc), pinned commit `a85815a42757630ce188fdad368c2dfc444d4773`. Copyright 2014–2021 Adobe, Reserved Font Name “Source”. Licensed under SIL Open Font License 1.1; full license and copyright are distributed in `apps/web/public/fonts/OFL-NotoSansSC.txt`.

Modified font renamed **Hanz Tile Sans**: variable font instantiated at weight 600, split into disjoint Unicode subsets, WOFF2 compressed. No independently redrawn glyph outlines. Manifest with upstream and output hashes: `apps/web/public/fonts/manifest.json`. Reproduction and coverage: `docs/TILE-FONT.md`. Font remains under OFL; this does not change the game code license.

## User-supplied background music

The six default recordings are deployment inputs supplied by the user in `BGM-背景音乐-麻将/`. Their originals and normalized audio are not distributed in this source repository, and no open-source license is asserted for them. The running authorized deployment serves them within game rooms; `scripts/import-music.ts` prepares the user-provided files. Player uploads are private runtime data. FFmpeg/ffprobe are external server tools, not redistributed binaries.
