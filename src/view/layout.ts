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

export function queueFirstCenterX(): number {
  return queueAreaLeft() + LAYOUT.personSize / 2;
}

export function queueStride(): number {
  return LAYOUT.personSize + LAYOUT.personGap;
}

export function queueX(index: number): number {
  return queueFirstCenterX() + index * queueStride();
}

export function spawnX(): number {
  return LAYOUT.paddingX + LAYOUT.buildingWidth - LAYOUT.labelOffsetX - 40;
}

export function labelX(): number {
  return LAYOUT.paddingX + LAYOUT.buildingWidth - LAYOUT.labelOffsetX;
}
