import { quickselect } from "./quickselect";

describe("quickselect", () => {
    test("selection rearranges items so that all items in the [left, k] are the smallest", function () {
        const arr = [65, 28, 59, 33, 21, 56, 22, 95, 50, 12, 90, 53, 28, 77, 39];
        quickselect(arr, 8, 0, arr.length - 1, (a: number, b: number) => {
            return a < b ? -1 : a > b ? 1 : 0;
        });

        expect(arr).toStrictEqual([
            39, 28, 28, 33, 21, 12, 22, 50, 53, 56, 59, 65, 90, 77, 95,
        ]);
    });

    test("selection where right - left > 600", function () {
        let arr = [65, 28, 59, 33, 21, 56, 22, 95, 50, 12, 90, 53, 28, 77, 39];

        for (let i = 0; i < 601; i++) {
            arr = arr.concat([
                65, 28, 59, 33, 21, 56, 22, 95, 50, 12, 90, 53, 28, 77, 39,
            ]);
        }

        quickselect(arr, 8, 0, arr.length - 1, (a: number, b: number) => {
            return a < b ? -1 : a > b ? 1 : 0;
        });

        expect(arr);
    });
});
