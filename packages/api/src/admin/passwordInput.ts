import { assertValidPassword } from "../auth/accountService.js";

/**
 * Secure password acquisition for the CLI. Passwords must never be accepted
 * as an ordinary `--password <value>` argument (they'd leak into shell
 * history / `ps`); callers instead use `--password-stdin` or an interactive,
 * non-echoing TTY prompt.
 *
 * Note: JS strings are immutable, so we can't guarantee a password string is
 * zeroed in memory. Where the raw bytes *are* under our control (the stdin
 * buffer, the char buffer built during interactive entry) we fill them with
 * zeros as soon as they've been consumed, which is the practical best effort
 * available in a garbage-collected runtime.
 */

export interface TtyLike extends NodeJS.ReadableStream {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => void;
}

export class PasswordInputError extends Error {}

/** Reads a single line of password material from a piped stdin stream. */
export async function readPasswordFromStdin(
  input: NodeJS.ReadableStream,
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const password = buffer.toString("utf8").replace(/\r?\n$/, "");
  buffer.fill(0);
  for (const chunk of chunks) chunk.fill(0);
  return password;
}

/**
 * Reads one line from a TTY with echo disabled (raw mode), returning it
 * without the trailing newline. Rejects if `input` is not a TTY.
 */
export function readHiddenLine(
  promptText: string,
  input: TtyLike,
  output: NodeJS.WritableStream,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(
        new PasswordInputError(
          "Password prompt requires an interactive TTY. Use --password-stdin instead.",
        ),
      );
      return;
    }

    output.write(promptText);
    const chars: string[] = [];

    const cleanup = () => {
      input.setRawMode?.(false);
      input.removeListener("data", onData);
      input.pause();
    };

    const onData = (buf: Buffer) => {
      const str = buf.toString("utf8");
      for (const ch of str) {
        if (ch === "\n" || ch === "\r") {
          cleanup();
          output.write("\n");
          resolve(chars.join(""));
          chars.fill("\0");
          chars.length = 0;
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          cleanup();
          output.write("\n");
          chars.fill("\0");
          chars.length = 0;
          reject(new PasswordInputError("Aborted."));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          chars.pop();
          continue;
        }
        chars.push(ch);
      }
    };

    input.resume();
    input.setRawMode(true);
    input.setEncoding("utf8");
    input.on("data", onData);
  });
}

/**
 * Prompts twice for a new password, validating length and confirming the
 * two entries match before returning.
 */
export async function promptNewPassword(
  input: TtyLike,
  output: NodeJS.WritableStream,
): Promise<string> {
  const first = await readHiddenLine("New password: ", input, output);
  assertValidPassword(first);
  const second = await readHiddenLine("Confirm password: ", input, output);
  if (first !== second) {
    throw new PasswordInputError("Passwords do not match.");
  }
  return second;
}
