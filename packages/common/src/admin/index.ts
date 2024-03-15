#! /usr/bin/env node 
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
yargs(hideBin(process.argv))
.usage("Usage: $0 command [options]")
.commandDir("commands")
.alias("h", "help")
.alias("v", "version")
.demandCommand()
.parse();