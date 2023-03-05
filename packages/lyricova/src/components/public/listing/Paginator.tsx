import Link from "next/link";
import classes from "./Paginator.module.scss";

interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  prefix: string;
}

export function Paginator({ currentPage, totalPages, prefix }: PaginatorProps) {
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className={`container ${classes.paginator}`}>
      {currentPage <= 1 ? (
        <img
          src="/images/prev.svg"
          alt="Previous page"
          className={classes.disabledLink}
        />
      ) : (
        <Link href={`${prefix}/${currentPage - 1}`}>
          <img
            src="/images/prev.svg"
            alt="Previous page"
            className={classes.prevLink}
          />
        </Link>
      )}
      <span className={classes.pageDots}>
        {[...Array(totalPages)].map((_, i) => (
          <Link
            key={i}
            className={
              currentPage === i + 1
                ? `${classes.pageDot} ${classes.pageDotActive}`
                : classes.pageDot
            }
            aria-label={`Page ${i + 1}`}
            href={`${prefix}/${i + 1}`}
          />
        ))}
      </span>
      {currentPage >= totalPages ? (
        <img
          src="/images/next.svg"
          alt="Next page"
          className={classes.disabledLink}
        />
      ) : (
        <Link href={`${prefix}/${currentPage + 1}`}>
          <img
            src="/images/next.svg"
            alt="Next page"
            className={classes.nextLink}
          />
        </Link>
      )}
    </div>
  );
}
