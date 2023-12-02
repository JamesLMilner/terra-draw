# Common Patterns

### Changing Mode

Modes are added to Terra Draw when you instantiate it through the `modes` property like so:

```typescript
const draw = new TerraDraw({
  adapter: new TerraDrawLeafletAdapter({
    lib: L,
    map,
    coordinatePrecision: 9,
  }),
  modes: [
    new TerraDrawPolygonMode(), // Polygon mode has a builtin name 'polygon'
    new TerraDrawRenderMode({ modeName: "arbitary" }), // Render modes are given custom names
  ],
});

draw.start();
```

Once you have created a Terra Draw instance you can change mode by calling the `setMode` method and providing the mode name:

```typescript
// Change to our TerraDrawPolygonMode instance
draw.setMode("polygon");

// We can use our custom render mode name to change to it.
draw.setMode("arbitary");
```

The `mode` property represents the mode name and can be found in each modes source file. The available mode names are:

| Class                     | Mode Name       |
|---------------------------|-----------------|
| TerraDrawCircleMode       | 'circle'        |
| TerraDrawLineStringMode   | 'freehand'      |
| TerraDraqwGreatCircleMode | 'greatcircle'   |
| TerraDrawLineStringMode   | 'linestring'    |
| TerraDrawPointMode        | 'point'         |
| TerraDrawPolygonMode      | 'polygon'       |
| TerraDrawRectangleMode    | 'rectangle'     |
| TerraDrawSelectMode       | 'select'        |
| TerraDrawStaticMode       | 'static'        |


### Loading in External Data

It is common pattern to want to load in data from an external source (GeoJSON file, API call, etc). This can be achieved
with the `addFeatures` method on the Terra Draw instance. The method call works out which mode to add the feature based
on looking at its `mode` property in the Features `properties` property. All modes have a method
called `validateFeature` that ensures that a given feature is valid for the mode. For example if you wanted to add a
series of points to the TerraDrawPointMode you could do this by ensuring that the points you feed in have the `mode`
property set to `point`.

```javascript
points.forEach((point) => {
  point.properties.mode = "point";
});

draw.addFeatures(points);
```

### Render Contextual Data with TerraDrawRenderMode

If you just want to render some data onto the map without needing to add drawing data to it, you can
use `TerraDrawRenderMode` in combination with `addFeatures` like so:

```javascript
const draw = new TerraDraw({
  adapter: new TerraDrawLeafletAdapter({
    lib: L,
    map,
    coordinatePrecision: 9,
  }),
  modes: [new TerraDrawRenderMode({ modeName: "arbitary" })],
});

draw.start();

points.forEach((point) => {
  point.properties.mode = "arbitary";
});

draw.addFeatures(points);

// This will add the points to the TerraDrawRenderMode 'arbitary' rendering them to the screen
```

### Styling Selected Data

To style selected data you will want to past styles to the select mode you are using (probably TerraDrawSelectMode).

```typescript
const draw = new TerraDraw({
  adapter: new TerraDrawMapboxGLAdapter({
    map,
    coordinatePrecision: 9,
  }),
  modes: [
    new TerraDrawPolygonMode(),
    new TerraDrawSelectMode({
      flags: {
        polygon: {
          feature: {
            draggable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
            },
          },
        },
      },
      styles: {
        selectedPolygonColor: "#222222", // Any hex color you like
        selectedPolygonFillOpacity: 0.7, // 0 - 1
        selectedPolygonOutlineColor: "#333333", // Any hex color you like
        selectedPolygonOutlineWidth: 2, // Integer
      },
    }),
  ],
});

draw.start();
```

Please note at the moment it is not possible to style against specific modes but only universally against geometry
type (Point, LineString, Polygon)

### Styling Specific Features

Terra Draw supports styling overrides of individual features if required. This can be achieved by providing a styling
function rather than a string or a number to a feature. As an example here we can style each polygon feature as a random
color:

```typescript
// Function to generate a random hex color - can adjust as needed
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Cache for each feature id mapped to a hex color string
const colorCache: Record<string, HexColor> = {};

const draw = new TerraDraw({
  adapter: new TerraDrawMapboxGLAdapter({
    map, // Assume this is defined further up
    coordinatePrecision: 9,
  }),
  modes: [
    new TerraDrawPolygonMode({
      styles: {
        fillColor: ({ id }) => {
          // Get the color from the cache or generate a new one
          colorCache[id] = colorCache[id] || getRandomColor();
          return colorCache[id];
        },
      },
    }),
  ],
});

// Ensure the color cache is clead up on deletion of features
draw.on("delete", (ids) => ids.forEach((id) => delete cache[id]));
```

### Getting Features from a Mouse/Pointer Event

Getting features at a given mouse event can be done like so:

```typescript
document.addEventListener("mousemove", (event) => {
  const featuresAtMouseEvent = draw.getFeaturesAtPointerEvent(event, {
    pointerDistance: 40, // the number pixels to search around input point
    ignoreSelectFeatures: true,
  });
  console.log({ featuresAtMouseEvent });
});
```

The second argument is optional, with defaults set to ignoreSelectFeatures: false and pointerDistance: 30

### Getting Features at a given Longitude/Latitude

Getting features at a given longitude and latitude can be done like so:

```typescript
map.on("mousemove", (event) => {
  const { lng, lat } = event.lngLat;
  const featuresAtLngLat = draw.getFeaturesAtLngLat(
    { lng, lat },
    {
      pointerDistance: 40, // the number pixels to search around input point
      ignoreSelectFeatures: true,
    }
  );
  console.log({ featuresAtLngLat });
});
```

The second argument is optional, with defaults set to ignoreSelectFeatures: false and pointerDistance: 30

### Handling Draw Events

You can add callback functions to Terra Draw events like this:

```typescript
draw.on('change', (ids, type) => {
  //Done editing
  if (type === 'delete') {
    // Get the snapshot
    const snapshot = draw.getSnapshot()

    // Do something
    //...
  }
})
```

The other Terra Draw events are:

```typescript
draw.on('finish', (ids: string) => {
  // Do something
  //...
})

draw.on('change', (ids: string[], type: string) => {
  // Possible type values:
  // 'create'
  // 'update'
  // 'delete'
  // 'styling'

  // Do something
  //...
})

draw.on('select', (id: string) => {
  // Do something
  //...
})

draw.on('deselect', () => {
  // Do something
  //...
})
```
