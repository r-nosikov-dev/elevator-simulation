import { Direction, FloorNumber, PersonSnapshot, PersonState } from './types';

let nextPersonId = 1;

export function resetPersonIdCounter(): void {
  nextPersonId = 1;
}

export class Person {
  readonly id: number;
  readonly targetFloor: FloorNumber;
  readonly direction: Direction.Up | Direction.Down;

  private _currentFloor: FloorNumber;
  private _state: PersonState;

  constructor(spawnFloor: FloorNumber, targetFloor: FloorNumber) {
    if (spawnFloor === targetFloor) {
      throw new Error('Person target floor must differ from spawn floor');
    }

    this.id = nextPersonId++;
    this._currentFloor = spawnFloor;
    this.targetFloor = targetFloor;
    this.direction =
      targetFloor > spawnFloor ? Direction.Up : Direction.Down;
    this._state = PersonState.WalkingToElevator;
  }

  get currentFloor(): FloorNumber {
    return this._currentFloor;
  }

  get state(): PersonState {
    return this._state;
  }

  get isWaiting(): boolean {
    return this._state === PersonState.Waiting;
  }

  get isRiding(): boolean {
    return this._state === PersonState.Riding;
  }

  wantsDirection(dir: Direction.Up | Direction.Down): boolean {
    return this.direction === dir;
  }

  arriveAtQueue(): void {
    this._state = PersonState.Waiting;
  }

  board(): void {
    this._state = PersonState.Riding;
  }

  updateFloor(floor: FloorNumber): void {
    this._currentFloor = floor;
  }

  startExiting(): void {
    this._state = PersonState.Exiting;
  }

  finish(): void {
    this._state = PersonState.Done;
  }

  snapshot(): PersonSnapshot {
    return {
      id: this.id,
      currentFloor: this._currentFloor,
      targetFloor: this.targetFloor,
      direction: this.direction,
      state: this._state,
    };
  }
}
