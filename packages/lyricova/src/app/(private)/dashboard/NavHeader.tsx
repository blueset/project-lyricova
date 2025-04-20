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
}

export function NavHeader({ breadcrumbs }: NavHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs?.map((breadcrumb, index) => (
              <Fragment key={index}>
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden @3xl/dashboard:block" />
                )}
                <BreadcrumbItem>
                  {breadcrumb.href ? (
                    <BreadcrumbLink asChild>
                      <NextComposedLink href={breadcrumb.href}>
                        {breadcrumb.label}
                      </NextComposedLink>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
