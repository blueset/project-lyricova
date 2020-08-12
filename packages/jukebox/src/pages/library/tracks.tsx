import Link from "../../components/Link";
import IndexLayout from "../../components/public/layouts/IndexLayout";


export default function Index() {
  return <div>Library Tracks</div>;
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Index.layout = IndexLayout;
