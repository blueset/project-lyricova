import fs from "fs";
import type Stream from "stream";

export function downloadFromStream(stream: Stream, destination: string): Promise<void> {
  return new Promise<void>(((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    if (!file.writable) return reject(`File ${destination} is not writable.`);
    const pipe = stream.pipe(file);
    pipe.on("finish", () => {
      file.close();
      resolve();
    });
    pipe.on("error", (err) => {
      fs.unlinkSync(destination);
      reject(err.message);
    });
  }));
}