import { getScreensaverData } from "../screensaverData";
import MarcacosScreensaver from "./screensaver";

export const metadata = {
  title: "Marcacos",
};

export default async function Screensaver({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const data = await getScreensaverData(await searchParams);
  return <MarcacosScreensaver {...data} />;
}
