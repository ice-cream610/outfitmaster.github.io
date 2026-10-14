# OutfitMaster development constraints

- Preserve the user's E1–E4 character design. The exact supplied reference is `public/reference/e/identity-sheet.png`. Do not replace it with an SVG drawing, generic mascot, realistic face, or a new character. Changing the identity requires an explicit user instruction to redesign E.
- Preserve the original square-round face, half-lidded eyes, tiny triangular nose, peach skin, chocolate-brown hair, compact volumetric limbs and approximately 3.5–4-head proportions. Clothes need realistic material, structure and texture.
- The active catalog must contain traceable real merchant products and real product photographs. Never substitute fictional items, redraws or mock API data for this requirement. Old studio/DummyJSON files are historical fixtures only.
- Keep original prices and currency, source URLs, descriptions, merchant categories, variants and capture timestamps. Clearly label CNY estimates. Unknown inventory quantities must stay unknown.
- An outfit image must match the complete product set and selected E variant. Missing images must be shown as missing/pending; do not display an unrelated reference or older look as successful try-on.
- Treat generated images as needing visual review. Passing functional tests does not establish character identity or garment fidelity.
- Keep prompts, intermediate data and execution traces inspectable for the user's learning. Explain material tradeoffs before replacing a core approach.
- Use local Git commits; do not push or publish without the user's instruction.
