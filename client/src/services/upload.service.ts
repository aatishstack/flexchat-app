import { api } from "./api";

export const MEDIA_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
  document: 8 * 1024 * 1024,
} as const;

const allowedMediaTypes = new Map<
  string,
  {
    extensions: string[];
    maxBytes: number;
    kind:
      | "image"
      | "video"
      | "audio"
      | "document";
  }
>([
  [
    "image/avif",
    {
      extensions: ["avif"],
      maxBytes: MEDIA_LIMITS.image,
      kind: "image",
    },
  ],
  [
    "image/gif",
    {
      extensions: ["gif"],
      maxBytes: MEDIA_LIMITS.image,
      kind: "image",
    },
  ],
  [
    "image/jpeg",
    {
      extensions: ["jpg", "jpeg"],
      maxBytes: MEDIA_LIMITS.image,
      kind: "image",
    },
  ],
  [
    "image/png",
    {
      extensions: ["png"],
      maxBytes: MEDIA_LIMITS.image,
      kind: "image",
    },
  ],
  [
    "image/webp",
    {
      extensions: ["webp"],
      maxBytes: MEDIA_LIMITS.image,
      kind: "image",
    },
  ],
  [
    "video/mp4",
    {
      extensions: ["mp4", "m4v"],
      maxBytes: MEDIA_LIMITS.video,
      kind: "video",
    },
  ],
  [
    "video/quicktime",
    {
      extensions: ["mov"],
      maxBytes: MEDIA_LIMITS.video,
      kind: "video",
    },
  ],
  [
    "video/webm",
    {
      extensions: ["webm"],
      maxBytes: MEDIA_LIMITS.video,
      kind: "video",
    },
  ],
  [
    "audio/mpeg",
    {
      extensions: ["mp3"],
      maxBytes: MEDIA_LIMITS.audio,
      kind: "audio",
    },
  ],
  [
    "audio/mp4",
    {
      extensions: ["m4a"],
      maxBytes: MEDIA_LIMITS.audio,
      kind: "audio",
    },
  ],
  [
    "audio/ogg",
    {
      extensions: ["ogg"],
      maxBytes: MEDIA_LIMITS.audio,
      kind: "audio",
    },
  ],
  [
    "audio/wav",
    {
      extensions: ["wav"],
      maxBytes: MEDIA_LIMITS.audio,
      kind: "audio",
    },
  ],
  [
    "application/pdf",
    {
      extensions: ["pdf"],
      maxBytes: MEDIA_LIMITS.document,
      kind: "document",
    },
  ],
]);

export function getUploadValidationError(file: File) {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() ?? "";
  const mediaType =
    allowedMediaTypes.get(
      file.type.toLowerCase()
    );

  if (
    !mediaType ||
    !mediaType.extensions.includes(extension)
  ) {
    return "Choose a supported image, video, audio file, or PDF.";
  }

  if (file.size > mediaType.maxBytes) {
    const limitMb = Math.round(
      mediaType.maxBytes / 1024 / 1024
    );

    return `${mediaType.kind[0].toUpperCase()}${mediaType.kind.slice(
      1
    )} uploads must be ${limitMb} MB or smaller.`;
  }

  return null;
}

export async function uploadImage(
  file: File
) {
  const validationError =
    getUploadValidationError(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const response =
    await api.post(
      "/upload",

      formData,

      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );

  return response.data.url;
}
