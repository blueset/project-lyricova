import { siteName } from "@/utils/consts";
import Layout from "./clientLayout";

export const metadata = {
  title: {
    absolute: `${siteName} Dashboard`,
    template: `%s – ${siteName} Dashboard`,
    default: `${siteName} Dashboard`,
  },
};

export default Layout;
