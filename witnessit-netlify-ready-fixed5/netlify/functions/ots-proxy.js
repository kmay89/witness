// netlify/functions/ots-proxy.js
// Relay OpenTimestamps calendar requests so browsers don't hit calendar CORS limits.
//
// This relay supports OpenTimestamps.stamp(detached, BASE_URL) where the library appends paths like `/digest`.
// To keep the relay URL parseable and avoid `https://` path normalization, we encode the calendar base URL as base64url:
//
//   /.netlify/functions/ots-proxy/<b64url(calendarBase)>[/digest]
//
// It also supports a simpler query form for manual testing:
//   /.netlify/functions/ots-proxy?url=<FULL_URL>

const ALLOWED_CALENDAR_HOSTS = new Set([
  "alice.btc.calendar.opentimestamps.org",
  "bob.btc.calendar.opentimestamps.org",
  "finney.calendar.eternitywall.com",
]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(b64, "base64").toString("utf8");
}

function extractTarget(event) {
  // Query form
  const qp = event.queryStringParameters && event.queryStringParameters.url;
  if (qp) return qp;

  // Encoded path form
  const marker = "/.netlify/functions/ots-proxy/";
  const p = event.path || "";
  const idx = p.indexOf(marker);
  if (idx === -1) return null;

  const rest = p.slice(idx + marker.length); // "<b64url>/<maybe more>"
  if (!rest) return null;

  const parts = rest.split("/");
  const encodedBase = parts.shift(); // first segment
  const suffix = parts.length ? ("/" + parts.join("/")) : "";

  let decodedBase;
  try {
    decodedBase = fromBase64Url(encodedBase);
  } catch {
    return null;
  }

  return decodedBase + suffix;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  const target = extractTarget(event);
  if (!target) {
    return { statusCode: 400, headers: corsHeaders(), body: "Missing/invalid target" };
  }

  let u;
  try { u = new URL(target); }
  catch {
    return { statusCode: 400, headers: corsHeaders(), body: "Invalid target URL" };
  }

  if (!ALLOWED_CALENDAR_HOSTS.has(u.hostname)) {
    return { statusCode: 403, headers: corsHeaders(), body: "Target not allowed" };
  }

  try {
    const contentType =
      event.headers["content-type"] ||
      event.headers["Content-Type"] ||
      "application/octet-stream";

    const body =
      event.httpMethod === "GET" || event.httpMethod === "HEAD"
        ? undefined
        : event.body
          ? (event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body)
          : undefined;

    const upstream = await fetch(u.toString(), {
      method: event.httpMethod,
      headers: { "Content-Type": contentType },
      body,
    });

    const arrayBuf = await upstream.arrayBuffer();
    const respBase64 = Buffer.from(arrayBuf).toString("base64");

    const headers = { ...corsHeaders() };
    const upstreamCT = upstream.headers.get("content-type");
    if (upstreamCT) headers["Content-Type"] = upstreamCT;

    return {
      statusCode: upstream.status,
      headers,
      isBase64Encoded: true,
      body: respBase64,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: `Upstream error: ${err && err.message ? err.message : String(err)}`,
    };
  }
};
