import { ChatCompletionMessageParam } from "openai/resources";

export function getTranslationAlignmentLLMPrompt(
  original: string,
  translation: string
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: `Your task is to match the translated text against the original, line by line, as close as possible. When the sentence cannot be closely matched due to sentence structure change in the translated language, match as closely as possible without changing the order.

# Content guidelines
* Neither the order of text in the original or translated text should be changed. 
* You can only perform the following operations to the translated text:
  * 1. remove white spaces (ASCII space U+0020 ' ', Ideographic space U+3000 '　', etc.) anywhere in the text,
  * 2. join two or more lines in the translated text into one line,
  * 3. break one line in the translated lines into two or more lines,
  * 4. insert one or more empty lines into the translated text.
* As a rule of thumb, the translated text should be placed as close as possible to the original text, and as close as how you would translate it in this context.
* You should exercise your decision to break or join lines in the translated text to make sure that (1) the translated text express the same meaning as the original text it is attached to, and (2) that no original line is left blank when feasable.
* When the original text is an empty string, the corresponding translated text MUST also be a blank line. 
* When the original text is not blank, the translated text should also be filled with text, unless there is strictly no any content close by that even remotely resembles the content.
* Do not repeat any translated line unless it is repeated in the input.
* When the original text cannot be closely matched to the translated text one-to-one, but a segment of n original text lines can be matched to a segment of m translated text lines (where n != m, and n, m are the least number of lines that can be matched), you should consider the m translated as one line and break it into n lines at a similar rhythm where the original lines are broken into.
  * For example, if the original text is ["君と　歌い", "歩いた　夢の坂道", "夜空の下で", "一人まだ探し続けて"], and the translation text is ["On my own, under the night sky, I’m still searching", "for that hilly path in my dream, where we used to sing and walk together."], the translation text should be reformatted to ["On my own, under the night sky", "I’m still searching", "for that hilly path in my dream,", "where we used to sing and walk together."].

# Input output format
* The user will provide you with the original text in JSON object as {"original": ["original line 1", "original line 2", "original line ..."], "translated": ["translated line 1", "translated line 2", "translated line ..."]}.
* Your output should be in JSON array like [{"original": "original line 1", "aligned": "aligned line 1"}, {"original": "original line 2", "aligned": "aligned line 2"}, ...], where each item is a line of the original and translated text.
* The root level JSON of your object must be an array. 
* Always begin your response with [ {"original": "`,
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          original: [
            "街灯沿い",
            "ずっとじゃあねって",
            "君は泣いた",
            "ただ笑っていたいのに",
            "そっとそっと",
            "固まってしまったんだ",
            "",
            "透明色あの青にだって",
            "触れたまんま",
            "僕は色を選んでく",
            "ずっとずっと",
            "なくなってなって",
            "そっと遠く消えた涙の中に",
          ],
          translation: [
            'Along the street lights, always with a "see you later,"',
            "You cried, though you merely wanted to be smiling",
            "Quietly, quietly, you stiffened",
            "",
            "If it were by that blue, the transparent color",
            "By which I was touched as is, I will choose the color",
            "Always, always, becoming nothingness, nothingness",
          ],
        },
        undefined,
        2
      ),
    },
    {
      role: "assistant",
      content: JSON.stringify(
        [
          {
            original: "街灯沿い",
            aligned: "Along the street lights,",
          },
          {
            original: "ずっとじゃあねって",
            aligned: "always with a “see you later,”",
          },
          {
            original: "君は泣いた",
            aligned: "You cried,",
          },
          {
            original: "ただ笑っていたいのに",
            aligned: "though you merely wanted to be smiling",
          },
          {
            original: "そっとそっと",
            aligned: "Quietly, quietly,",
          },
          {
            original: "固まってしまったんだ",
            aligned: "you stiffened",
          },
          {
            original: "",
            aligned: "",
          },
          {
            original: "透明色あの青にだって",
            aligned: "If it were by that blue, the transparent color",
          },
          {
            original: "触れたまんま",
            aligned: "By which I was touched as is,",
          },
          {
            original: "僕は色を選んでく",
            aligned: "I will choose the color",
          },
          {
            original: "ずっとずっと",
            aligned: "Always, always,",
          },
          {
            original: "なくなってなって",
            aligned: "becoming nothingness, nothingness",
          },
        ],
        undefined,
        2
      ),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          original: [
            "街灯沿い",
            "ずっとじゃあねって",
            "君は泣いた",
            "",
            "ただ笑っていたいのに",
            "そっとそっと",
            "固まってしまったんだ",
          ],
          translation: [
            "沿着街燈而走　說道「永別了」",
            "你哭了　明明只是想要歡笑而已",
            "悄然地　悄然地　一切變得安定了呢",
          ],
        },
        undefined,
        2
      ),
    },
    {
      role: "assistant",
      content: JSON.stringify(
        [
          { original: "街灯沿い", aligned: "沿着街燈而走" },
          { original: "ずっとじゃあねって", aligned: "說道「永別了」" },
          { original: "君は泣いた", aligned: "你哭了" },
          { original: "", aligned: "" },
          {
            original: "ただ笑っていたいのに",
            aligned: "明明只是想要歡笑而已",
          },
          { original: "そっとそっと", aligned: "悄然地　悄然地" },
          {
            original: "固まってしまったんだ",
            aligned: "一切變得安定了呢",
          },
        ],
        undefined,
        2
      ),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          original: [
            "君と　歌い",
            "歩いた　夢の坂道",
            "夜空の下で",
            "一人まだ探し続けて",
          ],
          translation: [
            "On my own, under the night sky, I’m still searching",
            "for that hilly path in my dream, where we used to sing and walk together.",
          ],
        },
        undefined,
        2
      ),
    },
    {
      role: "assistant",
      content: JSON.stringify(
        [
          {
            original: "君と　歌い",
            aligned: "On my own, under the night sky",
          },
          {
            original: "歩いた　夢の坂道",
            aligned: "I’m still searching",
          },
          {
            original: "夜空の下で",
            aligned: "for that hilly path in my dream,",
          },
          {
            original: "一人まだ探し続けて",
            aligned: "where we used to sing and walk together.",
          },
        ],
        undefined,
        2
      ),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          original: original.split("\n"),
          translation: translation.split("\n"),
        },
        undefined,
        2
      ),
    },
  ] as ChatCompletionMessageParam[];
}
