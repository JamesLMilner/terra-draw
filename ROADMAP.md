## Roadmap

A simple file for tracking

## Doing

- Create demo that can run on GitHub

## To do

### Bugs

- Cross Provider
  - Bug: Possible to create zero area polygons which are unselectable
  - Bug: Snapping can snap to same coordinate mulitple times (idential coordinate proptection?)
  - Bug: Dragging doesn't trigger dragging cursor on mouse down
- Mapbox
  - Bug (Mapbox): More robust implementation for fixing zIndexing for layers for Mapbox
  - Bug (Mapbox): When drawing second coordinate the line can stop rendering at certain angles
- Google Maps
  - Bug (Google Maps): Figure out why Polygons move so much slower selection points when dragged
  - Bug (Google Maps): Does not respect midpoint insertion crosshair

### Chores

- Chore: Refactor select mode
- Chore: Figure a more robust way to handle project/unproject in tests
- Chore: Identical coordinate protection
- Chore: Type properties for different mode features

Could Do:

- Consider Tablets/Mobile devices
- Feature: Undo/Redo
- Feature: Rotation, Scale, Simplification etc

## Done

- Bug: Can drag feature when cursor is not dragging over the feature
- Bug (Leaflet): Dragging coordinate deselects coordinate after drag
- Feature: Select renders Polygon and LineString coordinates
- Feature: Drag drawn feature
- Feature: Configurable keybindings
- Bug: Can't drag any more
- Chore: Make store take an array for updates/create etc
- Chore: Use Position instead of [number,number] for typing
- Feature: Set cursor
- Chore: Lifecycle state machine - registered -> start -> stop
- Chore: Create mock terra draw config
- Feature: Drag coordinates
- Chore: Code coverage back to 100% - test custom key bindings
- Chore: Spatial indexing
- Bug (Mapbox): Correct zIndexing for layers for Mapbox
- Feature: Snapping
- Feature: Insert midpoints
- Chore: Remove geometry logic from selection mode
- Feature: Right click to delete coordinate
- Chore: Show crosshairs when on inserting midpoints
- Bug (Mapbox): First two points of Mapbox Adapter polygons don't render
