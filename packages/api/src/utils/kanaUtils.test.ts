import { romaToHira } from "./kanaUtils";

describe("romaToHira", () => {
  it("processes prolonged vowels", () => {
    expect(romaToHira("o-")).toBe("おー");
    expect(romaToHira("ō")).toBe("おー");
  });
  it("processes sokuon", () => {
    expect(romaToHira("asshi")).toBe("あっし");
    expect(romaToHira("sukiyaki")).toBe("すきやき");
    expect(romaToHira("sukiyakki")).toBe("すきやっき");
    expect(romaToHira("iti")).toBe("いち");
    expect(romaToHira("ichi")).toBe("いち");
    expect(romaToHira("itti")).toBe("いっち");
    expect(romaToHira("icchi")).toBe("いっち");
    expect(romaToHira("itchi")).toBe("いっち");
  });
});