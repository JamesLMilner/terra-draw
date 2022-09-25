import mapboxgl from "mapbox-gl";
import * as L from "leaflet";
import { Loader } from "@googlemaps/js-api-loader";

import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawFreehandMode,
  TerraDrawMapboxGLAdapter,
  TerraDrawLeafletAdapter,
  TerraDrawGoogleMapsAdapter,
} from "../../src/terra-draw";
import { addModeChangeHandler } from "../../common/addModeChangeHandler";
import { TerraDrawRenderMode } from "../../src/modes/render/render.mode";
import { getDefaultStyling } from "../../src/util/styling";

const getModes = () => {
  return {
    select: new TerraDrawSelectMode({
      flags: {
        arbitary: {
          feature: {},
        },
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
      },
    }),
    point: new TerraDrawPointMode(),
    linestring: new TerraDrawLineStringMode({
      allowSelfIntersections: false,
    }),
    polygon: new TerraDrawPolygonMode({
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
  };
};

let currentSelected: { button: undefined | HTMLButtonElement; mode: string } = {
  button: undefined,
  mode: "static",
};

const callbacks: Function[] = [];

document.addEventListener("mousemove", (event) => {
  callbacks.forEach((cb) => {
    cb(event);
  });
});

function HSLToHex(hsl: { h: number; s: number; l: number }): string {
  const { h, s, l } = hsl;

  const hDecimal = l / 100;
  const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

    // Convert to Hex and prefix with "0" if required
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function HexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    throw new Error("Could not parse Hex Color");
  }

  const rHex = parseInt(result[1], 16);
  const gHex = parseInt(result[2], 16);
  const bHex = parseInt(result[3], 16);

  const r = rHex / 255;
  const g = gHex / 255;
  const b = bHex / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = (max + min) / 2;
  let s = h;
  let l = h;

  if (max === min) {
    // Achromatic
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    case b:
      h = (r - g) / d + 4;
      break;
  }
  h /= 6;

  s = s * 100;
  s = Math.round(s);
  l = l * 100;
  l = Math.round(l);
  h = Math.round(360 * h);

  return { h, s, l };
}

function genColor(seed: number) {
  let color = Math.floor(Math.abs(Math.sin(seed) * 16777215));
  let colorStr = color.toString(16);
  // pad any colors shorter than 6 characters with leading 0s
  while (colorStr.length < 6) {
    colorStr = "0" + colorStr;
  }

  return "#" + colorStr;
}

function getRounded(N: number) {
  return Math.ceil(N / 100) * 100;
}

const c = { lastMousePos: { x: 0, y: 0 }, color: genColor(1000) };

const mouseMoveSetStyle = (draw: TerraDraw) => {
  const pair = (x: number, y: number) => {
    return x >= y ? x * x + x + y : y * y + x;
  };

  callbacks.push((event: MouseEvent) => {
    console.log("event");

    const previousPaired = getRounded(pair(c.lastMousePos.x, c.lastMousePos.y));

    const paired = getRounded(pair(event.x, event.y));
    const hslColor = HexToHSL(c.color);

    console.log(hslColor, previousPaired, paired);

    if (previousPaired > paired) {
      hslColor.h = hslColor.h - 1;
    } else if (previousPaired < paired) {
      hslColor.h = hslColor.h + 1;
    }

    c.color = HSLToHex({
      h: Math.round(hslColor.h),
      s: hslColor.s,
      l: hslColor.l,
    });

    c.lastMousePos.x = event.x;
    c.lastMousePos.y = event.y;

    console.log(c.color);

    if (draw) {
      draw.setModeStyling(draw.getCurrentMode(), {
        polygonFillColor: c.color,
        polygonOutlineColor: c.color,
        polygonOutlineWidth: 4,
        polygonFillOpacity: 0.3,
        pointColor: c.color,
        pointOutlineColor: c.color,
        pointWidth: 6,
        lineStringColor: c.color,
        lineStringWidth: 4,
        selectedColor: c.color,
        selectedPointOutlineColor: c.color,
        selectionPointWidth: 6,
        midPointColor: c.color,
        midPointOutlineColor: c.color,
        midPointWidth: 4,
      });
    }
  });
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

    // const dataString = localStorage.getItem("snapshot");

    // console.log(dataString, Boolean(dataString));
    // const data = Boolean(dataString) ? JSON.parse(dataString) : undefined;

    const draw = new TerraDraw({
      adapter: new TerraDrawLeafletAdapter({
        lib: L,
        map,
        coordinatePrecision: 9,
      }),
      modes: getModes(),
      // data,
    });

    draw.start();

    addModeChangeHandler(draw, currentSelected);

    this.initialised.push("leaflet");

    mouseMoveSetStyle(draw);
  },
  initMapbox(id: string, accessToken: string | undefined) {
    if (this.initialised.includes("mapbox")) {
      return;
    }

    if (!accessToken) {
      return;
    }

    const { lng, lat, zoom } = this;

    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: id, // container ID
      style: "mapbox://styles/mapbox/streets-v11", // style URL
      center: [lng, lat], // starting position [lng, lat]
      zoom: zoom, // starting zoom
    });

    map.on("style.load", () => {
      const draw = new TerraDraw({
        adapter: new TerraDrawMapboxGLAdapter({
          map,
          coordinatePrecision: 9,
        }),
        modes: getModes(),
        // data: uk.features.map((feature) => {
        //   feature.properties = feature.properties || {};
        //   (feature.properties as any).mode = "arbitary";
        // }) as any,
      });

      draw.start();

      addModeChangeHandler(draw, currentSelected);

      mouseMoveSetStyle(draw);
    });
    this.initialised.push("mapbox");
  },
  initGoogleMaps(id: string, apiKey: string | undefined) {
    if (this.initialised.includes("google")) {
      return;
    }

    if (!apiKey) {
      return;
    }

    const loader = new Loader({
      apiKey,
      version: "weekly",
    });

    loader.load().then((google) => {
      const map = new google.maps.Map(
        document.getElementById(id) as HTMLElement,
        {
          center: { lat: this.lat, lng: this.lng },
          zoom: this.zoom,
          clickableIcons: false,
        }
      );

      map.addListener("projection_changed", () => {
        const draw = new TerraDraw({
          adapter: new TerraDrawGoogleMapsAdapter({
            lib: google.maps,
            map,
            coordinatePrecision: 9,
          }),
          modes: getModes(),
        });
        draw.start();

        addModeChangeHandler(draw, currentSelected);

        this.initialised.push("google");

        mouseMoveSetStyle(draw);
      });
    });
  },
};

console.log(process.env);

example.initLeaflet("leaflet-map");
example.initMapbox("mapbox-map", process.env.MAPBOX_ACCESS_TOKEN);
example.initGoogleMaps("google-map", process.env.GOOGLE_API_KEY);
document.addEventListener("keyup", (event) => {
  (document.getElementById("keybind") as HTMLButtonElement).innerHTML =
    event.key;
});
