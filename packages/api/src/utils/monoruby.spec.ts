import { describe, expect, it } from "@jest/globals";
import { convertMonoruby } from "./monoruby";

describe("convertMonoruby", () => {
    it("should convert monoruby properly", () => {
        expect(convertMonoruby("漢字", "かんじ")).toEqual([["漢", "字"], ["かん", "じ"]]);
        expect(convertMonoruby("他人事", "たにんごと")).toEqual([["他", "人", "事"], ["た", "にん", "ごと"]]);
        expect(convertMonoruby("他力本願", "たりきほんがん")).toEqual([["他", "力", "本", "願"], ["た", "りき", "ほん", "がん"]]);
        expect(convertMonoruby("同人音楽", "どうじんおんがく")).toEqual([["同", "人", "音", "楽"], ["どう", "じん", "おん", "がく"]]);
        expect(convertMonoruby("大義名分", "たいぎめいぶん")).toEqual([["大", "義", "名", "分"], ["たい", "ぎ", "めい", "ぶん"]]);
        expect(convertMonoruby("宇田川町", "うだがわちょう")).toEqual([["宇", "田", "川", "町"], ["う", "だ", "がわ", "ちょう"]]);
        expect(convertMonoruby("抱きしめて!", "だきしめて")).toEqual([["抱", "き", "し", "め", "て", "!"], ["だ", "き", "し", "め", "て", ""]]);
        expect(convertMonoruby("日向電工", "ひなたでんこう")).toEqual([["日向電工"], ["ひなたでんこう"]]);
        expect(convertMonoruby("日進月歩", "にっしんげっぽ")).toEqual([["日", "進", "月", "歩"], ["にっ", "しん", "げっ", "ぽ"]]);
        expect(convertMonoruby("値踏", "ねぶ")).toEqual([["値", "踏"], ["ね", "ぶ"]]);
    });
});
