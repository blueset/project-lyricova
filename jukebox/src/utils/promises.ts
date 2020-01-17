import { promisify } from "util";
import ffmetadata from "ffmetadata";

export const readMetadata = promisify(ffmetadata.read);
