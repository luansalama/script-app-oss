# Changelog — Fork from halfof8/script-app-oss → Present (Session #2)

## Session #1 — Dark Mode, Icons, Undo, Version Browser, Drag Handle (CSS Grid), Delete Animation, Horizontal Scroll, Locked Scenes, Toast, Film Grain, Modals, CSS Polish

### Dark Mode
- Added `darkMode` state to `uiStore` with `localStorage` persistence
- Dark mode toggle button in `LeftBar` with animated sun↔moon crossfade icon (CSS transform + opacity rotation, plus three stars beside moon)
- Dark mode class applied to `<html>` (not `<div>`) so portal-rendered content inherits correctly
- Dark mode flash prevention: inline `<script>` in `index.html` reads `localStorage` before React mounts
- CSS variables for all theme colors (`--color-card-bg`, `--color-text`, `--color-border`, `--color-accent`, etc.) with `var()` usage throughout
- Theme transitions on all color/background/border properties (0.5s ease)
- Light mode backgrounds changed to off-white (`#F5F4F0` / `#F3F2EE`)

### Icons — New system
- Full SVG icon library with animated path morphing (`MorphPath` component using CSS `d` property transitions)
- `DeleteIcon`: morphs from trash can to X shape on hover
- `DragIcon`: morphs across default / hover / pressed states (6-path grid icon)
- `GenerateIcon`: morphs from star to magic wand on hover
- `UnlockedIcon`: morphs padlock shape on hover
- `PenIcon`: 28×48 pen that bends/straightens on hover
- `InfoIcon`: morphs from dot-in-circle to pill shape, changes color on hover/active
- `AnimatedThemeIcon`: sun→moon crossfade with rotation and stars
- Other icons: `EditIcon`, `ApiKeyIcon`, `CloseIcon`, `MenuIcon`, `LockedIcon`, `ConfigIcon`, `Config50Icon`, `ImportMenuIcon`, `ExportMenuIcon`, `YouTubeDescIcon`, `NewSceneIcon`

### Undo System (Ctrl+Z)
- Global undo stack (`src/utils/undoHistory.ts`) — `pushUndo` / `popUndo` / `clearUndo`
- Captures before-state at call time for discrete actions (no per-keystroke)
- Undo for: scene add, scene delete (with reveal animation via `preId`), scene reorder, scene title edit, scene duration edit, draft changes, narration changes, references changes, on-screen text changes, script rename, script status toggle, script pace change
- `restoreScene` accepts optional `preId` for reveal animation on undo

### Version Browser
- Version browsing modal with arrow navigation and scrollable version list
- Scoped to one scene at a time (via `versionBrowsingSceneIds` array in `uiStore`)
- Dark mode arrows use `brightness(0) invert(1)`
- Delete icon in version browser uses `saturate(0.5) brightness(1.2)` in dark mode

### Drag Handle Redesign (CSS Grid)
- Replaced with 9×4 dot grid
- Radial opacity gradient: brighter at center, fading to edges and bottom
- Only top section visible on hover (CSS hover-only on `.scene-drag-handle`)

### Delete Animation
- Red curtain overlay animates left-to-right (0.55s), then column collapses right-to-left (0.4s) with `cubic-bezier(0.4, 0, 0.2, 1)`
- No more `deletePhase` state machine — pure CSS keyframes

### Horizontal Scroll
- Mouse wheel on storyboard scrolls horizontally; Shift+wheel scrolls vertically
- ArrowLeft/ArrowRight keyboard navigation for scene navigation

### Locked Scenes
- No overlay — just color change (white bg + yellow accent in light mode, dark bg + yellow accent in dark mode)
- Slider handle and timer number only turn yellow on hover of duration row, never in locked state
- Locked cards use `color: var(--color-card-text)` with reduced opacity for secondary elements

### Toast System
- Toast exit animation: slides down + fades out (CSS)
- `removeToast` sets `closing` flag → `cleanupToast` removes from array
- Toast icon mapping by type (success→check, error→X, info→i)

### Film Grain
- Perlin-like noise pattern regenerated at ~24fps via offscreen canvas
- Scoped to `.main-content::before` with wide width (9999px) for scrollable coverage
- CSS variables: `--noise-opacity: 0.16` (light) / `0.06` (dark), `--noise-blend: normal` (both)
- Module-level pre-allocated canvas + ImageData for performance

### Title Limit
- Script title max 10 characters (`TITLE_MAX_LENGTH = 10`)

### Modals — Dark mode compatibility
- `SettingsModal`: all hardcoded light colors → CSS variables
- `YTDescriptionModal`: all hardcoded light colors → CSS variables
- `ApiKeyModal`: Tailwind `bg-white/text-black` → CSS variable classes
- `Edit Script` modal: Japanese title (`titleJP`) field removed
- All close/X buttons styled with `.modal-close` class (red in both modes)

### CSS & UI Polish
- `user-select: none` on subheadings, counters, and checked items
- Visible borders on reference pills and add-reference button
- End "+" add-scene button uses `.add-scene-btn` class with dark mode CSS rule
- Version browser controls: `background: var(--color-card-bg)`, proper borders
- Modal backdrop click-to-close + Escape key on version browser
- Modal portal positioning uses `useLayoutEffect` for correct coordinates
- `isRevealing` state for scene insert/undo reveal animations
- `suppressWidthAnim` for reading mode (skips width animation for performance)

### Other Features (Session #1)
- Morphing SVG icon system with `d` property CSS transitions
- `add-scene-btn` class + dark mode CSS rule for the end "+" button
- Close on Escape key for `SettingsModal`, `YTDescriptionModal`, and version browser

---

## Session #2 — Drag Handle: CSS Grid → Canvas, Proximity Opacity

**Why:** CSS Grid dots suffered from sub-pixel rendering inconsistencies at non-100% zoom levels. Canvas rendering guarantees uniform appearance at all zoom levels.

### Canvas Rendering
- CSS Grid dot grid → `<canvas>` element with `devicePixelRatio`-aware scaling
- Dots: 2.5px radius, 3px gaps, 20 rows, dynamic column count based on card width
- Canvas `getContext('2d')` hoisted outside draw closure, called once
- `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` instead of `ctx.scale(dpr, dpr)` — **critical fix** prevents transform accumulation on repeated redraws
- `position: absolute; top: 2; left: 0; right: 0` spans full card width
- `pointer-events: none` to not interfere with dnd-kit drag listeners

### Redraw Triggers
- `ResizeObserver` on column-content div → recalculates columns and redraws on card resize
- `MutationObserver` on `document.documentElement` (`class` attribute) → redraws on dark/light mode toggle

### Color System
- `--color-dot` CSS variable: `#1a1a1a` (light) / `#cccccc` (dark)
- Read dynamically via `getComputedStyle(canvas).color` on each redraw

### Opacity Gradients (Canvas-side)
- Vertical: exponential falloff `0.9 × (1 − row/(rows−1))^5`
- Horizontal: center→edges `1 − 0.48 × |col−center|/center`
- Dots below 0.005 opacity skipped (`continue`)

### Proximity Opacity
- Replaced binary `dotsVisible` boolean with continuous `dotOpacity` (0–1) state
- On mouse move: calculates Euclidean distance from cursor to zone center `(cx, 25)` in normalized space
- `dx = (relX − cx) / (width/2)`, `dy = (relY − 25) / 125`
- `dist = √(dx² + dy²)` → `opacity = max(0, min(1, 1 − dist))`
- Threshold zone: `relY > -100 && relY < 150`
- CSS `transition: opacity 0.5s ease` smooths frame-to-frame changes

### Constants & Cleanup
- Extracted magic numbers to module-level constants: `DOT_SIZE`, `DOT_GAP`, `DOT_ROWS`, `ZONE_TOP`, `ZONE_BOT`, `ZONE_CY`, `ZONE_RY`
- `center = Math.floor(cols / 2)` hoisted outside inner loop
- Mouse handler uses named constants instead of inline literals

**Build Status:** `tsc -b && vite build` passes cleanly.
