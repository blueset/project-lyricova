import { Tag } from "lyricova-common/models/Tag";
import Link from "next/link";
import { CSSProperties } from "react";
import classes from "./TagRow.module.scss";

export interface TagRowProps {
  tags: Tag[];
}

export function TagRow({ tags }: TagRowProps) {
  return (
    <div className={classes.row}>
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          className={classes.tag}
          style={{ "--tag-color": tag.color } as CSSProperties}
          href={`/tags/${tag.slug}`}
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
