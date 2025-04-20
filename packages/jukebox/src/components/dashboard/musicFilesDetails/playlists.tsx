import type { Playlist } from "@lyricova/api/graphql/types";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import _ from "lodash";
import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { PlusCircle, Plus } from "lucide-react";
import { useNamedState } from "../../../hooks/useNamedState";
import PlaylistAvatar from "../../PlaylistAvatar";
import AddPlaylistPopoverContent from "../AddPlaylistPopoverContent";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lyricova/components/components/ui/popover";
import { Button } from "@lyricova/components/components/ui/button";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { Checkbox } from "@lyricova/components/components/ui/checkbox";
import { Skeleton } from "@lyricova/components/components/ui/skeleton";
import { Label } from "@lyricova/components/components/ui/label";

function SkeletonItem() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="size-8 rounded-md" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </div>
    </div>
  );
}

const PLAYLISTS_QUERY = gql`
  query {
    playlists {
      name
      slug
    }
  }
`;

const SET_PLAYLISTS_MUTATION = gql`
  mutation ($slugs: [String!]!, $fileId: Int!) {
    setPlaylistsOfFile(playlistSlugs: $slugs, fileId: $fileId) {
      playlists {
        name
        slug
      }
    }
  }
`;

interface Props {
  fileId: number;
  playlists: Playlist[];
  refresh: () => unknown | Promise<unknown>;
}

export default function PlaylistsPanel({ fileId, playlists, refresh }: Props) {
  const playlistsQuery = useQuery<{ playlists: Playlist[] }>(PLAYLISTS_QUERY);
  const apolloClient = useApolloClient();

  const [isOpen, setIsOpen] = useNamedState(false, "isOpen");
  const [checkedPlaylists, setCheckedPlaylists] = useNamedState<string[]>(
    [],
    "checkedPlaylists"
  );

  useEffect(() => {
    setCheckedPlaylists(playlists.map((v) => v.slug));
  }, [playlists, setCheckedPlaylists]);

  const handleSubmit = useCallback(async () => {
    try {
      const result = await apolloClient.mutate<{
        setPlaylistsOfFile: { playlists: Playlist[] };
      }>({
        mutation: SET_PLAYLISTS_MUTATION,
        variables: { fileId, slugs: checkedPlaylists },
      });
      if (result.data) {
        setCheckedPlaylists(
          result.data.setPlaylistsOfFile.playlists.map((v) => v.slug)
        );
        toast.success("Playlists saved");
        await refresh();
      }
    } catch (e) {
      console.error("Error occurred while updating playlists", e);
      toast.error(`Error occurred while updating playlists: ${e}`);
    }
  }, [apolloClient, checkedPlaylists, fileId, refresh, setCheckedPlaylists]);

  const handleToggle = useCallback(
    (value: string) => {
      if (checkedPlaylists.indexOf(value) < 0) {
        setCheckedPlaylists([...checkedPlaylists, value]);
      } else {
        setCheckedPlaylists(checkedPlaylists.filter((v) => v !== value));
      }
    },
    [checkedPlaylists, setCheckedPlaylists]
  );

  let content: ReactNode = Array.from({ length: 5 }, (_, index) => (
    <SkeletonItem key={index} />
  ));
  if (playlistsQuery.error) {
    content = (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Error occurred while retrieving playlists: {`${playlistsQuery.error}`}
        </AlertDescription>
      </Alert>
    );
  } else if (playlistsQuery.data) {
    content = playlistsQuery.data.playlists.map((v) => (
      <Label
        key={v.slug}
        className="flex items-center gap-4 py-2 -mx-4 px-4 hover:bg-accent/50 rounded-md cursor-pointer"
      >
        <Checkbox
          checked={checkedPlaylists.indexOf(v.slug) !== -1}
          onCheckedChange={() => handleToggle(v.slug)}
        />
        <PlaylistAvatar name={v.name} slug={v.slug} className="size-8" />
        <div className="flex-1">
          <div className="font-medium">{v.name}</div>
          <div className="text-sm text-muted-foreground">{v.slug}</div>
        </div>
      </Label>
    ));
  }

  return (
    <div className="flex gap-2 flex-col">
      {content}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="text-sm leading-none font-medium select-none flex items-center gap-4 py-2 -mx-4 px-4 hover:bg-accent/50 rounded-md cursor-pointer">
            <Plus className="size-4" />
            <span className="flex-1 font-medium text-start">
              Add new playlist
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-lg" align="end">
          <AddPlaylistPopoverContent
            refresh={playlistsQuery.refetch}
            dismiss={() => {
              setIsOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Button variant="outline" className="self-start" onClick={handleSubmit}>
        Save
      </Button>
    </div>
  );
}
