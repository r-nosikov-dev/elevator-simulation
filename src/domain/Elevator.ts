import { GROUND_FLOOR } from '../config';
import { Person } from './Person';
import {
  Direction,
  ElevatorSnapshot,
  ElevatorState,
  FloorNumber,
} from './types';

// Holds cabin state only; where to go next is decided by routing Strategy.
export class Elevator {
  private _currentFloor: FloorNumber;
  private _direction: Direction = Direction.Idle;
  private _state: ElevatorState = ElevatorState.Idle;
  private readonly _passengers = new Map<number, Person>();

  constructor(
    readonly capacity: number,
    startFloor: FloorNumber = GROUND_FLOOR,
  ) {
    this._currentFloor = startFloor;
  }

  get currentFloor(): FloorNumber {
    return this._currentFloor;
  }

  get direction(): Direction {
    return this._direction;
  }

  get state(): ElevatorState {
    return this._state;
  }

  get passengers(): readonly Person[] {
    return [...this._passengers.values()];
  }

  get passengerCount(): number {
    return this._passengers.size;
  }

  get freeSeats(): number {
    return this.capacity - this._passengers.size;
  }

  get isFull(): boolean {
    return this.freeSeats <= 0;
  }

  get isEmpty(): boolean {
    return this._passengers.size === 0;
  }

  setDirection(direction: Direction): void {
    this._direction = direction;
  }

  setState(state: ElevatorState): void {
    this._state = state;
  }

  setFloor(floor: FloorNumber): void {
    this._currentFloor = floor;
    for (const person of this._passengers.values()) {
      person.updateFloor(floor);
    }
  }

  board(person: Person): boolean {
    if (this.isFull) return false;
    if (person.currentFloor !== this._currentFloor) return false;
    person.board();
    this._passengers.set(person.id, person);
    return true;
  }

  passengersToAlight(): Person[] {
    return this.passengers.filter((p) => p.targetFloor === this._currentFloor);
  }

  alight(personId: number): Person | null {
    const person = this._passengers.get(personId);
    if (!person) return null;
    this._passengers.delete(personId);
    person.startExiting();
    return person;
  }

  hasPassengersToward(dir: Direction.Up | Direction.Down): boolean {
    return this.passengers.some((p) => p.wantsDirection(dir));
  }

  extremePassengerDestination(dir: Direction.Up | Direction.Down): FloorNumber | null {
    if (this.isEmpty) return null;
    const floors = this.passengers.map((p) => p.targetFloor);
    return dir === Direction.Up ? Math.max(...floors) : Math.min(...floors);
  }

  snapshot(): ElevatorSnapshot {
    return {
      currentFloor: this._currentFloor,
      direction: this._direction,
      state: this._state,
      passengerIds: this.passengers.map((p) => p.id),
      freeSeats: this.freeSeats,
    };
  }
}
