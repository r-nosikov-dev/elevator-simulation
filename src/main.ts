import { clampConfig, CONFIG_LIMITS, SimulationConfig } from './config';
import { SimulationApp } from './app/SimulationApp';

function floorsInput(): HTMLInputElement {
  return document.getElementById('floors-input') as HTMLInputElement;
}

function capacityInput(): HTMLInputElement {
  return document.getElementById('capacity-input') as HTMLInputElement;
}

function readConfigFromUi(): SimulationConfig {
  return clampConfig({
    floorCount: Number(floorsInput().value),
    capacity: Number(capacityInput().value),
  });
}

function syncInputs(config: SimulationConfig): void {
  const floors = floorsInput();
  const capacity = capacityInput();
  floors.min = String(CONFIG_LIMITS.floorCount.min);
  floors.max = String(CONFIG_LIMITS.floorCount.max);
  floors.value = String(config.floorCount);
  capacity.min = String(CONFIG_LIMITS.capacity.min);
  capacity.max = String(CONFIG_LIMITS.capacity.max);
  capacity.value = String(config.capacity);
}

function setDirectionLabel(text: string, cssClass: string): void {
  const el = document.getElementById('direction-label');
  if (!el) return;
  el.textContent = text;
  el.className = `direction ${cssClass}`;
}

async function bootstrap(): Promise<void> {
  const host = document.getElementById('canvas-host');
  if (!host) throw new Error('#canvas-host not found');

  const initial = clampConfig({});
  syncInputs(initial);

  const sim = new SimulationApp(host, initial, {
    onDirectionChange: setDirectionLabel,
  });

  await sim.start();

  const applyBtn = document.getElementById('apply-btn');
  applyBtn?.addEventListener('click', async () => {
    const next = readConfigFromUi();
    syncInputs(next);
    applyBtn.setAttribute('disabled', 'true');
    try {
      await sim.restart(next);
    } finally {
      applyBtn.removeAttribute('disabled');
    }
  });
}

bootstrap().catch((err) => {
  console.error(err);
  const host = document.getElementById('canvas-host');
  if (host) {
    host.innerHTML = `<p class="error">Failed to start simulation: ${String(err)}</p>`;
  }
});
