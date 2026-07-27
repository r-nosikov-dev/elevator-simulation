import { Application } from 'pixi.js';
import { LAYOUT } from '../config';
import { canvasHeight, canvasWidth } from './layout';

export interface FitCanvasOptions {
  floorCount: number;
  padding?: number;
  maxScale?: number;
}

// Scales via CSS only so PIXI keeps a sharp logical resolution on mobile.
export function fitCanvasToHost(
  app: Application,
  host: HTMLElement,
  options: FitCanvasOptions,
): number {
  const padding = options.padding ?? LAYOUT.fitPadding;
  const maxScale = options.maxScale ?? LAYOUT.fitMaxScale;
  const logicalW = canvasWidth();
  const logicalH = canvasHeight(options.floorCount);

  const availW = Math.max(LAYOUT.fitMinDimension, host.clientWidth - padding * 2);

  let availH = host.clientHeight - padding * 2;
  if (availH < LAYOUT.fitHostHeightFallback) {
    const toolbar = document.querySelector('.toolbar');
    const toolbarH = toolbar instanceof HTMLElement
      ? toolbar.getBoundingClientRect().height
      : 0;
    const vv = window.visualViewport;
    const viewportH = vv?.height ?? window.innerHeight;
    availH = Math.max(
      LAYOUT.fitMinDimension,
      viewportH - toolbarH - padding * 2,
    );
  }

  const scale = Math.min(maxScale, availW / logicalW, availH / logicalH);
  const cssW = Math.max(1, Math.floor(logicalW * scale));
  const cssH = Math.max(1, Math.floor(logicalH * scale));

  const canvas = app.canvas;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.maxWidth = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';

  return scale;
}
