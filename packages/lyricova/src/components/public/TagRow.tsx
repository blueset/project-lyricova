import { Tag } from "lyricova-common/models/Tag";
import Link from "next/link";
import { useRouter } from "next/router";
import { CSSProperties } from "react";
import classes from "./TagRow.module.scss";

export interface TagRowProps {
  tags: Tag[];
}

export function TagRow({ tags }: TagRowProps) {
  const router = useRouter();
  return (
    <div className={classes.row}>
      {tags.map((tag) => (
        <span
          key={tag.slug}
          className={classes.tag}
          style={{ "--tag-color": tag.color } as CSSProperties}
          role="link"
          onMouseDown={(e) => {
            if ((e.button === 0 && e.ctrlKey) || e.button === 1) {
              e.stopPropagation();
              e.preventDefault();
              const newWindow = window.open(`/tags/${tag.slug}`, "_blank");
              if (e.button === 1) {
                newWindow?.blur();
                window.focus();
              }
            } else if (e.button === 0) {
              e.stopPropagation();
              e.preventDefault();
              router.push(`/tags/${tag.slug}`);
            }
          }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
