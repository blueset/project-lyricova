export const entryListingCondition = {
  attributes: {
    exclude: ["updatedOn"],
  },
  include: [
    {
      association: "verses",
      attributes: ["text", "isMain", "isOriginal", "language"],
      where: {
        isMain: true,
      },
    },
    {
      association: "tags",
      attributes: ["name", "slug", "color"],
      through: {
        attributes: [] as string[],
      },
    },
    {
      association: "pulses",
      attributes: ["creationDate"],
    },
  ],
};
