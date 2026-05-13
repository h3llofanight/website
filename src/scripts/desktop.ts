import { openWindow } from './window-manager';
import { makeDraggable } from './drag';
import { openFinderWindow, openContentWindow, getData } from './finder';

export function initDesktop(): void {
  positionIcons();
  initIcons();
  initDesktopClick();
  initDock();
}

function positionIcons(): void {
  const icons = document.querySelectorAll<HTMLElement>('.desktop-icon');
  const iconW = 90;
  const iconH = 96;
  const gap = 4;
  const padRight = 20;
  const padTop = 20;

  const startX = window.innerWidth - iconW - padRight;

  icons.forEach((icon, i) => {
    const maxRows = Math.floor((window.innerHeight - padTop * 2) / (iconH + gap));
    const col = Math.floor(i / maxRows);
    const row = i % maxRows;

    const x = startX - col * (iconW + gap);
    const y = padTop + row * (iconH + gap);

    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
  });
}

function initIcons(): void {
  const icons = document.querySelectorAll<HTMLElement>('.desktop-icon');

  icons.forEach((icon) => {
    let dragStarted = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;
    let pointerDownTime = 0;

    icon.addEventListener('pointerdown', (e: PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      document.querySelectorAll('.desktop-icon.selected').forEach((i) => i.classList.remove('selected'));
      icon.classList.add('selected');

      dragStarted = false;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = icon.offsetLeft;
      origTop = icon.offsetTop;
      pointerDownTime = Date.now();

      icon.setPointerCapture(e.pointerId);
    });

    icon.addEventListener('pointermove', (e: PointerEvent) => {
      if (!icon.hasPointerCapture(e.pointerId)) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!dragStarted && Math.abs(dx) + Math.abs(dy) > 4) {
        dragStarted = true;
        icon.classList.add('dragging');
      }

      if (dragStarted) {
        let newX = origLeft + dx;
        let newY = origTop + dy;

        newX = Math.max(0, Math.min(window.innerWidth - 80, newX));
        newY = Math.max(0, Math.min(window.innerHeight - 80, newY));

        icon.style.left = `${newX}px`;
        icon.style.top = `${newY}px`;
      }
    });

    icon.addEventListener('pointerup', (e: PointerEvent) => {
      icon.classList.remove('dragging');

      if (!dragStarted && Date.now() - pointerDownTime < 300) {
        // This was a click, not a drag — selection already handled in pointerdown
      }

      dragStarted = false;
    });

    icon.addEventListener('dblclick', () => {
      const entryId = icon.dataset.entryId!;
      const type = icon.dataset.type!;
      const data = getData();
      const entry = data.entries.find((e) => e.id === entryId);
      if (!entry) return;

      if (type === 'folder') {
        openFinderWindow(entryId, entry.title, entryId);
      } else {
        openContentWindow(entry);
      }
    });
  });
}

function initDesktopClick(): void {
  const area = document.getElementById('desktop-area');
  area?.addEventListener('pointerdown', (e) => {
    if (e.target === area) {
      document.querySelectorAll('.desktop-icon.selected').forEach((i) => i.classList.remove('selected'));
    }
  });
}

function initDock(): void {
  const finderIcon = document.querySelector('.dock-icon[data-action="show-desktop"]');
  finderIcon?.addEventListener('dblclick', () => {
    const windowLayer = document.getElementById('window-layer');
    if (windowLayer) {
      windowLayer.innerHTML = '';
    }
  });
}

export { openContentWindow };
