import { Button, Step, StepContent, StepLabel, Stepper, Typography } from "@material-ui/core";
import { useNamedState } from "../../frontendUtils/hooks";
import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import { makeStyles } from "@material-ui/core/styles";
import { ReactNode, useCallback } from "react";
import YouTubeDlDownloadSteps from "../../components/dashboard/YouTubeDlDownloadSteps";
import MusicDlDownloadSteps from "../../components/dashboard/MusicDlDownloadSteps";
import ButtonRow from "../../components/ButtonRow";
import MxGetDownloadSteps from "../../components/dashboard/MxGetDownloadSteps";

function BlankStepper({ firstStep }: { firstStep: ReactNode }) {
  return <Stepper activeStep={0} orientation="vertical">
    {firstStep}
  </Stepper>;
}

const useStyles = makeStyles((theme) => ({
  button: {
    marginRight: theme.spacing(1),
  }
}));

export default function DownloadMusicFile() {
  const [step, setStep] = useNamedState(0, "step");
  const [chosenSource, setChosenSource] = useNamedState<"youtube-dl" | "music-dl" | "mxget" | null>(null, "chosenSource");
  const styles = useStyles();

  const chooseSource = useCallback((sourceName: "youtube-dl" | "music-dl"| "mxget" ) => () => {
    setChosenSource(sourceName);
    setStep(1);
  }, [setStep, setChosenSource]);

  const firstStep = (
    <Step>
      <StepLabel>{step === 0 ? "Choose source" : `Source: ${chosenSource}`}</StepLabel>
      <StepContent>
        <Typography gutterBottom>You can choose from one of the 3 sources for downloads.</Typography>
        <ButtonRow>
          <Button variant="outlined" onClick={chooseSource("youtube-dl")}>Youtube-dl</Button>
          <Button variant="outlined" onClick={chooseSource("music-dl")}>Music-dl</Button>
          <Button variant="outlined" onClick={chooseSource("mxget")}>MxGet</Button>
        </ButtonRow>
      </StepContent>
    </Step>
  );

  if (chosenSource === "youtube-dl") {
    return <YouTubeDlDownloadSteps step={step} setStep={setStep} firstStep={firstStep} />;
  }
  if (chosenSource === "music-dl") {
    return <MusicDlDownloadSteps step={step} setStep={setStep} firstStep={firstStep} />;
  }
  if (chosenSource === "mxget") {
    return <MxGetDownloadSteps step={step} setStep={setStep} firstStep={firstStep} />;
  }
  return <BlankStepper firstStep={firstStep} />;
}

DownloadMusicFile.layout = getLayout("Download music files");