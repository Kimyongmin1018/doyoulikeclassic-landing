import crypto from "node:crypto";
import { nanoid } from "nanoid";

const sessionDurationMs = 1000 * 60 * 60 * 8;

export function safeCompareText(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  const compareLength = Math.max(leftBuffer.length, rightBuffer.length, 1);
  const paddedLeft = Buffer.alloc(compareLength);
  const paddedRight = Buffer.alloc(compareLength);

  leftBuffer.copy(paddedLeft);
  rightBuffer.copy(paddedRight);

  return crypto.timingSafeEqual(paddedLeft, paddedRight) && leftBuffer.length === rightBuffer.length;
}

export function hashToken(token, secret) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function createSession(db, secret) {
  const token = nanoid(48);
  const csrfToken = nanoid(32);
  const tokenHash = hashToken(token, secret);
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();

  db.prepare("insert into admin_sessions (token_hash, csrf_token, expires_at) values (?, ?, ?)")
    .run(tokenHash, csrfToken, expiresAt);

  return { token, csrfToken, expiresAt };
}

export function findSession(db, token, secret) {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token, secret);
  const session = db.prepare("select * from admin_sessions where token_hash = ?").get(tokenHash);

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("delete from admin_sessions where token_hash = ?").run(tokenHash);
    return null;
  }

  return session;
}

export function destroySession(db, token, secret) {
  if (!token) {
    return;
  }

  db.prepare("delete from admin_sessions where token_hash = ?").run(hashToken(token, secret));
}
