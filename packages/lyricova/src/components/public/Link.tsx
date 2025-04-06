"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";

/// <reference types="../../types/global" />

export const Link = forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof NextLink>
>(({ onClick, href, ...props }, ref) => {
  const pathname = usePathname();
  const isCurrentPage = href === pathname;
  const Component = isCurrentPage ? "a" : NextLink;
  // if (isCurrentPage) {
  //   return <a {...props} ref={ref} />;
  // }
  return (
    <Component
      onClick={(evt) => {
        let target = evt.target as HTMLElement;
        if (window.getComputedStyle(target, ":after").content !== "none") {
          target = target.parentElement;
        }
        const rect = target?.getBoundingClientRect() ?? undefined;
        window.lastClickTop = rect && rect.top + rect.height / 2;
        onClick?.(evt);
      }}
      href={isCurrentPage ? "" : (href as string)}
      {...props}
      ref={ref}
    />
  );
});

Link.displayName = "Link";
