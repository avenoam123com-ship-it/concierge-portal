// cities.js — City config for targeted landing pages
// Usage: city.html?c=tlv&niche=legal

const CITIES = {
  tlv:  { name: 'תל אביב',       region: 'גוש דן',      area: 'גוש דן',      nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  jlm:  { name: 'ירושלים',       region: 'ירושלים',     area: 'ירושלים',     nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  hfa:  { name: 'חיפה',          region: 'חיפה והצפון', area: 'חיפה והצפון', nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  bsv:  { name: 'באר שבע',       region: 'דרום',        area: 'דרום',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  rg:   { name: 'רמת גן',        region: 'גוש דן',      area: 'גוש דן',      nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  pt:   { name: 'פתח תקווה',     region: 'גוש דן',      area: 'גוש דן',      nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  rl:   { name: 'ראשון לציון',   region: 'גוש דן',      area: 'גוש דן',      nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  net:  { name: 'נתניה',         region: 'שרון ושפלה',  area: 'שרון',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  asd:  { name: 'אשדוד',         region: 'דרום',        area: 'דרום',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  naza: { name: 'נצרת',          region: 'חיפה והצפון', area: 'צפון',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  hd:   { name: 'חדרה',          region: 'שרון ושפלה',  area: 'שרון',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  kfar: { name: 'כפר סבא',       region: 'שרון ושפלה',  area: 'שרון',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  rzn:  { name: 'רחובות',        region: 'שפלה',        area: 'שפלה',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
  asq:  { name: 'אשקלון',        region: 'דרום',        area: 'דרום',        nicheMap: { legal: 'עורך דין', medical: 'רופא', realestate: 'מתווך' } },
};

const NICHES = {
  legal:      { label: 'משפטים', profession: 'עורך דין', sub: 'עו"ד אזרחי, עסקי, משפחה' },
  medical:    { label: 'רפואה',  profession: 'רופא מומחה', sub: 'מומחה, סקנד אופיניון, תהליך' },
  realestate: { label: 'נדל"ן', profession: 'מתווך',     sub: 'קנייה, מכירה, השכרה' },
};

window.CITIES = CITIES;
window.NICHES  = NICHES;
