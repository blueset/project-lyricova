import { getScreensaverData } from "../screensaverData";
import TypingCenteredScreensaver from "./screensaver";

export const metadata = {
  title: "Centered",
};

export default async function Screensaver({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const data = await getScreensaverData(await searchParams);
  return <TypingCenteredScreensaver {...data} />;
}
