declare module "colorthief" {
  declare class ColorThief {
    constructor();
    getPalette(sourceImage: Image): [number, number, number][];
    getColor(sourceImage: Image): [number, number, number];
  }

  export default ColorThief;
}
