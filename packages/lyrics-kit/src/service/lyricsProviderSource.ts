import { LyricsProvider } from "./provider";
import { NetEaseProvider } from "./provider/netease";
import { QQMusicProvider } from "./provider/qqMusic";
import { KugouProvider } from "./provider/kugou";
import { XiamiProvider } from "./provider/xiami";
import { GecimiProvider } from "./provider/gecimi";
import { ViewLyricsProvider } from "./provider/viewLyrics";
import { SyairProvider } from "./provider/syair";
import { MarumaruProvider } from "./provider/marumaru";

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

    static allCases = [
        LyricsProviderSource.netease,
        LyricsProviderSource.qq,
        LyricsProviderSource.kugou,
        LyricsProviderSource.xiami,
        LyricsProviderSource.gecimi,
        LyricsProviderSource.viewLyrics,
        LyricsProviderSource.syair,
        LyricsProviderSource.marumaru,
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

    public toJSON() {
        return this.name;
    }
}