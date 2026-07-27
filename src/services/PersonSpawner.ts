import { GROUND_FLOOR, TIMING } from '../config';
import { Building } from '../domain/Building';
import { Person, resetPersonIdCounter } from '../domain/Person';
import { FloorNumber } from '../domain/types';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export class PersonSpawner {
  private timers = new Map<FloorNumber, number>();
  private running = false;

  constructor(private readonly building: Building) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    resetPersonIdCounter();

    for (const floor of this.building.floors()) {
      this.scheduleFloor(floor);
    }
  }

  stop(): void {
    this.running = false;
    for (const handle of this.timers.values()) {
      window.clearTimeout(handle);
    }
    this.timers.clear();
  }

  private scheduleFloor(floor: FloorNumber): void {
    if (!this.running) return;

    const delay = randomBetween(TIMING.spawnMinMs, TIMING.spawnMaxMs);
    const handle = window.setTimeout(() => {
      this.spawnOn(floor);
      this.scheduleFloor(floor);
    }, delay);

    this.timers.set(floor, handle);
  }

  private spawnOn(floor: FloorNumber): void {
    if (!this.running) return;

    let target: FloorNumber;
    do {
      target = randomInt(GROUND_FLOOR, this.building.floorCount);
    } while (target === floor);

    this.building.addPerson(new Person(floor, target));
  }
}
