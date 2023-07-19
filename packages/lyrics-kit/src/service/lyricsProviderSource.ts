import { LyricsProvider } from "./provider";
import { NetEaseProvider } from "./provider/netease";
import { QQMusicProvider } from "./provider/qqMusic";
import { KugouProvider } from "./provider/kugou";
import { XiamiProvider } from "./provider/xiami";
import { GecimiProvider } from "./provider/gecimi";
import { ViewLyricsProvider } from "./provider/viewLyrics";
import { SyairProvider } from "./provider/syair";
import { MarumaruProvider } from "./provider/marumaru";
import { MusixMatchProvider } from "./provider/musixmatch";
import { YouTubeProvider } from "./provider/youtube";
import { SpotifyProvider } from "./provider/spotify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LyricsProviderSource<T extends LyricsProvider<any>> {
  static netease = new LyricsProviderSource(NetEaseProvider);
  static qq = new LyricsProviderSource(QQMusicProvider);
  static kugou = new LyricsProviderSource(KugouProvider);
  static xiami = new LyricsProviderSource(XiamiProvider);
  static gecimi = new LyricsProviderSource(GecimiProvider);
  static viewLyrics = new LyricsProviderSource(ViewLyricsProvider);
  static syair = new LyricsProviderSource(SyairProvider);
  static marumaru = new LyricsProviderSource(MarumaruProvider);
  static musixmatch = new LyricsProviderSource(MusixMatchProvider);
  static youtube = new LyricsProviderSource(YouTubeProvider);
  static spotify = new LyricsProviderSource(SpotifyProvider);

  static allCases = [
    LyricsProviderSource.netease,
    LyricsProviderSource.qq,
    LyricsProviderSource.kugou,
    // LyricsProviderSource.xiami,
    // LyricsProviderSource.gecimi,
    LyricsProviderSource.viewLyrics,
    LyricsProviderSource.syair,
    LyricsProviderSource.marumaru,
    LyricsProviderSource.musixmatch,
    LyricsProviderSource.youtube,
    LyricsProviderSource.spotify,
  ];

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
