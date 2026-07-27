import { GROUND_FLOOR } from '../../config';
import { Building } from '../../domain/Building';
import { Direction, ElevatorState, FloorNumber } from '../../domain/types';

export type TravelDir = Direction.Up | Direction.Down;

// target === currentFloor means open doors here, not travel.
export interface ElevatorDecision {
  target: FloorNumber;
  direction: TravelDir;
}

// Snapshot only — strategies must not mutate the building.
export interface ElevatorRoutingContext {
  readonly floorCount: number;
  readonly currentFloor: FloorNumber;
  readonly direction: Direction;
  readonly state: ElevatorState;
  readonly isEmpty: boolean;
  readonly isFull: boolean;
  readonly passengerDestinations: readonly FloorNumber[];
  readonly waitingFloors: readonly FloorNumber[];
  waitingDirections(floor: FloorNumber): { up: number; down: number };
}

export interface ElevatorRoutingStrategy {
  readonly name: string;
  decide(ctx: ElevatorRoutingContext): ElevatorDecision | null;
}

export function createRoutingContext(building: Building): ElevatorRoutingContext {
  const elevator = building.elevator;

  return {
    floorCount: building.floorCount,
    currentFloor: elevator.currentFloor,
    direction: elevator.direction,
    state: elevator.state,
    isEmpty: elevator.isEmpty,
    isFull: elevator.isFull,
    passengerDestinations: elevator.passengers.map((p) => p.targetFloor),
    waitingFloors: building.floors().filter((f) => building.hasWaitingOn(f)),
    waitingDirections(floor: FloorNumber) {
      return {
        up: building.waitingForDirection(floor, Direction.Up).length,
        down: building.waitingForDirection(floor, Direction.Down).length,
      };
    },
  };
}

export function hasPassengerFor(ctx: ElevatorRoutingContext, floor: FloorNumber): boolean {
  return ctx.passengerDestinations.includes(floor);
}

export function hasSameDirectionWaiter(
  ctx: ElevatorRoutingContext,
  floor: FloorNumber,
  dir: TravelDir,
): boolean {
  const counts = ctx.waitingDirections(floor);
  return dir === Direction.Up ? counts.up > 0 : counts.down > 0;
}

// Skip floors where nobody gets off and nobody same-direction can board.
export function shouldStopAt(
  ctx: ElevatorRoutingContext,
  floor: FloorNumber,
  dir: TravelDir,
): boolean {
  if (hasPassengerFor(ctx, floor)) return true;
  if (ctx.isFull) return false;
  return hasSameDirectionWaiter(ctx, floor, dir);
}

export function nextStopInDirection(
  ctx: ElevatorRoutingContext,
  dir: TravelDir,
): FloorNumber | null {
  const from = ctx.currentFloor;
  const step = dir === Direction.Up ? 1 : -1;
  const limit = dir === Direction.Up ? ctx.floorCount : GROUND_FLOOR;

  for (
    let floor = from + step;
    dir === Direction.Up ? floor <= limit : floor >= limit;
    floor += step
  ) {
    if (shouldStopAt(ctx, floor, dir)) {
      return floor;
    }
  }

  if (
    shouldStopAt(ctx, from, dir) &&
    (ctx.state === ElevatorState.Idle || ctx.state === ElevatorState.Stopped)
  ) {
    const alight = hasPassengerFor(ctx, from);
    const board = !ctx.isFull && hasSameDirectionWaiter(ctx, from, dir);
    if (alight || board) return from;
  }

  return null;
}

export function nearestWaitingFloor(
  ctx: ElevatorRoutingContext,
  from: FloorNumber,
): FloorNumber | null {
  let best: FloorNumber | null = null;
  let bestDist = Infinity;
  for (const floor of ctx.waitingFloors) {
    const dist = Math.abs(floor - from);
    if (dist < bestDist) {
      bestDist = dist;
      best = floor;
    }
  }
  return best;
}

export function extremeDestination(
  destinations: readonly FloorNumber[],
  dir: TravelDir,
): FloorNumber | null {
  if (destinations.length === 0) return null;
  return dir === Direction.Up ? Math.max(...destinations) : Math.min(...destinations);
}
