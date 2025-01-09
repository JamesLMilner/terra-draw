import { uuid4 } from "./id";

describe("Util", () => {
	describe("uuidv4", () => {
		it("generates uuidv4", () => {
			const uuid = uuid4();
			expect(typeof uuid).toBe("string");
			expect(uuid.length).toBe(36);
			expect(uuid.split("-").length).toBe(5);
		});
	});
});
