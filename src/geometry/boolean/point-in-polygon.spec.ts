import { pointInPolygon } from "./point-in-polygon";

describe("Geometry", () => {
    describe("pointInPolygon", () => {
        const polygon = [
            [
                [0, 0],
                [0, 100],
                [100, 100],
                [100, 0],
                [0, 0],
            ],
        ];

        it("point is not in polygon", () => {
            const pointOut = [140, 150];
            expect(pointInPolygon(pointOut, polygon)).toBe(false);
        });

        it("point is in polygon", () => {
            const pointIn = [50, 50];
            expect(pointInPolygon(pointIn, polygon)).toBe(true);
        });
    });
});
