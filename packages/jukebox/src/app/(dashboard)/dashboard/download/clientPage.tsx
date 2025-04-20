"use client";

import { useNamedState } from "@/hooks/useNamedState";
import type { ReactNode } from "react";
import { useCallback } from "react";
import YouTubeDlDownloadSteps from "@/components/dashboard/YouTubeDlDownloadSteps";
import {
  Step,
  StepContent,
  StepLabel,
  Stepper,
} from "@lyricova/components/components/ui/stepper";
import { Button } from "@lyricova/components/components/ui/button";
import { NavHeader } from "../NavHeader";

function BlankStepper({ firstStep }: { firstStep: ReactNode }) {
  return (
    <Stepper activeStep={0} orientation="vertical">
      {firstStep}
    </Stepper>
  );
}

export default function DownloadMusicFile() {
  const [step, setStep] = useNamedState(0, "step");
  const [chosenSource, setChosenSource] = useNamedState<"yt-dlp" | null>(
    null,
    "chosenSource"
  );

  const chooseSource = useCallback(
    (sourceName: "yt-dlp") => () => {
      setChosenSource(sourceName);
      setStep(1);
    },
    [setStep, setChosenSource]
  );

  const firstStep = (
    <Step>
      <StepLabel>
        {step === 0 ? "Choose source" : `Source: ${chosenSource}`}
      </StepLabel>
      <StepContent>
        <div className="mb-4">
          You can choose from one of the <del>3 sources</del> 1 source for
          downloads.
        </div>
        <Button variant="outline" onClick={chooseSource("yt-dlp")}>
          yt-dlp
        </Button>
      </StepContent>
    </Step>
  );

  let stepper = <BlankStepper firstStep={firstStep} />;
  if (chosenSource === "yt-dlp") {
    stepper = (
      <YouTubeDlDownloadSteps
        step={step}
        setStep={setStep}
        firstStep={firstStep}
      />
    );
  }
  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Download" },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">{stepper}</div>
    </>
  );
}
