export interface WindowState {
  id: string;
  element: HTMLElement;
  zIndex: number;
}

let maxZ = 100;
const windows = new Map<string, WindowState>();

function getTemplate(): HTMLTemplateElement {
  return document.getElementById('window-template') as HTMLTemplateElement;
}

function getWindowLayer(): HTMLElement {
  return document.getElementById('window-layer')!;
}

export function openWindow(id: string, title: string, content: HTMLElement | string, options?: { width?: number; height?: number }): HTMLElement {
  const existing = windows.get(id);
  if (existing) {
    focusWindow(id);
    return existing.element;
  }

  const template = getTemplate();
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const win = fragment.querySelector('.window') as HTMLElement;

  win.dataset.windowId = id;
  win.querySelector('.window-title')!.textContent = title;

  const contentArea = win.querySelector('.window-content')!;
  if (typeof content === 'string') {
    contentArea.innerHTML = content;
  } else {
    contentArea.appendChild(content);
  }

  const width = options?.width || 600;
  const height = options?.height || 450;

  const offsetCount = windows.size % 10;
  const left = 120 + offsetCount * 30;
  const top = 80 + offsetCount * 30;

  win.style.width = `${width}px`;
  win.style.height = `${height}px`;
  win.style.left = `${left}px`;
  win.style.top = `${top}px`;

  maxZ++;
  win.style.zIndex = String(maxZ);

  const state: WindowState = { id, element: win, zIndex: maxZ };
  windows.set(id, state);

  const layer = getWindowLayer();
  layer.appendChild(win);

  win.addEventListener('pointerdown', () => focusWindow(id));

  win.querySelector('.tl-close')!.addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(id);
  });

  win.querySelector('.tl-minimize')!.addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeWindow(id);
  });

  requestAnimationFrame(() => {
    win.classList.add('visible', 'focused');
  });

  unfocusAll();
  win.classList.add('focused');

  return win;
}

export function closeWindow(id: string): void {
  const state = windows.get(id);
  if (!state) return;

  state.element.classList.remove('visible');
  state.element.addEventListener('transitionend', () => {
    state.element.remove();
  }, { once: true });

  windows.delete(id);

  const remaining = Array.from(windows.values());
  if (remaining.length > 0) {
    remaining.sort((a, b) => a.zIndex - b.zIndex);
    focusWindow(remaining[remaining.length - 1].id);
  }
}

export function minimizeWindow(id: string): void {
  const state = windows.get(id);
  if (!state) return;
  state.element.style.display = 'none';
}

export function focusWindow(id: string): void {
  const state = windows.get(id);
  if (!state) return;

  if (state.element.style.display === 'none') {
    state.element.style.display = 'flex';
  }

  unfocusAll();
  maxZ++;
  state.zIndex = maxZ;
  state.element.style.zIndex = String(maxZ);
  state.element.classList.add('focused');
}

function unfocusAll(): void {
  windows.forEach((state) => {
    state.element.classList.remove('focused');
  });
}

export function getOpenWindows(): Map<string, WindowState> {
  return windows;
}
