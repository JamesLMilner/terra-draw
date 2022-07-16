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
  TerraDrawMapboxGLAdapter,
  TerraDrawLeafletAdapter,
  TerraDrawGoogleMapsAdapter,
} from "terra-draw";

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

    const adapter = new TerraDrawLeafletAdapter({
      lib: L,
      map,
      coordinatePrecision: 9,
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

    // draw.on("select", (id) => {
    //   console.log("selected", id);
    // });

    // draw.on("deselect", () => {
    //   console.log("deselected");
    // });

    // draw.on("change", (id, changeType) => {
    //   console.log("feature changed", id, changeType);
    // });

    ["select", "point", "linestring", "polygon", "circle"].forEach((mode) => {
      document.getElementById(mode).addEventListener("click", () => {
        draw.changeMode(mode);
      });
    });

    this.initialised.push("leaflet");
  },
  initMapbox(id: string, accessToken: string) {
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
      const adapter = new TerraDrawMapboxGLAdapter({
        map,
        coordinatePrecision: 9,
      });
      const draw = new TerraDraw(adapter, {
        select: new TerraDrawSelectMode(),
        point: new TerraDrawPointMode(),
        linestring: new TerraDrawLineStringMode({
          styling: {
            lineStringColor: "#1B821E",
            lineStringWidth: 8,
          },
          allowSelfIntersections: false,
        }),
        polygon: new TerraDrawPolygonMode({
          allowSelfIntersections: false,
          styling: {
            polygonFillColor: "#ff0000",
            polygonOutlineColor: "#00ff2d",
          },
        }),
        circle: new TerraDrawCircleMode(),
      });
      draw.start();

      // draw.on("select", (id) => {
      //   console.log("selected", id);
      // });

      // draw.on("deselect", () => {
      //   console.log("deselected");
      // });

      ["select", "point", "linestring", "polygon", "circle"].forEach((mode) => {
        document.getElementById(mode).addEventListener("click", () => {
          draw.changeMode(mode);
        });
      });
    });
    this.initialised.push("mapbox");
  },
  initGoogleMaps(id: string, apiKey: string) {
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
          center: { lat: this.lat, lng: this.lat },
          zoom: this.zoom,
          clickableIcons: false,
        }
      );

      const adapter = new TerraDrawGoogleMapsAdapter({
        lib: google.maps,
        map,
        coordinatePrecision: 9,
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

      ["select", "point", "linestring", "polygon", "circle"].forEach((mode) => {
        document.getElementById(mode).addEventListener("click", () => {
          draw.changeMode(mode);
        });
      });

      this.initialised.push("google");
    });
  },
};

example.initGoogleMaps(
  "google-map",
  process.env.MODE === "dev" ? process.env.GOOGLE_API_KEY : ""
);

example.initLeaflet("leaflet-map");

example.initMapbox(
  "mapbox-map",
  process.env.MODE === "dev" ? process.env.MAPBOX_ACCESS_TOKEN : ""
);
