declare module "mime" {
  export interface TypeMap {
    [key: string]: string[];
  }

  export function getType(path: string): string | null;
  export function getExtension(mime: string): string | null;
  export function define(mimes: TypeMap, force?: boolean): void;
}
