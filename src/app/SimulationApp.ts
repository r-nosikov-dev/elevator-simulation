import { Application, Container } from 'pixi.js';
import { Group } from '@tweenjs/tween.js';
import { SimulationConfig } from '../config';
import { Building } from '../domain/Building';
import { DomainEvent, PersonState } from '../domain/types';
import { ElevatorController } from '../services/ElevatorController';
import { PersonSpawner } from '../services/PersonSpawner';
import {
  ElevatorRoutingStrategy,
  ScanRoutingStrategy,
} from '../services/routing';
import { BuildingView, createPixiApp } from '../view/BuildingView';
import { ElevatorView } from '../view/ElevatorView';
import { fitCanvasToHost } from '../view/fitCanvas';
import { maxVisibleQueueSlots } from '../view/layout';
import { PersonView } from '../view/PersonView';
import { QueueOverflowBadge } from '../view/QueueOverflowBadge';

export interface SimulationUiHooks {
  onDirectionChange?: (label: string, cssClass: string) => void;
}

export interface SimulationAppOptions {
  routingStrategy?: ElevatorRoutingStrategy;
}

export class SimulationApp {
  private app: Application | null = null;
  private building: Building | null = null;
  private spawner: PersonSpawner | null = null;
  private controller: ElevatorController | null = null;
  private buildingView: BuildingView | null = null;
  private elevatorView: ElevatorView | null = null;
  private readonly peopleLayer = new Container();
  private readonly overflowLayer = new Container();
  private readonly personViews = new Map<number, PersonView>();
  private readonly overflowBadges = new Map<number, QueueOverflowBadge>();
  private readonly tweenGroup = new Group();
  private unsubscribe: (() => void) | null = null;
  private tickerFn: ((ticker: { deltaMS: number }) => void) | null = null;
  private config: SimulationConfig;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private onWindowResize: (() => void) | null = null;
  private fitRaf = 0;
  private routingStrategy: ElevatorRoutingStrategy;

  constructor(
    private readonly host: HTMLElement,
    config: SimulationConfig,
    private readonly ui: SimulationUiHooks = {},
    options: SimulationAppOptions = {},
  ) {
    this.config = config;
    this.routingStrategy = options.routingStrategy ?? new ScanRoutingStrategy();
  }

  async start(): Promise<void> {
    this.destroyed = false;
    this.building = new Building(this.config);
    this.spawner = new PersonSpawner(this.building);
    this.controller = new ElevatorController(this.building, this.routingStrategy);

    this.app = await createPixiApp(this.config.floorCount);
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    this.host.replaceChildren(this.app.canvas);

    this.buildingView = new BuildingView(this.config.floorCount);
    this.elevatorView = new ElevatorView(
      this.building.elevator.snapshot(),
      this.config.floorCount,
      this.tweenGroup,
    );

    this.peopleLayer.removeChildren();
    this.overflowLayer.removeChildren();
    this.overflowBadges.clear();
    for (const floor of this.building.floors()) {
      const badge = new QueueOverflowBadge(this.config.floorCount);
      this.overflowBadges.set(floor, badge);
      this.overflowLayer.addChild(badge.container);
    }

    // Stage order: cabin under people, otherwise riders are hidden behind the cabin fill.
    this.app.stage.addChild(
      this.buildingView.root,
      this.elevatorView.container,
      this.peopleLayer,
      this.overflowLayer,
    );

    this.unsubscribe = this.building.subscribe((event) => this.onDomainEvent(event));

    this.tickerFn = () => {
      this.tweenGroup.update(performance.now());
    };
    this.app.ticker.add(this.tickerFn);

    this.bindResponsive();
    this.fitCanvas();

    this.spawner.start();
    this.controller.start();
    this.pushDirectionUi(this.building.elevator.snapshot().direction);
  }

  async restart(config: SimulationConfig): Promise<void> {
    await this.destroy();
    this.config = config;
    await this.start();
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.unbindResponsive();
    this.spawner?.stop();
    this.controller?.stop();
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.app && this.tickerFn) {
      this.app.ticker.remove(this.tickerFn);
    }
    this.tickerFn = null;

    for (const view of this.personViews.values()) {
      view.destroy();
    }
    this.personViews.clear();
    for (const badge of this.overflowBadges.values()) {
      badge.destroy();
    }
    this.overflowBadges.clear();
    this.overflowLayer.removeChildren();
    this.tweenGroup.removeAll();
    this.elevatorView?.destroy();
    this.elevatorView = null;
    this.buildingView = null;
    this.building = null;
    this.spawner = null;
    this.controller = null;

    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    this.host.replaceChildren();
  }

  private bindResponsive(): void {
    this.unbindResponsive();

    this.onWindowResize = () => this.scheduleFit();
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('orientationchange', this.onWindowResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
      this.resizeObserver.observe(this.host);
      const toolbar = document.querySelector('.toolbar');
      if (toolbar instanceof HTMLElement) {
        this.resizeObserver.observe(toolbar);
      }
    }
  }

  private unbindResponsive(): void {
    if (this.fitRaf) {
      cancelAnimationFrame(this.fitRaf);
      this.fitRaf = 0;
    }
    if (this.onWindowResize) {
      window.removeEventListener('resize', this.onWindowResize);
      window.removeEventListener('orientationchange', this.onWindowResize);
      this.onWindowResize = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private scheduleFit(): void {
    if (this.fitRaf) cancelAnimationFrame(this.fitRaf);
    this.fitRaf = requestAnimationFrame(() => {
      this.fitRaf = 0;
      this.fitCanvas();
    });
  }

  private fitCanvas(): void {
    if (!this.app || this.destroyed) return;
    fitCanvasToHost(this.app, this.host, {
      floorCount: this.config.floorCount,
    });
  }

  private onDomainEvent(event: DomainEvent): void {
    if (!this.building || !this.elevatorView) return;

    switch (event.type) {
      case 'person_spawned': {
        const view = new PersonView(
          event.person,
          this.config.floorCount,
          this.tweenGroup,
        );
        this.personViews.set(event.person.id, view);
        this.peopleLayer.addChild(view.container);

        view.walkToQueue(this.estimateQueueIndex(event.person.currentFloor), () => {
          const person = this.building?.getPerson(event.person.id);
          if (person) this.building?.enqueuePerson(person);
        });
        break;
      }

      case 'person_state_changed': {
        const view = this.personViews.get(event.person.id);
        if (!view) break;

        view.applySnapshot(event.person);

        if (event.person.state === PersonState.Waiting) {
          this.relayoutQueue(event.person.currentFloor);
        }

        if (event.person.state === PersonState.Riding) {
          view.setQueueVisible(true);
          const slot = this.building.elevator.snapshot().passengerIds.indexOf(event.person.id);
          view.boardCabin(Math.max(0, slot), this.elevatorView.cabinX, this.elevatorView.cabinY);
          this.relayoutAllQueues();
        }

        if (event.person.state === PersonState.Exiting) {
          view.setQueueVisible(true);
          view.exitToRight(() => {
            this.building?.removePerson(event.person.id);
          });
        }
        break;
      }

      case 'person_removed': {
        const view = this.personViews.get(event.personId);
        if (view) {
          view.destroy();
          this.personViews.delete(event.personId);
        }
        break;
      }

      case 'elevator_moved': {
        this.elevatorView.moveToFloor(
          event.toFloor,
          event.durationMs,
          () => this.syncRidingPeople(),
        );
        break;
      }

      case 'elevator_stopped':
        break;

      case 'elevator_updated': {
        this.elevatorView.applySnapshot(event.elevator);
        this.syncRidingPeople();
        this.pushDirectionUi(event.elevator.direction);
        break;
      }
    }
  }

  private syncRidingPeople(): void {
    if (!this.building || !this.elevatorView) return;
    const ids = this.building.elevator.snapshot().passengerIds;
    ids.forEach((id, slot) => {
      const view = this.personViews.get(id);
      if (!view || view.isBoarding) return;
      view.setCabinPosition(
        this.elevatorView!.cabinX,
        this.elevatorView!.cabinY,
        slot,
      );
    });
  }

  private estimateQueueIndex(floor: number): number {
    return this.building?.waitingOn(floor).length ?? 0;
  }

  private relayoutAllQueues(): void {
    if (!this.building) return;
    for (const floor of this.building.floors()) {
      this.relayoutQueue(floor);
    }
  }

  private relayoutQueue(floor: number): void {
    if (!this.building) return;

    const waiters = this.building.waitingOn(floor);
    const maxVisible = maxVisibleQueueSlots();
    const hidden = Math.max(0, waiters.length - maxVisible);

    waiters.forEach((person, index) => {
      const view = this.personViews.get(person.id);
      if (!view || person.state !== PersonState.Waiting) return;
      view.shiftInQueue(index);
    });

    this.overflowBadges.get(floor)?.update(floor, hidden);
  }

  private pushDirectionUi(direction: string): void {
    const map: Record<string, { label: string; css: string }> = {
      up: { label: 'Direction: UP ▲', css: 'up' },
      down: { label: 'Direction: DOWN ▼', css: 'down' },
      idle: { label: 'Direction: IDLE', css: 'idle' },
    };
    const info = map[direction] ?? map.idle;
    this.ui.onDirectionChange?.(info.label, info.css);
  }
}
