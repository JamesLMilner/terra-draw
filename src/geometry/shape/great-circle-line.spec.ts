import { greatCircleLine } from "./great-circle-line";

describe("Geometry", () => {
    describe("GreatCircleLine", () => {

        // TODO: Should this be the case?
        it("returns null if { start: [0, 0], end: [20, 20] }", () => {
            const result = greatCircleLine({ start: [0, 0], end: [20, 20] });
            expect(result).toEqual(null);
        });

        it("creates a new great circle linestring { start: [0.1, 0.1], end: [20, 20] }", () => {
            const result = greatCircleLine({ start: [0.1, 0.1], end: [20, 20] });
            expect(result).not.toEqual(null);
            expect(result?.geometry.coordinates.length).toBe(100);
        });

    });
});
