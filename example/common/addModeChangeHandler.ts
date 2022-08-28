import { TerraDraw } from "../../src/terra-draw";

export const addModeChangeHandler = (
  draw: TerraDraw,
  currentSelected: { button: undefined | HTMLButtonElement; mode: string }
) => {
  ["select", "point", "linestring", "polygon", "freehand", "circle"].forEach(
    (mode) => {
      (document.getElementById(mode) as HTMLButtonElement).addEventListener(
        "click",
        () => {
          currentSelected.mode = mode;
          draw.changeMode(currentSelected.mode);

          if (currentSelected.button) {
            currentSelected.button.style.color = "565656";
          }
          currentSelected.button = document.getElementById(
            mode
          ) as HTMLButtonElement;
          currentSelected.button.style.color = "#27ccff";
        }
      );
    }
  );
};
