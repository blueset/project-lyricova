import type { ReactNode } from "react";
import { Button } from "@lyricova/components/components/ui/button";
import { Search } from "lucide-react";
import { Link, NextComposedLink } from "@lyricova/components";
import { useAppSelector } from "../../redux/public/store";
import { usePathname } from "next/navigation";
import { cn } from "@lyricova/components/utils";

function NavLink({
  href,
  children,
  activeCriteria,
}: {
  href: string;
  children: ReactNode;
  activeCriteria?: (v: string) => boolean;
}) {
  return (
    <Link
      href={href}
      activeCriteria={activeCriteria}
      className={
        "text-2xl font-medium italic mr-4 transition-colors text-muted-foreground hover:text-primary data[active]:font-medium data[active]:text-primary"
      }
    >
      {children}
    </Link>
  );
}

interface Props {
  coverUrl: string | null;
  children?: ReactNode;
}

export default function DetailsPanel({ coverUrl = null, children }: Props) {
  const pathname = usePathname();
  const { isFullscreen } = useAppSelector((s) => s.display);

  let backgroundNode = (
    <div className="absolute w-full h-full bg-black/50 z-0" />
  );

  if (coverUrl) {
    backgroundNode = (
      <>
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
          style={{
            filter: "url(#sharpBlur)",
            backgroundImage: `url(${coverUrl})`,
          }}
        />
        {backgroundNode}
      </>
    );
  }

  return (
    <div
      className={cn(
        "inset-0 overflow-hidden w-full h-full flex flex-col",
        isFullscreen ? "fixed z-10" : "relative z-0"
      )}
    >
      {backgroundNode}
      {!isFullscreen && (
        <div className="py-4 px-6 flex flex-row items-center z-10">
          <NavLink href="/">Lyrics</NavLink>
          <NavLink
            href="/library/tracks"
            activeCriteria={(v) => v.startsWith("/library/")}
          >
            Library
          </NavLink>
          <NavLink href="/info" activeCriteria={(v) => v.startsWith("/info")}>
            Info
          </NavLink>
          <div className="flex-1" />
          <Button
            asChild
            variant={pathname === "/search" ? "default" : "ghostBright"}
            size="icon"
            aria-label="Search"
          >
            <NextComposedLink href="/search">
              <Search className="size-5" />
            </NextComposedLink>
          </Button>
        </div>
      )}
      <div className="relative w-full flex-1 overflow-auto">{children}</div>
      <svg className="sr-only">
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
          <feFlood
            floodColor="var(--primary)"
            floodOpacity="1"
            result="floodShadow"
          />
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
          <feFlood
            floodColor="var(--primary)"
            floodOpacity="1"
            result="floodShadow"
          />
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
