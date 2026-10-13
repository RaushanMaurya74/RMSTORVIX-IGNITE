// RMSTORVIX IGNITE — Security, Crypto, RBAC & Validation Module

const crypto = require('node:crypto');
const { getDb } = require('./db');

// Secure password hashing with scrypt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

// Generate random UUID v4
function uuid() {
  return crypto.randomUUID();
}

// Generate secure random token
function randomToken(len = 32) {
  return crypto.randomBytes(len).toString('hex');
}

// HTML XSS escaping
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Indian GSTIN Validator (15-character alphanumeric)
// Format: 2 digits (State code) + 10 chars (PAN) + 1 digit (entity) + 'Z' + 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateGSTIN(gstin) {
  if (!gstin) return { valid: false, message: 'GSTIN is required' };
  const upper = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(upper)) {
    return { valid: false, message: 'Invalid GSTIN format (e.g., 27AABCR1234F1Z5)' };
  }
  const stateCode = upper.substring(0, 2);
  const pan = upper.substring(2, 12);
  return { valid: true, gstin: upper, stateCode, pan };
}

// Indian Financial Year calculation (April 1 to March 31)
function getFinancialYear(dateStr = null) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

// Audit logger
function logAudit(actorUserId, businessId, actionKey, entityType, entityId, req, metadata = {}) {
  try {
    const db = getDb();
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const ua = req ? (req.headers['user-agent'] || 'system') : 'system';
    
    db.prepare(`
      INSERT INTO audit_logs (actor_user_id, business_id, action_key, entity_type, entity_id, ip_address, user_agent, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actorUserId || null,
      businessId || null,
      actionKey,
      entityType || null,
      entityId ? String(entityId) : null,
      String(ip).slice(0, 45),
      String(ua).slice(0, 500),
      JSON.stringify(metadata)
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// In-Memory Rate Limiter
const rateLimits = new Map();

function checkRateLimit(ipKey, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimits.get(ipKey);

  if (!record || now > record.resetTime) {
    rateLimits.set(ipKey, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  record.count += 1;
  if (record.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((record.resetTime - now) / 1000) };
  }

  return { allowed: true, remaining: limit - record.count };
}

// Cleanup expired rate limit entries every 5 mins
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimits.entries()) {
    if (now > value.resetTime) rateLimits.delete(key);
  }
}, 300000).unref();

module.exports = {
  hashPassword,
  verifyPassword,
  uuid,
  randomToken,
  escapeHtml,
  validateGSTIN,
  getFinancialYear,
  logAudit,
  checkRateLimit
};
