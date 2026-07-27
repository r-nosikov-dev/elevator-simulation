import { LAYOUT } from '../config';
import { FloorNumber } from '../domain/types';

export function canvasHeight(floorCount: number): number {
  return (
    LAYOUT.paddingTop +
    floorCount * LAYOUT.floorHeight +
    LAYOUT.paddingBottom
  );
}

export function canvasWidth(): number {
  return LAYOUT.paddingX * 2 + LAYOUT.buildingWidth;
}

// Canvas Y grows downward, but floor 1 must sit at the bottom of the building.
export function floorLineY(floor: FloorNumber, floorCount: number): number {
  const indexFromTop = floorCount - floor;
  return LAYOUT.paddingTop + (indexFromTop + 1) * LAYOUT.floorHeight;
}

export function personCenterY(floor: FloorNumber, floorCount: number): number {
  return (
    floorLineY(floor, floorCount) -
    LAYOUT.personSize / 2 -
    LAYOUT.personAboveFloor
  );
}

export function elevatorCenterY(floor: FloorNumber, floorCount: number): number {
  return (
    floorLineY(floor, floorCount) -
    LAYOUT.elevatorHeight / 2 -
    LAYOUT.elevatorAboveFloor
  );
}

export function elevatorX(): number {
  return LAYOUT.paddingX + LAYOUT.elevatorInsetX;
}

export function queueAreaLeft(): number {
  return elevatorX() + LAYOUT.elevatorWidth + LAYOUT.queueElevatorGap;
}

// Hard right edge of the queue strip (labels live further right).
export function queueAreaRight(): number {
  return LAYOUT.paddingX + LAYOUT.buildingWidth - LAYOUT.queueRightReserve;
}

export function queueFirstCenterX(): number {
  return queueAreaLeft() + LAYOUT.personSize / 2;
}

export function queueStride(): number {
  return LAYOUT.personSize + LAYOUT.personGap;
}

// Capacity of the visible strip; badge width is reserved so +N never clips labels.
export function maxVisibleQueueSlots(): number {
  const left = queueAreaLeft();
  const right = queueAreaRight() - LAYOUT.queueOverflowBadgeWidth;
  const usable = right - left;
  if (usable < LAYOUT.personSize) return 1;
  const slots = Math.floor(
    (usable - LAYOUT.personSize) / queueStride() + 1,
  );
  return Math.max(1, slots);
}

// Out-of-range indices clamp to the last visible slot (overflow waiters stay hidden).
export function queueX(index: number): number {
  const max = maxVisibleQueueSlots();
  const clamped = Math.max(0, Math.min(index, max - 1));
  return queueFirstCenterX() + clamped * queueStride();
}

export function overflowBadgeX(): number {
  const max = maxVisibleQueueSlots();
  const lastCenter = queueX(max - 1);
  return (
    lastCenter +
    LAYOUT.personSize / 2 +
    LAYOUT.personGap +
    LAYOUT.queueOverflowBadgeWidth / 2
  );
}

export function spawnX(): number {
  return queueAreaRight();
}

export function labelX(): number {
  return LAYOUT.paddingX + LAYOUT.buildingWidth - LAYOUT.labelOffsetX;
}
