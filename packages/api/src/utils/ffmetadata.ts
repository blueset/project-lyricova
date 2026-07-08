import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const ffmpeg = spawn.bind(null, process.env.FFMPEG_PATH || "ffmpeg");

interface ReadOptions {
  dryRun?: boolean;
  coverUrl?: string;
}
export interface WriteOptions {
  dryRun?: boolean;
  attachments?: string[];
  id3v1?: boolean;
  "id3v2.3"?: boolean;
  forceId3v2?: boolean;
  preserveStreams?: boolean;
}
export interface Metadata {
  title?: string;
  artist?: string;
  album?: string;
  "title-sort"?: string;
  "artist-sort"?: string;
  "album-sort"?: string;
  ALBUMSORT?: string; // FLAC
  ARTISTSORT?: string; // FLAC
  TITLESORT?: string; // FLAC
  LYRICS?: string; // FLAC
  "lyrics-eng"?: string;
  [key: string]: string | undefined;
}

type ReadCallback = (err?: Error, data?: Metadata) => void;

function getTempPath(src: string): string {
  const ext = path.extname(src),
    basename = path.basename(src).slice(0, -ext.length),
    newName = basename + ".ffmetadata" + ext,
    dirname = path.dirname(src),
    newPath = path.join(dirname, newName);
  return newPath;
}

// -- Child process helpers

function getReadArgs(src: string, options: ReadOptions) {
  if (typeof options.coverUrl !== "undefined") {
    return ["-i", src, options.coverUrl];
  }

  return [
    "-i",
    src,
    "-f",
    "ffmetadata",
    "pipe:1", // output to stdout
  ];
}

function spawnRead(args: string[]) {
  return ffmpeg(args, { detached: true /*, encoding: "binary" */ });
}

function getAttachments(options: WriteOptions) {
  if (Array.isArray(options)) {
    return options;
  }
  return options.attachments || [];
}

function isNotComment(data: string): boolean {
  return data.slice(0, 1) !== ";";
}

function escapeini(data: string): string {
  // @TODO
  return data;
}

function unescapeini(data: string): string {
  // @TODO
  return data;
}

function getWriteArgs(
  src: string,
  dst: string,
  data: Metadata,
  options: WriteOptions,
) {
  // ffmpeg options
  const inputs = ["-i", src], // src input
    maps = ["-map", options.preserveStreams ? "0" : "0:0"]; // set as the first
  let args = ["-y"]; // overwrite file

  // Attach additional input files if included
  getAttachments(options).forEach(function (el) {
    const inputIndex = inputs.length / 2;
    inputs.push("-i", el);
    maps.push("-map", inputIndex + ":0");
  });

  // Copy flag in order to not transcode
  args = args.concat(inputs, maps, ["-codec", "copy"]);

  if (options["id3v1"]) {
    args.push("-write_id3v1", "1");
  }

  if (options["id3v2.3"]) {
    args.push("-id3v2_version", "3");
  }

  if (options["forceId3v2"]) {
    args.push("-write_id3v2", "1");
  }

  // append metadata
  Object.keys(data).forEach(function (name) {
    const value = data[name];
    if (value) {
      args.push("-metadata");
      args.push(escapeini(name) + "=" + escapeini(value));
    }
  });

  args.push(dst); // output to src path

  return args;
}

// -- Parse ini

/**
 * Parse ffmpeg's `ffmetadata` (INI-like) output into a {@link Metadata} object.
 * Blank lines and `;` comments are skipped; a line without `=` continues the
 * previous value (ffmetadata escapes a hard line break as a trailing `\`).
 */
function parseIni(content: string): Metadata {
  const data: Metadata = {};
  let key: string | undefined;

  for (let line of content.split(/\r?\n/)) {
    if (!line || !isNotComment(line)) continue;
    line = unescapeini(line);
    const index = line.indexOf("=");

    if (index === -1) {
      if (key !== undefined) {
        data[key] = ((data[key] ?? "") + line).replace("\\", "\n");
      }
    } else {
      key = line.slice(0, index);
      data[key] = line.slice(index + 1);
    }
  }

  return data;
}

function read(src: string, callback: ReadCallback): void;
function read(
  src: string,
  options: ReadOptions & { dryRun: true },
  callback: ReadCallback,
): string[];
function read(src: string, options: ReadOptions, callback: ReadCallback): void;
function read(
  src: string,
  options: ReadOptions | ReadCallback,
  callback?: ReadCallback,
) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  const args = getReadArgs(src, options);

  if (options.dryRun) {
    return args;
  }

  const proc = spawnRead(args);
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];

  proc.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
  proc.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

  // Proxy any child process error events along
  proc.on("error", (err) => callback?.(err));

  proc.on("close", function (code: number) {
    if (code === 0) {
      callback?.(undefined, parseIni(Buffer.concat(stdout).toString()));
    } else {
      callback?.(new Error(Buffer.concat(stderr).toString()));
    }
  });
}

function readAsync(src: string, options?: ReadOptions): Promise<Metadata> {
  return new Promise((resolve, reject) => {
    const callback = (err?: Error, data?: Metadata) => {
      if (err) return reject(err);
      if (data) return resolve(data);
    };
    if (!options) {
      read(src, callback);
    } else {
      read(src, options, callback);
    }
  });
}

type WriteCallback = (err?: Error) => void;

function write(src: string, data: Metadata, callback: WriteCallback): void;
function write(
  src: string,
  data: Metadata,
  options: WriteOptions & { dryRun: true },
  callback: WriteCallback,
): string[];
function write(
  src: string,
  data: Metadata,
  options: WriteOptions,
  callback: WriteCallback,
): void;
function write(
  src: string,
  data: Metadata,
  options: WriteOptions | WriteCallback,
  callback?: WriteCallback,
): string[] | void {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  const dst = getTempPath(src),
    args = getWriteArgs(src, dst, data, options);

  if (options.dryRun) {
    return args;
  }

  const proc = ffmpeg(args, {});
  const stderr: Buffer[] = [];

  proc.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));

  function handleError(err: unknown) {
    fs.unlink(dst, function () {
      callback?.(err as Error);
    });
  }

  function finish() {
    fs.rename(dst, src, function (err) {
      if (err) {
        handleError(err);
      } else {
        callback?.();
      }
    });
  }

  // Proxy any child process error events
  proc.on("error", (err) => callback?.(err));

  proc.on("close", function (code: number) {
    if (code === 0) {
      finish();
    } else {
      handleError(new Error(Buffer.concat(stderr).toString()));
    }
  });
}

export function writeAsync(src: string, data: Metadata): Promise<void>;
export function writeAsync(
  src: string,
  data: Metadata,
  options: WriteOptions,
): Promise<void>;
export function writeAsync(
  src: string,
  data: Metadata,
  options?: WriteOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const callback = (err?: Error) => {
      if (err) {
        reject(err);
      }
      resolve();
    };
    if (!options) {
      return write(src, data, callback);
    } else {
      write(src, data, options, callback);
    }
  });
}

export default {
  read,
  readAsync,
  write,
  writeAsync,
};
