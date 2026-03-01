import { LyricsProvider } from "./provider";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LyricsProviderSource<T extends LyricsProvider<any>> {
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

  static allCases: LyricsProviderSource<any>[] = [];

  static {
    try {
      LyricsProviderSource.netease = new LyricsProviderSource(NetEaseProvider);
      LyricsProviderSource.neteaseVercel = new LyricsProviderSource(NetEaseVercelProvider);
      LyricsProviderSource.qq = new LyricsProviderSource(QQMusicProvider);
      LyricsProviderSource.kugou = new LyricsProviderSource(KugouProvider);
      LyricsProviderSource.xiami = new LyricsProviderSource(XiamiProvider);
      LyricsProviderSource.gecimi = new LyricsProviderSource(GecimiProvider);
      LyricsProviderSource.viewLyrics = new LyricsProviderSource(ViewLyricsProvider);
      LyricsProviderSource.syair = new LyricsProviderSource(SyairProvider);
      LyricsProviderSource.musixmatch = new LyricsProviderSource(MusixMatchProvider);
      LyricsProviderSource.youtube = new LyricsProviderSource(YouTubeProvider);
      LyricsProviderSource.spotify = new LyricsProviderSource(SpotifyProvider);
      LyricsProviderSource.songle = new LyricsProviderSource(SongleProvider);
      LyricsProviderSource.LrcLib = new LyricsProviderSource(LrcLibProvider);

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
    } catch (e) {
      console.error("Error initializing LyricsProviderSource:", e);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cls: new (...args: any[]) => T;
  name: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(cls: new (...args: any[]) => T) {
    this.cls = cls;
    this.name = cls && cls.constructor && cls.constructor.name;
  }

  public build(): T {
    return new this.cls();
  }

  public toJSON(): string {
    return this.name;
  }
}
