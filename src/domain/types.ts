export enum Direction {
  Up = 'up',
  Down = 'down',
  Idle = 'idle',
}

export enum PersonState {
  WalkingToElevator = 'walking_to_elevator',
  Waiting = 'waiting',
  Riding = 'riding',
  Exiting = 'exiting',
  Done = 'done',
}

export enum ElevatorState {
  Idle = 'idle',
  Moving = 'moving',
  Stopped = 'stopped',
}

export type FloorNumber = number;

export interface PersonSnapshot {
  id: number;
  currentFloor: FloorNumber;
  targetFloor: FloorNumber;
  direction: Direction.Up | Direction.Down;
  state: PersonState;
}

export interface ElevatorSnapshot {
  currentFloor: FloorNumber;
  direction: Direction;
  state: ElevatorState;
  passengerIds: number[];
  freeSeats: number;
}

export type DomainEvent =
  | { type: 'person_spawned'; person: PersonSnapshot }
  | { type: 'person_state_changed'; person: PersonSnapshot }
  | { type: 'person_removed'; personId: number }
  | { type: 'elevator_updated'; elevator: ElevatorSnapshot }
  | { type: 'elevator_moved'; fromFloor: FloorNumber; toFloor: FloorNumber; durationMs: number }
  | { type: 'elevator_stopped'; floor: FloorNumber; durationMs: number };
