import {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_DEPLOYMENT_ID,
  AZURE_OPENAI_ENDPOINT,
} from "lyricova-common/utils/secret";
import { Arg, Authorized, Query, Resolver } from "type-graphql";
import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ChatCompletionMessageParam } from "openai/resources";

// const AlignmentSchema = z.array(
//   z.object({
//     original: z.string(),
//     translation: z.string(),
//   })
// );

@Resolver()
export class LLMResolver {
  @Authorized("ADMIN")
  @Query((returns) => String)
  async translationAlignment(
    @Arg("original") original: string,
    @Arg("translation") translation: string
  ): Promise<string> {
    if (
      !AZURE_OPENAI_ENDPOINT ||
      !AZURE_OPENAI_API_KEY ||
      !AZURE_OPENAI_DEPLOYMENT_ID
    ) {
      throw new Error("Azure OpenAI credentials are not set");
    }
    const client = new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      deployment: AZURE_OPENAI_DEPLOYMENT_ID,
      apiKey: AZURE_OPENAI_API_KEY,
      apiVersion: "2024-07-01-preview",
    });

    const messages = [
      {
        role: "system",
        content: `Your task is to match the translated text against the original, line by line, as close as possible. When the sentence cannot be closely matched due to sentence structure change in the translated language, match as closely as possible without changing the order.

# Content guidelines
* Neither the order of text in the original or translated text should be changed. 
* You can only remove white spaces, join or break lines in the translated text. 
* As a rule of thumb, the translated text should be placed as close as possible to the original text, and as close as how you would translate it in this context.
* When the original text is a blank line, the corresponding translated text should be a blank line. 
* When the original text is not blank, the translated text should also be filled with text, unless there is no corresponding content close by. 
* Do not repeat any translated line unless it is repeated in the input.

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
            original: `街灯沿い
ずっとじゃあねって
君は泣いた

ただ笑っていたいのに
そっとそっと
固まってしまったんだ`.split("\n"),
            translation: `沿着街燈而走　說道「永別了」
你哭了　明明只是想要歡笑而已
悄然地　悄然地　一切變得安定了呢`.split("\n"),
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
            original: original.split("\n"),
            translation: translation.split("\n"),
          },
          undefined,
          2
        ),
      },
    ] as ChatCompletionMessageParam[];
    // console.log("messages", JSON.stringify(messages));

    const response = await client.beta.chat.completions.parse({
      messages,
      model: "gpt-4o",
      max_tokens: 4096,
    });
    // console.log("response", JSON.stringify(response));
    const parsedResponse = JSON.parse(response.choices[0].message.content);
    if (!Array.isArray(parsedResponse)) {
      throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
    }
    return (
      parsedResponse as {
        original: string;
        aligned: string;
      }[]
    )
      .map((item) => item.aligned)
      .join("\n");
  }
}
