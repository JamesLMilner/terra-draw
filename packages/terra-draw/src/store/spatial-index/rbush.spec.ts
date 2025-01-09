import { RBush, Node } from "./rbush";

// TODO: Make tests have some sort of assertion
describe("RBush", () => {
	function arrToBBox([minX, minY, maxX, maxY]: [
		number,
		number,
		number,
		number,
	]) {
		const children: Node[] = [];
		return {
			minX,
			minY,
			maxX,
			maxY,
			height: 1,
			leaf: true,
			children,
		};
	}

	it("insert adds an item to an existing tree correctly", () => {
		const items = (
			[
				[0, 0, 0, 0],
				[1, 1, 1, 1],
				[2, 2, 2, 2],
				[3, 3, 3, 3],
				[1, 1, 2, 2],
			] as [number, number, number, number][]
		).map(arrToBBox);

		const tree = new RBush(4);
		tree.load(items.slice(0, 3));

		tree.insert(items[3]);

		tree.insert(items[4]);
	});

	it("insert forms a valid tree if items are inserted one by one", () => {
		const tree = new RBush(4);

		const data = (
			[
				[0, 0, 0, 0],
				[10, 10, 10, 10],
				[20, 20, 20, 20],
				[25, 0, 25, 0],
				[35, 10, 35, 10],
				[45, 20, 45, 20],
				[0, 25, 0, 25],
				[10, 35, 10, 35],
				[20, 45, 20, 45],
				[25, 25, 25, 25],
				[35, 35, 35, 35],
				[45, 45, 45, 45],
				[50, 0, 50, 0],
				[60, 10, 60, 10],
				[70, 20, 70, 20],
				[75, 0, 75, 0],
				[85, 10, 85, 10],
				[95, 20, 95, 20],
				[50, 25, 50, 25],
				[60, 35, 60, 35],
				[70, 45, 70, 45],
				[75, 25, 75, 25],
				[85, 35, 85, 35],
				[95, 45, 95, 45],
				[0, 50, 0, 50],
				[10, 60, 10, 60],
				[20, 70, 20, 70],
				[25, 50, 25, 50],
				[35, 60, 35, 60],
				[45, 70, 45, 70],
				[0, 75, 0, 75],
				[10, 85, 10, 85],
				[20, 95, 20, 95],
				[25, 75, 25, 75],
				[35, 85, 35, 85],
				[45, 95, 45, 95],
				[50, 50, 50, 50],
				[60, 60, 60, 60],
				[70, 70, 70, 70],
				[75, 50, 75, 50],
				[85, 60, 85, 60],
				[95, 70, 95, 70],
				[50, 75, 50, 75],
				[60, 85, 60, 85],
				[70, 95, 70, 95],
				[75, 75, 75, 75],
				[85, 85, 85, 85],
				[95, 95, 95, 95],
			] as [number, number, number, number][]
		).map(arrToBBox);

		for (let i = 0; i < data.length; i++) {
			tree.insert(data[i]);
		}
	});

	it("insert handles the insertion of maxEntries + 2 empty bboxes", () => {
		const emptyData = (
			[
				[-Infinity, -Infinity, Infinity, Infinity],
				[-Infinity, -Infinity, Infinity, Infinity],
				[-Infinity, -Infinity, Infinity, Infinity],
				[-Infinity, -Infinity, Infinity, Infinity],
				[-Infinity, -Infinity, Infinity, Infinity],
				[-Infinity, -Infinity, Infinity, Infinity],
			] as [number, number, number, number][]
		).map(arrToBBox);

		const tree = new RBush(4);

		emptyData.forEach((datum) => {
			tree.insert(datum);
		});
	});
});
