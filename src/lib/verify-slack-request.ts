export async function verifySlackRequest(
  req: Request,
  rawBody: string,
  signingSecret: string
): Promise<boolean> {
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");
  if (!timestamp || !signature) return false;

  // Reject replay attacks
  const FIVE_MINUTES = 60 * 5;
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > FIVE_MINUTES) return false;
  const baseString = `v0:${timestamp}:${rawBody}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(baseString)
  );
  const mySig =
    "v0=" +
    Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return mySig === signature;
}
