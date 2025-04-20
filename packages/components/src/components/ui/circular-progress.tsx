import * as React from "react";
import { cn } from "@lyricova/components/utils";

interface CircularProgressProps extends React.SVGAttributes<SVGSVGElement> {
  /**
   * The value of the progress indicator, from 0 to 100.
   * If undefined, the progress bar will be in indeterminate state.
   */
  value?: number;
  /**
   * The size (width and height) of the progress indicator.
   * @default 24
   */
  size?: number;
  /**
   * The thickness of the progress stroke.
   * @default 2
   */
  strokeWidth?: number;
}

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  ({ className, value, size = 24, strokeWidth = 2, ...props }, ref) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // Calculate the offset for determinate progress
    const offset =
      value !== undefined
        ? circumference - (value / 100) * circumference
        : circumference * 0.2; // Default offset for indeterminate state

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        // Apply base classes and conditional classes/styles
        className={cn(
          // Default to indeterminate animation if value is not provided
          value === undefined && "animate-spin",
          // Rotate for determinate progress to start from the top
          value !== undefined && "-rotate-90 transform",
          className
        )}
        // Disable spin animation if value is provided (determinate)
        style={value !== undefined ? { animation: "none" } : {}}
        {...props}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20" // Use opacity for the track
        />
        {/* Progress indicator */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset} // Apply calculated offset for determinate
          strokeLinecap="round" // Rounded line ends
          // Indeterminate animation relies on the parent SVG's spin
        />
      </svg>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export { CircularProgress };
