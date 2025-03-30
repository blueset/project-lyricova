import dotenv from "dotenv";
import logger from "../utils/logger";
import fs from "fs";

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
  if (!prod) {
    logger.debug("Using .env file to supply config environment variables");
  }
} else {
  dotenv.config({ path: ".env.example" }); // you can delete this after you create your own .env file!
  if (!prod) {
    logger.warn(
      "No .env file found. Using .env.example file to supply config environment variables"
    );
  };
}

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

export const YTDLP_PATH = process.env["YTDLP_PATH"];

if (!YTDLP_PATH) {
  logger.error(
    "Path to yt-dlp is not set. Set YTDLP_PATH environment variable."
  );
  process.exit(1);
}

export const MUSIC_FILES_PATH = process.env["MUSIC_FILES_PATH"].endsWith("/")
  ? process.env["MUSIC_FILES_PATH"]
  : process.env["MUSIC_FILES_PATH"] + "/";

export const OPENAI_BASE_URL = process.env["OPENAI_BASE_URL"] ?? "";
export const OPENAI_API_KEY = process.env["OPENAI_API_KEY"] ?? "";
export const OPENAI_MODEL = process.env["OPENAI_MODEL"] ?? "";
// export const AZURE_OPENAI_ENDPOINT = process.env["AZURE_OPENAI_ENDPOINT"]!;
// export const AZURE_OPENAI_API_KEY = process.env["AZURE_OPENAI_API_KEY"]!;
// export const AZURE_OPENAI_DEPLOYMENT_ID = process.env["AZURE_OPENAI_DEPLOYMENT_ID"]!;
