import { createHash } from "crypto";

export default function stringMD5(data: string): Buffer {
    return createHash("md5").update(data).digest();
}