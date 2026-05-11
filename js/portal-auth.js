/**
 * portal-auth.js — LeanPeak Product Lab header auth UI
 *
 * Shows the signed-in user's email + sign-out button, or sign-in/sign-up
 * links that point to the app at app.leanpeakproductlab.com.
 *
 * Requires: Supabase JS CDN loaded before this script.
 * e.g. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */

const LP_SUPABASE_URL = "https://ulbfjoamggmgceaqtdht.supabase.co";
const LP_SUPABASE_KEY = "sb_publishable_BA_3F4IkxM7cqFlMyG24Wg_l91GnUON";
const LP_APP_ORIGIN = "https://app.leanpeakproductlab.com";

// ─── Supabase client (singleton) ──────────────────────────────────────────────
let _lpSb = null;
function getLPClient() {
  if (!_lpSb) {
    _lpSb = window.supabase.createClient(LP_SUPABASE_URL, LP_SUPABASE_KEY);
  }
  return _lpSb;
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
      <a href="${LP_APP_ORIGIN}/vpo/dashboard" class="lp-btn lp-btn-secondary" style="padding:0.4rem 1rem;font-size:0.8rem;">My workspace</a>
      <button id="lp-sign-out-btn" class="lp-btn lp-btn-secondary" style="padding:0.4rem 1rem;font-size:0.8rem;">Sign out</button>
    `;
    document.getElementById("lp-sign-out-btn")?.addEventListener("click", async () => {
      await getLPClient().auth.signOut();
    });
  } else {
    el.innerHTML = `
      <a href="${LP_APP_ORIGIN}/sign-in" class="lp-btn lp-btn-secondary" style="padding:0.4rem 1rem;font-size:0.8rem;">Sign in</a>
      <a href="${LP_APP_ORIGIN}/sign-up" class="lp-btn lp-btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;">Sign up</a>
    `;
  }
}

// ─── Initialise ───────────────────────────────────────────────────────────────
async function initPortalAuth() {
  const sb = getLPClient();

  const { data: { session } } = await sb.auth.getSession();
  updateHeaderUI(session);

  sb.onAuthStateChange((_event, session) => {
    updateHeaderUI(session);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortalAuth);
} else {
  initPortalAuth();
}
