"use client";

import React, { AnchorHTMLAttributes } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@lyricova/components/utils";

interface NextComposedProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  as?: string;
  href: string;
  prefetch?: boolean;
  className?: string;
}

export const NextComposedLink = React.forwardRef<
  HTMLAnchorElement,
  NextComposedProps
>(function NextComposed(props, ref) {
  const { as, href, ...other } = props;

  return <NextLink href={href} as={as} ref={ref} {...(other as any)} />;
});

interface LinkProps extends Omit<NextComposedProps, "ref"> {
  innerRef: React.Ref<HTMLAnchorElement>;
  activeCriteria?: (pathName: string) => boolean;
}

// A styled version of the Next.js Link component:
// https://nextjs.org/docs/#with-link
function Link(props: LinkProps) {
  const {
    href,
    className: classNameProps,
    innerRef,
    activeCriteria,
    ...other
  } = props;

  const pathname = usePathname();
  const criteria = activeCriteria || ((v: string) => v === href);
  const isActive = pathname && criteria(pathname);

  const className = cn(
    "text-primary underline-offset-4 hover:underline data-[active]:font-semibold data-[active]:text-primary",
    classNameProps
  );

  return (
    <NextComposedLink
      data-active={isActive ? "true" : undefined}
      className={className}
      ref={innerRef}
      href={href}
      {...other}
    />
  );
}

const RefLink = React.forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, "innerRef">
>((props, ref) => <Link {...props} innerRef={ref} />);
RefLink.displayName = "Link";
export { RefLink as Link };
