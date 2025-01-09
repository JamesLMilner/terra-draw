export function validLatitude(lat: number) {
	return lat >= -90 && lat <= 90;
}

export function validLongitude(lng: number) {
	return lng >= -180 && lng <= 180;
}

export function coordinateIsValid(
	coordinate: unknown[],
	coordinatePrecision: number,
) {
	return (
		coordinate.length === 2 &&
		typeof coordinate[0] === "number" &&
		typeof coordinate[1] === "number" &&
		coordinate[0] !== Infinity &&
		coordinate[1] !== Infinity &&
		validLongitude(coordinate[0]) &&
		validLatitude(coordinate[1]) &&
		getDecimalPlaces(coordinate[0]) <= coordinatePrecision &&
		getDecimalPlaces(coordinate[1]) <= coordinatePrecision
	);
}

export function getDecimalPlaces(value: number): number {
	let current = 1;
	let precision = 0;
	while (Math.round(value * current) / current !== value) {
		current *= 10;
		precision++;
	}

	return precision;
}
