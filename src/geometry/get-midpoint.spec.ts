import { getMidPointCoordinates } from "./get-midpoints";

describe("getMidPointCoordinates", () => {
  it("get midpoint coordinates", () => {
    const result = getMidPointCoordinates(
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
      9
    );
    expect(result).toStrictEqual([
      [0, 0.499999309],
      [0.499999309, 1.000038071],
      [0.500000691, 1.000038071],
      [0, 0.500000691],
    ]);
  });
});
