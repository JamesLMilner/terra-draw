# Variable naming

Use full words for variable names. Do not use abbreviations unless they are widely accepted in the industry (e.g. "id" for "identifier"). For example, use "feature" instead of "feat" and "coordinates" instead of "coords", "index" instead of "idx", "distance" instead of "dist", "event" instead of "evt" or "e", etc.

Avoid single line if statements. For example, instead of writing:

```typescript
if (condition) doSomething();
```

Write:

```typescript
if (condition) {
  doSomething();
}
```

# File Changing

Do not change configuration files or .github folder files unless explicitly requested to

# Command usage

You should not need to use mutating git commands unless explicitly requested to

# Testing

For tests Terra Draw uses Jest. You can run tests with:

npm run test

If we are only making changes to one file, for example polygon.mode.spec.ts, you can run:

COVERAGE_THRESHOLD=false npm run test polygon.mode.spec.ts 

You do not need to run tests when making changes to Markdown files.

Generally attempt to avoid using toBeGreaterThan, toBeLessThan, toBeCloseTo or any other matcher that is not deterministic.

# Dependencies

Terra Draw is a standalone library and does not have any external dependencies, except for development. You should not need to install any additional dependencies.

# GeoJSON

Terra Draw uses GeoJSON as the format for all geometries and features. You should be familiar with the GeoJSON specification when making changes to Terra Draw. At the moment Terra Draw only supports a subset of GeoJSON Geometry types: Point, LineString, Polygon. 

# Modes

Terra Draw uses a mode based system for drawing and editing features. Each mode allows for drawing or editing a specific type of feature or for selecting features. The builtin modes are: TerraDrawPointMode, TerraDrawLineStringMode, TerraDrawPolygonMode, TerraDrawCircleMode, TerraDrawRectangleMode, TerraDrawAngledRectangleMode, TerraDrawSectorMode, TerraDrawSensorMode and TerraDrawSelectMode. 

Only one mode can be active at a time, but multiple modes can be registered to the Terra Draw instance. Features can only be selected by one select mode at a time, but there can be multiple select modes registered to the Terra Draw instance. Each mode has a unique name, which is used to activate the mode. The default name for a mode is provided by the 'mode' property of the Class, but this can be overridden by passing a "modeName" property in the constructor when creating the mode.
