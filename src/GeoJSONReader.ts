import { createReadStream } from "fs";
import * as JSONStream from "jsonstream";

export function readGeoJSONFeatures(path: string): NodeJS.ReadableStream {
  return createReadStream(path, { encoding: "utf8" }).pipe(
    JSONStream.parse("features.*")
  );
}
