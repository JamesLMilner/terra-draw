export const earthRadius = 6371008.8;

export function degreesToRadians(degrees: number): number {
    const radians = degrees % 360;
    return (radians * Math.PI) / 180;
}

export function lengthToRadians(distance: number): number {
    const factor = earthRadius / 1000;
    return distance / factor;
}

export function radiansToDegrees(radians: number): number {
    const degrees = radians % (2 * Math.PI);
    return (degrees * 180) / Math.PI;
}
