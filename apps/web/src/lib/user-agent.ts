const BROWSERS: Array<[RegExp, string]> = [
  [/edg\//i, "Edge"],
  [/opr\/|opera/i, "Opera"],
  [/chrome|crios/i, "Chrome"],
  [/firefox|fxios/i, "Firefox"],
  [/safari/i, "Safari"],
];

const PLATFORMS: Array<[RegExp, string]> = [
  [/iphone/i, "iPhone"],
  [/ipad/i, "iPad"],
  [/android/i, "Android"],
  [/mac os x/i, "Mac"],
  [/windows/i, "Windows"],
  [/linux/i, "Linux"],
];

export function describeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const platform = PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && platform) return `${browser} en ${platform}`;
  return browser ?? platform ?? null;
}
