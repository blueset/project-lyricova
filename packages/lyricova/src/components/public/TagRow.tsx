import type { Tag } from "@lyricova/api/graphql/types";
import type { CSSProperties } from "react";
import { Link } from "./Link";
import classes from "./TagRow.module.scss";

export interface TagRowProps {
  tags: Tag[];
}

export function TagRow({ tags }: TagRowProps) {
  return (
    <div className={classes.row} lang="en">
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={`/tags/${tag.slug}`}
          className={classes.tag}
          style={{ "--tag-color": tag.color } as CSSProperties}
          role="link"
          rel="tag"
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
