import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  console.debug("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
} else {
  console.debug(
    "Using .env.example file to supply config environment variables"
  );
  dotenv.config({ path: ".env.example" }); // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

export const SESSION_SECRET = process.env["SESSION_SECRET"]!;

if (!SESSION_SECRET) {
  console.error("No client secret. Set SESSION_SECRET environment variable.");
  process.exit(1);
}

export const JWT_SECRET = process.env["JWT_SECRET"]!;

if (!JWT_SECRET) {
  console.error("No JWT secret. Set JWT_SECRET environment variable.");
  process.exit(1);
}

export const DB_URI = process.env["DB_URI"] as string;

if (!DB_URI) {
  console.error(
    "Database connection string is not set. Set DB_URI environment variable."
  );
  process.exit(1);
}

export const MUSIC_FILES_PATH = process.env["MUSIC_FILES_PATH"]?.endsWith("/")
  ? process.env["MUSIC_FILES_PATH"]
  : process.env["MUSIC_FILES_PATH"] + "/";

export const OPENAI_BASE_URL = process.env["OPENAI_BASE_URL"] ?? "";
export const OPENAI_API_KEY = process.env["OPENAI_API_KEY"] ?? "";
export const OPENAI_MODEL = process.env["OPENAI_MODEL"] ?? "";
// export const AZURE_OPENAI_ENDPOINT = process.env["AZURE_OPENAI_ENDPOINT"]!;
// export const AZURE_OPENAI_API_KEY = process.env["AZURE_OPENAI_API_KEY"]!;
// export const AZURE_OPENAI_DEPLOYMENT_ID = process.env["AZURE_OPENAI_DEPLOYMENT_ID"]!;
