import { circle } from "./create-circle";

describe("Geometry", () => {
    describe("circle", () => {
        it("creates a circle polygon", () => {
            const result = circle({ center: [0, 0], radiusKilometers: 1 });

            expect(result.geometry.type).toBe("Polygon");
            expect(result.geometry.coordinates[0].length).toBe(64 + 1);
            expect(result.properties).toStrictEqual({});
        });

        it("creates a circle polygon with custom steps", () => {
            const result = circle({
                center: [0, 0],
                radiusKilometers: 1,
                steps: 20,
            });

            expect(result.geometry.type).toBe("Polygon");
            expect(result.geometry.coordinates[0].length).toBe(20 + 1);
            expect(result.properties).toStrictEqual({});
        });
    });
});
