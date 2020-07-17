import { spawn } from "child_process";
import fs from "fs";
import through from "through";
import concat from "concat-stream";
import path from "path";
import combine from "stream-combiner";
import filter from "stream-filter";
import split from "split";
import { Writable } from "stream";

const ffmpeg = spawn.bind(null, process.env.FFMPEG_PATH || "ffmpeg");

export interface ReadOptions {
  dryRun?: boolean;
  coverPath?: string;
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
  [key: string]: string;
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
  if (typeof options.coverPath !== "undefined") {
    return [
      "-i",
      src,
      options.coverPath
    ];
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
  return ffmpeg(args, { detached: true, encoding: "binary" });
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

function getWriteArgs(src: string, dst: string, data: Metadata, options: WriteOptions) {
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
    args.push("-metadata");
    args.push(escapeini(name) + "=" + escapeini(data[name]));
  });

  args.push(dst); // output to src path

  return args;
}

// -- Parse ini

function parseini(callback?: (data: object) => void) {
  // eslint-disable-next-line prefer-const
  let parseLine: (data: string) => void;
  const stream = combine(
    split(),
    filter(Boolean),
    filter(isNotComment),
    through(parseLine)
  );

  // Object to store INI data in
  stream.data = {};

  if (callback) {
    stream.on("end", callback.bind(null, stream.data));
  }

  let key: string;

  parseLine = function (data: string) {
    data = unescapeini(data);
    const index = data.indexOf("=");

    if (index === -1) {
      stream.data[key] += data.slice(index + 1);
      stream.data[key] = stream.data[key].replace("\\", "\n");
    } else {
      key = data.slice(0, index);
      stream.data[key] = data.slice(index + 1);
    }
  };

  return stream;

}


export function read(
  src: string,
  callback: ReadCallback
): void;
export function read(
  src: string,
  options: ReadOptions & { dryRun: true },
  callback: ReadCallback
): string[];
export function read(
  src: string,
  options: ReadOptions,
  callback: ReadCallback
): void;
export function read(src: string, options: ReadOptions | ReadCallback, callback?: ReadCallback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  const args = getReadArgs(src, options);

  if (options.dryRun) {
    return args;
  }

  const proc = spawnRead(args),
    stream = through(),
    output = parseini(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    error = concat(() => { }) as Writable & {
      getBody: () => {
        toString: () => string;
      };
    };

  // Proxy any child process error events along
  proc.on("error", stream.emit.bind(stream, "error"));

  // Parse ffmetadata "ini" output
  proc.stdout.pipe(output);

  // Capture stderr
  proc.stderr.pipe(error);

  proc.on("close", function (code: number) {
    if (code === 0) {
      stream.emit("metadata", output.data);
    }
    else {
      stream.emit("error", new Error(error.getBody().toString()));
    }
  });

  if (callback) {
    stream.on("metadata", callback.bind(null, null));
    stream.on("error", callback);
  }

  return stream;
};

export function readAsync(
  src: string,
): Promise<Metadata>;
export function readAsync(
  src: string,
  options: ReadOptions
): Promise<Metadata>;
export function readAsync(src: string, options?: ReadOptions): Promise<Metadata> {
  return new Promise((resolve, reject) => {
    const callback = (err?: Error, data?: Metadata) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    };
    if (!options) {
      read(src, callback);
    } else {
      read(src, options, callback);
    }
  });
}

type WriteCallback = (err?: Error) => void;

export function write(
  src: string,
  data: Metadata,
  callback: WriteCallback
): void;
export function write(
  src: string,
  data: Metadata,
  options: WriteOptions & { dryRun: true },
  callback: WriteCallback
): string[];
export function write(
  src: string,
  data: Metadata,
  options: WriteOptions,
  callback: WriteCallback
): void;
export function write(src: string, data: Metadata, options: WriteOptions | WriteCallback, callback?: WriteCallback): string[] | void {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  const dst = getTempPath(src),
    args = getWriteArgs(src, dst, data, options);

  if (options.dryRun) {
    return args;
  }

  const proc = ffmpeg(args),
    stream = through(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    error = concat(() => { }) as Writable & {
      getBody: () => {
        toString: () => string;
      };
    };


  function handleError(err: unknown) {
    fs.unlink(dst, function () {
      stream.emit("error", err);
    });
  }

  function finish() {
    fs.rename(dst, src, function (err) {
      if (err) {
        handleError(err);
      }
      else {
        stream.emit("end");
      }
    });
  }

  // Proxy any child process error events
  proc.on("error", stream.emit.bind(stream, "error"));

  // Proxy child process stdout but don't end the stream until we know
  // the process exits with a zero exit code
  proc.stdout.on("data", stream.emit.bind(stream, "data"));

  // Capture stderr (to use in case of non-zero exit code)
  proc.stderr.pipe(error);

  proc.on("close", function (code: number) {
    if (code === 0) {
      finish();
    }
    else {
      handleError(new Error(error.getBody().toString()));
    }
  });

  if (callback) {
    stream.on("end", callback);
    stream.on("error", callback);
  }

  // return stream;
};

export function writeAsync(
  src: string,
  data: Metadata
): Promise<void>;
export function writeAsync(
  src: string,
  data: Metadata,
  options: WriteOptions
): Promise<void>;
export function writeAsync(src: string, data: Metadata, options?: WriteOptions): Promise<void> {
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
  read, readAsync, write, writeAsync
};