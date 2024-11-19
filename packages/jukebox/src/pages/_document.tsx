import Document, {
  DocumentContext,
  Html,
  Head,
  Main,
  NextScript,
  DocumentProps,
} from "next/document";
import React from "react";
import theme from "lyricova-common/frontendUtils/theme";
import {
  documentGetInitialProps,
  DocumentHeadTags,
  DocumentHeadTagsProps,
} from "lyricova-common/utils/mui/pagesRouterDocument";

export default function MyDocument(
  props: DocumentProps & DocumentHeadTagsProps
) {
  return (
    <Html lang="en">
      <Head>
        {/* PWA primary color */}
        <meta name="theme-color" content={theme.palette.primary.main} />
        <DocumentHeadTags {...props} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

// `getInitialProps` belongs to `_document` (instead of `_app`),
// it's compatible with static-site generation (SSG).
MyDocument.getInitialProps = async (ctx: DocumentContext) => {
  const finalProps = await documentGetInitialProps(
    ctx,
    Document.getInitialProps
  );
  return finalProps;
};
