# SceneScript Code Review — Detailed Fix Plan

## P0 — Build is broken & critical bugs

### 1. BUILD FAILS: unused imports in LeftBar.tsx
**File:** `src/components/LeftBar/LeftBar.tsx:3`
**Problem:** `SunIcon` and `MoonIcon` are imported but never used (only `AnimatedThemeIcon` is used). `tsc -b` fails with `TS6133`, so `npm run build` is broken.
**Fix:** Remove `SunIcon, MoonIcon` from the import list. Keep only `AnimatedThemeIcon`.

### 2. BUG: End "+" add-scene button leaves new card stuck at width 0
**File:** `src/components/Storyboard.tsx:344-350`
**Problem:** `handleAddScene` sets `setRevealingSceneId(preId)` but never clears it. Compare to `handleInsertSceneAfter` (line 388) which has `setTimeout(() => setRevealingSceneId(null), 1100)`. Without clearing, `isRevealing` stays `true` forever on the new card, and `width: isRevealing ? 0 : ...` keeps it invisible after the CSS animation ends.
**Fix:** Add `setTimeout(() => setRevealingSceneId(null), 1100);` after the `pushUndo` call in `handleAddScene`, matching `handleInsertSceneAfter`.

### 3. BUG: Toast memory leak — auto-dismissed toasts never removed from array
**File:** `src/stores/uiStore.ts:240-250`
**Problem:** `addToast` schedules `setTimeout(() => get().removeToast(id), duration)`. `removeToast` only sets `closing = true` (for the exit animation) but never calls `cleanupToast` to actually remove the toast from the `toasts` array. Only `ToastContainer.handleDismiss` (user click) calls `cleanupToast`. So auto-dismissed toasts stay in the array forever (invisible but accumulating), causing unbounded growth and stale entries.
**Fix:** In `addToast`, change the timeout to schedule cleanup after the exit animation:
```ts
const duration = toast.duration ?? 4000;
setTimeout(() => {
  get().removeToast(id);            // sets closing=true, triggers exit anim
  setTimeout(() => get().cleanupToast(id), 300);  // remove after anim
}, duration);
```

### 4. React 19 anti-pattern: refs mutated during render
**File:** `src/components/SceneCard/SceneCard.tsx:479-489` and `:1734`
**Problem:** The drag-velocity block reads/writes `prevDragX.current` and `smoothedVelocity.current` directly in the render body. The portal positioning at line 1734 reads `columnRef.current?.getBoundingClientRect()` during render. ESLint flags these as `react-hooks/refs` ("Cannot access refs during render"). In React 19 concurrent rendering this can produce inconsistent state.
**Fix:**
- Move the velocity-tracking block into a `useEffect` keyed on `[isDragging, transform]`. Compute `dragRotation` via state (`useState`) updated in the effect, or keep the ref writes but gate them behind a `useEffect`.
- For the portal positioning (line 1734), compute `cx`/`cy` inside a `useLayoutEffect` that runs after the dialog mounts, storing the position in state. Render the portal only after the position is measured (or use a default of 0/0 and update).

## P1 — Dark mode broken in modals

### 5. SettingsModal is fully hardcoded to light theme
**File:** `src/components/SettingsModal.tsx`
**Problem:** Uses hardcoded `background: 'white'` (line 102), `border: '0.5px solid #E6E6E6'` (lines 17, 100, 214), `color: 'rgba(0,0,0,0.4)'` (labelStyle, line 24), `color: '#7C7C7C'` (line 215), `borderTop: '0.5px solid rgba(0,0,0,0.08)'` (line 182), eye-toggle `color: 'rgba(0,0,0,0.3)'` (line 145). In dark mode this renders as a bright white box.
**Fix:** Replace all hardcoded colors with CSS variables:
- `background: 'white'` -> `background: 'var(--color-card-bg)'`
- `border: '0.5px solid #E6E6E6'` -> `border: '0.5px solid var(--color-border)'`
- `color: 'rgba(0,0,0,0.4)'` -> `color: 'var(--color-text-inverted)'`
- `color: '#7C7C7C'` -> `color: 'var(--color-text-inverted)'`
- `borderTop` -> `borderTop: '0.5px solid var(--color-border)'`
- Add `color: 'var(--color-text)'` to the modal container and inputs.

### 6. YTDescriptionModal is fully hardcoded to light theme
**File:** `src/components/YTDescriptionModal.tsx`
**Problem:** `sectionLabelStyle` (line 9-13): `color: 'rgba(0,0,0,0.4)'`. `sectionBoxStyle` (line 15-23): `background: 'rgba(0,0,0,0.03)'`, `color: '#333'`. Modal container (line 130-131): `border: '0.5px solid #E6E6E6'`, `background: 'white'`. `CopyBtn` (line 38): `background: 'white'`, `border: '0.5px solid #E6E6E6'`. Loading text (line 160): `color: 'rgba(0,0,0,0.4)'`. Error text (line 167): `color: '#d44'`. Retry button (line 173-175): light colors. Copy All button (line 261-262): `background: 'white'`. Tag chips (line 243): `background: 'rgba(0,0,0,0.06)'`.
**Fix:** Replace all with CSS variables (`var(--color-card-bg)`, `var(--color-border)`, `var(--color-text)`, `var(--color-text-inverted)`). For section box backgrounds use a dedicated variable or `rgba(128,128,128,0.08)`. Error red `#d44` can stay.

### 7. ApiKeyModal uses hardcoded Tailwind light classes
**File:** `src/components/ApiKeyModal.tsx`
**Problem:** `bg-white`, `text-black`, `text-black/50`, `placeholder-black/30`, `text-black/70`, `bg-black/5`, `text-black/40 hover:text-black/70`, `text-black/50 hover:text-black`, `bg-black/[0.02]`.
**Fix:** Replace `bg-white` with `bg-[var(--color-card-bg)]`, `text-black` with `text-[var(--color-text)]`, `text-black/50` with `text-[var(--color-text-inverted)]`, `bg-black/5` with `bg-[color-mix(in srgb, var(--color-border) 20%, transparent)]`, etc.

## P2 — Lint errors (37 total, build-blocking in CI)

### 8. Remove unused SceneCard props
**File:** `src/components/SceneCard/SceneCard.tsx`
**Problem:** Several props are aliased with `_` prefix and never used: `_onDeleteDraft`, `_onUpdateReferencesText`, `_onDeleteReference` (used at 1811 - fix naming), `_onUpdateDraftContent`, `_onSelectDraftVersion`, `_draftRef` (used), `_isReadingMode` (used), `_totalScenes` (used). Remove the truly unused ones and fix the naming of used ones.
**Fix:** For each underscore-prefixed prop, check if it's referenced. If referenced, remove underscore prefix. If truly unused, remove from interface and destructure, and remove from Storyboard.tsx prop passing.

### 9. `let` should be `const`
**File:** `src/components/SceneCard/SceneCard.tsx:437`
**Fix:** Change to `const nextLocalKeyRef = useRef(0);`

### 10. Remove `any` types
**Files:** `src/services/db.ts:90,111,371`, `src/services/generation.ts:85,132,422`, `vite.config.ts:47`
**Fix:** Use `unknown` with proper narrowing, or define specific error interfaces.

### 11. Unused `error` in catch blocks
**File:** `src/stores/scriptStore.ts:109,181`
**Fix:** Change to `catch {` (optional catch binding).

### 12. setState in effect (YTDescriptionModal)
**File:** `src/components/YTDescriptionModal.tsx:75-80`
**Fix:** Remove `setData(null)` from the effect and add it as the first line inside `generate()`.

## P3 — Dead code & architectural issues

### 13. Remove duplicate `generateYouTubeDescription`
**File:** `src/utils/sceneHelpers.ts:113-145`
**Fix:** Delete the function from `sceneHelpers.ts` (and `formatTimestamp` at line 147).

### 14. Remove unused `formatDuration` / `formatTotalDuration`
**File:** `src/utils/wordCount.ts:64-82`
**Fix:** Delete both functions.

### 15. Remove dead types from `types/index.ts`
**File:** `src/types/index.ts:91-101, 113-130`
**Fix:** Delete `GenerationMode`, `GenerationTarget`, `UIState`, `UndoableAction`, `APIKeyConfig`.

### 16. Remove stale `titleJP` and `emoji` fields
**Files:** `src/types/index.ts`, `src/stores/scriptStore.ts`, `src/services/db.ts`, `src/utils/seedData.ts`
**Fix:** Remove from Script type, createScript, validateScript defaults, seedData. Add DB schema v6 upgrade.

### 17. Global `*` transition is a performance hazard
**File:** `src/index.css:214-216`
**Fix:** Scope to only elements that actually change color.

### 18. Merge duplicate `*` selector blocks
**File:** `src/index.css:186-189` and `214-216`
**Fix:** Combine into one.

### 19. `validateScript` type guard has side effects
**File:** `src/services/db.ts:90-109`
**Fix:** Move default-field logic to upgrade functions, make type guard pure.

### 20. Unhandled promise rejections in scriptStore
**File:** `src/stores/scriptStore.ts`
**Fix:** Add `.catch(console.error)` to all unawaited `db.saveScene()` calls.

### 21. `saveToDb` is slow
**File:** `src/stores/scriptStore.ts:665-671`
**Fix:** Use `db.scripts.bulkPut` or `Promise.all`.

### 22. Per-keystroke IndexedDB writes
**File:** `src/stores/scriptStore.ts`
**Fix:** Add store-level debounced save, or document that callers must debounce.

### 23. Production LLM proxy missing
**File:** `vite.config.ts` / `src/services/generation.ts:38`
**Fix:** Show fallback error toast in production.

### 24. `checkSchemaVersion` destructively resets DB
**File:** `src/services/db.ts:148-154`
**Fix:** Auto-export data before clearing, or just warn.

### 25. API key partially logged to console
**File:** `src/services/generation.ts:91,93`
**Fix:** Remove keyHint from logs.

### 26-30. Minor items
- `buildScriptContext` O(n^2): replace with counter.
- Reasoning model detection: use more specific check.
- Duplicate `formatDuration`: consolidate.
- `corner-shape: squircle`: wrap in `@supports`.
- Inconsistent ID generation: standardize on `crypto.randomUUID()`.

## P4 — UX/consistency polish

### 31. ScriptSettingsModal backdrop click is dead code
**File:** `src/components/Sidebar/Sidebar.tsx:67-68`

### 32. Sidebar create-script has no undo
**File:** `src/components/Sidebar/Sidebar.tsx:342-348`

### 33. Slider drag creates multiple undo entries
**File:** `src/components/Storyboard.tsx:622-626`

### 34. Dark mode flash on initial load
**File:** `index.html`

### 35. Noise generation performance
**File:** `src/App.tsx:23-33,94-101`
