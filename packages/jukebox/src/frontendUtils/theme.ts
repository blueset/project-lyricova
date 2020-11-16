import { createMuiTheme, fade } from "@material-ui/core";

const palette = {
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
};

const scrollbarTrackBackground = "rgba(66, 66, 66, 0.5)";
const scrollbarThumbBackground = "rgba(255, 255, 255, 0.7)";

export default createMuiTheme({
  palette: {
    ...palette,
    type: "dark"
  },
  typography: {
    fontFamily: [
      "Inter V",
      "Inter",
      "Source Han Sans",
      "-apple-system",
      "BlinkMacSystemFont",
      "\"Segoe UI\"",
      "Roboto",
      "\"Helvetica Neue\"",
      "Arial",
      "sans-serif",
      "\"Apple Color Emoji\"",
      "\"Segoe UI Emoji\"",
      "\"Segoe UI Symbol\"",
    ].join(","),
  },
  overrides: {
    MuiCssBaseline: {
      "@global": {
        "html": {
          fontFeatureSettings: "'palt' 1",
        },
        "*::-webkit-scrollbar": {
          width: "8px",
        },
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: `${scrollbarThumbBackground} ${scrollbarTrackBackground}`,
        },
        "*::-webkit-scrollbar-track": {
          background: scrollbarTrackBackground,
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: scrollbarThumbBackground,
          borderRadius: "6px",
        },
      }
    },
    MuiButton: {
      outlinedPrimary: {
        color: palette.primary.light,
        borderColor: fade(palette.primary.main, 0.5),
      },
      textPrimary: {
        color: palette.primary.light,
      },
    },
    MuiTypography: {
      colorPrimary: {
        color: palette.primary.light,
      },
    },
    MuiFormLabel: {
      root: {
        "&$focused": {
          color: palette.primary.light,
        },
      },
    },
    MuiTab: {
      textColorPrimary: {
        "&$selected": {
          color: palette.primary.light,
        }
      }
    },
  }
});
