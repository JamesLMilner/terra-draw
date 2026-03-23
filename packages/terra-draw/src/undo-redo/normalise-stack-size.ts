export function normaliseMaxStackSize(maxStackSize?: number) {
	if (maxStackSize === undefined || !Number.isFinite(maxStackSize)) {
		return Number.POSITIVE_INFINITY;
	}

	return Math.max(0, Math.floor(maxStackSize));
}
