function getDashboardHTML(baseUrl) {
  const API = baseUrl + '/api';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lead Assignment Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg: #0b0d11; --surface: #13161d; --border: #1e2230; --border2: #2a2f40;
    --text: #d4d8e3; --text2: #7a8199; --accent: #6c5ce7; --accent2: #a29bfe;
    --green: #00cec9; --red: #ff6b6b; --amber: #fdcb6e; --blue: #74b9ff;
    --radius: 8px;
  }
  body { font-family: "DM Sans", sans-serif; background: var(--bg); color: var(--text); line-height:1.5; }
  .container { max-width:1400px; margin:0 auto; padding:20px 24px; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:12px; }
  .header h1 { font-size:20px; font-weight:700; color:#fff; letter-spacing:-0.3px; }
  .header h1 em { font-style:normal; color:var(--accent2); }
  .btn { padding:8px 16px; border-radius:var(--radius); border:1px solid var(--border2); background:var(--surface); color:var(--text); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
  .btn:hover { border-color:var(--accent); color:#fff; }
  .btn:disabled { opacity:0.5; cursor:not-allowed; }
  .btn-primary { background:var(--accent); border-color:var(--accent); color:#fff; }
  .btn-primary:hover { background:#5b4bd6; }
  .btn-sm { padding:5px 10px; font-size:11px; }
  .btn-danger { color:var(--red); border-color:rgba(255,107,107,.3); }
  .btn-danger:hover { background:rgba(255,107,107,.1); }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:24px; }
  .stat { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; text-align:center; }
  .stat .n { font-size:28px; font-weight:700; font-family:"JetBrains Mono",monospace; }
  .stat .l { font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:.8px; margin-top:2px; }
  .c-accent .n { color:var(--accent2); } .c-blue .n { color:var(--blue); } .c-amber .n { color:var(--amber); }
  .c-green .n { color:var(--green); } .c-red .n { color:var(--red); }
  .tabs { display:flex; gap:0; border-bottom:1px solid var(--border); margin-bottom:20px; flex-wrap:wrap; }
  .tab { padding:10px 18px; cursor:pointer; font-size:13px; font-weight:600; color:var(--text2); border-bottom:2px solid transparent; transition:all .15s; user-select:none; }
  .tab:hover { color:var(--text); }
  .tab.active { color:var(--accent2); border-bottom-color:var(--accent); }
  .tab-panel { display:none; } .tab-panel.active { display:block; }
  .tbl-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; padding:10px 12px; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:.7px; color:var(--text2); background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:1; }
  td { padding:10px 12px; border-bottom:1px solid var(--border); }
  tr:hover td { background:rgba(108,92,231,.04); }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; font-family:"JetBrains Mono",monospace; }
  .b-assigned { background:rgba(116,185,255,.12); color:var(--blue); }
  .b-reassigned { background:rgba(162,155,254,.12); color:var(--accent2); }
  .b-active { background:rgba(0,206,201,.12); color:var(--green); }
  .b-sent { background:rgba(0,206,201,.12); color:var(--green); }
  .b-failed { background:rgba(255,107,107,.12); color:var(--red); }
  .b-pending { background:rgba(253,203,110,.12); color:var(--amber); }
  .log { padding:8px 12px; border-left:3px solid var(--border2); margin-bottom:4px; font-size:12px; background:var(--surface); border-radius:0 var(--radius) var(--radius) 0; font-family:"JetBrains Mono",monospace; }
  .log.SUCCESS { border-left-color:var(--green); } .log.FAILED { border-left-color:var(--red); }
  .log-time { color:var(--text2); margin-right:8px; } .log-type { font-weight:600; color:var(--accent2); margin-right:6px; }
  .toolbar { display:flex; gap:10px; margin-bottom:14px; align-items:center; flex-wrap:wrap; }
  .search-input { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); padding:8px 14px; font-size:13px; width:300px; font-family:inherit; }
  .search-input:focus { outline:none; border-color:var(--accent); }
  .search-input::placeholder { color:var(--text2); }
  .toolbar select { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); padding:8px 10px; font-size:13px; font-family:inherit; }
  .toolbar select:focus { outline:none; border-color:var(--accent); }
  .modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.6); z-index:100; display:flex; align-items:center; justify-content:center; }
  .modal { background:var(--surface); border:1px solid var(--border2); border-radius:12px; padding:24px; width:560px; max-width:95vw; max-height:90vh; overflow-y:auto; }
  .modal h2 { font-size:16px; font-weight:700; margin-bottom:16px; color:#fff; }
  .form-group { margin-bottom:12px; }
  .form-group label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; color:var(--text2); margin-bottom:4px; }
  .form-group input, .form-group select, .form-group textarea { width:100%; padding:8px 12px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-size:13px; font-family:inherit; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline:none; border-color:var(--accent); }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .form-row-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  .form-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
  .hidden { display:none !important; }
  .info-box { background:rgba(108,92,231,.08); border:1px solid rgba(108,92,231,.2); border-radius:var(--radius); padding:14px 16px; margin-bottom:16px; font-size:12px; line-height:1.7; color:var(--text2); }
  .info-box strong { color:var(--accent2); }
  .info-box code { background:rgba(0,0,0,.3); padding:1px 5px; border-radius:3px; font-family:"JetBrains Mono",monospace; font-size:11px; color:var(--text); }
  .upload-zone { border:2px dashed var(--border2); border-radius:var(--radius); padding:24px; text-align:center; cursor:pointer; transition:all .2s; margin-bottom:12px; }
  .upload-zone:hover, .upload-zone.dragover { border-color:var(--accent); background:rgba(108,92,231,.05); }
  .upload-zone input { display:none; }
  .upload-zone .icon { font-size:32px; margin-bottom:8px; }
  .upload-zone .label { font-size:13px; color:var(--text2); }
  .upload-zone .filename { font-size:12px; color:var(--accent2); margin-top:4px; font-family:"JetBrains Mono",monospace; }
  .toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:var(--radius); font-size:13px; font-weight:600; z-index:200; animation:slideIn .3s; }
  .toast.success { background:#14532d; color:#4ade80; border:1px solid #22c55e; }
  .toast.error { background:#451a1a; color:#f87171; border:1px solid #ef4444; }
  @keyframes slideIn { from { transform:translateX(100px); opacity:0; } to { transform:translateX(0); opacity:1; } }
  /* Settings */
  .settings-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:16px; }
  .setting-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:20px; }
  .setting-card .s-label { font-size:13px; font-weight:600; color:#fff; margin-bottom:4px; }
  .setting-card .s-desc { font-size:12px; color:var(--text2); margin-bottom:12px; line-height:1.6; }
  .setting-card .s-row { display:flex; gap:8px; align-items:center; }
  .setting-card input { flex:1; padding:8px 12px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-size:13px; font-family:"JetBrains Mono",monospace; }
  .setting-card input:focus { outline:none; border-color:var(--accent); }
  /* param tag pills */
  .param-tokens { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .param-token { padding:2px 8px; background:rgba(108,92,231,.15); border:1px solid rgba(108,92,231,.3); border-radius:4px; font-size:11px; font-family:"JetBrains Mono",monospace; color:var(--accent2); cursor:pointer; }
  .param-token:hover { background:rgba(108,92,231,.3); }
  .section-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:var(--text2); margin-bottom:10px; margin-top:4px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>&#9889; Lead Assignment <em>Dashboard</em></h1>
    <button class="btn" onclick="loadAll()">&#8635; Refresh</button>
  </div>

  <div class="stats">
    <div class="stat c-accent"><div class="n" id="sTotal">&mdash;</div><div class="l">Total Leads</div></div>
    <div class="stat c-blue"><div class="n" id="sAssigned">&mdash;</div><div class="l">Assigned</div></div>
    <div class="stat c-red"><div class="n" id="sUnassigned">&mdash;</div><div class="l">Unassigned</div></div>
    <div class="stat c-amber"><div class="n" id="sReassigned">&mdash;</div><div class="l">Reassigned</div></div>
    <div class="stat c-green"><div class="n" id="sActive">&mdash;</div><div class="l">Active</div></div>
    <div class="stat c-green"><div class="n" id="sWASent">&mdash;</div><div class="l">WA Sent</div></div>
    <div class="stat c-red"><div class="n" id="sWAFail">&mdash;</div><div class="l">WA Failed</div></div>
  </div>

  <div class="tabs">
    <div class="tab active" data-tab="leads">Leads</div>
    <div class="tab" data-tab="agents">Agents</div>
    <div class="tab" data-tab="sourceConfig">Source Config</div>
    <div class="tab" data-tab="waTemplates">WA Templates</div>
    <div class="tab" data-tab="settings">Settings</div>
    <div class="tab" data-tab="logs">Logs</div>
  </div>

  <!-- Leads -->
  <div class="tab-panel active" id="panel-leads">
    <div class="toolbar">
      <select id="leadSourceFilter" onchange="renderLeads()"><option value="">All Sources</option></select>
      <select id="leadAffiliateFilter" onchange="renderLeads()"><option value="">All Affiliates/Clients</option></select>
      <input class="search-input" id="leadSearch" placeholder="Search leads..." oninput="renderLeads()">
      <button class="btn btn-primary" id="btnBulkAssignLeads" onclick="openBulkAssignModal()" disabled>Bulk Assign Selected (0)</button>
    </div>
    <div class="tbl-wrap"><table><thead><tr>
      <th><input type="checkbox" id="leadSelectAll" onchange="toggleAllLeads(this.checked)"></th>
      <th>Lead ID</th><th>Received At</th><th>Phone</th><th>Name</th><th>Amount</th><th>Pincode</th><th>Source</th><th>Affiliate/Client</th>
      <th>Assigned To</th><th>Status</th><th>WA P0</th><th>WA P1</th><th>Assigned At</th><th>Actions</th>
    </tr></thead><tbody id="leadsBody"><tr><td colspan="15" style="text-align:center;padding:30px;color:var(--text2)">Loading...</td></tr></tbody></table></div>
  </div>

  <!-- Agents -->
  <div class="tab-panel" id="panel-agents">
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openAgentModal()">+ Add Agent</button>
      <button class="btn" onclick="downloadCSV()">&#8595; Download CSV</button>
      <label class="btn" style="cursor:pointer">
        &#8593; Upload CSV
        <input type="file" accept=".csv" id="csvFileInput" style="display:none" onchange="uploadCSV(this)">
      </label>
      <button class="btn btn-danger" id="btnBulkDeleteAgents" onclick="bulkDeleteAgents()" disabled>Delete Selected (0)</button>
      <input class="search-input" id="agentSearch" placeholder="Search agents..." oninput="renderAgents()">
    </div>
    <div class="info-box">
      <strong>Assignment is pincode-only, round robin.</strong> An agent takes leads only if <code>pincode</code> is set, <code>pincode_identifier = assign</code>, and Active = Yes. Within a pincode the least-recently-assigned agent goes next, so load spreads evenly — there is no priority ordering. <code>branch_id</code> / <code>city</code> are stored for reference but no longer affect assignment.<br>
      <strong>CSV format:</strong> <code>branch_id, agent_email, agent_name, agent_phone</code> (required) + <code>city, pincode, city_identifier, pincode_identifier</code> (optional). Upload replaces <strong>all</strong> agents and resets the rotation.
    </div>
    <div class="tbl-wrap"><table><thead><tr>
      <th><input type="checkbox" id="agentSelectAll" onchange="toggleAllAgents(this.checked)"></th>
      <th>Pincode</th><th>Pin ID</th><th>Email</th><th>Name</th><th>Phone</th><th>Branch</th><th>City</th><th>Assigned #</th><th>Last Assigned</th><th>Active</th><th>Actions</th>
    </tr></thead><tbody id="agentsBody"></tbody></table></div>
  </div>

  <!-- Source Config -->
  <div class="tab-panel" id="panel-sourceConfig">
    <div class="info-box">
      Configure <strong>WhatsApp sending</strong> and <strong>OneStop priority</strong> per lead source, optionally narrowed to one affiliate/client. Leave <strong>Affiliate/Client</strong> blank to make the row a fallback for every affiliate of that lead source; a row with a specific affiliate takes precedence over the blank one. <code>assign_by</code> is no longer used for agent matching (assignment runs on pincode round robin for every source) — kept for reference only.
    </div>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openSourceModal()">+ Add Source Config</button>
    </div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>Lead Source</th><th>Affiliate/Client</th><th>Send WhatsApp</th><th>Priority</th><th>Assign By</th><th>Active</th><th>Actions</th>
    </tr></thead><tbody id="sourceBody"></tbody></table></div>
  </div>

  <!-- WA Templates -->
  <div class="tab-panel" id="panel-waTemplates">
    <div class="info-box">
      Configure WhatsApp template IDs and parameter values per lead source. If no config exists for a source, the global <strong>env var</strong> template is used.<br>
      <strong>Template ID priority:</strong> (1) <code>template_id</code> in webhook POST &rarr; (2) per-source config below &rarr; (3) env var <code>GUPSHUP_TEMPLATE_ID</code>.<br>
      <strong>Available param tokens:</strong>
      <span class="param-tokens" style="display:inline-flex;flex-wrap:wrap;gap:4px;margin-top:4px">
        <code>lead.name</code> <code>lead.phone</code> <code>lead.loan_amount</code> <code>lead.loan_type</code> <code>lead.cta_link</code> <code>lead.city</code> <code>lead.branch_id</code> <code>lead.pincode</code> <code>agent.name</code> <code>agent.email</code> <code>agent.phone</code>
      </span>
    </div>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openWATemplateModal()">+ Add WA Template Config</button>
    </div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>Lead Source</th><th>Template ID</th><th>Reassign Template ID</th><th>Param 1</th><th>Param 2</th><th>Param 3</th><th>Param 4</th><th>Param 5</th><th>Actions</th>
    </tr></thead><tbody id="waTemplateBody"></tbody></table></div>
  </div>

  <!-- Settings -->
  <div class="tab-panel" id="panel-settings">
    <div class="info-box">
      These settings are stored in the database and override environment variables at runtime. Changes take effect immediately — no redeployment needed.
    </div>
    <div id="settingsGrid" class="settings-grid">
      <div style="color:var(--text2);font-size:13px;padding:20px">Loading settings...</div>
    </div>
    <div style="margin-top:20px">
      <button class="btn btn-primary" onclick="saveAllSettings()">&#10003; Save All Settings</button>
    </div>
  </div>

  <!-- Logs -->
  <div class="tab-panel" id="panel-logs">
    <div class="toolbar">
      <input class="search-input" id="logSearch" placeholder="Filter logs..." oninput="renderLogs()">
    </div>
    <div id="logsContainer"></div>
  </div>
</div>

<!-- Modal: Add/Edit Agent -->
<div class="modal-overlay hidden" id="agentModal">
  <div class="modal">
    <h2 id="agentModalTitle">Add Agent</h2>
    <input type="hidden" id="fAgentId">
    <div class="form-group"><label>Branch ID *</label><input id="fBranchId" placeholder="BR001"></div>
    <div class="form-group"><label>Agent Email *</label><input id="fEmail" placeholder="agent@company.com"></div>
    <div class="form-row">
      <div class="form-group"><label>Agent Name *</label><input id="fName" placeholder="Full Name"></div>
      <div class="form-group"><label>Agent Phone *</label><input id="fPhone" placeholder="9876543210"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>City</label><input id="fCity" placeholder="bangalore"></div>
      <div class="form-group"><label>Pincode</label><input id="fPincode" placeholder="560001"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>City Identifier</label>
        <select id="fCityId"><option value="assign">assign</option><option value="dont assign">dont assign</option></select>
      </div>
      <div class="form-group"><label>Pincode Identifier</label>
        <select id="fPincodeId"><option value="assign">assign</option><option value="dont assign">dont assign</option></select>
      </div>
    </div>
    <div class="form-group" id="fActiveGroup" style="display:none">
      <label>Active</label>
      <select id="fIsActive"><option value="true">Yes</option><option value="false">No</option></select>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal('agentModal')">Cancel</button>
      <button class="btn btn-primary" id="btnSaveAgent" onclick="saveAgent()">Save Agent</button>
    </div>
  </div>
</div>

<!-- Modal: Add/Edit Source Config -->
<div class="modal-overlay hidden" id="sourceModal">
  <div class="modal">
    <h2 id="sourceModalTitle">Add Lead Source Config</h2>
    <input type="hidden" id="fSourceId">
    <div class="form-row">
      <div class="form-group"><label>Lead Source Name *</label><input id="fSource" placeholder="e.g. chakra, website, partner"></div>
      <div class="form-group"><label>Affiliate/Client</label><input id="fAssignedSource" placeholder="leave blank = all affiliates"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Send WhatsApp</label>
        <select id="fSendWhatsapp"><option value="true">Yes</option><option value="false">No</option></select>
      </div>
      <div class="form-group"><label>Priority (sent to OneStop) *</label><input id="fPriorityScore" type="number" step="0.1" min="0" max="10" value="9.9"></div>
    </div>
    <div class="form-group"><label>Assign By *</label>
      <select id="fAssignBy">
        <option value="branch_id">branch_id — match by branch</option>
        <option value="city">city — match by city (city_identifier = assign)</option>
        <option value="pincode">pincode — match by pincode (pincode_identifier = assign)</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal('sourceModal')">Cancel</button>
      <button class="btn btn-primary" id="btnSaveSource" onclick="saveSourceConfig()">Save</button>
    </div>
  </div>
</div>

<!-- Modal: Manually Assign a Lead -->
<div class="modal-overlay hidden" id="manualAssignModal">
  <div class="modal">
    <h2>Manually Assign Lead</h2>
    <input type="hidden" id="maLeadId">
    <div class="info-box" style="font-size:12px">
      This lead has no matching Source Config, so it was never assigned. Pick the values to use for it directly — this does not create or change any Source Config row.
    </div>
    <div class="form-group"><label>Use an existing Source Config (optional)</label>
      <select id="maUseConfig" onchange="applyManualAssignConfig()"><option value="">— pick to auto-fill —</option></select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Lead Source *</label><input id="maLeadSource" placeholder="e.g. adityabirlalms"></div>
      <div class="form-group"><label>Affiliate/Client</label><input id="maAssignedSource" placeholder="leave blank = none"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Send WhatsApp</label>
        <select id="maSendWhatsapp"><option value="true">Yes</option><option value="false">No</option></select>
      </div>
      <div class="form-group"><label>Priority (sent to OneStop) *</label><input id="maPriorityScore" type="number" step="0.1" min="0" max="10" value="9.9"></div>
    </div>
    <div class="form-group"><label>OneStop leadSource</label><input id="maOneStopLeadSource" placeholder="leave blank = b2c (default)"></div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal('manualAssignModal')">Cancel</button>
      <button class="btn btn-primary" id="btnManualAssign" onclick="saveManualAssign()">Assign</button>
    </div>
  </div>
</div>

<!-- Modal: Bulk Assign Leads -->
<div class="modal-overlay hidden" id="bulkAssignModal">
  <div class="modal">
    <h2>Bulk Assign <span id="bulkAssignCount">0</span> Lead(s)</h2>
    <div class="info-box" style="font-size:12px">
      Leave Lead Source / Affiliate/Client blank to keep each lead's own value — only Priority, Send WhatsApp, and the rate apply to all selected leads. This runs in the background and paces itself at the rate below; check the Logs tab for progress.
    </div>
    <div class="form-group"><label>Use an existing Source Config (optional)</label>
      <select id="baUseConfig" onchange="applyBulkAssignConfig()"><option value="">— pick to auto-fill —</option></select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Lead Source override</label><input id="baLeadSource" placeholder="leave blank = keep each lead's own"></div>
      <div class="form-group"><label>Affiliate/Client override</label><input id="baAssignedSource" placeholder="leave blank = keep each lead's own"></div>
    </div>
    <div class="form-group"><label>Assign to this agent in OneStop (optional)</label>
      <select id="baForceAgent"><option value="">— pincode round robin (default) —</option></select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Send WhatsApp</label>
        <select id="baSendWhatsapp"><option value="true">Yes</option><option value="false">No</option></select>
      </div>
      <div class="form-group"><label>Priority (sent to OneStop) *</label><input id="baPriorityScore" type="number" step="0.1" min="0" max="10" value="9.9"></div>
    </div>
    <div class="form-group"><label>OneStop leadSource (applies to all selected leads)</label><input id="baOneStopLeadSource" placeholder="leave blank = b2c (default)"></div>
    <div class="form-group"><label>Rate — leads assigned per minute</label><input id="baRatePerMinute" type="number" step="1" min="0" placeholder="0 = no limit, assign as fast as possible"></div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal('bulkAssignModal')">Cancel</button>
      <button class="btn btn-primary" id="btnBulkAssign" onclick="saveBulkAssign()">Start Bulk Assign</button>
    </div>
  </div>
</div>

<!-- Modal: Add/Edit WA Template Config -->
<div class="modal-overlay hidden" id="waTemplateModal">
  <div class="modal">
    <h2 id="waTemplateModalTitle">Add WA Template Config</h2>
    <input type="hidden" id="fWATId">
    <div class="form-group"><label>Lead Source *</label><input id="fWATSource" placeholder="e.g. chakra, website"></div>
    <div class="form-row">
      <div class="form-group"><label>Template ID (Assign) *</label><input id="fWATTemplateId" placeholder="22a5b3ed-..."></div>
      <div class="form-group"><label>Reassign Template ID</label><input id="fWATReassignId" placeholder="leave blank to reuse assign template"></div>
    </div>
    <div class="section-title" style="margin-top:8px">Template Parameters</div>
    <div class="info-box" style="margin-bottom:12px;font-size:11px">
      Map each param slot to a token. Click a token to paste it. Leave blank to omit that slot from the params array.
      <div class="param-tokens" id="tokenPills" style="margin-top:8px"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Param 1</label><input id="fP1" placeholder="lead.name"></div>
      <div class="form-group"><label>Param 2</label><input id="fP2" placeholder="lead.phone"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Param 3</label><input id="fP3" placeholder="lead.loan_amount"></div>
      <div class="form-group"><label>Param 4</label><input id="fP4" placeholder="lead.loan_type"></div>
    </div>
    <div class="form-group"><label>Param 5</label><input id="fP5" placeholder="lead.cta_link"></div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal('waTemplateModal')">Cancel</button>
      <button class="btn btn-primary" id="btnSaveWAT" onclick="saveWATemplateConfig()">Save</button>
    </div>
  </div>
</div>

<script>
var API = '${API}';
var allLeads = [], allAgents = [], allSources = [], allWATemplates = [], allSettings = [];
var editingAgentId = null, focusedParamInput = null;

var PARAM_TOKENS = ['lead.name','lead.phone','lead.loan_amount','lead.loan_type','lead.cta_link',
  'lead.city','lead.branch_id','lead.pincode','agent.name','agent.email','agent.phone'];

// ── Tabs ──
document.querySelectorAll('.tab').forEach(function(t) {
  t.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(x) { x.classList.remove('active'); });
    t.classList.add('active');
    document.getElementById('panel-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'logs') loadLogs();
    if (t.dataset.tab === 'agents') loadAgents();
    if (t.dataset.tab === 'sourceConfig') loadSourceConfigs();
    if (t.dataset.tab === 'waTemplates') loadWATemplates();
    if (t.dataset.tab === 'settings') loadSettings();
  });
});

function loadAll() { loadStats(); loadAgents(); loadSourceConfigs(); }

// ── Toast ──
function toast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 3000);
}

// ── Modals ──
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(function(o) {
  o.addEventListener('click', function(e) { if (e.target === o) o.classList.add('hidden'); });
});

// ── Stats ──
function loadStats() {
  fetch(API + '/stats').then(function(r) { return r.json(); }).then(function(j) {
    var d = j.data;
    document.getElementById('sTotal').textContent = d.total;
    document.getElementById('sAssigned').textContent = d.assigned;
    document.getElementById('sUnassigned').textContent = d.unassigned;
    document.getElementById('sReassigned').textContent = d.reassigned;
    document.getElementById('sActive').textContent = d.active;
    document.getElementById('sWASent').textContent = d.whatsappSent;
    document.getElementById('sWAFail').textContent = d.whatsappFailed;
    allLeads = d.leads || [];
    populateLeadFilters();
    renderLeads();
  }).catch(function(e) { console.error('loadStats', e); });
}

// ── Leads ──
function populateLeadFilters() {
  function fillSelect(id, values) {
    var sel = document.getElementById(id);
    var current = sel.value;
    var defaultOpt = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(defaultOpt);
    values.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      sel.appendChild(opt);
    });
    if (values.indexOf(current) !== -1) sel.value = current;
  }
  var sources = Array.from(new Set(allLeads.map(function(l) { return l.lead_source; }).filter(Boolean))).sort();
  var affiliates = Array.from(new Set(allLeads.map(function(l) { return l.assigned_source; }).filter(Boolean))).sort();
  fillSelect('leadSourceFilter', sources);
  fillSelect('leadAffiliateFilter', affiliates);
}

var selectedLeadIds = new Set();
var visibleEligibleLeadIds = [];

function isBulkAssignable(l) { return l.lead_status === 'Unassigned - No Source Config'; }

function renderLeads() {
  var q = (document.getElementById('leadSearch').value || '').toLowerCase();
  var sourceFilter = document.getElementById('leadSourceFilter').value;
  var affiliateFilter = document.getElementById('leadAffiliateFilter').value;
  var rows = allLeads.filter(function(l) {
    if (sourceFilter && l.lead_source !== sourceFilter) return false;
    if (affiliateFilter && l.assigned_source !== affiliateFilter) return false;
    return !q || JSON.stringify(l).toLowerCase().includes(q);
  });
  visibleEligibleLeadIds = rows.filter(isBulkAssignable).map(function(l) { return l.lead_id; });
  var b = document.getElementById('leadsBody');
  if (!rows.length) { b.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:30px;color:var(--text2)">No leads found.</td></tr>'; updateBulkAssignButton(); syncLeadSelectAllCheckbox(); return; }
  b.innerHTML = rows.map(function(l) {
    var statusClass = l.lead_status === 'Assigned' ? 'b-assigned' : l.lead_status === 'Reassigned' ? 'b-reassigned' : l.lead_status === 'Active' ? 'b-active' : (l.lead_status||'').indexOf('Unassigned') === 0 ? 'b-failed' : 'b-pending';
    var p0c = l.whatsapp_p0_status === 'Sent' ? 'b-sent' : l.whatsapp_p0_status === 'Failed' ? 'b-failed' : 'b-pending';
    var p1c = l.whatsapp_p1_status === 'Sent' ? 'b-sent' : l.whatsapp_p1_status === 'Failed' ? 'b-failed' : 'b-pending';
    var assignable = isBulkAssignable(l);
    return '<tr>' +
      '<td>' + (assignable ? '<input type="checkbox" class="lead-check" ' + (selectedLeadIds.has(l.lead_id)?'checked':'') + ' onchange="toggleLeadSelect(\\'' + escJs(l.lead_id) + '\\', this.checked)">' : '') + '</td>' +
      '<td style="font-family:JetBrains Mono,monospace;font-size:11px">' + esc(l.lead_id) + '</td>' +
      '<td style="font-size:11px;color:var(--text2)">' + fmtDate(l.created_at) + '</td>' +
      '<td>' + esc(l.phone) + '</td><td>' + esc(l.name) + '</td>' +
      '<td>&#8377;' + Number(l.loan_amount||0).toLocaleString('en-IN') + '</td>' +
      '<td>' + esc(l.pincode||'—') + '</td><td>' + esc(l.lead_source) + '</td>' +
      '<td>' + (l.assigned_source ? esc(l.assigned_source) : '<span style="color:var(--text2)">—</span>') + '</td>' +
      '<td style="font-size:12px">' + (l.assigned_email ? esc(l.assigned_name) + '<br><span style="color:var(--text2);font-size:11px">' + esc(l.assigned_email) + '</span>' : '<span style="color:var(--red)">not assigned</span>') + '</td>' +
      '<td><span class="badge ' + statusClass + '">' + esc(l.lead_status) + '</span></td>' +
      '<td><span class="badge ' + p0c + '">' + esc(l.whatsapp_p0_status||'—') + '</span></td>' +
      '<td>' + (l.whatsapp_p1_status ? '<span class="badge ' + p1c + '">' + esc(l.whatsapp_p1_status) + '</span>' : '—') + '</td>' +
      '<td style="font-size:11px;color:var(--text2)">' + fmtDate(l.assigned_at) + '</td>' +
      '<td>' + (assignable ? '<button class="btn btn-sm btn-primary" onclick="openManualAssignModal(\\'' + escJs(l.lead_id) + '\\')">Assign</button>' : '—') + '</td>' +
      '</tr>';
  }).join('');
  updateBulkAssignButton();
  syncLeadSelectAllCheckbox();
}

function toggleLeadSelect(leadId, checked) {
  if (checked) selectedLeadIds.add(leadId); else selectedLeadIds.delete(leadId);
  updateBulkAssignButton();
  syncLeadSelectAllCheckbox();
}

function toggleAllLeads(checked) {
  visibleEligibleLeadIds.forEach(function(id) {
    if (checked) selectedLeadIds.add(id); else selectedLeadIds.delete(id);
  });
  renderLeads();
}

function syncLeadSelectAllCheckbox() {
  var cb = document.getElementById('leadSelectAll');
  if (!cb) return;
  var allSelected = visibleEligibleLeadIds.length > 0 && visibleEligibleLeadIds.every(function(id) { return selectedLeadIds.has(id); });
  cb.checked = allSelected;
  cb.indeterminate = !allSelected && visibleEligibleLeadIds.some(function(id) { return selectedLeadIds.has(id); });
}

function updateBulkAssignButton() {
  var btn = document.getElementById('btnBulkAssignLeads');
  if (!btn) return;
  btn.disabled = selectedLeadIds.size === 0;
  btn.textContent = 'Bulk Assign Selected (' + selectedLeadIds.size + ')';
}

function openBulkAssignModal() {
  if (!selectedLeadIds.size) return;
  document.getElementById('bulkAssignCount').textContent = selectedLeadIds.size;
  document.getElementById('baLeadSource').value = '';
  document.getElementById('baAssignedSource').value = '';
  document.getElementById('baSendWhatsapp').value = 'true';
  document.getElementById('baPriorityScore').value = 9.9;
  document.getElementById('baOneStopLeadSource').value = '';
  document.getElementById('baRatePerMinute').value = '';

  var sel = document.getElementById('baUseConfig');
  sel.innerHTML = '<option value="">— pick to auto-fill —</option>';
  allSources.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.lead_source + ' / ' + (s.assigned_source || '— all —');
    sel.appendChild(opt);
  });

  var agentSel = document.getElementById('baForceAgent');
  agentSel.innerHTML = '<option value="">— pincode round robin (default) —</option>';
  allAgents.filter(function(a) { return a.is_active; }).forEach(function(a) {
    var opt = document.createElement('option');
    opt.value = a.agent_email;
    opt.textContent = a.agent_name + ' (' + a.agent_email + ')';
    agentSel.appendChild(opt);
  });

  document.getElementById('bulkAssignModal').classList.remove('hidden');
}

function applyBulkAssignConfig() {
  var id = document.getElementById('baUseConfig').value;
  if (!id) return;
  var s = allSources.find(function(x) { return String(x.id) === id; });
  if (!s) return;
  document.getElementById('baLeadSource').value = s.lead_source;
  document.getElementById('baAssignedSource').value = s.assigned_source || '';
  document.getElementById('baSendWhatsapp').value = s.send_whatsapp === false ? 'false' : 'true';
  document.getElementById('baPriorityScore').value = s.priority_score != null ? s.priority_score : 9.9;
}

function saveBulkAssign() {
  var btn = document.getElementById('btnBulkAssign');
  var lead_source = document.getElementById('baLeadSource').value.trim();
  var assigned_source = document.getElementById('baAssignedSource').value.trim();
  var agent_email = document.getElementById('baForceAgent').value;
  var send_whatsapp = document.getElementById('baSendWhatsapp').value === 'true';
  var priority_score = parseFloat(document.getElementById('baPriorityScore').value);
  var onestop_lead_source = document.getElementById('baOneStopLeadSource').value.trim();
  var rateRaw = document.getElementById('baRatePerMinute').value.trim();
  var rate_per_minute = rateRaw === '' ? 0 : parseFloat(rateRaw);
  if (isNaN(priority_score)) return toast('Priority must be a number', 'error');
  if (isNaN(rate_per_minute) || rate_per_minute < 0) return toast('Rate per minute must be 0 or a positive number', 'error');
  btn.disabled = true;
  fetch(API + '/leads/bulk-assign', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      lead_ids: Array.from(selectedLeadIds),
      lead_source: lead_source || undefined, assigned_source: assigned_source || undefined,
      agent_email: agent_email || undefined, onestop_lead_source: onestop_lead_source || undefined,
      send_whatsapp: send_whatsapp, priority_score: priority_score, rate_per_minute: rate_per_minute,
    }),
  })
    .then(function(r) { return r.json(); }).then(function(j) {
      btn.disabled = false;
      if (j.code === 200) {
        toast(j.message);
        closeModal('bulkAssignModal');
        selectedLeadIds.clear();
        loadStats();
      } else toast(j.message || 'Error', 'error');
    }).catch(function(e) { btn.disabled = false; toast(e.message, 'error'); });
}

// ── Manual assign (leads stuck as Unassigned - No Source Config) ──
function openManualAssignModal(leadId) {
  var lead = allLeads.find(function(l) { return l.lead_id === leadId; });
  if (!lead) return toast('Lead not found', 'error');
  document.getElementById('maLeadId').value = leadId;
  document.getElementById('maLeadSource').value = lead.lead_source || '';
  document.getElementById('maAssignedSource').value = lead.assigned_source || '';
  document.getElementById('maSendWhatsapp').value = 'true';
  document.getElementById('maPriorityScore').value = 9.9;
  document.getElementById('maOneStopLeadSource').value = '';

  var sel = document.getElementById('maUseConfig');
  sel.innerHTML = '<option value="">— pick to auto-fill —</option>';
  allSources.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.lead_source + ' / ' + (s.assigned_source || '— all —');
    sel.appendChild(opt);
  });

  document.getElementById('manualAssignModal').classList.remove('hidden');
}

function applyManualAssignConfig() {
  var id = document.getElementById('maUseConfig').value;
  if (!id) return;
  var s = allSources.find(function(x) { return String(x.id) === id; });
  if (!s) return;
  document.getElementById('maLeadSource').value = s.lead_source;
  document.getElementById('maAssignedSource').value = s.assigned_source || '';
  document.getElementById('maSendWhatsapp').value = s.send_whatsapp === false ? 'false' : 'true';
  document.getElementById('maPriorityScore').value = s.priority_score != null ? s.priority_score : 9.9;
}

function saveManualAssign() {
  var btn = document.getElementById('btnManualAssign');
  var leadId = document.getElementById('maLeadId').value;
  var lead_source = document.getElementById('maLeadSource').value.trim();
  var assigned_source = document.getElementById('maAssignedSource').value.trim();
  var send_whatsapp = document.getElementById('maSendWhatsapp').value === 'true';
  var priority_score = parseFloat(document.getElementById('maPriorityScore').value);
  var onestop_lead_source = document.getElementById('maOneStopLeadSource').value.trim();
  if (!lead_source) return toast('Lead Source is required', 'error');
  if (isNaN(priority_score)) return toast('Priority must be a number', 'error');
  btn.disabled = true;
  fetch(API + '/leads/' + encodeURIComponent(leadId) + '/assign', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ lead_source: lead_source, assigned_source: assigned_source, send_whatsapp: send_whatsapp, priority_score: priority_score, onestop_lead_source: onestop_lead_source || undefined }),
  })
    .then(function(r) { return r.json(); }).then(function(j) {
      btn.disabled = false;
      if (j.code === 200) { selectedLeadIds.delete(leadId); toast('Lead assigned to ' + j.data.assigned_to); closeModal('manualAssignModal'); loadStats(); }
      else toast(j.message || 'Error', 'error');
    }).catch(function(e) { btn.disabled = false; toast(e.message, 'error'); });
}

// ── Agents ──
function loadAgents() {
  fetch(API + '/agents').then(function(r) { return r.json(); }).then(function(j) {
    allAgents = j.data || []; renderAgents();
  }).catch(function(e) { console.error('loadAgents', e); });
}

var selectedAgentIds = new Set();
var visibleAgentIds = [];

function renderAgents() {
  var q = (document.getElementById('agentSearch').value || '').toLowerCase();
  var rows = allAgents.filter(function(a) { return !q || JSON.stringify(a).toLowerCase().includes(q); });
  visibleAgentIds = rows.map(function(a) { return a.id; });
  var b = document.getElementById('agentsBody');
  if (!rows.length) { b.innerHTML = '<tr><td colspan="12" style="padding:20px;color:var(--text2)">No agents.</td></tr>'; updateBulkDeleteButton(); syncSelectAllCheckbox(); return; }
  b.innerHTML = rows.map(function(a) {
    var inRotation = a.is_active && a.pincode_identifier === 'assign' && a.pincode;
    return '<tr>' +
      '<td><input type="checkbox" class="agent-check" ' + (selectedAgentIds.has(a.id)?'checked':'') + ' onchange="toggleAgentSelect(' + a.id + ', this.checked)"></td>' +
      '<td><strong>' + esc(a.pincode||'—') + '</strong></td>' +
      '<td><span class="badge ' + (a.pincode_identifier==='assign'?'b-active':'b-failed') + '">' + esc(a.pincode_identifier) + '</span></td>' +
      '<td style="font-size:12px">' + esc(a.agent_email) + '</td>' +
      '<td>' + esc(a.agent_name) + (inRotation?'':'<br><span style="color:var(--red);font-size:10px">not in rotation</span>') + '</td>' +
      '<td>' + esc(a.agent_phone) + '</td>' +
      '<td>' + esc(a.branch_id) + '</td>' +
      '<td>' + esc(a.city||'—') + '</td>' +
      '<td style="text-align:center;font-family:JetBrains Mono,monospace">' + esc(a.assign_count==null?0:a.assign_count) + '</td>' +
      '<td style="font-size:11px;color:var(--text2)">' + fmtDate(a.last_assigned_at) + '</td>' +
      '<td><span class="badge ' + (a.is_active?'b-active':'b-failed') + '">' + (a.is_active?'Yes':'No') + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm" style="margin-right:4px" onclick="editAgent(' + a.id + ')">Edit</button>' +
        '<button class="btn btn-sm btn-danger" onclick="delAgent(' + a.id + ')">Delete</button>' +
      '</td></tr>';
  }).join('');
  updateBulkDeleteButton();
  syncSelectAllCheckbox();
}

function toggleAgentSelect(id, checked) {
  if (checked) selectedAgentIds.add(id); else selectedAgentIds.delete(id);
  updateBulkDeleteButton();
  syncSelectAllCheckbox();
}

function toggleAllAgents(checked) {
  visibleAgentIds.forEach(function(id) {
    if (checked) selectedAgentIds.add(id); else selectedAgentIds.delete(id);
  });
  renderAgents();
}

function syncSelectAllCheckbox() {
  var cb = document.getElementById('agentSelectAll');
  if (!cb) return;
  var allSelected = visibleAgentIds.length > 0 && visibleAgentIds.every(function(id) { return selectedAgentIds.has(id); });
  cb.checked = allSelected;
  cb.indeterminate = !allSelected && visibleAgentIds.some(function(id) { return selectedAgentIds.has(id); });
}

function updateBulkDeleteButton() {
  var btn = document.getElementById('btnBulkDeleteAgents');
  if (!btn) return;
  btn.disabled = selectedAgentIds.size === 0;
  btn.textContent = 'Delete Selected (' + selectedAgentIds.size + ')';
}

function bulkDeleteAgents() {
  var ids = Array.from(selectedAgentIds);
  if (!ids.length) return;
  if (!confirm('Delete ' + ids.length + ' selected agent(s)? This cannot be undone.')) return;
  var btn = document.getElementById('btnBulkDeleteAgents');
  btn.disabled = true;
  fetch(API + '/agents/bulk-delete', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ids: ids })
  }).then(function(r) { return r.json(); }).then(function(j) {
    if (j.code === 200) {
      toast('Deleted ' + ids.length + ' agent(s)');
      selectedAgentIds.clear();
      loadAgents();
    } else {
      toast(j.message || 'Error', 'error');
      btn.disabled = false;
    }
  }).catch(function(e) { toast(e.message, 'error'); btn.disabled = false; });
}

function openAgentModal(agent) {
  editingAgentId = agent ? agent.id : null;
  document.getElementById('agentModalTitle').textContent = agent ? 'Edit Agent' : 'Add Agent';
  document.getElementById('fAgentId').value = agent ? agent.id : '';
  document.getElementById('fBranchId').value = agent ? agent.branch_id : '';
  document.getElementById('fEmail').value = agent ? agent.agent_email : '';
  document.getElementById('fName').value = agent ? agent.agent_name : '';
  document.getElementById('fPhone').value = agent ? agent.agent_phone : '';
  document.getElementById('fCity').value = agent ? (agent.city||'') : '';
  document.getElementById('fPincode').value = agent ? (agent.pincode||'') : '';
  document.getElementById('fCityId').value = agent ? agent.city_identifier : 'assign';
  document.getElementById('fPincodeId').value = agent ? agent.pincode_identifier : 'assign';
  document.getElementById('fActiveGroup').style.display = agent ? 'block' : 'none';
  if (agent) document.getElementById('fIsActive').value = agent.is_active ? 'true' : 'false';
  document.getElementById('agentModal').classList.remove('hidden');
}

function editAgent(id) {
  var a = allAgents.find(function(x) { return x.id === id; });
  if (a) openAgentModal(a);
}

function saveAgent() {
  var btn = document.getElementById('btnSaveAgent');
  var data = {
    branch_id: document.getElementById('fBranchId').value.trim(),
    agent_email: document.getElementById('fEmail').value.trim(),
    agent_name: document.getElementById('fName').value.trim(),
    agent_phone: document.getElementById('fPhone').value.trim(),
    city: document.getElementById('fCity').value.trim(),
    pincode: document.getElementById('fPincode').value.trim(),
    city_identifier: document.getElementById('fCityId').value,
    pincode_identifier: document.getElementById('fPincodeId').value,
    is_active: document.getElementById('fIsActive').value !== 'false',
  };
  if (!data.branch_id || !data.agent_email || !data.agent_name || !data.agent_phone) {
    return toast('Fill all required fields', 'error');
  }
  btn.disabled = true;
  var url = editingAgentId ? API + '/agents/' + editingAgentId : API + '/agents';
  var method = editingAgentId ? 'PUT' : 'POST';
  fetch(url, { method: method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) })
    .then(function(r) { return r.json(); }).then(function(j) {
      btn.disabled = false;
      if (j.code === 200) { toast(editingAgentId ? 'Agent updated' : 'Agent added'); closeModal('agentModal'); loadAgents(); }
      else toast(j.message || 'Error', 'error');
    }).catch(function(e) { btn.disabled = false; toast(e.message, 'error'); });
}

function delAgent(id) {
  if (!confirm('Delete this agent?')) return;
  fetch(API + '/agents/' + id, { method: 'DELETE' }).then(function(r) { return r.json(); }).then(function(j) {
    if (j.code === 200) { selectedAgentIds.delete(id); toast('Deleted'); loadAgents(); }
    else toast(j.message || 'Error', 'error');
  });
}

function downloadCSV() {
  window.open(API + '/agents/download-csv');
}

function uploadCSV(input) {
  var file = input.files[0];
  if (!file) return;
  if (!confirm('This will replace ALL existing agents. Continue?')) { input.value = ''; return; }
  var fd = new FormData();
  fd.append('file', file);
  fetch(API + '/agents/upload-csv', { method: 'POST', body: fd })
    .then(function(r) { return r.json(); }).then(function(j) {
      input.value = '';
      if (j.code === 200) { toast(j.message); loadAgents(); loadStats(); }
      else toast(j.message || 'Upload failed', 'error');
    }).catch(function(e) { input.value = ''; toast(e.message, 'error'); });
}

// ── Source Config ──
function loadSourceConfigs() {
  fetch(API + '/source-config').then(function(r) { return r.json(); }).then(function(j) {
    allSources = j.data || []; renderSourceConfigs();
  }).catch(function(e) { console.error('loadSourceConfigs', e); });
}

var editingSourceId = null;

function renderSourceConfigs() {
  var b = document.getElementById('sourceBody');
  if (!allSources.length) { b.innerHTML = '<tr><td colspan="7" style="padding:20px;color:var(--text2)">No source configs. All sources default to send=Yes, priority=9.9.</td></tr>'; return; }
  b.innerHTML = allSources.map(function(s) {
    return '<tr>' +
      '<td>' + esc(s.lead_source) + '</td>' +
      '<td>' + (s.assigned_source ? esc(s.assigned_source) : '<span style="color:var(--text2)">— all —</span>') + '</td>' +
      '<td><span class="badge ' + (s.send_whatsapp ? 'b-active' : 'b-failed') + '">' + (s.send_whatsapp ? 'Yes' : 'No') + '</span></td>' +
      '<td style="text-align:center;font-family:JetBrains Mono,monospace">' + esc(s.priority_score) + '</td>' +
      '<td><span class="badge b-assigned">' + esc(s.assign_by) + '</span></td>' +
      '<td><span class="badge ' + (s.is_active ? 'b-active' : 'b-failed') + '">' + (s.is_active ? 'Yes' : 'No') + '</span></td>' +
      '<td>' +
        '<button class="btn btn-sm" style="margin-right:4px" onclick="editSourceConfig(' + s.id + ')">Edit</button>' +
        '<button class="btn btn-sm btn-danger" onclick="delSource(' + s.id + ')">Delete</button>' +
      '</td></tr>';
  }).join('');
}

function openSourceModal(s) {
  editingSourceId = s ? s.id : null;
  document.getElementById('sourceModalTitle').textContent = s ? 'Edit Lead Source Config' : 'Add Lead Source Config';
  document.getElementById('fSourceId').value = s ? s.id : '';
  document.getElementById('fSource').value = s ? s.lead_source : '';
  document.getElementById('fAssignedSource').value = s ? (s.assigned_source || '') : '';
  document.getElementById('fSendWhatsapp').value = s && s.send_whatsapp === false ? 'false' : 'true';
  document.getElementById('fPriorityScore').value = s && s.priority_score != null ? s.priority_score : 9.9;
  document.getElementById('fAssignBy').value = s ? s.assign_by : 'branch_id';
  document.getElementById('sourceModal').classList.remove('hidden');
}

function editSourceConfig(id) {
  var s = allSources.find(function(x) { return x.id === id; });
  if (s) openSourceModal(s);
}

function saveSourceConfig() {
  var btn = document.getElementById('btnSaveSource');
  var lead_source = document.getElementById('fSource').value.trim();
  var assigned_source = document.getElementById('fAssignedSource').value.trim();
  var assign_by = document.getElementById('fAssignBy').value;
  var send_whatsapp = document.getElementById('fSendWhatsapp').value === 'true';
  var priority_score = parseFloat(document.getElementById('fPriorityScore').value);
  if (!lead_source) return toast('Lead source name is required', 'error');
  if (isNaN(priority_score)) return toast('Priority must be a number', 'error');
  btn.disabled = true;
  fetch(API + '/source-config', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ lead_source, assigned_source, assign_by, send_whatsapp, priority_score }),
  })
    .then(function(r) { return r.json(); }).then(function(j) {
      btn.disabled = false;
      if (j.code === 200) { toast('Source config saved'); closeModal('sourceModal'); loadSourceConfigs(); }
      else toast(j.message || 'Error', 'error');
    }).catch(function(e) { btn.disabled = false; toast(e.message, 'error'); });
}

function delSource(id) {
  if (!confirm('Delete this source config?')) return;
  fetch(API + '/source-config/' + id, { method: 'DELETE' }).then(function(r) { return r.json(); }).then(function(j) {
    if (j.code === 200) { toast('Deleted'); loadSourceConfigs(); }
    else toast(j.message || 'Error', 'error');
  });
}

// ── WA Templates ──
function loadWATemplates() {
  fetch(API + '/whatsapp-template-config').then(function(r) { return r.json(); }).then(function(j) {
    allWATemplates = j.data || []; renderWATemplates();
  }).catch(function(e) { console.error('loadWATemplates', e); });
}

function renderWATemplates() {
  var b = document.getElementById('waTemplateBody');
  if (!allWATemplates.length) {
    b.innerHTML = '<tr><td colspan="9" style="padding:20px;color:var(--text2)">No WA template configs. Global env var template will be used for all sources.</td></tr>'; return;
  }
  b.innerHTML = allWATemplates.map(function(t) {
    function shortId(id) { return id ? (id.length > 16 ? id.substring(0,14)+'…' : id) : '—'; }
    function ptd(v) { return '<td style="font-size:11px;font-family:JetBrains Mono,monospace;color:var(--accent2)">' + esc(v||'—') + '</td>'; }
    return '<tr>' +
      '<td><strong>' + esc(t.lead_source) + '</strong></td>' +
      '<td style="font-size:11px;font-family:JetBrains Mono,monospace" title="' + esc(t.template_id) + '">' + esc(shortId(t.template_id)) + '</td>' +
      '<td style="font-size:11px;font-family:JetBrains Mono,monospace" title="' + esc(t.reassign_template_id||'') + '">' + esc(shortId(t.reassign_template_id)) + '</td>' +
      ptd(t.param1) + ptd(t.param2) + ptd(t.param3) + ptd(t.param4) + ptd(t.param5) +
      '<td>' +
        '<button class="btn btn-sm" style="margin-right:4px" onclick="editWATemplate(' + t.id + ')">Edit</button>' +
        '<button class="btn btn-sm btn-danger" onclick="delWATemplate(' + t.id + ')">Delete</button>' +
      '</td></tr>';
  }).join('');
}

function buildTokenPills(targetId) {
  var container = document.getElementById('tokenPills');
  container.innerHTML = '';
  PARAM_TOKENS.forEach(function(tok) {
    var span = document.createElement('span');
    span.className = 'param-token';
    span.textContent = tok;
    span.onclick = function() {
      if (focusedParamInput) { focusedParamInput.value = tok; focusedParamInput.focus(); }
    };
    container.appendChild(span);
  });
}

['fP1','fP2','fP3','fP4','fP5'].forEach(function(id) {
  // track focus after DOM loaded
  document.addEventListener('DOMContentLoaded', function() {
    var el = document.getElementById(id);
    if (el) el.addEventListener('focus', function() { focusedParamInput = el; });
  });
});

function openWATemplateModal(tpl) {
  buildTokenPills();
  document.getElementById('waTemplateModalTitle').textContent = tpl ? 'Edit WA Template Config' : 'Add WA Template Config';
  document.getElementById('fWATId').value = tpl ? tpl.id : '';
  document.getElementById('fWATSource').value = tpl ? tpl.lead_source : '';
  document.getElementById('fWATSource').readOnly = !!tpl;
  document.getElementById('fWATTemplateId').value = tpl ? tpl.template_id : '';
  document.getElementById('fWATReassignId').value = tpl ? (tpl.reassign_template_id||'') : '';
  document.getElementById('fP1').value = tpl ? (tpl.param1||'') : 'lead.name';
  document.getElementById('fP2').value = tpl ? (tpl.param2||'') : 'lead.phone';
  document.getElementById('fP3').value = tpl ? (tpl.param3||'') : 'lead.loan_amount';
  document.getElementById('fP4').value = tpl ? (tpl.param4||'') : 'lead.loan_type';
  document.getElementById('fP5').value = tpl ? (tpl.param5||'') : 'lead.cta_link';
  // set focus tracking
  ['fP1','fP2','fP3','fP4','fP5'].forEach(function(id) {
    var el = document.getElementById(id);
    el.onfocus = function() { focusedParamInput = el; };
  });
  document.getElementById('waTemplateModal').classList.remove('hidden');
}

function editWATemplate(id) {
  var t = allWATemplates.find(function(x) { return x.id === id; });
  if (t) openWATemplateModal(t);
}

function saveWATemplateConfig() {
  var btn = document.getElementById('btnSaveWAT');
  var data = {
    lead_source: document.getElementById('fWATSource').value.trim(),
    template_id: document.getElementById('fWATTemplateId').value.trim(),
    reassign_template_id: document.getElementById('fWATReassignId').value.trim() || null,
    param1: document.getElementById('fP1').value.trim() || null,
    param2: document.getElementById('fP2').value.trim() || null,
    param3: document.getElementById('fP3').value.trim() || null,
    param4: document.getElementById('fP4').value.trim() || null,
    param5: document.getElementById('fP5').value.trim() || null,
  };
  if (!data.lead_source || !data.template_id) return toast('Lead source and Template ID are required', 'error');
  btn.disabled = true;
  fetch(API + '/whatsapp-template-config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) })
    .then(function(r) { return r.json(); }).then(function(j) {
      btn.disabled = false;
      if (j.code === 200) { toast('WA template config saved'); closeModal('waTemplateModal'); loadWATemplates(); }
      else toast(j.message || 'Error', 'error');
    }).catch(function(e) { btn.disabled = false; toast(e.message, 'error'); });
}

function delWATemplate(id) {
  if (!confirm('Delete this WA template config?')) return;
  fetch(API + '/whatsapp-template-config/' + id, { method: 'DELETE' }).then(function(r) { return r.json(); }).then(function(j) {
    if (j.code === 200) { toast('Deleted'); loadWATemplates(); }
    else toast(j.message || 'Error', 'error');
  });
}

// ── Settings ──
function loadSettings() {
  fetch(API + '/system-config').then(function(r) { return r.json(); }).then(function(j) {
    allSettings = j.data || [];
    renderSettings();
  }).catch(function(e) { console.error('loadSettings', e); });
}

function renderSettings() {
  var grid = document.getElementById('settingsGrid');
  if (!allSettings.length) { grid.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:20px">No settings found.</div>'; return; }
  grid.innerHTML = allSettings.map(function(s) {
    return '<div class="setting-card">' +
      '<div class="s-label">' + esc(s.label || s.key) + '</div>' +
      (s.description ? '<div class="s-desc">' + esc(s.description) + '</div>' : '') +
      '<div class="s-row">' +
        '<input id="setting_' + esc(s.key) + '" data-key="' + esc(s.key) + '" value="' + esc(s.value) + '">' +
      '</div>' +
    '</div>';
  }).join('');
}

function saveAllSettings() {
  var inputs = document.querySelectorAll('#settingsGrid input[data-key]');
  var entries = [];
  inputs.forEach(function(inp) { entries.push({ key: inp.dataset.key, value: inp.value }); });
  fetch(API + '/system-config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(entries) })
    .then(function(r) { return r.json(); }).then(function(j) {
      if (j.code === 200) toast('Settings saved');
      else toast(j.message || 'Error', 'error');
    }).catch(function(e) { toast(e.message, 'error'); });
}

// ── Logs ──
var allLogs = [];
function loadLogs() {
  fetch(API + '/logs').then(function(r) { return r.json(); }).then(function(j) {
    allLogs = j.data?.logs || []; renderLogs();
  }).catch(function(e) { console.error('loadLogs', e); });
}

function renderLogs() {
  var q = (document.getElementById('logSearch').value || '').toLowerCase();
  var logs = allLogs.filter(function(l) { return !q || JSON.stringify(l).toLowerCase().includes(q); });
  var c = document.getElementById('logsContainer');
  if (!logs.length) { c.innerHTML = '<div style="color:var(--text2);padding:20px">No logs.</div>'; return; }
  c.innerHTML = logs.slice(0, 300).map(function(l) {
    return '<div class="log ' + (l.status||'') + '">' +
      '<span class="log-time">' + fmtDate(l.created_at) + '</span>' +
      '<span class="log-type">' + esc(l.type) + '</span>' +
      (l.lead_id ? '<span style="color:var(--text2);margin-right:6px;font-size:11px">' + esc(l.lead_id) + '</span>' : '') +
      '<span>' + esc(l.details) + '</span>' +
    '</div>';
  }).join('');
}

// ── Helpers ──
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// For a value embedded inside a single-quoted JS string literal in an
// onclick="fn('...')" attribute: escape backslash/quote for JS first,
// then HTML-escape the result for the attribute itself.
function escJs(s) {
  if (s == null) return '';
  return esc(String(s).replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'"));
}

function fmtDate(d) {
  if (!d) return '—';
  var dt = new Date(d);
  return dt.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

// Initial load
loadStats();
loadSourceConfigs();
loadAgents();
</script>
</body>
</html>`;
}

module.exports = { getDashboardHTML };
