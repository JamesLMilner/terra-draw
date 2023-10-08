export function mockProject(
	project: jest.Mock,
	coordinates = [
		[0, 0],
		[0, 1],
		[1, 1],
		[1, 0],
		[0, 0],
	],
) {
	coordinates.forEach((cordinate) => {
		project.mockReturnValueOnce({ x: cordinate[0], y: cordinate[1] });
	});
	return project;
}
