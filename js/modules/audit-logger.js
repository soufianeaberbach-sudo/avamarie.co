/* ══════════════════════════════════════════════════════════════
   AUDIT LOGGER — RBAC & Universal Audit Trail
   Loaded before models-controller.js so CURRENT_USER and
   logAudit() are available as globals.
   ══════════════════════════════════════════════════════════════ */

/* ── Current User (read from sessionStorage, set at login) ───── */
const CURRENT_USER = (() => {
  try {
    const u = sessionStorage.getItem('erp_user');
    return u ? JSON.parse(u) : { name: 'Soufiane', role: 'Director', initials: 'SA' };
  } catch {
    return { name: 'Soufiane', role: 'Director', initials: 'SA' };
  }
})();

/* ── RBAC ─────────────────────────────────────────────────────── */
const FINANCIAL_ROLES = new Set(['Director', 'Owner', 'Admin']);
const canFinancials   = () => FINANCIAL_ROLES.has(CURRENT_USER.role);

/* ── Runtime audit store (in-memory, per session) ────────────── */
const RUNTIME_AUDIT = {};   // { modelId: [entry, ...] }

/**
 * logAudit — append one entry to RUNTIME_AUDIT and refresh the
 * audit pane in place if currently visible.
 */
function logAudit(modelId, action, detail, field = '', before = '', after = '') {
  const ts = new Date().toLocaleString('en-GB', {
    dateStyle: 'medium', timeStyle: 'short',
  });
  const entry = { ts, user: CURRENT_USER.name, action, detail, field, before, after };

  if (!RUNTIME_AUDIT[modelId]) RUNTIME_AUDIT[modelId] = [];
  RUNTIME_AUDIT[modelId].unshift(entry);

  const pane = document.getElementById('md-audit');
  if (pane && pane.classList.contains('active') && typeof renderMdAudit === 'function') {
    renderMdAudit(modelId);
  }

  if (typeof showToast === 'function') showToast(`Logged: ${action}`);
}

/**
 * getAuditEntries — merge runtime entries (newest first) with the
 * static seed data stored in MD[modelId].audit.
 */
function getAuditEntries(modelId) {
  const runtime = RUNTIME_AUDIT[modelId] || [];
  const stored  = (typeof MD !== 'undefined' && MD[modelId] && MD[modelId].audit) ? MD[modelId].audit : [];
  return [...runtime, ...stored];
}
