import { DataTypes } from "sequelize";

class SimpleEnumArray extends DataTypes.STRING {

  private _enum: string[];
  private _length: number;
  public key = "SIMPLE_ENUM_ARRAY";
  public static key = "SIMPLE_ENUM_ARRAY";

  constructor(enumValues: string[]) {
    super();
    this._enum = enumValues;
    this._length = enumValues.join(",");
    if (this._length <= enumValues.length) {
      throw `No enum value can be empty. ${enumValues} found.`;
    }
    for (const member of enumValues) {
      if (member.indexOf(",") >= 0) {
        throw `${member} contains comma (,).`;
      }
    }
  }

  // Mandatory, complete definition of the new type in the database
  toSql() {
    return `VARCHAR(${this._length})`;
  }

  // Optional, validator function
  validate(value): boolean {
    if (!Array.isArray(value)) {
      throw `${value} is not a valid array.`;
    }
    for (const member of value) {
      if (!this._enum.includes(member)) {
        throw `${member} is not in ${this._enum}.`;
      }
    }
    return true;
  }

  // Optional, value stringifier before sending to database
  _stringify(value: string[]) {
    return value.join(",");
  }

  // Optional, parser for values received from the database
  static parse(value: string) {
    return value.split(",");
  }
}

export const SIMPLE_ENUM_ARRAY = SimpleEnumArray;

export function sequelizeAdditions(Sequelize: any) {

  const DataTypes = Sequelize.DataTypes;

  DataTypes.SIMPLE_ENUM_ARRAY = SimpleEnumArray;
}
