import { getScreensaverData } from "../screensaverData";
import TypingStackedScreensaver from "./screensaver";

export default async function Screensaver({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const data = await getScreensaverData(await searchParams);
  return <TypingStackedScreensaver {...data} />;
}
