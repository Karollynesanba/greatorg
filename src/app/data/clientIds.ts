export function createClientNumericId() {
  const base = Math.floor(Date.now() / 10);
  const suffix = Math.floor(Math.random() * 1000);
  return base * 1000 + suffix;
}
