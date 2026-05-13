export function makeDraggable(win: HTMLElement): void {
  const titlebar = win.querySelector('.window-titlebar') as HTMLElement;
  if (!titlebar) return;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;

  titlebar.addEventListener('pointerdown', (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.traffic-lights')) return;

    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origLeft = win.offsetLeft;
    origTop = win.offsetTop;

    titlebar.setPointerCapture(e.pointerId);
    win.style.transition = 'none';
    document.body.style.cursor = 'default';
  });

  titlebar.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = origLeft + dx;
    let newTop = origTop + dy;

    newTop = Math.max(0, newTop);
    newLeft = Math.max(-win.offsetWidth + 100, newLeft);
    newLeft = Math.min(window.innerWidth - 100, newLeft);

    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
  });

  titlebar.addEventListener('pointerup', () => {
    dragging = false;
    win.style.transition = '';
    document.body.style.cursor = '';
  });

  titlebar.addEventListener('lostpointercapture', () => {
    dragging = false;
    win.style.transition = '';
    document.body.style.cursor = '';
  });
}
