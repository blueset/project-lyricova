"use client";

import {
  Button,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { useNamedState } from "@/hooks/useNamedState";
import type { ReactNode } from "react";
import { useCallback } from "react";
import YouTubeDlDownloadSteps from "@/components/dashboard/YouTubeDlDownloadSteps";
import ButtonRow from "@/components/ButtonRow";

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
        <Typography gutterBottom>
          You can choose from one of the <del>3 sources</del> 1 source for
          downloads.
        </Typography>
        <ButtonRow>
          <Button variant="outlined" onClick={chooseSource("yt-dlp")}>
            yt-dlp
          </Button>
        </ButtonRow>
      </StepContent>
    </Step>
  );

  if (chosenSource === "yt-dlp") {
    return (
      <YouTubeDlDownloadSteps
        step={step}
        setStep={setStep}
        firstStep={firstStep}
      />
    );
  }
  return <BlankStepper firstStep={firstStep} />;
}
