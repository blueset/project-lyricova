export const entryListingCondition = {
  attributes: {
    exclude: ["updatedAt"],
  },
  include: [
    {
      association: "verses",
      attributes: ["text", "isMain", "language"],
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
