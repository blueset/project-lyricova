import { StateCreator } from "zustand";
import { LyricsState, RoleSlice } from "./sliceTypes";
import { METADATA_MINOR, METADATA_ROLE } from "lyrics-kit/core";

export const createRoleSlice: StateCreator<
  LyricsState,
  [["zustand/immer", never]],
  [],
  RoleSlice
> = (set, get, api) => {
  return {
    role: {
      selectedLines: [],
      setSelectedLines: (lines: number[]) => {
        set((state) => {
          state.role.selectedLines = lines;
        });
      },
      setRoleByIndex(index, role) {
        set((state) => {
          const { lyrics } = state;
          if (!lyrics) return;
          if (!Array.isArray(index)) {
            index = [index];
          }
          index.forEach((index) => {
            const line = lyrics.lines[index];
            if (!line) return;
            if (role) {
              line.attachments[METADATA_ROLE] = {
                type: "plain_text",
                text: role.toString(),
              };
            } else {
              delete line.attachments[METADATA_ROLE];
            }
          });
        });
        get().generate();
      },
      setRoleOfSelectedLines: (role: number) => {
        const state = get();

        const { selectedLines } = state.role;
        if (selectedLines.length === 0) return;
        const { lyrics } = state;
        if (!lyrics) return;
        state.role.setRoleByIndex(selectedLines, role);
      },
      setMinorByIndex(index, minor) {
        set((state) => {
          const { lyrics } = state;
          if (!lyrics) return;
          if (!Array.isArray(index)) {
            index = [index];
          }
          index.forEach((index) => {
            const line = lyrics.lines[index];
            if (!line) return;
            if (minor) {
              line.attachments[METADATA_MINOR] = {
                type: "plain_text",
                text: "1",
              };
            } else {
              delete line.attachments[METADATA_MINOR];
            }
          });
        });
        get().generate();
      },
      setMinorOfSelectedLines: (minor: boolean) => {
        const state = get();
        const { selectedLines } = state.role;
        if (selectedLines.length === 0) return;
        const { lyrics } = state;
        if (!lyrics) return;
        state.role.setMinorByIndex(selectedLines, minor);
      },
    },
  };
};
