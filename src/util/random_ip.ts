// Random IPv4 for the X-Real-IP header. KTMB's rate limiter keys on the
// client-supplied X-Real-IP, so a fresh value per request rotates the bucket.
export const randomIp = (): string =>
  `${1 + Math.floor(Math.random() * 222)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
