import type yargs from "yargs";
import sequelize from "../../../db";
import { User } from "../../../models/User";
import bcrypt from "bcryptjs";

export const command = "add [options]";
export const desc = "Add a user.";
export const builder = (yargs: yargs.Argv) => {
  return yargs.demandCommand(0, 0, "demand command")
  .check((argv, aliases) => (console.log("check", argv, aliases), true))
  .options({
    username: {
      alias: "u",
      describe: "Username",
      type: "string",
      demandOption: true,
    },
    password: {
      alias: "p",
      describe: "Password",
      type: "string",
      demandOption: true,
    },
    email: {
      alias: "e",
      describe: "Email",
      type: "string",
      demandOption: true,
    },
    role: {
      alias: "r",
      describe: "Role",
      type: "string",
      choices: ["admin", "guest"],
      demandOption: true,
    },
    "display-name": {
      alias: "d",
      describe: "Display name",
      type: "string",
      demandOption: true,
    },
  });
};

export const handler = async (argv: yargs.Arguments<{
  username: string;
  password: string;
  email: string;
  role: "admin" | "guest";
  displayName: string;
}>) => {
  const t = await sequelize.transaction();
  const hashedPassword = bcrypt.hashSync(argv.password, 10);
  try {
    const user = await User.create(
      {
        username: argv.username,
        password: hashedPassword,
        email: argv.email,
        role: argv.role,
        displayName: argv.displayName,
      } as User,
      { transaction: t }
    );
    await t.commit();
    console.log("User created with ID:", user.id);
  } catch (e) {
    await t.rollback();
    throw e;
  }
};
