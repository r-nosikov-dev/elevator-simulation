import { TIMING } from '../config';
import { Building } from '../domain/Building';
import { Person } from '../domain/Person';
import { Direction, ElevatorState, FloorNumber } from '../domain/types';
import {
  ElevatorDecision,
  ElevatorRoutingStrategy,
  TravelDir,
  createRoutingContext,
  ScanRoutingStrategy,
} from './routing';

export class ElevatorController {
  private busy = false;
  private stopped = false;
  private loopHandle: number | null = null;
  private strategy: ElevatorRoutingStrategy;

  constructor(
    private readonly building: Building,
    strategy: ElevatorRoutingStrategy = new ScanRoutingStrategy(),
  ) {
    this.strategy = strategy;
  }

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

    const decision = this.strategy.decide(createRoutingContext(this.building));
    if (!decision) {
      this.building.elevator.setDirection(Direction.Idle);
      this.building.elevator.setState(ElevatorState.Idle);
      this.building.notifyElevatorUpdated();
      this.loopHandle = window.setTimeout(() => this.tick(), TIMING.idlePollMs);
      return;
    }

    void this.execute(decision);
  }

  private async execute(decision: ElevatorDecision): Promise<void> {
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
    const canBoardSame =
      !elevator.isFull &&
      this.building.waitingForDirection(floor, dir).length > 0;
    const willBeEmpty = elevator.passengerCount === leaving.length;
    const canBoardOpposite =
      willBeEmpty &&
      this.building.waitingForDirection(
        floor,
        dir === Direction.Up ? Direction.Down : Direction.Up,
      ).length > 0;

    if (leaving.length === 0 && !canBoardSame && !canBoardOpposite) {
      elevator.setState(ElevatorState.Idle);
      this.building.notifyElevatorUpdated();
      return;
    }

    const stopStarted = performance.now();
    elevator.setState(ElevatorState.Stopped);
    this.building.notifyElevatorStopped(floor, TIMING.doorStopMs);

    for (let i = 0; i < leaving.length; i++) {
      if (this.stopped) return;
      this.building.alightPerson(leaving[i].id);
      if (i < leaving.length - 1) {
        await this.delay(TIMING.boardStaggerMs);
      }
    }

    let boarded = 0;
    const boardNext = async (
      person: Person,
      flipDir?: TravelDir,
    ): Promise<boolean> => {
      if (this.stopped || elevator.isFull) return false;
      if (!this.building.boardPerson(person)) return false;
      boarded += 1;
      if (flipDir) elevator.setDirection(flipDir);
      await this.delay(TIMING.boardStaggerMs);
      return true;
    };

    const waiters = [...this.building.waitingForDirection(floor, dir)];
    for (const person of waiters) {
      if (!(await boardNext(person))) break;
    }

    // No same-direction boarders left: flip direction to take the opposite queue.
    if (elevator.isEmpty && boarded === 0) {
      const opposite: TravelDir =
        dir === Direction.Up ? Direction.Down : Direction.Up;
      const oppositeWaiters = [
        ...this.building.waitingForDirection(floor, opposite),
      ];
      for (const person of oppositeWaiters) {
        if (!(await boardNext(person, opposite))) break;
      }
    }

    // Do not depart before the last board/exit tween has time to finish.
    const elapsed = performance.now() - stopStarted;
    const animTail = boarded > 0 || leaving.length > 0 ? TIMING.boardMs : 0;
    const remaining = Math.max(TIMING.doorStopMs - elapsed, animTail);
    if (remaining > 0) {
      await this.delay(remaining);
    }

    if (
      elevator.isEmpty &&
      this.building.nearestWaitingFloor(floor) === null
    ) {
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
