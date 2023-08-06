# Common Patterns

### Changing Mode

To change mode we need to set the current mode to match the name of the mode we want. You can see the name of the mode in each modes 'mode' property in the modes source file. For convenience here are the built in mode names listed out:

* TerraDrawStaticMode - 'static' 
* TerraDrawPolygonMode - 'polygon'
* TerraDrawPointMode - 'point'
* TerraDrawCircleMode - 'circle'
* TerraDrawLineStringMode - 'linestring'
* TerraDrawSelectMode - 'select'
* TerraDrawLineStringMode - 'freehand'
* TerraDraqwGreatCircleMode - 'greatcircle'

We can then create these modes and change to them like so:

```typescript
const draw = new TerraDraw({
	adapter: new TerraDrawLeafletAdapter({
		lib: L,
		map,
		coordinatePrecision: 9,
	}),
	modes: [
		new TerraDrawPolygonMode(), // Polygon mode has a builtin name 'polygon'
		new TerraDrawRenderMode({ modeName: 'arbitary' }) // Render modes are given custom names
	],
});

draw.start();

// Change to our TerraDrawPolygonMode instance
draw.setMode('polygon')

// We can use our custom render mode name to change to it.
draw.setMode('arbitary') 

```


### Loading in External Data

It is common pattern to want to load in data from an external source (GeoJSON file, API call, etc). This can be achieved with the `addFeatures` method on the Terra Draw instance. The method call works out which mode to add the feature based on looking at its `mode` property in the Features `properties` property. All modes have a method called `validateFeature` that ensures that a given feature is valid for the mode. For example if you wanted to add a series of points to the TerraDrawPointMode you could do this by ensuring that the points you feed in have the `mode` property set to `point`.

```javascript
points.forEach((point) => {
	point.properties.mode = "point";
});

draw.addFeatures(points);
```

### Render Contextual Data with TerraDrawRenderMode

If you just want to render some data onto the map without needing to add drawing data to it, you can use `TerraDrawRenderMode` in combination with `addFeatures` like so:

```javascript
const draw = new TerraDraw({
	adapter: new TerraDrawLeafletAdapter({
		lib: L,
		map,
		coordinatePrecision: 9,
	}),
	modes: [new TerraDrawRenderMode({ modeName: 'arbitary' })],
});

draw.start();

points.forEach((point) => {
	point.properties.mode = "arbitary";
});

draw.addFeatures(points);

// This will add the points to hte TerraDrawRenderMode 'arbitary' rendering them to the screen
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
	]
});

draw.start();
```

Please note at the moment it is not possible to style against specific modes but only universally against geometry type (Point, LineString, Polygon)

### Styling Specific Features

Terra Draw supports styling overrides of individual features if required. This can be achieved by providing a styling function rather than a string or a number to a feature. As an example here we can style each polygon feature as a random color:

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
	]
});

// Ensure the color cache is clead up on deletion of features
draw.on("delete", (ids) => ids.forEach((id) => delete cache[id]));
```
