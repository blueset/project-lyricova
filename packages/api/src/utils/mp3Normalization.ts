import { spawn } from "child_process";

interface FfprobePacket {
  duration_time?: string;
  size?: string;
}

const MAX_PROCESS_STDOUT_BYTES = 16 * 1024 * 1024;
const MAX_PROCESS_STDERR_BYTES = 1024 * 1024;

function runProcess(
  command: string,
  args: string[],
  signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputError: Error | undefined;
    const collect = (
      chunks: Buffer[],
      chunk: Buffer,
      currentBytes: number,
      maximumBytes: number,
      streamName: string,
    ) => {
      if (outputError) return currentBytes;
      const nextBytes = currentBytes + chunk.length;
      if (nextBytes > maximumBytes) {
        outputError = new Error(`${command} ${streamName} exceeded its limit.`);
        process.kill();
        return nextBytes;
      }
      chunks.push(chunk);
      return nextBytes;
    };
    process.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes = collect(
        stdout,
        chunk,
        stdoutBytes,
        MAX_PROCESS_STDOUT_BYTES,
        "output",
      );
    });
    process.stderr.on("data", (chunk: Buffer) => {
      stderrBytes = collect(
        stderr,
        chunk,
        stderrBytes,
        MAX_PROCESS_STDERR_BYTES,
        "diagnostics",
      );
    });
    process.on("error", reject);
    process.on("close", (code) => {
      if (outputError) {
        reject(outputError);
        return;
      }
      const result = {
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
      };
      if (code === 0) {
        resolve(result);
      } else {
        reject(
          new Error(
            result.stderr.trim() ||
              `${command} exited with status ${code ?? "unknown"}.`,
          ),
        );
      }
    });
  });
}

export function packetsMatchTargetBitrate(
  packets: ReadonlyArray<FfprobePacket>,
  targetKbps: number,
): boolean {
  const bitrates = packets.flatMap((packet) => {
    const duration = Number(packet.duration_time);
    const size = Number(packet.size);
    if (!(duration > 0) || !(size > 0)) return [];
    return [Math.round((size * 8) / duration / 1000)];
  });
  return (
    bitrates.length > 0 &&
    bitrates.every((bitrate) => bitrate === targetKbps)
  );
}

export async function isMp3ConstantBitrate(
  filePath: string,
  targetKbps: number,
  signal?: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const probe = spawn(
      process.env.FFPROBE_PATH || "ffprobe",
      [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "packet=duration_time,size",
      "-of",
        "compact=p=0:nk=0",
      filePath,
      ],
      { stdio: ["ignore", "pipe", "pipe"], signal },
    );
    let pending = "";
    let hasPacket = false;
    let matches = true;
    const stderr: Buffer[] = [];
    let stderrBytes = 0;
    let outputError: Error | undefined;
    const inspectLine = (line: string) => {
      const packet = Object.fromEntries(
        line.split("|").flatMap((part) => {
          const separator = part.indexOf("=");
          return separator < 0
            ? []
            : [[part.slice(0, separator), part.slice(separator + 1)]];
        }),
      );
      if (packet.duration_time && packet.size) {
        hasPacket = true;
        matches =
          matches && packetsMatchTargetBitrate([packet], targetKbps);
      }
    };
    probe.stdout.setEncoding("utf8");
    probe.stdout.on("data", (chunk: string) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) inspectLine(line);
    });
    probe.stderr.on("data", (chunk: Buffer) => {
      if (outputError) return;
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_PROCESS_STDERR_BYTES) {
        outputError = new Error("ffprobe diagnostics exceeded its limit.");
        probe.kill();
        return;
      }
      stderr.push(chunk);
    });
    probe.on("error", reject);
    probe.on("close", (code) => {
      if (outputError) {
        reject(outputError);
        return;
      }
      if (pending) inspectLine(pending);
      if (code === 0) {
        resolve(hasPacket && matches);
      } else {
        reject(
          new Error(
            Buffer.concat(stderr).toString().trim() ||
              `ffprobe exited with status ${code ?? "unknown"}.`,
          ),
        );
      }
    });
  });
}

export function buildMp3NormalizationArgs(
  sourcePath: string,
  destinationPath: string,
  targetKbps: number,
): string[] {
  return [
    "-y",
    "-v",
    "error",
    "-nostdin",
    "-i",
    sourcePath,
    "-map",
    "0:a:0",
    "-map",
    "0:v?",
    "-map_metadata",
    "0",
    "-c:a",
    "libmp3lame",
    "-b:a",
    `${targetKbps}k`,
    "-c:v",
    "copy",
    "-id3v2_version",
    "3",
    destinationPath,
  ];
}

export async function normalizeMp3ConstantBitrate(
  sourcePath: string,
  destinationPath: string,
  targetKbps: number,
  signal?: AbortSignal,
): Promise<void> {
  await runProcess(
    process.env.FFMPEG_PATH || "ffmpeg",
    buildMp3NormalizationArgs(sourcePath, destinationPath, targetKbps),
    signal,
  );
}

export interface MediaProbe {
  streams: Array<{
    codec_type?: string;
    [key: string]: unknown;
  }>;
  format?: {
    tags?: Record<string, string>;
    duration?: string;
    size?: string;
    format_name?: string;
    [key: string]: unknown;
  };
}

export async function probeMediaFile(
  filePath: string,
  signal?: AbortSignal,
): Promise<MediaProbe> {
  const { stdout } = await runProcess(
    process.env.FFPROBE_PATH || "ffprobe",
    [
      "-show_streams",
      "-show_format",
      "-print_format",
      "json",
      filePath,
    ],
    signal,
  );
  return JSON.parse(stdout) as MediaProbe;
}
