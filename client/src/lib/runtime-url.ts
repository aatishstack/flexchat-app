const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
]);

export function resolveLocalRuntimeUrl(
  configuredUrl: string | undefined,
  fallbackUrl: string,
): string {
  const resolvedUrl = configuredUrl ?? fallbackUrl;
  if (typeof window === "undefined") return resolvedUrl;
  
  const isMobileApp = typeof window !== "undefined" &&
    ((window as any).Capacitor || (window as any).webkit?.messageHandlers?.cordova);
  if (isMobileApp) {
    return resolvedUrl;
  }

  const currentHost = window.location.hostname;
  if (!LOCAL_HOSTS.has(currentHost)) return resolvedUrl;
  try {
    const url = new URL(resolvedUrl);
    if (!LOCAL_HOSTS.has(url.hostname)) return resolvedUrl;
    url.hostname = currentHost;
    return url.toString().replace(/\/$/, "");
  } catch {
    return resolvedUrl;
  }
}
