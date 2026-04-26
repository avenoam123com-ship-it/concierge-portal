/**
 * Lead Qualifier — ConciergePortal
 *
 * Architecture borrowed from Ruflo v3:
 *   TierRouter    ← enhanced-model-router.ts  (complexity score → tier 1/2/3)
 *   AgentRegistry ← agent-registry.ts         (register + dispatch by niche)
 *   BaseAgent     ← agent.ts IAgentConfig     (id, capabilities, status lifecycle)
 *
 * Tier 1 (<0.30) — instant rule-based, no LLM
 * Tier 2 (<0.60) — keyword signal analysis
 * Tier 3 (≥0.60) — full qualification (plug in Claude API here for production)
 */

// ─── Tier Router ─────────────────────────────────────────────────────────────

class TierRouter {
  constructor() {
    // mirrors Ruflo's complexityThresholds: haiku:0.3, sonnet:0.6
    this.thresholds = { tier2: 0.3, tier3: 0.6 };
  }

  analyze(lead) {
    const score = this._complexityScore(lead);
    const tier  = score < this.thresholds.tier2 ? 1
                : score < this.thresholds.tier3 ? 2
                : 3;
    return { tier, complexity: parseFloat(score.toFixed(3)) };
  }

  // 4-factor model from model-router.ts: lexical, semantic, scope, uncertainty
  _complexityScore(lead) {
    const note = (lead.note || '').toLowerCase();
    const lexical     = Math.min(note.length / 280, 1);                    // w: 0.25
    const urgency     = this._urgencyFactor(note, lead.priority);          // w: 0.35
    const specificity = this._specificityFactor(note, lead.niche);         // w: 0.25
    const uncertainty = this._uncertaintyFactor(note);                     // w: 0.15
    return (lexical * 0.25) + (urgency * 0.35) + (specificity * 0.25) + (uncertainty * 0.15);
  }

  _urgencyFactor(note, priority) {
    const keywords = ['דחוף', 'מיידי', 'urgent', 'asap', 'מועד', 'בית משפט', 'כאב חזק', 'מעצר'];
    const hits     = keywords.filter(k => note.includes(k)).length;
    const boost    = priority === 'זמינות' ? 0.35 : 0;
    return Math.min(hits * 0.3 + boost, 1);
  }

  _specificityFactor(note, niche) {
    const medTerms  = ['ניתוח', 'אונקולוג', 'קרדיולוג', 'mri', 'ct', 'ביופסיה',
                       'כימותרפיה', 'סקנד אופיניון', 'מחלה כרונית', 'נוירולוג', 'אורתופד'];
    const legTerms  = ['גירושין', 'ירושה', 'תביעה', 'חוזה', 'פלילי', 'עיזבון',
                       'נזיקין', 'פשיטת רגל', 'עבודה', 'מעסיק', 'שותפות'];
    const terms     = niche === 'medical' ? medTerms : legTerms;
    const hits      = terms.filter(t => note.includes(t)).length;
    return Math.min(hits * 0.22, 1);
  }

  _uncertaintyFactor(note) {
    const markers = ['לא בטוח', 'אולי', 'לא יודע', 'צריך ייעוץ', 'בירור', 'שאלה'];
    const hits    = markers.filter(k => note.includes(k)).length;
    return Math.min(hits * 0.35, 1);
  }
}

// ─── Base Agent ───────────────────────────────────────────────────────────────
// Mirrors Ruflo's IAgentConfig + status lifecycle: idle → active → idle

class BaseQualifierAgent {
  constructor({ id, name, niche, capabilities }) {
    this.id           = id;
    this.name         = name;
    this.niche        = niche;
    this.capabilities = capabilities;
    this.status       = 'idle';
    this.tasksCompleted = 0;
  }

  qualify(lead, tier) {
    this.status = 'active';
    const result = this._run(lead, tier);
    this.status = 'idle';
    this.tasksCompleted++;
    return result;
  }

  _run() { throw new Error('implement in subclass'); }

  _priorityLabel(signals) {
    const hotCount  = signals.filter(s => s.weight >= 0.85).length;
    const warmCount = signals.filter(s => s.weight >= 0.65 && s.weight < 0.85).length;
    const score     = Math.min((hotCount * 0.42) + (warmCount * 0.18) + (signals.length * 0.04), 1);
    return {
      score: parseFloat(score.toFixed(3)),
      label: score >= 0.60 ? 'hot' : score >= 0.30 ? 'warm' : 'cold'
    };
  }

  _tierNote(tier) {
    return ['', 'כללים בסיסיים (Tier 1)', 'ניתוח אותות (Tier 2)', 'הסמכה מלאה (Tier 3)'][tier];
  }
}

// ─── Medical Agent ────────────────────────────────────────────────────────────

class MedicalQualifierAgent extends BaseQualifierAgent {
  constructor() {
    super({
      id:           'medical-qualifier',
      name:         'Medical Lead Qualifier',
      niche:        'medical',
      capabilities: ['specialty-detection', 'urgency-assessment', 'specialist-matching']
    });

    this.signals = [
      { terms: ['ניתוח', 'אופרציה'],                              label: 'צורך ניתוחי',        weight: 0.92 },
      { terms: ['סקנד אופיניון', 'חוות דעת שנייה', 'חוות דעת'], label: 'חוות דעת שנייה',     weight: 0.82 },
      { terms: ['אונקולוג', 'סרטן', 'גידול', 'כימותרפיה', 'ביופסיה'], label: 'אונקולוגיה',   weight: 0.96 },
      { terms: ['קרדיולוג', 'לב', 'קצב לב', 'אנגיוגרפיה'],       label: 'קרדיולוגיה',        weight: 0.88 },
      { terms: ['נוירולוג', 'מוח', 'פרכוס', 'שבץ'],              label: 'נוירולוגיה',         weight: 0.88 },
      { terms: ['אורתופד', 'שבר', 'מפרק', 'ברך', 'כתף'],        label: 'אורתופדיה',          weight: 0.76 },
      { terms: ['ילד', 'ילדים', 'פדיאטר', 'תינוק'],              label: 'רפואת ילדים',        weight: 0.76 },
      { terms: ['מחלה כרונית', 'סוכרת', 'לחץ דם', 'אסתמה'],     label: 'מחלה כרונית',        weight: 0.66 },
      { terms: ['mri', 'ct', 'בדיקות', 'ממצאים'],                label: 'פרשנות בדיקות',      weight: 0.60 },
      { terms: ['דחוף', 'מיידי', 'כאב חזק'],                     label: 'דחיפות גבוהה',       weight: 0.90 },
    ];
  }

  _run(lead, tier) {
    const note     = (lead.note || '').toLowerCase();
    const detected = this.signals.filter(sig =>
      sig.terms.some(t => note.includes(t))
    );
    const { score, label } = this._priorityLabel(detected);

    return {
      lead_id:           `med-${Date.now()}`,
      niche:             'medical',
      tier,
      score,
      priority:          label,
      signals:           detected.map(s => s.label),
      recommended_match: this._buildMatch(detected, lead.priority, tier),
      routing_note:      this._tierNote(tier)
    };
  }

  _buildMatch(signals, priority, tier) {
    const isUrgent    = signals.some(s => s.weight >= 0.88);
    const needsOnsite = signals.some(s => ['צורך ניתוחי', 'אונקולוגיה', 'קרדיולוגיה'].includes(s.label));
    return {
      specialization: signals.length ? signals.map(s => s.label) : ['רופא מומחה כללי'],
      availability:   isUrgent || priority === 'זמינות' ? 'urgent' : 'normal',
      in_person:      needsOnsite,
      sla_hours:      isUrgent ? 4 : 24,
      match_count:    tier === 3 ? 1 : 2
    };
  }
}

// ─── Legal Agent ─────────────────────────────────────────────────────────────

class LegalQualifierAgent extends BaseQualifierAgent {
  constructor() {
    super({
      id:           'legal-qualifier',
      name:         'Legal Lead Qualifier',
      niche:        'legal',
      capabilities: ['case-type-detection', 'urgency-assessment', 'attorney-matching']
    });

    this.signals = [
      { terms: ['גירושין', 'גט', 'משמורת', 'מזונות'],              label: 'דיני משפחה',                weight: 0.86 },
      { terms: ['ירושה', 'עיזבון', 'צוואה'],                       label: 'דיני ירושה',                weight: 0.82 },
      { terms: ['תביעה', 'נזיקין', 'פיצויים'],                     label: 'נזיקין ותביעות',            weight: 0.86 },
      { terms: ['חוזה', 'הסכם', 'עסקה', 'שותפות'],                 label: 'דיני חוזים',                weight: 0.76 },
      { terms: ['פיטורין', 'עבודה', 'מעסיק', 'עובד'],              label: 'דיני עבודה',                weight: 0.80 },
      { terms: ['בית משפט', 'דיון', 'מועד', 'תאריך'],              label: 'הליך פעיל בבית משפט',       weight: 0.96 },
      { terms: ['נדל"ן', 'דירה', 'קנייה', 'מכירה', 'שכירות'],     label: 'עסקת נדל"ן',                weight: 0.76 },
      { terms: ['פלילי', 'מעצר', 'עצור', 'האשמה'],                 label: 'דיני פלילים',               weight: 0.96 },
      { terms: ['עסקי', 'חברה', 'תאגיד', 'מנהל'],                  label: 'דיני חברות',                weight: 0.72 },
      { terms: ['פשיטת רגל', 'חדלות פירעון', 'חובות', 'נושים'],   label: 'חדלות פירעון',              weight: 0.86 },
    ];
  }

  _run(lead, tier) {
    const note     = (lead.note || '').toLowerCase();
    const detected = this.signals.filter(sig =>
      sig.terms.some(t => note.includes(t))
    );
    const { score, label } = this._priorityLabel(detected);

    return {
      lead_id:           `leg-${Date.now()}`,
      niche:             'legal',
      tier,
      score,
      priority:          label,
      signals:           detected.map(s => s.label),
      recommended_match: this._buildMatch(detected, lead.priority, tier),
      routing_note:      this._tierNote(tier)
    };
  }

  _buildMatch(signals, priority, tier) {
    const isUrgent    = signals.some(s => s.weight >= 0.90);
    const needsOnsite = signals.some(s =>
      ['הליך פעיל בבית משפט', 'דיני פלילים'].includes(s.label)
    );
    return {
      specialization: signals.length ? signals.map(s => s.label) : ['עו"ד אזרחי כללי'],
      availability:   isUrgent || priority === 'זמינות' ? 'urgent' : 'normal',
      in_person:      needsOnsite,
      sla_hours:      isUrgent ? 2 : 24,
      match_count:    tier === 3 ? 1 : 2
    };
  }
}

// ─── Agent Registry ───────────────────────────────────────────────────────────
// Mirrors Ruflo's agent-registry.ts: register agents, dispatch by key

class AgentRegistry {
  constructor() { this._agents = new Map(); }
  register(agent) { this._agents.set(agent.niche, agent); }
  get(niche) {
    const a = this._agents.get(niche);
    if (!a) throw new Error(`No agent registered for niche: ${niche}`);
    return a;
  }
}

// ─── Coordinator ─────────────────────────────────────────────────────────────
// Mirrors Ruflo's hierarchical-coordinator: route → dispatch → return result

class LeadQualifier {
  constructor() {
    this.router   = new TierRouter();
    this.registry = new AgentRegistry();
    this.registry.register(new MedicalQualifierAgent());
    this.registry.register(new LegalQualifierAgent());
  }

  qualify(lead) {
    if (!['medical', 'legal'].includes(lead.niche)) {
      return { tier: 0, score: 0, priority: 'unhandled', signals: [], recommended_match: { sla_hours: 24 } };
    }
    const { tier, complexity } = this.router.analyze(lead);
    const result = this.registry.get(lead.niche).qualify(lead, tier);
    return { ...result, complexity_score: complexity };
  }
}

window.LeadQualifier = new LeadQualifier();
