let bootComplete = false;

export function setBootComplete(value = true) {
  bootComplete = value;
}

export function isBootComplete() {
  return bootComplete;
}

export function resetBootComplete() {
  bootComplete = false;
}
