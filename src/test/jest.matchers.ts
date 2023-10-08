// https://stackoverflow.com/a/13653180/1363484
const uuidRegExp = new RegExp(
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
);

expect.extend({
	toBeUUID4(received): jest.CustomMatcherResult {
		return uuidRegExp.test(received)
			? {
					pass: true,
					message: () =>
						`Expected ${received} not to be a valid UUID v4 string`,
			  }
			: {
					pass: false,
					message: () => `Expected ${received} to be a valid UUID v4 string`,
			  };
	},
});
