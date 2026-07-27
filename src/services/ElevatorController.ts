import { TIMING } from '../config';
import { Building } from '../domain/Building';
import { Person } from '../domain/Person';
import { Direction, ElevatorState, FloorNumber } from '../domain/types';

type TravelDir = Direction.Up | Direction.Down;

type Decision = { target: FloorNumber; direction: TravelDir };

export class ElevatorController {
  private busy = false;
  private stopped = false;
  private loopHandle: number | null = null;

  constructor(private readonly building: Building) {}

  start(): void {
    this.stopped = false;
    this.tick();
  }

  stop(): void {
    this.stopped = true;
    this.busy = false;
    if (this.loopHandle !== null) {
      window.clearTimeout(this.loopHandle);
      this.loopHandle = null;
    }
  }

  private tick(): void {
    if (this.stopped || this.busy) return;

    const decision = this.decide();
    if (!decision) {
      this.building.elevator.setDirection(Direction.Idle);
      this.building.elevator.setState(ElevatorState.Idle);
      this.building.notifyElevatorUpdated();
      this.loopHandle = window.setTimeout(() => this.tick(), TIMING.idlePollMs);
      return;
    }

    void this.execute(decision);
  }

  // nearest-call routing
  private decide(): Decision | null {
    const elevator = this.building.elevator;
    const floor = elevator.currentFloor;

    if (!elevator.isEmpty) {
      const dests = elevator.passengers.map((p) => p.targetFloor);
      let best = dests[0]!;
      for (const d of dests) {
        if (Math.abs(d - floor) < Math.abs(best - floor)) best = d;
      }
      if (best === floor) {
        const dir: TravelDir =
          elevator.direction === Direction.Down ? Direction.Down : Direction.Up;
        return { target: floor, direction: dir };
      }
      const direction: TravelDir = best > floor ? Direction.Up : Direction.Down;
      return { target: best, direction };
    }

    const nearest = this.building.nearestWaitingFloor(floor);
    if (nearest === null) return null;
    if (nearest === floor) {
      const up = this.building.waitingForDirection(floor, Direction.Up);
      const down = this.building.waitingForDirection(floor, Direction.Down);
      if (up.length > 0) return { target: floor, direction: Direction.Up };
      if (down.length > 0) return { target: floor, direction: Direction.Down };
      return null;
    }
    const direction: TravelDir = nearest > floor ? Direction.Up : Direction.Down;
    return { target: nearest, direction };
  }

  private async execute(decision: Decision): Promise<void> {
    this.busy = true;
    const elevator = this.building.elevator;
    elevator.setDirection(decision.direction);

    try {
      if (decision.target === elevator.currentFloor) {
        await this.serveFloor(decision.direction);
      } else {
        await this.travelTo(decision.target, decision.direction);
        await this.serveFloor(decision.direction);
      }
    } finally {
      this.busy = false;
      if (!this.stopped) {
        this.loopHandle = window.setTimeout(() => this.tick(), TIMING.controlLoopMs);
      }
    }
  }

  private travelTo(target: FloorNumber, dir: TravelDir): Promise<void> {
    const elevator = this.building.elevator;
    const from = elevator.currentFloor;
    if (from === target) return Promise.resolve();

    const floors = Math.abs(target - from);
    const durationMs = floors * TIMING.floorTravelMs;

    elevator.setState(ElevatorState.Moving);
    elevator.setDirection(dir);
    this.building.notifyElevatorMoved(from, target, durationMs);

    return new Promise((resolve) => {
      window.setTimeout(() => {
        elevator.setFloor(target);
        this.building.notifyElevatorUpdated();
        resolve();
      }, durationMs);
    });
  }

  private async serveFloor(dir: TravelDir): Promise<void> {
    const elevator = this.building.elevator;
    const floor = elevator.currentFloor;

    const leaving = elevator.passengersToAlight();
    for (const person of leaving) {
      this.building.alightPerson(person.id);
    }

    const waiters = [...this.building.waitingForDirection(floor, dir)];
    for (const person of waiters) {
      if (elevator.isFull) break;
      this.building.boardPerson(person);
    }

    if (elevator.isEmpty) {
      const opposite: TravelDir =
        dir === Direction.Up ? Direction.Down : Direction.Up;
      for (const person of [...this.building.waitingForDirection(floor, opposite)]) {
        if (elevator.isFull) break;
        if (this.building.boardPerson(person)) {
          elevator.setDirection(opposite);
        }
      }
    }

    elevator.setState(ElevatorState.Stopped);
    this.building.notifyElevatorStopped(floor, TIMING.doorStopMs);
    await this.delay(TIMING.doorStopMs);

    if (elevator.isEmpty && this.building.nearestWaitingFloor(floor) === null) {
      elevator.setDirection(Direction.Idle);
      elevator.setState(ElevatorState.Idle);
    }
    this.building.notifyElevatorUpdated();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
}
