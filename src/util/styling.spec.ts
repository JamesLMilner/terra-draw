import { getDefaultStyling } from "./styling";

describe("Styling", () => {
    describe("getDefaultStyling", () => {
        it("gets valid styles", () => {
            const styling = getDefaultStyling();
            expect(styling.pointOutlineColor.startsWith("#")).toBe(true);
            expect(styling.pointOutlineColor.length).toBe(7);

            expect(styling.pointColor.startsWith("#")).toBe(true);
            expect(styling.pointColor.length).toBe(7);

            expect(styling.polygonOutlineColor.startsWith("#")).toBe(true);
            expect(styling.polygonOutlineColor.length).toBe(7);

            expect(styling.polygonFillColor.startsWith("#")).toBe(true);
            expect(styling.polygonFillColor.length).toBe(7);

            expect(styling.lineStringColor.startsWith("#")).toBe(true);
            expect(styling.lineStringColor.length).toBe(7);

            expect(typeof styling.lineStringWidth).toBe("number");
            expect(typeof styling.pointWidth).toBe("number");
        });
    });
});
