interface Window {
  lastClickTop: number | undefined;
}

declare module "matter-attractors" {
  const plugin: Matter.Plugin & {
    Attractors: {
      gravityConstant: number;
    };
  };
  export default plugin;
}
