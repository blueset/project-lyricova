import { describe, expect, it, vi } from "vitest";
import type { Scene } from "react-scenejs";
import { synchronizeStrokeScene } from "./stroke";

function sceneStub() {
  const item = {
    setPlaySpeed: vi.fn(),
  };
  const scene = {
    getItem: () => item,
    pause: vi.fn(),
    play: vi.fn(),
    setTime: vi.fn(),
  } as unknown as Scene;
  return { item, scene };
}

describe("synchronizeStrokeScene", () => {
  it("keeps SceneJS paused and seeks from the media clock", () => {
    const { item, scene } = sceneStub();

    synchronizeStrokeScene(
      scene,
      {
        currentTime: 12,
        duration: 20,
        playbackRate: 1.5,
        state: "playing",
      },
      10,
      false,
    );

    expect(scene.pause).toHaveBeenCalledOnce();
    expect(scene.setTime).toHaveBeenCalledWith(2);
    expect(scene.play).not.toHaveBeenCalled();
    expect(item.setPlaySpeed).toHaveBeenCalledWith(1.5);
  });

  it("seeks a completed scene to the end without starting playback", () => {
    const { scene } = sceneStub();

    synchronizeStrokeScene(
      scene,
      {
        currentTime: 30,
        duration: 30,
        playbackRate: 1,
        state: "paused",
      },
      20,
      true,
    );

    expect(scene.pause).toHaveBeenCalledOnce();
    expect(scene.setTime).toHaveBeenCalledWith("100%");
    expect(scene.play).not.toHaveBeenCalled();
  });
});
