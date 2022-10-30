import { Avatar, Theme } from "@mui/material";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { useField } from "react-final-form";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

export default function AvatarField({name, className, sx}: {
  name: string;
  className?: string;
  sx?: SxProps<Theme>;
}) {
  const src = useField<string>(name).input.value;
  return (
    <Avatar
      src={src} variant="rounded"
      className={className} sx={sx}
    >
      <MusicNoteIcon />
    </Avatar>
  );
}