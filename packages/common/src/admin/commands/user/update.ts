import type yargs from "yargs";
import sequelize from "../../../db";
import { User } from "../../../models/User";
import bcrypt from "bcryptjs";

export const command = "update [options]";
export const desc = "Update an user.";
export const builder = (yargs: yargs.Argv) => {
  return yargs.demandCommand(0, 0, "demand command")
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
      demandOption: false,
    },
    email: {
      alias: "e",
      describe: "Email",
      type: "string",
      demandOption: false,
    },
    role: {
      alias: "r",
      describe: "Role",
      type: "string",
      choices: ["admin", "guest"],
      demandOption: false,
    },
    "display-name": {
      alias: "d",
      describe: "Display name",
      type: "string",
      demandOption: false,
    },
  });
};

export const handler = async (argv: yargs.Arguments<{
  username: string;
  password?: string;
  email?: string;
  role?: "admin" | "guest";
  displayName?: string;
}>) => {
  const t = await sequelize.transaction();
  try {
    const user = await User.findOne({ where: { username: argv.username } });
    if (!user) {
      throw new Error(`User ${argv.username} not found`);
    }
    const updates: Partial<User> = {};
    if (argv.password) {
      updates.password = bcrypt.hashSync(argv.password, 10);
    }
    if (argv.email) {
      updates.email = argv.email;
    }
    if (argv.role) {
      updates.role = argv.role;
    }
    if (argv.displayName) {
      updates.displayName = argv.displayName;
    }
    await user.update(updates, { transaction: t });
    await t.commit();
    console.log("User updated with ID:", user.id);
  } catch (e) {
    await t.rollback();
    console.error(e);
    throw e;
  }
};
