import * as crypto from 'crypto';

/**
 * Xác thực chữ ký X-Hub-Signature-256 của Meta.
 * Header có dạng "sha256=<hmac hex>".
 */
export function verifySignature(
  appSecret: string,
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
): boolean {
  if (!appSecret || !rawBody || !signatureHeader) {
    return false;
  }
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
