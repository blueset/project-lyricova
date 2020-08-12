import React from "react";
import NextLink from "next/link";
import { Link as MuiLink } from "@material-ui/core";
import { useRouter } from "next/router";
import clsx from "clsx";


interface NextComposedProps {
  as?: string;
  href: string;
  prefetch?: boolean;
  className?: string;
}

const NextComposed = React.forwardRef<HTMLAnchorElement, NextComposedProps>(function NextComposed(props, ref) {
  const { as, href, ...other } = props;

  return (
    <NextLink href={href} as={as}>
      <a ref={ref} {...other} />
    </NextLink>
  );
});

interface LinkProps {
  activeClassName?: string;
  as?: string;
  className?: string;
  href: string;
  innerRef: React.Ref<HTMLAnchorElement>;
  naked?: boolean;
  onClick?: () => {};
  prefetch?: boolean;

  children?: React.ReactChild;
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
    ...other
  } = props;

  const router = useRouter();
  const className: string = clsx(classNameProps, {
    [activeClassName]: router.pathname === href && activeClassName,
  });

  if (naked) {
    return <NextComposed className={className} ref={innerRef} href={href} {...other} />;
  }

  return (
    <MuiLink component={NextComposed} className={className} ref={innerRef} href={href} {...other} />
  );
}

Link.propTypes = {

};

export default React.forwardRef<HTMLAnchorElement, Omit<LinkProps, "innerRef">>((props, ref) => <Link {...props} innerRef={ref} />);