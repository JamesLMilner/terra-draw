import { AdapterListener } from "./adapter-listener";

describe("AdapterListener", () => {
	describe("constructor", () => {
		it("constructs with no options", () => {
			const callback = jest.fn();
			const listener = new AdapterListener({
				name: "test",
				callback,
				register: jest.fn(),
				unregister: jest.fn(),
			});
			expect(listener.name).toBe("test");
			expect(listener.callback).toBe(callback);
		});
	});

	describe("callback", () => {
		it("calls the passed callback when called", () => {
			const callback = jest.fn();
			const listener = new AdapterListener({
				name: "test",
				callback,
				register: jest.fn(),
				unregister: jest.fn(),
			});
			listener.callback();

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe("register", () => {
		it("calls passed registered function", () => {
			const register = jest.fn();
			const callback = jest.fn();
			const listener = new AdapterListener({
				name: "test",
				callback,
				register,
				unregister: jest.fn(),
			});

			listener.register();

			expect(register).toHaveBeenCalledTimes(1);
			expect(register).toHaveBeenCalledWith(callback);
		});
	});

	describe("unregister", () => {
		it("calls passed unregister function", () => {
			const unregister = jest.fn();
			const callback = jest.fn();
			const listener = new AdapterListener({
				name: "test",
				callback,
				register: jest.fn(),
				unregister,
			});

			listener.unregister(callback);

			expect(unregister).toHaveBeenCalledWith(callback);
		});
	});
});
