import { apiBaseUrl } from "@/utils/consts";
import { Entry, Verse } from "@lyricova/api/graphql/types";

export interface ScreensaverProps {
  entries: Entry[];
  verses: Verse[];
}

export async function getScreensaverData(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  const response = await fetch(
    `${apiBaseUrl}/entries/screensaver?${params.toString()}`
  );
  const data: ScreensaverProps = await response.json();
  return data;
}
