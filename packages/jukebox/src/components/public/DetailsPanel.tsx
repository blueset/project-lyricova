import type { ReactNode } from "react";
import { Box, GlobalStyles, IconButton, styled } from "@mui/material";
import Link, { NextComposedLink } from "lyricova-common/components/Link";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/router";
import type { GlobalStylesProps as StyledGlobalStylesProps } from "@mui/styled-engine/GlobalStyles/GlobalStyles";
import { useAppSelector } from "../../redux/public/store";

const StyledLink = styled(Link)({
  fontSize: "1.75em",
  fontWeight: 500,
  marginRight: "1em",
  fontStyle: "italic",
  color: "text.secondary",
  "&.active": {
    color: "primary.light",
  },
});

interface Props {
  coverUrl: string | null;
  children?: ReactNode;
}

export default function DetailsPanel({ coverUrl = null, children }: Props) {
  const router = useRouter();
  const { isFullscreen, textureUrl } = useAppSelector((s) => s.display);

  let backgroundNode = (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 0,
      }}
    />
  );

  if (coverUrl) {
    backgroundNode = (
      <>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            filter: "url(#sharpBlur)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            zIndex: 0,
            backgroundImage: `url(${coverUrl})`,
          }}
        />
        {backgroundNode}
      </>
    );
  }

  return (
    <div
      style={{
        position: isFullscreen ? "fixed" : "relative",
        inset: 0,
        overflow: "hidden",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        zIndex: isFullscreen ? 2 : 0,
        backgroundColor: "#00171F",
        backgroundImage: textureUrl ? `url(/textures/${textureUrl})` : null,
      }}
    >
      <GlobalStyles
        styles={
          {
            ".coverMask": {
              backgroundImage: coverUrl ? `url(${coverUrl})` : null,
              backgroundColor: coverUrl ? "rgba(255, 255, 255, 0.8)" : null,
              color: coverUrl ? "transparent !important" : null,
              mixBlendMode: coverUrl ? "none !important" : null,
              backgroundClip: coverUrl ? "text" : null,
              "-webkit-background-clip": coverUrl ? "text" : null,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
              "--jukebox-cover-filter-blur": coverUrl
                ? "url(#sharpBlur)"
                : null,
              "--jukebox-cover-filter-bright": coverUrl
                ? "url(#sharpBlurBright)"
                : null,
              "--jukebox-cover-filter-brighter": coverUrl
                ? "url(#sharpBlurBrighter)"
                : null,
              "--jukebox-cover-filter-brighter-blurless": coverUrl
                ? "url(#brighter)"
                : null,
            },
          } as unknown as StyledGlobalStylesProps["styles"]
        }
      />
      {backgroundNode}
      {!isFullscreen && (
        <Box
          pt={2}
          pb={2}
          pl={4}
          pr={4}
          display="flex"
          flexDirection="row"
          alignItems="center"
          zIndex={1}
        >
          <StyledLink href="/">Lyrics</StyledLink>
          <StyledLink
            href="/library/tracks"
            activeCriteria={(v) => v.startsWith("/library/")}
          >
            Library
          </StyledLink>
          <StyledLink
            href="/info"
            activeCriteria={(v) => v.startsWith("/info")}
          >
            Info
          </StyledLink>
          <Box flexGrow={1} />
          <IconButton
            component={NextComposedLink}
            color={router.pathname === "/search" ? "primary" : "default"}
            href="/search"
            aria-label="search"
            edge="end"
          >
            <SearchIcon />
          </IconButton>
        </Box>
      )}
      <Box
        position="relative"
        width="1"
        flexGrow={1}
        flexBasis={0}
        overflow="auto"
      >
        {children}
      </Box>
      <svg
        style={{
          border: 0,
          clip: "rect(0 0 0 0)",
          height: "1px",
          margin: "-1px",
          overflow: "hidden",
          padding: 0,
          position: "absolute",
          width: "1px",
        }}
      >
        <filter id="sharpBlur">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 0"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="sharpBlurBrighter">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 0"
            result="colorMatrix"
          />
          <feFlood floodColor="#ffffff" floodOpacity="1" result="floodWhite" />
          <feBlend
            mode="overlay"
            in="floodWhite"
            in2="colorMatrix"
            result="blend"
          />
          <feFlood
            floodColor="#ffffff"
            floodOpacity="0.3"
            result="floodWhite25"
          />
          <feBlend
            mode="hard-light"
            in="floodWhite25"
            in2="blend"
            result="furtherBlend"
          />
          <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="brighter">
          <feFlood floodColor="#ffffff" floodOpacity="1" result="floodWhite" />
          <feBlend
            mode="overlay"
            in="floodWhite"
            in2="SourceGraphic"
            result="blend"
          />
          <feFlood
            floodColor="#ffffff"
            floodOpacity="0.3"
            result="floodWhite25"
          />
          <feBlend
            mode="hard-light"
            in="floodWhite25"
            in2="blend"
            result="furtherBlend"
          />
          <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="sharpBlurBright">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 0"
            result="colorMatrix"
          />
          <feFlood
            floodColor="#000000"
            floodOpacity="0.5"
            result="floodWhite"
          />
          <feBlend
            mode="darken"
            in="floodWhite"
            in2="colorMatrix"
            result="blend"
          />
          <feFlood
            floodColor="#ffffff"
            floodOpacity="0.2"
            result="floodWhite25"
          />
          <feBlend
            mode="hard-light"
            in="floodWhite25"
            in2="blend"
            result="furtherBlend"
          />
          <feComposite in="furtherBlend" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="nicokaraBefore">
          <feMorphology
            operator="dilate"
            radius="2"
            in="SourceGraphic"
            result="morphologyStroke"
          />
          <feFlood floodColor="#000000" floodOpacity="1" result="floodStroke" />
          <feComposite
            in="floodStroke"
            in2="morphologyStroke"
            operator="in"
            result="compositeStroke"
          />
          <feMorphology
            operator="dilate"
            radius="4"
            in="SourceGraphic"
            result="morphologyShadow"
          />
          <feGaussianBlur
            stdDeviation="4"
            in="morphologyShadow"
            edgeMode="wrap"
            result="blurShadow"
          />
          <feFlood floodColor="#fa9dff" floodOpacity="1" result="floodShadow" />
          <feComposite
            in="floodShadow"
            in2="blurShadow"
            operator="in"
            result="compositeShadow"
          />
          <feMerge result="merge">
            <feMergeNode in="compositeShadow" />
            <feMergeNode in="compositeStroke" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="nicokaraAfter">
          <feMorphology
            operator="dilate"
            radius="2"
            in="SourceGraphic"
            result="morphologyStroke"
          />
          <feFlood floodColor="#ffffff" floodOpacity="1" result="floodStroke" />
          <feComposite
            in="floodStroke"
            in2="morphologyStroke"
            operator="in"
            result="compositeStroke"
          />
          <feMorphology
            operator="dilate"
            radius="4"
            in="SourceGraphic"
            result="morphologyShadow"
          />
          <feGaussianBlur
            stdDeviation="4"
            in="morphologyShadow"
            edgeMode="wrap"
            result="blurShadow"
          />
          <feFlood floodColor="#fa9dff" floodOpacity="1" result="floodShadow" />
          <feComposite
            in="floodShadow"
            in2="blurShadow"
            operator="in"
            result="compositeShadow"
          />
          <feMerge result="merge">
            <feMergeNode in="compositeShadow" />
            <feMergeNode in="compositeStroke" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
    </div>
  );
}
