function mockProject(project: jest.Mock, value: { x: number; y: number }) {
    return project.mockReturnValueOnce({ x: 0, y: 0 });
}

export function mockBboxProject(
    project: jest.Mock,
    coordinates = [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
    ]
) {
    coordinates.forEach((cordinate) => {
        project.mockReturnValueOnce({ x: cordinate[0], y: cordinate[1] });
    });
    return project;
}
