const memoryFallback = new Map<string, string>();

export function readLocalValue(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) memoryFallback.delete(key);
    else memoryFallback.set(key, value);
    return value;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

export function writeLocalValue(key: string, value: string) {
  memoryFallback.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Restricted browsers can still use the current in-memory session.
  }
}

export function removeLocalValue(key: string) {
  memoryFallback.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The fallback value has already been removed.
  }
}
