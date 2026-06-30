import { builder } from "../builder";
import { TagRef, EntryRef } from "./refs";

TagRef.implement({
  fields: (t) => ({
    color: t.exposeString("color"),
    entries: t.field({ type: [EntryRef], resolve: (tag) => tag.$get("entries") }),
    name: t.exposeString("name"),
    slug: t.exposeID("slug"),
  }),
});
