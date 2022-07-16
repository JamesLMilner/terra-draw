# Terra Draw

![Terra Draw CI Badge](https://github.com/JamesLMilner/terra-draw/actions/workflows/ci.yml/badge.svg)

Frictionless map drawing across mapping providers.

TerraDraw centralises map drawing logic and provides a host of out the box drawing modes that work across map providers (currently Leaflet, Mapbox, Google) via adapters.

## Basic Example

Here's how you'd intiate Terra Draw with a Leaflet map:

```typescript
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawLeafletAdapter,
} from "terra-draw";

const map = L.map(id, {
  center: [0, 0],
  zoom: 12,
});

const adapter = new TerraDrawLeafletAdapter({
  lib: L,
  map: map,
});

const draw = new TerraDraw(adapter, {
  select: new TerraDrawSelectMode(),
  point: new TerraDrawPointMode(),
  linestring: new TerraDrawLineStringMode({
    allowSelfIntersections: false,
  }),
  polygon: new TerraDrawPolygonMode({
    allowSelfIntersections: false,
  }),
  circle: new TerraDrawCircleMode(),
});

draw.start();
draw.changeMode("point");
```

# License

MIT
