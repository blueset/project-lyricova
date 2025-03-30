import { GraphQLResolveInfo, FieldNode } from "graphql";

export function getFields(info: GraphQLResolveInfo): string[] {
  const fields: string[] = [];
  const fieldNodes = info.fieldNodes[0].selectionSet?.selections;
  if (fieldNodes) {
    for (const fieldNode of fieldNodes) {
      if (fieldNode.kind === "Field") {
        fields.push(fieldNode.name.value);
      } else if (fieldNode.kind === "FragmentSpread") {
        const fragment = info.fragments[fieldNode.name.value];
        if (fragment) {
          fields.push(
            ...getFields({
              ...info,
              fieldNodes: [(fragment as unknown) as FieldNode],
            })
          );
        }
      }
    }
  }
  return fields;
}
