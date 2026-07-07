// Shared brand palette. (The app UI is Radix + Tailwind; the former MUI
// createTheme() theme was never applied, so only the palette remains.)
export const palette = {
  primary: {
    main: "#c56cf0",
    light: "#fa9dff",
    dark: "#923cbd",
    contrastText: "#000",
  },
  secondary: {
    main: "#38d1c4",
    light: "#77fff7",
    dark: "#009f94",
    contrastText: "#000",
  },
  text: {
    primary: "#fff",
    secondary: "rgba(255, 255, 255, 0.7)",
    disabled: "rgba(255, 255, 255, 0.5)",
    icon: "rgba(255, 255, 255, 0,5)",
    primaryChannel: "255 255 255",
    secondaryChannel: "255 255 255",
  },
  background: {
    default: "#00171F",
    paper: "#091d25",
  },
};
