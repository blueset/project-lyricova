import { Avatar } from "@material-ui/core";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import { useField } from "react-final-form";

export default function AvatarField({name, className}: {
  name: string;
  className?: string;
}) {
  const src = useField<string>(name).input.value;
  return (
    <Avatar
      src={src} variant="rounded"
      className={className}
    >
      <MusicNoteIcon />
    </Avatar>
  );
}