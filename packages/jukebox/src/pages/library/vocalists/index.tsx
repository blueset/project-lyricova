import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import type { VDBArtistType } from "../../../types/vocadb";
import ArtistsList from "../../../components/public/library/ArtistsList";

const TYPES_TO_SHOW: VDBArtistType[] = [
  "Vocaloid",
  "UTAU",
  "CeVIO",
  "OtherVoiceSynthesizer",
  "OtherVocalist",
  "OtherGroup",
  "OtherIndividual",
  "Utaite",
  "Band",
  "Vocalist",
  "Character",
  "SynthesizerV",
  "CoverArtist",
  "NEUTRINO",
  "VoiSona",
  "NewType",
  "Voiceroid",
];

export default function VocalistsList() {
  return <ArtistsList types={TYPES_TO_SHOW} typeName="vocalists" />;
}

VocalistsList.layout = getLayout;
