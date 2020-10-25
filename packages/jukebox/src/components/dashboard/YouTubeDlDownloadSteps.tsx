import { Button, Step, StepContent, StepLabel, Stepper, Typography } from "@material-ui/core";
import { Dispatch, ReactNode, SetStateAction } from "react";
import MusicDlDownloadSteps from "./MusicDlDownloadSteps";
import ButtonRow from "../ButtonRow";

interface Props {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  firstStep: ReactNode;
}

export default function YouTubeDlDownloadSteps({ step, setStep, firstStep }: Props) {
  return (
    <Stepper activeStep={step} orientation="vertical">
      {firstStep}
      <Step key="youtube-dl-1">
        <StepLabel>Download from <code>youtube-dl</code> is the title</StepLabel>
        <StepContent>
          Enter URL here.
          <ButtonRow>
            <Button variant="outlined" onClick={() => setStep(v => v - 1)}>Back</Button>
            <Button variant="outlined" onClick={() => setStep(v => v + 1)}>Next</Button>
          </ButtonRow>
        </StepContent>
      </Step>
      <Step key="youtube-dl-2">
        <StepLabel>Downloading...</StepLabel>
        <StepContent>
          Progress...
          <Button variant="outlined" onClick={() => setStep(v => v - 1)}>Back</Button>
        </StepContent>
      </Step>

    </Stepper>
  );
}