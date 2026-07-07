/**
 * Helpers for the `SIMPLE_ENUM_ARRAY` columns
 * (`ArtistOfSongs.artistRoles`/`categories`, `ArtistOfAlbums.roles`/`effectiveRoles`),
 * which are stored as comma-joined VARCHAR. Mirrors the legacy Sequelize
 * `SimpleEnumArray` (de)serialization (`utils/sequelizeAdditions.ts`):
 * stringify = `value.join(",")`, parse = `value.split(",")`.
 */

export function serializeEnumArray(
  value: string[] | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return value.join(",");
}

export function parseEnumArray(value: string | null | undefined): string[] {
  if (value === null || value === undefined) return [];
  return value.split(",");
}
