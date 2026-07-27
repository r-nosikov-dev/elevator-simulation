import { Application, Container, Graphics, Text } from 'pixi.js';
import { COLORS, GROUND_FLOOR, LAYOUT } from '../config';
import {
  canvasHeight,
  canvasWidth,
  floorLineY,
  labelX,
  elevatorX,
} from './layout';

export class BuildingView {
  readonly root = new Container();
  private readonly graphics = new Graphics();
  private readonly labels = new Container();

  constructor(private floorCount: number) {
    this.root.addChild(this.graphics, this.labels);
    this.redraw();
  }

  resize(floorCount: number): void {
    this.floorCount = floorCount;
    this.redraw();
  }

  private redraw(): void {
    this.graphics.clear();
    this.labels.removeChildren().forEach((c) => c.destroy());

    const w = LAYOUT.buildingWidth;
    const h = this.floorCount * LAYOUT.floorHeight;
    const x = LAYOUT.paddingX;
    const y = LAYOUT.paddingTop;

    this.graphics.rect(x, y, w, h);
    this.graphics.stroke({
      width: LAYOUT.buildingStrokeWidth,
      color: COLORS.buildingStroke,
    });

    const shaftW = LAYOUT.elevatorWidth + LAYOUT.elevatorShaftExtraWidth;
    this.graphics.rect(x, y, shaftW, h);
    this.graphics.fill({ color: COLORS.shaftBg });
    this.graphics.stroke({
      width: LAYOUT.shaftStrokeWidth,
      color: COLORS.buildingStroke,
      alpha: COLORS.shaftStrokeAlpha,
    });

    for (let floor = GROUND_FLOOR; floor <= this.floorCount; floor++) {
      const lineY = floorLineY(floor, this.floorCount);
      this.graphics.moveTo(x, lineY);
      this.graphics.lineTo(x + w, lineY);
      this.graphics.stroke({
        width: LAYOUT.floorStrokeWidth,
        color: COLORS.floorLine,
      });

      const label = new Text({
        text: `level ${floor}`,
        style: {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: LAYOUT.levelLabelFontSize,
          fill: COLORS.levelLabel,
        },
      });
      label.anchor.set(1, 1);
      label.x = labelX();
      label.y = lineY - LAYOUT.labelAboveFloor;
      this.labels.addChild(label);
    }

    const doorX = elevatorX() - LAYOUT.doorLineNudgeX;
    const dividerX = doorX + LAYOUT.elevatorWidth + LAYOUT.doorDividerOffset;
    this.graphics.moveTo(dividerX, y);
    this.graphics.lineTo(dividerX, y + h);
    this.graphics.stroke({
      width: LAYOUT.shaftStrokeWidth,
      color: COLORS.buildingStroke,
      alpha: COLORS.doorDividerAlpha,
    });
  }
}

export async function createPixiApp(floorCount: number): Promise<Application> {
  const app = new Application();
  await app.init({
    width: canvasWidth(),
    height: canvasHeight(floorCount),
    background: COLORS.background,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  return app;
}

export function resizePixiApp(app: Application, floorCount: number): void {
  app.renderer.resize(canvasWidth(), canvasHeight(floorCount));
}
