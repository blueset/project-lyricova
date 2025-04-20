"use client";

import { type ReactNode } from "react";
import {
  AuthContext,
  AuthContextConsumer,
  NextComposedLink,
  apolloClient,
} from "@lyricova/components";
import { useRouter, usePathname } from "next/navigation";
import { SnackbarProvider } from "notistack";
import { usePopupState } from "material-ui-popup-state/hooks";
import { ApolloProvider } from "@apollo/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@lyricova/components/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lyricova/components/components/ui/dropdown-menu";
import { Avatar, AvatarImage } from "@lyricova/components/components/ui/avatar";
import {
  ChevronsUpDown,
  LayoutDashboard,
  FilePenLine,
  Music2,
  Users2,
  Disc,
  ListMusic,
  RefreshCw,
  Download,
  FileDown,
  FileType2,
} from "lucide-react";
import { Toaster } from "@lyricova/components/components/ui/sonner";

interface NavMenuItemProps {
  href: string;
  as?: string;
  text: string;
  icon?: ReactNode;
  activeCriteria?: (pathName: string) => boolean;
  prefixMatch?: boolean;
}

function SideNavMenuItem({
  href,
  text,
  icon,
  activeCriteria,
  as,
  prefixMatch,
}: NavMenuItemProps) {
  const pathname = usePathname();
  const criteria =
    activeCriteria ||
    ((v: string) => (prefixMatch ? v.startsWith(href) : v === href));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={criteria(pathname)} tooltip={text}>
        <NextComposedLink href={href} as={as}>
          {icon}
          <span>{text}</span>
        </NextComposedLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const router = useRouter();
  const popupState = usePopupState({
    variant: "popover",
    popupId: "appbar-menu",
  });

  const logOut = async () => {
    await router.push("/logout");
    popupState.close();
  };
  const webAuthn = async () => {
    await router.push("/dashboard/webauthn");
    popupState.close();
  };

  return (
    <SidebarProvider className="w-full">
      <ApolloProvider client={apolloClient}>
        <AuthContext>
          <Toaster
            closeButton
            richColors
            position="bottom-left"
            visibleToasts={4}
          />
          <AuthContextConsumer>
            {(userContext) => (
              <>
                <Sidebar collapsible="icon" variant="inset">
                  <SidebarHeader>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                              size="lg"
                              tooltip={userContext.user?.displayName}
                              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                              <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage
                                  src={`https://www.gravatar.com/avatar/${userContext.user?.emailMD5}`}
                                  alt={userContext.user?.displayName}
                                />
                              </Avatar>
                              <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                  {userContext.user?.displayName}
                                </span>
                              </div>
                              <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="top"
                            align="start"
                            className="w-48 rounded-lg"
                            sideOffset={4}
                          >
                            <DropdownMenuItem onClick={webAuthn}>
                              <span>WebAuthn</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={logOut}
                            >
                              <span>Sign out</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarHeader>
                  <SidebarContent>
                    <SidebarGroup>
                      <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SideNavMenuItem
                            text="Dashboard"
                            href="/dashboard"
                            icon={<LayoutDashboard />}
                            activeCriteria={(p) => p === "/dashboard"}
                          />
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarGroup>
                      <SidebarGroupLabel>Databank</SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SideNavMenuItem
                            text="Review"
                            href="/dashboard/review"
                            prefixMatch
                            icon={<FilePenLine />}
                          />
                          <SideNavMenuItem
                            text="Music entries"
                            href="/dashboard/songs"
                            prefixMatch
                            icon={<Music2 />}
                          />
                          <SideNavMenuItem
                            text="Artist entries"
                            href="/dashboard/artists"
                            prefixMatch
                            icon={<Users2 />}
                          />
                          <SideNavMenuItem
                            text="Album entries"
                            href="/dashboard/albums"
                            prefixMatch
                            icon={<Disc />}
                          />
                          <SideNavMenuItem
                            text="Playlists"
                            href="/dashboard/playlists"
                            prefixMatch
                            icon={<ListMusic />}
                          />
                          <SideNavMenuItem
                            text="Scan"
                            href="/dashboard/scan"
                            icon={<RefreshCw />}
                          />
                          <SideNavMenuItem
                            text="Imports"
                            href="/dashboard/imports"
                            prefixMatch
                            icon={<FileDown />}
                          />
                          <SideNavMenuItem
                            text="Furigana"
                            href="/dashboard/furigana"
                            icon={<FileType2 />}
                          />
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarGroup>
                      <SidebarGroupLabel>Files</SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SideNavMenuItem
                            text="Download"
                            href="/dashboard/download"
                            icon={<Download />}
                          />
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </SidebarContent>
                  <SidebarFooter>
                    <div className="p-1 text-muted-foreground text-sm w-35 group-data-[state=collapsed]:opacity-0 transition-opacity">
                      Project Lyricova
                      <br />
                      since 2013
                      <br />
                      by 1A23 Studio
                    </div>
                  </SidebarFooter>
                </Sidebar>
                <SidebarInset className="w-0 @container/dashboard">
                  {children}
                </SidebarInset>
              </>
            )}
          </AuthContextConsumer>
        </AuthContext>
      </ApolloProvider>
    </SidebarProvider>
  );
}
