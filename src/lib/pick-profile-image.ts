import { Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export type PickedProfileImage = {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
};

const MAX_BYTES = 5 * 1024 * 1024;

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function fromImagePickerAsset(asset: ImagePicker.ImagePickerAsset): PickedProfileImage {
  const fileName =
    asset.fileName ?? `profile_${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? guessMime(fileName),
    fileName,
    fileSize: asset.fileSize,
  };
}

export async function pickFromCamera(): Promise<PickedProfileImage | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera access",
      "Allow camera access in Settings to take a profile photo.",
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.88,
  });
  if (result.canceled || !result.assets[0]) return null;
  return fromImagePickerAsset(result.assets[0]);
}

export async function pickFromLibrary(): Promise<PickedProfileImage | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photos access",
      "Allow photo library access in Settings to choose a profile picture.",
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.88,
  });
  if (result.canceled || !result.assets[0]) return null;
  return fromImagePickerAsset(result.assets[0]);
}

export async function pickFromFile(): Promise<PickedProfileImage | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "image/*",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const a = result.assets[0];
  if (!a) return null;
  const fileName = a.name ?? `profile_${Date.now()}.jpg`;
  return {
    uri: a.uri,
    mimeType: a.mimeType ?? guessMime(fileName),
    fileName,
    fileSize: a.size,
  };
}

export function rejectIfProfileImageTooLarge(
  p: PickedProfileImage,
): PickedProfileImage | null {
  if (p.fileSize != null && p.fileSize > MAX_BYTES) {
    Alert.alert("File too large", "Please choose an image of 5 MB or less.");
    return null;
  }
  return p;
}
