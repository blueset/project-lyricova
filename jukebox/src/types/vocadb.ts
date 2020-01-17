export type VDBLanguageType = "Unspecified" | "Japanese" | "Romaji" | "English";
export type VDBPVServiceType =
  | "Nothing"
  | "NicoNicoDouga"
  | "Youtube"
  | "SoundCloud"
  | "Vimeo"
  | "Piapro"
  | "Bilibili"
  | "File"
  | "LocalFile"
  | "Creofuga"
  | "Bandcamp";
export type VDBPVType = "Original" | "Reprint" | "Other";
export type VDBSongType =
  | "Unspecified"
  | "Original"
  | "Remaster"
  | "Remix"
  | "Cover"
  | "Arrangement"
  | "Instrumental"
  | "Mashup"
  | "MusicPV"
  | "DramaPV"
  | "Live"
  | "Illustration"
  | "Other";
export type VDBStatusType = "Draft" | "Finished" | "Approved" | "Locked";
export type VDBAlbumDiscType =
  | "Unknown"
  | "Album"
  | "Single"
  | "EP"
  | "SplitAlbum"
  | "Compilation"
  | "Video"
  | "Artbook"
  | "Game"
  | "Fanmade"
  | "Instrumental"
  | "Other";
export type VDBArtistCategoryType =
  | "Nothing"
  | "Vocalist"
  | "Producer"
  | "Animator"
  | "Label"
  | "Circle"
  | "Other"
  | "Band"
  | "Illustrator"
  | "Subject";
export type VDBArtistRoleType =
  | "Default"
  | "Animator"
  | "Arranger"
  | "Composer"
  | "Distributor"
  | "Illustrator"
  | "Instrumentalist"
  | "Lyricist"
  | "Mastering"
  | "Publisher"
  | "Vocalist"
  | "VoiceManipulator"
  | "Other"
  | "Mixer"
  | "Chorus"
  | "Encoder"
  | "VocalDataProvider";
export type VDBTranslationType = "Original" | "Romanized" | "Translation";
export type VDBReleaseEventCategoryType =
  | "Unspecified"
  | "AlbumRelease"
  | "Anniversary"
  | "Club"
  | "Concert"
  | "Contest"
  | "Convention"
  | "Other";
export type VDBWebLinkCategoryType =
  | "Official"
  | "Commercial"
  | "Reference"
  | "Other";
export type VDBArtistType =
  | "Unknown"
  | "Circle"
  | "Label"
  | "Producer"
  | "Animator"
  | "Illustrator"
  | "Lyricist"
  | "Vocaloid"
  | "UTAU"
  | "CeVIO"
  | "OtherVoiceSynthesizer"
  | "OtherVocalist"
  | "OtherGroup"
  | "OtherIndividual"
  | "Utaite"
  | "Band"
  | "Vocalist"
  | "Character";
export type VDBArtistForEventRoleType =
  | "Default"
  | "Dancer"
  | "DJ"
  | "Instrumentalist"
  | "Organizer"
  | "Promoter"
  | "VJ"
  | "Vocalist"
  | "VoiceManipulator"
  | "OtherPerformer"
  | "Other";
export type VDBReleaseEventSeriesCategoryType =
  | "Unspecified"
  | "AlbumRelease"
  | "Anniversary"
  | "Club"
  | "Concert"
  | "Contest"
  | "Convention"
  | "Other";
export type VDBSongListFeaturedCategoryType =
  | "Nothing"
  | "Concerts"
  | "VocaloidRanking"
  | "Pools"
  | "Other";
export type VDBArtistForArtistLinkType =
  | "CharacterDesigner"
  | "Group"
  | "Illustrator"
  | "Manager"
  | "VoiceProvider";

export interface SongForApiContract {
  additionalNames: string;
  albums?: AlbumContract[];
  artists?: ArtistForSongContract[];
  artistString: string;
  createDate: string;
  defaultName: string;
  defualtNameLanguage: VDBLanguageType;
  deleted: boolean;
  favoritedTimes: number;
  id: number;
  lengthSeconds: number;
  lyrics?: LyricsForSongContract[];
  mainPicture?: EntryThumbForApiContract;
  mergedTo?: number;
  name: string;
  names?: LocalizedStringContract[];
  originalVersionId?: number;
  publishDate?: string;
  pvs?: PVContract[];
  pvServices: VDBPVServiceType;
  ratingScore: number;
  releaseEvent?: ReleaseEventForApiContract;
  songType: VDBSongType;
  status: VDBStatusType;
  tags?: TagUsageForApiContract[];
  thumbUrl?: string;
  version: number;
  webLinks?: WebLinkForApiContract[];
}
export interface AlbumContract {
  additionalNames: string;
  artistString: string;
  coverPictureMime: string;
  createDate: string;
  deleted: boolean;
  discType: VDBAlbumDiscType;
  id: number;
  name: string;
  ratingAverage: number;
  ratingCount: number;
  releaseDate?: OptionalDateTimeContract;
  releaseEvent?: ReleaseEventForApiContract;
  status: VDBStatusType;
  version: number;
}
export interface ArtistForSongContract {
  artist: ArtistContract;
  categories: VDBArtistCategoryType;
  effectiveRoles: VDBArtistRoleType;
  id: number;
  isCustomName: boolean;
  isSupport: boolean;
  name: string;
  roles: VDBArtistRoleType;
}
export interface LyricsForSongContract {
  cultureCode: string;
  id: number;
  source: string;
  translationType: VDBTranslationType;
  url: string;
  value: string;
}
export interface EntryThumbForApiContract {
  mime?: string;
  urlSmallThumb?: string;
  urlThumb: string;
  urlTinyThumb?: string;
}
export interface LocalizedStringContract {
  language: VDBLanguageType;
  value: string;
}
export interface PVContract {
  author: string;
  createdBy?: number;
  disabled: boolean;
  extendedMetadata?: PVExtendedMetadata;
  id: number;
  length: number;
  name: string;
  publishDate?: string;
  pvId?: string;
  service: Exclude<VDBPVServiceType, "Nothing">;
  pvType: VDBPVType;
  thumbUrl?: string;
  url: string;
}
export interface ReleaseEventForApiContract {
  additionalNames?: string;
  artists?: ArtistForEventContract[];
  category: VDBReleaseEventCategoryType;
  date: string;
  description?: string;
  endDate?: string;
  id: number;
  mainPicture?: EntryThumbForApiContract;
  name: string;
  names?: LocalizedStringContract[];
  series?: ReleaseEventSeriesContract;
  seriesId: number;
  seriesNumber: number;
  seriesSuffix: string;
  songList: SongListBaseContract;
  status: VDBStatusType;
  urlSlug: string;
  venueName?: string;
  version: number;
  webLinks?: WebLinkForApiContract[];
}
export interface TagUsageForApiContract {
  count: number;
  tag: TagBaseContract;
}
export interface WebLinkForApiContract {
  category: VDBWebLinkCategoryType;
  description: string;
  id: number;
  url: string;
}
export interface OptionalDateTimeContract {
  day: number;
  formatted: string;
  isEmpty: boolean;
  month: number;
  year: number;
}
export interface ArtistContract {
  additionalNames: string;
  artistType: VDBArtistType;
  deleted: boolean;
  id: number;
  name: string;
  pictureMime: string;
  releaseDate?: string;
  status: VDBStatusType;
  version: number;
}
export interface PVExtendedMetadata {
  json: string;
}
export interface ArtistForEventContract {
  artist: ArtistContract;
  effectiveRoles: VDBArtistForEventRoleType;
  id: number;
  name: string;
  roles: VDBArtistForEventRoleType;
}
export interface ReleaseEventSeriesContract {
  additionalNames: string;
  category: VDBReleaseEventSeriesCategoryType;
  deleted: boolean;
  description: string;
  id: number;
  name: string;
  pictureMime: string;
  status: VDBStatusType;
  urlSlug: string;
  version: number;
  webLinks: WebLinkContract[];
}
export interface SongListBaseContract {
  featuredCategory: VDBSongListFeaturedCategoryType;
  id: number;
  name: string;
}
export interface TagBaseContract {
  additionalNames: string;
  categoryName: string;
  id: number;
  name: string;
  urlSlug: string;
}
export interface WebLinkContract {
  category: VDBWebLinkCategoryType;
  description: string;
  descriptionOrUrl?: string;
  id: number;
  url: string;
}
export interface ArtistForApiContract {
  additionalNames?: string;
  artistLinks?: ArtistForArtistForApiContract[];
  artistLinksReverse?: ArtistForArtistForApiContract[];
  artistType: VDBArtistCategoryType;
  baseVoicebank?: ArtistContract;
  createDate: string;
  defaultName: string;
  defaultNameLanguage: VDBLanguageType;
  deleted?: boolean;
  description?: string;
  id: number;
  mainPicture?: EntryThumbForApiContract;
  mergedTo?: number;
  name: string;
  names?: LocalizedStringContract[];
  pictureMime?: string;
  relations?: ArtistRelationsForApi;
  releaseDate: string;
  status?: VDBStatusType;
  tags?: TagUsageForApiContract[];
  version: number;
  webLinks?: WebLinkForApiContract[];
}
export interface ArtistForArtistForApiContract {
  artist: ArtistContract;
  linkType: VDBArtistForArtistLinkType;
}
export interface ArtistRelationsForApi {
  latestAlbums: AlbumForApiContract[];
  latestEvents: ReleaseEventForApiContract[];
  latestSongs: SongForApiContract[];
  popularAlbums: AlbumForApiContract[];
  popularSongs: SongForApiContract[];
}
export interface AlbumForApiContract {
  additionalNames?: string;
  artists?: ArtistForAlbumForApiContract[];
  artistString: string;
  barcode?: string;
  catalogNumber?: string;
  createDate: string;
  defaultName: string;
  defaultNameLanguage: VDBLanguageType;
  deleted?: boolean;
  description?: string;
  discs?: AlbumDiscPropertiesContract[];
  discType: VDBAlbumDiscType;
  id: number;
  identifiers?: AlbumIdentifierContract[];
  mainPicture?: EntryThumbForApiContract;
  mergedTo?: number;
  name: string;
  names?: LocalizedStringContract[];
  pvs?: PVContract[];
  ratingAverage?: number;
  ratingCount?: number;
  releaseDate?: OptionalDateTimeContract;
  releaseEvent?: ReleaseEventForApiContract;
  status: VDBStatusType;
  tags?: TagUsageForApiContract[];
  tracks?: SongInAlbumForApiContract[];
  version: number;
  webLinks?: WebLinkForApiContract[];
}
export interface ArtistForAlbumForApiContract {
  artist: ArtistContract;
  categories: VDBArtistCategoryType;
  effectiveRoles: VDBArtistRoleType;
  isSupport: boolean;
  name: string;
  roles: VDBArtistRoleType;
}
export interface AlbumDiscPropertiesContract {
  discNumber: number;
  id: number;
  mediaType: "Audio" | "Video";
  name: string;
}
export interface AlbumIdentifierContract {
  value: string;
}
export interface SongInAlbumForApiContract {
  discNumber: number;
  id: number;
  name: string;
  song: SongForApiContract;
  trackNumber: number;
}
