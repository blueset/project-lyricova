import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { IndexHeader } from "../../components/public/IndexHeader";
import classes from "./index.module.scss";
import SearchIcon from "@mui/icons-material/Search";
import { CircularProgress } from "@mui/material";
import type { ChangeEvent } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import _ from "lodash";
import type { Entry } from "lyricova-common/models/Entry";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import { motion } from "framer-motion";
import Head from "next/head";
import { host, siteName, tagLine1, tagLine2 } from "../../utils/consts";
import { useRouter } from "next/router";

const containerVariants = {
  visible: {
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

const variants = {
  hidden: { opacity: 0, y: "-50%" },
  visible: (idx: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      ease: "easeOut",
      delay: 0.1 * idx,
      duration: 0.2,
    },
  }),
};

export default function Search() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Entry[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      abortControllerRef.current?.abort();
    };
  }, []);

  const performSearch = useCallback(
    _.debounce(
      async (keyword: string) => {
        if (keyword.length === 0) {
          setIsLoading(false);
          setResults(null);
          return;
        }

        // Abort previous request if exists
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const response = await fetch(`/api/search?query=${keyword}`, {
            signal: controller.signal,
          });
          const data: Entry[] = await response.json();
          setResults(data);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            // Ignore abort errors
            return;
          }
          console.error("Search error:", err);
        } finally {
          setIsLoading(false);
        }
      },
      500,
      { leading: false, trailing: true }
    ),
    []
  );

  useEffect(() => {
    // Initialize search from URL
    const query = router.query.q as string;
    if (query) {
      setSearchValue(query);
      performSearch(query);
    }
  }, [performSearch, router.query.q]);

  const handleOnChange = async (evt: ChangeEvent<HTMLInputElement>) => {
    const keyword = evt.target.value;
    setSearchValue(keyword);
    router.replace(
      {
        pathname: router.pathname,
        query: keyword ? { q: keyword } : {},
      },
      undefined,
      { shallow: true }
    );
    performSearch(keyword);
  };

  return (
    <>
      <Head>
        <title>{`Search – ${siteName}`}</title>
        <meta
          name="description"
          content={`Search – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:title" content={`Search – ${siteName}`} />
        <meta
          name="og:description"
          content={`Search – ${siteName}: ${tagLine1} ${tagLine2}`}
        />
        <meta name="og:image" content={`${host}/images/og-cover.png`} />
      </Head>
      <IndexHeader />
      <Divider />
      <div className="container verticalPadding">
        <div className={classes.inputGroup}>
          <input
            type="text"
            placeholder="Search..."
            className={classes.input}
            value={searchValue}
            onChange={(evt) => {
              setIsLoading(true);
              handleOnChange(evt);
            }}
          />
          {isLoading ? <CircularProgress size="1.25rem" /> : <SearchIcon />}
        </div>
      </div>
      <Divider />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {results?.length
          ? results?.map((entry, idx) => (
              <motion.div key={entry.id} variants={variants} custom={idx}>
                <SingleEntry entry={entry} />
                <Divider />
              </motion.div>
            ))
          : results !== null && (
              <motion.div key={-1} variants={variants} custom={0}>
                <div
                  className={`container verticalPadding ${classes.noResult}`}
                >
                  No result found.
                </div>
                <Divider />
              </motion.div>
            )}
      </motion.div>
      <Footer />
    </>
  );
}
