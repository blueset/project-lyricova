import { GetServerSideProps } from "next";
import { ScreensaverProps } from "../../utils/screensaverProps";
import { getServerSideProps as getProps } from "../../utils/screensaverProps";

export const getServerSideProps: GetServerSideProps<ScreensaverProps> =
  getProps;

export default function MarcacosScreensaver({
  entries,
  verses,
}: ScreensaverProps) {
  return <></>;
}
