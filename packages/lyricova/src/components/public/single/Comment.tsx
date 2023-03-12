import { Divider } from "../Divider";
import classes from "./Comment.module.scss";

interface CommentProps {
  children: string;
}

export function Comment({ children }: CommentProps) {
  if (!children) {
    return null;
  }
  return (
    <>
      <div className={`container verticalPadding ${classes.comment}`}>
        <h2 className={classes.commentTitle}>Notes</h2>
        <div
          className={classes.commentText}
          dangerouslySetInnerHTML={{ __html: children }}
        />
      </div>
      <Divider />
    </>
  );
}
