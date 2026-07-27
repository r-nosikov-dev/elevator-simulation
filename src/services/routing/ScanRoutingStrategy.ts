import { Direction } from '../../domain/types';
import {
  ElevatorDecision,
  ElevatorRoutingContext,
  ElevatorRoutingStrategy,
  TravelDir,
  extremeDestination,
  nearestWaitingFloor,
  nextStopInDirection,
} from './ElevatorRoutingStrategy';

/*
 * SCAN policy: keep the current direction while work remains ahead,
 * reverse when that run is exhausted, never stop on idle floors.
 */
export class ScanRoutingStrategy implements ElevatorRoutingStrategy {
  readonly name = 'scan';

  decide(ctx: ElevatorRoutingContext): ElevatorDecision | null {
    const floor = ctx.currentFloor;

    if (ctx.direction === Direction.Up || ctx.direction === Direction.Down) {
      const dir = ctx.direction;
      const next = nextStopInDirection(ctx, dir);
      if (next !== null) {
        return { target: next, direction: dir };
      }

      const opposite: TravelDir =
        dir === Direction.Up ? Direction.Down : Direction.Up;
      const reverseStop = nextStopInDirection(ctx, opposite);
      if (reverseStop !== null) {
        return { target: reverseStop, direction: opposite };
      }
    }

    if (!ctx.isEmpty) {
      const upDest = extremeDestination(ctx.passengerDestinations, Direction.Up);
      const downDest = extremeDestination(ctx.passengerDestinations, Direction.Down);

      if (upDest !== null && downDest !== null) {
        const preferUp = Math.abs(upDest - floor) <= Math.abs(downDest - floor);
        const dir = preferUp ? Direction.Up : Direction.Down;
        const extreme = preferUp ? upDest : downDest;
        return {
          target: nextStopInDirection(ctx, dir) ?? extreme,
          direction: dir,
        };
      }
      if (upDest !== null) {
        return {
          target: nextStopInDirection(ctx, Direction.Up) ?? upDest,
          direction: Direction.Up,
        };
      }
      if (downDest !== null) {
        return {
          target: nextStopInDirection(ctx, Direction.Down) ?? downDest,
          direction: Direction.Down,
        };
      }
    }

    const nearest = nearestWaitingFloor(ctx, floor);
    if (nearest === null) return null;

    if (nearest === floor) {
      const { up, down } = ctx.waitingDirections(floor);
      if (up > 0) return { target: floor, direction: Direction.Up };
      if (down > 0) return { target: floor, direction: Direction.Down };
      return null;
    }

    const direction: TravelDir =
      nearest > floor ? Direction.Up : Direction.Down;
    return { target: nearest, direction };
  }
}
