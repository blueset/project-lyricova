import { createSlice } from "@reduxjs/toolkit";

interface DisplayState {
  isFullscreen: boolean;
  textureUrl?: string;
}

const initialState: DisplayState = {
  isFullscreen: false,
  textureUrl: undefined,
};

const displaySlice = createSlice({
  name: "display",
  initialState,
  reducers: {
    toggleFullscreen: (state) => {
      state.isFullscreen = !state.isFullscreen;
    },
    setTextureUrl: (state, action) => {
      state.textureUrl = action.payload;
    },
  },
});

export const { toggleFullscreen, setTextureUrl } = displaySlice.actions;
export default displaySlice.reducer;
