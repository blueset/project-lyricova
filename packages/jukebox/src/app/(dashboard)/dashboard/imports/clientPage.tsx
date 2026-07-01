"use client";

import { ProgressButton } from "@lyricova/components/components/ui/progress-button";
import { useApolloClient } from "@apollo/client";
import { graphql } from "@lyricova/components/gql";
import type { ResultOf } from "@graphql-typed-document-node/core";
import { useNamedState } from "@/hooks/useNamedState";
import { toast } from "sonner";
import { NavHeader } from "../NavHeader";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@lyricova/components/components/ui/item";

const ARTISTS_TO_IMPORT_QUERY = graphql(`
  query ArtistsToImport {
    artistsWithFilesNeedEnrol
  }
`);

const ENROL_ARTISTS_MUTATION = graphql(`
  mutation EnrolArtistsFromVocaDB($artistIds: [Int!]!) {
    enrolArtistsFromVocaDB(artistIds: $artistIds) {
      id
      name
    }
  }
`);

type ImportedArtist = ResultOf<
  typeof ENROL_ARTISTS_MUTATION
>["enrolArtistsFromVocaDB"][number];

export default function Imports() {
  const [importing, setImporting] = useNamedState(false, "importing");
  const [artistImportOutcomes, setArtistImportOutcomes] = useNamedState<
    ImportedArtist[]
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
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Import incomplete artist entries from VocaDB</ItemTitle>
            <ItemDescription>
              Batch import all artists that have music files in the library but
              are not yet enrolled in the database.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ProgressButton
              onClick={async () => {
                setImporting(true);
                const data = await apolloClient.query({
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
                try {
                  const importData = await apolloClient.mutate({
                    mutation: ENROL_ARTISTS_MUTATION,
                    variables: { artistIds: artists },
                  });
                  toast.success(`Imported ${artists.length} artists`);
                  setArtistImportOutcomes(
                    importData.data?.enrolArtistsFromVocaDB ?? []
                  );
                } catch (e) {
                  toast.error(`Error: ${e}`);
                }
                setImporting(false);
              }}
              progress={importing}
              variant="outline"
            >
              Import
            </ProgressButton>
          </ItemActions>
        </Item>
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
