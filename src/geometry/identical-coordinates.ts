import { Position } from "geojson";


export function coordinatesIdentical(coordinate: Position, coordinateTwo: Position) {
    console.log("proteced?", coordinate[0] === coordinateTwo[0] && coordinate[1] === coordinateTwo[1]);
    return coordinate[0] === coordinateTwo[0] && coordinate[1] === coordinateTwo[1];
}