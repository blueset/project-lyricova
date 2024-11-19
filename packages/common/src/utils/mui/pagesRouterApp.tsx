// @source https://github.com/mui/material-ui/blob/master/packages/mui-material-nextjs/src/v13-pagesRouter/pagesRouterV13App.tsx

import * as React from "react";
import { CacheProvider, EmotionCache } from "@emotion/react";
import createEmotionCache from "./createCache";

export interface EmotionCacheProviderProps {
  emotionCache?: EmotionCache;
}

const defaultEmotionCache = createEmotionCache();

export function AppCacheProvider({
  emotionCache = defaultEmotionCache,
  children,
}: React.PropsWithChildren<EmotionCacheProviderProps>) {
  return <CacheProvider value={emotionCache}>{children}</CacheProvider>;
}
