let bootComplete = false;
let bootStarted = false;

export function setBootComplete(value = true) {
  bootComplete = value;
}

export function isBootComplete() {
  return bootComplete;
}

/** Ensures cold-start routing runs only once (e.g. React Strict Mode remounts). */
export function markBootStarted(): boolean {
  if (bootStarted) return false;
  bootStarted = true;
  return true;
}

export function resetBootComplete() {
  bootComplete = false;
  bootStarted = false;
}
