"use client";

import ArtistDetails from "@/components/public/library/ArtistDetails";
import { useParams } from "next/navigation";

export default function ProducerDetails() {
  const { artistId: artistIdString } = useParams<{ artistId: string }>();
  const artistId = parseInt(artistIdString as string);
  if (isNaN(artistId)) {
    return <div>Error: Invalid artist ID</div>;
  }
  return <ArtistDetails id={artistId} type="producers" />;
}
