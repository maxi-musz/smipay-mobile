import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

export type UploadableFile = {
  uri: string;
  name: string;
  type: string;
};

function extFromFileName(fileName: string): string {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

function ensureFileName(name: string): string {
  return /\.[a-zA-Z0-9]+$/.test(name) ? name : `${name}.jpg`;
}

function normalizeMimeType(type: string, fileName: string): string {
  if (type === "image/jpg") return "image/jpeg";
  if (type) return type;

  const ext = extFromFileName(fileName);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

/**
 * Normalize a picked image URI for native multipart upload.
 * On Android, always copy into cache — gallery/camera URIs (`content://`, etc.)
 * cannot be streamed by axios or OkHttp when appended to FormData.
 */
export async function prepareUploadableFile(
  file: UploadableFile,
): Promise<UploadableFile> {
  const name = ensureFileName(file.name);
  const type = normalizeMimeType(file.type, name);
  const sourceUri = file.uri.trim();

  if (!sourceUri) {
    throw new Error("Missing file URI");
  }

  if (Platform.OS === "android") {
    const base = FileSystem.cacheDirectory;
    if (!base) {
      throw new Error("Cache directory unavailable");
    }

    const dest = `${base}upload_${Date.now()}.${extFromFileName(name)}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });

    const info = await FileSystem.getInfoAsync(dest);
    if (!info.exists || !("size" in info) || !info.size) {
      throw new Error(
        "Could not read the selected image. Try again or pick a different photo.",
      );
    }

    return { uri: dest, name, type };
  }

  let uri = sourceUri;
  if (uri.startsWith("/") && !uri.startsWith("file://")) {
    uri = `file://${uri}`;
  }

  return { uri, name, type };
}
