import { TerraDrawAdapterStyling } from "../common";

export const getDefaultStyling = (): TerraDrawAdapterStyling => {
  return {
    polygonFillColor: "#3f97e0",
    polygonOutlineColor: "#3f97e0",
    polygonOutlineWidth: 4,
    polygonFillOpacity: 0.3,
    pointColor: "#3f97e0",
    pointOutlineColor: "#3f97e0",
    pointWidth: 6,
    lineStringColor: "#3f97e0",
    lineStringWidth: 4,
    selectedColor: "#26a9c8",
    selectedPointColor: "#26a9c8",
  };
};
