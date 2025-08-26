import pako from "pako";

const COMPRESSION_THRESHOLD = 1024;

export const compressMessage = (data: any): string | Uint8Array => {
  const str = JSON.stringify(data);
  if (str.length < COMPRESSION_THRESHOLD) {
    return str;
  }
  return pako.gzip(str);
};

export const decompressMessage = async (data: any): Promise<any> => {
  if (typeof data === "string") {
    return JSON.parse(data);
  }

  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    const uint8Array =
      data instanceof ArrayBuffer ? new Uint8Array(data) : data;

    if (typeof window !== "undefined" && window.DecompressionStream) {
      try {
        const stream = new DecompressionStream("gzip");
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(uint8Array);
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }

        const decompressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;

        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return JSON.parse(new TextDecoder().decode(decompressed));
      } catch (error) {
        console.error("Native decompression failed:", error);
      }
    }

    try {
      const decompressed = pako.ungzip(uint8Array, { to: "string" });
      return JSON.parse(decompressed);
    } catch (error) {
      console.error("Pako decompression failed:", error);
      return null;
    }
  }

  return data;
};

export const isCompressed = (data: any): boolean => {
  return data instanceof ArrayBuffer || data instanceof Uint8Array;
};
