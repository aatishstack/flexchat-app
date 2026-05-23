export function GET() {
  const serverTime = Date.now();

  return Response.json({
    serverTime,
    epochMs: serverTime,
    utc: new Date(serverTime).toISOString(),
  });
}
