"use client";
import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@lyricova/components/components/ui/tabs";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const match = pathname.match(/^\/library\/(\w+)\/?.*/);
  const tabBarValue = match ? match[1] : "tracks";

  const handleTabChange = (value: string) => {
    router.push(`/library/${value}`);
  };

  return (
    <Tabs
      value={tabBarValue}
      onValueChange={handleTabChange}
      className="mx-4 self-start h-full"
    >
      <TabsList className="overflow-x-auto self-start shrink-0">
        <TabsTrigger value="tracks">Tracks</TabsTrigger>
        <TabsTrigger value="albums">Albums</TabsTrigger>
        <TabsTrigger value="producers">Producers</TabsTrigger>
        <TabsTrigger value="vocalists">Vocalists</TabsTrigger>
        <TabsTrigger value="playlists">Playlists</TabsTrigger>
      </TabsList>
      <div className="flex flex-col h-full bg-background rounded-t-md">
        <div className="flex-grow h-0 overflow-auto">{children}</div>
      </div>
    </Tabs>
  );
}
