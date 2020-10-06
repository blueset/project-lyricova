import Link, { NextComposedLink } from "../components/Link";
import { getLayout } from "../components/public/layouts/IndexLayout";
import { Box, Chip } from "@material-ui/core";
import { useAuthContext } from "../components/public/AuthContext";


export default function Information() {
  const user = useAuthContext().user;
  return <Box p={4} pt={2}>
    Information <Link href="/">To lyrics</Link>.
    <div>
      <Chip label="Admin panel" component={NextComposedLink} target="_blank" href="login" clickable variant="outlined" />
      {user && <Chip label="Log out" component={NextComposedLink} href="logout" clickable variant="outlined" />}
    </div>
  </Box>;
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Information.layout = getLayout;
