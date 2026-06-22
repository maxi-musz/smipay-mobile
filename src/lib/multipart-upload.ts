import * as FileSystem from "expo-file-system/legacy";
import {
  FileSystemSessionType,
  FileSystemUploadType,
} from "expo-file-system/legacy";

import { API_BASE_URL, ApiClientError, buildRequestHeaders } from "@/lib/api";
import {
  prepareUploadableFile,
  type UploadableFile,
} from "@/lib/prepare-upload-file";

type MultipartUploadOptions = {
  path: string;
  file: UploadableFile;
  fieldName?: string;
  parameters?: Record<string, string>;
};

/**
 * Multipart upload via expo-file-system's native uploader.
 * Axios + FormData is unreliable on Android (fails with "Network Error" before
 * the request reaches the server); this path uses OkHttp/NSURLSession directly.
 */
export async function postMultipart<T>({
  path,
  file,
  fieldName = "file",
  parameters,
}: MultipartUploadOptions): Promise<T> {
  const uploadFile = await prepareUploadableFile(file);
  const headers = await buildRequestHeaders();
  const url = `${API_BASE_URL}${path}`;

  if (__DEV__) {
    console.log(`→ UPLOAD POST ${url}`);
  }

  const result = await FileSystem.uploadAsync(url, uploadFile.uri, {
    uploadType: FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType: uploadFile.type,
    parameters,
    headers,
    httpMethod: "POST",
    sessionType: FileSystemSessionType.FOREGROUND,
  });

  if (__DEV__) {
    console.log(`← ${result.status} UPLOAD POST ${path}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    throw new ApiClientError(
      result.status >= 400
        ? "Upload failed. Please try again."
        : "Invalid server response.",
      result.status,
    );
  }

  const body = parsed as Record<string, unknown> & { message?: string };

  if (result.status >= 400) {
    throw new ApiClientError(
      body.message ?? "Upload failed. Please try again.",
      result.status,
      body,
    );
  }

  return parsed as T;
}
