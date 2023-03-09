import React, { AnchorHTMLAttributes } from "react";
import NextLink from "next/link";
import MuiLink from "@mui/material/Link";
import { useRouter } from "next/router";
import clsx from "clsx";

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

interface LinkProps extends Omit<React.ComponentProps<typeof MuiLink>, "ref"> {
  activeClassName?: string;
  as?: string;
  className?: string;
  href: string;
  innerRef: React.Ref<HTMLAnchorElement>;
  naked?: boolean;
  prefetch?: boolean;
  children?: React.ReactNode;
  activeCriteria?: (pathName: string) => boolean;
}

// A styled version of the Next.js Link component:
// https://nextjs.org/docs/#with-link
function Link(props: LinkProps) {
  const {
    href,
    activeClassName = "active",
    className: classNameProps,
    innerRef,
    naked,
    activeCriteria,
    ...other
  } = props;

  const router = useRouter();
  const criteria = activeCriteria || ((v: string) => v === href);
  const className: string = clsx(classNameProps, {
    [activeClassName]: criteria(router.pathname) && activeClassName,
  });

  if (naked) {
    return (
      <NextComposedLink
        className={className}
        ref={innerRef}
        href={href}
        {...((other as unknown) as Omit<NextComposedProps, "href">)}
      />
    );
  }

  return (
    <MuiLink
      component={NextComposedLink}
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
export default RefLink;
