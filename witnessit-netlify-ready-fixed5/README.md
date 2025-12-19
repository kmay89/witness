# WitnessIt (Netlify-ready)

## Contents
- index.html: WitnessIt UI (hash locally, create .ots, build evidence bundle)
- netlify/functions/ots-proxy.js: relay to OpenTimestamps calendars (fixes browser CORS)
- netlify.toml: routes /api/* to Netlify Functions

## Deploy (manual)
1) Netlify → Add new site → Deploy manually
2) Drag-drop the folder (or the ZIP)
3) Open your deployed URL and test stamping

## Notes
- The proxy allowlists known calendar hosts to avoid becoming an open proxy.
- Your file never uploads; only timestamp request bytes are relayed.


## Patch note
- Fixed a JavaScript syntax error caused by literal newlines inside a single-quoted string.


## Patch note
- Use direct Netlify Functions path (/.netlify/functions/ots-proxy) instead of /api redirect.
- Added debug logging and HTTP status error surfacing for relay calls.


## Patch note
- OpenTimestamps calendar stamping is now performed via the Netlify relay by passing a proxied calendar base URL into OpenTimestamps.stamp().


## Patch note
- Relay now uses path-style forwarding so OpenTimestamps can append /digest without breaking query parameters.


## Patch note
- Relay now encodes calendar base URL as base64url so OpenTimestamps can safely append `/digest` and Netlify can parse it.
