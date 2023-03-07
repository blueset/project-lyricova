import Link from "next/link";
import classes from "./Paginator.module.scss";

function PreviousArrow({ className }: { className?: string }) {
  return (
    <svg
      width="60"
      height="17"
      viewBox="0 0 60 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Previous page</title>
      <path
        d="M8.32109 16.3154L0.369385 8.36369L8.32109 0.411987L9.85518 1.92903L4.52848 7.25574H59.3637V9.47165H4.52848L9.85518 14.7898L8.32109 16.3154Z"
        fill="currentcolor"
      />
    </svg>
  );
}

function NextArrow({ className }: { className?: string }) {
  return (
    <svg
      width="59"
      height="17"
      viewBox="0 0 59 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <title>Next page</title>
      <path
        d="M51.0426 16.3154L49.5085 14.7898L54.8352 9.47165H0V7.25574H54.8352L49.5085 1.92903L51.0426 0.411987L58.9943 8.36369L51.0426 16.3154Z"
        fill="currentcolor"
      />
    </svg>
  );
}

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
        <PreviousArrow className={classes.disabledLink} />
      ) : (
        <Link
          href={currentPage > 2 ? `${prefix}pages/${currentPage - 1}` : prefix}
        >
          <PreviousArrow className={classes.prevLink} />
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
            href={i !== 0 ? `${prefix}pages/${i + 1}` : prefix}
          />
        ))}
      </span>
      <span className={classes.pageNumber}>
        Page <span className={classes.pageNumberCurrent}>{currentPage}</span> of{" "}
        {totalPages}
      </span>
      {currentPage >= totalPages ? (
        <NextArrow className={classes.disabledLink} />
      ) : (
        <Link href={`${prefix}pages/${currentPage + 1}`}>
          <NextArrow className={classes.nextLink} />
        </Link>
      )}
    </div>
  );
}
