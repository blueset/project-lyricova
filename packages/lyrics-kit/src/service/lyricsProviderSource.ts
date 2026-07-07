import type { LyricsProvider } from "./provider";
import { NetEaseProvider } from "./provider/netease";
import { QQMusicProvider } from "./provider/qqMusic";
import { KugouProvider } from "./provider/kugou";
import { XiamiProvider } from "./provider/xiami";
import { GecimiProvider } from "./provider/gecimi";
import { ViewLyricsProvider } from "./provider/viewLyrics";
import { SyairProvider } from "./provider/syair";
import { MusixMatchProvider } from "./provider/musixmatch";
import { YouTubeProvider } from "./provider/youtube";
import { SpotifyProvider } from "./provider/spotify";
import { SongleProvider } from "./provider/songle";
import { LrcLibLyricsProvider as LrcLibProvider } from "./provider/lrclib";
import { NetEaseVercelProvider } from "./provider/neteaseVercel";
import {
  LyricsProviderSourceId,
  type LyricsProviderSourceId as LyricsProviderSourceIdValue,
} from "./lyricsProviderSourceId";

export class LyricsProviderSource<T extends LyricsProvider<unknown>> {
  static netease: LyricsProviderSource<NetEaseProvider>;
  static neteaseVercel: LyricsProviderSource<NetEaseVercelProvider>;
  static qq: LyricsProviderSource<QQMusicProvider>;
  static kugou: LyricsProviderSource<KugouProvider>;
  static xiami: LyricsProviderSource<XiamiProvider>;
  static gecimi: LyricsProviderSource<GecimiProvider>;
  static viewLyrics: LyricsProviderSource<ViewLyricsProvider>;
  static syair: LyricsProviderSource<SyairProvider>;
  static musixmatch: LyricsProviderSource<MusixMatchProvider>;
  static youtube: LyricsProviderSource<YouTubeProvider>;
  static spotify: LyricsProviderSource<SpotifyProvider>;
  static songle: LyricsProviderSource<SongleProvider>;
  static LrcLib: LyricsProviderSource<LrcLibProvider>;

  static allCases: LyricsProviderSource<LyricsProvider<unknown>>[] = [];
  static byId: Partial<
    Record<
      LyricsProviderSourceIdValue,
      LyricsProviderSource<LyricsProvider<unknown>>
    >
  > = {};

  static {
    try {
      LyricsProviderSource.netease = new LyricsProviderSource(
        LyricsProviderSourceId.netease,
        NetEaseProvider,
      );
      LyricsProviderSource.neteaseVercel = new LyricsProviderSource(
        LyricsProviderSourceId.neteaseVercel,
        NetEaseVercelProvider,
      );
      LyricsProviderSource.qq = new LyricsProviderSource(
        LyricsProviderSourceId.qq,
        QQMusicProvider,
      );
      LyricsProviderSource.kugou = new LyricsProviderSource(
        LyricsProviderSourceId.kugou,
        KugouProvider,
      );
      LyricsProviderSource.xiami = new LyricsProviderSource(
        LyricsProviderSourceId.xiami,
        XiamiProvider,
      );
      LyricsProviderSource.gecimi = new LyricsProviderSource(
        LyricsProviderSourceId.gecimi,
        GecimiProvider,
      );
      LyricsProviderSource.viewLyrics = new LyricsProviderSource(
        LyricsProviderSourceId.viewLyrics,
        ViewLyricsProvider,
      );
      LyricsProviderSource.syair = new LyricsProviderSource(
        LyricsProviderSourceId.syair,
        SyairProvider,
      );
      LyricsProviderSource.musixmatch = new LyricsProviderSource(
        LyricsProviderSourceId.musixmatch,
        MusixMatchProvider,
      );
      LyricsProviderSource.youtube = new LyricsProviderSource(
        LyricsProviderSourceId.youtube,
        YouTubeProvider,
      );
      LyricsProviderSource.spotify = new LyricsProviderSource(
        LyricsProviderSourceId.spotify,
        SpotifyProvider,
      );
      LyricsProviderSource.songle = new LyricsProviderSource(
        LyricsProviderSourceId.songle,
        SongleProvider,
      );
      LyricsProviderSource.LrcLib = new LyricsProviderSource(
        LyricsProviderSourceId.LrcLib,
        LrcLibProvider,
      );

      LyricsProviderSource.allCases = [
        LyricsProviderSource.netease,
        // LyricsProviderSource.neteaseVercel,
        LyricsProviderSource.qq,
        LyricsProviderSource.kugou,
        // LyricsProviderSource.xiami,
        // LyricsProviderSource.gecimi,
        LyricsProviderSource.viewLyrics,
        LyricsProviderSource.syair,
        LyricsProviderSource.musixmatch,
        LyricsProviderSource.youtube,
        // LyricsProviderSource.spotify,
        LyricsProviderSource.songle,
        LyricsProviderSource.LrcLib,
      ];
      LyricsProviderSource.byId = Object.fromEntries(
        LyricsProviderSource.allCases.map((source) => [source.id, source]),
      );
    } catch (e) {
      console.error("Error initializing LyricsProviderSource:", e);
    }
  }

  id: LyricsProviderSourceIdValue;
  cls: new () => T;
  name: string;

  constructor(id: LyricsProviderSourceIdValue, cls: new () => T) {
    this.id = id;
    this.cls = cls;
    this.name = cls.name;
  }

  public build(): T {
    return new this.cls();
  }

  public toJSON(): string {
    return this.id;
  }
}
