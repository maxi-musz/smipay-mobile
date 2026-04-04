/** True when the transaction did not complete successfully (list row styling). */
export function isUnsuccessfulTransactionStatus(status: string): boolean {
  const s = String(status).toLowerCase().trim();
  return s === "failed" || s === "cancelled";
}
