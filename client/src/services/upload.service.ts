import { isAxiosError, type AxiosProgressEvent } from "axios";
import imageCompression from "browser-image-compression";

import { api } from "./api";

export const MEDIA_LIMITS = {
  image: 10 * 1024 * 1024,
  imageInput: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  videoInput: 250 * 1024 * 1024,
  videoCompressionThreshold: 30 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
  document: 8 * 1024 * 1024,
} as const;

export type MediaPurpose =
  | "avatar"
  | "group_avatar"
  | "story"
  | "chat"
  | "voice"
  | "attachment";

export type UploadedMedia = {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  kind: "image" | "video" | "audio" | "document";
  mimeType: string;
  fileName: string;
  size: number;
  format: string | null;
};

const IMAGE_COMPRESSION_MAX_SIZE_MB = 4;
const IMAGE_COMPRESSION_MAX_EDGE = 1920;
const SKIP_IMAGE_COMPRESSION_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
]);

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
    "image/heic",
    {
      extensions: ["heic"],
      maxBytes: MEDIA_LIMITS.image,
      kind: "image",
    },
  ],
  [
    "image/heif",
    {
      extensions: ["heif"],
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
      extensions: ["mp4", "m4v", "mov"],
      maxBytes: MEDIA_LIMITS.video,
      kind: "video",
    },
  ],
  [
    "video/x-m4v",
    {
      extensions: ["m4v"],
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
    "video/3gpp",
    {
      extensions: ["3gp", "3gpp"],
      maxBytes: MEDIA_LIMITS.video,
      kind: "video",
    },
  ],
  [
    "video/3gpp2",
    {
      extensions: ["3g2", "3gpp2"],
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
    "audio/webm",
    {
      extensions: ["webm"],
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

function getFileExtension(file: File) {
  return (
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() ?? ""
  );
}

function normalizeMimeType(mimeType: string) {
  return (
    mimeType
      .split(";")[0]
      ?.trim()
      .toLowerCase() ?? ""
  );
}

function getMediaTypeByExtension(extension: string) {
  if (!extension) {
    return null;
  }

  for (const [mimeType, mediaType] of allowedMediaTypes.entries()) {
    if (mediaType.extensions.includes(extension)) {
      return {
        mimeType,
        mediaType,
      };
    }
  }

  return null;
}

function getValidatedMediaType(file: File) {
  const extension = getFileExtension(file);
  const mediaType =
    allowedMediaTypes.get(
      normalizeMimeType(file.type)
    ) ?? getMediaTypeByExtension(extension)?.mediaType;

  if (
    !mediaType ||
    (extension &&
      !mediaType.extensions.includes(extension))
  ) {
    return null;
  }

  return mediaType;
}

export function getUploadMediaKind(file: File) {
  return getValidatedMediaType(file)?.kind ?? null;
}

function getNormalizedUploadFile(file: File) {
  const extension = getFileExtension(file);
  const normalizedMimeType = normalizeMimeType(file.type);
  const extensionMediaType = getMediaTypeByExtension(extension);
  const mediaType =
    allowedMediaTypes.get(
      normalizedMimeType
    ) ?? extensionMediaType?.mediaType;
  const mimeType = mediaType
    ? normalizedMimeType || extensionMediaType?.mimeType || file.type
    : file.type;

  if (
    !mediaType ||
    (mediaType.extensions.includes(extension) && file.type)
  ) {
    return file;
  }

  const targetExtension = mediaType.extensions.includes(extension)
    ? extension
    : mediaType.extensions[0];
  const filename = `flexchat-upload-${Date.now()}.${targetExtension}`;

  return new File(
    [file],
    filename,
    {
      type: mimeType,
      lastModified:
        file.lastModified,
    }
  );
}

async function compressImageFile(file: File) {
  const normalizedMimeType = normalizeMimeType(file.type);

  if (
    typeof window === "undefined" ||
    !normalizedMimeType.startsWith("image/") ||
    SKIP_IMAGE_COMPRESSION_TYPES.has(normalizedMimeType)
  ) {
    return file;
  }

  if (file.size <= 1.2 * 1024 * 1024) {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: IMAGE_COMPRESSION_MAX_SIZE_MB,
      maxWidthOrHeight: IMAGE_COMPRESSION_MAX_EDGE,
      useWebWorker: true,
      initialQuality: 0.82,
      alwaysKeepResolution: false,
    });

    if (compressedFile.size >= file.size) {
      return file;
    }

    return getNormalizedUploadFile(compressedFile);
  } catch {
    return file;
  }
}

function shouldTranscodeForVideoCompatibility(file: File) {
  const extension = getFileExtension(file);
  const normalizedMimeType = normalizeMimeType(file.type);

  if (!file.type || ["mov", "3gp", "3gpp", "3g2", "3gpp2"].includes(extension)) {
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const video = document.createElement("video");

  return (
    normalizedMimeType.startsWith("video/") &&
    !video.canPlayType(normalizedMimeType)
  );
}

function getSupportedRecordingMimeType() {
  if (
    typeof MediaRecorder ===
    "undefined"
  ) {
    return "";
  }

  return [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((mimeType) =>
    MediaRecorder.isTypeSupported(
      mimeType
    )
  ) ?? "";
}

async function getLoadedVideoElement(file: File) {
  const url =
    URL.createObjectURL(file);
  const video =
    document.createElement("video");

  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>(
      (resolve, reject) => {
        video.onloadedmetadata = () =>
          resolve();
        video.onerror = () =>
          reject(
            new Error(
              "Video metadata unavailable"
            )
          );
      }
    );
  } catch (error) {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    video.onloadedmetadata = null;
    video.onerror = null;
  }

  return {
    video,
    url,
  };
}

async function compressVideoFile(
  file: File,
  onProgress?: (progress: number) => void
) {
  if (
    typeof document ===
      "undefined" ||
    typeof MediaRecorder ===
      "undefined"
  ) {
    throw new Error(
      "This browser cannot compress large videos."
    );
  }

  const mimeType =
    getSupportedRecordingMimeType();

  if (!mimeType) {
    throw new Error(
      "This browser cannot compress large videos."
    );
  }

  const { video, url } =
    await getLoadedVideoElement(file);
  let canvasStream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let frameId: number | null = null;

  try {
    const duration =
      Number.isFinite(video.duration) &&
      video.duration > 0
        ? video.duration
        : 1;
    const sourceWidth =
      video.videoWidth || 1280;
    const sourceHeight =
      video.videoHeight || 720;
    const scale =
      Math.min(
        1,
        960 / sourceWidth,
        540 / sourceHeight
      );
    const canvas =
      document.createElement("canvas");

    canvas.width = Math.max(
      2,
      Math.round(sourceWidth * scale)
    );
    canvas.height = Math.max(
      2,
      Math.round(sourceHeight * scale)
    );

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Video compression unavailable."
      );
    }

    const canvasContext = context;

    const activeCanvasStream =
      canvas.captureStream(24);
    canvasStream = activeCanvasStream;
    const mediaElementStream =
      (
        video as HTMLVideoElement & {
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        }
      ).captureStream?.() ??
      (
        video as HTMLVideoElement & {
          mozCaptureStream?: () => MediaStream;
        }
      ).mozCaptureStream?.();

    mediaElementStream
      ?.getAudioTracks()
      .forEach((track) => {
        activeCanvasStream.addTrack(track);
      });

    const activeRecorder =
      new MediaRecorder(
        activeCanvasStream,
        {
          mimeType,
          videoBitsPerSecond:
            1_500_000,
          audioBitsPerSecond:
            96_000,
        }
      );
    recorder = activeRecorder;
    const chunks: BlobPart[] = [];
    function drawFrame() {
      canvasContext.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );
      onProgress?.(
        Math.min(
          88,
          Math.max(
            8,
            Math.round(
              (video.currentTime /
                duration) *
                88
            )
          )
        )
      );
      frameId =
        requestAnimationFrame(drawFrame);
    }

    const compressedBlob =
      await new Promise<Blob>(
        (resolve, reject) => {
          activeRecorder.ondataavailable = (
            event
          ) => {
            if (event.data.size) {
              chunks.push(event.data);
            }
          };
          activeRecorder.onerror = () =>
            reject(
              new Error(
                "Video compression failed."
              )
            );
          activeRecorder.onstop = () =>
            resolve(
              new Blob(chunks, {
                type: "video/webm",
              })
            );
          video.onended = () => {
            if (frameId !== null) {
              cancelAnimationFrame(frameId);
              frameId = null;
            }

            if (
              activeRecorder.state !==
              "inactive"
            ) {
              activeRecorder.stop();
            }
          };

          activeRecorder.start(1000);
          frameId =
            requestAnimationFrame(drawFrame);
          void video
            .play()
            .catch(reject);
        }
      );

    if (
      compressedBlob.size >= file.size &&
      file.size <= MEDIA_LIMITS.video
    ) {
      return getNormalizedUploadFile(file);
    }

    if (
      compressedBlob.size >
      MEDIA_LIMITS.video
    ) {
      throw new Error(
        "Compressed videos must be 50 MB or smaller."
      );
    }

    onProgress?.(90);

    return new File(
      [compressedBlob],
      `${file.name.replace(
        /\.[^.]+$/,
        ""
      ) || "flexchat-video"}.webm`,
      {
        type: "video/webm",
        lastModified:
          Date.now(),
      }
    );
  } finally {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }

    if (recorder?.state !== "inactive") {
      try {
        recorder?.stop();
      } catch {
        // The recorder may already be stopping after playback ended.
      }
    }

    canvasStream
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );
    video.pause();
    video.onended = null;
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function prepareUploadFile(
  file: File,
  onProgress?: (progress: number) => void
) {
  const normalizedFile =
    getNormalizedUploadFile(file);

  if (
    normalizeMimeType(normalizedFile.type).startsWith(
      "image/"
    )
  ) {
    return compressImageFile(
      normalizedFile
    );
  }

  if (
    normalizedFile.type.startsWith(
      "video/"
    ) &&
    (normalizedFile.size >
      MEDIA_LIMITS.videoCompressionThreshold ||
      shouldTranscodeForVideoCompatibility(normalizedFile))
  ) {
    try {
      return await compressVideoFile(
        normalizedFile,
        onProgress
      );
    } catch (error) {
      if (normalizedFile.size <= MEDIA_LIMITS.video) {
        return normalizedFile;
      }

      throw error;
    }
  }

  return normalizedFile;
}

export function getUploadValidationError(file: File) {
  const mediaType = getValidatedMediaType(file);

  if (!mediaType) {
    return "Choose a supported image, video, audio file, or PDF.";
  }

  const maxBytes =
    mediaType.kind === "video"
      ? MEDIA_LIMITS.videoInput
      : mediaType.kind === "image"
        ? MEDIA_LIMITS.imageInput
      : mediaType.maxBytes;

  if (file.size > maxBytes) {
    const limitMb = Math.round(
      maxBytes / 1024 / 1024
    );

    return `${mediaType.kind[0].toUpperCase()}${mediaType.kind.slice(
      1
    )} uploads must be ${limitMb} MB or smaller.`;
  }

  return null;
}

export async function uploadMedia(
  file: File,
  options?: {
    onProgress?: (progress: number) => void;
    retries?: number;
    purpose?: MediaPurpose;
  }
) {
  const preparedFile =
    await prepareUploadFile(
      file,
      options?.onProgress
    );
  const validationError =
    getUploadValidationError(
      preparedFile
    );
  const preparedMediaType =
    allowedMediaTypes.get(
      normalizeMimeType(preparedFile.type)
    );

  if (validationError) {
    throw new Error(validationError);
  }

  if (
    preparedMediaType &&
    preparedFile.size >
      preparedMediaType.maxBytes
  ) {
    const limitMb = Math.round(
      preparedMediaType.maxBytes /
        1024 /
        1024
    );

    throw new Error(
      `${preparedMediaType.kind[0].toUpperCase()}${preparedMediaType.kind.slice(
        1
      )} uploads must be ${limitMb} MB or smaller.`
    );
  }

  const formData =
    new FormData();
  const uploadId =
    crypto.randomUUID();

  formData.append(
    "uploadId",
    uploadId
  );
  formData.append(
    "purpose",
    options?.purpose ?? "chat"
  );
  formData.append(
    "file",
    preparedFile
  );

  const retries =
    options?.retries ?? 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response =
        await api.post<UploadedMedia>(
          "/upload",
          formData,
          {
            timeout: 120_000,
            onUploadProgress: (
              progressEvent: AxiosProgressEvent
            ) => {
              if (
                !options?.onProgress ||
                !progressEvent.total
              ) {
                return;
              }

              options.onProgress(
                Math.min(
                  100,
                  Math.round(
                    (progressEvent.loaded /
                      progressEvent.total) *
                      100
                  )
                )
              );
            },
          }
        );

      return response.data;
    } catch (error) {
      lastError = error;

      const status = isAxiosError(error)
        ? error.response?.status
        : undefined;
      const retryable =
        !status ||
        status === 408 ||
        status === 429 ||
        status >= 500;

      if (!retryable || attempt >= retries) {
        throw error;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 650 * (attempt + 1));
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Upload failed");
}
