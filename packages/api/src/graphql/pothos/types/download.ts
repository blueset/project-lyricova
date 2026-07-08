import { builder } from "../builder.js";

interface YouTubeDlProgressValueShape {
  type: "progress";
  current: number;
  total: number;
  speed?: string;
  eta?: string;
  __typename?: "YouTubeDlProgressValue";
}

interface YouTubeDlProgressDoneShape {
  type: "done";
  __typename?: "YouTubeDlProgressDone";
}

interface YouTubeDlProgressErrorShape {
  type: "error";
  message: string;
  __typename?: "YouTubeDlProgressError";
}

interface YouTubeDlProgressMessageShape {
  type: "message";
  message: string;
  __typename?: "YouTubeDlProgressMessage";
}

export type YouTubeDlProgressShape =
  | YouTubeDlProgressValueShape
  | YouTubeDlProgressDoneShape
  | YouTubeDlProgressErrorShape
  | YouTubeDlProgressMessageShape;

const YouTubeDlProgressValueRef =
  builder.objectRef<YouTubeDlProgressValueShape>("YouTubeDlProgressValue");

YouTubeDlProgressValueRef.implement({
  description: "youtube-dl download progress object.",
  fields: (t) => ({
    type: t.exposeString("type", {
      description: 'Type of update, "progress".',
    }),
    current: t.exposeFloat("current"),
    total: t.exposeFloat("total"),
    speed: t.exposeString("speed", { nullable: true }),
    eta: t.exposeString("eta", { nullable: true }),
  }),
});

const YouTubeDlProgressDoneRef =
  builder.objectRef<YouTubeDlProgressDoneShape>("YouTubeDlProgressDone");

YouTubeDlProgressDoneRef.implement({
  description: "youtube-dl download progress when download is finished.",
  fields: (t) => ({
    type: t.exposeString("type", { description: 'Type of update, "done".' }),
  }),
});

const YouTubeDlProgressErrorRef =
  builder.objectRef<YouTubeDlProgressErrorShape>("YouTubeDlProgressError");

YouTubeDlProgressErrorRef.implement({
  description: "youtube-dl download progress when download failed.",
  fields: (t) => ({
    type: t.exposeString("type", { description: 'Type of update, "error".' }),
    message: t.exposeString("message"),
  }),
});

const YouTubeDlProgressMessageRef =
  builder.objectRef<YouTubeDlProgressMessageShape>("YouTubeDlProgressMessage");

YouTubeDlProgressMessageRef.implement({
  fields: (t) => ({
    type: t.exposeString("type", { description: 'Type of update, "message".' }),
    message: t.exposeString("message"),
  }),
});

export const YouTubeDlProgressRef = builder.unionType("YouTubeDlProgress", {
  types: [
    YouTubeDlProgressDoneRef,
    YouTubeDlProgressErrorRef,
    YouTubeDlProgressMessageRef,
    YouTubeDlProgressValueRef,
  ],
  resolveType: (value: YouTubeDlProgressShape) => {
    if (value?.type === "progress") {
      return YouTubeDlProgressValueRef;
    } else if (value?.type === "message") {
      return YouTubeDlProgressMessageRef;
    } else if (value?.type === "done") {
      return YouTubeDlProgressDoneRef;
    } else {
      return YouTubeDlProgressErrorRef;
    }
  },
});
