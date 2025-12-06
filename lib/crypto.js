// lib/chatCrypto.js
export const encoder = new TextEncoder();
export const decoder = new TextDecoder();

export function toBase64(uint8) {
  if (!uint8) return "";
  return Buffer.from(uint8).toString("base64");
}

export function fromBase64(b64) {
  if (!b64) return new Uint8Array();
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// Import a base64 AES key into CryptoKey
export async function importChatKeyFromBase64(chatKeyB64) {
  const raw = fromBase64(chatKeyB64);
  if (raw.length !== 32) {
    throw new Error("Invalid AES-256 key length");
  }
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

// Generate a fresh AES key and return { key, b64 }
export async function generateChatKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  const b64 = toBase64(new Uint8Array(raw));
  return { key, b64 };
}

// Per-chat local cache helpers
export function cacheChatKey(chatId, chatKeyB64) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`chat_key_${chatId}`, chatKeyB64);
}

export function getCachedChatKey(chatId) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`chat_key_${chatId}`);
}

// Encrypt with a given CryptoKey
export async function encryptWithChatKey(key, plainText) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(plainText);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    ciphertext: toBase64(new Uint8Array(cipherBuf)),
    iv: toBase64(iv),
  };
}

// Decrypt with a given CryptoKey
export async function decryptWithChatKey(key, ciphertextB64, ivB64) {
  if (!ciphertextB64 || !ivB64) return "";

  const iv = fromBase64(ivB64);
  const ciphertext = fromBase64(ciphertextB64);

  if (iv.length === 0 || ciphertext.length === 0) return "";

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return decoder.decode(plainBuf);
}
