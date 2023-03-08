import { Divider } from "../../components/public/Divider";
import { Footer } from "../../components/public/Footer";
import { IndexHeader } from "../../components/public/IndexHeader";
import classes from "./index.module.scss";
import SearchIcon from "@mui/icons-material/Search";
import { CircularProgress } from "@mui/material";
import { ChangeEvent, Fragment, useState } from "react";
import _ from "lodash";
import { Entry } from "lyricova-common/models/Entry";
import { SingleEntry } from "../../components/public/listing/SingleEntry";
import { motion } from "framer-motion";

const variants = (idx: number) => ({
  hidden: { opacity: 0, y: "-50%" },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ease: "easeOut",
      delay: 0.1 * idx,
      duration: 0.2,
    },
  },
});

export default function Search() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Entry[] | null>(null);

  const handleOnChange = _.debounce(
    async (evt: ChangeEvent<HTMLInputElement>) => {
      const keyword = evt.target.value;
      if (keyword.length === 0) {
        setIsLoading(false);
        setResults(null);
        return;
      }

      const response = await fetch(`/api/search?query=${keyword}`);
      const data: Entry[] = await response.json();
      setResults(data);
      setIsLoading(false);
    },
    500,
    { leading: false, trailing: true }
  );

  return (
    <>
      <IndexHeader />
      <Divider />
      <div className="container verticalPadding">
        <div className={classes.inputGroup}>
          <input
            type="text"
            placeholder="Search..."
            className={classes.input}
            onChange={(evt) => {
              setIsLoading(true);
              handleOnChange(evt);
            }}
          />
          {isLoading ? <CircularProgress size="1.25rem" /> : <SearchIcon />}
        </div>
      </div>
      <Divider />
      <motion.div initial="hidden" animate="visible">
        {results?.length
          ? results?.map((entry, idx) => (
              <motion.div key={entry.id} variants={variants(idx)}>
                <SingleEntry entry={entry} />
                <Divider />
              </motion.div>
            ))
          : results !== null && (
              <motion.div key={-1} variants={variants(0)}>
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
