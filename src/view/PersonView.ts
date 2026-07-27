import { Container, Graphics, Text } from 'pixi.js';
import { Easing, Group, Tween } from '@tweenjs/tween.js';
import { COLORS, CONFIG_LIMITS, LAYOUT, TIMING } from '../config';
import { Direction, PersonSnapshot } from '../domain/types';
import { personCenterY, queueX, spawnX } from './layout';

function cabinSlotCenter(
  cabinLeftX: number,
  cabinCenterY: number,
  slotIndex: number,
): { x: number; y: number } {
  const pad = LAYOUT.cabinPassengerPad;
  const size = LAYOUT.personSize * LAYOUT.cabinPassengerScale;
  const gap = LAYOUT.personGap;
  const innerWidth = LAYOUT.elevatorWidth - pad * 2;
  const maxSlots = CONFIG_LIMITS.capacity.max;
  const totalBlocks = maxSlots * size + (maxSlots - 1) * gap;
  const startX =
    cabinLeftX + pad + Math.max(0, (innerWidth - totalBlocks) / 2) + size / 2;
  return {
    x: startX + slotIndex * (size + gap),
    y: cabinCenterY,
  };
}

// Blue border = up, green = down; label is the target floor.
export class PersonView {
  readonly container = new Container();
  private readonly body = new Graphics();
  private readonly label: Text;
  private currentTween: Tween<{ x: number; y: number }> | null = null;
  private floorCount: number;
  // While true, ignore cabin follow-updates so the enter tween is not cut off.
  private boarding = false;
  private followCabin = false;

  constructor(
    private snapshot: PersonSnapshot,
    floorCount: number,
    private readonly tweenGroup: Group,
  ) {
    this.floorCount = floorCount;
    this.container.eventMode = 'none';

    this.label = new Text({
      text: String(snapshot.targetFloor),
      style: {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: LAYOUT.personFontSize,
        fontWeight: '700',
        fill: COLORS.text,
        align: 'center',
      },
    });
    this.label.anchor.set(0.5);

    this.container.addChild(this.body, this.label);
    this.redraw();
    this.container.x = spawnX();
    this.container.y = personCenterY(snapshot.currentFloor, floorCount);
  }

  get id(): number {
    return this.snapshot.id;
  }

  get isBoarding(): boolean {
    return this.boarding;
  }

  applySnapshot(snapshot: PersonSnapshot): void {
    this.snapshot = snapshot;
    this.redraw();
  }

  walkToQueue(queueIndex: number, onComplete: () => void): void {
    const targetX = queueX(queueIndex);
    const targetY = personCenterY(this.snapshot.currentFloor, this.floorCount);
    this.animateTo(targetX, targetY, TIMING.corridorWalkMs, onComplete);
  }

  shiftInQueue(queueIndex: number): void {
    if (this.boarding || this.followCabin) return;
    const targetX = queueX(queueIndex);
    const targetY = personCenterY(this.snapshot.currentFloor, this.floorCount);
    this.animateTo(targetX, targetY, TIMING.queueShiftMs);
  }

  boardCabin(slotIndex: number, cabinX: number, cabinY: number): void {
    this.boarding = true;
    this.followCabin = false;

    const slot = cabinSlotCenter(cabinX, cabinY, slotIndex);
    const doorX = cabinX + LAYOUT.elevatorWidth - LAYOUT.cabinDoorInset;
    const approachMs = Math.round(TIMING.boardMs * TIMING.boardApproachRatio);
    const enterMs = TIMING.boardMs - approachMs;

    this.animateTo(doorX, cabinY, approachMs, () => {
      this.animateTo(slot.x, slot.y, enterMs, () => {
        this.boarding = false;
        this.followCabin = true;
        this.container.x = slot.x;
        this.container.y = slot.y;
      }, Easing.Quadratic.Out);
    }, Easing.Quadratic.InOut);
  }

  setCabinPosition(x: number, y: number, slotIndex: number): void {
    if (this.boarding || !this.followCabin) return;
    const slot = cabinSlotCenter(x, y, slotIndex);
    this.stopTween();
    this.container.x = slot.x;
    this.container.y = slot.y;
  }

  exitToRight(onComplete: () => void): void {
    this.boarding = false;
    this.followCabin = false;
    const y = personCenterY(this.snapshot.currentFloor, this.floorCount);
    const midX = queueX(0);
    this.animateTo(midX, y, TIMING.exitStepOutMs, () => {
      this.animateTo(spawnX() + 40, y, TIMING.exitWalkMs, onComplete);
    });
  }

  destroy(): void {
    this.stopTween();
    this.container.destroy({ children: true });
  }

  private redraw(): void {
    const goingUp = this.snapshot.direction === Direction.Up;
    const stroke = goingUp ? COLORS.personUp : COLORS.personDown;
    const fill = goingUp ? COLORS.personUpFill : COLORS.personDownFill;
    const s = LAYOUT.personSize;

    this.body.clear();
    this.body.roundRect(-s / 2, -s / 2, s, s, LAYOUT.personCornerRadius);
    this.body.fill({ color: fill });
    this.body.stroke({ width: LAYOUT.personStrokeWidth, color: stroke });
    this.label.text = String(this.snapshot.targetFloor);
  }

  private animateTo(
    x: number,
    y: number,
    durationMs: number,
    onComplete?: () => void,
    easing: (k: number) => number = Easing.Quadratic.InOut,
  ): void {
    this.stopTween();
    const state = { x: this.container.x, y: this.container.y };
    this.currentTween = new Tween(state, this.tweenGroup)
      .to({ x, y }, durationMs)
      .easing(easing)
      .onUpdate(() => {
        this.container.x = state.x;
        this.container.y = state.y;
      })
      .onComplete(() => {
        this.currentTween = null;
        onComplete?.();
      })
      .start();
  }

  private stopTween(): void {
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
  }
}
