import { apiBaseUrl } from "@/utils/consts";
import type { Entry, Verse } from "@/frontendUtils/restTypes";

export interface ScreensaverProps {
  entries: Entry[];
  verses: Verse[];
}

export async function getScreensaverData(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  const response = await fetch(
    `${apiBaseUrl}/entries/screensaver?${params.toString()}`,
    { cache: "no-store" }
  );
  const data: ScreensaverProps = await response.json();
  return data;
}
