import { test, expect } from "@playwright/test";
import {
	changeMode,
	drawTwoClickShape,
	drawRectangularPolygon,
	expectGroupPosition,
	expectPathDimensions,
	expectPaths,
	pageUrl,
	setupMap,
	TestConfigOptions,
} from "./setup";

test.describe("page setup", () => {
	test("loads map", async ({ page }) => {
		await page.goto(pageUrl);

		// Expect map application to exist
		await expect(page.getByRole("application")).toBeVisible();
	});

	test("loads UI", async ({ page }) => {
		await page.goto(pageUrl);

		await expect(page.getByText("Point")).toBeVisible();
		await expect(page.getByText("Linestring")).toBeVisible();
		await expect(page.getByText("Polygon")).toBeVisible();
		await expect(page.getByText("Select")).toBeVisible();
		await expect(page.getByText("Clear")).toBeVisible();
	});

	test("there are no console errors", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});
		await page.goto(pageUrl);
		await expect(page.getByRole("application")).toBeVisible();

		expect(errors).toEqual([]);
	});

	test("there are no build issues", async ({ page }) => {
		await page.goto(pageUrl);
		await expect(
			await page.locator("#webpack-dev-server-client-overlay").count(),
		).toBe(0);
	});
});

test.describe("point mode", () => {
	const mode = "point";

	test("mode can set and can be used to create a point", async ({ page }) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });
		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);

		await expectPaths({ page, count: 1 });
	});

	test("mode can set and can be used to create multiple points", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 4, mapDiv.height / 4);
		await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);
		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);

		await expectPaths({ page, count: 3 });
	});
});

test.describe("linestring mode", () => {
	const mode = "linestring";

	const options = [
		{ name: "", config: undefined },
		{
			name: " with insert coordinates for web mercator projection",
			config: ["insertCoordinates"],
		},
		{
			name: " with insert coordinates for globe projection",
			config: ["insertCoordinatesGlobe"],
		},
	] as { name: string; config: TestConfigOptions[] }[];

	for (const { name, config } of options) {
		test(`mode can set and can be used to create a linestring${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });
			await changeMode({ page, mode });

			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.move(mapDiv.width / 3, mapDiv.height / 3);
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

			// Close
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

			await expectPaths({ page, count: 1 });
		});

		test(`mode can set and can be used to create a linestring with multiple points${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });
			await changeMode({ page, mode });

			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.move(mapDiv.width / 3, mapDiv.height / 3);
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

			// Draw coordinate 2
			await page.mouse.move(mapDiv.width / 3, mapDiv.height / 2);
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 2);

			// Draw coordinate 3
			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 3);
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 3);

			// Close
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 3);

			await expectPaths({ page, count: 1 });
		});

		test(`mode can set and can be used to create a linestring with multiple clicked points${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });
			await changeMode({ page, mode });

			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.move(mapDiv.width / 3, mapDiv.height / 3);
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

			// Draw coordinate 2
			await page.mouse.move(mapDiv.width / 3, mapDiv.height / 2);
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 2);

			// Draw coordinate 3
			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 3);
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 3);

			// Close
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 3);

			await expectPaths({ page, count: 1 });
		});

		test(`mode can set and can be used to create multiple linestrings${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });
			await changeMode({ page, mode });

			// First line
			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.move(mapDiv.width / 3, mapDiv.height / 3);
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

			// One point + one line
			await expectPaths({ page, count: 2 });

			// Close first line
			await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

			// One line
			await expectPaths({ page, count: 1 });

			// Second line
			await page.mouse.move(mapDiv.width / 4, mapDiv.height / 4);
			await page.mouse.click(mapDiv.width / 4, mapDiv.height / 4);
			await page.mouse.move(mapDiv.width / 5, mapDiv.height / 5);
			await page.mouse.click(mapDiv.width / 5, mapDiv.height / 5);

			// Close second line
			await page.mouse.click(mapDiv.width / 5, mapDiv.height / 5);

			// Two lines
			await expectPaths({ page, count: 2 });
		});
	}
});

test.describe("polygon mode", () => {
	const mode = "polygon";

	test("mode can set and can be used to create a polygon", async ({ page }) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		// The length of the square sides in pixels
		const sideLength = 100;

		// Calculating the half of the side length
		const halfLength = sideLength / 2;

		// Coordinates of the center
		const centerX = mapDiv.width / 2;
		const centerY = mapDiv.height / 2;

		// Coordinates of the four corners of the square
		const topLeft = { x: centerX - halfLength, y: centerY - halfLength };
		const topRight = { x: centerX + halfLength, y: centerY - halfLength };
		const bottomLeft = { x: centerX - halfLength, y: centerY + halfLength };
		const bottomRight = { x: centerX + halfLength, y: centerY + halfLength };

		// Perform clicks at each corner
		await page.mouse.click(topLeft.x, topLeft.y);
		await page.mouse.click(topRight.x, topRight.y);
		await page.mouse.click(bottomRight.x, bottomRight.y);
		await page.mouse.click(bottomLeft.x, bottomLeft.y);

		// Close the square
		await page.mouse.click(bottomLeft.x, bottomLeft.y);

		// One point + one line
		await expectPaths({ page, count: 1 });
	});

	test("can use validation setting to prevent maximum size", async ({
		page,
	}) => {
		const mapDiv = await setupMap({
			page,
			configQueryParam: ["validationFailure"],
		});
		await changeMode({ page, mode });

		// The length of the square sides in pixels
		const sideLength = 100;

		// Calculating the half of the side length
		const halfLength = sideLength / 2;

		// Coordinates of the center
		const centerX = mapDiv.width / 2;
		const centerY = mapDiv.height / 2;

		// Coordinates of the four corners of the square
		const topLeft = { x: centerX - halfLength, y: centerY - halfLength };
		const topRight = { x: centerX + halfLength, y: centerY - halfLength };
		const bottomLeft = { x: centerX - halfLength, y: centerY + halfLength };
		const bottomRight = { x: centerX + halfLength, y: centerY + halfLength };

		// Perform clicks at each corner
		await page.mouse.click(topLeft.x, topLeft.y);
		await page.mouse.click(topRight.x, topRight.y);
		await page.mouse.click(bottomRight.x, bottomRight.y);
		await page.mouse.click(bottomLeft.x, bottomLeft.y);

		// Attempt to close the square
		await page.mouse.click(bottomLeft.x, bottomLeft.y);

		// Square will fail, as triangle will be 705665 square meters, but square will be
		// over the limit of 1000000 square meters.
		await expectPaths({ page, count: 3 });
	});

	test("can use validation setting to draw underneath maximum size ", async ({
		page,
	}) => {
		const mapDiv = await setupMap({
			page,
			configQueryParam: ["validationSuccess"],
		});
		await changeMode({ page, mode });

		// The length of the square sides in pixels
		const sideLength = 100;

		// Calculating the half of the side length
		const halfLength = sideLength / 2;

		// Coordinates of the center
		const centerX = mapDiv.width / 2;
		const centerY = mapDiv.height / 2;

		// Coordinates of the four corners of the square
		const topLeft = { x: centerX - halfLength, y: centerY - halfLength };
		const topRight = { x: centerX + halfLength, y: centerY - halfLength };
		const bottomLeft = { x: centerX - halfLength, y: centerY + halfLength };
		const bottomRight = { x: centerX + halfLength, y: centerY + halfLength };

		// Perform clicks at each corner
		await page.mouse.click(topLeft.x, topLeft.y);
		await page.mouse.click(topRight.x, topRight.y);
		await page.mouse.click(bottomRight.x, bottomRight.y);
		await page.mouse.click(bottomLeft.x, bottomLeft.y);

		// Attempt to close the square
		await page.mouse.click(bottomLeft.x, bottomLeft.y);

		// Square will fail, as triangle will be 705665 square meters, but square will be
		// over the limit of 1000000 square meters.
		await expectPaths({ page, count: 1 });
	});
});

test.describe("rectangle mode", () => {
	const mode = "rectangle";

	test("mode can set and can be used to create a rectangle", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.click(mapDiv.width / 2 + 50, mapDiv.height / 2 + 50);

		// One point + one line
		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 54, height: 54 }); // Stroke width of 4
	});
});

test.describe("angled rectangle mode", () => {
	const mode = "angled-rectangle";

	test("mode can set and can be used to create an angled rectangle (horizontal up)", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.move(mapDiv.width / 3, mapDiv.height / 2, { steps: 30 });
		await page.mouse.click(mapDiv.width / 3, mapDiv.height / 2);
		await page.mouse.move(mapDiv.width / 3 + 50, mapDiv.height / 3 + 50, {
			steps: 30,
		});
		await page.mouse.click(mapDiv.width / 3 + 50, mapDiv.height / 3 + 50);

		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 217, height: 74 });
	});

	test("mode can set and can be used to create an angled rectangle (horizontal down)", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.move(mapDiv.width / 3, mapDiv.height / 2, { steps: 30 });
		await page.mouse.click(mapDiv.width / 3, mapDiv.height / 2);
		await page.mouse.move(mapDiv.width / 3 + 50, mapDiv.height / 3 + 200, {
			steps: 30,
		});
		await page.mouse.click(mapDiv.width / 3 + 50, mapDiv.height / 3 + 200);

		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 217, height: 84 });
	});

	test("mode can set and can be used to create an angled (diagonal)", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.move(mapDiv.width / 3, mapDiv.height / 3, { steps: 30 });
		await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);
		await page.mouse.move(mapDiv.width / 3 + 150, mapDiv.height / 3 + 150, {
			steps: 30,
		});
		await page.mouse.click(mapDiv.width / 3 + 150, mapDiv.height / 3 + 150);

		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 245, height: 174 });
	});

	test("mode can set and can be used to create an angled (diagonal 2)", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 1.8, mapDiv.height / 1.8);
		await page.mouse.move(mapDiv.width / 2.5, mapDiv.height / 1.3, {
			steps: 30,
		});
		await page.mouse.click(mapDiv.width / 2.5, mapDiv.height / 1.3);
		await page.mouse.move(mapDiv.width / 2.5 + 50, mapDiv.height / 1.3 + 50, {
			steps: 30,
		});
		await page.mouse.click(mapDiv.width / 2.5 + 50, mapDiv.height / 1.3 + 50);

		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 246, height: 213 });
	});
});

test.describe("circle mode", () => {
	const mode = "circle";

	test("mode can set and can be used to create a web mercator circle", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.click(mapDiv.width / 2 + 50, mapDiv.height / 2 + 50);

		// One point + one line
		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 146, height: 146 });
	});

	test("mode can set and can be used to create a geodesic circle", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page, configQueryParam: ["globeCircle"] });
		await changeMode({ page, mode });

		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.click(mapDiv.width / 2 + 50, mapDiv.height / 2 + 50);

		// One point + one line
		await expectPaths({ page, count: 1 });

		await expectPathDimensions({ page, width: 146, height: 146 });
	});
});

test.describe("select mode", () => {
	const mode = "select";

	const options = [
		{ name: "in web mercator projection", config: undefined },
		{
			name: "in globe projection",
			config: ["globeSelect"],
		},
	] as { name: string; config: TestConfigOptions[] }[];

	for (const { name, config } of options) {
		test(`mode can set and then polygon can be selected and deselected ${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });

			await changeMode({ page, mode: "polygon" });
			const sideLength = 100;
			const halfLength = sideLength / 2;
			const centerX = mapDiv.width / 2;
			const centerY = mapDiv.height / 2;
			const topLeft = { x: centerX - halfLength, y: centerY - halfLength };
			const topRight = { x: centerX + halfLength, y: centerY - halfLength };
			const bottomLeft = { x: centerX - halfLength, y: centerY + halfLength };
			const bottomRight = { x: centerX + halfLength, y: centerY + halfLength };
			await page.mouse.click(topLeft.x, topLeft.y);
			await page.mouse.click(topRight.x, topRight.y);
			await page.mouse.click(bottomRight.x, bottomRight.y);
			await page.mouse.click(bottomLeft.x, bottomLeft.y);
			await page.mouse.click(bottomLeft.x, bottomLeft.y); // Closed

			await changeMode({ page, mode });

			// Select
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await expectPaths({ page, count: 9 }); // 8 selection points and 1 square

			// Deselect
			await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);
			await expectPaths({ page, count: 1 }); // 0 selection points and 1 square
		});

		test(`selected polygon can be dragged ${name}`, async ({ page }) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });

			await changeMode({ page, mode: "polygon" });

			// Draw a rectangle
			const { topLeft } = await drawRectangularPolygon({ mapDiv, page });

			// Change to select mode
			await changeMode({ page, mode });

			// Before drag
			const x = topLeft.x - 2;
			const y = topLeft.y - 2;
			await expectGroupPosition({ page, x, y });

			// Select
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await expectPaths({ page, count: 9 }); // 8 selection points and 1 square

			// Drag
			await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2);
			await page.mouse.down();
			await page.mouse.move(mapDiv.width / 2 + 50, mapDiv.height / 2 + 50, {
				steps: 30,
			}); // Steps is required
			await page.mouse.up();

			await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);

			await expectGroupPosition({ page, x: x + 48, y: y + 48 });
		});

		test(`selected polygon can have individual coordinates dragged ${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({ page, configQueryParam: config });

			await changeMode({ page, mode: "polygon" });

			// Draw a rectangle
			const { topLeft } = await drawRectangularPolygon({ mapDiv, page });

			// Change to select mode
			await changeMode({ page, mode });

			// Before drag
			const x = topLeft.x - 2;
			const y = topLeft.y - 2;
			await expectGroupPosition({ page, x, y });

			// Select
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			await expectPaths({ page, count: 9 }); // 8 selection points and 1 square

			// Drag
			await page.mouse.move(topLeft.x, topLeft.y);
			await page.mouse.down();
			await page.mouse.move(topLeft.x - 50, topLeft.y + 50, { steps: 30 }); // Steps is required
			await page.mouse.up();

			// Deselect
			await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);

			// Dragged the coordinate to the left and down slightly
			await expectGroupPosition({ page, x: 538, y: 308 });
		});

		test(`selected polygon can have individual coordinates dragged and succeeds when validation succeeds ${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({
				page,
				configQueryParam: config
					? [...config, "validationSuccess"]
					: ["validationSuccess"],
			});

			await changeMode({ page, mode: "polygon" });

			// Draw a rectangle
			const { topLeft } = await drawRectangularPolygon({
				mapDiv,
				page,
				size: "small",
			});

			// Change to select mode
			await changeMode({ page, mode });

			// Before drag
			const x = topLeft.x - 2;
			const y = topLeft.y - 2;
			await expectGroupPosition({ page, x, y });

			// Select
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			// await expectPaths({ page, count: 9 }); // 8 selection points and 1 square

			// Drag
			await page.mouse.move(topLeft.x, topLeft.y);
			await page.mouse.down();
			await page.mouse.move(topLeft.x - 50, topLeft.y - 50, { steps: 30 });
			await page.mouse.up();

			// Deselect
			await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);

			// We are attempting to dragg right tothe top left corner but it is not getting there
			// because it is capped by the validation. If this was allowed x would be ~90
			await expectGroupPosition({ page, x: 553, y: 273 });
		});

		test(`selected polygon can have individual coordinates dragged and fail when validation fails ${name}`, async ({
			page,
		}) => {
			const mapDiv = await setupMap({
				page,
				configQueryParam: config
					? [...config, "validationFailure"]
					: ["validationFailure"],
			});

			await changeMode({ page, mode: "polygon" });

			// Draw a rectangle
			const { topLeft } = await drawRectangularPolygon({
				mapDiv,
				page,
				size: "small",
			});

			// Change to select mode
			await changeMode({ page, mode });

			// Before drag
			const x = topLeft.x - 2;
			const y = topLeft.y - 2;
			await expectGroupPosition({ page, x, y });

			// Select
			await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
			// await expectPaths({ page, count: 9 }); // 8 selection points and 1 square

			// Drag
			await page.mouse.move(topLeft.x, topLeft.y);
			await page.mouse.down();
			await page.mouse.move(0, 0, { steps: 30 });
			await page.mouse.up();

			// Deselect
			await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);

			// We are attempting to dragg right tothe top left corner but it is not getting there
			// because it is capped by the validation. If this was allowed x would be ~90
			await expectGroupPosition({ page, x: 563, y: 301 });
		});
	}

	test("selected rectangle has it's shape maintained when coordinates are dragged with resizable flag", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });

		await changeMode({ page, mode: "rectangle" });

		// Draw a rectangle
		const { topLeft } = await drawTwoClickShape({ mapDiv, page });

		// Change to select mode
		await changeMode({ page, mode });

		// Before drag
		const x = topLeft.x - 2;
		const y = topLeft.y - 2;
		await expectGroupPosition({ page, x, y });

		// Select
		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await expectPaths({ page, count: 5 }); // 4 selection points and 1 square

		// Drag
		await page.mouse.move(topLeft.x, topLeft.y);
		await page.mouse.down();
		await page.mouse.move(topLeft.x - 100, topLeft.y + 100, { steps: 50 }); // Steps is required
		await page.mouse.up();

		// Deselect
		await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);

		// Dragged the square up and to the left
		await expectGroupPosition({ page, x: 490, y: 408 });
	});

	test("selected circle has it's shape maintained from center origin when coordinates are dragged with resizable flag", async ({
		page,
	}) => {
		const mapDiv = await setupMap({ page });

		await changeMode({ page, mode: "circle" });

		// Draw a circle
		await drawTwoClickShape({ mapDiv, page });

		// Change to select mode
		await changeMode({ page, mode });

		// Select
		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await expectPaths({ page, count: 65 }); // 4 selection points and 1 square

		// Drag
		await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2 + 50);
		await page.mouse.down();
		await page.mouse.move(mapDiv.width / 2, mapDiv.height / 2 + 100, {
			steps: 50,
		}); // Steps is required
		await page.mouse.up();

		// Deselect
		await page.mouse.click(mapDiv.width - 10, mapDiv.height / 2);

		// Dragged the square up and to the left
		await expectGroupPosition({ page, x: 447, y: 138 });
	});
});

test.describe("clear", () => {
	test("drawn geometries can be cleared correctly", async ({ page }) => {
		const mapDiv = await setupMap({ page });

		await changeMode({ page, mode: "point" });
		await page.mouse.click(mapDiv.width / 4, mapDiv.height / 4);

		await changeMode({ page, mode: "linestring" });
		await page.mouse.click(mapDiv.width / 2, mapDiv.height / 2);
		await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);
		await page.mouse.click(mapDiv.width / 3, mapDiv.height / 3);

		await changeMode({ page, mode: "polygon" });
		await drawRectangularPolygon({ mapDiv, page });

		await expectPaths({ page, count: 3 });

		const button = page.getByText("clear");
		await button.click();

		await expectPaths({ page, count: 0 });
	});
});
