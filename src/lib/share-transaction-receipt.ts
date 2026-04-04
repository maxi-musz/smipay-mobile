import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

import type { ReceiptPayload } from "./transaction-receipt-data";
import { buildReceiptHtml } from "./transaction-receipt-html";
import { getProviderLogo } from "./provider-logo";
import type { SingleTransaction } from "@/types";

const LOGO = require("../../assets/images/icon.png");

export async function loadLogoDataUri(): Promise<string | undefined> {
  try {
    const asset = Asset.fromModule(LOGO);
    await asset.downloadAsync();
    if (!asset.localUri) return undefined;
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: "base64",
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return undefined;
  }
}

function mimeFromLocalUri(uri: string): string {
  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function loadLocalRequireAsDataUri(
  mod: number,
): Promise<string | undefined> {
  try {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    if (!asset.localUri) return undefined;
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: "base64",
    });
    return `data:${mimeFromLocalUri(asset.localUri)};base64,${base64}`;
  } catch {
    return undefined;
  }
}

export async function loadProviderImageForPdf(
  tx: SingleTransaction,
): Promise<string | undefined> {
  if (tx.icon && /^https?:\/\//i.test(tx.icon.trim())) {
    return tx.icon.trim();
  }
  const local = getProviderLogo(tx.description);
  if (local == null) return undefined;
  if (typeof local === "number") {
    return loadLocalRequireAsDataUri(local);
  }
  return undefined;
}

/** Shared stem: `smipay-receipt-{last6}` from reference or id */
function receiptShareBasename(tx: SingleTransaction): string {
  const raw = tx.tx_reference ?? tx.id;
  const cleaned = String(raw).replace(/[^a-zA-Z0-9]/g, "");
  let suffix = "000000";
  if (cleaned.length >= 6) {
    suffix = cleaned.slice(-6).toLowerCase();
  } else if (cleaned.length > 0) {
    suffix = cleaned.toLowerCase().padStart(6, "0");
  }
  return `smipay-receipt-${suffix}`;
}

export function receiptPdfFilename(tx: SingleTransaction): string {
  return `${receiptShareBasename(tx)}.pdf`;
}

export function receiptImageFilename(tx: SingleTransaction): string {
  return `${receiptShareBasename(tx)}.png`;
}

export async function shareReceiptAsPdf(
  payload: ReceiptPayload,
  tx: SingleTransaction,
): Promise<void> {
  const smipayLogo = await loadLogoDataUri();
  const providerImg = await loadProviderImageForPdf(tx);
  const html = buildReceiptHtml(payload, {
    smipayLogoDataUri: smipayLogo,
    providerImageSrc: providerImg,
  });
  const { uri } = await Print.printToFileAsync({
    html,
    width: 612,
    margins: { top: 36, bottom: 36, left: 36, right: 36 },
  });
  const filename = receiptPdfFilename(tx);
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error("Cache directory unavailable");
  }
  const dest = `${base}${filename}`;
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    /* ignore */
  }
  await FileSystem.copyAsync({ from: uri, to: dest });
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(dest, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Share receipt",
  });
}

export async function shareReceiptAsImage(
  receiptRef: RefObject<View | null>,
  tx: SingleTransaction,
): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => setTimeout(r, 120));
  if (!receiptRef.current) {
    throw new Error("Receipt view not ready");
  }
  const capturedUri = await captureRef(receiptRef, {
    format: "png",
    quality: 1,
    result: "tmpfile",
  });
  const filename = receiptImageFilename(tx);
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error("Cache directory unavailable");
  }
  const dest = `${base}${filename}`;
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  } catch {
    /* ignore */
  }
  await FileSystem.copyAsync({ from: capturedUri, to: dest });
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(dest, {
    mimeType: "image/png",
    dialogTitle: "Share receipt",
  });
}
