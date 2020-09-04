import Link from "../components/Link";
import { getLayout } from "../components/public/layouts/IndexLayout";


export default function Search() {
  return <div>Search <Link href="/">To lyrics</Link></div>;
}

Search.layout = getLayout;
