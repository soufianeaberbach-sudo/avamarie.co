/* ══════════════════════════════════════════════════════════════
   MODELS CONTROLLER
   Depends on: audit-logger.js (CURRENT_USER, fv, logAudit,
   getAuditEntries) and core.js (STATUS_CLASS, navTo, showToast,
   openPrintWin, buildTable, loadView)
   ══════════════════════════════════════════════════════════════ */

/* ── Models list data ─────────────────────────────────────────── */
const MODELS = [
  {
    id:'AM-0045', name:'Robe Satin Longue',
    client:'ASOS', ref:'ASOS-ST-44521',
    cat:'Robe', season:'SS26', rev:4, status:'In Production',
    cost:19.29, updated:'28 Mar 2026', updatedBy:'Soufiane',
    thumb:'https://res.cloudinary.com/ava-marie/image/upload/v1/erp/AM-0045-thumb.jpg',
    desc:'Long satin duchess dress with fitted silhouette. Invisible zip at centre back. Full poly lining on bodice.',
  },
  {
    id:'AM-0052', name:'Crop Top Jersey',
    client:'PrettyLittleThing', ref:'PLT-CR-8821',
    cat:'Top', season:'AW26', rev:2, status:'Sample',
    cost:8.00, updated:'02 Apr 2026', updatedBy:'Karim',
    thumb:null,
    desc:'Fitted jersey crop top with elasticated hem. Round neckline, short puff sleeves. 95% poly, 5% elastane.',
  },
  {
    id:'AM-0039', name:'Wide Leg Linen Trousers',
    client:'River Island', ref:'RI-PL-3301',
    cat:'Pantalon', season:'SS26', rev:1, status:'Completed',
    cost:11.22, updated:'15 Jan 2026', updatedBy:'Ahmed',
    thumb:null,
    desc:'Relaxed wide-leg trouser in linen-viscose blend. Side pockets, concealed hook bar waist, turn-up hem.',
  },
  {
    id:'AM-0060', name:'Pleated Midi Skirt',
    client:'ASOS', ref:'ASOS-JP-9933',
    cat:'Jupe', season:'SS26', rev:1, status:'Draft',
    cost:null, updated:'05 Apr 2026', updatedBy:'Fatima',
    thumb:null,
    desc:'Knife-pleated midi skirt, satin finish. Elasticated back waistband. Pending fabric and costing sign-off.',
  },
  {
    id:'AM-0061', name:'Wrap Blouse Viscose',
    client:'PrettyLittleThing', ref:'PLT-WB-1105',
    cat:'Top', season:'AW26', rev:3, status:'Confirmed',
    cost:10.12, updated:'19 Mar 2026', updatedBy:'Soufiane',
    thumb:null,
    desc:'Wrap-front blouse in 100% viscose challis. Long sleeves with button cuff, self-tie belt, V neckline.',
  },
];

/* ── Model detail data ────────────────────────────────────────── */
const MD = {
  'AM-0045': {
    images: [],   /* populated from Cloudinary or uploads */

    bom: [
      {
        title: 'Main Fabric',
        rows: [
          { component:'Main Fabric',  desc:'Satin duchess 100% poly, ivory',  supplier:'Duchesse-Satin SA', unit:'m',   qty:'1.85', unitCost:'3.20' },
          { component:'Lining',       desc:'Poly lining, ivory',               supplier:'Poly-Tissu MA',     unit:'m',   qty:'0.95', unitCost:'0.85' },
        ],
      },
      {
        title: 'Trims & Notions',
        rows: [
          { component:'Zip',         desc:'YKK concealed 60 cm',           supplier:'YKK Morocco',   unit:'pcs', qty:'1', unitCost:'0.63' },
          { component:'Hook & Bar',  desc:'Waist hook & bar, nickel',      supplier:'Métal Plus',    unit:'pcs', qty:'1', unitCost:'0.08' },
        ],
      },
      {
        title: 'Packaging',
        rows: [
          { component:'Label Set',   desc:'Brand + care + size labels',    supplier:'Etiquettes SA', unit:'set', qty:'1', unitCost:'0.22' },
          { component:'Polybag',     desc:'50 × 70 cm, self-seal',         supplier:'PackPro',       unit:'pcs', qty:'1', unitCost:'0.12' },
          { component:'Hanger',      desc:'Velvet non-slip',               supplier:'HangMa',        unit:'pcs', qty:'1', unitCost:'0.18' },
        ],
      },
    ],

    gamme: [
      { op:'010', name:'Mark & Bundle',                    machine:'MANUAL',   level:'★',    smv:'2.5' },
      { op:'020', name:'Shoulder seams (× 2)',             machine:'OVL-5T',   level:'★★',   smv:'1.8' },
      { op:'030', name:'Side seams + lining side seams',  machine:'OVL-5T',   level:'★★',   smv:'2.2' },
      { op:'040', name:'Lining attachment at neckline',   machine:'SNLS',     level:'★★★',  smv:'4.5' },
      { op:'050', name:'CB zip insertion (YKK 60 cm)',     machine:'SNLS',     level:'★★★★', smv:'6.2' },
      { op:'060', name:'Hem — shell + lining',            machine:'BLIND',    level:'★★★',  smv:'3.8' },
      { op:'070', name:'Final steam press',               machine:'STEAM',    level:'★★',   smv:'2.1' },
      { op:'080', name:'QC inspection + tagging',         machine:'MANUAL',   level:'★★',   smv:'1.5' },
    ],

    pom: [
      { point:'Bust (at underarm)',           XS:'88',  S:'92',  M:'96',  L:'100', XL:'106' },
      { point:'Waist',                        XS:'72',  S:'76',  M:'80',  L:'84',  XL:'90'  },
      { point:'Hip (at 18 cm below waist)',   XS:'94',  S:'98',  M:'102', L:'106', XL:'112' },
      { point:'Centre front length',          XS:'120', S:'121', M:'122', L:'123', XL:'124' },
      { point:'Shoulder width',               XS:'37',  S:'38',  M:'39',  L:'40',  XL:'41'  },
      { point:'Sleeve length (CB to cuff)',   XS:'62',  S:'62.5',M:'63',  L:'63.5',XL:'64'  },
      { point:'Hem circumference',            XS:'140', S:'144', M:'148', L:'152', XL:'158' },
    ],

    qcApproved: false,
    defects: [
      { date:'28 Jan 2026', type:'Zip Placket Visible',    detail:'Top-stitching not concealed. Recut.',       status:'resolved'  },
      { date:'20 Feb 2026', type:'Neckline Height',        detail:'Sits 1.5 cm too low — raised in Rev.2.',    status:'resolved'  },
      { date:'10 Mar 2026', type:'Raw Edge at Hem Lining', detail:'Overlock missed on 3 units in size set.',   status:'recurring' },
    ],

    revisions: [
      {
        rev:1, date:'15 Jan 2026', author:'Fatima', latest:false,
        summary:'Initial tech pack received. Fabric spec confirmed as 100% poly satin duchess. Basic silhouette drafted and costed.',
        changes:['Tech pack uploaded — AM-0045-TP-r1.pdf','Fabric confirmed: satin duchess 100% poly','Initial SMV estimate: 22.4 min','BOM drafted — 8 components'],
      },
      {
        rev:2, date:'04 Feb 2026', author:'Soufiane', latest:false,
        summary:'Neckline adjusted from square to subtle V following proto session. Sleeve length extended +2 cm per fit notes.',
        changes:['Neckline: square → subtle V (−1.5 cm depth)','Sleeve length +2 cm','SMV revised to 24.2 min','BOM updated — fabric consumption +0.06 m'],
      },
      {
        rev:3, date:'18 Feb 2026', author:'Karim', latest:false,
        summary:'Back vent removed at client request. Zip upgraded from generic to YKK concealed 60 cm.',
        changes:['Back vent removed','Zip: generic invisible → YKK concealed 60 cm','BOM updated — zip unit cost +€0.18','Seam allowance at CB zip increased to 1.5 cm'],
      },
      {
        rev:4, date:'28 Mar 2026', author:'Soufiane', latest:true,
        summary:'Size grading finalised across XS–XL. PP sample approved by ASOS buyer. Production go-ahead issued.',
        changes:['Size grading finalised XS–XL (base M)','PP sample approved — ASOS ref PPAM0045-04','Final SMV locked: 24.6 min','Status changed → In Production'],
      },
    ],

    samples: [
      { type:'Proto',       cssClass:'s-rejected', badgeClass:'sb-rejected', statusLabel:'Rejected',              rev:1, date:'28 Jan 2026', feedback:'Bust ease 4 cm too tight in size M. Zip placket visible — top-stitching not concealed. Neckline sits 1.5 cm too low. Full recut required before next submission.' },
      { type:'Fit Sample',  cssClass:'s-changes',  badgeClass:'sb-changes',  statusLabel:'Approved with Changes',  rev:2, date:'20 Feb 2026', feedback:'Good improvement overall. Approved conditional on: neckline raised 1 cm, sleeve shortened 1.5 cm, seam allowance at CB zip increased to 1.5 cm. Resubmit corrected size set.' },
      { type:'Size Set',    cssClass:'s-pending',  badgeClass:'sb-pending',  statusLabel:'Pending',                rev:3, date:'10 Mar 2026', feedback:'Submitted to ASOS buyer 10 Mar 2026. All sizes graded from approved Fit Sample (base M). Awaiting client sign-off — chased 24 Mar, response pending.' },
      { type:'PP Sample',   cssClass:'s-noprod',   badgeClass:'sb-noprod',   statusLabel:'Not Produced',           rev:4, date:null,          feedback:'' },
      { type:'TOP Sample',  cssClass:'s-noprod',   badgeClass:'sb-noprod',   statusLabel:'Not Produced',           rev:4, date:null,          feedback:'' },
    ],

    orders: [
      { po:'ASOS-PO-44521-A', issued:'01 Apr 2026', delivery:'15 May 2026', qty:2400, sizes:'XS×240 / S×540 / M×720 / L×540 / XL×360', status:'In Production', value:46296 },
      { po:'ASOS-PO-44521-B', issued:'05 Apr 2026', delivery:'30 Jun 2026', qty:800,  sizes:'S×200 / M×280 / L×200 / XL×120',          status:'Confirmed',     value:15432 },
    ],

    audit: [
      { ts:'28 Mar 2026, 14:32', user:'Soufiane', action:'STATUS CHANGE', detail:'Status changed: Confirmed → In Production following PP sign-off' },
      { ts:'28 Mar 2026, 14:28', user:'Soufiane', action:'APPROVED',      detail:'Rev.4 PP sample approved — ASOS buyer ref PPAM0045-04' },
      { ts:'18 Feb 2026, 10:15', user:'Karim',    action:'REVISION',      detail:'Rev.3 created — back vent removed, zip upgraded to YKK concealed 60 cm' },
      { ts:'15 Feb 2026, 16:42', user:'Ahmed',    action:'UPLOADED',      detail:'Tech pack Rev.3 uploaded — AM-0045-TP-r3.pdf (2.4 MB)' },
      { ts:'04 Feb 2026, 09:20', user:'Soufiane', action:'REVISION',      detail:'Rev.2 created — neckline adjusted to subtle V, sleeve +2 cm, SMV revised to 24.2 min' },
      { ts:'28 Jan 2026, 11:55', user:'Soufiane', action:'REJECTED',      detail:'Proto sample (Rev.1) rejected — bust ease 4 cm too tight, zip placket visible, neckline 1.5 cm low' },
      { ts:'15 Jan 2026, 08:00', user:'Fatima',   action:'CREATED',       detail:'Model AM-0045 created — initial tech pack uploaded, BOM drafted (8 components)' },
    ],
  },
};

/* ── Machine code options ─────────────────────────────────────── */
const MACHINE_CODES = ['SNLS','DNLS','OVL-3T','OVL-4T','OVL-5T','CVR','FLAT','BLIND','BART','BTHL','BTTN','STEAM','MANUAL'];

/* ── Render models list ───────────────────────────────────────── */
function renderModels(data) {
  const tbody = document.getElementById('m-tbody');
  const empty = document.getElementById('m-empty');
  const count = document.getElementById('m-count');
  if (!tbody) return;

  count.textContent = `${data.length} model${data.length !== 1 ? 's' : ''}`;

  /* KPI strip */
  const kpiEl = document.getElementById('m-kpi-grid');
  if (kpiEl) {
    const all = MODELS;
    const inProd  = all.filter(m => m.status === 'In Production').length;
    const samples = all.filter(m => m.status === 'Sample').length;
    const costed  = all.filter(m => m.cost !== null);
    const avgCost = costed.length ? (costed.reduce((s,m) => s+m.cost,0)/costed.length) : 0;
    kpiEl.innerHTML = [
      { label:'Total Models',   value: all.length,          sub:'' },
      { label:'In Production',  value: inProd,              sub:'active orders' },
      { label:'In Sample',      value: samples,             sub:'awaiting approval' },
      { label:'Avg Cost / pc',  value: fv(avgCost, v => '€'+v.toFixed(2)), sub:'materials only' },
    ].map(k => `
      <div class="kpi-card">
        <div class="kpi-eyebrow">${k.label}</div>
        <div class="kpi-num gold">${k.value}</div>
        ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
      </div>`).join('');
  }

  if (!data.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    lucide.createIcons();
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(m => {
    const thumb = m.thumb
      ? `<img class="model-thumb" src="${m.thumb}" alt="${m.id}">`
      : `<div class="model-thumb-placeholder">${m.cat.substring(0,3).toUpperCase()}</div>`;
    const costCell = m.cost !== null
      ? fv(m.cost, v => '€'+v.toFixed(2))
      : '<span style="color:var(--muted2)">—</span>';
    return `
      <tr class="tbl-row" onclick="openModel('${m.id}')">
        <td>${thumb}</td>
        <td><span class="model-id">${m.id}</span></td>
        <td class="fw-600">${m.name}</td>
        <td>${m.client}</td>
        <td class="ref-cell">${m.ref}</td>
        <td>${m.cat}</td>
        <td>${m.season || '—'}</td>
        <td style="text-align:center" class="fw-600">${m.rev}</td>
        <td><span class="badge ${STATUS_CLASS[m.status]||''}">${m.status}</span></td>
        <td class="cost-col" style="text-align:right">${costCell}</td>
        <td class="muted-cell">${m.updated}</td>
      </tr>`;
  }).join('');
}

/* ── Filter ───────────────────────────────────────────────────── */
function filterModels() {
  const q      = document.getElementById('m-search').value.toLowerCase().trim();
  const client = document.getElementById('m-client').value;
  const status = document.getElementById('m-status').value;
  const cat    = document.getElementById('m-cat').value;
  const result = MODELS.filter(m => {
    if (q && !m.id.toLowerCase().includes(q) &&
             !m.name.toLowerCase().includes(q) &&
             !m.ref.toLowerCase().includes(q)  &&
             !m.client.toLowerCase().includes(q)) return false;
    if (client && m.client !== client) return false;
    if (status && m.status !== status) return false;
    if (cat    && m.cat    !== cat)    return false;
    return true;
  });
  renderModels(result);
}

/* ── Export (print window) ────────────────────────────────────── */
function exportModelsCSV() {
  const q      = document.getElementById('m-search').value.toLowerCase().trim();
  const client = document.getElementById('m-client').value;
  const status = document.getElementById('m-status').value;
  const cat    = document.getElementById('m-cat').value;
  const data = MODELS.filter(m => {
    if (q && !m.id.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q) && !m.ref.toLowerCase().includes(q)) return false;
    if (client && m.client !== client) return false;
    if (status && m.status !== status) return false;
    if (cat    && m.cat    !== cat)    return false;
    return true;
  });
  const filters = [
    q ? `Search: "${q}"` : '', client ? `Client: ${client}` : '',
    status ? `Status: ${status}` : '', cat ? `Category: ${cat}` : '',
  ].filter(Boolean).join(' · ') || 'All models';
  const rows = data.map(m => [
    `<code>${m.id}</code>`, m.name, m.client, m.ref, m.cat, m.season||'—',
    `Rev ${m.rev}`, m.status,
    m.cost !== null ? (canFinancials() ? `€ ${m.cost.toFixed(2)}` : '••••') : '—',
    m.updated,
  ]);
  openPrintWin(
    'Models',
    `${data.length} model${data.length!==1?'s':''} · ${filters}`,
    buildTable(['Model #','Name','Client','Client Ref','Category','Season','Revision','Status','Cost/pc','Updated'], rows)
  );
  showToast(`Opened ${data.length} model${data.length!==1?'s':''} for print / PDF`);
}

/* ── New Model modal ──────────────────────────────────────────── */
function showNewModelModal() {
  document.getElementById('new-model-modal').style.display = 'flex';
}
function closeNewModelModal() {
  document.getElementById('new-model-modal').style.display = 'none';
}
function saveNewModel() {
  const name   = document.getElementById('nm-name').value.trim();
  const cat    = document.getElementById('nm-cat').value;
  const client = document.getElementById('nm-client').value;
  if (!name || !cat || !client) { showToast('Please fill in Name, Category, and Client.'); return; }
  const season = document.getElementById('nm-season').value;
  const ref    = document.getElementById('nm-ref').value.trim();
  const desc   = document.getElementById('nm-desc').value.trim();
  const newId  = 'AM-' + String(Math.max(...MODELS.map(m => parseInt(m.id.split('-')[1]))) + 1).padStart(4,'0');
  const today  = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  MODELS.unshift({ id:newId, name, client, ref:ref||`${client.substring(0,3).toUpperCase()}-NEW`, cat, season, rev:1, status:'Draft', cost:null, updated:today, updatedBy:CURRENT_USER.name, thumb:null, desc:desc||'New model.' });
  logAudit(newId, 'CREATED', `Model ${newId} created — ${name}`);
  closeNewModelModal();
  renderModels(MODELS);
  showToast(`Model ${newId} created`);
  lucide.createIcons();
}

/* ── Open model detail ────────────────────────────────────────── */
async function openModel(id) {
  await loadView('model-detail');
  const m = MODELS.find(x => x.id === id);
  if (!m) return;

  document.getElementById('sec-models').classList.remove('active');
  const det = document.getElementById('sec-model-detail');
  det.classList.add('active');

  /* reset to first tab */
  document.querySelectorAll('.md-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.md-tab[data-pane="md-overview"]').classList.add('active');
  document.querySelectorAll('.md-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('md-overview').classList.add('active');

  document.getElementById('tb-title').textContent = m.id + ' — ' + m.name;
  document.getElementById('tb-icon').innerHTML = '<i data-lucide="shirt"></i>';
  document.getElementById('content').scrollTop = 0;

  /* gallery */
  renderMdGallery(m);

  /* header card */
  const sm = STATUS_CLASS[m.status] || '';
  document.getElementById('md-header').innerHTML = `
    <div>
      <div class="md-id-badge">${m.id}</div>
      <div class="md-model-name">${m.name}</div>
      <div class="md-meta-row">
        <div><div class="md-meta-label">Client</div><div class="md-meta-value">${m.client}</div></div>
        <div><div class="md-meta-label">Client Ref</div><div class="md-meta-value" style="font-family:'Courier New',monospace;font-size:.78rem">${m.ref}</div></div>
        <div><div class="md-meta-label">Category</div><div class="md-meta-value">${m.cat}</div></div>
        <div><div class="md-meta-label">Season</div><div class="md-meta-value">${m.season||'—'}</div></div>
        <div><div class="md-meta-label">Revision</div><div class="md-meta-value">Rev.${m.rev}</div></div>
        <div><div class="md-meta-label">Status</div><div class="md-meta-value"><span class="badge ${sm}">${m.status}</span></div></div>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="md-cost-big">${fv(m.cost, v => '€'+v.toFixed(2), '—')}</div>
      <div class="md-cost-sub">cost / piece</div>
    </div>`;

  renderMdOverview(m);
  renderMdBom(m);
  renderMdGamme(m);
  renderMdPom(m);
  renderMdRevisions(id);
  renderMdSamples(id);
  renderMdOrders(id);
  renderMdAudit(id);
  lucide.createIcons();
}

/* Helper for fv with fallback */
function fv(val, fmt, fallback) {
  if (val === null || val === undefined) {
    return fallback !== undefined ? fallback : (canFinancials() ? '—' : '<span class="rbac-masked">••••</span>');
  }
  if (!canFinancials()) return '<span class="rbac-masked" title="Restricted — contact Director or Admin">••••</span>';
  return fmt ? fmt(val) : val;
}

function closeModel() { navTo('models'); }

function setMdTab(btn) {
  document.querySelectorAll('.md-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const pane = btn.dataset.pane;
  document.querySelectorAll('.md-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(pane).classList.add('active');
}

function emptyPane(msg) {
  return `<div class="sc" style="padding:52px 0;text-align:center">
    <p style="font-size:.82rem;color:var(--muted)">${msg}</p>
  </div>`;
}

/* ── Gallery ──────────────────────────────────────────────────── */
function renderMdGallery(m) {
  const wrap = document.getElementById('md-gallery-wrap');
  if (!wrap) return;
  const imgs = (MD[m.id] && MD[m.id].images && MD[m.id].images.length) ? MD[m.id].images : (m.thumb ? [m.thumb] : []);
  if (!imgs.length) { wrap.innerHTML = ''; return; }
  const thumbsHtml = imgs.map((src, i) => `
    <img class="mg-thumb${i===0?' active':''}" src="${src}" alt="Image ${i+1}"
      onclick="mgSelectThumb(this,'${src}')">`).join('');
  wrap.innerHTML = `
    <div class="mg-wrap">
      <div class="mg-main-col">
        <img class="mg-main" id="mg-main-img" src="${imgs[0]}" alt="${m.name}">
      </div>
      ${imgs.length > 1 ? `<div class="mg-thumb-col">${thumbsHtml}</div>` : ''}
    </div>`;
}
function mgSelectThumb(el, src) {
  document.getElementById('mg-main-img').src = src;
  document.querySelectorAll('.mg-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

/* ── Overview ─────────────────────────────────────────────────── */
function renderMdOverview(m) {
  document.getElementById('md-overview').innerHTML = `
    <div class="sc">
      <div class="sc-head"><span class="sc-title">Description</span></div>
      <div style="padding:18px 22px;font-size:.85rem;color:var(--text);line-height:1.8">${m.desc}</div>
    </div>
    <div class="sc">
      <div class="sc-head"><span class="sc-title">Quick Facts</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0">
        ${[
          ['Current Revision', 'Rev.' + m.rev],
          ['Season',           m.season || '—'],
          ['Last Updated',     m.updated],
          ['Cost / Piece',     fv(m.cost, v => '€'+v.toFixed(2), '—')],
        ].map(([l,v]) => `
          <div style="padding:16px 22px;border-right:1px solid #F0EDE8">
            <div style="font-size:.6rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">${l}</div>
            <div style="font-size:.88rem;font-weight:600;color:var(--text)">${v}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ── BOM (CRUD) ───────────────────────────────────────────────── */
function renderMdBom(m) {
  const d = MD[m.id];
  if (!d || !d.bom) { document.getElementById('md-bom').innerHTML = emptyPane('No BOM data available for this model.'); return; }

  const allRows = d.bom.flatMap(s => s.rows);
  const grandTotal = allRows.reduce((sum, r) => sum + (parseFloat(r.qty)||0)*(parseFloat(r.unitCost)||0), 0);

  let tableBody = '';
  d.bom.forEach((section, si) => {
    tableBody += `<tr><td colspan="8" class="bom-section-hdr">${section.title}</td></tr>`;
    section.rows.forEach((r, ri) => {
      const tot = ((parseFloat(r.qty)||0) * (parseFloat(r.unitCost)||0)).toFixed(2);
      tableBody += `<tr class="tbl-row" data-si="${si}" data-ri="${ri}">
        <td><input class="bom-inp" value="${r.component}" oninput="bomCell('${m.id}',${si},${ri},'component',this.value)"></td>
        <td><input class="bom-inp" value="${r.desc}"      oninput="bomCell('${m.id}',${si},${ri},'desc',this.value)"></td>
        <td><input class="bom-inp" value="${r.supplier}"  oninput="bomCell('${m.id}',${si},${ri},'supplier',this.value)"></td>
        <td style="text-align:center"><input class="bom-inp" style="width:40px;text-align:center" value="${r.unit}" oninput="bomCell('${m.id}',${si},${ri},'unit',this.value)"></td>
        <td style="text-align:right"><input class="bom-inp num" style="width:55px" value="${r.qty}" oninput="bomRecalc('${m.id}',${si},${ri},'qty',this)"></td>
        <td style="text-align:right">${fv(null, null)}${canFinancials() ? `<input class="bom-inp num" style="width:55px" value="${r.unitCost}" oninput="bomRecalc('${m.id}',${si},${ri},'unitCost',this)">` : '<span class="rbac-masked">••••</span>'}</td>
        <td class="cost-cell" id="bom-tot-${si}-${ri}">${fv(parseFloat(tot), v => '€'+v.toFixed(2))}</td>
        <td><button class="bom-del" onclick="bomDeleteRow('${m.id}',${si},${ri})" title="Remove row">×</button></td>
      </tr>`;
    });
    tableBody += `<tr><td colspan="8" style="padding:4px 16px">
      <button class="bom-add-btn" onclick="bomAddRow('${m.id}',${si})">+ Add row to ${section.title}</button>
    </td></tr>`;
  });

  document.getElementById('md-bom').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Bill of Materials — Rev.${m.rev} · ${allRows.length} components</span>
        <span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">${fv(grandTotal, v => '€'+v.toFixed(2))}/pc</span>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr>
            <th>Component</th><th>Description</th><th>Supplier</th>
            <th style="text-align:center">Unit</th><th style="text-align:right">Qty</th>
            <th style="text-align:right">Unit €</th><th style="text-align:right">Total €</th><th style="width:30px"></th>
          </tr></thead>
          <tbody>${tableBody}
            <tr style="background:#FFFDF7">
              <td colspan="6" style="padding:12px 20px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Materials Total</td>
              <td class="cost-cell" id="bom-grand-total" style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">${fv(grandTotal, v => '€'+v.toFixed(2))}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function bomCell(id, si, ri, field, val) {
  if (MD[id]) MD[id].bom[si].rows[ri][field] = val;
}
function bomRecalc(id, si, ri, field, input) {
  bomCell(id, si, ri, field, input.value);
  if (!MD[id]) return;
  const r = MD[id].bom[si].rows[ri];
  const tot = ((parseFloat(r.qty)||0) * (parseFloat(r.unitCost)||0));
  const totEl = document.getElementById(`bom-tot-${si}-${ri}`);
  if (totEl) totEl.innerHTML = fv(tot, v => '€'+v.toFixed(2));
  const allRows = MD[id].bom.flatMap(s => s.rows);
  const grand = allRows.reduce((sum,rr) => sum+(parseFloat(rr.qty)||0)*(parseFloat(rr.unitCost)||0), 0);
  const ge = document.getElementById('bom-grand-total');
  if (ge) ge.innerHTML = fv(grand, v => '€'+v.toFixed(2));
  logAudit(id, 'BOM UPDATE', `${field} updated on ${r.component}`, field, '', input.value);
}
function bomAddRow(id, si) {
  if (!MD[id]) return;
  MD[id].bom[si].rows.push({ component:'New Component', desc:'', supplier:'', unit:'pcs', qty:'1', unitCost:'0.00' });
  renderMdBom(MODELS.find(m => m.id === id));
  logAudit(id, 'BOM UPDATE', `Row added to section ${MD[id].bom[si].title}`);
}
function bomDeleteRow(id, si, ri) {
  if (!MD[id]) return;
  const removed = MD[id].bom[si].rows.splice(ri, 1)[0];
  renderMdBom(MODELS.find(m => m.id === id));
  logAudit(id, 'BOM UPDATE', `Removed: ${removed.component}`);
}

/* ── Gamme (SAM calculator) ───────────────────────────────────── */
function renderMdGamme(m) {
  const d = MD[m.id];
  if (!d || !d.gamme) { document.getElementById('md-gamme').innerHTML = emptyPane('No Gamme Opératoire available.'); return; }
  const ops = d.gamme;
  const totalSMV = ops.reduce((s,r) => s + parseFloat(r.smv||0), 0);
  const machOpts = MACHINE_CODES.map(c => `<option value="${c}">${c}</option>`).join('');

  const opRows = ops.map((r, i) => `
    <tr class="tbl-row">
      <td class="ref-cell">${r.op}</td>
      <td class="fw-600">${r.name}</td>
      <td>
        <select class="machine-sel gamme-no-print" onchange="gammeUpdateOp('${m.id}',${i},'machine',this.value)">
          ${MACHINE_CODES.map(c => `<option${c===r.machine?' selected':''}>${c}</option>`).join('')}
        </select>
        <span class="gamme-print-only" style="display:none">${r.machine}</span>
      </td>
      <td style="text-align:center;letter-spacing:2px;color:var(--gold)">${r.level}</td>
      <td style="text-align:right">
        <input class="bom-inp num" style="width:60px" value="${r.smv}"
          oninput="gammeUpdateOp('${m.id}',${i},'smv',this.value);gammeRefreshTotal('${m.id}')">
      </td>
    </tr>`).join('');

  document.getElementById('md-gamme').innerHTML = `
    <!-- Calculator panel -->
    <div class="gamme-calc-panel gamme-no-print">
      <div class="gamme-calc-title">Line Balancing Calculator</div>
      <div class="gamme-calc-grid">
        <div class="gamme-calc-field">
          <label>Daily Target (pcs)</label>
          <input type="number" id="gc-target" value="500" oninput="gammeCalc('${m.id}')">
        </div>
        <div class="gamme-calc-field">
          <label>Working Hours / Day</label>
          <input type="number" id="gc-hours"  value="8.5"  step="0.5" oninput="gammeCalc('${m.id}')">
        </div>
        <div class="gamme-calc-field">
          <label>Efficiency (%)</label>
          <input type="number" id="gc-eff"    value="80"   oninput="gammeCalc('${m.id}')">
        </div>
      </div>
      <div class="gamme-results" id="gc-results"></div>
    </div>

    <!-- Operations table -->
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Gamme Opératoire — Rev.${m.rev} · ${ops.length} operations</span>
        <span style="font-size:.8rem;font-weight:600;color:var(--text)">
          Total SMV: <span id="gamme-total-smv" style="color:var(--gold)">${totalSMV.toFixed(1)} min</span>
        </span>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>Op #</th><th>Operation</th><th>Machine</th>
              <th style="text-align:center">Level</th><th style="text-align:right">SMV (min)</th>
            </tr>
          </thead>
          <tbody>${opRows}
            <tr style="background:#FFFDF7">
              <td colspan="4" style="padding:12px 20px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Total SMV</td>
              <td id="gamme-smv-foot" style="text-align:right;padding:12px 20px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">${totalSMV.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;

  gammeCalc(m.id);
}

function gammeUpdateOp(id, i, field, val) {
  if (MD[id]) MD[id].gamme[i][field] = val;
}
function gammeRefreshTotal(id) {
  if (!MD[id]) return;
  const tot = MD[id].gamme.reduce((s,r) => s + parseFloat(r.smv||0), 0);
  const el1 = document.getElementById('gamme-total-smv');
  const el2 = document.getElementById('gamme-smv-foot');
  if (el1) el1.textContent = tot.toFixed(1) + ' min';
  if (el2) el2.textContent = tot.toFixed(1);
  gammeCalc(id);
}
function gammeCalc(id) {
  const d = MD[id];
  const resEl = document.getElementById('gc-results');
  if (!d || !resEl) return;
  const smv    = d.gamme.reduce((s,r) => s + parseFloat(r.smv||0), 0);
  const target = parseFloat(document.getElementById('gc-target')?.value) || 500;
  const hours  = parseFloat(document.getElementById('gc-hours')?.value)  || 8.5;
  const eff    = parseFloat(document.getElementById('gc-eff')?.value)    || 80;
  const effDec = eff / 100;
  const hourlyOut = Math.round((60 * effDec) / (smv || 1));
  const dailyOut  = Math.round(hourlyOut * hours);
  const reqOps    = Math.ceil((target * smv) / (hours * 60 * effDec));
  resEl.innerHTML = [
    { val: smv.toFixed(1),  lbl: 'Total SMV (min)' },
    { val: hourlyOut,        lbl: 'Hourly Output (pcs)' },
    { val: dailyOut,         lbl: `Daily Output (${hours}h)` },
    { val: reqOps,           lbl: `Operators for ${target} pcs/day` },
  ].map(c => `
    <div class="gamme-result-card">
      <div class="gamme-result-val">${c.val}</div>
      <div class="gamme-result-lbl">${c.lbl}</div>
    </div>`).join('');
}

/* ── POM (SheetJS dropzone) ───────────────────────────────────── */
function renderMdPom(m) {
  const d = MD[m.id];
  const sizes = ['XS','S','M','L','XL'];

  const tableHtml = (rows) => `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Points of Measure — Rev.${m.rev} · All measurements in cm · Tolerance ± 1 cm</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="renderMdPom(MODELS.find(x=>x.id==='${m.id}'))">
          Reset
        </button>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Point of Measure</th>${sizes.map(s=>`<th style="text-align:center">${s}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r,ri)=>`<tr class="tbl-row">
            <td><input class="bom-inp fw-600" value="${r.point}" oninput="pomCell('${m.id}',${ri},'point',this.value)"></td>
            ${sizes.map(s=>`<td style="text-align:center"><input class="pom-inp" value="${r[s]||''}" oninput="pomCell('${m.id}',${ri},'${s}',this.value)"></td>`).join('')}
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  let content = '';
  if (d && d.pom && d.pom.length) {
    content = tableHtml(d.pom);
  }

  document.getElementById('md-pom').innerHTML = `
    <!-- Drop-zone -->
    <div class="pom-dropzone" id="pom-dz" onclick="document.getElementById('pom-file-in').click()"
      ondragover="event.preventDefault();this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="this.classList.remove('drag-over');handlePomDrop(event,'${m.id}')">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p>Drop an <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> POM file here, or <strong>click to browse</strong></p>
      <p style="font-size:.72rem;color:var(--muted2);margin-top:4px">First column = measurement label, remaining columns = sizes (XS S M L XL)</p>
    </div>
    <input type="file" id="pom-file-in" accept=".xlsx,.csv" style="display:none" onchange="handlePomFile(event,'${m.id}')">
    ${content}`;
}

function pomCell(id, ri, field, val) {
  if (MD[id] && MD[id].pom) MD[id].pom[ri][field] = val;
}
function handlePomDrop(e, id) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) parsePomFile(file, id);
}
function handlePomFile(e, id) {
  const file = e.target.files[0];
  if (file) parsePomFile(file, id);
}
function parsePomFile(file, id) {
  if (!window.XLSX) { showToast('Excel parser not loaded — reload the page.'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const wb   = XLSX.read(ev.target.result, { type:'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header:1 });
    if (!data.length) { showToast('No data found in file.'); return; }

    const sizes = ['XS','S','M','L','XL'];
    const headers = (data[0] || []).slice(1).map(h => String(h||'').trim());
    const rows = data.slice(1).filter(r => r[0]).map(r => {
      const obj = { point: String(r[0]||'') };
      headers.forEach((h,i) => {
        const key = sizes.find(s => s.toLowerCase() === h.toLowerCase()) || h;
        obj[key] = String(r[i+1] !== undefined ? r[i+1] : '');
      });
      return obj;
    });

    if (!MD[id]) MD[id] = {};
    MD[id].pom = rows;
    renderMdPom(MODELS.find(m => m.id === id));
    logAudit(id, 'UPLOADED', `POM imported from ${file.name} — ${rows.length} measurements`);
    showToast(`POM imported: ${rows.length} rows`);
  };
  reader.readAsArrayBuffer(file);
}

/* ── Revisions ────────────────────────────────────────────────── */
function renderMdRevisions(id) {
  const d = MD[id];
  if (!d || !d.revisions) { document.getElementById('md-revisions').innerHTML = emptyPane('No revision history recorded.'); return; }
  const revs = [...d.revisions].reverse();
  const items = revs.map((r, i) => {
    const isLast = i === revs.length - 1;
    return `
      <div class="rev-item"${isLast?'':' style="padding-bottom:0"'}>
        ${!isLast?`<div style="position:absolute;left:17px;top:28px;bottom:0;width:2px;background:#E6E2DC;z-index:0"></div>`:''}
        <div class="rev-dot-col"><div class="rev-dot${r.latest?' latest':''}"></div></div>
        <div class="rev-body">
          <div class="rev-hrow">
            <span class="rev-num">Rev.${r.rev}</span>
            ${r.latest?'<span class="rev-latest-chip">Latest</span>':''}
            <span class="rev-meta">${r.date} &nbsp;·&nbsp; ${r.author}</span>
          </div>
          <p class="rev-summary">${r.summary}</p>
          <ul class="rev-changes">${r.changes.map(c=>`<li>${c}</li>`).join('')}</ul>
          <div class="rev-btns">
            <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="showToast('Rev.${r.rev} viewer — coming next')">View</button>
            ${!r.latest?`<button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="showToast('Compare — coming next')">Compare</button>`:''}
          </div>
        </div>
      </div>`;
  }).join('');
  document.getElementById('md-revisions').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Revision History &mdash; ${d.revisions.length} revisions</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="showToast('New revision form — coming next')">+ New Revision</button>
      </div>
      <div class="rev-list" style="position:relative">${items}</div>
    </div>`;
}

/* ── Samples & QC ─────────────────────────────────────────────── */
function renderMdSamples(id) {
  const d = MD[id];
  if (!d || !d.samples) { document.getElementById('md-samples').innerHTML = emptyPane('No sample records found.'); return; }

  const approved = !!d.qcApproved;
  const bannerCls = approved ? 'approved' : 'not-approved';
  const bannerIcon = approved
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  const bannerText = approved ? 'Approved for Cutting' : 'Not Approved — Bulk Cutting Blocked';

  const warning = !approved ? `
    <div class="sample-warn">
      <svg class="sample-warn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <p><strong>Bulk cutting blocked.</strong> Toggle "Approved for Cutting" once the PP sample is signed off by the client buyer.</p>
    </div>` : '';

  const cards = d.samples.map(s => {
    const dateStr = s.date
      ? `<div class="sample-datemeta">Submitted ${s.date} &nbsp;·&nbsp; Rev.${s.rev}</div>`
      : `<div class="sample-datemeta" style="color:var(--muted2)">Not yet produced &nbsp;·&nbsp; Rev.${s.rev}</div>`;
    const fbBlock = s.statusLabel === 'Not Produced'
      ? `<div class="sample-fb-lbl">Notes</div><textarea class="sample-fb" placeholder="No sample produced yet. Add notes here…" rows="3"></textarea>`
      : `<div class="sample-fb-lbl">Client Feedback</div><textarea class="sample-fb" rows="3">${s.feedback}</textarea>`;
    return `
      <div class="sample-card ${s.cssClass}">
        <div class="sample-chead">
          <span class="sample-type-lbl">${s.type}</span>
          <span class="sbadge ${s.badgeClass}"><span class="sdot"></span>${s.statusLabel}</span>
        </div>
        ${dateStr}${fbBlock}
      </div>`;
  }).join('');

  /* Defect Knowledge Base */
  const defects = (d.defects || []);
  const dkbRows = defects.map((def, i) => `
    <div class="dkb-entry">
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:600;color:var(--text)">${def.type}</div>
        <div style="font-size:.75rem;color:var(--muted);margin-top:2px">${def.detail}</div>
        <div style="font-size:.68rem;color:var(--muted2);margin-top:4px">${def.date}</div>
      </div>
      <span class="dkb-badge ${def.status}">${def.status}</span>
    </div>`).join('');

  document.getElementById('md-samples').innerHTML = `
    <!-- Approval Banner -->
    <div class="qc-approval-banner ${bannerCls}">
      ${bannerIcon}
      <span>${bannerText}</span>
      <button class="qc-approval-btn" onclick="toggleQcApproval('${id}')">
        ${approved ? 'Revoke' : 'Approve for Cutting'}
      </button>
    </div>
    ${warning}
    <div class="sample-grid">${cards}</div>
    <div class="sc" style="margin-top:16px">
      <div class="sc-head">
        <span class="sc-title">Defect Knowledge Base &mdash; ${defects.length} entries</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="addDefectEntry('${id}')">+ Log Defect</button>
      </div>
      <div>${dkbRows || emptyPane('No defects logged.')}</div>
    </div>`;
}

function toggleQcApproval(id) {
  if (!MD[id]) return;
  MD[id].qcApproved = !MD[id].qcApproved;
  const action = MD[id].qcApproved ? 'APPROVED' : 'STATUS CHANGE';
  const detail = MD[id].qcApproved ? 'Approved for Cutting' : 'Approval revoked — bulk cutting blocked';
  logAudit(id, action, detail);
  renderMdSamples(id);
}
function addDefectEntry(id) {
  const type   = prompt('Defect type (e.g. Raw Edge, Zip Placket):');
  if (!type) return;
  const detail = prompt('Details:') || '';
  if (!MD[id].defects) MD[id].defects = [];
  const today  = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  MD[id].defects.push({ date:today, type, detail, status:'noted' });
  logAudit(id, 'UPDATED', `Defect logged: ${type}`);
  renderMdSamples(id);
}

/* ── Linked Orders ────────────────────────────────────────────── */
function renderMdOrders(id) {
  const d = MD[id];
  if (!d || !d.orders) { document.getElementById('md-orders').innerHTML = emptyPane('No linked orders for this model.'); return; }
  const o = d.orders;
  const totalQty = o.reduce((s,r) => s+r.qty, 0);
  const totalVal = o.reduce((s,r) => s+r.value, 0);
  const STATUS_CLS = { 'In Production':'badge-production','Confirmed':'badge-confirmed','Completed':'badge-completed','Sample':'badge-sample','Draft':'badge-draft' };
  const rows = o.map(r => `
    <tr class="tbl-row">
      <td style="font-family:'Courier New',monospace;font-size:.78rem;font-weight:600">${r.po}</td>
      <td class="muted-cell">${r.issued}</td>
      <td class="muted-cell">${r.delivery}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem">${r.qty.toLocaleString()}</td>
      <td style="font-size:.75rem;color:var(--muted);max-width:220px;white-space:normal;line-height:1.5">${r.sizes}</td>
      <td><span class="badge ${STATUS_CLS[r.status]||'badge-draft'}">${r.status}</span></td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.15rem;color:var(--gold)">${fv(r.value, v => '€'+v.toLocaleString())}</td>
    </tr>`).join('');
  document.getElementById('md-orders').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Linked Orders &mdash; ${o.length} purchase orders</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="showToast('Link Order — coming next')">+ Link Order</button>
      </div>
      <div class="lo-summary">
        <div><div class="lo-stat-val">${o.length}</div><div class="lo-stat-lbl">Purchase Orders</div></div>
        <div><div class="lo-stat-val gold">${totalQty.toLocaleString()}</div><div class="lo-stat-lbl">Total Units</div></div>
        <div><div class="lo-stat-val" style="font-family:'Bebas Neue',sans-serif;font-size:1.75rem;color:var(--gold)">${fv(totalVal, v => '€'+v.toLocaleString())}</div><div class="lo-stat-lbl">Total Value (ex-factory)</div></div>
        <div><div class="lo-stat-val">${o.filter(r=>r.status==='In Production').length}</div><div class="lo-stat-lbl">In Production</div></div>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr>
            <th>PO Number</th><th>Issued</th><th>Delivery</th>
            <th style="text-align:right">Qty</th><th>Size Breakdown</th>
            <th>Status</th><th style="text-align:right">Value (EUR)</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr style="background:#FFFDF7;border-top:2px solid rgba(196,163,90,.15)">
              <td colspan="3" style="padding:13px 20px;font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Total</td>
              <td style="padding:13px 20px;text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.1rem">${totalQty.toLocaleString()}</td>
              <td></td><td></td>
              <td style="padding:13px 20px;text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.2rem;color:var(--gold)">${fv(totalVal, v => '€'+v.toLocaleString())}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ── Audit ────────────────────────────────────────────────────── */
function renderMdAudit(id) {
  const entries = getAuditEntries(id);
  if (!entries.length) { document.getElementById('md-audit').innerHTML = emptyPane('No audit log entries.'); return; }
  const BADGE = {
    'CREATED':'ab-created','UPDATED':'ab-updated','UPLOADED':'ab-uploaded',
    'APPROVED':'ab-approved','REJECTED':'ab-rejected','STATUS CHANGE':'ab-statuschange',
    'REVISION':'ab-revision','BOM UPDATE':'ab-updated',
  };
  const rows = entries.map(e => `
    <div class="audit-entry">
      <div class="audit-av">${(e.user||'?').charAt(0)}</div>
      <div style="flex:1;min-width:0">
        <div class="audit-arow">
          <span class="audit-badge ${BADGE[e.action]||'ab-updated'}">${e.action}</span>
          <span style="font-size:.76rem;font-weight:600;color:var(--text)">${e.user}</span>
        </div>
        <div class="audit-detail">${e.detail}</div>
        ${e.field ? `<div class="audit-detail" style="color:var(--muted2);font-size:.72rem">${e.field}: <em>${e.before}</em> → <em>${e.after}</em></div>` : ''}
        <div class="audit-ts">${e.ts}</div>
      </div>
    </div>`).join('');
  document.getElementById('md-audit').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Audit Log &mdash; ${entries.length} entries</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="exportAuditCSV('${id}')">Print Audit</button>
      </div>
      <div>${rows}</div>
    </div>`;
}

function exportAuditCSV(id) {
  const entries = getAuditEntries(id);
  if (!entries.length) return;
  const rows = entries.map(e => [e.ts, e.user, e.action, e.detail]);
  openPrintWin(`Audit Log — ${id}`, `${entries.length} entr${entries.length!==1?'ies':'y'} · Model ${id}`, buildTable(['Timestamp','User','Action','Detail'], rows));
  showToast(`Opened audit log for ${id}`);
}
