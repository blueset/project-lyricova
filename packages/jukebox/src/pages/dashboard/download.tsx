import {
  Button,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import { useNamedState } from "../../frontendUtils/hooks";
import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import { makeStyles } from "@mui/material/styles";
import type { ReactNode} from "react";
import { useCallback } from "react";
import YouTubeDlDownloadSteps from "../../components/dashboard/YouTubeDlDownloadSteps";
import MusicDlDownloadSteps from "../../components/dashboard/MusicDlDownloadSteps";
import ButtonRow from "../../components/ButtonRow";
import MxGetDownloadSteps from "../../components/dashboard/MxGetDownloadSteps";

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
          You can choose from one of the 3 sources for downloads.
        </Typography>
        <ButtonRow>
          <Button variant="outlined" onClick={chooseSource("yt-dlp")}>
            yt-dlp
          </Button>
          {/* <Button variant="outlined" onClick={chooseSource("music-dl")}>Music-dl</Button>
          <Button variant="outlined" onClick={chooseSource("mxget")}>MxGet</Button> */}
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
  // if (chosenSource === "music-dl") {
  //   return <MusicDlDownloadSteps step={step} setStep={setStep} firstStep={firstStep} />;
  // }
  // if (chosenSource === "mxget") {
  //   return <MxGetDownloadSteps step={step} setStep={setStep} firstStep={firstStep} />;
  // }
  return <BlankStepper firstStep={firstStep} />;
}

DownloadMusicFile.layout = getLayout("Download music files");
