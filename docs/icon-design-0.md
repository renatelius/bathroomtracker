# BathroomTracker — Icon System Design Review & Proposals

**Doc:** `icon-design-0.md`
**Scope:** Critique of the current 30-icon set, 10–15 new icon proposals for a bowel-health tracker, a consolidated style guide, and a redesign/replacement list.
**Constraints honored:** 24×24 grid · stroke-based (line) · 1.8px default stroke · rounded caps/joins · color via `stroke` prop · react-native-svg 15.x.
**Note:** No SVG path code below — visual concepts only, so a designer/illustrator can execute them cleanly.

---

## 0. How to read the current system

The set is technically clean and coherent: one `<Svg viewBox="0 0 24 24">`, a shared `Icon` component that injects `stroke`, `strokeWidth`, and rounded line style onto every primitive, and a three-step weight scale (`thin 1.5 / regular 1.8 / bold 2.2`). The `fill` handling is the one oddity — a primitive is filled with `currentColor` only if it *already* carries a `fill` prop, otherwise `none`. In practice nothing in `PATHS` sets `fill`, so **the entire set is currently open-stroke, no true duotone/fill exists yet.** That matters for several proposals below.

---

## 1. Critique of the existing set

### What works well
- **Grid & weight discipline.** Everything lives on 24×24 with a single stroke weight. Visual rhythm across a tab bar or list is consistent — this is the hardest thing to get right and it's already right.
- **Rounded caps/joins everywhere.** Gives the set a soft, "health & wellness" feel appropriate to the domain (clinical but friendly).
- **Strong, unambiguous primitives.** `home`, `calendar`, `settings`, `profile`, `close`, `plus`, `check`, `arrowLeft/Right`, `lock`, `chart`, `clock` are textbook-legible and need no changes.
- **Good domain-specific thinking already present.** `drop` (hydration), `leaf` (GI/balance semantics), `flame` (streak), `energy` (calories), `trendUp/Down/equals` (interval trend) show the set was designed *for this app*, not generically borrowed.
- **`list` with leading dots** reads as "log/journal" nicely and is distinct from a plain bullet list.

### What is weak, confusing, or off-brand

| Icon | Problem | Severity |
|---|---|---|
| `chat` (speech cloud) | For a **medical/health** tracker, a generic chat bubble implies social messaging / support chat. If it's meant for "notes/symptom comments," it's the wrong metaphor. Reads as a community feature the app may not have. | High |
| `friends` (two silhouettes) | A solo bowel-health tracker rarely has a social graph. "Friends" implies sharing intimate health data with peers — semantically and *emotionally* wrong for this domain. If it exists to support "care circle / share with caregiver," the metaphor should change. | High |
| `forecast` (circle + tick + dot) | The metaphor is unclear at 24px — reads as a generic clock/gauge, not "prediction." A user cannot guess "forecast" from it. | Medium-High |
| `flame` has an inner detail path | The inner curve (`M12 16.5…`) adds a second stroke that muddies at small sizes; flame already reads from the outer shape. Optical clutter. | Medium |
| `food` (plate + two utensil curves) | The two identical curved strokes read as steam/whiskers rather than fork+knife. Ambiguous at small size. | Medium |
| `alarm` vs `clock` vs `history` | Three clock-face icons in one set. `alarm` (bells + hands), `clock` (face + hands), `history` (face + hands + winder tick) are easy to confuse in a list. Semantic overload of the circular-dial motif. | Medium |
| `globe` = "language" | Fine, but `globe` is also the universal "web/network" glyph; if the app ever adds web/export, this collides. Low risk today. | Low |
| `copy` | Standard and fine, but "copy to clipboard" is rarely a primary action in a health tracker — verify it's actually used. | Low |
| `cloud` (backup) vs future `download`/`export` | Bare cloud with no arrow is ambiguous between "sync," "backup," and "weather." Needs an arrow to disambiguate once export/download exist. | Medium |
| `settings` gear | The 8-tick gear is drawn as short radial dashes rather than a toothed ring — at 22px the ticks can look like a sun/sparkle. Slightly fragile optically. | Low-Medium |

**Cross-cutting issues**
1. **Three near-identical clock dials** (`alarm`, `clock`, `history`) — the biggest legibility risk in the set.
2. **Two social icons** (`chat`, `friends`) that fight the app's private/medical tone.
3. **No fill/duotone layer** despite the component supporting one — so "active/selected" tab states currently must rely on color alone. A duotone accent tier would strengthen state communication.
4. **Mixed optical sizing.** Some glyphs use r≈9 (`forecast`, `globe`) and fill the box edge-to-edge; others (`profile`, `check`) sit smaller inside. There's no explicit live-area rule yet, so weights *look* uneven even though stroke is uniform.

---

## 2. Proposal: new icons for a bowel-health tracker

Target set of **15** additions. Each is designed to sit on the same 24×24 / 1.8px / rounded system.

1. **symptom** (health flag / alert)
2. **medication** (pill + capsule)
3. **water** (glass with level) — distinct from existing `drop`
4. **exercise** (activity / motion)
5. **sleep** (moon + Zz)
6. **mood** (face scale)
7. **weight** (scale)
8. **doctor** (medical cross / stethoscope)
9. **share** (node share) — replaces the social `friends` use for "share with caregiver"
10. **notify** (bell)
11. **search** (magnifier)
12. **darkMode** (moon/half-disc)
13. **trash** (delete bin)
14. **edit** (pencil)
15. **dashboard** (grid)
16. **qr** (QR frame) *(bonus)*
17. **download** (tray + down arrow) *(bonus)*

*(16–17 included because they were named in the brief; trim to 15 by dropping whichever the app doesn't ship first — likely `qr`.)*

---

## 3. Visual concept per proposed icon

> Rules for all: single dominant metaphor, one focal shape, 2px minimum internal gap, no text, no more than ~3 strokes/subpaths, must be legible at 18px.

### 1. symptom
- **Metaphor:** a health *alert* — not an emoji of discomfort.
- **Shapes:** a rounded triangle or a rounded-square "note" with an exclamation stem + dot inside; alternatively a clipboard with a single alert line. Prefer the **rounded triangle + exclamation** — instantly reads "something to flag."
- **Avoid:** literal anatomy, a face grimacing, red-only meaning (color-blind users). Avoid reusing the plain circle used by `forecast`.

### 2. medication
- **Metaphor:** a pill.
- **Shapes:** a **capsule** (rounded rectangle split diagonally into two halves by one line) is the clearest single-glyph pill. Optionally a round tablet with a score line as an alt.
- **Avoid:** a pill *bottle* (reads as "container/supplement store"), and a mortar-and-pestle (reads "pharmacy brand," too detailed for 24px).

### 3. water (intake)
- **Metaphor:** a **glass with a fill line**, distinct from the existing teardrop `drop`.
- **Shapes:** a slightly tapered tumbler outline with one horizontal water-level line ~⅓ up. Reserve `drop` for hydration *quality/color*; use `water` for *intake volume*.
- **Avoid:** duplicating `drop`; a bottle (collides with `medication` alt); wavy multi-line "ocean" fills.

### 4. exercise
- **Metaphor:** movement / activity.
- **Shapes:** a **running figure** simplified to torso + two limb strokes, OR a heart with a pulse notch if "activity" is more about cardio. For a GI app, prefer the **running figure** (activity → motility association is a nice, subtle domain fit).
- **Avoid:** dumbbells (reads "gym/strength," off-tone for health tracking), a full detailed body.

### 5. sleep
- **Metaphor:** night rest.
- **Shapes:** a **crescent moon** with one or two small "Z" marks trailing off the upper right. Keep the crescent generous so it doesn't collide with `darkMode`.
- **Avoid:** a bed (too detailed at 24px), stars scattered (clutter). Differentiate from `darkMode` by the presence of the Z's — see §5.

### 6. mood
- **Metaphor:** a mood *rating*, not one fixed emotion.
- **Shapes:** a **circle face with a neutral mouth that curves** — draw it neutral (a short straight/gentle arc) so it reads "mood scale" rather than "happy." Two dot eyes + one mouth stroke.
- **Avoid:** a fixed grin or frown (biases the meaning), detailed eyebrows, multiple faces.

### 7. weight
- **Metaphor:** a body-weight scale.
- **Shapes:** a **rounded square platform** with a small dial arc/needle near the top edge, OR a circular dial with a single needle. Prefer the square-platform bathroom-scale silhouette — unambiguous.
- **Avoid:** a balance/justice scale (reads "legal/comparison"), a kitchen scale.

### 8. doctor (visit)
- **Metaphor:** clinical appointment.
- **Shapes:** a **stethoscope** (one continuous tubing curve + earpiece dots + chestpiece circle) is the friendliest; a **medical cross inside a rounded badge** is the simplest. Prefer the stethoscope for warmth; fall back to the cross-in-badge if the stethoscope gets muddy at 18px.
- **Avoid:** a red-plus alone (collides with `plus`), a hospital building, a doctor silhouette (collides with `profile`).

### 9. share (caregiver / export target)
- **Metaphor:** send data outward to a person you trust.
- **Shapes:** the **three-node share graph** (one node linked to two others by two line segments) — platform-neutral, reads "share/send."
- **Avoid:** the iOS "square + up-arrow" (platform-specific, will look wrong on Android), and the two-silhouette `friends` (see §5 — this icon should *replace* that use).

### 10. notify (bell)
- **Metaphor:** reminders/notifications.
- **Shapes:** a **bell** with a small clapper dot and a short shoulder line at the bottom. Keep it upright and symmetric.
- **Avoid:** duplicating `alarm` (which has a *clock face* inside bells). `notify` is a **plain bell, no dial** — that contrast is what disambiguates the two. Consider a small dot badge variant for "unread."

### 11. search
- **Metaphor:** magnifier.
- **Shapes:** a **circle lens + short diagonal handle** at lower-right. Textbook; keep the handle short so the lens stays large and legible.
- **Avoid:** filling the lens, adding sparkles, tilting differently from the rest of the set.

### 12. darkMode
- **Metaphor:** theme toggle.
- **Shapes:** a **crescent moon** (clean, no Z's) OR a **half-filled circle** (left half implied via a straight chord). Given the set has no fills yet, prefer the **crescent** and reserve fills for later. Must be visually distinct from `sleep`.
- **Avoid:** sun+moon combo (too busy), stars.

### 13. trash (delete)
- **Metaphor:** bin.
- **Shapes:** a **bin body (tapered rounded rectangle) + lid line + short handle tab**, with 1–2 vertical strokes inside optional. Keep it calm — destructive but not alarming.
- **Avoid:** an overflowing/detailed trash can, an X inside (that's "close," not "delete").

### 14. edit (pencil)
- **Metaphor:** edit/annotate.
- **Shapes:** a **pencil at 45°** — body + a distinct tip triangle + one eraser/ferrule line. The tip must read clearly or it looks like a generic bar.
- **Avoid:** a full pen with clip (too detailed), a pencil that parallels `arrowRight`'s diagonal so closely they confuse.

### 15. dashboard (grid)
- **Metaphor:** overview/home-of-data.
- **Shapes:** **2×2 rounded squares** with a slightly larger or offset cell to imply "widgets," not a plain window grid.
- **Avoid:** a 3×3 grid (reads "gallery/apps"), perfectly equal cells that look like a table.

### 16. qr (bonus)
- **Metaphor:** scan/pair.
- **Shapes:** a **rounded square frame** with 2 corner finder squares and a few module dots — *suggest* a QR, don't draw a real dense code (unreadable at 24px).
- **Avoid:** a literal scannable QR, a barcode.

### 17. download (bonus)
- **Metaphor:** save/export to device.
- **Shapes:** a **down arrow into a tray/underline** (arrow shaft + head pointing into a short baseline). Pair visually with a future `upload` (same tray, arrow reversed).
- **Avoid:** reusing bare `cloud` (add an arrow), reusing `arrowDown` alone (no destination = ambiguous).

---

## 4. Style guide

### 4.1 Grid & live area
- **Canvas:** 24×24. **Live area (draw within):** 20×20 centered → **2px padding on all sides**.
- **Extended live area** for a few glyphs that must feel the same visual size (e.g. `plus`, `close`, `check`): up to 22×22, i.e. 1px padding. Document per-icon exceptions rather than eyeballing.
- **Full-bleed circles** (`globe`, `forecast`) should cap at **r = 9** (diameter 18) so their *optical* mass matches rectangular icons that stop at 20px. Today some hit r=9 and some smaller shapes look lighter — standardize.

### 4.2 Line-weight hierarchy
- **regular = 1.8px** is the default and the baseline for tab bars, lists, inline.
- **thin = 1.5px** for dense/large decorative or ≥40px hero contexts where 1.8 looks heavy.
- **bold = 2.2px** for pressed/selected states or ≤18px where 1.8 disappears.
- **One weight per icon.** Never mix weights inside a single glyph. If a detail needs to recede, *remove* it (see `flame`), don't thin it.

### 4.3 Optical sizing rules
- **Rounded caps/joins on every stroke** (already enforced by the component — keep it).
- **Minimum internal gap: 2px** between parallel strokes so they don't merge at 18px.
- **Minimum stroke length: ~3px**; shorter marks (winders, ticks) should be dots or removed.
- **Corner radius language:** exterior corners of rounded rects use **rx 2–3**; keep radii consistent across the set (calendar uses 2.5, copy uses 2, lock uses 2.5 — settle on **2.5** as the house radius).
- **Alignment:** horizontal/vertical strokes snap to the pixel grid; only diagonals (`energy`, `check`, `edit`) are free.

### 4.4 Color & duotone semantics
The component supports a fill tier but nothing uses it. Introduce a **two-tier system**:
- **Tier 1 — Stroke (default):** `stroke = currentColor` (theme `textPrimary`/`textSecondary`). This is 95% of usage.
- **Tier 2 — Duotone accent (active/selected):** keep the stroke, add **one filled region** at low opacity in the brand color for the *selected* tab or a *positive* state. Use the brand gradient tokens (`brand.primary #2563EB → #38BDF8`).
- **Semantic color mapping (apply via `color` prop, never bake into paths):**
  - Positive / hydrated / on-track → brand blue `#2563EB`.
  - Caution / attention → amber (define `warning` token).
  - Negative / alert / delete-hover → red (define `danger` token) — but `trash` at rest stays neutral.
  - **Never rely on color alone** to distinguish meaning (accessibility) — shape must carry it.
- **Trend semantics** are already good: `trendDown` = interval shortening (often the *positive* direction here — decide app-side and color accordingly), `trendUp`, `equals`.

### 4.5 Consistency checklist (apply to every new icon)
- [ ] Fits 20×20 live area, 2px padding (documented exceptions only).
- [ ] Single 1.8px weight, rounded caps/joins.
- [ ] ≤3 subpaths; legible at 18px.
- [ ] No baked-in `fill` or color unless intentionally duotone.
- [ ] Metaphor distinct from every existing icon (esp. the clock-dial and bell families).
- [ ] House corner radius 2.5 for any rounded rect.

---

## 5. Existing icons to replace or redesign

| Icon | Action | Reason / Direction |
|---|---|---|
| `friends` | **Replace** with `share` (§9) | Social graph is wrong for a private medical tracker. If a "care circle" feature exists, use a share/send metaphor, not two silhouettes implying peers. |
| `chat` | **Replace or repurpose** | If it's "notes/comments," redesign to a **note/annotation** glyph (lined card + pencil) or fold into `edit`. If it's genuinely support chat, keep but make it clearly a *help* bubble (add a "?"). A bare speech cloud reads "social messaging." |
| `alarm` | **Redesign / merge** | Three clock-dial icons is one too many. Recommend: `notify` = plain bell (new), `alarm` = **bell + clock** only if a distinct "scheduled reminder" concept is needed; otherwise **retire `alarm`** and use `notify` + `clock`. |
| `forecast` | **Redesign** | Current glyph doesn't communicate "prediction." Direction: a **small chart/curve with a forward dot** or a **crystal-ball-free trend line ending in a dotted projection**. Must be guessable as "what's coming." |
| `flame` | **Simplify** | Drop the inner curl; the outer flame reads on its own. Removes optical clutter at small sizes. |
| `food` | **Redesign** | Make fork+knife explicit (two clearly different utensils flanking a plate) or switch to a **fork+spoon** pair. Current twin curves read as steam. |
| `cloud` | **Add arrow / disambiguate** | Bare cloud is ambiguous once `download`/`share` exist. Add a small up-arrow for "backup/sync." |
| `settings` | **Minor redesign** | Convert radial ticks into an actual **toothed gear ring** so it doesn't read as a sun/sparkle at 22px. |
| `history` | **Keep, but differentiate** | Once `clock`/`alarm` are rationalized, keep `history` = **clock + counter-clockwise arrow** (the classic "revert/past" glyph) so it's clearly time-travel, not just a clock. |
| `globe` | **Keep** | Fine for "language." Only revisit if a web/export feature later needs the globe. |

**Priority order for the redesign sprint:**
1. Resolve the **clock-dial trio** (`alarm`/`clock`/`history`) + add `notify`.
2. Replace the **social pair** (`friends`→`share`, `chat`→note/help).
3. Ship the **15 new icons** (§2).
4. Cleanup passes: `flame`, `food`, `forecast`, `cloud`, `settings`.
5. Introduce the **duotone active-state tier** and formalize the **live-area/padding rules**.

---

## Appendix — quick inventory map (existing 30)

Structural / nav: `home` `calendar` `list` `chart` `arrowLeft` `arrowRight` `plus` `check` `close` `profile` `settings`
Time family: `clock` `alarm` `history` *(⚠ overlap)*
Domain / health: `drop` `leaf` `energy` `flame` `food` `forecast` `trendUp` `trendDown` `equals`
Utility / system: `photo` `copy` `lock` `globe` `cloud`
Social *(⚠ off-tone)*: `chat` `friends`
