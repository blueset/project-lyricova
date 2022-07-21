import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  logger.debug("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
} else {
  logger.debug(
    "Using .env.example file to supply config environment variables"
  );
  dotenv.config({ path: ".env.example" }); // you can delete this after you create your own .env file!
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'

export const SESSION_SECRET = process.env["SESSION_SECRET"];

if (!SESSION_SECRET) {
  logger.error("No client secret. Set SESSION_SECRET environment variable.");
  process.exit(1);
}

export const PICKLE_SECRET = process.env["PICKLE_SECRET"];

if (!PICKLE_SECRET) {
  logger.error("No pickle secret. Set PICKLE_SECRET environment variable.");
  process.exit(1);
}

export const JWT_SECRET = process.env["JWT_SECRET"];

if (!JWT_SECRET) {
  logger.error("No JWT secret. Set JWT_SECRET environment variable.");
  process.exit(1);
}

export const YTDLP_PATH = process.env["YTDLP_PATH"];

if (!YTDLP_PATH) {
  logger.error("Path to yt-dlp is not set. Set YTDLP_PATH environment variable.");
  process.exit(1);
}

export const MUSIC_FILES_PATH = process.env["MUSIC_FILES_PATH"].endsWith("/")
  ? process.env["MUSIC_FILES_PATH"]
  : process.env["MUSIC_FILES_PATH"] + "/";

export const VIDEO_FILES_PATH = process.env["VIDEO_FILES_PATH"].endsWith("/")
  ? process.env["VIDEO_FILES_PATH"]
  : process.env["VIDEO_FILES_PATH"] + "/";

export const DB_URI = process.env["DB_URI"];

export const MXGET_API_PATH = process.env["MXGET_API_PATH"].endsWith("/")
  ? process.env["MXGET_API_PATH"]
  : process.env["MXGET_API_PATH"] + "/";

export const MXGET_BINARY = process.env["MXGET_BINARY"];

export const QQ_API_PATH = process.env["QQ_API_PATH"].endsWith("/")
  ? process.env["QQ_API_PATH"]
  : process.env["QQ_API_PATH"] + "/";

