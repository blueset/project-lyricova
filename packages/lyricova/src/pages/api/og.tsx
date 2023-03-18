import { ImageResponse, unstable_createNodejsStream } from "@vercel/og";
import { resolve } from "path";
import { readFile } from "node:fs/promises";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const tsimExtraLight = readFile(
    resolve(__dirname, "../../../../src/fonts/TsimSans-J-ExtraLight.otf")
  );
  const tsimRegular = readFile(
    resolve(__dirname, "../../../../src/fonts/TsimSans-J-Regular.otf")
  );
  const tsimMedium = readFile(
    resolve(__dirname, "../../../../src/fonts/TsimSans-J-Medium.otf")
  );
  const monaUltraLight = readFile(
    resolve(__dirname, "../../../../src/fonts/Mona-Sans-UltraLight.otf")
  );
  const monaRegular = readFile(
    resolve(__dirname, "../../../../src/fonts/Mona-Sans-Regular.otf")
  );
  const monaMedium = readFile(
    resolve(__dirname, "../../../../src/fonts/Mona-Sans-Medium.otf")
  );
  const [
    tsimExtraLightData,
    tsimRegularData,
    tsimMediumData,
    monaUltraLightData,
    monaRegularData,
    monaMediumData,
  ] = await Promise.all([
    tsimExtraLight,
    tsimRegular,
    tsimMedium,
    monaUltraLight,
    monaRegular,
    monaMedium,
  ]);

  const stream = await unstable_createNodejsStream(
    <div
      style={{
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        fontSize: 64,
        lineHeight: "64px",
        fontFamily: "Mona Sans, Tsim Sans",
        fontWeight: 100,
        paddingTop: "100px",
        paddingLeft: "50px",
      }}
    >
      信じたabcdefものは、
      <br />
      都合のいい妄想を abcdef
      <br />
      abcdef 繰り返し abcdef 映し出す鏡。
      <br />
      Test abcdefg
      <br />
      Test abcdefg
    </div>,
    {
      width: 1200,
      height: 675,
      fonts: [
        {
          name: "Tsim Sans",
          data: tsimExtraLightData,
          weight: 100,
        },
        {
          name: "Tsim Sans",
          data: tsimRegularData,
          weight: 400,
        },
        {
          name: "Tsim Sans",
          data: tsimMediumData,
          weight: 500,
        },
        {
          name: "Mona Sans",
          data: monaUltraLightData,
          weight: 100,
        },
        {
          name: "Mona Sans",
          data: monaRegularData,
          weight: 400,
        },
        {
          name: "Mona Sans",
          data: monaMediumData,
          weight: 500,
        },
      ],
    }
  );

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.statusCode = 200;
  res.statusMessage = "OK";
  stream.pipe(res);
}
