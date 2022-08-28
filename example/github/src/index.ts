import * as L from "leaflet";

import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawFreehandMode,
  TerraDrawLeafletAdapter,
} from "../../../src/terra-draw";
import { addModeChangeHandler } from "../../common/addModeChangeHandler";

let currentSelected: { button: undefined | HTMLButtonElement; mode: string } = {
  button: undefined,
  mode: "static",
};

const example = {
  lng: -0.118092,
  lat: 51.509865,
  zoom: 12,
  initialised: [] as string[],
  initLeaflet(id: string) {
    if (this.initialised.includes("leaflet")) {
      return;
    }

    const { lng, lat, zoom } = this;

    const map = L.map(id, {
      center: [lat, lng],
      zoom: zoom + 1, // starting zoom
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const draw = new TerraDraw({
      adapter: new TerraDrawLeafletAdapter({
        lib: L,
        map,
        coordinatePrecision: 9,
      }),
      modes: {
        select: new TerraDrawSelectMode({
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
            linestring: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            circle: {
              feature: {
                draggable: true,
              },
            },
            point: {
              feature: {
                draggable: true,
              },
            },
            freehand: {
              feature: {
                draggable: true,
              },
            },
          },
        }),
        point: new TerraDrawPointMode(),
        linestring: new TerraDrawLineStringMode({
          allowSelfIntersections: false,
        }),
        polygon: new TerraDrawPolygonMode({
          // snapping: true,
          allowSelfIntersections: false,
        }),
        circle: new TerraDrawCircleMode(),
        freehand: new TerraDrawFreehandMode(),
      },
    });

    draw.start();

    addModeChangeHandler(draw, currentSelected);

    this.initialised.push("leaflet");
  },
};

example.initLeaflet("leaflet-map");
