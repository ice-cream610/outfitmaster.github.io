# OutfitMaster development constraints

- Preserve the user's E1–E4 character design. The exact supplied reference is `public/reference/e/identity-sheet.png`. Do not replace it with an SVG drawing, generic mascot, realistic face, or a new character. Changing the identity requires an explicit user instruction to redesign E.
- Preserve the original square-round face, half-lidded eyes, tiny triangular nose, peach skin, chocolate-brown hair, compact volumetric limbs and approximately 3.5–4-head proportions. Clothes need realistic material, structure and texture.
- The active catalog must contain traceable real merchant products and real product photographs. Never substitute fictional items, redraws or mock API data for this requirement. Old studio/DummyJSON files are historical fixtures only.
- Keep original prices and currency, source URLs, descriptions, merchant categories, variants and capture timestamps. Clearly label CNY estimates. Unknown inventory quantities must stay unknown.
- An outfit image must match the complete product set and selected E variant. Missing images must be shown as missing/pending; do not display an unrelated reference or older look as successful try-on.
- Treat generated images as needing visual review. Passing functional tests does not establish character identity or garment fidelity.
- Keep prompts, intermediate data and execution traces inspectable for the user's learning. Explain material tradeoffs before replacing a core approach.
- Use local Git commits; do not push or publish without the user's instruction.
- The user-approved studio is the original `src/App.tsx` / `src/styles.css` design. The active adaptation in `src/curated/` must retain its three columns, two-column product cards, look shelf, history arrows, purchase bar, chat and appearance modal. Do not redesign these without a user request.
- Default to long straight hair with rectangular glasses. Appearance changes must preserve the selected clothes. Never put E1/E2 or reference-sheet labels inside displayed character assets.
- The active demo uses finite pre-generated looks. Offer only replacement combinations with an exact matching asset. Commerce product-card CTA goes directly to the AI studio; product photos and titles still open product details (user update 2026-10-21). Keep experimental arbitrary recommendation work separately accessible at `#agent-lab`.
- The separate `#wardrobe` tab recommends complete pre-rendered sets by explicit preferences. Its `#set/<id>` detail shows exact matching character images and purchasable pieces; selection changes only the shopping list. Preserve the individual-product entry in Discover. Purchases remain local simulations with SKU validation and a confirmation step.

- Maintain the GitHub-linked checkout at `D:/OutifitMaster/github-ready/outfit-master` (`ice-cream610/outfitmaster.github.io`) as the source of truth for subsequent edits; do not create separate delivery copies or apply browser-only changes. Commit changes here and sync to GitHub when requested.
