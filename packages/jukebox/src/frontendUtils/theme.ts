import { createMuiTheme } from "@material-ui/core";
export default createMuiTheme({
  palette: {
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
    type: "dark"
  },
  typography: {
    fontFamily: [
      "FiraGO",
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
    MuiTypography: {
      root: {
        fontFeatureSettings: "'palt' 1",
      }
    }
  }
});
