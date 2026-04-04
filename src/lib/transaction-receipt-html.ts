import type { ReceiptPayload } from "./transaction-receipt-data";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safe for img src (data URI or https); do not use full escapeHtml on URLs. */
function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

export type ReceiptHtmlOptions = {
  smipayLogoDataUri?: string;
  /** Remote https URL or data URI for provider logo */
  providerImageSrc?: string;
};

export function buildReceiptHtml(
  payload: ReceiptPayload,
  options: ReceiptHtmlOptions = {},
): string {
  const orange = "#F58220";
  const green = "#1B8C3D";
  const text = "#111827";
  const muted = "#6B7280";
  const bgOuter =
    "linear-gradient(145deg, #FFF7ED 0%, #FFFFFF 35%, #ECFDF5 70%, #FFF7ED 100%)";
  const card = "#FFFFFF";
  const panel = "#F3F4F6";
  const amountColor = payload.isCredit ? green : "#DC2626";

  const rows = payload.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:10px 8px 10px 0;border-bottom:1px solid #E5E7EB;font-size:11px;color:${muted};vertical-align:top;width:38%;font-weight:400;">${escapeHtml(line.label)}</td>
        <td style="padding:10px 0 10px 8px;border-bottom:1px solid #E5E7EB;font-size:12px;color:${text};text-align:right;font-weight:600;word-break:break-word;line-height:1.35;">${escapeHtml(line.value)}</td>
      </tr>`,
    )
    .join("");

  const smipayBlock = options.smipayLogoDataUri
    ? `<img src="${escapeAttr(options.smipayLogoDataUri)}" width="48" height="48" alt="" style="display:block;border-radius:12px;" />`
    : `<div style="font-size:20px;font-weight:800;color:${orange};text-align:left;">SmiPay</div>`;

  const providerBlock = options.providerImageSrc
    ? `<img src="${escapeAttr(options.providerImageSrc)}" width="56" height="56" alt="" style="display:block;margin:0 auto;border-radius:14px;object-fit:cover;border:1px solid #E5E7EB;background:#fff;" />`
    : `<div style="width:56px;height:56px;margin:0 auto;border-radius:14px;background:${panel};border:1px dashed #D1D5DB;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${muted};text-align:center;padding:4px;">${escapeHtml(payload.providerLabel.slice(0, 10))}</div>`;

  const debitBadgeBg = payload.isCredit ? "#DCFCE7" : "#FEE2E2";
  const debitBadgeFg = payload.isCredit ? green : "#B91C1C";

  const statusBg =
    payload.statusKey === "success"
      ? "#DCFCE7"
      : payload.statusKey === "pending"
        ? "#FEF3C7"
        : "#FEE2E2";
  const statusFg =
    payload.statusKey === "success"
      ? "#166534"
      : payload.statusKey === "pending"
        ? "#B45309"
        : "#B91C1C";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Receipt</title>
</head>
<body style="margin:0;padding:0;background:${bgOuter};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
  <div style="max-width:420px;margin:0 auto;padding:28px 18px 36px;">
    <div style="background:${card};border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(17,24,39,0.08);">
      <div style="height:5px;background:linear-gradient(90deg,${orange},${green});"></div>

      <div style="padding:20px 20px 16px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
          <tr>
            <td style="width:33%;vertical-align:middle;text-align:left;">${smipayBlock}</td>
            <td style="width:34%;vertical-align:middle;text-align:center;">${providerBlock}</td>
            <td style="width:33%;"></td>
          </tr>
        </table>

        <p style="margin:14px 0 0;font-size:10px;font-weight:800;letter-spacing:0.14em;color:${muted};text-align:center;text-transform:uppercase;">Transaction receipt</p>
        <p style="margin:6px 0 0;font-size:13px;color:${muted};text-align:center;">${escapeHtml(payload.providerLabel)}</p>
      </div>

      <div style="padding:0 20px 20px;">
        <div style="display:inline-block;margin-bottom:8px;">
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:0.06em;background:${debitBadgeBg};color:${debitBadgeFg};">${payload.debitCreditLabel}</span>
        </div>
        <span style="display:inline-block;margin-left:8px;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:700;background:#EFF6FF;color:#1D4ED8;">${escapeHtml(payload.transactionTypeLabel)}</span>

        <p style="margin:12px 0 4px;font-size:11px;color:${muted};">Amount</p>
        <p style="margin:0 0 16px;font-size:32px;font-weight:800;color:${amountColor};letter-spacing:-0.5px;">${escapeHtml(payload.amountPrefix)}₦${escapeHtml(payload.amountDisplay)}</p>

        <div style="margin-bottom:18px;">
          <span style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${statusBg};color:${statusFg};">${escapeHtml(payload.statusLabel)}</span>
        </div>

        <div style="background:${panel};border-radius:14px;padding:14px 14px 0;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.08em;color:${muted};text-transform:uppercase;">Details</p>
          <table style="width:100%;border-collapse:collapse;">${rows}</table>
        </div>
      </div>
    </div>

    <p style="margin:0;padding:20px 8px 0;font-size:10px;color:#9CA3AF;text-align:center;line-height:1.5;">Generated in SmiPay • For your records only</p>
  </div>
</body>
</html>`;
}
