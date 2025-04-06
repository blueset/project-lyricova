import type { ReactNode } from "react";
import { Box, IconButton, styled } from "@mui/material";
import { Link, NextComposedLink } from "@lyricova/components";
import SearchIcon from "@mui/icons-material/Search";
import { useRouter } from "next/compat/router";
import { useAppSelector } from "../../redux/public/store";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const { isFullscreen } = useAppSelector((s) => s.display);

  let backgroundNode = (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
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
      }}
    >
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
            color={(router?.pathname ?? pathname) === "/search" ? "primary" : "default"}
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
