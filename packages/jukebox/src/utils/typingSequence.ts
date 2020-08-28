import { kanaToHira } from "./transliterate";
import { ObjectType, Field } from "type-graphql";
import { GraphQLString } from "graphql";

const JA_MAP = {
  romanMapSingle: {
    'あ': '', 'い': '', 'う': '', 'え': '', 'お': '',
    'か': 'ｋ', 'き': 'ｋ', 'く': 'ｋ', 'け': 'ｋ', 'こ': 'ｋ',
    'さ': 'ｓ', 'し': 'ｓ', 'す': 'ｓ', 'せ': 'ｓ', 'そ': 'ｓ',
    'た': 'ｔ', 'ち': 'ｔ', 'つ': 'ｔ', 'て': 'ｔ', 'と': 'ｔ',
    'な': 'ｎ', 'に': 'ｎ', 'ぬ': 'ｎ', 'ね': 'ｎ', 'の': 'ｎ',
    'は': 'ｈ', 'ひ': 'ｈ', 'ふ': 'ｆ', 'へ': 'ｈ', 'ほ': 'ｈ',
    'ま': 'ｍ', 'み': 'ｍ', 'む': 'ｍ', 'め': 'ｍ', 'も': 'ｍ',
    'や': 'ｙ', 'ゆ': 'ｙ', 'よ': 'ｙ',
    'ら': 'ｒ', 'り': 'ｒ', 'る': 'ｒ', 'れ': 'ｒ', 'ろ': 'ｒ',
    'わ': 'ｗ', 'を': 'ｗ', 'ん': 'ｎ',
    'が': 'ｇ', 'ぎ': 'ｇ', 'ぐ': 'ｇ', 'げ': 'ｇ', 'ご': 'ｇ',
    'ざ': 'ｚ', 'じ': 'ｊ', 'ず': 'ｚ', 'ぜ': 'ｚ', 'ぞ': 'ｚ',
    'だ': 'ｄ', 'ぢ': 'ｄ', 'づ': 'ｄ', 'で': 'ｄ', 'ど': 'ｄ',
    'ば': 'ｂ', 'び': 'ｂ', 'ぶ': 'ｂ', 'べ': 'ｂ', 'ぼ': 'ｂ',
    'ぱ': 'ｐ', 'ぴ': 'ｐ', 'ぷ': 'ｐ', 'ぺ': 'ｐ', 'ぽ': 'ｐ',
    'ぁ': 'ｘ', 'ぃ': 'ｘ', 'ぅ': 'ｘ', 'ぇ': 'ｘ', 'ぉ': 'ｘ',
    'っ': 'ｘｔ',
    'ゃ': 'ｘｙ', 'ゅ': 'ｘｙ', 'ょ': 'ｘｙ',
    'ゎ': 'ｘｗ',
    'ゔ': 'ｖ',
  },
  romanMapDouble: {
    'きゃ': 'ｋｙ', 'きゅ': 'ｋｙ', 'きぇ': 'ｋｙ', 'きょ': 'ｋｙ',
    'くぁ': 'ｋｗ',
    'しゃ': 'ｓｙ', 'しゅ': 'ｓｙ', 'しぇ': 'ｓｙ', 'しょ': 'ｓｙ',
    'ちゃ': 'ｔｙ', 'ちゅ': 'ｔｙ', 'ちぇ': 'ｔｙ', 'ちょ': 'ｔｙ',
    'てゃ': 'ｔｈ', 'てぃ': 'ｔｈ', 'てゅ': 'ｔｈ', 'てぇ': 'ｔｈ', 'てょ': 'ｔｈ',
    'にゃ': 'ｎｙ', 'にゅ': 'ｎｙ', 'にぇ': 'ｎｙ', 'にょ': 'ｎｙ',
    'ひゃ': 'ｈｙ', 'ひゅ': 'ｈｙ', 'ひぇ': 'ｈｙ', 'ひょ': 'ｈｙ',
    'みゃ': 'ｍｙ', 'みゅ': 'ｍｙ', 'みぇ': 'ｍｙ', 'みょ': 'ｍｙ',
    'りゃ': 'ｒｙ', 'りゅ': 'ｒｙ', 'りぇ': 'ｒｙ', 'りょ': 'ｒｙ',
    'うぃ': 'ｗ', 'うぇ': 'ｗ',
    'ゔぁ': 'ｖ', 'ゔぃ': 'ｖ', 'ゔぇ': 'ｖ', 'ゔぉ': 'ｖ',
    'ぎゃ': 'ｇｙ', 'ぎゅ': 'ｇｙ', 'ぎぇ': 'ｇｙ', 'ぎょ': 'ｇｙ',
    'じゃ': 'ｊ', 'じゅ': 'ｊ', 'じぇ': 'ｊ', 'じょ': 'ｊ',
    'ぢゃ': 'ｄｙ', 'ぢゅ': 'ｄｙ', 'ぢぇ': 'ｄｙ', 'ぢょ': 'ｄｙ',
    'びゃ': 'ｂｙ', 'びゅ': 'ｂｙ', 'びぇ': 'ｂｙ', 'びょ': 'ｂｙ',
    'ぴゃ': 'ｐｙ', 'ぴゅ': 'ｐｙ', 'ぴぇ': 'ｐｙ', 'ぴょ': 'ｐｙ'
  }
};

@ObjectType({ description: "Describes the animation sequence for a word." })
export class AnimatedWord {
  @Field({ description: "True if the word shows a conversion-type of animation. False if it is just typing." })
  convert: boolean;

  @Field(type => [GraphQLString], { description: "Actual sequence to show, one frame at a time." })
  sequence: string[];
}

function animateJa(words: [string, string][]): AnimatedWord[] {
  return words.map((word) => {
    const sequence = [];
    var remainingHira = kanaToHira(word[1]);

    var done = "";
    while (remainingHira.length > 0) {
      // Matching double kana set.
      const twoKanas = remainingHira.substr(0, 2);
      const oneKana = remainingHira[0];
      const secondKana = remainingHira[1];
      if (remainingHira.length >= 2 && (twoKanas in JA_MAP.romanMapDouble)) {
        const key = twoKanas as keyof (typeof JA_MAP)["romanMapDouble"];
        const romajiSeq = JA_MAP.romanMapDouble[key];
        for (var i = 1; i <= romajiSeq.length; i++) {
          sequence.push(done + romajiSeq.substr(0, i));
        }
        sequence.push(done + key);
        done += key;
        remainingHira = remainingHira.substring(2, remainingHira.length);
      } else if (remainingHira.length >= 2 && remainingHira[0] == "っ" && secondKana in JA_MAP.romanMapSingle) {
        const key = secondKana as keyof (typeof JA_MAP)["romanMapSingle"];
        sequence.push(done + JA_MAP.romanMapSingle[key][0]);
        done += "っ";
        remainingHira = remainingHira.substring(1, remainingHira.length);
        // matching single char
      } else if (oneKana in JA_MAP.romanMapSingle) {
        const key = oneKana as keyof (typeof JA_MAP)["romanMapSingle"];
        for (var i = 1; i <= JA_MAP.romanMapSingle[key].length; i++) {
          sequence.push(done + JA_MAP.romanMapSingle[key].substr(0, i));
        }
        sequence.push(done + key);
        done += key;
        remainingHira = remainingHira.substring(1, remainingHira.length);
      } else {
        done += remainingHira[0];
        sequence.push(done);
        remainingHira = remainingHira.substring(1, remainingHira.length);
      }
    }
    if (sequence.length === 0 || sequence[sequence.length - 1] !== word[0]) sequence.push(word[0]);
    return { sequence, convert: true };
  });
};

function animateZh(words: [string, string][]): AnimatedWord[] {
  return words.map((word) => {
    const convert = word[0] !== word[1];
    const sequence = [];
    let curr = "";
    let py = word[1];
    while (py.length > 0) {
      const chr = py[0];
      py = py.substring(1, py.length);
      curr += chr;
      if (chr !== "'") {
        sequence.push(curr);
      }
    }
    if (sequence[sequence.length - 1] !== word[0]) {
      sequence.push(word[0]);
    }
    return { convert, sequence };
  });
};

function animateEn(words: [string, string][]): AnimatedWord[] {
  const line = words.reduce((prev, [word, _useless]) => prev + word, "");
  const sequence = [];
  for (var i = 1; i <= line.length; i++) {
    sequence.push(line.substring(0, i))
  }
  return [{
    convert: false,
    sequence
  }];
}

export function buildAnimationSequence(text: [string, string][], language: "en" | "ja" | "zh"): AnimatedWord[] {
  if (language === "ja") {
    return animateJa(text);
  } else if (language === "zh") {
    return animateZh(text);
  } else {  // language === "en"
    return animateEn(text);
  }
};
