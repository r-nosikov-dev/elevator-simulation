import { Container, Graphics, Text } from 'pixi.js';
import { Easing, Group, Tween } from '@tweenjs/tween.js';
import { COLORS, LAYOUT } from '../config';
import { Direction, ElevatorSnapshot, ElevatorState } from '../domain/types';
import { elevatorCenterY, elevatorX } from './layout';

export class ElevatorView {
  readonly container = new Container();
  private readonly body = new Graphics();
  private readonly arrow = new Text({
    text: '●',
    style: {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: LAYOUT.directionArrowFontSize,
      fontWeight: '700',
      fill: COLORS.elevatorStroke,
    },
  });
  private currentTween: Tween<{ y: number }> | null = null;
  private floorCount: number;
  private snapshot: ElevatorSnapshot;

  constructor(
    initial: ElevatorSnapshot,
    floorCount: number,
    private readonly tweenGroup: Group,
  ) {
    this.floorCount = floorCount;
    this.snapshot = initial;
    this.arrow.anchor.set(0.5, 1);
    this.container.addChild(this.body, this.arrow);
    this.container.x = elevatorX() + LAYOUT.elevatorWidth / 2;
    this.container.y = elevatorCenterY(initial.currentFloor, floorCount);
    this.redraw();
  }

  get cabinX(): number {
    return this.container.x - LAYOUT.elevatorWidth / 2;
  }

  get cabinY(): number {
    return this.container.y;
  }

  applySnapshot(snapshot: ElevatorSnapshot): void {
    this.snapshot = snapshot;
    this.redraw();
  }

  moveToFloor(
    toFloor: number,
    durationMs: number,
    onUpdate?: () => void,
    onComplete?: () => void,
  ): void {
    this.stopTween();
    const targetY = elevatorCenterY(toFloor, this.floorCount);
    const state = { y: this.container.y };

    this.currentTween = new Tween(state, this.tweenGroup)
      .to({ y: targetY }, durationMs)
      .easing(Easing.Linear.None)
      .onUpdate(() => {
        this.container.y = state.y;
        onUpdate?.();
      })
      .onComplete(() => {
        this.currentTween = null;
        this.container.y = targetY;
        onComplete?.();
      })
      .start();
  }

  snapToFloor(floor: number): void {
    this.stopTween();
    this.container.y = elevatorCenterY(floor, this.floorCount);
  }

  destroy(): void {
    this.stopTween();
    this.container.destroy({ children: true });
  }

  private redraw(): void {
    const w = LAYOUT.elevatorWidth;
    const h = LAYOUT.elevatorHeight;
    const moving = this.snapshot.state === ElevatorState.Moving;
    const stroke =
      this.snapshot.direction === Direction.Idle && !moving
        ? COLORS.elevatorStrokeIdle
        : COLORS.elevatorStroke;

    this.body.clear();
    this.body.roundRect(-w / 2, -h / 2, w, h, LAYOUT.cabinCornerRadius);
    this.body.fill({ color: COLORS.elevatorFill, alpha: LAYOUT.cabinFillAlpha });
    this.body.stroke({ width: LAYOUT.buildingStrokeWidth, color: stroke });

    if (this.snapshot.direction === Direction.Up) {
      this.arrow.text = '▲';
      this.arrow.style.fill = COLORS.personUp;
    } else if (this.snapshot.direction === Direction.Down) {
      this.arrow.text = '▼';
      this.arrow.style.fill = COLORS.personDown;
    } else {
      this.arrow.text = '●';
      this.arrow.style.fill = COLORS.elevatorStrokeIdle;
    }
    this.arrow.visible = true;
    this.arrow.y = -h / 2 - LAYOUT.directionArrowGap;
  }

  private stopTween(): void {
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
  }
}
