"use client";

import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { gql, useApolloClient } from "@apollo/client";
import { useNamedState } from "@/hooks/useNamedState";
import { toast } from "sonner";
import type { Artist } from "@lyricova/api/graphql/types";
import { NavHeader } from "../NavHeader";

const ARTISTS_TO_IMPORT_QUERY = gql`
  query {
    artistsWithFilesNeedEnrol
  }
`;

export default function Imports() {
  const [importing, setImporting] = useNamedState(false, "importing");
  const [artistImportOutcomes, setArtistImportOutcomes] = useNamedState<
    Artist[]
  >([], "importing");
  const apolloClient = useApolloClient();

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: "Imports",
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">
        <h2 className="text-xl font-semibold">Batch imports from VocaDB</h2>
        <ProgressButton
          onClick={async () => {
            setImporting(true);
            const data = await apolloClient.query<{
              artistsWithFilesNeedEnrol: number[];
            }>({
              query: ARTISTS_TO_IMPORT_QUERY,
            });
            if (data.error) {
              toast.error(`Error: ${data.error}`);
              setImporting(false);
              return;
            }
            const artists = data.data.artistsWithFilesNeedEnrol;
            if (artists.length === 0) {
              toast.info("No artist to import.");
              setImporting(false);
              return;
            }
            const importMutation = gql`
                mutation importArtist {
                  ${artists
                    .map(
                      (a, idx) =>
                        `import${idx}: enrolArtistFromVocaDB(artistId: ${a}) { id\n name }`
                    )
                    .join("\n")}
                }
              `;
            try {
              const importData = await apolloClient.mutate<{
                [key: string]: Artist;
              }>({
                mutation: importMutation,
              });
              toast.success(`Imported ${artists.length} artists`);
              setArtistImportOutcomes(Object.values(importData.data));
            } catch (e) {
              toast.error(`Error: ${e}`);
            }
            setImporting(false);
          }}
          progress={importing}
        >
          Import incomplete artist entries
        </ProgressButton>
        {artistImportOutcomes.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Imported artists</h3>
            <ul className="list-disc pl-6 space-y-1">
              {artistImportOutcomes.map((a) => (
                <li key={a.id}>
                  {a.id}: {a.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
