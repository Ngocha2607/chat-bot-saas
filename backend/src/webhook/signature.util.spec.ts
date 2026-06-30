import * as crypto from 'crypto';
import { verifySignature } from './signature.util';

describe('verifySignature', () => {
  const appSecret = 'test_secret';
  const body = Buffer.from(JSON.stringify({ object: 'page', entry: [] }));
  const validSig =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(body).digest('hex');

  it('chấp nhận chữ ký hợp lệ', () => {
    expect(verifySignature(appSecret, body, validSig)).toBe(true);
  });

  it('từ chối chữ ký sai', () => {
    expect(verifySignature(appSecret, body, 'sha256=deadbeef')).toBe(false);
  });

  it('từ chối khi thiếu app secret', () => {
    expect(verifySignature('', body, validSig)).toBe(false);
  });

  it('từ chối khi thiếu raw body', () => {
    expect(verifySignature(appSecret, undefined, validSig)).toBe(false);
  });

  it('từ chối khi body bị sửa đổi', () => {
    const tampered = Buffer.from(JSON.stringify({ object: 'page', entry: [1] }));
    expect(verifySignature(appSecret, tampered, validSig)).toBe(false);
  });
});
