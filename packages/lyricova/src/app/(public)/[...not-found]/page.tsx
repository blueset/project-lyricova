import { siteName } from "@/utils/consts";
import { NotFoundClient } from "./not-found-client";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return <NotFoundClient />;
}
