import { Readable } from "node:stream";
import {
  PasswordInputError,
  promptNewPassword,
  readHiddenLine,
  readPasswordFromStdin,
  type TtyLike,
} from "./passwordInput.js";

/**
 * Fakes just enough of a TTY `ReadStream` (isTTY + raw-mode data events) to
 * drive `readHiddenLine`/`promptNewPassword` without a real terminal. Built
 * on a real `Readable` (rather than a bare `EventEmitter`) so it structurally
 * satisfies `TtyLike`; `type()` emits "data" directly, bypassing the usual
 * push/read buffering, which is fine since production code only ever
 * attaches a raw `"data"` listener.
 */
class FakeTty extends Readable implements TtyLike {
  isTTY = true;

  override _read(): void {
    // No-op: data is injected directly via `type()`.
  }

  setRawMode(_mode: boolean): void {
    // No real raw-mode terminal to toggle in tests.
  }

  type(input: string): void {
    this.emit("data", Buffer.from(input, "utf8"));
  }
}

function collectingOutput(): { output: NodeJS.WritableStream; text: string[] } {
  const text: string[] = [];
  const output = {
    write: (chunk: string) => {
      text.push(chunk);
      return true;
    },
  } as unknown as NodeJS.WritableStream;
  return { output, text };
}

describe("readPasswordFromStdin", () => {
  it("reads a single line, trimming the trailing newline", async () => {
    const input = Readable.from([Buffer.from("hunter2-but-longer\n")]);
    await expect(readPasswordFromStdin(input)).resolves.toBe(
      "hunter2-but-longer",
    );
  });

  it("reads a single line without a trailing newline", async () => {
    const input = Readable.from([Buffer.from("no-newline-password")]);
    await expect(readPasswordFromStdin(input)).resolves.toBe(
      "no-newline-password",
    );
  });
});

describe("readHiddenLine", () => {
  it("rejects when the input is not a TTY", async () => {
    const nonTty: TtyLike = Object.assign(Readable.from([]), {
      isTTY: false,
    });
    const { output } = collectingOutput();
    await expect(
      readHiddenLine("Password: ", nonTty, output),
    ).rejects.toBeInstanceOf(PasswordInputError);
  });

  it("resolves with the typed line on Enter, without echoing characters", async () => {
    const tty = new FakeTty();
    const { output, text } = collectingOutput();
    const promise = readHiddenLine("Password: ", tty, output);
    tty.type("secret-value\n");
    await expect(promise).resolves.toBe("secret-value");
    // Only the prompt and the trailing newline should have been written —
    // never the typed characters.
    expect(text.join("")).toBe("Password: \n");
  });

  it("supports backspace edits", async () => {
    const tty = new FakeTty();
    const { output } = collectingOutput();
    const promise = readHiddenLine("Password: ", tty, output);
    tty.type("wrong\u007f\u007f\u007f\u007fright\n");
    await expect(promise).resolves.toBe("wright");
  });

  it("rejects on Ctrl+C", async () => {
    const tty = new FakeTty();
    const { output } = collectingOutput();
    const promise = readHiddenLine("Password: ", tty, output);
    tty.type("\u0003");
    await expect(promise).rejects.toBeInstanceOf(PasswordInputError);
  });
});

describe("promptNewPassword", () => {
  it("returns the password when both entries match and are valid", async () => {
    const tty = new FakeTty();
    const { output } = collectingOutput();
    const promise = promptNewPassword(tty, output);
    tty.type("a-valid-password\n");
    await new Promise((resolve) => setImmediate(resolve));
    tty.type("a-valid-password\n");
    await expect(promise).resolves.toBe("a-valid-password");
  });

  it("rejects when confirmation does not match", async () => {
    const tty = new FakeTty();
    const { output } = collectingOutput();
    const promise = promptNewPassword(tty, output);
    tty.type("a-valid-password\n");
    await new Promise((resolve) => setImmediate(resolve));
    tty.type("a-different-password\n");
    await expect(promise).rejects.toThrow(/do not match/);
  });

  it("rejects when the first entry is too short", async () => {
    const tty = new FakeTty();
    const { output } = collectingOutput();
    const promise = promptNewPassword(tty, output);
    tty.type("short\n");
    await expect(promise).rejects.toThrow(/between 12 and 128/);
  });
});
