# Third-party notices

## EnglishMahjong-web and Autotable

The rendering in `apps/web/src/table3d/main-view.ts` derives from Bruce-pac/EnglishMahjong-web, fixed commit `6830301df3061cdd25350cf56807473e5505b311`:

- `src/table3d/main-view.ts`: actual Scene / mainGroup / viewGroup hierarchy, perspective camera configuration, four lights, viewport and disposal structure.
- `src/table3d/Table3D.tsx`: felt PlaneGeometry and four BoxGeometry wooden rim bars.
- `src/table3d/nameplate.ts`: table/rim dimensions and wood colors.

The upstream identifies Autotable as the origin of portions of its rendering structure. Both MIT texts are retained unchanged in `licenses/LICENSE-EnglishMahjong.txt` and `licenses/Autotable-COPYING.txt`. Detailed changes and asset boundaries are in `docs/UI-ADOPTION.md`. The reference snapshot remains unchanged in `handoff/references/englishmahjong/`.

No original GLB, character models, image atlas, audio, Draco binary, or bundled upstream font is shipped. Tiles are procedural rounded geometry; glyph textures are generated locally using installed system Chinese fonts. The original screenshot is used only for source comparison in documentation, never as runtime graphics.

## Runtime dependencies

React / React DOM: MIT. Three.js: MIT (including RoundedBoxGeometry from the same installed release). Vite: MIT. Their license notices remain distributed with installed packages. No upstream account, dictionary, backend API, English game rules, or AI code is used.
