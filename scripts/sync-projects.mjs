import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const ROOT = process.cwd();
const PROJECTS_DIR = join(ROOT, '_projects');
const DOCS_DIR = join(ROOT, 'docs');
const PAGES_YML = join(ROOT, '.pages.yml');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  return fm;
}

// Read all project definitions from _projects/
const projectFiles = existsSync(PROJECTS_DIR)
  ? readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.md')).sort()
  : [];

const projects = projectFiles.map(f => {
  const slug = basename(f, '.md');
  const content = readFileSync(join(PROJECTS_DIR, f), 'utf-8');
  const fm = parseFrontmatter(content);
  return { slug, title: fm.title || slug, icon: fm.icon || '' };
});

// Scaffold docs/<slug>/_index.md for any new projects
let created = 0;
for (const p of projects) {
  const dir = join(DOCS_DIR, p.slug);
  const indexFile = join(dir, '_index.md');
  if (!existsSync(indexFile)) {
    mkdirSync(dir, { recursive: true });
    const iconLine = p.icon ? `icon: "${p.icon}"\n` : '';
    writeFileSync(indexFile, `---\ntitle: "${p.title}"\ntype: folder\n${iconLine}---\n`);
    created++;
    console.log(`Created ${p.slug}/_index.md`);
  }
}

// Shared field definitions for project collections
const projectFields = `      - name: title
        type: string
      - name: type
        label: Content Type
        type: select
        options:
          - text
          - image
          - video
          - folder
        description: "Use 'folder' only for _index.md (defines the project folder itself)"
      - name: icon
        label: Custom Icon
        type: image
      - name: thumbnail
        label: Thumbnail
        type: image
      - name: vimeo_url
        label: Vimeo URL
        type: string
      - name: image
        label: Image
        type: image
      - name: body
        type: rich-text`;

// Generate project collection blocks
const projectBlocks = projects.map(p => `
  - name: "project-${p.slug}"
    label: "Project: ${p.title}"
    type: collection
    path: docs/${p.slug}
    fields:
${projectFields}`).join('\n');

// Generate .pages.yml
const pagesYml = `media: media
content:
  - name: site
    label: Site Settings
    type: file
    path: settings/site.md
    fields:
      - name: title
        label: Site Title
        type: string
        description: "Displayed in the browser tab"
      - name: description
        label: Site Description
        type: string
        description: "Meta description for SEO"
      - name: wallpaper
        label: Desktop Wallpaper
        type: image
        description: "Background image for the desktop. Leave empty for default gradient."
      - name: icon_text
        label: Text File Icon
        type: image
        description: "Custom icon for text files. Leave empty for default."
      - name: icon_image
        label: Image File Icon
        type: image
        description: "Custom icon for image files. Leave empty for default."
      - name: icon_video
        label: Video File Icon
        type: image
        description: "Custom icon for video files. Leave empty for default."
      - name: icon_folder
        label: Folder Icon
        type: image
        description: "Custom icon for folders. Leave empty for default."

  - name: dock
    label: Dock Shortcuts
    type: collection
    path: dock
    fields:
      - name: title
        label: Tooltip Label
        type: string
      - name: icon
        label: Dock Icon
        type: image
        description: "Icon image displayed in the dock"
      - name: url
        label: URL
        type: string
        description: "External link (e.g. https://github.com/you). Leave empty to open an entry."
      - name: entry_id
        label: Entry ID
        type: string
        description: "Open a desktop file or folder (e.g. 'about' or 'sample-project'). Ignored if URL is set."
      - name: order
        label: Sort Order
        type: number
        description: "Lower numbers appear first in the dock"

  - name: desktop-files
    label: Desktop Files
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
      - name: icon
        label: Custom Icon
        type: image
      - name: thumbnail
        label: Thumbnail
        type: image
      - name: vimeo_url
        label: Vimeo URL
        type: string
      - name: image
        label: Image
        type: image
      - name: body
        type: rich-text

  - name: projects
    label: Create New Project
    type: collection
    path: _projects
    fields:
      - name: title
        label: Project Title
        type: string
        description: "Name of the project (becomes a folder on the desktop)"
      - name: icon
        label: Custom Folder Icon
        type: image
        description: "Custom icon for this project folder. Leave empty for default folder icon."
${projectBlocks}
`;

const existing = existsSync(PAGES_YML) ? readFileSync(PAGES_YML, 'utf-8') : '';
if (pagesYml.trim() !== existing.trim()) {
  writeFileSync(PAGES_YML, pagesYml);
  console.log('Updated .pages.yml');
} else {
  console.log('.pages.yml is up to date');
}

console.log(`Done. ${projects.length} projects, ${created} new folders created.`);
