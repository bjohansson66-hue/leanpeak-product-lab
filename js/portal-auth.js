/**
 * portal-auth.js — LeanPeak Product Lab unified authentication
 *
 * Handles sign-in/sign-up state for the entire static site and
 * broadcasts the Supabase session to embedded VPO iframes via postMessage.
 *
 * Requires: Supabase JS CDN loaded before this script.
 * e.g. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */

const LP_SUPABASE_URL = "https://ulbfjoamggmgceaqtdht.supabase.co";
const LP_SUPABASE_KEY = "sb_publishable_BA_3F4IkxM7cqFlMyG24Wg_l91GnUON";

// Target origin for the embedded VPO app (Next.js on Vercel)
const LP_VPO_ORIGIN = "https://nextjs-with-supabase-mbpb-bengts-projects-1f26266d.vercel.app";

// ─── Supabase client (singleton) ──────────────────────────────────────────────
let _lpSb = null;
function getLPClient() {
  if (!_lpSb) {
    _lpSb = window.supabase.createClient(LP_SUPABASE_URL, LP_SUPABASE_KEY);
  }
  return _lpSb;
}

// ─── Broadcast session to VPO iframe ──────────────────────────────────────────
function broadcastSession(session) {
  const frame = document.getElementById("vpo-app-frame");
  if (frame && frame.contentWindow) {
    frame.contentWindow.postMessage(
      { type: "lp:session", session: session ?? null },
      LP_VPO_ORIGIN
    );
  }
}

// ─── Update header auth UI ─────────────────────────────────────────────────────
function updateHeaderUI(session) {
  const el = document.getElementById("lp-header-auth");
  if (!el) return;

  if (session?.user) {
    const email = session.user.email || "";
    const short = email.length > 22 ? email.slice(0, 20) + "…" : email;
    el.innerHTML = `
      <span style="font-size:0.8rem;color:var(--lp-color-text-muted);margin-right:0.75rem;">${short}</span>
      <button id="lp-sign-out-btn" class="lp-btn lp-btn-secondary" style="padding:0.4rem 1rem;font-size:0.8rem;">Sign out</button>
    `;
    document.getElementById("lp-sign-out-btn")?.addEventListener("click", async () => {
      await getLPClient().auth.signOut();
    });
  } else {
    el.innerHTML = `
      <a href="/sign-in.html" class="lp-btn lp-btn-secondary" style="padding:0.4rem 1rem;font-size:0.8rem;">Sign in</a>
      <a href="/sign-up.html" class="lp-btn lp-btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;">Sign up free</a>
    `;
  }
}

// ─── Handle messages from the VPO iframe ──────────────────────────────────────
async function handleIframeMessage(event) {
  if (event.origin !== LP_VPO_ORIGIN) return;
  if (event.data?.type === "lp:request-session") {
    const { data: { session } } = await getLPClient().auth.getSession();
    broadcastSession(session);
  }
}

// ─── Initialise ───────────────────────────────────────────────────────────────
async function initPortalAuth() {
  const sb = getLPClient();

  // Reflect current session in UI
  const { data: { session } } = await sb.auth.getSession();
  updateHeaderUI(session);

  // Listen for iframe session requests
  window.addEventListener("message", handleIframeMessage);

  // React to auth changes (sign-in / sign-out from any tab)
  sb.onAuthStateChange((event, session) => {
    updateHeaderUI(session);
    broadcastSession(session);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortalAuth);
} else {
  initPortalAuth();
}
