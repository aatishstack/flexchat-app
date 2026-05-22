import { isAxiosError, type AxiosProgressEvent } from "axios";

import { api } from "./api";

export const MEDIA_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  videoInput: 250 * 1024 * 1024,
  videoCompressionThreshold: 30 * 1024 * 1024,
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

function getNormalizedUploadFile(file: File) {
  const extension = getFileExtension(file);
  const mediaType =
    allowedMediaTypes.get(
      normalizeMimeType(file.type)
    );

  if (
    !mediaType ||
    mediaType.extensions.includes(extension)
  ) {
    return file;
  }

  const filename = `flexchat-upload-${Date.now()}.${
    mediaType.extensions[0]
  }`;

  return new File(
    [file],
    filename,
    {
      type: file.type,
      lastModified:
        file.lastModified,
    }
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

    const canvasStream =
      canvas.captureStream(24);
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
        canvasStream.addTrack(track);
      });

    const recorder =
      new MediaRecorder(
        canvasStream,
        {
          mimeType,
          videoBitsPerSecond:
            1_500_000,
          audioBitsPerSecond:
            96_000,
        }
      );
    const chunks: BlobPart[] = [];
    let frameId = 0;

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
          recorder.ondataavailable = (
            event
          ) => {
            if (event.data.size) {
              chunks.push(event.data);
            }
          };
          recorder.onerror = () =>
            reject(
              new Error(
                "Video compression failed."
              )
            );
          recorder.onstop = () =>
            resolve(
              new Blob(chunks, {
                type: "video/webm",
              })
            );
          video.onended = () => {
            cancelAnimationFrame(frameId);

            if (
              recorder.state !==
              "inactive"
            ) {
              recorder.stop();
            }
          };

          recorder.start(1000);
          frameId =
            requestAnimationFrame(drawFrame);
          void video
            .play()
            .catch(reject);
        }
      );

    canvasStream
      .getTracks()
      .forEach((track) =>
        track.stop()
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
    normalizedFile.type.startsWith(
      "video/"
    ) &&
    normalizedFile.size >
      MEDIA_LIMITS.videoCompressionThreshold
  ) {
    return compressVideoFile(
      normalizedFile,
      onProgress
    );
  }

  return normalizedFile;
}

export function getUploadValidationError(file: File) {
  const extension = getFileExtension(file);
  const mediaType =
    allowedMediaTypes.get(
      normalizeMimeType(file.type)
    );

  if (
    !mediaType ||
    (extension &&
      !mediaType.extensions.includes(extension))
  ) {
    return "Choose a supported image, video, audio file, or PDF.";
  }

  const maxBytes =
    mediaType.kind === "video"
      ? MEDIA_LIMITS.videoInput
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

export async function uploadImage(
  file: File,
  options?: {
    onProgress?: (progress: number) => void;
    retries?: number;
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
        await api.post<{
          url: string;
        }>(
          "/upload",
          formData,
          {
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

      return response.data.url;
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
