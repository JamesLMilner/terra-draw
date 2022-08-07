import { TerraDrawModeRegisterConfig } from "../common";
import { GeoJSONStore } from "../store/store";

export function getMockModeConfig() {
  return {
    store: new GeoJSONStore(),
    setCursor: jest.fn(),
    onChange: jest.fn(),
    onSelect: jest.fn(),
    onDeselect: jest.fn(),
    project: jest.fn(),
  };
}
