import { Feature, Polygon } from "geojson";
import { selfIntersects } from "./self-intersects";

describe("Geometry", () => {
	describe("selfIntersects", () => {
		describe("points", () => {
			it("throws an error", () => {
				expect(() => {
					selfIntersects({
						type: "Feature",
						properties: {},
						geometry: {
							type: "Point",
							coordinates: [17.138671875, 25.799891182088334],
						},
					} as any);
				}).toThrowError();
			});
		});

		describe("polygons", () => {
			it("polygon does not self intersect", () => {
				expect(
					selfIntersects({
						type: "Feature",
						properties: {},
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[17.138671875, 25.799891182088334],
									[-29.619140624999996, -7.623886853120036],
									[19.072265625, -17.056784609942543],
									[17.138671875, 25.799891182088334],
								],
							],
						},
					} as Feature<Polygon>),
				).toBe(false);
			});

			it("does self intersect", () => {
				expect(
					selfIntersects({
						type: "Feature",
						properties: {},
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[11.162109375, 23.322080011],
									[-21.884765625, -8.928487062],
									[26.894531249, -20.468189222],
									[-13.974609375, 22.187404991],
									[11.162109375, 23.322080011],
								],
							],
						},
					}),
				).toBe(true);
			});

			it("end0[0] === start0[0]", () => {
				expect(
					selfIntersects({
						type: "Feature",
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[-0.13302653979528145, 51.52407231626705],
									[-0.15602916430734126, 51.50227882879821],
									[-0.12564510058675182, 51.49960734108916],
									[-0.10264247607344146, 51.53080055095097],
									[-0.11946529101425085, 51.535926157660185],
									[-0.11946529101425085, 51.535819380073946],
								],
							],
						},
						properties: {},
					}),
				).toBe(false);
			});

			it("denom === 0", () => {
				expect(
					selfIntersects({
						type: "Feature",
						geometry: {
							type: "Polygon",
							coordinates: [
								[
									[-0.13319820117257564, 51.51809082850298],
									[-0.1508793229983496, 51.50014165115911],
									[-0.1189503068851252, 51.497042565557365],
									[-0.1507076616217944, 51.5089034425682],
									[-0.1507076616217944, 51.5089034425682],
								],
							],
						},
						properties: {},
					}),
				).toBe(true);
			});
		});

		describe("linestring", () => {
			expect(
				selfIntersects({
					type: "Feature",
					properties: {},
					geometry: {
						type: "LineString",
						coordinates: [
							[1.23046875, 26.667095801104814],
							[-22.060546874999996, -7.01366792756663],
							[16.5234375, -12.64033830684679],
						],
					},
				}),
			).toBe(false);

			expect(
				selfIntersects({
					type: "Feature",
					properties: {},
					geometry: {
						type: "LineString",
						coordinates: [
							[6.50390625, 32.99023555965106],
							[-9.931640625, 5.090944175033399],
							[19.86328125, 2.0210651187669897],
							[-8.173828125, 24.367113562651262],
						],
					},
				}),
			).toBe(true);
		});
	});
});
