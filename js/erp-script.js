
/* ── Auth guard & RBAC ───────────────────────────────────────── */
if (!sessionStorage.getItem('erp_auth')) {
  window.location.replace('login.html');
}

// Role-Based Access Control (RBAC) System
const RBAC = {
  // User roles with permissions
  roles: {
    'Director': ['view_financial', 'edit_financial', 'view_audit', 'edit_all', 'delete_all'],
    'Owner': ['view_financial', 'edit_financial', 'view_audit', 'edit_all', 'delete_all'],
    'Admin': ['view_financial', 'edit_financial', 'view_audit', 'edit_all', 'delete_all'],
    'Manager': ['view_audit', 'edit_limited', 'view_limited'],
    'Supervisor': ['view_limited', 'edit_own'],
    'Operator': ['view_own', 'edit_own'],
    'Viewer': ['view_limited']
  },
  
  // Current user (default to Manager for demo)
  currentUser: {
    id: 'user001',
    name: 'Soufiane',
    role: 'Manager',
    department: 'Production'
  },
  
  // Initialize user from session storage
  init: function() {
    const userData = sessionStorage.getItem('erp_user');
    if (userData) {
      try {
        this.currentUser = JSON.parse(userData);
      } catch (e) {
        console.warn('Failed to parse user data, using default');
      }
    }
    // Update UI with user info
    this.updateUserUI();
  },
  
  // Check if user has specific permission
  hasPermission: function(permission) {
    const rolePermissions = this.roles[this.currentUser.role] || [];
    return rolePermissions.includes(permission);
  },
  
  // Check if user can view financial data
  canViewFinancial: function() {
    return this.hasPermission('view_financial');
  },
  
  // Check if user can edit financial data
  canEditFinancial: function() {
    return this.hasPermission('edit_financial');
  },
  
  // Update user info in sidebar
  updateUserUI: function() {
    const avatar = document.querySelector('.sb-avatar');
    const name = document.querySelector('.sb-uname');
    const role = document.querySelector('.sb-urole');
    
    if (avatar) {
      avatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
    }
    if (name) {
      name.textContent = this.currentUser.name;
    }
    if (role) {
      role.textContent = this.currentUser.role;
    }
  },
  
  // Get current user for audit logging
  getCurrentUser: function() {
    return this.currentUser;
  }
};

// Initialize RBAC
RBAC.init();

// Audit Trail System
const AuditTrail = {
  logs: JSON.parse(localStorage.getItem('erp_audit_logs') || '[]'),
  
  // Log an action
  log: function(action, entity, entityId, details, before = null, after = null) {
    const timestamp = new Date().toISOString();
    const user = RBAC.getCurrentUser();
    
    const logEntry = {
      id: 'AUDIT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: timestamp,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      action: action,
      entity: entity,
      entityId: entityId,
      details: details,
      before: before,
      after: after,
      ip: '127.0.0.1', // In production, this would be captured from request
      userAgent: navigator.userAgent
    };
    
    this.logs.unshift(logEntry);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    // Save to localStorage
    localStorage.setItem('erp_audit_logs', JSON.stringify(this.logs));
    
    // Real-time update if audit UI is open
    this.updateAuditUI();
    
    return logEntry;
  },
  
  // Get logs for specific entity
  getLogsForEntity: function(entity, entityId) {
    return this.logs.filter(log => 
      log.entity === entity && log.entityId === entityId
    );
  },
  
  // Get logs for current user
  getLogsForUser: function(userId) {
    return this.logs.filter(log => log.user.id === userId);
  },
  
  // Update audit UI if open
  updateAuditUI: function() {
    const auditPane = document.getElementById('md-audit');
    if (auditPane && auditPane.classList.contains('active')) {
      const modelId = document.querySelector('.md-id-badge')?.textContent;
      if (modelId) {
        this.renderAuditLogs(modelId);
      }
    }
  },
  
  // Render audit logs for a model
  renderAuditLogs: function(modelId) {
    const logs = this.getLogsForEntity('Model', modelId);
    const container = document.getElementById('md-audit');
    if (!container) return;
    
    if (logs.length === 0) {
      container.innerHTML = `<div class="sc" style="padding:52px 0;text-align:center">
        <p style="font-size:.82rem;color:var(--muted)">No audit log entries.</p>
      </div>`;
      return;
    }
    
    const BADGE = {
      'CREATED': 'ab-created',
      'UPDATED': 'ab-updated',
      'UPLOADED': 'ab-uploaded',
      'APPROVED': 'ab-approved',
      'REJECTED': 'ab-rejected',
      'STATUS CHANGE': 'ab-statuschange',
      'REVISION': 'ab-revision',
      'DELETED': 'ab-rejected',
      'VIEWED': 'ab-updated',
      'EXPORTED': 'ab-uploaded'
    };
    
    const entries = logs.map(e => {
      const date = new Date(e.timestamp).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      const time = new Date(e.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
      });
      
      let detailHtml = `<div class="audit-detail">${e.details}</div>`;
      
      // Show before/after comparison for updates
      if (e.before && e.after) {
        detailHtml += `<div style="margin-top:8px;font-size:.7rem;color:var(--muted2)">
          <div><strong>Before:</strong> ${JSON.stringify(e.before)}</div>
          <div><strong>After:</strong> ${JSON.stringify(e.after)}</div>
        </div>`;
      }
      
      return `
        <div class="audit-entry">
          <div class="audit-av">${e.user.name.charAt(0)}</div>
          <div style="flex:1">
            <div class="audit-arow">
              <span class="audit-badge ${BADGE[e.action] || 'ab-updated'}">${e.action}</span>
              <span style="font-size:.75rem;font-weight:600;color:var(--text)">${e.user.name}</span>
              <span style="font-size:.6rem;color:var(--muted2);background:rgba(122,117,106,.08);padding:1px 6px;border-radius:3px">${e.user.role}</span>
            </div>
            ${detailHtml}
            <div class="audit-ts">${date} · ${time}</div>
          </div>
        </div>`;
    }).join('');
    
    container.innerHTML = `
      <div class="sc">
        <div class="sc-head">
          <span class="sc-title">Audit Trail — ${logs.length} entries</span>
          ${RBAC.hasPermission('view_audit') ? `
            <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="exportAuditLogs('${modelId}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
          ` : ''}
        </div>
        <div class="audit-list">${entries}</div>
      </div>`;
  }
};

// Initialize audit trail with some sample data if empty
if (AuditTrail.logs.length === 0) {
  // Add sample audit entries for existing models
  const sampleLogs = [
    {
      id: 'AUDIT-001',
      timestamp: new Date('2026-03-28T14:32:00').toISOString(),
      user: { id: 'user001', name: 'Soufiane', role: 'Manager' },
      action: 'STATUS CHANGE',
      entity: 'Model',
      entityId: 'AM-0045',
      details: 'Status changed: Confirmed → In Production following PP sign-off',
      before: 'Confirmed',
      after: 'In Production'
    },
    {
      id: 'AUDIT-002',
      timestamp: new Date('2026-03-28T14:28:00').toISOString(),
      user: { id: 'user001', name: 'Soufiane', role: 'Manager' },
      action: 'APPROVED',
      entity: 'Model',
      entityId: 'AM-0045',
      details: 'Rev.4 PP sample approved — ASOS buyer ref PPAM0045-04',
      before: null,
      after: 'Approved'
    }
  ];
  
  sampleLogs.forEach(log => AuditTrail.logs.push(log));
  localStorage.setItem('erp_audit_logs', JSON.stringify(AuditTrail.logs));
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════ */

const DASH_ALERTS = [
  { dot:'red',   text:'High waste on C002 — 4.83% (threshold 3%)',          meta:'Cutting · 08 Apr 2026' },
  { dot:'amber', text:'High QC fail rate on F003 — 3.59% (threshold 2%)',   meta:'Finishing · 12 Apr 2026' },
  { dot:'blue',  text:'Satin Duchess Black & Navy ETA 20 Apr — not yet received', meta:'Incoming · INC-004, INC-005' },
  { dot:'amber', text:'YKK Zips partial receipt — 1,200 of 2,400 confirmed', meta:'Materials · ASOS-PO-44521-A' },
  { dot:'gold',  text:'AM-0052 Proto sample not yet produced',                meta:'Samples · AM-0052' },
  { dot:'blue',  text:'Label Set not ordered for PO-44521-B',                 meta:'Materials · ASOS-PO-44521-B' },
];

const ACTIVITY_FEED = [
  { dot:'#C4A35A', what:'Sewing log S006 — 47 pcs, Line 6 AM · Raw Edge defect flagged',         when:'12 Apr 2026 · Sewing'      },
  { dot:'#C4A35A', what:'Sewing log S005 — 51 pcs, Line 5 AM · No defects',                       when:'12 Apr 2026 · Sewing'      },
  { dot:'#196741', what:'QC session F003 — 195 inspected, 7 failed (3.59%) · AQL 4.0 · Nadia H.', when:'12 Apr 2026 · Finishing'   },
  { dot:'#7B5EA7', what:'Carton CTN-0004 packed — 48 pcs · ASOS-PO-44521-A · Ivory',              when:'11 Apr 2026 · Packing'     },
  { dot:'#7B5EA7', what:'Carton CTN-0003 packed — 48 pcs · ASOS-PO-44521-A · Ivory',              when:'11 Apr 2026 · Packing'     },
  { dot:'#196741', what:'QC session F002 — 175 inspected, 3 failed (1.71%) · AQL 2.5 · Fatima R.',when:'11 Apr 2026 · Finishing'   },
  { dot:'#2455CC', what:'INC-003 confirmed — YKK Zip 60 cm · 1,200 units received (partial)',      when:'05 Apr 2026 · Incoming'    },
  { dot:'#C4A35A', what:'Cutting log C002 — 550 pcs cut · 248.5 m consumed · Waste 4.83% ⚠',     when:'08 Apr 2026 · Cutting'     },
  { dot:'#C4A35A', what:'Cutting log C001 — 450 pcs cut · 197.2 m consumed · Waste 1.88%',        when:'07 Apr 2026 · Cutting'     },
  { dot:'#2455CC', what:'Meeting note — Client confirmed Ivory priority. AQL 2.5 mandatory.',      when:'09 Apr 2026 · Orders'      },
];

function renderDashboard() {
  /* ── Calculations ─────────────────────────────────────────── */
  const totalCut    = CUTTING_LOG.reduce((a,r)=>a+r.qty,0);
  const totalSewn   = SEWING_LOG.reduce((a,r)=>a+r.pieces,0);
  const finInsp     = FINISHING_LOG.reduce((a,r)=>a+r.inspected,0);
  const finPass     = FINISHING_LOG.reduce((a,r)=>a+r.passed,0);
  const passRate    = finInsp ? (finPass/finInsp*100).toFixed(1)+'%' : '—';
  const urgentCount = DASH_ALERTS.filter(a=>a.dot==='red').length;
  const matConf     = INCOMING.filter(i=>i.status==='Confirmed').length;

  /* ── Row 1: KPI cards ─────────────────────────────────────── */
  const kpis = [
    {
      icon:'clipboard-list', label:'Active Orders',
      value: ORDERS.length,
      sub: `${ORDERS.filter(o=>o.status==='In Production').length} in production`,
      accent:'gold',
    },
    {
      icon:'scissors', label:'Pieces Cut',
      value: totalCut.toLocaleString(),
      sub: `${CUTTING_LOG.length} cutting sessions`,
      accent:'gold',
    },
    {
      icon:'alert-triangle', label:'Active Alerts',
      value: DASH_ALERTS.length,
      sub: urgentCount ? `${urgentCount} urgent` : 'No critical issues',
      accent: urgentCount ? 'red' : 'gold',
    },
    {
      icon:'spool', label:'Pieces Sewn',
      value: totalSewn.toLocaleString(),
      sub: `${SEWING_LOG.length} sessions logged`,
      accent:'gold',
    },
    {
      icon:'sparkles', label:'QC Pass Rate',
      value: passRate,
      sub: `${finInsp.toLocaleString()} units inspected`,
      accent:'green',
    },
    {
      icon:'warehouse', label:'Shipments In',
      value: `${matConf}<span class="dash-kpi-unit"> / ${INCOMING.length}</span>`,
      sub: 'confirmed of total incoming',
      accent:'gold',
    },
  ];

  document.getElementById('dash-kpis').innerHTML = kpis.map(k => `
    <div class="dash-kpi-card${k.accent==='red'?' kpi-alert':''}">
      <div class="dash-kpi-icon${k.accent==='red'?' red':k.accent==='green'?' green':''}">
        <i data-lucide="${k.icon}"></i>
      </div>
      <div class="dash-kpi-eyebrow">${k.label}</div>
      <div class="dash-kpi-num${k.accent==='gold'?'':' '+k.accent}">${k.value}</div>
      <div class="dash-kpi-sub">${k.sub}</div>
    </div>`).join('');
  lucide.createIcons();

  /* ── Row 2a: Active Orders table ─────────────────────────── */
  document.getElementById('dash-ord-count').textContent = ORDERS.length + ' orders';
  const statusColor = {'In Production':'#196741','Confirmed':'#2455CC','Completed':'#888'};
  const statusBg    = {'In Production':'#EEFAF4','Confirmed':'#EEF3FF','Completed':'#F5F5F5'};
  document.getElementById('dash-orders-tbl').innerHTML = `
    <table class="tbl dash-ord-tbl">
      <thead><tr>
        <th>PO Number</th><th>Model</th><th>Qty</th>
        <th style="min-width:130px">Progress</th><th>Deadline</th><th>Status</th>
      </tr></thead>
      <tbody>${ORDERS.map(o => {
        const stageWt = 1 / (o.progress ? o.progress.length : 1);
        const pct = o.progress
          ? Math.round(o.progress.reduce((a,s) => a + (s.total ? s.done/s.total : 0)*stageWt, 0)*100)
          : 0;
        const sc = statusColor[o.status]||'#888';
        const sb = statusBg[o.status]||'#F5F5F5';
        return `<tr style="cursor:pointer" onclick="openOrder('${o.po}')">
          <td>
            <span style="font-family:'Courier New',monospace;font-size:.72rem;color:var(--gold);font-weight:600">${o.po}</span>
          </td>
          <td>
            <div style="font-size:.78rem;font-weight:600;line-height:1.2">${o.model}</div>
            <div style="font-size:.67rem;color:var(--muted2)">${o.modelName}</div>
          </td>
          <td style="font-family:'Bebas Neue',sans-serif;font-size:1.15rem;text-align:right">${o.qty.toLocaleString()}</td>
          <td>
            <div style="display:flex;align-items:center;gap:7px">
              <div class="ord-prog-bar" style="flex:1"><div class="ord-prog-fill" style="width:${pct}%"></div></div>
              <span style="font-size:.68rem;color:var(--muted2);min-width:28px;text-align:right">${pct}%</span>
            </div>
          </td>
          <td style="font-size:.75rem;white-space:nowrap">${o.delivery}</td>
          <td>
            <span style="background:${sb};color:${sc};border-radius:3px;padding:2px 8px;font-size:.63rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:inline-block">${o.status}</span>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;

  /* ── Row 2b: Alerts with colored borders ─────────────────── */
  document.getElementById('dash-alert-count').textContent = DASH_ALERTS.length + ' active';
  document.getElementById('dash-alerts').innerHTML = DASH_ALERTS.map(a => `
    <div class="alert-item border-${a.dot}">
      <div>
        <div class="alert-text">${a.text}</div>
        <div class="alert-meta">${a.meta}</div>
      </div>
    </div>`).join('');

  /* ── Row 3a: Today's Production by Line ──────────────────── */
  const latestDate = SEWING_LOG.reduce((d,r) => r.date > d ? r.date : d, '');
  document.getElementById('dash-prod-date').textContent = latestDate || '—';
  const todayLogs = SEWING_LOG.filter(r => r.date === latestDate);
  const lineMap = {};
  todayLogs.forEach(r => {
    if (!lineMap[r.line]) lineMap[r.line] = { pieces:0, po:r.po, defects:0 };
    lineMap[r.line].pieces  += r.pieces;
    lineMap[r.line].defects += r.defects.length;
  });
  document.getElementById('dash-production').innerHTML = [1,2,3,4,5,6,7,8].map(n => {
    const d = lineMap[n];
    if (d) {
      const ord = ORDERS.find(o => o.po === d.po);
      return `<div class="prod-line-item prod-line-active">
        <div class="prod-line-num">${n}</div>
        <div>
          <div class="prod-line-name">${ord ? ord.model+' &middot; '+ord.modelName : d.po}</div>
          <div class="prod-line-sub">${d.po}${d.defects ? ' &middot; <span style="color:#C47000">'+d.defects+' defect flag'+(d.defects>1?'s':'')+'</span>' : ' &middot; No defects'}</div>
        </div>
        <div class="prod-line-pcs">${d.pieces}<span style="font-family:'DM Sans',sans-serif;font-size:.62rem;color:var(--muted);margin-left:3px">pcs</span></div>
      </div>`;
    }
    return `<div class="prod-line-item prod-line-idle">
      <div class="prod-line-num">${n}</div>
      <div>
        <div class="prod-line-name" style="color:var(--muted2);font-weight:400">Idle</div>
        <div class="prod-line-sub">No activity logged</div>
      </div>
      <div class="prod-line-pcs">—</div>
    </div>`;
  }).join('');

  /* ── Row 3b: Activity feed ───────────────────────────────── */
  document.getElementById('dash-feed').innerHTML = ACTIVITY_FEED.map(e => `
    <div class="feed-item">
      <div class="feed-dot" style="background:${e.dot}"></div>
      <div class="feed-body">
        <div class="feed-what">${e.what}</div>
        <div class="feed-when">${e.when}</div>
      </div>
    </div>`).join('');
}

/* ── Section meta ─────────────────────────────────────────────── */
const SECTION_META = {
  dashboard: { title: 'Dashboard',       icon: 'layout-dashboard' },
  models:    { title: 'Models',           icon: 'shirt'            },
  orders:    { title: 'Orders',           icon: 'clipboard-list'   },
  planning:  { title: 'Planning',         icon: 'calendar-range'   },
  cutting:   { title: 'Cutting',          icon: 'scissors'         },
  sewing:    { title: 'Sewing',           icon: 'spool'            },
  finishing: { title: 'Finishing & QC',   icon: 'sparkles'         },
  packing:   { title: 'Packing',          icon: 'box'              },
  materials: { title: 'Materials',        icon: 'warehouse'        },
  settings:  { title: 'Settings',         icon: 'settings'         },
  'production-lines': { title: 'Production Lines', icon: 'factory' },
};

let currentSec = 'dashboard';
let currentOrderPO = null;   /* tracked so printOrderCP() knows which order is open */

/* ── View renderer map ────────────────────────────────────────── */
const VIEW_RENDERERS = {
  dashboard:      () => renderDashboard(),
  models:         () => renderModels(MODELS),
  orders:         () => renderOrders(ORDERS),
  'order-detail': () => {},
  planning:       () => renderPlanning(),
  cutting:        () => renderCutting(),
  sewing:         () => renderSewing(),
  finishing:      () => renderFinishing(),
  packing:        () => renderPacking(),
  materials:      () => renderMaterials(),
  settings:       () => renderSettings(),
  'model-detail': () => {},
  'production-lines': () => renderProductionLines(),
};

/* ── Lazy view loader ─────────────────────────────────────────── */
async function loadView(viewName) {
  const el = document.getElementById('sec-' + viewName);
  if (!el || el.dataset.loaded) return;
  try {
    const res = await fetch(`views/${viewName}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    el.innerHTML = await res.text();
    el.dataset.loaded = '1';
    const renderer = VIEW_RENDERERS[viewName];
    if (renderer) renderer();
    wrapTables();
    wrapMatrices();
    lucide.createIcons();
  } catch (e) {
    console.error('loadView failed:', viewName, e);
  }
}

/* ── Navigate (shared by nav button clicks and programmatic calls) */
async function navTo(secId) {
  await loadView(secId);
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('sec-' + secId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-sec="${secId}"]`);
  if (btn) btn.classList.add('active');
  const meta = SECTION_META[secId] || { title: secId, icon: 'circle' };
  document.getElementById('tb-title').textContent = meta.title;
  document.getElementById('tb-icon').innerHTML = `<i data-lucide="${meta.icon}"></i>`;
  currentSec = secId;
  lucide.createIcons();
  closeSidebar();
}

function nav(btn) {
  const sec = btn.dataset.sec;
  if (!sec) return;
  navTo(sec);
}

/* ── Logout ───────────────────────────────────────────────────── */
function logout() {
  sessionStorage.removeItem('erp_auth');
  sessionStorage.removeItem('erp_user');
  window.location.href = 'login.html';
}

/* ── Mobile sidebar ───────────────────────────────────────────── */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sb-overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('show');
}

/* ── Date ─────────────────────────────────────────────────────── */
function updateDate() {
  const d = new Date();
  const s = d.toLocaleDateString('en-GB', {
    weekday:'short', day:'numeric', month:'short', year:'numeric'
  });
  document.getElementById('tb-date').textContent = s;
}

/* ── Toast ────────────────────────────────────────────────────── */
function showToast(msg) {
  const el = document.getElementById('toast-inner');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ── Models data ──────────────────────────────────────────────── */
const MODELS = [
  {
    id:'AM-0045', name:'Robe Satin Longue',
    client:'ASOS', ref:'ASOS-ST-44521',
    cat:'Robe', rev:4, status:'In Production',
    cost:19.29, updated:'28 Mar 2026', updatedBy:'Soufiane',
    desc:'Long satin duchess dress with fitted silhouette. Invisible zip at centre back. Full poly lining on bodice.'
  },
  {
    id:'AM-0052', name:'Crop Top Jersey',
    client:'PrettyLittleThing', ref:'PLT-CR-8821',
    cat:'Top', rev:2, status:'Sample',
    cost:8.00, updated:'02 Apr 2026', updatedBy:'Karim',
    desc:'Fitted jersey crop top with elasticated hem. Round neckline, short puff sleeves. 95% poly, 5% elastane.'
  },
  {
    id:'AM-0039', name:'Wide Leg Linen Trousers',
    client:'River Island', ref:'RI-PL-3301',
    cat:'Pantalon', rev:1, status:'Completed',
    cost:11.22, updated:'15 Jan 2026', updatedBy:'Ahmed',
    desc:'Relaxed wide-leg trouser in linen-viscose blend. Side pockets, concealed hook bar waist, turn-up hem.'
  },
  {
    id:'AM-0060', name:'Pleated Midi Skirt',
    client:'ASOS', ref:'ASOS-JP-9933',
    cat:'Jupe', rev:1, status:'Draft',
    cost:null, updated:'05 Apr 2026', updatedBy:'Fatima',
    desc:'Knife-pleated midi skirt, satin finish. Elasticated back waistband. Pending fabric and costing sign-off.'
  },
  {
    id:'AM-0061', name:'Wrap Blouse Viscose',
    client:'PrettyLittleThing', ref:'PLT-WB-1105',
    cat:'Top', rev:3, status:'Confirmed',
    cost:10.12, updated:'19 Mar 2026', updatedBy:'Soufiane',
    desc:'Wrap-front blouse in 100% viscose challis. Long sleeves with button cuff, self-tie belt, V neckline.'
  },
];

const STATUS_CLASS = {
  'Draft':'badge-draft','Sample':'badge-sample',
  'Confirmed':'badge-confirmed','In Production':'badge-production',
  'Completed':'badge-completed','Cancelled':'badge-draft',
};

/* ══════════════════════════════════════════════════════════════
   PRODUCTION LINES — data & functions
   ══════════════════════════════════════════════════════════════ */

// Production line status types
const LINE_STATUS = {
  RUNNING: 'Running',
  DOWN: 'Down', 
  MAINTENANCE: 'Maintenance',
  IDLE: 'Idle'
};

// Production line status colors
const LINE_STATUS_COLORS = {
  'Running': '#22A06B',      // Green
  'Down': '#DC2626',         // Red
  'Maintenance': '#C47000',  // Amber
  'Idle': '#7A756A'          // Muted
};

// Production line status background colors
const LINE_STATUS_BG = {
  'Running': '#E8F5EF',
  'Down': '#FDEAEA',
  'Maintenance': '#FFF3E0',
  'Idle': '#F4F2EE'
};

// Production line data for 20 lines
const PRODUCTION_LINES = Array.from({ length: 20 }, (_, i) => {
  const lineNumber = i + 1;
  // Random status distribution: 70% Running, 10% Down, 10% Maintenance, 10% Idle
  const statusRand = Math.random();
  let status = LINE_STATUS.RUNNING;
  if (statusRand < 0.1) status = LINE_STATUS.DOWN;
  else if (statusRand < 0.2) status = LINE_STATUS.MAINTENANCE;
  else if (statusRand < 0.3) status = LINE_STATUS.IDLE;
  
  // Daily target: 400-800 pieces based on line number (higher for newer lines)
  const dailyTarget = 400 + Math.floor((lineNumber / 20) * 400);
  
  // Actual output: 70-110% of target based on status
  let actualMultiplier = 0.7;
  if (status === LINE_STATUS.RUNNING) actualMultiplier = 0.85 + Math.random() * 0.25; // 85-110%
  else if (status === LINE_STATUS.IDLE) actualMultiplier = 0.3 + Math.random() * 0.4; // 30-70%
  else if (status === LINE_STATUS.MAINTENANCE) actualMultiplier = 0.1 + Math.random() * 0.3; // 10-40%
  else actualMultiplier = 0; // Down = 0%
  
  const actualOutput = Math.floor(dailyTarget * actualMultiplier);
  
  // Efficiency: actual / target * 100%
  const efficiency = dailyTarget > 0 ? Math.round((actualOutput / dailyTarget) * 100) : 0;
  
  // Assign PO if line is running
  let currentPO = null;
  let currentModel = null;
  if (status === LINE_STATUS.RUNNING && lineNumber <= 8) {
    // Assign to existing POs for first 8 lines
    const poIndex = lineNumber % 2;
    currentPO = poIndex === 0 ? 'ASOS-PO-44521-A' : 'ASOS-PO-44521-B';
    currentModel = 'AM-0045';
  }
  
  return {
    id: `LINE-${lineNumber.toString().padStart(2, '0')}`,
    number: lineNumber,
    status: status,
    dailyTarget: dailyTarget,
    actualOutput: actualOutput,
    efficiency: efficiency,
    currentPO: currentPO,
    currentModel: currentModel,
    supervisor: `Supervisor ${String.fromCharCode(65 + (lineNumber % 5))}`, // A-E
    workers: 40 + (lineNumber % 10) * 2, // 40-58 workers per line
    lastUpdated: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
});

/* ── Production Line Management Functions ───────────────────── */
function renderProductionLines() {
  const container = document.getElementById('production-lines-container');
  if (!container) return;
  
  // Calculate overall KPIs
  const totalLines = PRODUCTION_LINES.length;
  const runningLines = PRODUCTION_LINES.filter(line => line.status === LINE_STATUS.RUNNING).length;
  const downLines = PRODUCTION_LINES.filter(line => line.status === LINE_STATUS.DOWN).length;
  const maintenanceLines = PRODUCTION_LINES.filter(line => line.status === LINE_STATUS.MAINTENANCE).length;
  const idleLines = PRODUCTION_LINES.filter(line => line.status === LINE_STATUS.IDLE).length;
  
  const totalTarget = PRODUCTION_LINES.reduce((sum, line) => sum + line.dailyTarget, 0);
  const totalActual = PRODUCTION_LINES.reduce((sum, line) => sum + line.actualOutput, 0);
  const overallEfficiency = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  
  // Create KPI header
  const kpiHtml = `
    <div class="kpi-grid" style="margin-bottom: 20px;">
      <div class="kpi-card">
        <div class="kpi-eyebrow">Total Lines</div>
        <div class="kpi-num">${totalLines}</div>
        <div class="kpi-sub">20 production lines</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Running</div>
        <div class="kpi-num" style="color: #22A06B">${runningLines}</div>
        <div class="kpi-sub">${Math.round((runningLines / totalLines) * 100)}% active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Daily Target</div>
        <div class="kpi-num gold">${totalTarget.toLocaleString()}</div>
        <div class="kpi-sub">pieces across all lines</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Overall Efficiency</div>
        <div class="kpi-num ${overallEfficiency >= 85 ? 'gold' : overallEfficiency >= 70 ? '' : 'muted'}">
          ${overallEfficiency}%
        </div>
        <div class="kpi-sub">${totalActual.toLocaleString()} actual output</div>
      </div>
    </div>
  `;
  
  // Create filter controls
  const filterHtml = `
    <div class="filter-bar" style="margin-bottom: 16px;">
      <input type="text" class="f-input" id="line-search" placeholder="Search lines by ID, supervisor, or PO..." oninput="filterProductionLines()">
      <select class="f-select" id="line-status-filter" onchange="filterProductionLines()">
        <option value="">All Status</option>
        <option value="Running">Running</option>
        <option value="Down">Down</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Idle">Idle</option>
      </select>
      <select class="f-select" id="line-efficiency-filter" onchange="filterProductionLines()">
        <option value="">All Efficiency</option>
        <option value="high">High (≥85%)</option>
        <option value="medium">Medium (70-84%)</option>
        <option value="low">Low (<70%)</option>
      </select>
      <button class="btn-outline" onclick="refreshProductionLines()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        Refresh
      </button>
    </div>
  `;
  
  // Create production line cards grid
  const linesHtml = PRODUCTION_LINES.map(line => {
    const statusColor = LINE_STATUS_COLORS[line.status];
    const statusBg = LINE_STATUS_BG[line.status];
    const efficiencyColor = line.efficiency >= 85 ? '#22A06B' : line.efficiency >= 70 ? '#C4A35A' : '#DC2626';
    
    // Progress bar for target vs actual
    const progressPercent = line.dailyTarget > 0 ? Math.min(100, (line.actualOutput / line.dailyTarget) * 100) : 0;
    
    return `
      <div class="sc" data-line-id="${line.id}" data-status="${line.status}" data-efficiency="${line.efficiency}">
        <div class="sc-head" style="border-left: 4px solid ${statusColor}; padding-left: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
            <span class="sc-title">${line.id} • Line ${line.number}</span>
            <span style="font-size: .6rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; 
                  background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 10px;">
              ${line.status}
            </span>
          </div>
          <div style="font-size: .7rem; color: var(--muted);">
            Updated: ${line.lastUpdated}
          </div>
        </div>
        <div style="padding: 18px 20px;">
          <!-- Line Info Row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
                Supervisor
              </div>
              <div style="font-size: .85rem; font-weight: 600; color: var(--text);">
                ${line.supervisor}
              </div>
            </div>
            <div>
              <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
                Workers
              </div>
              <div style="font-size: .85rem; font-weight: 600; color: var(--text);">
                ${line.workers} operators
              </div>
            </div>
          </div>
          
          <!-- Current Assignment -->
          ${line.currentPO ? `
            <div style="margin-bottom: 16px; padding: 10px 12px; background: rgba(196, 163, 90, 0.05); border-radius: 6px; border-left: 3px solid var(--gold);">
              <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
                Current Assignment
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-family: 'Courier New', monospace; font-size: .75rem; color: var(--gold); font-weight: 600;">
                    ${line.currentPO}
                  </div>
                  <div style="font-size: .7rem; color: var(--muted);">
                    ${line.currentModel || 'Model not specified'}
                  </div>
                </div>
                <button class="btn-sm" onclick="showToast('View details for ${line.currentPO}')">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  View
                </button>
              </div>
            </div>
          ` : `
            <div style="margin-bottom: 16px; padding: 10px 12px; background: rgba(122, 117, 106, 0.05); border-radius: 6px; border-left: 3px solid var(--muted2);">
              <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
                Current Assignment
              </div>
              <div style="font-size: .75rem; color: var(--muted2); font-style: italic;">
                No active assignment
              </div>
            </div>
          `}
          
          <!-- Production Metrics -->
          <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2);">
                Daily Production
              </div>
              <div style="font-size: .7rem; color: var(--muted);">
                Target: <span style="font-weight: 600; color: var(--text);">${line.dailyTarget.toLocaleString()}</span> pcs
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div style="height: 8px; background: #F0EDE8; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
              <div style="height: 100%; width: ${progressPercent}%; background: ${efficiencyColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; color: var(--text);">
                ${line.actualOutput.toLocaleString()} <span style="font-family: 'DM Sans', sans-serif; font-size: .7rem; color: var(--muted);">pcs</span>
              </div>
              <div style="font-size: .75rem; font-weight: 600; color: ${efficiencyColor};">
                ${progressPercent.toFixed(1)}% of target
              </div>
            </div>
          </div>
          
          <!-- Efficiency & Actions -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #F0EDE8;">
            <div>
              <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 2px;">
                Efficiency
              </div>
              <div style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: ${efficiencyColor};">
                ${line.efficiency}%
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn-sm" onclick="updateLineStatus('${line.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Update
              </button>
              <button class="btn-sm" onclick="showLineDetails('${line.id}')">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Create responsive grid layout
  const gridHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
      ${linesHtml}
    </div>
  `;
  
  // Combine all parts
  container.innerHTML = kpiHtml + filterHtml + gridHtml;
  
  // Initialize icons
  lucide.createIcons();
}

function filterProductionLines() {
  const searchTerm = document.getElementById('line-search').value.toLowerCase();
  const statusFilter = document.getElementById('line-status-filter').value;
  const efficiencyFilter = document.getElementById('line-efficiency-filter').value;
  
  const lines = document.querySelectorAll('[data-line-id]');
  
  lines.forEach(line => {
    const lineId = line.getAttribute('data-line-id').toLowerCase();
    const status = line.getAttribute('data-status');
    const efficiency = parseInt(line.getAttribute('data-efficiency'));
    
    let matchesSearch = !searchTerm || 
      lineId.includes(searchTerm) || 
      line.textContent.toLowerCase().includes(searchTerm);
    
    let matchesStatus = !statusFilter || status === statusFilter;
    
    let matchesEfficiency = true;
    if (efficiencyFilter === 'high') matchesEfficiency = efficiency >= 85;
    else if (efficiencyFilter === 'medium') matchesEfficiency = efficiency >= 70 && efficiency < 85;
    else if (efficiencyFilter === 'low') matchesEfficiency = efficiency < 70;
    
    line.style.display = (matchesSearch && matchesStatus && matchesEfficiency) ? 'block' : 'none';
  });
}

function refreshProductionLines() {
  // Simulate real-time update by randomizing some values
  PRODUCTION_LINES.forEach(line => {
    // Update actual output with some variation
    const variation = Math.random() * 0.2 - 0.1; // -10% to +10%
    line.actualOutput = Math.max(0, Math.floor(line.actualOutput * (1 + variation)));
    
    // Recalculate efficiency
    line.efficiency = line.dailyTarget > 0 ? Math.round((line.actualOutput / line.dailyTarget) * 100) : 0;
    
    // Update timestamp
    line.lastUpdated = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    // Randomly change status (small chance)
    if (Math.random() < 0.05) { // 5% chance to change status
      const statuses = Object.values(LINE_STATUS);
      line.status = statuses[Math.floor(Math.random() * statuses.length)];
    }
  });
  
  renderProductionLines();
  showToast('Production lines refreshed with latest data');
}

function updateLineStatus(lineId) {
  const line = PRODUCTION_LINES.find(l => l.id === lineId);
  if (!line) return;
  
  const statuses = Object.values(LINE_STATUS);
  const currentIndex = statuses.indexOf(line.status);
  const nextIndex = (currentIndex + 1) % statuses.length;
  line.status = statuses[nextIndex];
  
  // Update actual output based on new status
  let actualMultiplier = 0.7;
  if (line.status === LINE_STATUS.RUNNING) actualMultiplier = 0.85 + Math.random() * 0.25;
  else if (line.status === LINE_STATUS.IDLE) actualMultiplier = 0.3 + Math.random() * 0.4;
  else if (line.status === LINE_STATUS.MAINTENANCE) actualMultiplier = 0.1 + Math.random() * 0.3;
  else actualMultiplier = 0;
  
  line.actualOutput = Math.floor(line.dailyTarget * actualMultiplier);
  line.efficiency = line.dailyTarget > 0 ? Math.round((line.actualOutput / line.dailyTarget) * 100) : 0;
  line.lastUpdated = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  
  renderProductionLines();
  showToast(`${line.id} status updated to ${line.status}`);
}

function showLineDetails(lineId) {
  const line = PRODUCTION_LINES.find(l => l.id === lineId);
  if (!line) return;
  
  const detailsHtml = `
    <div style="padding: 20px;">
      <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: var(--text); margin-bottom: 16px;">
        ${line.id} - Detailed View
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Line Number
          </div>
          <div style="font-size: 1rem; font-weight: 600; color: var(--text);">
            Line ${line.number}
          </div>
        </div>
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Status
          </div>
          <div style="font-size: 1rem; font-weight: 600; color: ${LINE_STATUS_COLORS[line.status]}">
            ${line.status}
          </div>
        </div>
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Supervisor
          </div>
          <div style="font-size: 1rem; font-weight: 600; color: var(--text);">
            ${line.supervisor}
          </div>
        </div>
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Workers
          </div>
          <div style="font-size: 1rem; font-weight: 600; color: var(--text);">
            ${line.workers} operators
          </div>
        </div>
      </div>
      
      <div style="background: rgba(196, 163, 90, 0.05); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h4 style="font-size: .7rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 12px;">
          Production Performance
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div>
            <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
              Daily Target
            </div>
            <div style="font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; color: var(--gold);">
              ${line.dailyTarget.toLocaleString()}
            </div>
            <div style="font-size: .7rem; color: var(--muted);">pieces</div>
          </div>
          <div>
            <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
              Actual Output
            </div>
            <div style="font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; color: var(--text);">
              ${line.actualOutput.toLocaleString()}
            </div>
            <div style="font-size: .7rem; color: var(--muted);">pieces</div>
          </div>
          <div>
            <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
              Efficiency
            </div>
            <div style="font-family: 'Bebas Neue', sans-serif; font-size: 1.6rem; color: ${line.efficiency >= 85 ? '#22A06B' : line.efficiency >= 70 ? '#C4A35A' : '#DC2626'};">
              ${line.efficiency}%
            </div>
            <div style="font-size: .7rem; color: var(--muted);">of target</div>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-outline" onclick="showToast('Detailed analytics for ${line.id} - coming soon')">
          Analytics
        </button>
        <button class="btn-primary" onclick="showToast('Closing details view')">
          Close
        </button>
      </div>
    </div>
  `;
  
  // Create a modal or use existing popup structure
  const popup = document.getElementById('plan-view-popup');
  const popupBody = document.getElementById('plan-view-body');
  
  if (popup && popupBody) {
    popupBody.innerHTML = detailsHtml;
    popup.classList.add('open');
  } else {
    // Fallback to alert if popup not available
    alert(`Line ${line.id} Details:\nStatus: ${line.status}\nSupervisor: ${line.supervisor}\nWorkers: ${line.workers}\nTarget: ${line.dailyTarget.toLocaleString()} pcs\nActual: ${line.actualOutput.toLocaleString()} pcs\nEfficiency: ${line.efficiency}%`);
  }
}

/* ══════════════════════════════════════════════════════════════
   ORDERS — data & functions
   ══════════════════════════════════════════════════════════════ */

const ORDERS = [
  {
    po:       'ASOS-PO-44521-A',
    client:   'ASOS',
    model:    'AM-0045',
    modelName:'Robe Satin Longue',
    season:   'SS26',
    issued:   '01 Apr 2026',
    delivery: '15 May 2026',
    qty:      2400,
    sizes:    'XS×240 / S×540 / M×720 / L×540 / XL×360',
    colours:  'Ivory',
    status:   'In Production',
    value:    46296,
    notes:    'Priority shipment. All cartons to be labelled per ASOS routing guide v3.2. AQL 2.5 required.',
    matrix: {
      sizes: ['S','M','L','XL'],
      rows: [
        { colour:'Ivory',     hex:'#F5F0E8', values:[240,320,240,200] },
        { colour:'Black',     hex:'#1A1A1A', values:[180,220,160,140] },
        { colour:'Navy',      hex:'#1B2A4A', values:[160,200,180,160] },
      ],
    },
    materials: [
      { name:'Satin Duchess — Ivory',    supplier:'Duchesse-Satin SA', req:'1,850 m', ordered:'1,850 m', received:'1,850 m', status:'In Stock'         },
      { name:'Satin Duchess — Black',    supplier:'Duchesse-Satin SA', req:'666 m',   ordered:'666 m',   received:'0 m',     status:'Awaiting Delivery' },
      { name:'Satin Duchess — Navy',     supplier:'Duchesse-Satin SA', req:'592 m',   ordered:'592 m',   received:'0 m',     status:'Awaiting Delivery' },
      { name:'Poly Lining',              supplier:'Poly-Tissu MA',     req:'2,280 m', ordered:'2,280 m', received:'2,280 m', status:'In Stock'          },
      { name:'YKK Zip 60 cm (concealed)',supplier:'YKK Morocco',       req:'2,400',   ordered:'2,400',   received:'1,200',   status:'Partial'           },
      { name:'Label Set (brand+care+sz)',supplier:'Etiquettes SA',     req:'2,400',   ordered:'2,400',   received:'0',       status:'On Order'          },
    ],
    progress: [
      { stage:'Fabric Cutting', done:450, total:1000, colour:'Ivory batch only' },
      { stage:'Sewing',         done:220, total:1000, colour:'Ivory batch only' },
      { stage:'Finishing / QC', done:80,  total:1000, colour:'Ivory batch only' },
      { stage:'Packing',        done:0,   total:2400, colour:'All colours'      },
    ],
    meetingNotes: [
      { date:'09 Apr 2026', author:'Soufiane', text:'Client confirmed Ivory is priority colourway. Black & Navy cutting to follow after Ivory QC clearance. AQL 2.5 mandatory — arrange third-party inspector.' },
      { date:'05 Apr 2026', author:'Karim',    text:'PP sample approved by ASOS buyer (ref PPAM0045-04). Production go-ahead confirmed. Ivory fabric in stock, bulk cutting started 01 Apr.' },
      { date:'01 Apr 2026', author:'Fatima',   text:'PO-44521-A received. Materials plan issued. Ivory fabric confirmed in stock. Black & Navy ordered from Duchesse-Satin SA — ETA 20 Apr 2026.' },
    ],
    cp: [
      { milestone:'Tech pack issued',           planned:'15 Jan 2026', actual:'15 Jan 2026', status:'Done',     owner:'Fatima'   },
      { milestone:'PP sample approval',         planned:'28 Mar 2026', actual:'28 Mar 2026', status:'Done',     owner:'Soufiane' },
      { milestone:'Fabric delivery — Ivory',    planned:'28 Mar 2026', actual:'20 Mar 2026', status:'Done',     owner:'Ahmed'    },
      { milestone:'Bulk cutting start — Ivory', planned:'01 Apr 2026', actual:'01 Apr 2026', status:'Done',     owner:'Karim'    },
      { milestone:'Bulk sewing start — Ivory',  planned:'10 Apr 2026', actual:'10 Apr 2026', status:'Done',     owner:'Karim'    },
      { milestone:'Fabric delivery — Blk/Navy', planned:'20 Apr 2026', actual:'',            status:'On Track', owner:'Ahmed'    },
      { milestone:'QC inline inspection',       planned:'25 Apr 2026', actual:'',            status:'Upcoming', owner:'Soufiane' },
      { milestone:'Final inspection (AQL 2.5)', planned:'05 May 2026', actual:'',            status:'Upcoming', owner:'Soufiane' },
      { milestone:'Export booking',             planned:'08 May 2026', actual:'',            status:'Upcoming', owner:'Fatima'   },
      { milestone:'Ex-factory',                 planned:'15 May 2026', actual:'',            status:'On Track', owner:'Soufiane' },
    ],
  },
  {
    po:       'ASOS-PO-44521-B',
    client:   'ASOS',
    model:    'AM-0045',
    modelName:'Robe Satin Longue',
    season:   'SS26',
    issued:   '05 Apr 2026',
    delivery: '30 Jun 2026',
    qty:      800,
    sizes:    'S×200 / M×280 / L×200 / XL×120',
    colours:  'Dusty Rose, Mauve, Blush',
    status:   'Confirmed',
    value:    15432,
    notes:    'Second colourway pack. Fabric ETA from supplier 20 Apr. Cutting to follow once PP for colourways approved.',
    matrix: {
      sizes: ['S','M','L','XL'],
      rows: [
        { colour:'Dusty Rose', hex:'#E8B4A0', values:[80,120,80,60]  },
        { colour:'Mauve',      hex:'#C4A0B8', values:[70,100,70,50]  },
        { colour:'Blush',      hex:'#F0D0C8', values:[50, 60,50,10]  },
      ],
    },
    materials: [
      { name:'Satin Duchess — Dusty Rose', supplier:'Duchesse-Satin SA', req:'296 m',  ordered:'296 m',  received:'0 m',  status:'On Order'          },
      { name:'Satin Duchess — Mauve',      supplier:'Duchesse-Satin SA', req:'555 m',  ordered:'555 m',  received:'0 m',  status:'On Order'          },
      { name:'Satin Duchess — Blush',      supplier:'Duchesse-Satin SA', req:'370 m',  ordered:'370 m',  received:'0 m',  status:'On Order'          },
      { name:'Poly Lining',                supplier:'Poly-Tissu MA',     req:'760 m',  ordered:'760 m',  received:'0 m',  status:'On Order'          },
      { name:'YKK Zip 60 cm (concealed)',  supplier:'YKK Morocco',       req:'800',    ordered:'800',    received:'0',    status:'On Order'           },
      { name:'Label Set (brand+care+sz)',  supplier:'Etiquettes SA',     req:'800',    ordered:'0',      received:'0',    status:'Awaiting Delivery' },
    ],
    progress: [
      { stage:'Fabric Cutting', done:0, total:800, colour:'All colours' },
      { stage:'Sewing',         done:0, total:800, colour:'All colours' },
      { stage:'Finishing / QC', done:0, total:800, colour:'All colours' },
      { stage:'Packing',        done:0, total:800, colour:'All colours' },
    ],
    meetingNotes: [
      { date:'05 Apr 2026', author:'Soufiane', text:'PO-44521-B received. Colourways confirmed: Dusty Rose, Mauve, Blush. Fabric ordered from Duchesse-Satin SA — ETA 20 Apr. PP approval for colourways required before cutting.' },
    ],
    cp: [
      { milestone:'PP sample approval (colourways)', planned:'28 Apr 2026', actual:'', status:'Upcoming', owner:'Soufiane' },
      { milestone:'Fabric delivery (all colours)',   planned:'20 Apr 2026', actual:'', status:'On Track', owner:'Ahmed'    },
      { milestone:'Bulk cutting start',              planned:'30 Apr 2026', actual:'', status:'Upcoming', owner:'Karim'    },
      { milestone:'Bulk sewing start',               planned:'10 May 2026', actual:'', status:'Upcoming', owner:'Karim'    },
      { milestone:'QC inline inspection',            planned:'10 Jun 2026', actual:'', status:'Upcoming', owner:'Soufiane' },
      { milestone:'Final inspection (AQL 2.5)',      planned:'20 Jun 2026', actual:'', status:'Upcoming', owner:'Soufiane' },
      { milestone:'Export booking',                  planned:'24 Jun 2026', actual:'', status:'Upcoming', owner:'Fatima'   },
      { milestone:'Ex-factory',                      planned:'30 Jun 2026', actual:'', status:'Upcoming', owner:'Soufiane' },
    ],
  },
];

/* ── KPI recalc ───────────────────────────────────────────────── */
function recalcOrderKPIs(data) {
  const totalUnits = data.reduce((s, o) => s + o.qty, 0);
  const totalValue = data.reduce((s, o) => s + o.value, 0);
  const inProd     = data.filter(o => o.status === 'In Production').length;
  document.getElementById('o-kpi-total').textContent  = data.length;
  document.getElementById('o-kpi-units').textContent  = totalUnits.toLocaleString();
  document.getElementById('o-kpi-inprod').textContent = inProd;
  document.getElementById('o-kpi-value').textContent  = '€' + totalValue.toLocaleString();
}

/* ── Render orders table ──────────────────────────────────────── */
function renderOrders(data) {
  const tbody = document.getElementById('o-tbody');
  const empty = document.getElementById('o-empty');
  const count = document.getElementById('o-count');

  count.textContent = `${data.length} order${data.length !== 1 ? 's' : ''}`;
  recalcOrderKPIs(data);

  if (!data.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    lucide.createIcons();
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(o => `
    <tr class="tbl-row" onclick="openOrder('${o.po}')">
      <td style="font-family:'Courier New',monospace;font-size:.78rem;font-weight:600;color:var(--text)">${o.po}</td>
      <td class="fw-600">${o.client}</td>
      <td>
        <span class="model-id" style="font-size:.9rem">${o.model}</span>
        <div style="font-size:.72rem;color:var(--muted);margin-top:1px">${o.modelName}</div>
      </td>
      <td><span class="badge badge-draft" style="background:#F0EDE8">${o.season}</span></td>
      <td class="muted-cell">${o.issued}</td>
      <td class="muted-cell">${o.delivery}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.02em">${o.qty.toLocaleString()}</td>
      <td><span class="badge ${STATUS_CLASS[o.status]||'badge-draft'}">${o.status}</span></td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:.02em;color:var(--gold)">€${o.value.toLocaleString()}</td>
    </tr>
  `).join('');
}

/* ── Filter orders ────────────────────────────────────────────── */
function filterOrders() {
  const q      = document.getElementById('o-search').value.toLowerCase().trim();
  const client = document.getElementById('o-client').value;
  const status = document.getElementById('o-status').value;
  const season = document.getElementById('o-season').value;

  const result = ORDERS.filter(o => {
    if (q && !o.po.toLowerCase().includes(q) &&
             !o.client.toLowerCase().includes(q) &&
             !o.model.toLowerCase().includes(q) &&
             !o.modelName.toLowerCase().includes(q)) return false;
    if (client && o.client !== client) return false;
    if (status && o.status !== status) return false;
    if (season && o.season !== season) return false;
    return true;
  });

  renderOrders(result);
  lucide.createIcons();
}

/* ── Export orders CSV ────────────────────────────────────────── */
/* ── Shared print-window helper ───────────────────────────────── */
function openPrintWin(docTitle, docMeta, bodyHtml) {
  const date = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const win  = window.open('', '_blank', 'width=1000,height=750');
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8">
  <title>${docTitle} — Ava Marie</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1A1814;padding:36px 40px;background:#fff}
    /* ── Header ── */
    .doc-hdr{display:flex;justify-content:space-between;align-items:flex-start;
      padding-bottom:14px;border-bottom:2.5px solid #C4A35A;margin-bottom:22px}
    .brand{font-size:21px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;
      color:#1A1814;font-family:'Arial Black',Arial,sans-serif}
    .brand em{color:#C4A35A;font-style:normal}
    .brand-sub{font-size:8.5px;color:#999;letter-spacing:.07em;margin-top:3px}
    .doc-info{text-align:right}
    .doc-title{font-size:14px;font-weight:700;text-transform:uppercase;
      letter-spacing:.1em;color:#1A1814}
    .doc-meta{font-size:9.5px;color:#888;margin-top:4px;line-height:1.5}
    /* ── Print bar ── */
    .print-bar{display:flex;gap:10px;align-items:center;margin-bottom:20px}
    .print-btn{padding:8px 22px;background:#C4A35A;color:#fff;border:none;border-radius:4px;
      font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
      cursor:pointer;font-family:Arial,sans-serif}
    .print-btn:hover{background:#A88430}
    /* ── Section headings ── */
    .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;
      color:#C4A35A;margin:22px 0 8px;padding-bottom:5px;border-bottom:1px solid #E8D5A3}
    .sec-title:first-child{margin-top:0}
    /* ── Table ── */
    table{width:100%;border-collapse:collapse;margin-bottom:4px}
    thead tr{background:#1A1814}
    th{padding:8px 11px;text-align:left;font-size:8.5px;font-weight:700;
      text-transform:uppercase;letter-spacing:.12em;color:#C4A35A;white-space:nowrap}
    td{padding:7px 11px;border-bottom:1px solid #EDEBE6;vertical-align:top;
      font-size:10.5px;line-height:1.45}
    tr:nth-child(even) td{background:#FAFAF8}
    tfoot td{font-weight:700;border-top:2px solid #C4A35A;background:#FEF9EC!important;
      font-size:11px}
    /* ── Footer ── */
    .doc-footer{text-align:center;font-size:8.5px;color:#bbb;
      margin-top:28px;padding-top:12px;border-top:1px solid #EDEBE6}
    @media print{.print-bar{display:none}}
  </style></head><body>
  <div class="doc-hdr">
    <div>
      <div class="brand">AVA <em>MARIE</em></div>
      <div class="brand-sub">Zone Industrielle, Tangier, Morocco &nbsp;·&nbsp; contact@avamarie.co</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-meta">${docMeta}<br>Generated ${date}</div>
    </div>
  </div>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">&#x1F5A8;&nbsp; Print / Save as PDF</button>
  </div>
  ${bodyHtml}
  <div class="doc-footer">Ava Marie ERP &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; Confidential</div>
  </body></html>`);
  win.document.close();
  win.focus();
}

function buildTable(headers, rows, footerRow) {
  const ths  = headers.map(h => `<th>${h}</th>`).join('');
  const tds  = rows.map(r =>
    `<tr>${r.map(c => `<td>${c == null ? '' : String(c)}</td>`).join('')}</tr>`
  ).join('');
  const foot = footerRow
    ? `<tfoot><tr>${footerRow.map(c => `<td>${c == null ? '' : c}</td>`).join('')}</tr></tfoot>`
    : '';
  return `<table><thead><tr>${ths}</tr></thead><tbody>${tds}</tbody>${foot}</table>`;
}

/* ── Orders export ────────────────────────────────────────────── */
function exportOrdersCSV() {
  const q      = document.getElementById('o-search').value.toLowerCase().trim();
  const client = document.getElementById('o-client').value;
  const status = document.getElementById('o-status').value;
  const season = document.getElementById('o-season').value;

  const data = ORDERS.filter(o => {
    if (q && !o.po.toLowerCase().includes(q) &&
             !o.client.toLowerCase().includes(q) &&
             !o.model.toLowerCase().includes(q)) return false;
    if (client && o.client !== client) return false;
    if (status && o.status !== status) return false;
    if (season && o.season !== season) return false;
    return true;
  });

  const headers = ['PO Number','Client','Model','Model Name','Season','Issued','Delivery','Qty','Colours','Status','Value (€)'];
  const rows    = data.map(o => [
    `<code>${o.po}</code>`, o.client, o.model, o.modelName, o.season,
    o.issued, o.delivery, o.qty.toLocaleString(), o.colours, o.status,
    `€ ${o.value.toLocaleString()}`,
  ]);
  const totalVal = data.reduce((a, o) => a + o.value, 0);
  const totalQty = data.reduce((a, o) => a + o.qty,   0);
  const foot = ['', '', '', '', '', '', `${data.length} orders`,
    totalQty.toLocaleString(), '', '<strong>TOTAL</strong>', `<strong>€ ${totalVal.toLocaleString()}</strong>`];

  const filters = [client, status, season].filter(Boolean).join(' · ') || 'All';
  openPrintWin('Orders', `${data.length} orders &nbsp;·&nbsp; Filter: ${filters}`,
    buildTable(headers, rows, foot));
  showToast(`Opened ${data.length} orders for print / PDF`);
}

/* ── Open order detail ────────────────────────────────────────── */
async function openOrder(po) {
  await loadView('order-detail');
  currentOrderPO = po;
  const o = ORDERS.find(x => x.po === po);
  if (!o) return;

  document.getElementById('sec-orders').classList.remove('active');
  document.getElementById('sec-order-detail').classList.add('active');
  document.getElementById('tb-title').textContent = o.po;
  document.getElementById('tb-icon').innerHTML = '<i data-lucide="clipboard-list"></i>';
  lucide.createIcons();
  document.getElementById('content').scrollTop = 0;

  /* ── Header card ── */
  document.getElementById('od-header').innerHTML = `
    <div>
      <div class="md-id-badge">${o.po}</div>
      <div class="md-model-name">${o.modelName}
        <span style="font-size:1rem;color:var(--muted);font-family:'DM Sans',sans-serif;font-weight:400">(${o.model})</span>
      </div>
      <div class="md-meta-row">
        <div><div class="md-meta-label">Client</div><div class="md-meta-value">${o.client}</div></div>
        <div><div class="md-meta-label">Season</div><div class="md-meta-value">${o.season}</div></div>
        <div><div class="md-meta-label">Issued</div><div class="md-meta-value">${o.issued}</div></div>
        <div><div class="md-meta-label">Delivery</div><div class="md-meta-value">${o.delivery}</div></div>
        <div><div class="md-meta-label">Colours</div><div class="md-meta-value">${o.colours}</div></div>
        <div><div class="md-meta-label">Status</div><div class="md-meta-value"><span class="badge ${STATUS_CLASS[o.status]||''}">${o.status}</span></div></div>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="md-cost-big">€${o.value.toLocaleString()}</div>
      <div class="md-cost-sub">${o.qty.toLocaleString()} units</div>
    </div>`;

  /* ── Export action bar ── */
  const actions = `
    <div class="od-actions">
      <button class="btn-outline" onclick="exportOrderCP('${po}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Export CP
      </button>
      <button class="btn-primary" onclick="printOrderCP()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print CP
      </button>
    </div>`;

  /* ── Style / Color / Size matrix ── */
  const mx = o.matrix;
  const sizeHeaders = mx.sizes.map(s =>
    `<th>${s}</th>`).join('') + '<th>Total</th>';

  const matrixRows = mx.rows.map((r, ri) => {
    const rowTotal = r.values.reduce((a,b) => a+b, 0);
    const cells = r.values.map((v, ci) =>
      `<td><input class="qty-input" type="number" min="0"
         data-po="${po}" data-row="${ri}" data-col="${ci}"
         value="${v}" oninput="recalcMatrix('${po}')"></td>`
    ).join('');
    return `<tr>
      <td><div class="colour-cell">
        <div class="colour-swatch" style="background:${r.hex}"></div>
        <span style="font-size:.82rem;font-weight:600">${r.colour}</span>
      </div></td>
      ${cells}
      <td class="row-total" id="rt-${po}-${ri}">${rowTotal.toLocaleString()}</td>
    </tr>`;
  }).join('');

  const colTotals = mx.sizes.map((_, ci) =>
    mx.rows.reduce((s, r) => s + r.values[ci], 0)
  );
  const grandTotal = colTotals.reduce((a,b) => a+b, 0);
  const footCells = colTotals.map((t, ci) =>
    `<td id="ct-${po}-${ci}">${t.toLocaleString()}</td>`).join('');

  const matrixHtml = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Style · Colour / Size Matrix</span>
        <span style="font-size:.78rem;font-weight:600;color:var(--muted)">
          Grand total: <span style="color:var(--gold);font-family:'Bebas Neue',sans-serif;font-size:1.1rem" id="gt-${po}">${grandTotal.toLocaleString()}</span> pcs
        </span>
      </div>
      <div style="overflow-x:auto">
        <table class="od-matrix">
          <thead><tr><th style="text-align:left">Colour</th>${sizeHeaders}</tr></thead>
          <tbody>${matrixRows}</tbody>
          <tfoot><tr><td>Total</td>${footCells}<td id="gt2-${po}">${grandTotal.toLocaleString()}</td></tr></tfoot>
        </table>
      </div>
    </div>`;

  /* ── Materials status ── */
  const MAT_CLS = { 'In Stock':'mat-instock','Awaiting Delivery':'mat-awaiting','Partial':'mat-partial','On Order':'mat-onorder' };
  const matRows = o.materials.map(m => `
    <tr class="tbl-row">
      <td class="fw-600">${m.name}</td>
      <td class="muted-cell">${m.supplier}</td>
      <td style="text-align:right">${m.req}</td>
      <td style="text-align:right">${m.ordered}</td>
      <td style="text-align:right">${m.received}</td>
      <td><span class="mat-status ${MAT_CLS[m.status]||'mat-onorder'}">${m.status}</span></td>
    </tr>`).join('');

  const matHtml = `
    <div class="sc">
      <div class="sc-head"><span class="sc-title">Material Status</span></div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Material</th><th>Supplier</th><th style="text-align:right">Required</th><th style="text-align:right">On Order</th><th style="text-align:right">Received</th><th>Status</th></tr></thead>
          <tbody>${matRows}</tbody>
        </table>
      </div>
    </div>`;

  /* ── Production progress ── */
  const progRows = o.progress.map(p => {
    const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
    const fillClass = pct === 100 ? 'done' : pct === 0 ? 'zero' : '';
    return `<div>
      <div class="prog-row-lbl">
        <div>
          <span class="prog-stage">${p.stage}</span>
          <span style="font-size:.7rem;color:var(--muted2);margin-left:6px">${p.colour}</span>
        </div>
        <span class="prog-count">${p.done.toLocaleString()} / ${p.total.toLocaleString()} pcs &nbsp; <span style="color:var(--gold)">${pct}%</span></span>
      </div>
      <div class="prog-track"><div class="prog-fill ${fillClass}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  const progHtml = `
    <div class="sc">
      <div class="sc-head"><span class="sc-title">Production Progress</span></div>
      <div class="prog-section">${progRows}</div>
    </div>`;

  /* ── Meeting notes ── */
  const noteCards = o.meetingNotes.map(n => `
    <div class="note-card">
      <div class="note-head">
        <span class="note-author">${n.author}</span>
        <span class="note-date">${n.date}</span>
      </div>
      <div class="note-text">${n.text}</div>
    </div>`).join('');

  const notesHtml = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Meeting Notes &mdash; ${o.meetingNotes.length} entries</span>
      </div>
      <div id="note-list-${po}">${noteCards}</div>
      <div class="note-add-wrap">
        <textarea class="note-add-input" id="note-input-${po}"
          placeholder="Add a meeting note, decision, or client instruction…"></textarea>
        <button class="btn-primary" style="font-size:.7rem;padding:7px 14px"
          onclick="addMeetingNote('${po}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Note
        </button>
      </div>
    </div>`;

  document.getElementById('od-body').innerHTML = actions + matrixHtml + matHtml + progHtml + notesHtml;
}

/* ── Recalculate matrix totals ────────────────────────────────── */
function recalcMatrix(po) {
  const o = ORDERS.find(x => x.po === po);
  if (!o) return;
  const nRows = o.matrix.rows.length;
  const nCols = o.matrix.sizes.length;

  let grand = 0;
  /* row totals */
  for (let ri = 0; ri < nRows; ri++) {
    let rowSum = 0;
    for (let ci = 0; ci < nCols; ci++) {
      const inp = document.querySelector(`.qty-input[data-po="${po}"][data-row="${ri}"][data-col="${ci}"]`);
      rowSum += inp ? (parseInt(inp.value) || 0) : 0;
    }
    const rt = document.getElementById(`rt-${po}-${ri}`);
    if (rt) rt.textContent = rowSum.toLocaleString();
    grand += rowSum;
  }
  /* column totals */
  for (let ci = 0; ci < nCols; ci++) {
    let colSum = 0;
    for (let ri = 0; ri < nRows; ri++) {
      const inp = document.querySelector(`.qty-input[data-po="${po}"][data-row="${ri}"][data-col="${ci}"]`);
      colSum += inp ? (parseInt(inp.value) || 0) : 0;
    }
    const ct = document.getElementById(`ct-${po}-${ci}`);
    if (ct) ct.textContent = colSum.toLocaleString();
  }
  /* grand total */
  ['gt-'+po, 'gt2-'+po].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = grand.toLocaleString();
  });
}

/* ── Add meeting note ─────────────────────────────────────────── */
function addMeetingNote(po) {
  const o = ORDERS.find(x => x.po === po);
  if (!o) return;
  const inp = document.getElementById('note-input-' + po);
  const text = inp ? inp.value.trim() : '';
  if (!text) { showToast('Please type a note first.'); return; }

  const today = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const user  = sessionStorage.getItem('erp_user') || 'User';
  const note  = { date: today, author: user.charAt(0).toUpperCase() + user.slice(1), text };

  o.meetingNotes.unshift(note);

  const newCard = document.createElement('div');
  newCard.className = 'note-card';
  newCard.style.background = 'rgba(196,163,90,.04)';
  newCard.innerHTML = `
    <div class="note-head">
      <span class="note-author">${note.author}</span>
      <span class="note-date">${note.date}</span>
    </div>
    <div class="note-text">${note.text}</div>`;

  const list = document.getElementById('note-list-' + po);
  if (list) list.prepend(newCard);

  inp.value = '';
  showToast('Note added');
}

/* ── Export CP as Excel (CSV) ─────────────────────────────────── */
function exportOrderCP(po) {
  const o = ORDERS.find(x => x.po === po);
  if (!o || !o.cp) return;

  /* Section 1: Critical Path */
  const cpRows = o.cp.map(r => [r.milestone, r.planned, r.actual||'—', r.status, r.owner]);
  const cpTable = buildTable(
    ['Milestone','Planned Date','Actual Date','Status','Owner'],
    cpRows
  );

  /* Section 2: Size Matrix */
  const mxHeader = ['Colour', ...o.matrix.sizes, 'Total'];
  const mxRows = o.matrix.rows.map(r => {
    const inputs = document.querySelectorAll(`.qty-input[data-po="${po}"][data-row="${o.matrix.rows.indexOf(r)}"]`);
    const vals   = inputs.length ? [...inputs].map(i => parseInt(i.value)||0) : r.values;
    return [r.colour, ...vals, vals.reduce((a,b)=>a+b,0)];
  });
  const totalsBySize = o.matrix.sizes.map((_, si) => mxRows.reduce((a, r) => a + (r[si+1]||0), 0));
  const mxFoot = ['<strong>TOTAL</strong>', ...totalsBySize, totalsBySize.reduce((a,b)=>a+b,0)];
  const mxTable = buildTable(mxHeader, mxRows, mxFoot);

  /* Section 3: Materials Status */
  const matRows = o.materials.map(m => [m.name, m.supplier, m.req, m.ordered, m.received, m.status]);
  const matTable = buildTable(
    ['Material','Supplier','Required','On Order','Received','Status'],
    matRows
  );

  const body = `
    <p class="doc-meta">${o.modelName} &middot; ${o.client} &middot; ${o.season} &middot; Delivery: ${o.delivery}</p>
    <h3 class="sec-title">Critical Path</h3>${cpTable}
    <h3 class="sec-title" style="margin-top:24px">Style / Colour / Size Matrix</h3>${mxTable}
    <h3 class="sec-title" style="margin-top:24px">Material Status</h3>${matTable}
  `;

  openPrintWin(`Critical Path — ${po}`, `${o.modelName} · ${o.client} · Delivery: ${o.delivery}`, body);
  showToast(`Opened Critical Path for ${po}`);
}

/* ── Print CP as PDF ──────────────────────────────────────────── */
function printOrderCP() {
  exportOrderCP(currentOrderPO);
}

/* ── Close order detail ───────────────────────────────────────── */
function closeOrder() { navTo('orders'); }

/* ── Render models table ──────────────────────────────────────── */
function renderModels(data) {
  const tbody = document.getElementById('m-tbody');
  const empty = document.getElementById('m-empty');
  const count = document.getElementById('m-count');

  count.textContent = `${data.length} model${data.length !== 1 ? 's' : ''}`;

  if (!data.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    lucide.createIcons();
    return;
  }
  empty.style.display = 'none';

  // Image mapping for models
  const modelImages = {
    'AM-0045': '../Manufacturing/1.webp',
    'AM-0052': '../Manufacturing/2.png',
    'AM-0039': '../Manufacturing/3.jpg',
    'AM-0060': '../Manufacturing/4.jpeg',
    'AM-0061': '../Manufacturing/5.jpg'
  };

  tbody.innerHTML = data.map(m => {
    const imageUrl = modelImages[m.id] || '../Manufacturing/1.webp';
    const costDisplay = m.cost !== null ? 
      (RBAC.canViewFinancial() ? '€' + m.cost.toFixed(2) : '<span style="color:var(--muted2)">Restricted</span>') : 
      '<span style="color:var(--muted2)">—</span>';
    
    return `
    <tr class="tbl-row" onclick="openModel('${m.id}')">
      <td style="padding:8px 14px;vertical-align:middle">
        <div style="width:60px;height:60px;border-radius:4px;overflow:hidden;border:1px solid var(--border);background:#FAFAF8;display:flex;align-items:center;justify-content:center">
          <img src="${imageUrl}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNGNUYzRUYiLz48cGF0aCBkPSJNMzAgMjJDMjYuMTM0IDIyIDIzIDI1LjEzNCAyMyAyOVMyNi4xMzQgMzYgMzAgMzZTMzcgMzIuODY2IDM3IDI5UzMzLjg2NiAyMiAzMCAyMlpNMzAgMzRDMjcuMjM5IDM0IDI1IDMxLjc2MSAyNSAyOVMyNy4yMzkgMjQgMzAgMjRTMzUgMjYuMjM5IDM1IDI5UzMyLjc2MSAzNCAzMCAzNFpNNDAgNDJIMjBDMTcuNzkxIDQyIDE2IDQwLjIwOSAxNiAzOFYyMEMxNiAxNy43OTEgMTcuNzkxIDE2IDIwIDE2SDQwQzQyLjIwOSAxNiA0NCAxNy43OTEgNDQgMjBWMzhDNDQgNDAuMjA5IDQyLjIwOSA0MiA0MCA0MlpNMjAgMThDMTguODk2IDE4IDE4IDE4Ljg5NiAxOCAyMFYzOEMxOCAzOS4xMDQgMTguODk2IDQwIDIwIDQwSDQwQzQxLjEwNCA0MCA0MiAzOS4xMDQgNDIgMzhWMjBDNDIgMTguODk2IDQxLjEwNCAxOCA0MCAxOEgyMFoiIGZpbGw9IiNEN0Q0Q0MiLz48L3N2Zz4='">
        </div>
      </td>
      <td><span class="model-id">${m.id}</span></td>
      <td class="fw-600">${m.name}</td>
      <td>${m.client}</td>
      <td class="ref-cell">${m.ref}</td>
      <td>${m.cat}</td>
      <td style="text-align:center" class="fw-600">${m.rev}</td>
      <td><span class="badge ${STATUS_CLASS[m.status]||''}">${m.status}</span></td>
      <td class="cost-cell">${costDisplay}</td>
      <td class="muted-cell">${m.updated}</td>
    </tr>
    `;
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

/* ── Export Models (print window) ────────────────────────────── */
function exportModelsCSV() {
  const q      = document.getElementById('m-search').value.toLowerCase().trim();
  const client = document.getElementById('m-client').value;
  const status = document.getElementById('m-status').value;
  const cat    = document.getElementById('m-cat').value;

  const data = MODELS.filter(m => {
    if (q && !m.id.toLowerCase().includes(q) &&
             !m.name.toLowerCase().includes(q) &&
             !m.ref.toLowerCase().includes(q)) return false;
    if (client && m.client !== client) return false;
    if (status && m.status !== status) return false;
    if (cat    && m.cat    !== cat)    return false;
    return true;
  });

  const filters = [
    q      ? `Search: "${q}"` : '',
    client ? `Client: ${client}` : '',
    status ? `Status: ${status}` : '',
    cat    ? `Category: ${cat}` : '',
  ].filter(Boolean).join(' · ') || 'All models';

  const rows = data.map(m => [
    `<code>${m.id}</code>`, m.name, m.client, m.ref, m.cat, `Rev ${m.rev}`, m.status,
    m.cost !== null ? `€ ${m.cost.toFixed(2)}` : '—', m.updated,
  ]);

  openPrintWin(
    'Models',
    `${data.length} model${data.length!==1?'s':''} · ${filters}`,
    buildTable(['Model #','Name','Client','Client Ref','Category','Revision','Status','Cost/pc','Updated'], rows)
  );
  showToast(`Opened ${data.length} model${data.length!==1?'s':''} for print / PDF`);
}

/* ══════════════════════════════════════════════════════════════
   MODEL DETAIL — data & render
   ══════════════════════════════════════════════════════════════ */

const MD = {
  'AM-0045': {

    /* ── Tab 5 · Revisions ─────────────────────────────────── */
    revisions: [
      {
        rev: 1, date: '15 Jan 2026', author: 'Fatima', latest: false,
        summary: 'Initial tech pack received. Fabric spec confirmed as 100% poly satin duchess. Basic silhouette drafted and costed.',
        changes: ['Tech pack uploaded — AM-0045-TP-r1.pdf', 'Fabric confirmed: satin duchess 100% poly', 'Initial SMV estimate: 22.4 min', 'BOM drafted — 8 components'],
      },
      {
        rev: 2, date: '04 Feb 2026', author: 'Soufiane', latest: false,
        summary: 'Neckline adjusted from square to subtle V following proto session. Sleeve length extended +2 cm per fit notes.',
        changes: ['Neckline: square → subtle V (−1.5 cm depth)', 'Sleeve length +2 cm', 'SMV revised to 24.2 min', 'BOM updated — fabric consumption +0.06 m'],
      },
      {
        rev: 3, date: '18 Feb 2026', author: 'Karim', latest: false,
        summary: 'Back vent removed at client request. Zip upgraded from generic to YKK concealed 60 cm for cleaner finish.',
        changes: ['Back vent removed', 'Zip: generic invisible → YKK concealed 60 cm', 'BOM updated — zip unit cost +€0.18', 'Seam allowance at CB zip increased to 1.5 cm'],
      },
      {
        rev: 4, date: '28 Mar 2026', author: 'Soufiane', latest: true,
        summary: 'Size grading finalised across XS–XL. PP sample approved by ASOS buyer. Production go-ahead issued.',
        changes: ['Size grading finalised XS–XL (base M)', 'PP sample approved — ASOS ref PPAM0045-04', 'Final SMV locked: 24.6 min', 'Status changed → In Production'],
      },
    ],

    /* ── Tab 6 · Samples ───────────────────────────────────── */
    samples: [
      {
        type: 'Proto', cssClass: 's-rejected', badgeClass: 'sb-rejected', statusLabel: 'Rejected',
        rev: 1, date: '28 Jan 2026',
        feedback: 'Bust ease 4 cm too tight in size M. Zip placket visible — top-stitching not concealed. Neckline sits 1.5 cm too low. Full recut required before next submission.',
      },
      {
        type: 'Fit Sample', cssClass: 's-changes', badgeClass: 'sb-changes', statusLabel: 'Approved with Changes',
        rev: 2, date: '20 Feb 2026',
        feedback: 'Good improvement overall. Approved conditional on: neckline raised 1 cm, sleeve shortened 1.5 cm, seam allowance at CB zip increased to 1.5 cm. Resubmit corrected size set.',
      },
      {
        type: 'Size Set', cssClass: 's-pending', badgeClass: 'sb-pending', statusLabel: 'Pending',
        rev: 3, date: '10 Mar 2026',
        feedback: 'Submitted to ASOS buyer 10 Mar 2026. All sizes graded from approved Fit Sample (base M). Awaiting client sign-off — chased 24 Mar, response pending.',
      },
      {
        type: 'PP Sample', cssClass: 's-noprod', badgeClass: 'sb-noprod', statusLabel: 'Not Produced',
        rev: 4, date: null,
        feedback: '',
      },
      {
        type: 'TOP Sample', cssClass: 's-noprod', badgeClass: 'sb-noprod', statusLabel: 'Not Produced',
        rev: 4, date: null,
        feedback: '',
      },
    ],

    /* ── Tab 7 · Linked Orders ─────────────────────────────── */
    orders: [
      {
        po: 'ASOS-PO-44521-A',
        issued:   '01 Apr 2026',
        delivery: '15 May 2026',
        qty: 2400,
        sizes: 'XS×240 / S×540 / M×720 / L×540 / XL×360',
        status: 'In Production',
        value: 46296,
      },
      {
        po: 'ASOS-PO-44521-B',
        issued:   '05 Apr 2026',
        delivery: '30 Jun 2026',
        qty: 800,
        sizes: 'S×200 / M×280 / L×200 / XL×120',
        status: 'Confirmed',
        value: 15432,
      },
    ],

    /* ── Tab 8 · Audit ─────────────────────────────────────── */
    audit: [
      {
        ts: '28 Mar 2026, 14:32', user: 'Soufiane',
        action: 'STATUS CHANGE',
        detail: 'Status changed: Confirmed → In Production following PP sign-off',
      },
      {
        ts: '28 Mar 2026, 14:28', user: 'Soufiane',
        action: 'APPROVED',
        detail: 'Rev.4 PP sample approved — ASOS buyer ref PPAM0045-04',
      },
      {
        ts: '18 Feb 2026, 10:15', user: 'Karim',
        action: 'REVISION',
        detail: 'Rev.3 created — back vent removed, zip upgraded to YKK concealed 60 cm',
      },
      {
        ts: '15 Feb 2026, 16:42', user: 'Ahmed',
        action: 'UPLOADED',
        detail: 'Tech pack Rev.3 uploaded — AM-0045-TP-r3.pdf (2.4 MB)',
      },
      {
        ts: '04 Feb 2026, 09:20', user: 'Soufiane',
        action: 'REVISION',
        detail: 'Rev.2 created — neckline adjusted to subtle V, sleeve +2 cm, SMV revised to 24.2 min',
      },
      {
        ts: '28 Jan 2026, 11:55', user: 'Soufiane',
        action: 'REJECTED',
        detail: 'Proto sample (Rev.1) rejected — bust ease 4 cm too tight, zip placket visible, neckline 1.5 cm low',
      },
      {
        ts: '15 Jan 2026, 08:00', user: 'Fatima',
        action: 'CREATED',
        detail: 'Model AM-0045 created — initial tech pack uploaded, BOM drafted (8 components)',
      },
    ],
  },
};

/* ── Image Gallery Functions ──────────────────────────────────── */
const ImageGallery = {
  currentIndex: 0,
  images: [
    { src: '../Manufacturing/1.webp', title: 'Front view - Main sample', description: 'Primary sample showing front silhouette' },
    { src: '../Manufacturing/2.png', title: 'Back view', description: 'Back view with zip detail' },
    { src: '../Manufacturing/3.jpg', title: 'Side view', description: 'Side profile showing drape' },
    { src: '../Manufacturing/4.jpeg', title: 'Detail - Neckline', description: 'Close-up of neckline construction' },
    { src: '../Manufacturing/5.jpg', title: 'Detail - Sleeve', description: 'Sleeve attachment and finish' },
    { src: '../Manufacturing/6.jfif', title: 'Technical sketch', description: 'Technical flat sketch' },
    { src: '../Manufacturing/7.png', title: 'Fabric swatch', description: 'Fabric sample and texture' },
    { src: '../Manufacturing/8.jpg', title: 'Label detail', description: 'Brand and care label placement' }
  ],
  
  init: function() {
    this.renderThumbnails();
    this.updateMainImage();
  },
  
  renderThumbnails: function() {
    const container = document.getElementById('thumbnail-strip');
    if (!container) return;
    
    container.innerHTML = this.images.map((img, index) => `
      <div class="thumbnail ${index === this.currentIndex ? 'active' : ''}" onclick="ImageGallery.selectImage(${index})">
        <img src="${img.src}" alt="${img.title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNGNUYzRUYiLz48cGF0aCBkPSJNMzAgMzJDMjYuMTM0IDMyIDIzIDM1LjEzNCAyMyAzOVMyNi4xMzQgNDYgMzAgNDZTMzcgNDIuODY2IDM3IDM5UzMzLjg2NiAzMiAzMCAzMlpNMzAgNDRDMjcuMjM5IDQ0IDI1IDQxLjc2MSAyNSAzOVMyNy4yMzkgMzQgMzAgMzRTMzUgMzYuMjM5IDM1IDM5UzMyLjc2MSA0NCAzMCA0NFpNNTAgNTJIMzBDMjcuNzkxIDUyIDI2IDUwLjIwOSAyNiA0OFYzMEMyNiAyNy43OTEgMjcuNzkxIDI2IDMwIDI2SDUwQzUyLjIwOSAyNiA1NCAyNy43OTEgNTQgMzBWNDhDNTQgNTAuMjA5IDUyLjIwOSA1MiA1MCA1MlpNMzAgMjhDMjguODk2IDI4IDI4IDI4Ljg5NiAyOCAzMFY0OEMyOCA0OS4xMDQgMjguODk2IDUwIDMwIDUwSDUwQzUxLjEwNCA1MCA1MiA0OS4xMDQgNTIgNDhWMzBDNTIgMjguODk2IDUxLjEwNCAyOCA1MCAyOEgzMFoiIGZpbGw9IiNEN0Q0Q0MiLz48L3N2Zz4='">
      </div>
    `).join('');
  },
  
  updateMainImage: function() {
    const mainImg = document.getElementById('main-image');
    const counter = document.getElementById('gallery-counter');
    const description = document.getElementById('image-description');
    const loading = document.getElementById('image-loading');
    
    if (!mainImg || !counter || !description) return;
    
    const currentImg = this.images[this.currentIndex];
    counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
    description.textContent = currentImg.title;
    
    // Show loading
    if (loading) loading.style.display = 'flex';
    
    // Load image
    const img = new Image();
    img.onload = () => {
      mainImg.src = currentImg.src;
      mainImg.alt = currentImg.title;
      if (loading) loading.style.display = 'none';
    };
    img.onerror = () => {
      mainImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNGNUYzRUYiLz48cGF0aCBkPSJNMjAwIDE2MEMxNjUuMzcyIDE2MCAxMzggMTg3LjM3MiAxMzggMjIyUzE2NS4zNzIgMjg0IDIwMCAyODRTMjYyIDI1Ni42MjggMjYyIDIyMlMyMzQuNjI4IDE2MCAyMDAgMTYwWk0yMDAgMjcyQzE3Mi4zODYgMjcyIDE1MCAyNDkuNjE0IDE1MCAyMjJTMTcyLjM4NiAxNzIgMjAwIDE3MlMyNTAgMTk0LjM4NiAyNTAgMjIyUzIyNy42MTQgMjcyIDIwMCAyNzJaTTQwMCAzMjBIMjAwQzE2NS4zNzIgMzIwIDEzOCAyOTIuNjI4IDEzOCAyNThWMjIyQzEzOCAxODcuMzcyIDE2NS4zNzIgMTYwIDIwMCAxNjBINDAwQzQzNC42MjggMTYwIDQ2MiAxODcuMzcyIDQ2MiAyMjJWMjU4QzQ2MiAyOTIuNjI4IDQzNC42MjggMzIwIDQwMCAzMjBaTTIwMCAxODJDMTc0LjM4NiAxODIgMTU0IDIwMi4zODYgMTU0IDIyOFYyNThDMTU0IDI4My42MTQgMTc0LjM4NiAzMDQgMjAwIDMwNEg0MDBDNDI1LjYxNCAzMDQgNDQ2IDI4My42MTQgNDQ2IDI1OFYyMjhDNDQ2IDIwMi4zODYgNDI1LjYxNCAxODIgNDAwIDE4MkgyMDBaIiBmaWxsPSIjRDdENENCIi8+PC9zdmc+';
      mainImg.alt = 'Image not available';
      if (loading) loading.style.display = 'none';
    };
    img.src = currentImg.src;
    
    // Update thumbnails
    this.renderThumbnails();
  },
  
  selectImage: function(index) {
    this.currentIndex = index;
    this.updateMainImage();
  },
  
  next: function() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateMainImage();
  },
  
  prev: function() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateMainImage();
  }
};

// Global functions for button clicks
function nextImage() { ImageGallery.next(); }
function prevImage() { ImageGallery.prev(); }
function rotateImage() {
  const img = document.getElementById('main-image');
  if (!img) return;
  
  const currentRotation = parseInt(img.style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
  const newRotation = currentRotation + 90;
  img.style.transform = `rotate(${newRotation}deg)`;
  img.style.transition = 'transform 0.3s ease';
  
  showToast(`Image rotated ${newRotation}°`);
}
function downloadImage() {
  const currentImg = ImageGallery.images[ImageGallery.currentIndex];
  showToast(`Downloading: ${currentImg.title}`);
  // In a real implementation, this would trigger a download
  // For now, we'll just show a toast
}

/* ── Open model detail ────────────────────────────────────────── */
async function openModel(id) {
  await loadView('model-detail');
  const m = MODELS.find(x => x.id === id);
  if (!m) return;

  /* hide models list, show detail */
  document.getElementById('sec-models').classList.remove('active');
  const det = document.getElementById('sec-model-detail');
  det.classList.add('active');

  /* reset to first tab */
  document.querySelectorAll('.md-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.md-tab[data-pane="md-overview"]').classList.add('active');
  document.querySelectorAll('.md-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('md-overview').classList.add('active');

  /* topbar */
  document.getElementById('tb-title').textContent = m.id + ' — ' + m.name;
  document.getElementById('tb-icon').innerHTML = '<i data-lucide="shirt"></i>';
  lucide.createIcons();

  /* scroll top */
  document.getElementById('content').scrollTop = 0;

  /* Initialize image gallery */
  ImageGallery.init();

  /* header card */
  const sm = STATUS_CLASS[m.status] || '';
  const costDisplay = m.cost !== null ? 
    (RBAC.canViewFinancial() ? '€' + m.cost.toFixed(2) : '<span style="color:var(--muted2)">Restricted</span>') : 
    '<span style="color:var(--muted2)">—</span>';
  
  document.getElementById('md-header').innerHTML = `
    <div>
      <div class="md-id-badge">${m.id}</div>
      <div class="md-model-name">${m.name}</div>
      <div class="md-meta-row">
        <div><div class="md-meta-label">Client</div><div class="md-meta-value">${m.client}</div></div>
        <div><div class="md-meta-label">Client Ref</div><div class="md-meta-value" style="font-family:'Courier New',monospace;font-size:.78rem">${m.ref}</div></div>
        <div><div class="md-meta-label">Category</div><div class="md-meta-value">${m.cat}</div></div>
        <div><div class="md-meta-label">Revision</div><div class="md-meta-value">Rev.${m.rev}</div></div>
        <div><div class="md-meta-label">Status</div><div class="md-meta-value"><span class="badge ${sm}">${m.status}</span></div></div>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="md-cost-big">${costDisplay}</div>
      <div class="md-cost-sub">cost / piece</div>
    </div>
  `;

  /* render all panes */
  renderMdOverview(m);
  renderMdBom(m);
  renderMdGamme(m);
  renderMdPom(m);
  renderMdSamples(id);
  renderMdAudit(id);
  lucide.createIcons();
}

/* ── Close model detail ───────────────────────────────────────── */
function closeModel() { navTo('models'); }

/* ── Tab switcher ─────────────────────────────────────────────── */
function setMdTab(btn) {
  document.querySelectorAll('.md-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const pane = btn.dataset.pane;
  document.querySelectorAll('.md-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(pane).classList.add('active');
}

/* ── Helper: empty pane ───────────────────────────────────────── */
function emptyPane(msg) {
  return `<div class="sc" style="padding:52px 0;text-align:center">
    <p style="font-size:.82rem;color:var(--muted)">${msg}</p>
  </div>`;
}

/* ── Tab 1 · Overview ─────────────────────────────────────────── */
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
          ['Last Updated', m.updated],
          ['Updated By', m.updatedBy],
          ['Cost / Piece', m.cost !== null ? (RBAC.canViewFinancial() ? '€' + m.cost.toFixed(2) : '<span style="color:var(--muted2)">Restricted</span>') : '—'],
        ].map(([l,v]) => `
          <div style="padding:16px 22px;border-right:1px solid #F0EDE8">
            <div style="font-size:.6rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted2);margin-bottom:4px">${l}</div>
            <div style="font-size:.88rem;font-weight:600;color:var(--text)">${v}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ── Tab 2 · BOM (Bill of Materials) ─────────────────────────── */
function renderMdBom(m) {
  // Sample BOM data for AM-0045
  const bomData = {
    'AM-0045': {
      sections: [
        {
          name: 'Main Fabric',
          items: [
            { id: 'FAB-001', name: 'Satin Duchess Ivory', supplier: 'Duchesse-Satin SA', unit: 'm', qty: 1.85, unitCost: 3.20, totalCost: 5.92, notes: '100% poly, 140 gsm' },
            { id: 'FAB-002', name: 'Poly Lining Ivory', supplier: 'Poly-Tissu MA', unit: 'm', qty: 0.95, unitCost: 0.85, totalCost: 0.81, notes: '100% poly, 80 gsm' }
          ]
        },
        {
          name: 'Trims & Notions',
          items: [
            { id: 'TRM-001', name: 'YKK Zip 60cm Concealed', supplier: 'YKK Morocco', unit: 'pcs', qty: 1, unitCost: 0.63, totalCost: 0.63, notes: 'Color: Ivory' },
            { id: 'TRM-002', name: 'Hook & Bar Set', supplier: 'Métal Plus', unit: 'pcs', qty: 1, unitCost: 0.08, totalCost: 0.08, notes: 'Nickel finish' },
            { id: 'TRM-003', name: 'Label Set (Brand+Care+Size)', supplier: 'Etiquettes SA', unit: 'set', qty: 1, unitCost: 0.22, totalCost: 0.22, notes: 'Woven, Ivory thread' }
          ]
        },
        {
          name: 'Packaging',
          items: [
            { id: 'PKG-001', name: 'Polybag 50x70cm', supplier: 'PackPro', unit: 'pcs', qty: 1, unitCost: 0.12, totalCost: 0.12, notes: 'Self-seal, clear' },
            { id: 'PKG-002', name: 'Velvet Hanger', supplier: 'HangMa', unit: 'pcs', qty: 1, unitCost: 0.18, totalCost: 0.18, notes: 'Non-slip, gold hook' }
          ]
        }
      ]
    }
  };

  const bom = bomData[m.id] || { sections: [] };
  
  if (bom.sections.length === 0) {
    document.getElementById('md-bom').innerHTML = emptyPane('No BOM data available for this model.');
    return;
  }

  // Calculate total cost
  let totalCost = 0;
  bom.sections.forEach(section => {
    section.items.forEach(item => {
      totalCost += item.totalCost;
    });
  });

  const sectionsHtml = bom.sections.map(section => {
    const itemsHtml = section.items.map(item => {
      const costDisplay = RBAC.canViewFinancial() ? 
        `€${item.totalCost.toFixed(2)}` : 
        '<span style="color:var(--muted2)">Restricted</span>';
      
      return `
        <tr class="tbl-row" data-item-id="${item.id}">
          <td style="padding-left: 24px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn-sm" onclick="deleteBomItem('${item.id}')" style="padding: 2px 6px; font-size: .6rem;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <span class="fw-600">${item.name}</span>
            </div>
          </td>
          <td class="muted-cell">${item.supplier}</td>
          <td style="text-align:center">${item.unit}</td>
          <td style="text-align:right">
            <input type="number" min="0" step="0.01" value="${item.qty}" 
                   style="width: 70px; text-align: right; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
                   onchange="updateBomItem('${item.id}', 'qty', this.value)">
          </td>
          <td style="text-align:right">
            ${RBAC.canViewFinancial() ? 
              `<input type="number" min="0" step="0.01" value="${item.unitCost}" 
                     style="width: 70px; text-align: right; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
                     onchange="updateBomItem('${item.id}', 'unitCost', this.value)">` :
              '<span style="color:var(--muted2)">Restricted</span>'}
          </td>
          <td class="cost-cell">${costDisplay}</td>
          <td class="muted-cell" style="font-size: .7rem;">${item.notes}</td>
        </tr>`;
    }).join('');

    return `
      <tr style="background: #FAFAF8;">
        <td colspan="7" style="padding: 10px 20px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="sc-title">${section.name}</span>
            <button class="btn-sm" onclick="addBomItem('${section.name}')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Item
            </button>
          </div>
        </td>
      </tr>
      ${itemsHtml}`;
  }).join('');

  const totalDisplay = RBAC.canViewFinancial() ? 
    `€${totalCost.toFixed(2)}` : 
    '<span style="color:var(--muted2)">Restricted</span>';

  document.getElementById('md-bom').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Bill of Materials — Dynamic Table</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">${totalDisplay}</span>
          <button class="btn-primary" onclick="exportBom('${m.id}')" style="font-size: .7rem; padding: 6px 12px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export BOM
          </button>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Component</th>
              <th>Supplier</th>
              <th style="text-align:center">Unit</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Unit Cost</th>
              <th style="text-align:right">Total Cost</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sectionsHtml}
            <tr style="background: #FFFDF7; border-top: 2px solid rgba(196,163,90,.15);">
              <td colspan="5" style="padding: 12px 20px; font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted);">
                Total Materials Cost
              </td>
              <td class="cost-cell" style="padding: 12px 20px; font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold);">
                ${totalDisplay}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// BOM helper functions
function updateBomItem(itemId, field, value) {
  showToast(`Updated ${field} for item ${itemId}: ${value}`);
  // In a real implementation, this would update the data store
}

function deleteBomItem(itemId) {
  if (confirm('Delete this BOM item?')) {
    showToast(`Deleted BOM item ${itemId}`);
    // In a real implementation, this would remove from data store
  }
}

function addBomItem(sectionName) {
  showToast(`Add new item to ${sectionName} section`);
  // In a real implementation, this would show a form to add new item
}

function exportBom(modelId) {
  showToast(`Exporting BOM for ${modelId}...`);
  // In a real implementation, this would generate and download CSV/PDF
}

/* ── Tab 3 · GAMME (Operations Routing) ──────────────────────── */
function renderMdGamme(m) {
  // Sample GAMME data for AM-0045
  const gammeData = {
    'AM-0045': {
      operations: [
        { op: '010', name: 'Mark & Bundle', machine: 'Manual', level: '★', smv: 2.5, pph: 24, operators: 1, machines: 0, notes: 'Manual marking and bundling' },
        { op: '020', name: 'Shoulder seams (× 2)', machine: 'Overlock 5-thread', level: '★★', smv: 1.8, pph: 33, operators: 1, machines: 1, notes: 'SNLS machine' },
        { op: '030', name: 'Side seams + lining side seams', machine: 'Overlock 5-thread', level: '★★', smv: 2.2, pph: 27, operators: 1, machines: 1, notes: 'SNLS machine' },
        { op: '040', name: 'Lining attachment at neckline', machine: 'Lockstitch', level: '★★★', smv: 4.5, pph: 13, operators: 1, machines: 1, notes: 'Single needle' },
        { op: '050', name: 'CB zip insertion (YKK 60 cm)', machine: 'Lockstitch', level: '★★★★', smv: 6.2, pph: 10, operators: 1, machines: 1, notes: 'Concealed zip foot' },
        { op: '060', name: 'Hem — shell + lining', machine: 'Blind-stitch + Overlock', level: '★★★', smv: 3.8, pph: 16, operators: 2, machines: 2, notes: 'Dual operation' },
        { op: '070', name: 'Final steam press', machine: 'Steam press', level: '★★', smv: 2.1, pph: 29, operators: 1, machines: 1, notes: 'Steam finishing' },
        { op: '080', name: 'QC inspection + tagging', machine: 'Manual', level: '★★', smv: 1.5, pph: 40, operators: 1, machines: 0, notes: 'Final inspection' }
      ],
      machineTypes: ['SNLS', 'Overlock 3T', 'Overlock 4T', 'Overlock 5T', 'Lockstitch', 'Blind-stitch', 'Buttonhole', 'Steam Press', 'Manual']
    }
  };

  const gamme = gammeData[m.id] || { operations: [], machineTypes: [] };
  
  if (gamme.operations.length === 0) {
    document.getElementById('md-gamme').innerHTML = emptyPane('No GAMME data available for this model.');
    return;
  }

  // Calculate totals
  const totalSMV = gamme.operations.reduce((sum, op) => sum + op.smv, 0);
  const totalOperators = gamme.operations.reduce((sum, op) => sum + op.operators, 0);
  const totalMachines = gamme.operations.reduce((sum, op) => sum + op.machines, 0);
  const hourlyOutput = Math.floor(60 / totalSMV * 60); // pieces per hour

  const operationsHtml = gamme.operations.map(op => {
    const levelStars = op.level.replace(/★/g, '<span style="color:var(--gold);margin-right:1px">★</span>');
    
    return `
      <tr class="tbl-row">
        <td class="ref-cell">${op.op}</td>
        <td class="fw-600">${op.name}</td>
        <td>
          <select style="width: 100%; padding: 4px 8px; border: 1px solid var(--border); border-radius: 3px; font-size: .8rem;"
                  onchange="updateGammeOperation('${op.op}', 'machine', this.value)">
            ${gamme.machineTypes.map(mt => 
              `<option value="${mt}" ${mt === op.machine ? 'selected' : ''}>${mt}</option>`
            ).join('')}
          </select>
        </td>
        <td style="text-align:center;letter-spacing:2px;">${levelStars}</td>
        <td style="text-align:right">
          <input type="number" min="0" step="0.1" value="${op.smv}" 
                 style="width: 60px; text-align: right; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
                 onchange="updateGammeOperation('${op.op}', 'smv', this.value)">
        </td>
        <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1rem;color:var(--text)">
          ${op.pph}
        </td>
        <td style="text-align:center">
          <input type="number" min="0" value="${op.operators}" 
                 style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
                 onchange="updateGammeOperation('${op.op}', 'operators', this.value)">
        </td>
        <td style="text-align:center">
          <input type="number" min="0" value="${op.machines}" 
                 style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
                 onchange="updateGammeOperation('${op.op}', 'machines', this.value)">
        </td>
        <td class="muted-cell" style="font-size: .7rem;">${op.notes}</td>
      </tr>`;
  }).join('');

  document.getElementById('md-gamme').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">GAMME Opératoire — Line Balancing & SAM Calculation</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn-primary" onclick="printGamme('${m.id}')" style="font-size: .7rem; padding: 6px 12px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print GAMME
          </button>
        </div>
      </div>
      
      <!-- Summary KPIs -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 20px; border-bottom: 1px solid #F0EDE8;">
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Total SMV
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--gold);line-height:1">
            ${totalSMV.toFixed(1)}
          </div>
          <div style="font-size: .7rem; color: var(--muted);">minutes</div>
        </div>
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Hourly Output
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--text);line-height:1">
            ${hourlyOutput}
          </div>
          <div style="font-size: .7rem; color: var(--muted);">pieces/hour</div>
        </div>
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Operators Required
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--text);line-height:1">
            ${totalOperators}
          </div>
          <div style="font-size: .7rem; color: var(--muted);">total operators</div>
        </div>
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 4px;">
            Machines Required
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:var(--text);line-height:1">
            ${totalMachines}
          </div>
          <div style="font-size: .7rem; color: var(--muted);">total machines</div>
        </div>
      </div>
      
      <!-- Operations Table -->
      <div style="overflow-x: auto;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Op #</th>
              <th>Operation</th>
              <th>Machine Type</th>
              <th style="text-align:center">Level</th>
              <th style="text-align:right">SMV (min)</th>
              <th style="text-align:right">PPH</th>
              <th style="text-align:center">Operators</th>
              <th style="text-align:center">Machines</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${operationsHtml}
            <tr style="background: #FFFDF7; border-top: 2px solid rgba(196,163,90,.15);">
              <td colspan="4" style="padding: 12px 20px; font-size: .7rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted);">
                Totals
              </td>
              <td style="text-align:right;padding:12px 20px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold);">
                ${totalSMV.toFixed(1)}
              </td>
              <td></td>
              <td style="text-align:center;padding:12px 20px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--text);">
                ${totalOperators}
              </td>
              <td style="text-align:center;padding:12px 20px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--text);">
                ${totalMachines}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Add Operation Button -->
      <div style="padding: 16px 20px; border-top: 1px solid #F0EDE8; text-align: center;">
        <button class="btn-outline" onclick="addGammeOperation()" style="font-size: .7rem; padding: 6px 16px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Operation
        </button>
      </div>
    </div>
    
    <!-- Print-friendly CSS (hidden by default) -->
    <style id="gamme-print-style" media="print">
      @media print {
        #sidebar, #topbar, .md-back, .btn-primary, .btn-outline, .btn-sm,
        input, select, button { display: none !important; }
        #main { margin-left: 0 !important; }
        #content { padding: 16px !important; overflow: visible !important; }
        .sc { break-inside: avoid; border: 1px solid #000 !important; }
        .tbl { border: 1px solid #000 !important; }
        .tbl th, .tbl td { border: 1px solid #000 !important; padding: 6px 8px !important; }
        .sc-head { background: #f0f0f0 !important; border-bottom: 2px solid #000 !important; }
      }
    </style>`;
}

// GAMME helper functions
function updateGammeOperation(opCode, field, value) {
  showToast(`Updated ${field} for operation ${opCode}: ${value}`);
  // In a real implementation, this would update the data store and recalculate totals
}

function addGammeOperation() {
  showToast('Add new operation to GAMME');
  // In a real implementation, this would show a form to add new operation
}

function printGamme(modelId) {
  // Show print dialog with print-friendly styling
  window.print();
  showToast(`Printing GAMME for ${modelId}...`);
}

/* ── Tab 4 · POM (Point of Measure) ─────────────────────────── */
function renderMdPom(m) {
  // Sample POM data for AM-0045
  const pomData = {
    'AM-0045': {
      points: [
        { point: 'Bust (at underarm)', xs: 88, s: 92, m: 96, l: 100, xl: 106, tolerance: '± 1 cm', notes: 'Measured 1cm below armhole' },
        { point: 'Waist', xs: 72, s: 76, m: 80, l: 84, xl: 90, tolerance: '± 1 cm', notes: 'Natural waistline' },
        { point: 'Hip (at 18 cm below waist)', xs: 94, s: 98, m: 102, l: 106, xl: 112, tolerance: '± 1 cm', notes: 'Fullest part' },
        { point: 'Centre front length', xs: 120, s: 121, m: 122, l: 123, xl: 124, tolerance: '± 1.5 cm', notes: 'HPS to hem' },
        { point: 'Shoulder width', xs: 37, s: 38, m: 39, l: 40, xl: 41, tolerance: '± 0.5 cm', notes: 'Shoulder point to point' },
        { point: 'Sleeve length (CB to cuff)', xs: 62, s: 62.5, m: 63, l: 63.5, xl: 64, tolerance: '± 1 cm', notes: 'Centre back to cuff edge' },
        { point: 'Hem circumference', xs: 140, s: 144, m: 148, l: 152, xl: 158, tolerance: '± 2 cm', notes: 'Bottom opening' }
      ],
      uploadedFiles: [
        { name: 'ASOS_Measurement_Chart.xlsx', size: '2.4 MB', date: '15 Jan 2026', type: 'Excel' },
        { name: 'Tech_Pack_POM.pdf', size: '3.1 MB', date: '28 Mar 2026', type: 'PDF' }
      ]
    }
  };

  const pom = pomData[m.id] || { points: [], uploadedFiles: [] };
  
  const pointsHtml = pom.points.map(p => `
    <tr class="tbl-row">
      <td class="fw-600">${p.point}</td>
      <td style="text-align:center">
        <input type="number" value="${p.xs}" style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
               onchange="updatePomPoint('${p.point}', 'xs', this.value)">
      </td>
      <td style="text-align:center">
        <input type="number" value="${p.s}" style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
               onchange="updatePomPoint('${p.point}', 's', this.value)">
      </td>
      <td style="text-align:center">
        <input type="number" value="${p.m}" style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
               onchange="updatePomPoint('${p.point}', 'm', this.value)">
      </td>
      <td style="text-align:center">
        <input type="number" value="${p.l}" style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
               onchange="updatePomPoint('${p.point}', 'l', this.value)">
      </td>
      <td style="text-align:center">
        <input type="number" value="${p.xl}" style="width: 50px; text-align: center; padding: 4px 6px; border: 1px solid var(--border); border-radius: 3px;"
               onchange="updatePomPoint('${p.point}', 'xl', this.value)">
      </td>
      <td style="text-align:center; color: var(--muted); font-size: .7rem;">${p.tolerance}</td>
      <td class="muted-cell" style="font-size: .7rem;">${p.notes}</td>
    </tr>`).join('');

  const filesHtml = pom.uploadedFiles.map(f => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #F0EDE8;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 4px; background: rgba(196,163,90,.1); display: flex; align-items: center; justify-content: center; color: var(--gold);">
          ${f.type === 'Excel' ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>' :
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'}
        </div>
        <div>
          <div style="font-size: .8rem; font-weight: 600; color: var(--text);">${f.name}</div>
          <div style="font-size: .7rem; color: var(--muted);">${f.size} · ${f.date}</div>
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn-sm" onclick="previewFile('${f.name}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Preview
        </button>
        <button class="btn-sm" onclick="parseExcelFile('${f.name}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Parse
        </button>
      </div>
    </div>`).join('');

  document.getElementById('md-pom').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Point of Measure — Interactive Table</span>
        <button class="btn-primary" onclick="exportPom('${m.id}')" style="font-size: .7rem; padding: 6px 12px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export POM
        </button>
      </div>
      
      <!-- File Upload Section -->
      <div style="padding: 20px; border-bottom: 1px solid #F0EDE8;">
        <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 8px;">
          Upload Measurement Chart
        </div>
        <div style="border: 2px dashed var(--border); border-radius: 8px; padding: 30px; text-align: center; background: #FAFAF8; cursor: pointer;"
             onclick="document.getElementById('pom-file-input').click()"
             ondrop="handleFileDrop(event)" ondragover="event.preventDefault()">
          <div style="margin-bottom: 10px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style="font-size: .85rem; color: var(--text); margin-bottom: 4px;">
            Drop Excel or PDF files here, or click to browse
          </div>
          <div style="font-size: .7rem; color: var(--muted2);">
            Supports .xlsx, .xls, .pdf (Max 10MB)
          </div>
        </div>
        <input type="file" id="pom-file-input" accept=".xlsx,.xls,.pdf" style="display: none;" onchange="handleFileUpload(this.files)">
        
        <!-- Uploaded Files -->
        ${pom.uploadedFiles.length > 0 ? `
          <div style="margin-top: 20px;">
            <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 8px;">
              Uploaded Files (${pom.uploadedFiles.length})
            </div>
            <div style="border: 1px solid var(--border); border-radius: 6px; overflow: hidden;">
              ${filesHtml}
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- POM Table -->
      <div style="overflow-x: auto;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Point of Measure</th>
              <th style="text-align:center">XS</th>
              <th style="text-align:center">S</th>
              <th style="text-align:center">M</th>
              <th style="text-align:center">L</th>
              <th style="text-align:center">XL</th>
              <th style="text-align:center">Tolerance</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${pointsHtml}
          </tbody>
        </table>
      </div>
      
      <!-- Add Point Button -->
      <div style="padding: 16px 20px; border-top: 1px solid #F0EDE8; text-align: center;">
        <button class="btn-outline" onclick="addPomPoint()" style="font-size: .7rem; padding: 6px 16px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Measurement Point
        </button>
      </div>
    </div>`;
}

// POM helper functions
function updatePomPoint(point, size, value) {
  showToast(`Updated ${point} (${size.toUpperCase()}): ${value} cm`);
  // In a real implementation, this would update the data store
}

function addPomPoint() {
  showToast('Add new measurement point');
  // In a real implementation, this would show a form to add new point
}

function exportPom(modelId) {
  showToast(`Exporting POM for ${modelId}...`);
  // In a real implementation, this would generate and download CSV/PDF
}

function handleFileDrop(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;
  handleFileUpload(files);
}

function handleFileUpload(files) {
  if (files.length > 0) {
    const file = files[0];
    showToast(`Uploading ${file.name}...`);
    // In a real implementation, this would upload to server
    setTimeout(() => {
      showToast(`${file.name} uploaded successfully`);
    }, 1000);
  }
}

function previewFile(filename) {
  showToast(`Previewing ${filename}...`);
  // In a real implementation, this would open a preview modal
}

function parseExcelFile(filename) {
  showToast(`Parsing Excel file: ${filename}...`);
  // In a real implementation, this would use SheetJS to parse Excel and populate POM table
  // Placeholder for SheetJS integration
  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    showToast('Excel parsing would populate the POM table automatically');
  }
}

/* ── Tab 5 · Samples & Revision ─────────────────────────────── */
function renderMdSamples(id) {
  const d = MD[id];
  if (!d) { 
    document.getElementById('md-samples').innerHTML = emptyPane('No sample records found.'); 
    return; 
  }

  const hasPPWarning = d.samples.some(s => s.type === 'PP Sample' && s.statusLabel === 'Not Produced');

  const warning = hasPPWarning ? `
    <div class="sample-warn">
      <svg class="sample-warn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p><strong>PP Sample not yet produced.</strong> Production approval is blocked until the Pre-Production sample is submitted, reviewed, and signed off by the client buyer. No bulk cutting should begin before PP approval is on file.</p>
    </div>` : '';

  // Status toggle component
  const statusToggle = `
    <div class="sc" style="margin-bottom: 16px;">
      <div class="sc-head">
        <span class="sc-title">Sample Status</span>
      </div>
      <div style="padding: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="font-size: .7rem; font-weight: 600; color: var(--muted);">Current Status:</div>
          <div style="display: flex; gap: 8px;">
            <button class="period-btn ${d.samples.some(s => s.statusLabel === 'Approved') ? 'active' : ''}" 
                    onclick="updateSampleStatus('approved')">Approved for Cutting</button>
            <button class="period-btn ${d.samples.some(s => s.statusLabel === 'Pending') ? 'active' : ''}" 
                    onclick="updateSampleStatus('pending')">Pending Review</button>
            <button class="period-btn ${d.samples.some(s => s.statusLabel === 'Rejected') ? 'active' : ''}" 
                    onclick="updateSampleStatus('rejected')">Rejected</button>
          </div>
        </div>
        <div style="font-size: .8rem; color: var(--text); line-height: 1.6;">
          ${d.samples.some(s => s.statusLabel === 'Approved') ? 
            '✅ <strong>Approved for Cutting</strong> — All samples approved. Bulk production can proceed.' :
            d.samples.some(s => s.statusLabel === 'Pending') ?
            '⏳ <strong>Pending Review</strong> — Awaiting client feedback on submitted samples.' :
            '❌ <strong>Rejected</strong> — Samples require corrections before proceeding.'}
        </div>
      </div>
    </div>`;

  // QC Reports section
  const qcReports = `
    <div class="sc" style="margin-bottom: 16px;">
      <div class="sc-head">
        <span class="sc-title">QC Reports & Production Notes</span>
        <button class="btn-outline" onclick="addQcReport()" style="font-size: .7rem; padding: 5px 12px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Report
        </button>
      </div>
      <div style="padding: 20px;">
        <div style="margin-bottom: 16px;">
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 8px;">
            Defect History Log
          </div>
          <div style="background: #FAFAF8; border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-size: .8rem; color: var(--text); line-height: 1.6;">
            <div><strong>Proto Sample (Rev.1):</strong> Bust ease 4cm too tight • Zip placket visible • Neckline 1.5cm low</div>
            <div><strong>Fit Sample (Rev.2):</strong> Neckline raised 1cm • Sleeve shortened 1.5cm • Seam allowance increased</div>
            <div><strong>Current Status:</strong> Size set submitted, awaiting client sign-off</div>
          </div>
        </div>
        
        <div>
          <div style="font-size: .6rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted2); margin-bottom: 8px;">
            Production Notes
          </div>
          <textarea id="production-notes" style="width: 100%; min-height: 100px; padding: 12px; border: 1px solid var(--border); border-radius: 6px; font-size: .8rem; color: var(--text); line-height: 1.6; resize: vertical;"
                    placeholder="Add production notes, challenges, or special instructions for future re-orders...">${d.samples.find(s => s.type === 'Proto')?.feedback || ''}</textarea>
          <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
            <button class="btn-primary" onclick="saveProductionNotes()" style="font-size: .7rem; padding: 6px 16px;">
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>`;

  // Sample cards (existing)
  const cards = d.samples.map(s => {
    const dateStr = s.date
      ? `<div class="sample-datemeta">Submitted ${s.date} &nbsp;·&nbsp; Rev.${s.rev}</div>`
      : `<div class="sample-datemeta" style="color:var(--muted2)">Not yet produced &nbsp;·&nbsp; Rev.${s.rev}</div>`;

    const fbBlock = s.statusLabel === 'Not Produced' ? `
      <div class="sample-fb-lbl">Notes</div>
      <textarea class="sample-fb" placeholder="No sample produced yet. Add notes here…" rows="3"></textarea>` : `
      <div class="sample-fb-lbl">Client Feedback</div>
      <textarea class="sample-fb" rows="3">${s.feedback}</textarea>`;

    return `
      <div class="sample-card ${s.cssClass}">
        <div class="sample-chead">
          <span class="sample-type-lbl">${s.type}</span>
          <span class="sbadge ${s.badgeClass}">
            <span class="sdot"></span>${s.statusLabel}
          </span>
        </div>
        ${dateStr}
        ${fbBlock}
      </div>`;
  }).join('');

  document.getElementById('md-samples').innerHTML = `
    ${warning}
    ${statusToggle}
    ${qcReports}
    <div class="sample-grid">${cards}</div>`;
}

// Samples helper functions
function updateSampleStatus(status) {
  const statusMap = {
    'approved': 'Approved for Cutting',
    'pending': 'Pending Review', 
    'rejected': 'Rejected'
  };
  showToast(`Sample status updated to: ${statusMap[status]}`);
  // In a real implementation, this would update the data store
}

function addQcReport() {
  showToast('Add new QC report');
  // In a real implementation, this would show a form to add QC report
}

function saveProductionNotes() {
  const notes = document.getElementById('production-notes').value;
  showToast('Production notes saved to knowledge base');
  // In a real implementation, this would save to database
  AuditTrail.log('UPDATED', 'Model', document.querySelector('.md-id-badge')?.textContent, 
    'Production notes updated in Samples & Revision tab', null, { notes: notes.substring(0, 100) + '...' });
}

/* ── Tab 2 · BOM ──────────────────────────────────────────────── */
function renderMdBom(m) {
  if (m.id !== 'AM-0045') { document.getElementById('md-bom').innerHTML = emptyPane('No BOM data available for this model.'); return; }
  const rows = [
    ['Main Fabric',  'Satin duchess 100% poly, ivory',   'Duchesse-Satin SA', 'm',   '1.85', '3.20',  '5.92'],
    ['Lining',       'Poly lining, ivory',                'Poly-Tissu MA',     'm',   '0.95', '0.85',  '0.81'],
    ['Zip',          'YKK concealed 60 cm',               'YKK Morocco',       'pcs', '1',    '0.63',  '0.63'],
    ['Hook & Bar',   'Waist hook & bar, nickel',          'Métal Plus',        'pcs', '1',    '0.08',  '0.08'],
    ['Label Set',    'Brand + care + size labels',        'Etiquettes SA',     'set', '1',    '0.22',  '0.22'],
    ['Polybag',      '50 × 70 cm, self-seal',             'PackPro',           'pcs', '1',    '0.12',  '0.12'],
    ['Hanger',       'Velvet non-slip',                   'HangMa',            'pcs', '1',    '0.18',  '0.18'],
  ];
  const total = rows.reduce((s, r) => s + parseFloat(r[6]), 0);
  document.getElementById('md-bom').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Bill of Materials — Rev.4 · ${rows.length} components</span>
        <span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">€${total.toFixed(2)} / pc</span>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Component</th><th>Description</th><th>Supplier</th><th style="text-align:center">Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit €</th><th style="text-align:right">Total €</th></tr></thead>
          <tbody>${rows.map(r => `<tr class="tbl-row"><td class="fw-600">${r[0]}</td><td class="muted-cell">${r[1]}</td><td>${r[2]}</td><td style="text-align:center">${r[3]}</td><td style="text-align:right">${r[4]}</td><td style="text-align:right">€${r[5]}</td><td class="cost-cell">€${r[6]}</td></tr>`).join('')}
          <tr style="background:#FFFDF7"><td colspan="6" style="padding:12px 20px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Materials Total</td><td class="cost-cell" style="padding:12px 20px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">€${total.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ── Tab 3 · Gamme ────────────────────────────────────────────── */
function renderMdGamme(m) {
  if (m.id !== 'AM-0045') { document.getElementById('md-gamme').innerHTML = emptyPane('No Gamme Opératoire available.'); return; }
  const ops = [
    ['010','Mark & Bundle','Manual','★','2.5'],
    ['020','Shoulder seams (× 2)','Overlock 5-thread','★★','1.8'],
    ['030','Side seams + lining side seams','Overlock 5-thread','★★','2.2'],
    ['040','Lining attachment at neckline','Lockstitch','★★★','4.5'],
    ['050','CB zip insertion (YKK 60 cm)','Lockstitch','★★★★','6.2'],
    ['060','Hem — shell + lining','Blind-stitch + Overlock','★★★','3.8'],
    ['070','Final steam press','Steam press','★★','2.1'],
    ['080','QC inspection + tagging','Manual','★★','1.5'],
  ];
  const totalSMV = ops.reduce((s, r) => s + parseFloat(r[4]), 0);
  document.getElementById('md-gamme').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Gamme Opératoire — Rev.4 · ${ops.length} operations</span>
        <span style="font-size:.8rem;font-weight:600;color:var(--text)">Total SMV: <span style="color:var(--gold)">${totalSMV.toFixed(1)} min</span></span>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Op #</th><th>Operation</th><th>Machine</th><th style="text-align:center">Level</th><th style="text-align:right">SMV (min)</th></tr></thead>
          <tbody>${ops.map(r => `<tr class="tbl-row"><td class="ref-cell">${r[0]}</td><td class="fw-600">${r[1]}</td><td class="muted-cell">${r[2]}</td><td style="text-align:center;letter-spacing:2px;color:var(--gold)">${r[3]}</td><td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1rem;color:var(--text)">${r[4]}</td></tr>`).join('')}
          <tr style="background:#FFFDF7"><td colspan="4" style="padding:12px 20px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Total SMV</td><td style="text-align:right;padding:12px 20px;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">${totalSMV.toFixed(1)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ── Tab 4 · POM ──────────────────────────────────────────────── */
function renderMdPom(m) {
  if (m.id !== 'AM-0045') { document.getElementById('md-pom').innerHTML = emptyPane('No POM data available.'); return; }
  const pts = [
    ['Bust (at underarm)','88','92','96','100','106'],
    ['Waist','72','76','80','84','90'],
    ['Hip (at 18 cm below waist)','94','98','102','106','112'],
    ['Centre front length','120','121','122','123','124'],
    ['Shoulder width','37','38','39','40','41'],
    ['Sleeve length (CB to cuff)','62','62.5','63','63.5','64'],
    ['Hem circumference','140','144','148','152','158'],
  ];
  document.getElementById('md-pom').innerHTML = `
    <div class="sc">
      <div class="sc-head"><span class="sc-title">Points of Measure — Rev.4 · All measurements in cm · Tolerance ± 1 cm</span></div>
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead><tr><th>Point of Measure</th>${['XS','S','M','L','XL'].map(s=>`<th style="text-align:center">${s}</th>`).join('')}</tr></thead>
          <tbody>${pts.map(r=>`<tr class="tbl-row"><td class="fw-600">${r[0]}</td>${r.slice(1).map(v=>`<td style="text-align:center">${v}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

/* ── Tab 5 · Revisions ────────────────────────────────────────── */
function renderMdRevisions(id) {
  const d = MD[id];
  if (!d) { document.getElementById('md-revisions').innerHTML = emptyPane('No revision history recorded.'); return; }

  /* reverse so latest is on top */
  const revs = [...d.revisions].reverse();

  const items = revs.map((r, i) => {
    const isLast = i === revs.length - 1;
    return `
      <div class="rev-item"${isLast ? '' : ' style="padding-bottom:0"'}>
        ${!isLast ? `<div style="position:absolute;left:17px;top:28px;bottom:0;width:2px;background:#E6E2DC;z-index:0"></div>` : ''}
        <div class="rev-dot-col">
          <div class="rev-dot${r.latest ? ' latest' : ''}"></div>
        </div>
        <div class="rev-body">
          <div class="rev-hrow">
            <span class="rev-num">Rev.${r.rev}</span>
            ${r.latest ? '<span class="rev-latest-chip">Latest</span>' : ''}
            <span class="rev-meta">${r.date} &nbsp;·&nbsp; ${r.author}</span>
          </div>
          <p class="rev-summary">${r.summary}</p>
          <ul class="rev-changes">
            ${r.changes.map(c => `<li>${c}</li>`).join('')}
          </ul>
          <div class="rev-btns">
            <button class="btn-outline" style="font-size:.68rem;padding:5px 12px"
              onclick="showToast('Rev.${r.rev} tech pack viewer — coming next')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7"/><circle cx="12" cy="12" r="3"/></svg>
              View
            </button>
            ${!r.latest ? `
            <button class="btn-outline" style="font-size:.68rem;padding:5px 12px"
              onclick="showToast('Compare Rev.${r.rev} vs Rev.${revs[0].rev} — coming next')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>
              Compare
            </button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('md-revisions').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Revision History &mdash; ${d.revisions.length} revisions</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px"
          onclick="showToast('New revision form — coming next')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Revision
        </button>
      </div>
      <div class="rev-list" style="position:relative">${items}</div>
    </div>`;
}

/* ── Tab 6 · Samples ──────────────────────────────────────────── */
function renderMdSamples(id) {
  const d = MD[id];
  if (!d) { document.getElementById('md-samples').innerHTML = emptyPane('No sample records found.'); return; }

  const hasPPWarning = d.samples.some(s => s.type === 'PP Sample' && s.statusLabel === 'Not Produced');

  const warning = hasPPWarning ? `
    <div class="sample-warn">
      <svg class="sample-warn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <p><strong>PP Sample not yet produced.</strong> Production approval is blocked until the Pre-Production sample is submitted, reviewed, and signed off by the client buyer. No bulk cutting should begin before PP approval is on file.</p>
    </div>` : '';

  const cards = d.samples.map(s => {
    const dateStr = s.date
      ? `<div class="sample-datemeta">Submitted ${s.date} &nbsp;·&nbsp; Rev.${s.rev}</div>`
      : `<div class="sample-datemeta" style="color:var(--muted2)">Not yet produced &nbsp;·&nbsp; Rev.${s.rev}</div>`;

    const fbBlock = s.statusLabel === 'Not Produced' ? `
      <div class="sample-fb-lbl">Notes</div>
      <textarea class="sample-fb" placeholder="No sample produced yet. Add notes here…" rows="3"></textarea>` : `
      <div class="sample-fb-lbl">Client Feedback</div>
      <textarea class="sample-fb" rows="3">${s.feedback}</textarea>`;

    return `
      <div class="sample-card ${s.cssClass}">
        <div class="sample-chead">
          <span class="sample-type-lbl">${s.type}</span>
          <span class="sbadge ${s.badgeClass}">
            <span class="sdot"></span>${s.statusLabel}
          </span>
        </div>
        ${dateStr}
        ${fbBlock}
      </div>`;
  }).join('');

  document.getElementById('md-samples').innerHTML = `
    ${warning}
    <div class="sample-grid">${cards}</div>`;
}

/* ── Tab 7 · Linked Orders (placeholder) ──────────────────────── */
function renderMdOrders(id) {
  const d = MD[id];
  if (!d || !d.orders) { document.getElementById('md-orders').innerHTML = emptyPane('No linked orders for this model.'); return; }

  const o = d.orders;
  const totalQty = o.reduce((s, r) => s + r.qty, 0);
  const totalVal = o.reduce((s, r) => s + r.value, 0);

  const STATUS_CLS = {
    'In Production': 'badge-production',
    'Confirmed':     'badge-confirmed',
    'Completed':     'badge-completed',
    'Sample':        'badge-sample',
    'Draft':         'badge-draft',
  };

  const rows = o.map(r => `
    <tr class="tbl-row">
      <td style="font-family:'Courier New',monospace;font-size:.78rem;color:var(--text);font-weight:600">${r.po}</td>
      <td class="muted-cell">${r.issued}</td>
      <td class="muted-cell">${r.delivery}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem;letter-spacing:.03em;color:var(--text)">${r.qty.toLocaleString()}</td>
      <td style="font-size:.75rem;color:var(--muted);max-width:220px;white-space:normal;line-height:1.5">${r.sizes}</td>
      <td><span class="badge ${STATUS_CLS[r.status]||'badge-draft'}">${r.status}</span></td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.15rem;letter-spacing:.02em;color:var(--gold)">€${r.value.toLocaleString()}</td>
    </tr>`).join('');

  document.getElementById('md-orders').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Linked Orders &mdash; ${o.length} purchase orders</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px"
          onclick="showToast('New order form — coming next')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Link Order
        </button>
      </div>

      <!-- Summary strip -->
      <div class="lo-summary">
        <div>
          <div class="lo-stat-val">${o.length}</div>
          <div class="lo-stat-lbl">Purchase Orders</div>
        </div>
        <div>
          <div class="lo-stat-val gold">${totalQty.toLocaleString()}</div>
          <div class="lo-stat-lbl">Total Units</div>
        </div>
        <div>
          <div class="lo-stat-val" style="font-family:'Bebas Neue',sans-serif;font-size:1.75rem;letter-spacing:.02em;color:var(--gold)">€${totalVal.toLocaleString()}</div>
          <div class="lo-stat-lbl">Total Value (ex-factory)</div>
        </div>
        <div>
          <div class="lo-stat-val" style="font-size:1.75rem">${o.filter(r=>r.status==='In Production').length}</div>
          <div class="lo-stat-lbl">In Production</div>
        </div>
      </div>

      <!-- Table -->
      <div style="overflow-x:auto">
        <table class="tbl">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Issued</th>
              <th>Delivery</th>
              <th style="text-align:right">Qty</th>
              <th>Size Breakdown</th>
              <th>Status</th>
              <th style="text-align:right">Value (EUR)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr style="background:#FFFDF7;border-top:2px solid rgba(196,163,90,.15)">
              <td colspan="3" style="padding:13px 20px;font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Total</td>
              <td style="padding:13px 20px;text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--text)">${totalQty.toLocaleString()}</td>
              <td></td>
              <td></td>
              <td style="padding:13px 20px;text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:.02em;color:var(--gold)">€${totalVal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ── Tab 8 · Audit ────────────────────────────────────────────── */
function renderMdAudit(id) {
  const d = MD[id];
  if (!d || !d.audit) { document.getElementById('md-audit').innerHTML = emptyPane('No audit log entries.'); return; }

  const BADGE = {
    'CREATED':         'ab-created',
    'UPDATED':         'ab-updated',
    'UPLOADED':        'ab-uploaded',
    'APPROVED':        'ab-approved',
    'REJECTED':        'ab-rejected',
    'STATUS CHANGE':   'ab-statuschange',
    'REVISION':        'ab-revision',
  };

  const entries = d.audit.map(e => `
    <div class="audit-entry">
      <div class="audit-av">${e.user.charAt(0)}</div>
      <div style="flex:1;min-width:0">
        <div class="audit-arow">
          <span class="audit-badge ${BADGE[e.action]||'ab-updated'}">${e.action}</span>
          <span style="font-size:.76rem;font-weight:600;color:var(--text)">${e.user}</span>
        </div>
        <div class="audit-detail">${e.detail}</div>
        <div class="audit-ts">${e.ts}</div>
      </div>
    </div>`).join('');

  document.getElementById('md-audit').innerHTML = `
    <div class="sc">
      <div class="sc-head">
        <span class="sc-title">Audit Log &mdash; ${d.audit.length} entries</span>
        <button class="btn-outline" style="font-size:.68rem;padding:5px 12px" onclick="exportAuditCSV('${id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
          Print Audit
        </button>
      </div>
      <div>${entries}</div>
    </div>`;
}

/* ── Audit CSV export ─────────────────────────────────────────── */
function exportAuditCSV(id) {
  const d = MD[id];
  if (!d || !d.audit) return;
  const rows = d.audit.map(e => [e.ts, e.user, e.action, e.detail]);
  openPrintWin(
    `Audit Log — ${id}`,
    `${d.audit.length} entr${d.audit.length!==1?'ies':'y'} · Model ${id}`,
    buildTable(['Timestamp','User','Action','Detail'], rows)
  );
  showToast(`Opened audit log for ${id}`);
}

/* ══════════════════════════════════════════════════════════════
   PLANNING — Monthly calendar for 20 sewing lines
   ══════════════════════════════════════════════════════════════ */

/* Working hours per day: index = day of week (0=Sun … 6=Sat) */
let PLAN_HRS = [0, 9.5, 9.5, 9.5, 9.5, 8.5, 9.5];

const PLAN_TODAY = new Date('2026-04-18T00:00:00');
let planYear     = PLAN_TODAY.getFullYear();
let planMonth    = PLAN_TODAY.getMonth(); // 0-based
const PLAN_LINES = 20;
const PLAN_MONTH_NAMES = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];
const PLAN_DAY_ABBR    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* Seed blocks — duration auto-calculated from qty ÷ (pph × hrs/day) */
let PLAN_BLOCKS = [
  { id:'PB1', line:1,  model:'AM-0045', po:'ASOS-PO-44521-A', colour:'Ivory', qty:2400, pph:25, start:'2026-04-01', color:'#2455CC' },
  { id:'PB7', line:3,  model:'AM-0039', po:'RI-PL-3301',      colour:'Navy',  qty:800,  pph:18, start:'2026-04-03', color:'#196741' },
  { id:'PB2', line:3,  model:'AM-0045', po:'ASOS-PO-44521-A', colour:'Ivory', qty:1800, pph:25, start:'2026-04-09', color:'#2455CC' },
  { id:'PB3', line:5,  model:'AM-0052', po:'PLT-CR-8821',     colour:'Black', qty:3000, pph:22, start:'2026-04-05', color:'#C4A35A' },
  { id:'PB4', line:8,  model:'AM-0039', po:'RI-PL-3301',      colour:'Navy',  qty:1200, pph:20, start:'2026-04-10', color:'#196741' },
  { id:'PB5', line:12, model:'AM-0052', po:'PLT-CR-8821',     colour:'Proto', qty:100,  pph:15, start:'2026-04-14', color:'#7B5EA7' },
  { id:'PB6', line:15, model:'AM-0045', po:'ASOS-PO-44521-A', colour:'White', qty:1500, pph:25, start:'2026-04-16', color:'#D4626B' },
];

/* ── Helpers ──────────────────────────────────────────────────── */
function planDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function planDateStr(d) { return d.toISOString().slice(0, 10); }

function planFmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
}

/* Calculate end date (inclusive) given start ISO, qty, pph */
function planCalcEnd(startStr, qty, pph) {
  const d = new Date(startStr + 'T00:00:00');
  let rem = qty;
  while (rem > 0) {
    const hrs = PLAN_HRS[d.getDay()];
    if (hrs > 0) rem -= pph * hrs;
    if (rem > 0) d.setDate(d.getDate() + 1);
  }
  return planDateStr(d);
}

/* Count working days a block occupies */
function planWorkDays(startStr, qty, pph) {
  const d = new Date(startStr + 'T00:00:00');
  let rem = qty, days = 0;
  while (rem > 0) {
    const hrs = PLAN_HRS[d.getDay()];
    if (hrs > 0) { rem -= pph * hrs; days++; }
    if (rem > 0) d.setDate(d.getDate() + 1);
  }
  return days;
}

/* Assign non-overlapping vertical lanes to blocks on a line */
function assignLanes(lineBlocks) {
  const sorted = [...lineBlocks].sort((a, b) => a.start.localeCompare(b.start));
  const laneEnds = [];
  return sorted.map(b => {
    const endStr = planCalcEnd(b.start, b.qty, b.pph);
    let lane = laneEnds.findIndex(e => e < b.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endStr;
    return { ...b, lane, endStr };
  });
}

/* ── Render ───────────────────────────────────────────────────── */
function renderPlanning() {
  const total      = planDaysInMonth(planYear, planMonth);
  const root       = document.getElementById('plan-root');
  const todayIso   = planDateStr(PLAN_TODAY);
  const mStr       = String(planMonth + 1).padStart(2, '0');
  const monthStart = `${planYear}-${mStr}-01`;
  const monthEnd   = `${planYear}-${mStr}-${String(total).padStart(2, '0')}`;

  /* toolbar subtitle */
  const sub = document.getElementById('plan-toolbar-sub');
  if (sub) {
    const cnt = PLAN_BLOCKS.filter(b => {
      const e = planCalcEnd(b.start, b.qty, b.pph);
      return b.start <= monthEnd && e >= monthStart;
    }).length;
    sub.textContent = `${PLAN_MONTH_NAMES[planMonth]} ${planYear} · ${PLAN_LINES} Lines · ${cnt} scheduled blocks`;
  }

  /* day header cells */
  const hdrCells = Array.from({ length: total }, (_, i) => {
    const day  = i + 1;
    const dow  = new Date(planYear, planMonth, day).getDay();
    const iso  = `${planYear}-${mStr}-${String(day).padStart(2, '0')}`;
    const cls  = ['plan-dhd', dow === 0 ? 'p-sun' : (dow === 6 ? 'p-sat' : ''), iso === todayIso ? 'p-today' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}"><span class="pdnum">${day}</span><span class="pdday">${PLAN_DAY_ABBR[dow]}</span></div>`;
  }).join('');

  /* one row per sewing line */
  const rowsHtml = Array.from({ length: PLAN_LINES }, (_, li) => {
    const lineNum    = li + 1;
    const raw        = PLAN_BLOCKS.filter(b => b.line === lineNum);
    const laneBlocks = assignLanes(raw);

    /* day columns — click target + background shading */
    const dayCols = Array.from({ length: total }, (_, i) => {
      const day = i + 1;
      const dow = new Date(planYear, planMonth, day).getDay();
      const iso = `${planYear}-${mStr}-${String(day).padStart(2, '0')}`;
      const cls = ['plan-day-col', dow === 0 ? 'p-sun' : (dow === 6 ? 'p-sat' : ''), iso === todayIso ? 'p-today' : ''].filter(Boolean).join(' ');
      const click = dow === 0 ? '' : `onclick="openAddBlock(${lineNum},'${iso}')"`;
      return `<div class="${cls}" ${click}></div>`;
    }).join('');

    /* block elements — absolutely positioned over day columns */
    const blocksHtml = laneBlocks.map(b => {
      if (b.start > monthEnd || b.endStr < monthStart) return '';
      const csStart  = b.start < monthStart ? monthStart : b.start;
      const csEnd    = b.endStr > monthEnd   ? monthEnd   : b.endStr;
      const startIdx = parseInt(csStart.slice(8)) - 1;
      const endIdx   = parseInt(csEnd.slice(8)) - 1;
      const left     = (startIdx / total * 100).toFixed(3);
      const width    = ((endIdx - startIdx + 1) / total * 100).toFixed(3);
      const laneCls  = b.lane >= 1 ? ' lane-1' : '';
      const lbl      = `${b.model} · ${b.colour}`;
      const tip      = `${b.model} · ${b.colour} · ${b.qty.toLocaleString()} pcs · ${planFmtDate(b.start)} – ${planFmtDate(b.endStr)}`;
      return `<div class="plan-block${laneCls}"
        style="left:${left}%;width:calc(${width}% - 3px);background:${b.color}"
        onclick="event.stopPropagation();openPlanBlock('${b.id}')"
        title="${tip}"><span class="plan-block-lbl">${lbl}</span></div>`;
    }).join('');

    /* label: show models active this month */
    const active  = laneBlocks.filter(b => b.start <= monthEnd && b.endStr >= monthStart);
    const uniq    = [...new Set(active.map(b => b.model))];
    const modelTags = uniq.slice(0, 2).map(m => `<span class="plmodel">${m}</span>`).join('');

    return `<div class="plan-row">
      <div class="plan-row-lbl">
        <span class="plnum">L${String(lineNum).padStart(2, '0')}</span>
        ${modelTags}
      </div>
      <div class="plan-cells-wrap">${dayCols}${blocksHtml}</div>
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="plan-inner">
      <div class="plan-nav-bar plan-print-hide">
        <button class="plan-nav-btn" onclick="planPrevMonth()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="plan-month-lbl">${PLAN_MONTH_NAMES[planMonth].toUpperCase()} ${planYear}</span>
        <button class="plan-nav-btn" onclick="planNextMonth()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="plan-header-row">
        <div class="plan-lbl-hd">Line</div>
        <div class="plan-dhd-wrap">${hdrCells}</div>
      </div>
      <div class="plan-rows">${rowsHtml}</div>
    </div>`;
}

function planPrevMonth() {
  planMonth--; if (planMonth < 0) { planMonth = 11; planYear--; }
  renderPlanning();
}
function planNextMonth() {
  planMonth++; if (planMonth > 11) { planMonth = 0; planYear++; }
  renderPlanning();
}

/* ── View popup ───────────────────────────────────────────────── */
function openPlanBlock(id) {
  const b = PLAN_BLOCKS.find(x => x.id === id);
  if (!b) return;
  const endStr = planCalcEnd(b.start, b.qty, b.pph);
  const wDays  = planWorkDays(b.start, b.qty, b.pph);
  document.getElementById('plan-view-body').innerHTML = `
    <button class="popup-close" onclick="closePlanView()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="width:14px;height:14px;border-radius:3px;background:${b.color};flex-shrink:0"></div>
      <div>
        <div class="popup-model-id">${b.model}</div>
        <div class="popup-op-lbl">Line ${b.line} &mdash; ${b.colour}</div>
      </div>
    </div>
    <div class="popup-grid">
      <div><div class="popup-item-lbl">PO / Job Ref</div><div class="popup-item-val" style="font-family:'Courier New',monospace;font-size:.76rem">${b.po}</div></div>
      <div><div class="popup-item-lbl">Line</div><div class="popup-item-val">Line ${b.line}</div></div>
      <div><div class="popup-item-lbl">Start</div><div class="popup-item-val">${planFmtDate(b.start)}</div></div>
      <div><div class="popup-item-lbl">Est. End</div><div class="popup-item-val">${planFmtDate(endStr)}</div></div>
      <div><div class="popup-item-lbl">Qty</div><div class="popup-item-val" style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold)">${b.qty.toLocaleString()} pcs</div></div>
      <div><div class="popup-item-lbl">PPH</div><div class="popup-item-val">${b.pph} pcs/hr</div></div>
      <div><div class="popup-item-lbl">Working Days</div><div class="popup-item-val">${wDays} days</div></div>
      <div><div class="popup-item-lbl">Colour</div><div class="popup-item-val">${b.colour}</div></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
      <button class="btn-outline" onclick="deletePlanBlock('${b.id}')" style="color:#C0392B;border-color:#C0392B;font-size:.78rem;padding:7px 14px">Delete</button>
      <button class="btn-primary" onclick="closePlanView()" style="font-size:.78rem;padding:7px 14px">Close</button>
    </div>`;
  document.getElementById('plan-view-popup').classList.add('open');
}

function closePlanView() { document.getElementById('plan-view-popup').classList.remove('open'); }

function deletePlanBlock(id) {
  PLAN_BLOCKS = PLAN_BLOCKS.filter(b => b.id !== id);
  closePlanView();
  renderPlanning();
  showToast('Block deleted');
}

/* ── Add popup ────────────────────────────────────────────────── */
function openAddBlock(line, dateStr) {
  const lineEl = document.getElementById('pa-line');
  lineEl.innerHTML = '<option value="">Select line…</option>' +
    Array.from({ length: PLAN_LINES }, (_, i) => `<option value="${i+1}">Line ${i+1}</option>`).join('');
  lineEl.value = line;

  document.getElementById('pa-model').innerHTML = '<option value="">Select model…</option>' +
    MODELS.map(m => `<option value="${m.id}">${m.id} – ${m.name}</option>`).join('');

  document.getElementById('pa-po').innerHTML = '<option value="">Select PO…</option>' +
    ORDERS.filter(o => o.status !== 'Shipped').map(o => `<option value="${o.po}">${o.po}</option>`).join('');

  document.getElementById('pa-start').value  = dateStr;
  document.getElementById('pa-colour').value = '';
  document.getElementById('pa-qty').value    = '';
  document.getElementById('pa-pph').value    = '';
  document.getElementById('pa-end').value    = '';
  document.getElementById('plan-add-title').textContent = `Line ${line} · ${planFmtDate(dateStr)}`;
  document.getElementById('plan-add-popup').classList.add('open');
}

function closePlanAdd() { document.getElementById('plan-add-popup').classList.remove('open'); }

function onAddBModelChange() {
  const modelId = document.getElementById('pa-model').value;
  const filtered = modelId
    ? ORDERS.filter(o => o.model === modelId && o.status !== 'Shipped')
    : ORDERS.filter(o => o.status !== 'Shipped');
  document.getElementById('pa-po').innerHTML = '<option value="">Select PO…</option>' +
    filtered.map(o => `<option value="${o.po}">${o.po}</option>`).join('');
}

function onAddBPoChange() {
  const po = ORDERS.find(o => o.po === document.getElementById('pa-po').value);
  if (!po) return;
  if (!document.getElementById('pa-colour').value) document.getElementById('pa-colour').value = po.colours || '';
  if (!document.getElementById('pa-qty').value)    document.getElementById('pa-qty').value    = po.qty    || '';
  calcAddBEnd();
}

function calcAddBEnd() {
  const qty   = parseFloat(document.getElementById('pa-qty').value);
  const pph   = parseFloat(document.getElementById('pa-pph').value);
  const start = document.getElementById('pa-start').value;
  if (!qty || !pph || !start) { document.getElementById('pa-end').value = ''; return; }
  document.getElementById('pa-end').value = planFmtDate(planCalcEnd(start, qty, pph));
}

const PO_COLORS = { 'ASOS':'#2455CC', 'PLT':'#C4A35A', 'RI-':'#196741', 'Boohoo':'#D4626B' };
function getPOColor(po) {
  for (const [k, v] of Object.entries(PO_COLORS)) { if (po.startsWith(k)) return v; }
  return '#7B5EA7';
}

function saveNewBlock() {
  const line   = parseInt(document.getElementById('pa-line').value);
  const model  = document.getElementById('pa-model').value;
  const po     = document.getElementById('pa-po').value;
  const colour = document.getElementById('pa-colour').value.trim();
  const qty    = parseFloat(document.getElementById('pa-qty').value);
  const pph    = parseFloat(document.getElementById('pa-pph').value);
  const start  = document.getElementById('pa-start').value;
  if (!line || !model || !po || !colour || !qty || !pph || !start) {
    showToast('Please fill in all fields', 'warn'); return;
  }
  if (new Date(start + 'T00:00:00').getDay() === 0) {
    showToast('Cannot start on Sunday', 'warn'); return;
  }
  PLAN_BLOCKS.push({ id: 'PB' + Date.now(), line, model, po, colour, qty, pph, start, color: getPOColor(po) });
  closePlanAdd();
  renderPlanning();
  showToast('Block added');
}

/* ── Hours panel ──────────────────────────────────────────────── */
function togglePlanHoursPanel() {
  const p = document.getElementById('plan-hrs-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function savePlanHours() {
  for (let d = 0; d <= 6; d++) {
    const el = document.getElementById(`ph-${d}`);
    if (el && !el.disabled) PLAN_HRS[d] = parseFloat(el.value) || 0;
  }
  togglePlanHoursPanel();
  renderPlanning();
  showToast('Working hours updated');
}

/* ── Print ────────────────────────────────────────────────────── */
function printGantt() {
  const total    = planDaysInMonth(planYear, planMonth);
  const mStr     = String(planMonth + 1).padStart(2, '0');
  const mStart   = `${planYear}-${mStr}-01`;
  const mEnd     = `${planYear}-${mStr}-${String(total).padStart(2, '0')}`;
  const visible  = PLAN_BLOCKS.filter(b => {
    const e = planCalcEnd(b.start, b.qty, b.pph);
    return b.start <= mEnd && e >= mStart;
  });
  if (!visible.length) { showToast('No blocks this month', 'warn'); return; }
  const rows = visible.map(b => {
    const e = planCalcEnd(b.start, b.qty, b.pph);
    return [`Line ${b.line}`, b.model, b.po, b.colour,
            b.qty.toLocaleString(), `${b.pph} pph`,
            planFmtDate(b.start), planFmtDate(e), `${planWorkDays(b.start, b.qty, b.pph)} days`];
  });
  openPrintWin(
    `Planning — ${PLAN_MONTH_NAMES[planMonth]} ${planYear}`,
    `${PLAN_MONTH_NAMES[planMonth]} ${planYear} · ${visible.length} blocks · 20 Sewing Lines`,
    buildTable(['Line','Model','PO','Colour','Qty','PPH','Start','Est. End','Working Days'], rows)
  );
}

/* ══════════════════════════════════════════════════════════════
   CUTTING
   ══════════════════════════════════════════════════════════════ */

/* Standard fabric consumption per piece (metres) per model */
const CUT_SPEC = { 'AM-0045': 0.43, 'AM-0052': 0.38, 'AM-0039': 0.41 };

const CUTTING_LOG = [
  { id:'C001', date:'07 Apr 2026', po:'ASOS-PO-44521-A', model:'AM-0045',
    qty:450, consumed:197.2, required:193.5, waste:1.88, op:'Youssef B.' },
  { id:'C002', date:'08 Apr 2026', po:'ASOS-PO-44521-A', model:'AM-0045',
    qty:550, consumed:248.5, required:236.5, waste:4.83, op:'Youssef B.' },
];

let cutIdSeq = CUTTING_LOG.length + 1;

function renderCutKPIs() {
  const total  = CUTTING_LOG.reduce((a,r)=>a+r.qty,0);
  const avgW   = CUTTING_LOG.length ? (CUTTING_LOG.reduce((a,r)=>a+r.waste,0)/CUTTING_LOG.length).toFixed(2) : '—';
  const alerts = CUTTING_LOG.filter(r=>r.waste>3).length;
  document.getElementById('cut-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-eyebrow">Pieces Cut</div>
      <div class="kpi-num">${total.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Sessions</div>
      <div class="kpi-num">${CUTTING_LOG.length}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Avg Waste %</div>
      <div class="kpi-num${avgW>3?' gold':''}">${avgW}<span style="font-size:1.2rem">%</span></div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">High-Waste Alerts</div>
      <div class="kpi-num${alerts?' gold':''}">${alerts}</div></div>`;
}

function renderCutTable() {
  const el = document.getElementById('cut-log-table');
  document.getElementById('cut-log-count').textContent = CUTTING_LOG.length + ' entries';
  if (!CUTTING_LOG.length) {
    el.innerHTML = '<div class="log-empty">No entries yet. Log a session above.</div>';
    return;
  }
  const rows = [...CUTTING_LOG].reverse().map(r=>{
    const hi = r.waste > 3;
    return `<tr>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.id}</span></td>
      <td>${r.date}</td>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.po}</span></td>
      <td>${r.model}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem">${r.qty.toLocaleString()}</td>
      <td style="text-align:right">${r.consumed.toFixed(1)} m</td>
      <td style="text-align:right">${r.required.toFixed(1)} m</td>
      <td style="text-align:right" class="${hi?'cut-high':''}">${r.waste.toFixed(2)}%${hi?' ⚠':''}
      </td>
      <td>${r.op}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="tbl">
    <thead><tr>
      <th>ID</th><th>Date</th><th>PO</th><th>Model</th>
      <th style="text-align:right">Qty</th>
      <th style="text-align:right">Consumed</th>
      <th style="text-align:right">Required</th>
      <th style="text-align:right">Waste %</th>
      <th>Operator</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderCutting() {
  /* Populate order dropdown */
  const sel = document.getElementById('cut-po');
  sel.innerHTML = '<option value="">Select order…</option>' +
    ORDERS.map(o=>`<option value="${o.po}">${o.po}</option>`).join('');

  renderCutKPIs();
  renderCutTable();
}

function onCutPoChange() {
  const po = document.getElementById('cut-po').value;
  const ord = ORDERS.find(o=>o.po===po);
  document.getElementById('cut-model').value = ord ? ord.model : '';
  onCutCalc();
}

function onCutCalc() {
  const qty      = parseFloat(document.getElementById('cut-qty').value)      || 0;
  const consumed = parseFloat(document.getElementById('cut-consumed').value) || 0;
  const required = parseFloat(document.getElementById('cut-required').value) || 0;

  /* Auto-fill required if model has a spec and user hasn't entered it */
  const model = document.getElementById('cut-model').value;
  const reqInput = document.getElementById('cut-required');
  if (!reqInput.value && qty > 0 && CUT_SPEC[model]) {
    const autoReq = +(qty * CUT_SPEC[model]).toFixed(1);
    reqInput.value = autoReq;
  }

  const req = parseFloat(reqInput.value) || 0;
  const numEl = document.getElementById('cut-waste-num');
  const alertEl = document.getElementById('cut-waste-alert');

  if (consumed > 0 && req > 0) {
    const w = ((consumed - req) / consumed * 100);
    const wDisp = w < 0 ? '0.00' : w.toFixed(2);
    numEl.textContent = wDisp;
    numEl.className = 'waste-num' + (w > 3 ? ' high' : '');
    alertEl.classList.toggle('show', w > 3);
  } else {
    numEl.textContent = '—';
    numEl.className = 'waste-num';
    alertEl.classList.remove('show');
  }
}

function saveCutLog() {
  const po       = document.getElementById('cut-po').value;
  const model    = document.getElementById('cut-model').value;
  const qty      = parseFloat(document.getElementById('cut-qty').value);
  const consumed = parseFloat(document.getElementById('cut-consumed').value);
  const required = parseFloat(document.getElementById('cut-required').value);
  const op       = document.getElementById('cut-op').value.trim();

  if (!po)            { showToast('Select a PO number.'); return; }
  if (!qty || qty<1)  { showToast('Enter a valid quantity.'); return; }
  if (!consumed)      { showToast('Enter fabric consumed.'); return; }
  if (!required)      { showToast('Enter fabric required.'); return; }
  if (!op)            { showToast('Enter the operator name.'); return; }

  const waste = Math.max(0, (consumed - required) / consumed * 100);
  const now   = new Date();
  const dateStr = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const id    = 'C' + String(cutIdSeq++).padStart('3','0');

  CUTTING_LOG.push({ id, date:dateStr, po, model, qty, consumed, required,
                     waste:+waste.toFixed(2), op });

  /* Clear form */
  ['cut-po','cut-model','cut-qty','cut-consumed','cut-required','cut-op'].forEach(id=>{
    const el=document.getElementById(id);
    if(el.tagName==='SELECT') el.value=''; else el.value='';
  });
  document.getElementById('cut-waste-num').textContent='—';
  document.getElementById('cut-waste-num').className='waste-num';
  document.getElementById('cut-waste-alert').classList.remove('show');

  renderCutKPIs();
  renderCutTable();
  lucide.createIcons();
  showToast(waste>3 ? '⚠ Entry saved — waste above 3%!' : 'Cutting session saved.');
}


/* ══════════════════════════════════════════════════════════════
   SEWING
   ══════════════════════════════════════════════════════════════ */

const DEFECT_TYPES = ['Stitching','Tension','Skip Stitch','Seam Pucker','Raw Edge','Open Seam'];

const SEWING_LOG = [
  { id:'S001', date:'10 Apr 2026', line:5, period:'AM', po:'ASOS-PO-44521-A', pieces:48, defects:['Tension','Skip Stitch'] },
  { id:'S002', date:'10 Apr 2026', line:5, period:'PM', po:'ASOS-PO-44521-A', pieces:52, defects:['Stitching'] },
  { id:'S003', date:'11 Apr 2026', line:6, period:'AM', po:'ASOS-PO-44521-A', pieces:44, defects:[] },
  { id:'S004', date:'11 Apr 2026', line:6, period:'PM', po:'ASOS-PO-44521-A', pieces:49, defects:['Seam Pucker'] },
  { id:'S005', date:'12 Apr 2026', line:5, period:'AM', po:'ASOS-PO-44521-A', pieces:51, defects:[] },
  { id:'S006', date:'12 Apr 2026', line:6, period:'AM', po:'ASOS-PO-44521-A', pieces:47, defects:['Raw Edge'] },
];

let sewIdSeq  = SEWING_LOG.length + 1;
let sewPeriod = 'AM';

function selectPeriod(p) {
  sewPeriod = p;
  document.getElementById('btn-AM').classList.toggle('active', p==='AM');
  document.getElementById('btn-PM').classList.toggle('active', p==='PM');
}

function renderSewKPIs() {
  const totalPcs   = SEWING_LOG.reduce((a,r)=>a+r.pieces,0);
  const totalDef   = SEWING_LOG.reduce((a,r)=>a+r.defects.length,0);
  const defRate    = totalPcs ? (totalDef/totalPcs*100).toFixed(1) : '0.0';
  document.getElementById('sew-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-eyebrow">Pieces Output</div>
      <div class="kpi-num">${totalPcs.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Sessions</div>
      <div class="kpi-num">${SEWING_LOG.length}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Total Defects</div>
      <div class="kpi-num${totalDef?'':' muted'}">${totalDef}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Defect Rate</div>
      <div class="kpi-num${defRate>2?' gold':''}">${defRate}<span style="font-size:1.2rem">%</span></div></div>`;
}

function renderSewTable() {
  const el = document.getElementById('sew-log-table');
  document.getElementById('sew-log-count').textContent = SEWING_LOG.length + ' entries';
  if (!SEWING_LOG.length) {
    el.innerHTML = '<div class="log-empty">No entries yet. Log a session above.</div>';
    return;
  }
  const rows = [...SEWING_LOG].reverse().map(r=>{
    const defRate = r.pieces ? (r.defects.length/r.pieces*100).toFixed(1) : '0.0';
    const pills   = r.defects.map(d=>`<span class="defect-pill">${d}</span>`).join('');
    return `<tr>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.id}</span></td>
      <td>${r.date}</td>
      <td style="text-align:center;font-family:'Bebas Neue',sans-serif;font-size:1.1rem">${r.line}</td>
      <td style="text-align:center">${r.period}</td>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.po}</span></td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem">${r.pieces}</td>
      <td>${pills||'<span style="color:var(--muted2);font-size:.75rem">None</span>'}</td>
      <td style="text-align:right;color:${r.defects.length?'#9C7C2E':'var(--muted)'}">${defRate}%</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="tbl">
    <thead><tr>
      <th>ID</th><th>Date</th>
      <th style="text-align:center">Line</th>
      <th style="text-align:center">Period</th>
      <th>PO</th>
      <th style="text-align:right">Pieces</th>
      <th>Defects</th>
      <th style="text-align:right">Rate %</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderDefectChecks() {
  document.getElementById('defect-checks').innerHTML = DEFECT_TYPES.map(d=>
    `<label class="defect-check">
      <input type="checkbox" value="${d}" id="dc-${d.replace(/\s/g,'-')}">
      ${d}
    </label>`
  ).join('');
}

function renderSewing() {
  /* Order dropdown */
  const sel = document.getElementById('sew-po');
  sel.innerHTML = '<option value="">Select order…</option>' +
    ORDERS.map(o=>`<option value="${o.po}">${o.po}</option>`).join('');

  /* Today as default date */
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('sew-date').value = today;

  renderDefectChecks();
  renderSewKPIs();
  renderSewTable();
}

function saveSewLog() {
  const po     = document.getElementById('sew-po').value;
  const line   = parseInt(document.getElementById('sew-line').value);
  const dateRaw= document.getElementById('sew-date').value;
  const pieces = parseInt(document.getElementById('sew-pieces').value);

  if (!po)              { showToast('Select a PO number.'); return; }
  if (!line||line<1||line>20) { showToast('Enter a line number (1–20).'); return; }
  if (!dateRaw)         { showToast('Select a date.'); return; }
  if (!pieces||pieces<0){ showToast('Enter pieces completed.'); return; }

  const defects = DEFECT_TYPES.filter(d=>{
    const el = document.getElementById('dc-' + d.replace(/\s/g,'-'));
    return el && el.checked;
  });

  const dateObj = new Date(dateRaw);
  const dateStr = dateObj.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const id      = 'S' + String(sewIdSeq++).padStart(3,'0');

  SEWING_LOG.push({ id, date:dateStr, line, period:sewPeriod, po, pieces, defects });

  /* Clear form */
  document.getElementById('sew-pieces').value = '';
  document.getElementById('sew-line').value   = '';
  DEFECT_TYPES.forEach(d=>{
    const el=document.getElementById('dc-'+d.replace(/\s/g,'-'));
    if(el) el.checked=false;
  });

  renderSewKPIs();
  renderSewTable();
  lucide.createIcons();
  showToast('Sewing session saved.');
}

/* ══════════════════════════════════════════════════════════════
   FINISHING & QC
   ══════════════════════════════════════════════════════════════ */

const FINISHING_LOG = [
  { id:'F001', date:'10 Apr 2026', po:'ASOS-PO-44521-A', model:'AM-0045',
    pressed:220, inspected:200, passed:194, failed:6,  aql:'2.5', inspector:'Fatima R.' },
  { id:'F002', date:'11 Apr 2026', po:'ASOS-PO-44521-A', model:'AM-0045',
    pressed:180, inspected:175, passed:172, failed:3,  aql:'2.5', inspector:'Fatima R.' },
  { id:'F003', date:'12 Apr 2026', po:'ASOS-PO-44521-A', model:'AM-0045',
    pressed:200, inspected:195, passed:188, failed:7,  aql:'4.0', inspector:'Nadia H.'  },
];

let finIdSeq = FINISHING_LOG.length + 1;

function renderFinKPIs() {
  const totalPressed = FINISHING_LOG.reduce((a,r)=>a+r.pressed,0);
  const totalInsp    = FINISHING_LOG.reduce((a,r)=>a+r.inspected,0);
  const totalPass    = FINISHING_LOG.reduce((a,r)=>a+r.passed,0);
  const totalFail    = FINISHING_LOG.reduce((a,r)=>a+r.failed,0);
  const passRate     = totalInsp ? (totalPass/totalInsp*100).toFixed(1) : '—';
  document.getElementById('fin-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-eyebrow">Pieces Pressed</div>
      <div class="kpi-num">${totalPressed.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Sessions</div>
      <div class="kpi-num">${FINISHING_LOG.length}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">AQL Pass Rate</div>
      <div class="kpi-num">${passRate}<span style="font-size:1.2rem">%</span></div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Total Failed</div>
      <div class="kpi-num${totalFail?'':' muted'}">${totalFail}</div></div>`;
}

function renderFinTable() {
  const el = document.getElementById('fin-log-table');
  document.getElementById('fin-log-count').textContent = FINISHING_LOG.length + ' entries';
  if (!FINISHING_LOG.length) {
    el.innerHTML = '<div class="log-empty">No entries yet. Log a session above.</div>';
    return;
  }
  const rows = [...FINISHING_LOG].reverse().map(r => {
    const rate = r.inspected ? (r.failed / r.inspected * 100).toFixed(1) : '0.0';
    const hi   = parseFloat(rate) > 5;
    return `<tr>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.id}</span></td>
      <td>${r.date}</td>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.po}</span></td>
      <td>${r.model}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem">${r.pressed.toLocaleString()}</td>
      <td style="text-align:right">${r.inspected}</td>
      <td style="text-align:right" class="fail-ok">${r.passed}</td>
      <td style="text-align:right" class="${hi?'fail-high':r.failed?'':'muted'}">${r.failed}</td>
      <td style="text-align:right" class="${hi?'fail-high':''}">${rate}%${hi?' ⚠':''}</td>
      <td><span class="aql-chip">${r.aql}</span></td>
      <td>${r.inspector}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="tbl">
    <thead><tr>
      <th>ID</th><th>Date</th><th>PO</th><th>Model</th>
      <th style="text-align:right">Pressed</th>
      <th style="text-align:right">Inspected</th>
      <th style="text-align:right">Passed</th>
      <th style="text-align:right">Failed</th>
      <th style="text-align:right">Fail%</th>
      <th>AQL</th><th>Inspector</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderFinishing() {
  const sel = document.getElementById('fin-po');
  sel.innerHTML = '<option value="">Select order…</option>' +
    ORDERS.map(o=>`<option value="${o.po}">${o.po}</option>`).join('');
  document.getElementById('fin-date').value = new Date().toISOString().slice(0,10);
  renderFinKPIs();
  renderFinTable();
}

function onFinPoChange() {
  const po  = document.getElementById('fin-po').value;
  const ord = ORDERS.find(o=>o.po===po);
  document.getElementById('fin-model').value = ord ? ord.model : '';
}

function onFinCalc() {
  const inspected = parseInt(document.getElementById('fin-inspected').value) || 0;
  const failed    = parseInt(document.getElementById('fin-failed').value)    || 0;
  const passed    = Math.max(0, inspected - failed);
  const dispEl    = document.getElementById('fin-passed-display');
  const alertEl   = document.getElementById('fin-fail-alert');
  dispEl.textContent = inspected ? passed : '—';
  const rate = inspected ? failed / inspected * 100 : 0;
  alertEl.classList.toggle('show', rate > 5);
}

function saveFinLog() {
  const po        = document.getElementById('fin-po').value;
  const model     = document.getElementById('fin-model').value;
  const dateRaw   = document.getElementById('fin-date').value;
  const inspector = document.getElementById('fin-inspector').value.trim();
  const pressed   = parseInt(document.getElementById('fin-pressed').value)   || 0;
  const inspected = parseInt(document.getElementById('fin-inspected').value) || 0;
  const failed    = parseInt(document.getElementById('fin-failed').value)    || 0;
  const aql       = document.getElementById('fin-aql').value;

  if (!po)          { showToast('Select a PO number.'); return; }
  if (!dateRaw)     { showToast('Select a date.'); return; }
  if (!inspector)   { showToast('Enter the inspector name.'); return; }
  if (inspected < 1){ showToast('Enter inspected quantity.'); return; }
  if (failed > inspected){ showToast('Failed cannot exceed inspected.'); return; }

  const passed    = Math.max(0, inspected - failed);
  const dateStr   = new Date(dateRaw).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const id        = 'F' + String(finIdSeq++).padStart(3,'0');

  FINISHING_LOG.push({ id, date:dateStr, po, model, pressed, inspected, passed, failed, aql, inspector });

  /* Reset */
  ['fin-pressed','fin-inspected','fin-failed','fin-inspector'].forEach(x=>{ document.getElementById(x).value=''; });
  document.getElementById('fin-passed-display').textContent = '—';
  document.getElementById('fin-fail-alert').classList.remove('show');

  renderFinKPIs();
  renderFinTable();
  lucide.createIcons();
  const rate = inspected ? (failed/inspected*100).toFixed(1) : 0;
  showToast(rate > 5 ? `⚠ Entry saved — fail rate ${rate}%` : 'QC session saved.');
}


/* ══════════════════════════════════════════════════════════════
   PACKING
   ══════════════════════════════════════════════════════════════ */

const CARTONS = [
  { id:'CTN-0001', po:'ASOS-PO-44521-A', model:'AM-0045', date:'10 Apr 2026',
    sizes:{S:12,M:14,L:12,XL:10}, total:48, gross:8.2, net:7.8 },
  { id:'CTN-0002', po:'ASOS-PO-44521-A', model:'AM-0045', date:'10 Apr 2026',
    sizes:{S:12,M:14,L:12,XL:10}, total:48, gross:8.1, net:7.7 },
  { id:'CTN-0003', po:'ASOS-PO-44521-A', model:'AM-0045', date:'11 Apr 2026',
    sizes:{S:12,M:14,L:12,XL:10}, total:48, gross:8.3, net:7.9 },
  { id:'CTN-0004', po:'ASOS-PO-44521-A', model:'AM-0045', date:'11 Apr 2026',
    sizes:{S:12,M:14,L:12,XL:10}, total:48, gross:8.0, net:7.6 },
];

let ctnSeq = CARTONS.length + 1;

function nextCtnId() {
  return 'CTN-' + String(ctnSeq).padStart(4,'0');
}

function renderPackKPIs() {
  const totalCtns  = CARTONS.length;
  const totalPcs   = CARTONS.reduce((a,c)=>a+c.total,0);
  const avgGross   = totalCtns ? (CARTONS.reduce((a,c)=>a+c.gross,0)/totalCtns).toFixed(1) : '—';
  const pos        = new Set(CARTONS.map(c=>c.po)).size;
  document.getElementById('pack-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-eyebrow">Total Cartons</div>
      <div class="kpi-num">${totalCtns}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Pieces Packed</div>
      <div class="kpi-num">${totalPcs.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Avg Gross (kg)</div>
      <div class="kpi-num">${avgGross}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">POs Covered</div>
      <div class="kpi-num">${pos}</div></div>`;
}

function renderPackTable() {
  const el = document.getElementById('pack-log-table');
  document.getElementById('pack-log-count').textContent = CARTONS.length + ' cartons';
  if (!CARTONS.length) {
    el.innerHTML = '<div class="log-empty">No cartons yet. Create one above.</div>';
    return;
  }
  const rows = [...CARTONS].reverse().map(c => {
    const sizeSummary = Object.entries(c.sizes)
      .filter(([,v])=>v>0)
      .map(([k,v])=>`${k}×${v}`)
      .join(' / ');
    return `<tr>
      <td class="ctn-id">${c.id}</td>
      <td>${c.date}</td>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${c.po}</span></td>
      <td>${c.model}</td>
      <td style="font-size:.76rem;color:var(--muted)">${sizeSummary}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem">${c.total}</td>
      <td style="text-align:right">${c.gross.toFixed(1)} kg</td>
      <td style="text-align:right;color:var(--muted)">${c.net ? c.net.toFixed(1)+' kg' : '—'}</td>
      <td>
        <button class="btn-sm" onclick="printCartonLabel('${c.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Label
        </button>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="tbl">
    <thead><tr>
      <th>Carton #</th><th>Date</th><th>PO</th><th>Model</th>
      <th>Sizes</th>
      <th style="text-align:right">Pcs</th>
      <th style="text-align:right">Gross</th>
      <th style="text-align:right">Net</th>
      <th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderPacking() {
  const sel = document.getElementById('pack-po');
  sel.innerHTML = '<option value="">Select order…</option>' +
    ORDERS.map(o=>`<option value="${o.po}">${o.po}</option>`).join('');
  document.getElementById('pack-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('pack-ctn-id').value = nextCtnId();
  renderPackKPIs();
  renderPackTable();
}

function onPackPoChange() {
  const po  = document.getElementById('pack-po').value;
  const ord = ORDERS.find(o=>o.po===po);
  document.getElementById('pack-model').value = ord ? ord.model : '';
  document.getElementById('pack-ctn-id').value = nextCtnId();
  const sizesWrap = document.getElementById('pack-sizes');
  if (!ord || !ord.matrix || !ord.matrix.sizes) {
    sizesWrap.innerHTML = '<span style="font-size:.78rem;color:var(--muted2)">No size data for this order.</span>';
    document.getElementById('pack-total').textContent = '0';
    return;
  }
  sizesWrap.innerHTML = ord.matrix.sizes.map(s=>`
    <div class="size-inp-col">
      <span>${s}</span>
      <input type="number" min="0" value="0" id="psz-${s}" oninput="recalcPackTotal()">
    </div>`).join('');
  recalcPackTotal();
}

function recalcPackTotal() {
  const inputs = document.querySelectorAll('#pack-sizes input[type=number]');
  let total = 0;
  inputs.forEach(i=>{ total += parseInt(i.value)||0; });
  document.getElementById('pack-total').textContent = total;
}

function collectPackForm() {
  const po    = document.getElementById('pack-po').value;
  const model = document.getElementById('pack-model').value;
  const dateRaw = document.getElementById('pack-date').value;
  const gross = parseFloat(document.getElementById('pack-gross').value) || 0;
  const net   = parseFloat(document.getElementById('pack-net').value)   || 0;

  if (!po)      { showToast('Select a PO number.'); return null; }
  if (!dateRaw) { showToast('Select a date.'); return null; }
  if (!gross)   { showToast('Enter gross weight.'); return null; }

  const sizeInputs = document.querySelectorAll('#pack-sizes input[type=number]');
  const sizes = {};
  let total = 0;
  sizeInputs.forEach(inp => {
    const sz = inp.id.replace('psz-','');
    const v  = parseInt(inp.value)||0;
    sizes[sz] = v;
    total += v;
  });
  if (!total) { showToast('Enter at least one size quantity.'); return null; }

  const dateStr = new Date(dateRaw).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  return { po, model, dateStr, sizes, total, gross, net };
}

function saveCarton(n) {
  const form = collectPackForm();
  if (!form) return;
  for (let i=0; i<n; i++) {
    const id = 'CTN-' + String(ctnSeq++).padStart(4,'0');
    CARTONS.push({ id, po:form.po, model:form.model, date:form.dateStr,
                   sizes:Object.assign({},form.sizes), total:form.total,
                   gross:form.gross, net:form.net });
  }
  document.getElementById('pack-ctn-id').value = nextCtnId();
  renderPackKPIs();
  renderPackTable();
  lucide.createIcons();
  showToast(n > 1 ? `${n} cartons created.` : 'Carton saved.');
}

function bulkCreateCartons() {
  const n = parseInt(document.getElementById('bulk-n').value);
  if (!n || n < 2) { showToast('Enter a number ≥ 2 for bulk create.'); return; }
  saveCarton(n);
}

function printCartonLabel(id) {
  const c = CARTONS.find(x=>x.id===id);
  if (!c) return;
  const sizeLine = Object.entries(c.sizes)
    .filter(([,v])=>v>0)
    .map(([k,v])=>`<td style="padding:4px 14px;text-align:center"><b>${k}</b><br>${v} pcs</td>`)
    .join('');
  const win = window.open('','_blank','width=420,height=560');
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8">
    <title>Carton Label — ${c.id}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Arial',sans-serif;padding:24px;border:3px solid #000;width:400px;color:#000}
      .brand{font-size:1.4rem;font-weight:900;letter-spacing:.18em;text-transform:uppercase;text-align:center;margin-bottom:2px}
      .sub{font-size:.65rem;text-align:center;color:#555;margin-bottom:14px;letter-spacing:.06em}
      hr{border:none;border-top:1px solid #000;margin:10px 0}
      .row{display:flex;justify-content:space-between;margin:6px 0;font-size:.82rem}
      .row b{font-size:.68rem;text-transform:uppercase;color:#666;display:block;margin-bottom:1px}
      .sizes-tbl{width:100%;border-collapse:collapse;margin:10px 0;text-align:center;font-size:.82rem}
      .sizes-tbl td{border:1px solid #ccc;padding:6px 10px}
      .total{text-align:center;font-size:1.6rem;font-weight:900;margin:8px 0}
      .footer{font-size:.6rem;color:#888;text-align:center;margin-top:10px}
    </style>
  </head><body>
    <div class="brand">AVA MARIE</div>
    <div class="sub">Tangier, Morocco &mdash; Export Quality</div>
    <hr>
    <div class="row"><div><b>Carton #</b>${c.id}</div><div style="text-align:right"><b>Date</b>${c.date}</div></div>
    <div class="row"><div><b>PO Number</b>${c.po}</div><div style="text-align:right"><b>Model</b>${c.model}</div></div>
    <hr>
    <table class="sizes-tbl"><tr>${sizeLine}</tr></table>
    <div class="total">${c.total} PCS</div>
    <hr>
    <div class="row"><div><b>Gross Weight</b>${c.gross.toFixed(1)} kg</div><div style="text-align:right"><b>Net Weight</b>${c.net ? c.net.toFixed(1)+' kg' : '—'}</div></div>
    <div class="footer">Printed ${new Date().toLocaleDateString('en-GB')}</div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(), 300);
}


/* ══════════════════════════════════════════════════════════════
   MATERIALS
   ══════════════════════════════════════════════════════════════ */

function setMatTab(btn, paneId) {
  document.querySelectorAll('.mat-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mat-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(paneId).classList.add('active');
  lucide.createIcons();
}

function parseMtrlNum(str) {
  return parseFloat((str || '').replace(/[^\d.]/g, '')) || 0;
}

function renderMatKPIs() {
  const all      = ORDERS.flatMap(o => o.materials || []);
  const inStock  = all.filter(m => m.status === 'In Stock').length;
  const pending  = all.filter(m => m.status !== 'In Stock').length;
  document.getElementById('mat-kpis').innerHTML = `
    <div class="kpi-card"><div class="kpi-eyebrow">Material Lines</div>
      <div class="kpi-num">${all.length}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">In Stock</div>
      <div class="kpi-num" style="color:#196741">${inStock}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Pending / On Order</div>
      <div class="kpi-num${pending ? ' gold' : ''}">${pending}</div></div>
    <div class="kpi-card"><div class="kpi-eyebrow">Active POs</div>
      <div class="kpi-num">${ORDERS.length}</div></div>`;
}

function renderReqTable() {
  const filter = document.getElementById('req-po-filter').value;
  const orders = filter ? ORDERS.filter(o => o.po === filter) : ORDERS;
  const sc = {
    'In Stock':          'chip-green',
    'Awaiting Delivery': 'chip-amber',
    'Partial':           'chip-blue',
    'On Order':          'chip-grey',
  };
  const rows = orders.flatMap(o => (o.materials || []).map(m => {
    const reqN  = parseMtrlNum(m.req);
    const recvN = parseMtrlNum(m.received);
    const unit  = ((m.req || '').match(/[a-zA-Z]+/) || [''])[0];
    const bal   = reqN - recvN;
    const balCell = bal > 0
      ? `<span style="color:#DC2626;font-weight:600">−${bal.toLocaleString()}${unit ? ' ' + unit : ''}</span>`
      : `<span style="color:#196741;font-weight:600">✓</span>`;
    return `<tr>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${o.po}</span></td>
      <td>${m.name}</td>
      <td style="color:var(--muted)">${m.supplier}</td>
      <td style="text-align:right">${m.req}</td>
      <td style="text-align:right">${m.ordered}</td>
      <td style="text-align:right">${m.received}</td>
      <td style="text-align:right">${balCell}</td>
      <td><span class="chip ${sc[m.status] || 'chip-grey'}">${m.status}</span></td>
    </tr>`;
  })).join('');

  document.getElementById('req-table').innerHTML = rows
    ? `<table class="tbl">
        <thead><tr>
          <th>PO</th><th>Material</th><th>Supplier</th>
          <th style="text-align:right">Required</th>
          <th style="text-align:right">Ordered</th>
          <th style="text-align:right">Received</th>
          <th style="text-align:right">Balance</th>
          <th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    : '<div class="log-empty">No materials data found.</div>';
}

/* ── Incoming data ─────────────────────────────────────────────── */
const INCOMING = [
  { id:'INC-001', po:'ASOS-PO-44521-A', supplier:'Duchesse-Satin SA', material:'Satin Duchess — Ivory',      qty:'1,850 m', eta:'20 Mar 2026', recvDate:'20 Mar 2026', status:'Confirmed' },
  { id:'INC-002', po:'ASOS-PO-44521-A', supplier:'Poly-Tissu MA',     material:'Poly Lining',                qty:'2,280 m', eta:'22 Mar 2026', recvDate:'22 Mar 2026', status:'Confirmed' },
  { id:'INC-003', po:'ASOS-PO-44521-A', supplier:'YKK Morocco',       material:'YKK Zip 60 cm (concealed)',  qty:'1,200',   eta:'05 Apr 2026', recvDate:'05 Apr 2026', status:'Partial'   },
  { id:'INC-004', po:'ASOS-PO-44521-A', supplier:'Duchesse-Satin SA', material:'Satin Duchess — Black',      qty:'666 m',   eta:'20 Apr 2026', recvDate:'',            status:'Expected'  },
  { id:'INC-005', po:'ASOS-PO-44521-A', supplier:'Duchesse-Satin SA', material:'Satin Duchess — Navy',       qty:'592 m',   eta:'20 Apr 2026', recvDate:'',            status:'Expected'  },
  { id:'INC-006', po:'ASOS-PO-44521-A', supplier:'Etiquettes SA',     material:'Label Set (brand+care+sz)', qty:'2,400',   eta:'25 Apr 2026', recvDate:'',            status:'Expected'  },
  { id:'INC-007', po:'ASOS-PO-44521-B', supplier:'Duchesse-Satin SA', material:'Satin Duchess — Dusty Rose', qty:'296 m',  eta:'20 Apr 2026', recvDate:'',            status:'Expected'  },
  { id:'INC-008', po:'ASOS-PO-44521-B', supplier:'Duchesse-Satin SA', material:'Satin Duchess — Mauve',      qty:'555 m',  eta:'20 Apr 2026', recvDate:'',            status:'Expected'  },
];
let incIdSeq = INCOMING.length + 1;

/* ── Outgoing data ─────────────────────────────────────────────── */
const OUTGOING = [
  {
    id:'OUT-001', ref:'SHP-ASOS-0041',
    po:'ASOS-PO-44521-A', model:'AM-0045', modelName:'Robe Satin Longue',
    client:'ASOS',
    dest:'ASOS Fulfilment Centre, Hemel Hempstead HP2 7EZ, UK',
    shipper:'Ava Marie, Zone Industrielle, Tangier, Morocco',
    dispatchDate:'11 Apr 2026', etd:'14 Apr 2026', etaClient:'19 Apr 2026',
    status:'Dispatched', unitPrice:19.29,
  },
];
let outIdSeq = OUTGOING.length + 1;

/* ── Incoming ─────────────────────────────────────────────────── */
function incChip(s) {
  const m = { 'Confirmed':'chip-green', 'Partial':'chip-blue', 'Expected':'chip-amber' };
  return `<span class="chip ${m[s]||'chip-grey'}">${s}</span>`;
}

function renderIncTable() {
  const el = document.getElementById('inc-table');
  document.getElementById('inc-count').textContent = INCOMING.length + ' shipments';
  const rows = [...INCOMING].reverse().map(r => `<tr>
    <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.id}</span></td>
    <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.po}</span></td>
    <td>${r.supplier}</td>
    <td>${r.material}</td>
    <td style="text-align:right">${r.qty}</td>
    <td>${r.eta}</td>
    <td>${r.recvDate || '<span style="color:var(--muted2)">—</span>'}</td>
    <td>${incChip(r.status)}</td>
    <td>${r.status === 'Expected'
      ? `<button class="btn-sm" onclick="confirmReceipt('${r.id}')"><i data-lucide="check"></i> Confirm</button>`
      : '<span style="color:var(--muted2);font-size:.75rem">—</span>'
    }</td>
  </tr>`).join('');
  el.innerHTML = `<table class="tbl">
    <thead><tr>
      <th>ID</th><th>PO</th><th>Supplier</th><th>Material</th>
      <th style="text-align:right">Qty</th><th>ETA</th><th>Received</th>
      <th>Status</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  lucide.createIcons();
}

function confirmReceipt(id) {
  const r = INCOMING.find(x => x.id === id);
  if (!r) return;
  r.status   = 'Confirmed';
  r.recvDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  renderIncTable();
  renderMatKPIs();
  showToast(`${r.id} marked as received.`);
}

function toggleIncForm() {
  const el = document.getElementById('inc-form-wrap');
  el.classList.toggle('open');
  if (el.classList.contains('open')) lucide.createIcons();
}

function saveIncoming() {
  const po       = document.getElementById('inc-po').value;
  const supplier = document.getElementById('inc-supplier').value.trim();
  const material = document.getElementById('inc-material').value.trim();
  const qty      = document.getElementById('inc-qty').value.trim();
  const etaRaw   = document.getElementById('inc-eta').value;
  if (!po || !supplier || !material || !qty || !etaRaw) { showToast('Fill all fields.'); return; }
  const eta = new Date(etaRaw).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const id  = 'INC-' + String(incIdSeq++).padStart(3, '0');
  INCOMING.push({ id, po, supplier, material, qty, eta, recvDate:'', status:'Expected' });
  ['inc-supplier','inc-material','inc-qty','inc-eta'].forEach(x => { document.getElementById(x).value = ''; });
  document.getElementById('inc-po').value = '';
  toggleIncForm();
  renderIncTable();
  renderMatKPIs();
  showToast('Incoming shipment added.');
}

/* ── Outgoing ─────────────────────────────────────────────────── */
function outChip(s) {
  const m = { 'Dispatched':'chip-blue', 'Delivered':'chip-green', 'Preparing':'chip-amber' };
  return `<span class="chip ${m[s]||'chip-grey'}">${s}</span>`;
}

function renderOutTable() {
  const el = document.getElementById('out-table');
  document.getElementById('out-count').textContent = OUTGOING.length + ' shipments';
  if (!OUTGOING.length) {
    el.innerHTML = '<div class="log-empty">No outgoing shipments yet.</div>';
    return;
  }
  const rows = [...OUTGOING].reverse().map(r => {
    const ctns     = CARTONS.filter(c => c.po === r.po);
    const totPcs   = ctns.reduce((a, c) => a + c.total, 0);
    const totGross = ctns.reduce((a, c) => a + c.gross, 0).toFixed(1);
    return `<tr>
      <td class="ctn-id" style="font-size:.9rem">${r.ref}</td>
      <td><span style="font-family:'Courier New',monospace;font-size:.73rem">${r.po}</span></td>
      <td>${r.client}</td>
      <td style="font-size:.76rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.dest}</td>
      <td style="text-align:right">${ctns.length}</td>
      <td style="text-align:right;font-family:'Bebas Neue',sans-serif;font-size:1.05rem">${totPcs.toLocaleString()}</td>
      <td style="text-align:right;color:var(--muted)">${totGross} kg</td>
      <td>${r.dispatchDate}</td>
      <td>${outChip(r.status)}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn-sm" onclick="printPackingList('${r.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Packing List
          </button>
          <button class="btn-sm" onclick="printInvoice('${r.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Invoice
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="tbl">
    <thead><tr>
      <th>Ref</th><th>PO</th><th>Client</th><th>Destination</th>
      <th style="text-align:right">Ctns</th>
      <th style="text-align:right">Pcs</th>
      <th style="text-align:right">Gross</th>
      <th>Dispatched</th><th>Status</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function toggleOutForm() {
  const el = document.getElementById('out-form-wrap');
  el.classList.toggle('open');
  if (el.classList.contains('open')) lucide.createIcons();
}

function onOutPoChange() {
  const po  = document.getElementById('out-po').value;
  const ord = ORDERS.find(o => o.po === po);
  if (ord) document.getElementById('out-dest').value = ord.client + ' — UK';
}

function saveOutgoing() {
  const po      = document.getElementById('out-po').value;
  const ref     = document.getElementById('out-ref').value.trim();
  const dest    = document.getElementById('out-dest').value.trim();
  const dispRaw = document.getElementById('out-dispatch').value;
  const etdRaw  = document.getElementById('out-etd').value;
  const etaRaw  = document.getElementById('out-eta').value;
  const uprice  = parseFloat(document.getElementById('out-uprice').value) || 0;
  if (!po || !ref || !dest || !dispRaw) { showToast('Fill all required fields.'); return; }
  const ord = ORDERS.find(o => o.po === po);
  const fmt = v => v ? new Date(v).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '';
  const id  = 'OUT-' + String(outIdSeq++).padStart(3, '0');
  OUTGOING.push({
    id, ref, po,
    model:     ord ? ord.model     : '',
    modelName: ord ? ord.modelName : '',
    client:    ord ? ord.client    : '',
    dest, shipper:'Ava Marie, Zone Industrielle, Tangier, Morocco',
    dispatchDate: fmt(dispRaw), etd: fmt(etdRaw), etaClient: fmt(etaRaw),
    status:'Preparing', unitPrice:uprice,
  });
  toggleOutForm();
  renderOutTable();
  showToast('Outgoing shipment created.');
}

/* ── Print: Packing List ─────────────────────────────────────── */
function printPackingList(id) {
  const shp = OUTGOING.find(x => x.id === id);
  if (!shp) return;
  const ctns     = CARTONS.filter(c => c.po === shp.po);
  const totPcs   = ctns.reduce((a, c) => a + c.total, 0);
  const totGross = ctns.reduce((a, c) => a + c.gross, 0).toFixed(2);
  const totNet   = ctns.reduce((a, c) => a + (c.net || 0), 0).toFixed(2);
  const ctnRows  = ctns.map((c, i) => {
    const sizes = Object.entries(c.sizes).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `<tr>
      <td>${i + 1}</td><td>${c.id}</td><td>${sizes}</td>
      <td style="text-align:right">${c.total}</td>
      <td style="text-align:right">${c.gross.toFixed(1)}</td>
      <td style="text-align:right">${c.net ? c.net.toFixed(1) : '—'}</td>
    </tr>`;
  }).join('');
  const win = window.open('', '_blank', 'width=860,height=700');
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8">
  <title>Packing List — ${shp.ref}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:32px}
    .brand{font-size:22px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
    .sub{font-size:10px;color:#666;margin-bottom:6px}
    .doc-type{font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#333;margin:14px 0 4px}
    hr{border:none;border-top:1.5px solid #000;margin:10px 0}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0}
    .box{border:1px solid #ccc;padding:9px 13px;border-radius:3px}
    .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:3px}
    .val{font-size:11px;line-height:1.55}
    table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11px}
    thead tr{background:#f4f4f4}
    th{padding:6px 9px;text-align:left;border:1px solid #ddd;font-size:9px;text-transform:uppercase;letter-spacing:.07em}
    td{padding:5px 9px;border:1px solid #ddd}
    tfoot td{font-weight:700;background:#f9f9f9}
    .footer{margin-top:18px;font-size:9px;color:#aaa;text-align:center}
    .print-btn{margin-top:16px;padding:8px 22px;cursor:pointer;font-size:12px}
    @media print{.print-btn{display:none}}
  </style></head><body>
  <div class="brand">AVA MARIE</div>
  <div class="sub">Zone Industrielle, Tangier, Morocco &nbsp;·&nbsp; contact@avamarie.co</div>
  <hr>
  <div class="doc-type">Packing List</div>
  <div class="two">
    <div class="box"><div class="lbl">Shipper</div><div class="val">${shp.shipper}</div></div>
    <div class="box"><div class="lbl">Consignee</div><div class="val">${shp.dest}</div></div>
  </div>
  <div class="two" style="margin-top:0">
    <div class="box"><div class="lbl">Ref / PO</div><div class="val"><b>${shp.ref}</b> &nbsp;/&nbsp; ${shp.po}</div></div>
    <div class="box"><div class="lbl">Dispatch / ETD / ETA</div><div class="val">${shp.dispatchDate} &nbsp;/&nbsp; ${shp.etd||'—'} &nbsp;/&nbsp; ${shp.etaClient||'—'}</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Carton</th><th>Contents</th>
      <th style="text-align:right">Pcs</th>
      <th style="text-align:right">Gross kg</th>
      <th style="text-align:right">Net kg</th></tr></thead>
    <tbody>${ctnRows}</tbody>
    <tfoot><tr><td colspan="3"><b>TOTAL — ${ctns.length} cartons</b></td>
      <td style="text-align:right">${totPcs}</td>
      <td style="text-align:right">${totGross}</td>
      <td style="text-align:right">${totNet}</td></tr></tfoot>
  </table>
  <div class="footer">Generated ${new Date().toLocaleDateString('en-GB')} &nbsp;—&nbsp; Ava Marie ERP</div>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  </body></html>`);
  win.document.close(); win.focus();
}

/* ── Print: Invoice ──────────────────────────────────────────── */
function printInvoice(id) {
  const shp = OUTGOING.find(x => x.id === id);
  if (!shp) return;
  const ctns     = CARTONS.filter(c => c.po === shp.po);
  const totPcs   = ctns.reduce((a, c) => a + c.total, 0);
  const totGross = ctns.reduce((a, c) => a + c.gross, 0).toFixed(2);
  const amount   = (totPcs * shp.unitPrice).toFixed(2);
  const fmtEur   = v => parseFloat(v).toLocaleString('en-GB', { minimumFractionDigits:2 });
  const win = window.open('', '_blank', 'width=860,height=700');
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8">
  <title>Invoice — ${shp.ref}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:32px}
    .brand{font-size:22px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
    .sub{font-size:10px;color:#666;margin-bottom:6px}
    .doc-type{font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#333;margin:14px 0 2px}
    .inv-ref{font-size:12px;color:#C4A35A;font-weight:700;margin-bottom:14px}
    hr{border:none;border-top:1.5px solid #000;margin:10px 0}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0}
    .box{border:1px solid #ccc;padding:9px 13px;border-radius:3px}
    .lbl{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#888;margin-bottom:3px}
    .val{font-size:11px;line-height:1.55}
    table{width:100%;border-collapse:collapse;margin:14px 0;font-size:11px}
    thead tr{background:#f4f4f4}
    th{padding:6px 9px;text-align:left;border:1px solid #ddd;font-size:9px;text-transform:uppercase;letter-spacing:.07em}
    td{padding:7px 9px;border:1px solid #ddd}
    .totals{width:280px;margin-left:auto;margin-top:0;font-size:11px}
    .totals td{border:none;padding:4px 9px}
    .grand td{font-size:13px;font-weight:900;border-top:2px solid #000;padding-top:7px}
    .terms{margin-top:18px;font-size:10px;color:#555;line-height:1.7}
    .footer{margin-top:18px;font-size:9px;color:#aaa;text-align:center}
    .print-btn{margin-top:16px;padding:8px 22px;cursor:pointer;font-size:12px}
    @media print{.print-btn{display:none}}
  </style></head><body>
  <div class="brand">AVA MARIE</div>
  <div class="sub">Zone Industrielle, Tangier, Morocco &nbsp;·&nbsp; contact@avamarie.co</div>
  <hr>
  <div class="doc-type">Commercial Invoice</div>
  <div class="inv-ref">Ref: ${shp.ref} &nbsp;·&nbsp; Date: ${shp.dispatchDate} &nbsp;·&nbsp; PO: ${shp.po}</div>
  <div class="two">
    <div class="box"><div class="lbl">Seller</div><div class="val">${shp.shipper}</div></div>
    <div class="box"><div class="lbl">Buyer</div><div class="val">${shp.dest}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Description</th><th>Model</th>
      <th style="text-align:right">Qty (pcs)</th>
      <th style="text-align:right">Unit Price (€)</th>
      <th style="text-align:right">Amount (€)</th>
    </tr></thead>
    <tbody><tr>
      <td>${shp.modelName}</td><td>${shp.model}</td>
      <td style="text-align:right">${totPcs.toLocaleString()}</td>
      <td style="text-align:right">${shp.unitPrice.toFixed(2)}</td>
      <td style="text-align:right">${fmtEur(amount)}</td>
    </tr></tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right">€ ${fmtEur(amount)}</td></tr>
    <tr><td style="color:#888">Gross weight</td><td style="text-align:right;color:#888">${totGross} kg</td></tr>
    <tr class="grand"><td>TOTAL</td><td style="text-align:right">€ ${fmtEur(amount)}</td></tr>
  </table>
  <div class="terms"><b>Payment Terms:</b> 30 days net &nbsp;|&nbsp; <b>Incoterms:</b> FOB Tangier &nbsp;|&nbsp; <b>Currency:</b> EUR</div>
  <div class="footer">Generated ${new Date().toLocaleDateString('en-GB')} &nbsp;—&nbsp; Ava Marie ERP</div>
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
  </body></html>`);
  win.document.close(); win.focus();
}

/* ── renderMaterials (updated) ───────────────────────────────── */
function renderMaterials() {
  const opts = ORDERS.map(o => `<option value="${o.po}">${o.po}</option>`).join('');
  document.getElementById('req-po-filter').innerHTML = '<option value="">All POs</option>' + opts;
  document.getElementById('inc-po').innerHTML        = '<option value="">Select…</option>' + opts;
  document.getElementById('out-po').innerHTML        = '<option value="">Select…</option>' + opts;
  renderMatKPIs();
  renderReqTable();
  renderIncTable();
  renderOutTable();
}


/* ══════════════════════════════════════════════════════════════
   SETTINGS
   ══════════════════════════════════════════════════════════════ */

function setStgTab(btn, paneId) {
  document.querySelectorAll('.stg-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.stg-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(paneId).classList.add('active');
  lucide.createIcons();
}

function saveCompanyInfo() {
  showToast('Company info saved.');
}

/* 20 production lines */
const PROD_LINES = [
  { line:1,  name:'Sewing Line 1',    type:'Sewing',   machines:12, operators:12, capacity:120, status:'Active',  supervisor:'Fatima R.'   },
  { line:2,  name:'Sewing Line 2',    type:'Sewing',   machines:12, operators:12, capacity:120, status:'Active',  supervisor:'Khadija M.'  },
  { line:3,  name:'Sewing Line 3',    type:'Sewing',   machines:12, operators:11, capacity:110, status:'Active',  supervisor:'Zineb H.'    },
  { line:4,  name:'Sewing Line 4',    type:'Sewing',   machines:12, operators:12, capacity:120, status:'Active',  supervisor:'Fatima R.'   },
  { line:5,  name:'Sewing Line 5',    type:'Sewing',   machines:14, operators:14, capacity:140, status:'Active',  supervisor:'Karim A.'    },
  { line:6,  name:'Sewing Line 6',    type:'Sewing',   machines:14, operators:13, capacity:130, status:'Active',  supervisor:'Karim A.'    },
  { line:7,  name:'Sewing Line 7',    type:'Sewing',   machines:12, operators:12, capacity:120, status:'Active',  supervisor:'Nadia H.'    },
  { line:8,  name:'Sewing Line 8',    type:'Sewing',   machines:12, operators:10, capacity:100, status:'Active',  supervisor:'Nadia H.'    },
  { line:9,  name:'Sewing Line 9',    type:'Sewing',   machines:12, operators:12, capacity:120, status:'Idle',    supervisor:'—'           },
  { line:10, name:'Sewing Line 10',   type:'Sewing',   machines:12, operators:12, capacity:120, status:'Idle',    supervisor:'—'           },
  { line:11, name:'Cutting Line A',   type:'Cutting',  machines:4,  operators:6,  capacity:600, status:'Active',  supervisor:'Youssef B.'  },
  { line:12, name:'Cutting Line B',   type:'Cutting',  machines:4,  operators:5,  capacity:500, status:'Active',  supervisor:'Youssef B.'  },
  { line:13, name:'Cutting Line C',   type:'Cutting',  machines:3,  operators:4,  capacity:400, status:'Idle',    supervisor:'—'           },
  { line:14, name:'Embroidery Unit',  type:'Embroidery',machines:6, operators:6,  capacity:80,  status:'Idle',    supervisor:'—'           },
  { line:15, name:'Printing Unit',    type:'Printing', machines:2,  operators:4,  capacity:200, status:'Idle',    supervisor:'—'           },
  { line:16, name:'Finishing Bay A',  type:'Finishing',machines:8,  operators:8,  capacity:250, status:'Active',  supervisor:'Ahmed T.'    },
  { line:17, name:'Finishing Bay B',  type:'Finishing',machines:8,  operators:7,  capacity:220, status:'Active',  supervisor:'Ahmed T.'    },
  { line:18, name:'QC Station',       type:'QC',       machines:0,  operators:4,  capacity:400, status:'Active',  supervisor:'Soufiane A.' },
  { line:19, name:'Packing Station A',type:'Packing',  machines:2,  operators:6,  capacity:300, status:'Active',  supervisor:'Sara B.'     },
  { line:20, name:'Packing Station B',type:'Packing',  machines:2,  operators:4,  capacity:200, status:'Idle',    supervisor:'—'           },
];

const USERS = [
  { name:'Soufiane Aberbach', role:'Admin',              email:'s.aberbach@avamarie.co',  status:'Active',   lastLogin:'14 Apr 2026' },
  { name:'Karim El Amrani',   role:'Production Manager', email:'k.elamrani@avamarie.co',  status:'Active',   lastLogin:'13 Apr 2026' },
  { name:'Fatima Roudani',    role:'QC Supervisor',      email:'f.roudani@avamarie.co',   status:'Active',   lastLogin:'14 Apr 2026' },
  { name:'Nadia Hassani',     role:'QC Inspector',       email:'n.hassani@avamarie.co',   status:'Active',   lastLogin:'12 Apr 2026' },
  { name:'Youssef Berrada',   role:'Cutting Manager',    email:'y.berrada@avamarie.co',   status:'Active',   lastLogin:'11 Apr 2026' },
  { name:'Ahmed Tazi',        role:'Materials Manager',  email:'a.tazi@avamarie.co',      status:'Active',   lastLogin:'10 Apr 2026' },
  { name:'Sara Benchrif',     role:'Packing Supervisor', email:'s.benchrif@avamarie.co',  status:'Inactive', lastLogin:'02 Apr 2026' },
];

function renderSettings() {
  /* Production lines table */
  const lrows = PROD_LINES.map(l => {
    const isActive = l.status === 'Active';
    return `<tr>
      <td style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold);text-align:center">${l.line}</td>
      <td style="font-weight:600">${l.name}</td>
      <td><span class="chip chip-grey" style="font-size:.65rem">${l.type}</span></td>
      <td style="text-align:right">${l.machines}</td>
      <td style="text-align:right">${l.operators}</td>
      <td style="text-align:right">${l.capacity.toLocaleString()} pcs/day</td>
      <td>
        <span class="chip ${isActive ? 'chip-green' : 'chip-grey'}">${l.status}</span>
      </td>
      <td style="color:var(--muted)">${l.supervisor}</td>
    </tr>`;
  }).join('');
  document.getElementById('stg-lines-table').innerHTML = `<table class="tbl">
    <thead><tr>
      <th style="text-align:center">Line</th>
      <th>Name</th><th>Type</th>
      <th style="text-align:right">Machines</th>
      <th style="text-align:right">Operators</th>
      <th style="text-align:right">Capacity</th>
      <th>Status</th><th>Supervisor</th>
    </tr></thead>
    <tbody>${lrows}</tbody>
  </table>`;

  /* Users table */
  const active = USERS.filter(u => u.status === 'Active').length;
  document.getElementById('stg-user-count').textContent =
    `${USERS.length} users · ${active} active`;
  const urows = USERS.map(u => `<tr>
    <td style="font-weight:600">${u.name}</td>
    <td><span class="role-chip">${u.role}</span></td>
    <td style="color:var(--muted);font-size:.78rem">${u.email}</td>
    <td><span class="chip ${u.status === 'Active' ? 'chip-green' : 'chip-grey'}">${u.status}</span></td>
    <td style="color:var(--muted2);font-size:.76rem">${u.lastLogin}</td>
  </tr>`).join('');
  document.getElementById('stg-users-table').innerHTML = `<table class="tbl">
    <thead><tr>
      <th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Last Login</th>
    </tr></thead>
    <tbody>${urows}</tbody>
  </table>`;
}


/* ── Init ─────────────────────────────────────────────────────── */
/* ── Wrap all .tbl tables in a scroll div after each render ─── */
function wrapTables() {
  document.querySelectorAll('.tbl').forEach(function(tbl) {
    if (tbl.parentElement.classList.contains('tbl-scroll')) return;
    const wrap = document.createElement('div');
    wrap.className = 'tbl-scroll';
    tbl.parentNode.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
  });
}

/* Also wrap the order-detail matrix and the od-matrix */
function wrapMatrices() {
  document.querySelectorAll('.od-matrix').forEach(function(tbl) {
    if (tbl.parentElement.classList.contains('tbl-scroll')) return;
    const wrap = document.createElement('div');
    wrap.className = 'tbl-scroll';
    tbl.parentNode.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  lucide.createIcons();
  updateDate();
  setInterval(updateDate, 60000);
  /* Load the initially-active section (dashboard) */
  await loadView('dashboard');
  /* Auto-wrap any tables injected by view loading or user actions */
  new MutationObserver(function() {
    wrapTables();
    wrapMatrices();
  }).observe(document.getElementById('main'), { childList:true, subtree:true });
});
