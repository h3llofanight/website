# macOS Desktop Personal Website — Implementation Plan

## Context

Building a personal website that looks like a macOS desktop. Content is managed via Pages CMS (markdown files in `docs/`), built with Astro, and deployed to GitHub Pages via GitHub Actions. The site renders content as files and folders on a desktop — users navigate by opening Finder-like windows, clicking folders, and viewing different content types (markdown text, images, GIFs, embedded Vimeo videos).

Currently the repo has only `.pages.yml` and one test markdown file. Everything else needs to be scaffolded.

---

## 1. Framework & Tooling

**Astro** (static mode, zero JS by default, vanilla JS for interactivity)

- Native markdown content collections via `glob()` loader pointing at `docs/`
- Official GitHub Actions deploy action (`withastro/action@v6`)
- Client-side interactivity via `<script>` tags — no React/Vue/Angular/Svelte

---

## 2. Content Model

### Pages CMS schema (`.pages.yml` update)

Expand the current schema to support different content types and folder hierarchy:

```yaml
media: media
content:
  - name: pages
    label: Pages
    type: collection
    path: docs
    fields:
      - name: title
        type: string
      - name: type
        label: Content Type
        type: select
        options:
          - text
          - image
          - video
          - folder
      - name: folder
        label: Folder
        type: string
        description: "Parent folder path (e.g. 'projects' or 'projects/2024'). Leave empty for desktop root."
      - name: thumbnail
        label: Thumbnail
        type: image
      - name: vimeo_url
        label: Vimeo URL
        type: string
        description: "Vimeo video URL (for video type)"
      - name: image
        label: Image
        type: image
        description: "Image file (for image type)"
      - name: body
        type: rich-text
```

### Content type mapping

| CMS `type` field | Desktop icon | Window content |
|---|---|---|
| `text` | Text file icon | Rendered markdown in a window |
| `image` | Image thumbnail icon | Full image viewer in a window |
| `video` | Video file icon | Embedded Vimeo player in a window |
| `folder` | Folder icon | Opens a Finder window showing child items |

### Folder structure convention

- Files specify their parent `folder` in frontmatter (e.g., `folder: "projects"`)
- Empty/missing `folder` = item lives on the desktop root
- Folder entries themselves have `type: folder` — they define the folder's existence and title
- Nested folders: `folder: "projects/2024"` places an item inside a subfolder

### Astro content collection (`src/content.config.ts`)

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './docs' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['text', 'image', 'video', 'folder']).default('text'),
    folder: z.string().optional(),
    thumbnail: z.string().optional(),
    vimeo_url: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { pages };
```

---

## 3. Project Structure

```
website/
  .pages.yml                          # Pages CMS config (update existing)
  docs/                               # Content managed by Pages CMS
  media/                              # Media uploads from Pages CMS
  astro.config.mjs                    # Astro config (site, base path)
  package.json
  tsconfig.json
  src/
    content.config.ts                 # Content collection definition
    pages/
      index.astro                     # Single page: the macOS desktop
    layouts/
      Desktop.astro                   # Full-viewport desktop shell
    components/
      MenuBar.astro                   # Top bar: Apple logo, site name, clock
      DesktopArea.astro               # Desktop icon grid
      DesktopIcon.astro               # Single icon (file/folder)
      Window.astro                    # Window template (title bar + traffic lights)
      FinderWindow.astro              # Finder-style window for folder contents
      Dock.astro                      # Bottom dock (static, no magnification for now)
    scripts/
      desktop.ts                      # Main entry: wires everything together
      window-manager.ts               # Window lifecycle: open/close/focus/z-index
      drag.ts                         # Pointer-event title bar dragging
      finder.ts                       # Folder navigation logic inside Finder windows
      clock.ts                        # Live clock in menu bar
    styles/
      global.css                      # Reset, CSS custom properties, system fonts
      desktop.css                     # Wallpaper, icon grid layout
      menubar.css                     # Menu bar blur, layout
      window.css                      # Window chrome, traffic lights, shadows
      finder.css                      # Finder-specific: sidebar, file list, breadcrumb
      dock.css                        # Dock bar styling
      content.css                     # Typography for markdown, image viewer, video embed
  public/
    icons/                            # macOS-style SVG icons
      file-text.svg
      file-image.svg
      file-video.svg
      folder.svg
    wallpapers/
      default.jpg                     # Desktop wallpaper
  .github/
    workflows/
      deploy.yml                      # Build + deploy to GitHub Pages
```

---

## 4. UI Architecture

### Desktop shell (`Desktop.astro`)

Full-viewport layout with three layers:
1. **Background**: wallpaper image, covers viewport
2. **Desktop layer**: `MenuBar` (top), `DesktopArea` (icon grid), `Dock` (bottom)
3. **Window layer**: `<div id="window-layer">` where windows are dynamically inserted

### Desktop icons

- Icons arranged in a grid on the right side of the desktop (classic macOS style)
- Each icon shows: SVG icon (based on `type`), title label below
- Image-type items can show a thumbnail instead of generic icon
- Single click selects (highlight), double click opens

### Window system

- **Window chrome**: rounded corners (10px), title bar with traffic lights (close = red, minimize = yellow, maximize = green), title text centered
- **Traffic lights**: close removes window, minimize hides it, maximize not implemented initially
- **Dragging**: pointer-event based, on title bar only, constrained to viewport
- **No resizing in initial build** — fixed reasonable default sizes per content type
- **Z-index**: simple counter — clicking a window brings it to front
- **Window content** varies by type:
  - `text`: rendered markdown HTML with nice typography
  - `image`: `<img>` scaled to fit window, with the image centered
  - `video`: Vimeo `<iframe>` embed (extracted from URL)
  - `folder`: Finder-style file list (see below)

### Finder windows

- Opens when double-clicking a folder icon
- Shows contents as a list or icon grid (list view initially)
- Breadcrumb path bar at top (e.g., `Desktop > Projects > 2024`)
- Items inside the Finder window are clickable — files open their own windows, folders navigate deeper
- Back button or breadcrumb click for navigation

### Dock

- Fixed bar at bottom center
- Static icons for now (no magnification animation)
- Could show: home (desktop), about, links — configurable later

### Menu bar

- Fixed at top, full width
- Left: Apple logo SVG + site name
- Right: live clock (updates every minute)
- Semi-transparent with `backdrop-filter: blur()`

---

## 5. Data flow

1. **Build time** (Astro): Query all entries from `pages` collection, render markdown to HTML
2. **Inject into page**: Serialize all entries as a JSON data block in a `<script type="application/json" id="desktop-data">` element. Each entry includes: `id`, `title`, `type`, `folder`, `htmlContent` (for text), `vimeoUrl`, `imageUrl`
3. **Client-side** (`desktop.ts`): Parse the JSON, build the desktop icon grid for root-level items
4. **On double-click**: `window-manager.ts` creates a window DOM element, injects appropriate content based on type
5. **Folder navigation**: `finder.ts` filters the data by `folder` field to show folder contents

---

## 6. GitHub Actions Deploy

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build with Astro
        uses: withastro/action@v6
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Trigger cycle**: Pages CMS edits -> commits to `main` -> Actions builds Astro -> deploys to GitHub Pages

---

## 7. Implementation Phases

### Phase 1: Scaffold (get it building and deploying)
1. Initialize Astro project in repo root (`npm create astro@latest`)
2. Configure `astro.config.mjs` with `site` and `base: '/website'`
3. Create `src/content.config.ts` with pages collection
4. Update `.pages.yml` with expanded schema
5. Create `.github/workflows/deploy.yml`
6. Create minimal `src/pages/index.astro` that lists content entries
7. Verify local build (`npx astro build`) and push to trigger deploy

### Phase 2: Desktop layout (static HTML/CSS)
8. Create `Desktop.astro` layout — full viewport, wallpaper, layers
9. Create `MenuBar.astro` — Apple logo, site name, clock placeholder
10. Create `DesktopArea.astro` + `DesktopIcon.astro` — render icons for root-level entries
11. Create `Dock.astro` — simple static dock
12. Write all CSS files (global, desktop, menubar, dock)
13. Add SVG icons to `public/icons/` and a wallpaper to `public/wallpapers/`

### Phase 3: Window system (interactivity)
14. Create `Window.astro` template
15. Implement `window-manager.ts` — open, close, focus, z-index
16. Implement `drag.ts` — pointer-event title bar dragging
17. Wire `desktop.ts` — icon double-click opens windows
18. Write `window.css` — chrome, traffic lights, shadows
19. Write `content.css` — markdown typography, image viewer, Vimeo embed styling

### Phase 4: Finder & folder navigation
20. Create `FinderWindow.astro` template — list view, breadcrumb bar
21. Implement `finder.ts` — filter entries by folder, navigate in/out
22. Write `finder.css`
23. Wire folder icon double-click to open Finder windows

### Phase 5: Polish & content types
24. Implement `clock.ts` — live clock in menu bar
25. Vimeo embed: extract video ID from URL, render responsive iframe
26. Image viewer: centered image display with window sized to image
27. Test with sample content: one text file, one image, one video, one folder with children
28. Add subtle CSS transitions: window open/close fade, icon hover effects

---

## 8. Verification Plan

- [ ] `npm run build` succeeds locally with zero errors
- [ ] `npm run dev` shows desktop with icons from `docs/` content
- [ ] Double-clicking a text file icon opens a draggable window with rendered markdown
- [ ] Double-clicking an image file icon opens a window with the image displayed
- [ ] Double-clicking a video file icon opens a window with embedded Vimeo player
- [ ] Double-clicking a folder icon opens a Finder window showing its children
- [ ] Navigating into a subfolder in Finder works, back button works
- [ ] Window close button (red traffic light) removes the window
- [ ] Clicking a background window brings it to front
- [ ] Menu bar shows live clock
- [ ] Push to `main` triggers GitHub Actions and deploys successfully
- [ ] Site loads at `h3llofanight.github.io/website`
- [ ] Pages CMS can still create/edit content after changes (`.pages.yml` schema is valid)

---

## Key Files to Modify/Create

| File | Action | Purpose |
|---|---|---|
| `.pages.yml` | Modify | Expand schema with type, folder, vimeo_url, image fields |
| `astro.config.mjs` | Create | Astro configuration |
| `package.json` | Create | Via `npm create astro` |
| `src/content.config.ts` | Create | Content collection with glob loader |
| `src/pages/index.astro` | Create | Single page, queries content, renders desktop |
| `src/layouts/Desktop.astro` | Create | Full-viewport desktop shell |
| `src/components/*.astro` | Create | MenuBar, DesktopArea, DesktopIcon, Window, FinderWindow, Dock |
| `src/scripts/*.ts` | Create | desktop, window-manager, drag, finder, clock |
| `src/styles/*.css` | Create | global, desktop, menubar, window, finder, dock, content |
| `.github/workflows/deploy.yml` | Create | CI/CD pipeline |
