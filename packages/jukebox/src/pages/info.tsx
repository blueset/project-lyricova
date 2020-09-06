import Link, { NextComposedLink } from "../components/Link";
import { getLayout } from "../components/public/layouts/IndexLayout";
import { Box, Chip } from "@material-ui/core";


export default function Information() {
  return <Box p={4} pt={2}>
    Information <Link href="/">To lyrics</Link>.
    <Chip label="Admin panel" component={NextComposedLink} target="_blank" href="login" clickable variant="outlined" />
  </Box>;
}

// Persisted layout pattern based on the works of Adam Wathan
// https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/
Information.layout = getLayout;
