// Kept apart from ai.ts so reading the key doesn't pull in the SDK bundle.
const KEY_STORAGE = 'snackcheck:apiKey'

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage blocked: key only lives for this session */
  }
}
