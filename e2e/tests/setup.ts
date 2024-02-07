import { Page, expect } from "@playwright/test";

export const pageUrl = "http://localhost:3000/";

export const setupMap = async ({
	page,
}: {
	page: Page;
}): Promise<{
	x: number;
	y: number;
	width: number;
	height: number;
}> => {
	await page.goto(pageUrl);

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
		| "greatcircle";
}) => {
	const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
	const buttons = page.getByTestId("buttons");
	const button = buttons.getByText(modeText, { exact: true });

	// Click the mode button
	await button.click();

	// Ensure it has been clickde and updatedc correctly
	const color = await button.evaluate((el) =>
		window.getComputedStyle(el).getPropertyValue("color"),
	);
	expect(color).toBe("rgb(39, 204, 255)"); // We set hex but it gets computed to rgb
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
		await expect(await page.locator(selector).count()).toBe(0);
	}
};

export const expectPathDimensions = async ({
	page,
	width,
	height,
}: {
	page: Page;
	width: number;
	height: number;
}) => {
	const selector = "svg > g > path";

	const boundingBox = await page.locator(selector).boundingBox();

	expect(boundingBox?.width).toBe(width);
	expect(boundingBox?.height).toBe(height);
};

export const expectGroupPosition = async ({
	page,
	x,
	y,
}: {
	page: Page;
	x: number;
	y: number;
}) => {
	const selector = "svg > g > path";

	const boundingBox = await page.locator(selector).boundingBox();

	expect(boundingBox?.x).toBe(x);
	expect(boundingBox?.y).toBe(y);
};

export const drawRectangularPolygon = async ({
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
