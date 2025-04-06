import ArtistsList from "@/components/public/library/ArtistsList";
import type { VDBArtistType } from "@/types/vocadb";

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

export default function ProducersList() {
  return <ArtistsList types={TYPES_TO_SHOW} typeName="vocalists" />;
}
