import { LyricsProvider } from "./provider";

export class LyricsProviderSource<T extends LyricsProvider> {
    static netease = new LyricsProviderSource(
        NetEaseProvider
    );
    static qq = new LyricsProviderSource(
        QQMusicProvider
    );
    static kugou = new LyricsProviderSource(
        KugouProvider
    );
    static xiami = new LyricsProviderSource(
        XiamiProvider
    );
    static gecimi = new LyricsProviderSource(
        GecimiProvider
    );
    static viewLyrics = new LyricsProviderSource(
        ViewLyricsProvider
    );
    static syair = new LyricsProviderSource(
        SyairProvider
    );

    static allCases = [
        LyricsProviderSource.netease,
        LyricsProviderSource.qq,
        LyricsProviderSource.kugou,
        LyricsProviderSource.xiami,
        LyricsProviderSource.gecimi,
        LyricsProviderSource.viewLyrics,
        LyricsProviderSource.syair,
    ];

    
    cls: new (...args: any[]) => T;

    constructor(cls: new (...args: any[]) => T) {
        this.cls = cls;
    }

    public build(): T {
        return new this.cls();
    }
}