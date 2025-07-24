import { Page, expect } from "@playwright/test";

export const pageUrl = "http://localhost:3000/";

export type TestConfigOptions =
	| "polygonEditable"
	| "pointEditable"
	| "lineStringEditable"
	| "validationSuccess"
	| "validationFailure"
	| "insertCoordinates"
	| "insertCoordinatesGlobe"
	| "globeCircle"
	| "globeSelect"
	| "snappingCoordinate"
	| "showCoordinatePoints"
	| "selectDragSnapping"
	| "selectDragSnappingToCustom"
	| "disableLeftClick";

export const setupMap = async ({
	page,
	configQueryParam,
}: {
	page: Page;
	configQueryParam?: TestConfigOptions[];
}): Promise<{
	x: number;
	y: number;
	width: number;
	height: number;
}> => {
	if (configQueryParam) {
		if (configQueryParam.length > 1) {
			await page.goto(
				pageUrl +
					"?config=" +
					configQueryParam.map((config) => config).join(","),
			);
		} else {
			await page.goto(pageUrl + "?config=" + configQueryParam);
		}
	} else {
		await page.goto(pageUrl);
	}

	const mapDiv = await page.getByRole("application");

	// Get the bounding box of the div
	const mapBoundingBox = await mapDiv.boundingBox();

	if (!mapBoundingBox) {
		throw new Error();
	}

	return mapBoundingBox;
};

export const changeMode = async ({
	page,
	mode,
}: {
	page: Page;
	mode:
		| "point"
		| "polygon"
		| "linestring"
		| "select"
		| "rectangle"
		| "circle"
		| "angled-rectangle"
		| "sector"
		| "freehand"
		| "freehand-linestring"
		| "sensor";
}) => {
	let modeText = mode.charAt(0).toUpperCase() + mode.slice(1);

	if (mode.includes("-")) {
		modeText = mode
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	} else {
		modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
	}

	const buttons = page.getByTestId("buttons");
	const button = buttons.getByText(modeText, { exact: true });

	// Click the mode button
	await button.click();

	// Ensure it has been clickde and updatedc correctly
	const color = await button.evaluate((el) =>
		window.getComputedStyle(el).getPropertyValue("color"),
	);
	expect(
		color,
		"Text rgb color should match the expected selected button color",
	).toBe("rgb(39, 204, 255)"); // We set hex but it gets computed to rgb
};

/** Click the toggle button to turn Terra Draw on or off */
export const clickToggleOnOff = async ({ page }: { page: Page }) => {
	const button = page.getByTestId("toggle");
	await button.click();
};

export const expectPaths = async ({
	page,
	count,
}: {
	page: Page;
	count: number;
}) => {
	const selector = "svg > g > path";

	if (count > 0) {
		await page.waitForSelector(selector);
		expect(await page.locator(selector).count()).toBe(count);
	} else {
		await expect(
			await page.locator(selector).count(),
			`locator count should be 0 for selector ${selector}`,
		).toBe(0);
	}
};

export const expectPathDimensions = async ({
	page,
	width,
	height,
	item = 0,
}: {
	page: Page;
	width: number;
	height: number;
	item?: number;
}) => {
	const selector = "svg > g > path";

	const boundingBox = await page.locator(selector).nth(item).boundingBox();

	expect(boundingBox?.width).toBe(width);
	expect(boundingBox?.height).toBe(height);
};

const expectCloseTo = (actual: number, expected: number, tolerance = 1) => {
	expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
	expect(actual).toBeLessThanOrEqual(expected + tolerance);
};

export const expectGroupPosition = async ({
	page,
	x,
	y,
	item,
}: {
	page: Page;
	x: number;
	y: number;
	item?: number;
}) => {
	const selector = "svg > g > path";

	const boundingBox = await page.locator(selector).boundingBox();

	if (!boundingBox) {
		throw new Error(`Selector ${selector} bounding box not found`);
	}

	expectCloseTo(boundingBox.x, x);
	expectCloseTo(boundingBox.y, y);
};

export const drawRectangularPolygon = async ({
	mapDiv,
	page,
	size = "regular",
}: {
	mapDiv: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	page: Page;
	size?: "regular" | "small";
}) => {
	// Draw a rectangle
	const sideLength = size === "regular" ? 100 : 70;
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

	return { topLeft, topRight, bottomRight, bottomLeft };
};

export const drawTwoClickShape = async ({
	mapDiv,
	page,
}: {
	mapDiv: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	page: Page;
}) => {
	// Draw a rectangle
	const sideLength = 100;
	const halfLength = sideLength / 2;
	const centerX = mapDiv.width / 2;
	const centerY = mapDiv.height / 2;
	const topLeft = { x: centerX - halfLength, y: centerY - halfLength };
	const topRight = { x: centerX + halfLength, y: centerY - halfLength };
	const bottomLeft = { x: centerX - halfLength, y: centerY + halfLength };
	const bottomRight = { x: centerX + halfLength, y: centerY + halfLength };
	await page.mouse.click(topLeft.x, topLeft.y);

	await page.mouse.click(bottomRight.x, bottomRight.y); // Closed

	return { topLeft, topRight, bottomRight, bottomLeft };
};
