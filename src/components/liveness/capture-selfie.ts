import * as ImagePicker from "expo-image-picker";

/**
 * Selfie capture for the liveness step. Deliberately thin: the decision about
 * whether a face is live or matches a BVN belongs to the server and the
 * identity provider, never to the app. All this does is get one honest frame
 * from the FRONT camera and hand back base64.
 */

export type SelfieCapture = {
  /** Raw base64, no data-URL prefix — the server forwards it as-is. */
  base64: string;
  /** Decoded size, so the caller can refuse before spending a paid attempt. */
  bytes: number;
};

export type CaptureOutcome =
  | { status: "captured"; selfie: SelfieCapture }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "too_large"; bytes: number }
  | { status: "failed" };

/**
 * JPEG quality. Low enough that a modern front camera lands comfortably inside
 * the server's size ceiling, high enough that the provider's face model has
 * real detail to work with — under-compressing here shows up as false
 * "poor quality" rejections for honest users.
 */
const QUALITY = 0.55;

export function base64Bytes(b64: string): number {
  if (!b64) return 0;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/**
 * Open the front camera and return one frame.
 *
 * No crop step on purpose: an editing UI invites the user to crop their own
 * face out of the frame, and every such crop is a wasted, billed attempt.
 */
export async function captureSelfie(
  maxBytes: number,
): Promise<CaptureOutcome> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") return { status: "denied" };

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: QUALITY,
      base64: true,
      exif: false,
    });

    if (result.canceled) return { status: "cancelled" };

    const asset = result.assets?.[0];
    const base64 = asset?.base64?.replace(/\s/g, "");
    if (!base64) return { status: "failed" };

    const bytes = base64Bytes(base64);
    if (bytes > maxBytes) return { status: "too_large", bytes };

    return { status: "captured", selfie: { base64, bytes } };
  } catch {
    return { status: "failed" };
  }
}
