import type yargs from "yargs";

export const command = "user";
export const desc = "Manage users";
export const builder = (yargs: yargs.Argv) => {
  return yargs.commandDir("user").demandCommand();
};
export const handler = (argv: yargs.Argv) => {
};