import * as L from "leaflet";
import area from "@turf/area";
import length from "@turf/length";

import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawFreehandMode,
  TerraDrawLeafletAdapter,
} from "../../src/terra-draw";
import { addModeChangeHandler } from "../../common/addModeChangeHandler";
import { TerraDrawRenderMode } from "../../src/modes/render/render.mode";

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
            arbitary: {
              feature: {},
            },
            polygon: {
              feature: {
                scaleable: true,
                rotateable: true,
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
          snapping: true,
          allowSelfIntersections: false,
        }),
        polygon: new TerraDrawPolygonMode({
          // snapping: true,
          allowSelfIntersections: false,
        }),
        circle: new TerraDrawCircleMode(),
        freehand: new TerraDrawFreehandMode(),
        arbitary: new TerraDrawRenderMode({
          styling: {
            polygonFillColor: "#4357AD",
            polygonOutlineColor: "#48A9A6",
            polygonOutlineWidth: 2,
          },
        }),
      },
    });

    draw.start();

    const getHHMMSS = (timestamp: number) =>
      new Date(timestamp).toTimeString().split(" ")[0];

    const setInfo = function () {
      const snapshot = draw.getSnapshot();
      const features = snapshot.filter(
        (f) => !f.properties.selectionPoint && !f.properties.midPoint
      );

      const selected = snapshot.find((f) => f.properties.selected);
      const div = document.getElementById("info");

      if (!div) {
        return;
      }

      div.innerHTML = `
      <div class="current">
        <h3> Current Feature </h3>
        <span><b>ID</b> ${selected ? selected.id : "N/A"} </span>
        <span><b>Geometry Type</b> ${
          selected ? selected.geometry.type : "N/A"
        } </span>
        <span><b>Created</b> ${
          selected ? getHHMMSS(selected.properties.createdAt as number) : "N/A"
        } </span>
        <span><b>Updated</b> ${
          selected ? getHHMMSS(selected.properties.updatedAt as number) : "N/A"
        } </span>
        <span><b>Coordinates</b> ${
          selected && selected.geometry.type === "Polygon"
            ? selected.geometry.coordinates[0].length
            : selected && selected.geometry.type === "LineString"
            ? selected.geometry.coordinates.length
            : "N/A"
        }</b> </span>
        ${
          selected && selected.geometry.type === "Polygon"
            ? `<span><b>Area (m2)</b> ${area(selected).toFixed(2)} </span>`
            : ""
        }
        ${
          selected && selected.geometry.type === "LineString"
            ? `<span><b>Length (km)</b> ${length(selected).toFixed(2)} </span>`
            : ""
        }
      </div>

      <div class="all">
        <h3> All Features </h3>
        <span><b>Total</b> ${features.length}</span>
        <span><b>Polygons:</b> ${
          features.filter((f) => f.geometry.type === "Polygon").length
        }</span>
        <span><b>LineStrings:</b> ${
          features.filter((f) => f.geometry.type === "LineString").length
        }</span>
        <span><b>Points:</b> ${
          features.filter((f) => f.geometry.type === "Point").length
        }</span>
      </div>
    `;
    };

    setInfo();

    draw.on("change", () => {
      setInfo();
    });

    addModeChangeHandler(draw, currentSelected);

    this.initialised.push("leaflet");
  },
};

example.initLeaflet("leaflet-map");
