declare module "connect-session-sequelize" {
  import { Store } from "express-session";
  import { Sequelize } from "sequelize";

  interface SequelizeStoreOptions {
    db: Sequelize;
    table?: string;
    extendDefaultFields?: (defaults: object, session: object) => object;
    disableTouch?: boolean;
  }
  interface SequelizeStoreConstructor {
    new(options: SequelizeStoreOptions): SequelizeStore;
  }

  interface SequelizeStore extends Store { }
  export default function constructor(store: typeof Store): SequelizeStoreConstructor;
}

// /types/lib/data-types

// declare module "sequelize" {
//   // import { AbstractDataType, AbstractDataTypeConstructor } from "sequelize";
//   // export const ABSTRACT: AbstractDataTypeConstructor & { new(): AbstractDataType; }
//   export class DataTypes {
//     static ABSTRACT: {
//       new(): any;
//       key: string;
//       warn(link: string, text: string): void;
//     };
//   }
// }