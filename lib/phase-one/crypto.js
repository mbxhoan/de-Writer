import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function getMasterKey() {
  return createHash('sha256')
    .update(process.env.DE_WRITER_MASTER_KEY || 'de-writer-local-phase-one-master-key')
    .digest();
}

export function encryptSecret(secret) {
  if (!secret) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptSecret(payload) {
  if (!payload) {
    return '';
  }

  const decipher = createDecipheriv('aes-256-gcm', getMasterKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function last4(value) {
  return value ? value.slice(-4) : '';
}
