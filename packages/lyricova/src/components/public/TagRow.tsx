import { Tag } from "lyricova-common/models/Tag";
import { useRouter } from "next/router";
import { CSSProperties, MouseEventHandler } from "react";
import classes from "./TagRow.module.scss";

export interface TagRowProps {
  tags: Tag[];
}

export function TagRow({ tags }: TagRowProps) {
  const router = useRouter();
  const handleClick = (tag: Tag): MouseEventHandler => (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Selecting tag");
    if ((e.button === 0 && e.ctrlKey) || e.button === 1) {
      window.open(`/tags/${tag.slug}`, "_blank");
    } else if (e.button === 0) {
      router.push(`/tags/${tag.slug}`);
    }
  };
  return (
    <div className={classes.row}>
      {tags.map((tag) => (
        <span
          key={tag.slug}
          className={classes.tag}
          style={{ "--tag-color": tag.color } as CSSProperties}
          role="link"
          onClick={handleClick(tag)}
          onMouseDown={handleClick(tag)}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
