/**
 * Source contains code from Refined Now Playing by solstice23, licensed under MIT license.
 * @source https://github.com/solstice23/refined-now-playing-netease
 * @author solstice23
 * @license MIT License
 */

import { styled } from "@mui/material";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  MutableRefObject,
} from "react";
import ColorThief from "colorthief";

const RnpBackgroundFluid = styled("div")`
  background-size: cover;
  width: calc(100% + 150px);
  height: calc(100% + 150px);
  left: -150px;
  top: -150px;
  position: absolute;
  overflow: hidden;
  isolation: isolate;

  &::after {
    content: "";
    position: absolute;
    display: block;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    z-index: 1;
    backdrop-filter: blur(64px);
  }
  &::before {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    /* backdrop-filter: saturate(1.5) brightness(0.8) url(#fluid-filter); */
    /* background: var(--rnp-accent-color-overlay); */
    /* opacity: var(--bg-dim-for-fluid-bg, 0.3); */
    z-index: 1;
    pointer-events: none;
  }
`;

const RnpBackgroundFluidRect = styled("div")`
  animation: fluid-container-rotate 150s linear infinite;
  animation-play-state: paused;
  width: max(100vw, 100vh);
  height: max(100vw, 100vh);
  top: calc(50% - 50vh);
  left: calc(50% - 50vw);
  position: relative;
  filter: saturate(1.5) brightness(0.8) url(#fluid-filter);

  canvas {
    position: absolute;
    animation: fluid-block-rotate 60s linear infinite;
    animation-play-state: paused;
    opacity: 1;
  }

  &.paused {
    animation-play-state: paused;
    canvas {
      animation-play-state: paused;
    }
  }

  canvas[data-canvasid="1"] {
    animation-delay: -0s;
  }
  canvas[data-canvasid="2"] {
    animation-delay: -5s;
  }
  canvas[data-canvasid="3"] {
    animation-delay: -10s;
  }
  canvas[data-canvasid="4"] {
    animation-delay: -15s;
  }

  @keyframes fluid-block-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  @keyframes fluid-container-rotate {
    0% {
      transform: scale(1.2) rotate(0deg);
    }
    100% {
      transform: scale(1.2) rotate(-360deg);
    }
  }
`;

interface Props {
  coverUrl?: string;
  textureUrl?: string;
  playerRef: MutableRefObject<HTMLAudioElement>;
}

export function Background({ coverUrl, textureUrl, playerRef }: Props) {
  const canvas1 = useRef<HTMLCanvasElement>();
  const canvas2 = useRef<HTMLCanvasElement>();
  const canvas3 = useRef<HTMLCanvasElement>();
  const canvas4 = useRef<HTMLCanvasElement>();
  const feTurbulence = useRef<SVGFETurbulenceElement>();
  const feDisplacementMap = useRef<SVGFEDisplacementMapElement>();
  const fluidContainer = useRef<HTMLDivElement>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const analyserRef = useRef<AnalyserNode>();

  const [isPlaying, setIsPlaying] = useState(!playerRef.current?.paused);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  useEffect(() => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [playerRef]);

  // useEffect(() => {
  //   if (!playerRef.current || analyserRef.current) return;
  //   const audioCtx = new AudioContext();
  //   const source =
  //     sourceRef.current || audioCtx.createMediaElementSource(playerRef.current);
  //   sourceRef.current = source;
  //   const analyser = audioCtx.createAnalyser();
  //   analyser.connect(audioCtx.destination);
  //   source.connect(analyser);
  //   analyserRef.current = analyser;
  // }, [playerRef]);

  useEffect(() => {
    if (!coverUrl) return;
    canvas1.current.getContext("2d").filter = "blur(5px)";
    canvas2.current.getContext("2d").filter = "blur(5px)";
    canvas3.current.getContext("2d").filter = "blur(5px)";
    canvas4.current.getContext("2d").filter = "blur(5px)";
  }, [coverUrl]);

  useEffect(() => {
    if (!coverUrl) return;
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => {
      const { width, height } = image;
      canvas1.current
        .getContext("2d")
        .drawImage(image, 0, 0, width / 2, height / 2, 0, 0, 100, 100);
      canvas2.current
        .getContext("2d")
        .drawImage(image, width / 2, 0, width / 2, height / 2, 0, 0, 100, 100);
      canvas3.current
        .getContext("2d")
        .drawImage(image, 0, height / 2, width / 2, height / 2, 0, 0, 100, 100);
      canvas4.current
        .getContext("2d")
        .drawImage(
          image,
          width / 2,
          height / 2,
          width / 2,
          height / 2,
          0,
          0,
          100,
          100
        );
    };
    image.src = coverUrl;
    feTurbulence.current?.setAttribute(
      "seed",
      `${Math.round(Math.random() * 1000)}`
    );
  }, [coverUrl]);

  // Animate SVG filter with sound
  const setDisplacementScale = useCallback((value: number) => {
    feDisplacementMap.current?.setAttribute("scale", `${value}`);
  }, []);

  const processor = useRef<{
    bufferLength?: number;
    dataArray?: Float32Array;
  }>({});
  useEffect(() => {
    processor.current.bufferLength =
      analyserRef.current?.frequencyBinCount ?? 1024;
    processor.current.dataArray = new Float32Array(
      processor.current.bufferLength
    );
  }, []);

  // const request = useRef<number>(0);
  // useEffect(() => {
  //   const animate = () => {
  //     request.current = requestAnimationFrame(animate);
  //     if (!isPlayingRef.current || !analyserRef.current) return;
  //     analyserRef.current.getFloatFrequencyData(processor.current.dataArray);
  //     const max = Math.max(...processor.current.dataArray);
  //     const percentage = Math.pow(1.3, max / 20) * 2 - 1;
  //     // const percentage = Math.pow(1.3, max / 60) * 2 - 1;
  //     const scale = Math.min(
  //       600 + 500,
  //       Math.max(200, 800 + 500 - percentage * (800 + 500))
  //     );
  //     console.log("percentage", percentage, max, scale);
  //     setDisplacementScale(scale);
  //   };
  //   request.current = requestAnimationFrame(animate);
  //   return () => {
  //     cancelAnimationFrame(request.current);
  //   };
  // }, [setDisplacementScale, isPlaying]);

  useEffect(() => {
    if (!coverUrl) return;
    const onResize = () => {
      const { width, height } = document.body.getBoundingClientRect();
      const viewSize = Math.max(width, height);
      const canvasSize = viewSize * 0.707;

      const canvasList = [canvas1, canvas2, canvas3, canvas4];
      for (let x = 0; x <= 1; x++) {
        for (let y = 0; y <= 1; y++) {
          const canvas = canvasList[y * 2 + x];
          canvas.current.style.width = `${canvasSize}px`;
          canvas.current.style.height = `${canvasSize}px`;
          const signX = x === 0 ? -1 : 1,
            signY = y === 0 ? -1 : 1;
          canvas.current.style.left = `${
            width / 2 + signX * canvasSize * 0.35 - canvasSize / 2
          }px`;
          canvas.current.style.top = `${
            height / 2 + signY * canvasSize * 0.35 - canvasSize / 2
          }px`;
        }
      }
    };

    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [coverUrl]);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter
          id="fluid-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={feTurbulence}
            type="fractalNoise"
            baseFrequency="0.005"
            numOctaves="1"
            seed="0"
          />
          <feDisplacementMap
            key={2}
            ref={feDisplacementMap}
            in="SourceGraphic"
            scale="400"
          />
        </filter>
      </svg>
      <RnpBackgroundFluid
        style={{
          backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
        }}
      >
        <RnpBackgroundFluidRect ref={fluidContainer}>
          <canvas
            ref={canvas1}
            className="rnp-background-fluid-canvas"
            data-canvasid="1"
            width="100"
            height="100"
          />
          <canvas
            ref={canvas2}
            className="rnp-background-fluid-canvas"
            data-canvasid="2"
            width="100"
            height="100"
          />
          <canvas
            ref={canvas3}
            className="rnp-background-fluid-canvas"
            data-canvasid="3"
            width="100"
            height="100"
          />
          <canvas
            ref={canvas4}
            className="rnp-background-fluid-canvas"
            data-canvasid="4"
            width="100"
            height="100"
          />
        </RnpBackgroundFluidRect>
      </RnpBackgroundFluid>
    </>
  );
}

export const calcLuminance = (color: [number, number, number]): number => {
  let [r, g, b] = color.map((c) => c / 255);
  [r, g, b] = [r, g, b].map((c) => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const rgb2Lab = (
  color: [number, number, number]
): [number, number, number] => {
  let [r, g, b] = color.map((c) => c / 255);
  [r, g, b] = [r, g, b].map((c) => {
    if (c <= 0.03928) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  });
  [r, g, b] = [r, g, b].map((c) => c * 100);
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  const xyz2Lab = (c: number): number => {
    if (c > 0.008856) {
      return Math.pow(c, 1 / 3);
    }
    return 7.787 * c + 16 / 116;
  };
  const L = 116 * xyz2Lab(y / 100) - 16;
  const A = 500 * (xyz2Lab(x / 95.047) - xyz2Lab(y / 100));
  const B = 200 * (xyz2Lab(y / 100) - xyz2Lab(z / 108.883));
  return [L, A, B];
};

export const calcColorDifference = (
  color1: [number, number, number],
  color2: [number, number, number]
): number => {
  const [L1, A1, B1] = rgb2Lab(color1);
  const [L2, A2, B2] = rgb2Lab(color2);
  const deltaL = L1 - L2;
  const deltaA = A1 - A2;
  const deltaB = B1 - B2;
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
};

export const rgb2Hsl = ([r, g, b]: [number, number, number]): [
  number,
  number,
  number
] => {
  (r /= 255), (g /= 255), (b /= 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max == min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
};

export const getGradientFromPalette = (palette: [number, number, number][]) => {
  palette = palette.sort((a, b) => {
    return calcLuminance(a) - calcLuminance(b);
  });
  palette = palette.slice(palette.length / 2 - 4, palette.length / 2 + 4);
  palette = palette.sort((a, b) => {
    return rgb2Hsl(b)[1] - rgb2Hsl(a)[1];
  });
  palette = palette.slice(0, 6);

  const differences: number[][] = [];
  for (let i = 0; i < palette.length; i++) {
    differences[i] = [0, 0, 0, 0, 0, 0];
  }
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      differences[i][j] = calcColorDifference(palette[i], palette[j]);
      differences[j][i] = differences[i][j];
    }
  }

  const used: boolean[] = new Array(6).fill(false);
  let min = 10000000,
    ansSeq: number[] = [];
  const dfs = (depth: number, seq: number[] = [], currentMax = -1) => {
    if (depth === 6) {
      if (currentMax < min) {
        min = currentMax;
        ansSeq = seq;
      }
      return;
    }
    for (let i = 0; i < 6; i++) {
      if (used[i]) continue;
      used[i] = true;
      dfs(
        depth + 1,
        seq.concat(i),
        Math.max(currentMax, differences[seq[depth - 1]][i])
      );
      used[i] = false;
    }
  };
  for (let i = 0; i < 6; i++) {
    used[i] = true;
    dfs(1, [i]);
    used[i] = false;
  }

  const colors: [number, number, number][] = [];
  for (const i of ansSeq) {
    colors.push(palette[ansSeq[i]]);
  }
  let ans = ""; // "linear-gradient(-45deg,";
  for (let i = 0; i < colors.length; i++) {
    ans += `rgb(${colors[i][0]}, ${colors[i][1]}, ${colors[i][2]})`;
    if (i !== colors.length - 1) {
      ans += ",";
    }
  }
  // ans += ")";
  return ans;
};

// Using translate instaed of background-position for better performance
const RnpBackgroundGradientWrapper = styled("div")`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;
const RnpBackgroundGradient = styled("div")`
  position: absolute;
  height: 400%;
  width: 400%;
  animation: bg-gradient-animation 120s cubic-bezier(0.45, 0.05, 0.55, 0.95)
    infinite;
  background-image: linear-gradient(-45deg, var(--backgroundImageGradient));

  @supports (background: linear-gradient(in lch, black, white)) {
    background-image: linear-gradient(
      -45deg in lch,
      var(--backgroundImageGradient)
    );
  }

  @keyframes bg-gradient-animation {
    0% {
      translate: 0% 0%;
    }
    25% {
      translate: calc(-100% + 100vw) 0%;
    }
    50% {
      translate: calc(-100% + 100vw) calc(-100% + 100vh);
    }
    75% {
      translate: 0% calc(-100% + 100vh);
    }
    100% {
      translate: 0% 0%;
    }
  }
`;

export function BackgroundGradient({ coverUrl, textureUrl }: Props) {
  const [gradient, setGradient] = useState(`url("/textures/${textureUrl}")`);
  const [hasGradient, setHasGradient] = useState(false);
  useEffect(() => {
    if (!coverUrl) {
      setGradient(`url("/textures/${textureUrl}")`);
      setHasGradient(false);
      return;
    }
    const colorThief = new ColorThief();
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => {
      const palette = colorThief.getPalette(image);
      setGradient(getGradientFromPalette(palette));
      setHasGradient(true);
    };
    image.onerror = () => {
      setGradient(`url("/textures/${textureUrl}")`);
      setHasGradient(false);
    };
    image.src = coverUrl;
  }, [coverUrl, textureUrl]);

  return (
    <RnpBackgroundGradientWrapper
      style={{ backgroundImage: hasGradient ? null : gradient }}
    >
      {hasGradient && (
        <RnpBackgroundGradient
          style={
            {
              "--backgroundImageGradient": gradient,
            } as unknown as React.CSSProperties
          }
        />
      )}
    </RnpBackgroundGradientWrapper>
  );
}
