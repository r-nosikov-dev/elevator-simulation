import { Container, Graphics, Text } from 'pixi.js';
import { COLORS, LAYOUT } from '../config';
import { FloorNumber } from '../domain/types';
import { overflowBadgeX, personCenterY } from './layout';

// Shown when more people wait than fit in the floor's visible queue strip.
export class QueueOverflowBadge {
  readonly container = new Container();
  private readonly body = new Graphics();
  private readonly label: Text;
  private floorCount: number;

  constructor(floorCount: number) {
    this.floorCount = floorCount;
    this.container.eventMode = 'none';
    this.container.visible = false;

    this.label = new Text({
      text: '+0',
      style: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: LAYOUT.overflowFontSize,
        fontWeight: '700',
        fill: COLORS.overflowText,
        align: 'center',
      },
    });
    this.label.anchor.set(0.5);

    this.container.addChild(this.body, this.label);
  }

  update(floor: FloorNumber, hiddenCount: number): void {
    if (hiddenCount <= 0) {
      this.container.visible = false;
      return;
    }

    this.container.visible = true;
    this.container.x = overflowBadgeX();
    this.container.y = personCenterY(floor, this.floorCount);

    const w = LAYOUT.queueOverflowBadgeWidth;
    const h = LAYOUT.personSize * LAYOUT.cabinPassengerScale;

    this.body.clear();
    this.body.roundRect(-w / 2, -h / 2, w, h, LAYOUT.overflowCornerRadius);
    this.body.fill({ color: COLORS.overflowFill });
    this.body.stroke({
      width: LAYOUT.overflowStrokeWidth,
      color: COLORS.overflowStroke,
    });

    this.label.text = `+${hiddenCount}`;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
