import { getLayout } from "../../../components/public/layouts/LibraryLayout";
import ArtistsList from "../../../components/public/library/ArtistsList";
import type { VDBArtistType } from "../../../types/vocadb";

const TYPES_TO_SHOW: VDBArtistType[] = [
  "Unknown",
  "Circle",
  "Label",
  "Producer",
  "Lyricist",
  "CoverArtist",
];

export default function ProducersList() {
  return <ArtistsList types={TYPES_TO_SHOW} typeName="producers" />;
}

ProducersList.layout = getLayout;
