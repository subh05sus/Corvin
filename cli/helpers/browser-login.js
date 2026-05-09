import http from "http";
import { randomBytes } from "crypto";
import { URL } from "url";
import open from "open";
import axios from "axios";

const SUCCESS_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Corvin CLI authorized</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;background:#0b0b0b;color:#f5f5f5;height:100vh;margin:0;display:flex;align-items:center;justify-content:center}.box{max-width:420px;padding:32px;text-align:center}.title{font-size:24px;font-weight:600;margin:0 0 12px}.body{color:#aaa;line-height:1.6}</style></head><body><div class="box"><div class="title">All set</div><p class="body">Your CLI is signed in. You can close this tab and return to your terminal.</p></div></body></html>`;
const ERROR_HTML = (msg) => `<!doctype html><html><head><meta charset="utf-8"><title>Corvin CLI</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;background:#0b0b0b;color:#f5f5f5;height:100vh;margin:0;display:flex;align-items:center;justify-content:center}.box{max-width:420px;padding:32px;text-align:center}.title{font-size:24px;font-weight:600;margin:0 0 12px;color:#ff6b6b}.body{color:#aaa;line-height:1.6}</style></head><body><div class="box"><div class="title">Sign-in failed</div><p class="body">${msg}</p></div></body></html>`;

const TIMEOUT_MS = 5 * 60 * 1000;

function generateState() {
  return randomBytes(16).toString("hex");
}

// Bind a one-shot loopback HTTP server. Returns immediately with `port` and a
// `callbackPromise` that settles once /callback is hit (resolves with { code }
// on success, rejects on error/timeout/state mismatch).
function startCallbackServer(state) {
  return new Promise((resolveSetup, rejectSetup) => {
    let resolveCallback;
    let rejectCallback;
    const callbackPromise = new Promise((res, rej) => {
      resolveCallback = res;
      rejectCallback = rej;
    });

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, "http://127.0.0.1");
        if (url.pathname !== "/callback") {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }

        const error = url.searchParams.get("error");
        if (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(ERROR_HTML(`Authorization denied: ${error}`));
          rejectCallback(new Error(`Authorization denied: ${error}`));
          return;
        }

        const receivedState = url.searchParams.get("state");
        const code = url.searchParams.get("code");

        if (receivedState !== state) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(ERROR_HTML("State mismatch."));
          rejectCallback(new Error("State mismatch — possible CSRF or stale browser tab"));
          return;
        }

        if (!code) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(ERROR_HTML("Missing code."));
          rejectCallback(new Error("Missing code in callback"));
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(SUCCESS_HTML);
        resolveCallback({ code });
      } catch (err) {
        rejectCallback(err);
      }
    });

    const timeoutId = setTimeout(() => {
      rejectCallback(new Error("Timed out waiting for browser callback (5 min)"));
    }, TIMEOUT_MS);
    callbackPromise.finally(() => clearTimeout(timeoutId)).catch(() => {});

    server.on("error", (err) => {
      rejectSetup(err);
      rejectCallback(err);
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      if (!port) {
        rejectSetup(new Error("Failed to bind loopback server"));
        return;
      }
      resolveSetup({ server, port, callbackPromise });
    });
  });
}

// Run the full browser login flow.
// Returns: { apiKey, email }
export async function browserLogin({ webDashboardUrl }) {
  const state = generateState();
  const { server, port, callbackPromise } = await startCallbackServer(state);

  try {
    const baseUrl = webDashboardUrl.replace(/\/$/, "");

    let authUrl;
    try {
      const resp = await axios.post(`${baseUrl}/api/cli/start`, {
        state,
        callbackPort: port,
      });
      authUrl = resp.data?.authUrl;
      if (!authUrl) throw new Error("Dashboard did not return an authUrl");
    } catch (err) {
      const detail = err.response?.data?.error || err.message || String(err);
      throw new Error(`Failed to start auth flow against ${baseUrl}: ${detail}`);
    }

    console.log(`\nOpening your browser to:\n  ${authUrl}\n`);
    console.log("If it doesn't open automatically, copy the URL above into your browser.\n");

    try {
      await open(authUrl);
    } catch {
      // Browser failed to launch — user can still copy the URL manually.
    }

    const { code } = await callbackPromise;

    let apiKey, email;
    try {
      const resp = await axios.post(`${baseUrl}/api/cli/exchange`, { state, code });
      apiKey = resp.data?.apiKey;
      email = resp.data?.email;
      if (!apiKey) throw new Error("Dashboard did not return an apiKey");
    } catch (err) {
      const detail = err.response?.data?.error || err.message || String(err);
      throw new Error(`Failed to exchange code: ${detail}`);
    }

    return { apiKey, email };
  } finally {
    try {
      server.close();
    } catch {
      // ignore
    }
  }
}
