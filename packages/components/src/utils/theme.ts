import { alpha, createTheme } from "@mui/material/styles";

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

const scrollbarTrackBackground = "rgba(66, 66, 66, 0.5)";
const scrollbarThumbBackground = "rgba(255, 255, 255, 0.7)";

export const theme = createTheme({
  palette: {
    ...palette,
    mode: "dark",
  },
  typography: {
    fontFamily: [
      "Inter V",
      "Inter",
      "Source Han Sans",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "dark",
        },
        html: {
          fontFeatureSettings: "'palt' 1, 'ss01' 1, 'ss03' 1, 'cv01' 1",
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
      },
    },
    MuiButton: {
      styleOverrides: {
        outlinedPrimary: {
          color: palette.primary.light,
          borderColor: alpha(palette.primary.main, 0.5),
        },
        textPrimary: {
          color: palette.primary.light,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          // color: palette.primary.light,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          "&$focused": {
            color: palette.primary.light,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        textColorPrimary: {
          "&$selected": {
            color: palette.primary.light,
          },
        },
      },
    },
  },
});
