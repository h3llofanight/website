import { openWindow } from './window-manager';
import { makeDraggable } from './drag';

interface DesktopEntry {
  id: string;
  title: string;
  type: string;
  folder?: string;
  vimeoUrl?: string;
  imageUrl?: string;
}

interface DesktopData {
  entries: DesktopEntry[];
  iconMap: Record<string, string>;
  base: string;
}

function getData(): DesktopData {
  const el = document.getElementById('desktop-data');
  return JSON.parse(el!.textContent!);
}

function getChildEntries(entries: DesktopEntry[], folderPath: string): DesktopEntry[] {
  return entries.filter((e) => {
    const entryFolder = e.folder || '';
    return entryFolder === folderPath;
  });
}

export function openFinderWindow(folderId: string, folderTitle: string, folderPath: string): void {
  const data = getData();
  const windowId = `finder-${folderId}`;

  const container = document.createElement('div');
  container.className = 'finder-content';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'finder-toolbar';
  toolbar.innerHTML = `
    <div class="finder-nav-buttons">
      <button class="finder-nav-btn finder-back" aria-label="Back" disabled>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="finder-nav-btn finder-forward" aria-label="Forward" disabled>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2L8.5 6l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="finder-breadcrumb"></div>
    <button class="finder-nav-btn finder-sidebar-toggle" aria-label="Toggle Sidebar" title="Toggle Sidebar">
      <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
        <rect x="0.5" y="0.5" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1"/>
        <line x1="4.5" y1="0.5" x2="4.5" y2="11.5" stroke="currentColor" stroke-width="1"/>
        <line x1="1.5" y1="3.5" x2="3.5" y2="3.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="1.5" y1="5.5" x2="3.5" y2="5.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="1.5" y1="7.5" x2="3.5" y2="7.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
      </svg>
    </button>
  `;

  // Body (sidebar + main)
  const body = document.createElement('div');
  body.className = 'finder-body';

  // Sidebar (hidden by default)
  const sidebar = document.createElement('div');
  sidebar.className = 'finder-sidebar hidden';

  const favSection = document.createElement('div');
  favSection.className = 'finder-sidebar-section';
  favSection.innerHTML = `<div class="finder-sidebar-label">Favorites</div>`;

  const desktopItem = document.createElement('div');
  desktopItem.className = 'finder-sidebar-item';
  desktopItem.innerHTML = `
    <svg class="sidebar-icon" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
      <path d="M5 14h6M8 12v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
    <span>Desktop</span>
  `;
  favSection.appendChild(desktopItem);

  const allFolders = data.entries.filter(e => e.type === 'folder');
  allFolders.forEach(f => {
    const item = document.createElement('div');
    item.className = 'finder-sidebar-item';
    item.dataset.folderId = f.id;
    item.dataset.folderPath = f.folder ? `${f.folder}/${f.id}` : f.id;
    item.innerHTML = `
      <svg class="sidebar-icon" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 4.5a1 1 0 011-1h4l1.5 1.5h6a1 1 0 011 1v7a1 1 0 01-1 1h-12a1 1 0 01-1-1v-8.5z" stroke="#4DA3FF" stroke-width="1" fill="#2E8BF7" fill-opacity="0.2"/>
      </svg>
      <span>${f.title}</span>
    `;
    favSection.appendChild(item);
  });

  sidebar.appendChild(favSection);

  // Main area
  const main = document.createElement('div');
  main.className = 'finder-main';
  const grid = document.createElement('div');
  grid.className = 'finder-icon-grid';
  main.appendChild(grid);

  body.appendChild(sidebar);
  body.appendChild(main);

  // Path bar
  const pathbar = document.createElement('div');
  pathbar.className = 'finder-pathbar';

  container.appendChild(toolbar);
  container.appendChild(body);
  container.appendChild(pathbar);

  const win = openWindow(windowId, folderTitle, container, { width: 700, height: 500 });
  makeDraggable(win);

  const contentArea = win.querySelector('.window-content') as HTMLElement;
  contentArea.style.display = 'flex';
  contentArea.style.flexDirection = 'column';
  contentArea.style.overflow = 'hidden';

  // Sidebar toggle
  const toggleBtn = win.querySelector('.finder-sidebar-toggle') as HTMLButtonElement;
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    toggleBtn.classList.toggle('active');
  });

  const pathStack: { path: string; title: string }[] = [{ path: folderPath, title: folderTitle }];
  const forwardStack: { path: string; title: string }[] = [];

  function resolveFolderPath(currentPath: string, entry: DesktopEntry): string {
    return currentPath ? `${currentPath}/${entry.id}` : entry.id;
  }

  function renderFolder(currentPath: string): void {
    const children = getChildEntries(data.entries, currentPath);
    grid.innerHTML = '';

    if (children.length === 0) {
      grid.innerHTML = '<div class="finder-empty">This folder is empty</div>';
    } else {
      const sorted = [...children].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      });

      sorted.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'finder-grid-item';
        item.dataset.entryId = entry.id;
        item.dataset.type = entry.type;

        const iconSrc = data.iconMap[entry.type] || data.iconMap.text;
        item.innerHTML = `
          <div class="finder-grid-icon"><img src="${iconSrc}" alt="" draggable="false" /></div>
          <span class="finder-grid-label">${entry.title}</span>
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          grid.querySelectorAll('.finder-grid-item.selected').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });

        item.addEventListener('dblclick', () => {
          if (entry.type === 'folder') {
            const newPath = resolveFolderPath(currentPath, entry);
            forwardStack.length = 0;
            pathStack.push({ path: newPath, title: entry.title });
            renderFolder(newPath);
            updateChrome();
          } else {
            openContentWindow(entry);
          }
        });

        grid.appendChild(item);
      });
    }

    // Update sidebar active state
    sidebar.querySelectorAll('.finder-sidebar-item').forEach(el => {
      el.classList.remove('active');
      const fp = (el as HTMLElement).dataset.folderPath;
      if (fp === currentPath || (fp === undefined && !currentPath)) {
        el.classList.add('active');
      }
    });
  }

  function updateChrome(): void {
    const current = pathStack[pathStack.length - 1];

    // Breadcrumb
    const bc = win.querySelector('.finder-breadcrumb') as HTMLElement;
    bc.innerHTML = '';

    pathStack.forEach((crumb, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'bc-separator';
        sep.textContent = '›';
        bc.appendChild(sep);
      }
      const span = document.createElement('span');
      span.textContent = crumb.title;
      if (i < pathStack.length - 1) {
        span.addEventListener('click', () => {
          const removed = pathStack.splice(i + 1);
          forwardStack.push(...removed.reverse());
          renderFolder(pathStack[pathStack.length - 1].path);
          updateChrome();
        });
      }
      bc.appendChild(span);
    });

    // Back/forward buttons
    const backBtn = win.querySelector('.finder-back') as HTMLButtonElement;
    const fwdBtn = win.querySelector('.finder-forward') as HTMLButtonElement;
    backBtn.disabled = pathStack.length <= 1;
    fwdBtn.disabled = forwardStack.length === 0;

    // Title
    const titleEl = win.querySelector('.window-title') as HTMLElement;
    titleEl.textContent = current.title;

    // Path bar
    const pb = win.querySelector('.finder-pathbar') as HTMLElement;
    pb.innerHTML = pathStack.map(c => `<span>${c.title}</span>`).join('<span class="pb-separator"> › </span>');
  }

  // Navigation
  const backBtn = win.querySelector('.finder-back') as HTMLButtonElement;
  backBtn.addEventListener('click', () => {
    if (pathStack.length > 1) {
      forwardStack.push(pathStack.pop()!);
      renderFolder(pathStack[pathStack.length - 1].path);
      updateChrome();
    }
  });

  const fwdBtn = win.querySelector('.finder-forward') as HTMLButtonElement;
  fwdBtn.addEventListener('click', () => {
    if (forwardStack.length > 0) {
      pathStack.push(forwardStack.pop()!);
      renderFolder(pathStack[pathStack.length - 1].path);
      updateChrome();
    }
  });

  // Sidebar clicks
  desktopItem.addEventListener('click', () => {
    pathStack.length = 0;
    pathStack.push({ path: '', title: 'Desktop' });
    forwardStack.length = 0;
    renderFolder('');
    updateChrome();
  });

  sidebar.querySelectorAll('.finder-sidebar-item[data-folder-path]').forEach(el => {
    el.addEventListener('click', () => {
      const fp = (el as HTMLElement).dataset.folderPath!;
      const fId = (el as HTMLElement).dataset.folderId!;
      const folder = data.entries.find(e => e.id === fId);
      if (folder) {
        pathStack.length = 0;
        pathStack.push({ path: fp, title: folder.title });
        forwardStack.length = 0;
        renderFolder(fp);
        updateChrome();
      }
    });
  });

  // Click on main area to deselect
  main.addEventListener('click', (e) => {
    if (e.target === main || e.target === grid) {
      grid.querySelectorAll('.finder-grid-item.selected').forEach(i => i.classList.remove('selected'));
    }
  });

  renderFolder(folderPath);
  updateChrome();
}

function openContentWindow(entry: DesktopEntry): void {
  const data = getData();

  if (entry.type === 'video' && entry.vimeoUrl) {
    const vimeoId = extractVimeoId(entry.vimeoUrl);
    if (vimeoId) {
      const content = `<div class="video-viewer"><iframe src="https://player.vimeo.com/video/${vimeoId}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
      const win = openWindow(`content-${entry.id}`, entry.title, content, { width: 720, height: 450 });
      makeDraggable(win);
      return;
    }
  }

  if (entry.type === 'image' && entry.imageUrl) {
    const imgSrc = entry.imageUrl.startsWith('http') ? entry.imageUrl : `${data.base}/${entry.imageUrl}`;
    const content = `<div class="image-viewer"><img src="${imgSrc}" alt="${entry.title}" /></div>`;
    const win = openWindow(`content-${entry.id}`, entry.title, content, { width: 700, height: 500 });
    makeDraggable(win);
    return;
  }

  const template = document.querySelector(`template[data-content-id="${entry.id}"]`) as HTMLTemplateElement | null;
  let htmlContent = '';
  if (template) {
    const div = document.createElement('div');
    div.appendChild(template.content.cloneNode(true));
    htmlContent = div.innerHTML;
  }

  const content = `<div class="markdown-body">${htmlContent || '<p>No content</p>'}</div>`;
  const win = openWindow(`content-${entry.id}`, entry.title, content);
  makeDraggable(win);
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

export { openContentWindow, getData };
