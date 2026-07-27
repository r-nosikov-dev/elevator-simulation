import { Elevator } from './Elevator';
import { Person } from './Person';
import { DomainEvent, FloorNumber, PersonState } from './types';
import { GROUND_FLOOR, SimulationConfig } from '../config';

export type DomainListener = (event: DomainEvent) => void;

export class Building {
  readonly floorCount: number;
  readonly elevator: Elevator;

  private readonly queues = new Map<FloorNumber, Person[]>();
  private readonly people = new Map<number, Person>();
  private readonly listeners = new Set<DomainListener>();

  constructor(config: SimulationConfig) {
    this.floorCount = config.floorCount;
    this.elevator = new Elevator(config.capacity, GROUND_FLOOR);

    for (let floor = GROUND_FLOOR; floor <= this.floorCount; floor++) {
      this.queues.set(floor, []);
    }
  }

  subscribe(listener: DomainListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: DomainEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  floors(): FloorNumber[] {
    return Array.from(
      { length: this.floorCount },
      (_, i) => GROUND_FLOOR + i,
    );
  }

  getPerson(id: number): Person | undefined {
    return this.people.get(id);
  }

  waitingOn(floor: FloorNumber): readonly Person[] {
    return this.queues.get(floor) ?? [];
  }

  waitingForDirection(
    floor: FloorNumber,
    dir: 'up' | 'down',
  ): Person[] {
    return this.waitingOn(floor).filter((p) => p.direction === dir);
  }

  hasWaitingOn(floor: FloorNumber): boolean {
    return (this.queues.get(floor)?.length ?? 0) > 0;
  }

  hasWaitingAbove(floor: FloorNumber): boolean {
    for (let f = floor + 1; f <= this.floorCount; f++) {
      if (this.hasWaitingOn(f)) return true;
    }
    return false;
  }

  hasWaitingBelow(floor: FloorNumber): boolean {
    for (let f = floor - 1; f >= GROUND_FLOOR; f--) {
      if (this.hasWaitingOn(f)) return true;
    }
    return false;
  }

  nearestWaitingFloor(from: FloorNumber): FloorNumber | null {
    let best: FloorNumber | null = null;
    let bestDist = Infinity;

    for (const floor of this.floors()) {
      if (!this.hasWaitingOn(floor)) continue;
      const dist = Math.abs(floor - from);
      if (dist < bestDist) {
        bestDist = dist;
        best = floor;
      }
    }
    return best;
  }

  extremeWaitingFloor(prefer: 'up' | 'down'): FloorNumber | null {
    const floors = this.floors().filter((f) => this.hasWaitingOn(f));
    if (floors.length === 0) return null;
    return prefer === 'up' ? Math.max(...floors) : Math.min(...floors);
  }

  addPerson(person: Person): void {
    this.people.set(person.id, person);
    this.emit({ type: 'person_spawned', person: person.snapshot() });
  }

  enqueuePerson(person: Person): void {
    if (person.state !== PersonState.WalkingToElevator) return;
    person.arriveAtQueue();
    const queue = this.queues.get(person.currentFloor);
    if (!queue) return;
    queue.push(person);
    this.emit({ type: 'person_state_changed', person: person.snapshot() });
  }

  boardPerson(person: Person): boolean {
    const queue = this.queues.get(person.currentFloor);
    if (!queue) return false;

    const idx = queue.findIndex((p) => p.id === person.id);
    if (idx === -1) return false;

    if (!this.elevator.board(person)) return false;

    queue.splice(idx, 1);
    this.emit({ type: 'person_state_changed', person: person.snapshot() });
    this.emit({ type: 'elevator_updated', elevator: this.elevator.snapshot() });
    return true;
  }

  alightPerson(personId: number): Person | null {
    const person = this.elevator.alight(personId);
    if (!person) return null;
    this.emit({ type: 'person_state_changed', person: person.snapshot() });
    this.emit({ type: 'elevator_updated', elevator: this.elevator.snapshot() });
    return person;
  }

  removePerson(personId: number): void {
    const person = this.people.get(personId);
    if (!person) return;
    person.finish();
    this.people.delete(personId);
    this.emit({ type: 'person_removed', personId });
  }

  notifyElevatorMoved(from: FloorNumber, to: FloorNumber, durationMs: number): void {
    this.emit({ type: 'elevator_moved', fromFloor: from, toFloor: to, durationMs });
    this.emit({ type: 'elevator_updated', elevator: this.elevator.snapshot() });
  }

  notifyElevatorStopped(floor: FloorNumber, durationMs: number): void {
    this.emit({ type: 'elevator_stopped', floor, durationMs });
    this.emit({ type: 'elevator_updated', elevator: this.elevator.snapshot() });
  }

  notifyElevatorUpdated(): void {
    this.emit({ type: 'elevator_updated', elevator: this.elevator.snapshot() });
  }
}
