import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Application from "expo-application";
import { Platform } from "react-native";

import { secureStorage } from "./secure-storage";

const DEVICE_ID_KEY = "device_id";

/**
 * Returns a stable, per-install UUID for this device.
 *
 * Generated once on first launch and persisted in SecureStore (encrypted).
 * We intentionally avoid hardware identifiers (IMEI, MAC, IDFA) —
 * Apple rejects apps that use those for tracking, and Google's
 * Play Store data-safety policy discourages it.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await secureStorage.get<string>(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = Crypto.randomUUID();
  await secureStorage.set(DEVICE_ID_KEY, id);
  return id;
}

export interface DeviceMetadata {
  "x-device-id": string;
  "x-device-fingerprint": string;
  "x-device-name": string;
  "x-device-model": string;
  platform: string;
  "x-os-name": string;
  "x-os-version": string;
  "x-app-version": string;
}

let _cached: DeviceMetadata | null = null;

/**
 * Collects non-sensitive device metadata for API request headers.
 *
 * All fields are standard hardware/software identifiers that do NOT
 * require user permission and are explicitly allowed by both stores
 * when used for fraud prevention and account security.
 */
export async function getDeviceMetadata(): Promise<DeviceMetadata> {
  if (_cached) return _cached;

  const deviceId = await getDeviceId();

  _cached = {
    "x-device-id": deviceId,
    "x-device-fingerprint": deviceId,
    "x-device-name": Device.deviceName ?? Device.modelName ?? "Unknown",
    "x-device-model": Device.modelName ?? "Unknown",
    platform: Platform.OS,
    "x-os-name": Device.osName ?? Platform.OS,
    "x-os-version": Device.osVersion ?? String(Platform.Version),
    "x-app-version": Application.nativeApplicationVersion ?? "1.0.0",
  };

  return _cached;
}
