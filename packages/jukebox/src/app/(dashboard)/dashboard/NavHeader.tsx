import { Separator } from "@lyricova/components/components/ui/separator";
import { SidebarTrigger } from "@lyricova/components/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@lyricova/components/components/ui/breadcrumb";
import { NextComposedLink } from "@lyricova/components";
import { Fragment, ReactNode } from "react";

interface NavHeaderProps {
  breadcrumbs?: {
    label: ReactNode;
    href?: string;
  }[];
  children?: ReactNode;
}

export function NavHeader({ breadcrumbs, children }: NavHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4 grow">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb className="w-0 grow">
          <BreadcrumbList>
            {breadcrumbs?.map((breadcrumb, index) => (
              <Fragment key={index}>
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden @3xl/dashboard:block" />
                )}
                <BreadcrumbItem className="max-w-full">
                  {breadcrumb.href ? (
                    <BreadcrumbLink asChild className="truncate">
                      <NextComposedLink href={breadcrumb.href}>
                        {breadcrumb.label}
                      </NextComposedLink>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="truncate">
                      {breadcrumb.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {children && <div className="px-4">{children}</div>}
    </header>
  );
}
