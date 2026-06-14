import fs from "fs";

export async function readFileHeader(filepath: string, length = 4100) {
  const fileHandle = await fs.promises.open(filepath, "r");

  try {
    const buffer = Buffer.alloc(length);
    const result = await fileHandle.read(buffer, 0, length, 0);

    return buffer.subarray(0, result.bytesRead);
  } finally {
    await fileHandle.close();
  }
}

function hasAsciiAt(buffer: Buffer, offset: number, value: string) {
  return (
    buffer.length >= offset + value.length &&
    buffer.subarray(offset, offset + value.length).toString("ascii") === value
  );
}

function hasOneOfAsciiAt(buffer: Buffer, offset: number, values: string[]) {
  return values.some((value) => hasAsciiAt(buffer, offset, value));
}

function hasMp3FrameSync(buffer: Buffer) {
  return buffer.length > 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

function hasMp4FamilyBrand(buffer: Buffer) {
  if (!hasAsciiAt(buffer, 4, "ftyp")) {
    return false;
  }

  const brandWindow = buffer
    .subarray(8, Math.min(buffer.length, 64))
    .toString("ascii");

  return [
    "avif",
    "isom",
    "iso2",
    "mp41",
    "mp42",
    "m4v",
    "M4V",
    "M4A",
    "qt  ",
    "3gp",
  ].some((brand) => brandWindow.includes(brand));
}

function hasHeifFamilyBrand(buffer: Buffer) {
  if (!hasAsciiAt(buffer, 4, "ftyp")) {
    return false;
  }

  const brandWindow = buffer
    .subarray(8, Math.min(buffer.length, 64))
    .toString("ascii");

  return ["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"].some(
    (brand) => brandWindow.includes(brand),
  );
}

export function isFileSignatureAllowed(mimeType: string, header: Buffer) {
  switch (mimeType.toLowerCase()) {
    case "image/avif":
      return (
        hasAsciiAt(header, 4, "ftyp") &&
        header
          .subarray(8, Math.min(header.length, 32))
          .toString("ascii")
          .includes("avif")
      );
    case "image/heic":
    case "image/heif":
      return hasHeifFamilyBrand(header);
    case "image/gif":
      return hasAsciiAt(header, 0, "GIF87a") || hasAsciiAt(header, 0, "GIF89a");
    case "image/jpeg":
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    case "image/png":
      return (
        header.length >= 8 &&
        header[0] === 0x89 &&
        hasAsciiAt(header, 1, "PNG\r\n\u001a\n")
      );
    case "image/webp":
      return hasAsciiAt(header, 0, "RIFF") && hasAsciiAt(header, 8, "WEBP");
    case "video/mp4":
    case "video/x-m4v":
    case "video/quicktime":
    case "video/3gpp":
    case "video/3gpp2":
      return hasMp4FamilyBrand(header);
    case "video/webm":
    case "audio/webm":
      return (
        header[0] === 0x1a &&
        header[1] === 0x45 &&
        header[2] === 0xdf &&
        header[3] === 0xa3
      );
    case "audio/mpeg":
      return hasAsciiAt(header, 0, "ID3") || hasMp3FrameSync(header);
    case "audio/mp4":
      return hasMp4FamilyBrand(header);
    case "audio/ogg":
      return hasAsciiAt(header, 0, "OggS");
    case "audio/wav":
      return (
        hasAsciiAt(header, 0, "RIFF") &&
        hasOneOfAsciiAt(header, 8, ["WAVE", "WAVEfmt"])
      );
    case "application/pdf":
      return hasAsciiAt(header, 0, "%PDF-");
    default:
      return false;
  }
}
