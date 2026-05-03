// lead-state.js — Lead progress tracker for ConciergePortal
// Stages: draft → qualified → sent → assigned → closed
// Rule: sequential only, no skipping without override flag

const LeadState = (() => {
  const STORAGE_KEY = 'cq_lead_state';
  const STAGES = ['draft', 'qualified', 'sent', 'assigned', 'closed'];

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) {}
  }

  function getLeadState(leadId) {
    return load()[leadId] || null;
  }

  function setStage(leadId, stage, meta = {}) {
    if (!STAGES.includes(stage)) {
      console.warn(`[LeadState] Unknown stage: "${stage}"`);
      return false;
    }

    const all = load();
    const current = all[leadId];
    const currentIndex = current ? STAGES.indexOf(current.stage) : -1;
    const nextIndex    = STAGES.indexOf(stage);

    // Block step-skipping unless override is explicit
    if (current && nextIndex !== currentIndex + 1 && !meta.override) {
      console.warn(`[LeadState] Blocked: "${current.stage}" → "${stage}" skips a step.`);
      return false;
    }

    all[leadId] = {
      stage,
      updatedAt: new Date().toISOString(),
      history: [
        ...(current?.history || []),
        { stage, ts: new Date().toISOString(), ...meta }
      ]
    };

    save(all);
    return true;
  }

  function allLeads()       { return load(); }
  function clearLead(id)    { const a = load(); delete a[id]; save(a); }

  return { getLeadState, setStage, allLeads, clearLead, STAGES };
})();

window.LeadState = LeadState;
