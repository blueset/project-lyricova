import { createSlice } from "@reduxjs/toolkit";

export interface DisplayState {
  isFullscreen: boolean;
  textureUrl?: string;
}

const initialState: DisplayState = {
  isFullscreen: false,
  textureUrl: undefined,
};

export const displaySlice = createSlice({
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
