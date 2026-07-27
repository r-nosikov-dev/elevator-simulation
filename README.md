# Elevator Simulation

Multi-floor elevator simulator in **TypeScript**, **PIXI.js**, and **Tween.js**.

People spawn on floors, walk to the cabin, ride to their destination, and leave.  
Blue = up, green = down, digit = target floor. Cabin is on the left.

## Simulation rules

- **Floors:** 4–10  
- **Capacity:** 2–4 people  
- **Speed:** 1 floor per second  
- **Door stop:** 800 ms  
- **Spawn interval:** 4–10 seconds per floor  
- **Routing:** SCAN — skip empty floors, no mixed up/down  

## Run

Requires **Node.js** 18+.


```bash
npm install
npm run dev
```

```bash
npm run build    # production → dist/
npm run preview
```

Open the local URL from Vite (default `http://localhost:5173`).  
Use **Floors** / **Capacity** + **Apply & Restart** to reconfigure.

## Structure

```
src/
  config.ts           # timings, layout, colors, limits
  main.ts             # entry + UI controls
  domain/             # Building, Elevator, Person (pure state + events)
  services/           # spawner, controller, SCAN strategy
  view/               # PIXI + Tween rendering
  app/SimulationApp.ts
```

```
App  →  wires layers, start / destroy / restart
 │
 ├── Services  →  spawn + elevator loop, SCAN strategy
 ├── View       →  PIXI graphics, Tween motion
 └── Domain    →  state only, no rendering
```

Config lives in one place: `src/config.ts`.
