import * as React from "react";
import { cn } from "@lyricova/components/utils";
import { Check } from "lucide-react";

interface StepperContextValue {
  activeStep: number;
  orientation?: "vertical" | "horizontal";
}

const StepperContext = React.createContext<StepperContextValue>({
  activeStep: 0,
});

interface StepContextValue {
  isActive: boolean;
  isCompleted: boolean;
}

const StepContext = React.createContext<StepContextValue>({
  isActive: false,
  isCompleted: false,
});

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number;
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    { activeStep = 0, orientation = "vertical", className, children, ...props },
    ref
  ) => {
    // Clone children and inject index
    const childrenWithProps = React.Children.map(children, (child, index) => {
      if (React.isValidElement(child)) {
        return React.cloneElement<StepProps>(
          child as React.ReactElement<StepProps>,
          {
            ...(child as React.ReactElement<StepProps>).props,
            index: index,
          }
        );
      }
      return child;
    });

    return (
      <StepperContext.Provider value={{ activeStep, orientation }}>
        <div
          ref={ref}
          className={cn(
            "flex",
            orientation === "vertical" ? "flex-col" : "flex-row",
            className
          )}
          {...props}
        >
          {childrenWithProps}
        </div>
      </StepperContext.Provider>
    );
  }
);
Stepper.displayName = "Stepper";

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  completed?: boolean;
  disabled?: boolean;
  index?: number;
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  ({ className, children, index = -1, ...props }, ref) => {
    const { activeStep, orientation } = React.useContext(StepperContext);

    const isActive = React.useMemo(
      () => index === activeStep,
      [index, activeStep]
    );

    const isCompleted = React.useMemo(
      () => index < activeStep,
      [index, activeStep]
    );

    return (
      <StepContext.Provider value={{ isActive, isCompleted }}>
        <div
          ref={ref}
          className={cn(
            "relative flex",
            orientation === "vertical" ? "flex-col" : "flex-row",
            className
          )}
          data-active={isActive ? true : undefined}
          data-completed={isCompleted ? true : undefined}
          {...props}
        >
          <div className="flex">
            {/* Step circle indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 shrink-0 rounded-full border text-center transition-colors z-10",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCompleted
                    ? "bg-primary/80 border-primary/80 text-primary-foreground"
                    : "bg-muted border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check /> : <span>{index + 1}</span>}
              </div>
              <div className="w-0.5 h-full bg-muted flex-grow my-2" />
            </div>
            <div className="flex flex-col ml-3 grow mb-4">{children}</div>
          </div>
        </div>
      </StepContext.Provider>
    );
  }
);
Step.displayName = "Step";

interface StepLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  optional?: React.ReactNode;
}

const StepLabel = React.forwardRef<HTMLDivElement, StepLabelProps>(
  ({ className, optional, children, ...props }, ref) => {
    const { isActive, isCompleted } = React.useContext(StepContext);

    return (
      <div
        ref={ref}
        className={cn("flex flex-col min-h-8 justify-center mb-2", className)}
        {...props}
      >
        <span
          className={cn(
            "font-medium",
            isActive || isCompleted
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {children}
        </span>
        {optional && (
          <span className="text-sm text-muted-foreground">{optional}</span>
        )}
      </div>
    );
  }
);
StepLabel.displayName = "StepLabel";

interface StepContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const StepContent = React.forwardRef<HTMLDivElement, StepContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isActive } = React.useContext(StepContext);

    if (!isActive) return null;

    return (
      <div ref={ref} className={cn("mb-2", className)} {...props}>
        {children}
      </div>
    );
  }
);
StepContent.displayName = "StepContent";

export { Stepper, Step, StepLabel, StepContent };
