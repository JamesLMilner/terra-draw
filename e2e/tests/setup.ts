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
	const button = page.getByText(modeText);

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
		page.waitForSelector(selector);
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
