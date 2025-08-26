import { gunzipSync, gzipSync } from "zlib";

const COMPRESSION_THRESHOLD = 1024;

export const compressMessage = (data: any): string | Buffer => {
  const str = JSON.stringify(data);
  if (str.length < COMPRESSION_THRESHOLD) {
    return str;
  }
  return gzipSync(str);
};

export const decompressMessage = (data: any): any => {
  if (typeof data === "string") {
    return JSON.parse(data);
  }

  if (Buffer.isBuffer(data)) {
    try {
      const decompressed = gunzipSync(data);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      console.error("Decompression failed:", error);
      return null;
    }
  }

  return data;
};

export const isCompressed = (data: any): boolean => {
  return Buffer.isBuffer(data);
};
