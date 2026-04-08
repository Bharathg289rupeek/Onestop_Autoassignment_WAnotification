function getDashboardHTML(baseUrl) {
  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>Lead Assignment Dashboard</title>\n' +
'<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
'<style>\n' +
'  * { margin:0; padding:0; box-sizing:border-box; }\n' +
'  :root {\n' +
'    --bg: #0b0d11; --surface: #13161d; --border: #1e2230; --border2: #2a2f40;\n' +
'    --text: #d4d8e3; --text2: #7a8199; --accent: #6c5ce7; --accent2: #a29bfe;\n' +
'    --green: #00cec9; --red: #ff6b6b; --amber: #fdcb6e; --blue: #74b9ff;\n' +
'    --radius: 8px;\n' +
'  }\n' +
'  body { font-family: "DM Sans", sans-serif; background: var(--bg); color: var(--text); line-height:1.5; }\n' +
'  .container { max-width:1320px; margin:0 auto; padding:20px 24px; }\n' +
'  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:12px; }\n' +
'  .header h1 { font-size:20px; font-weight:700; color:#fff; letter-spacing:-0.3px; }\n' +
'  .header h1 em { font-style:normal; color:var(--accent2); }\n' +
'  .btn { padding:8px 16px; border-radius:var(--radius); border:1px solid var(--border2); background:var(--surface); color:var(--text); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }\n' +
'  .btn:hover { border-color:var(--accent); color:#fff; }\n' +
'  .btn:disabled { opacity:0.5; cursor:not-allowed; }\n' +
'  .btn-primary { background:var(--accent); border-color:var(--accent); color:#fff; }\n' +
'  .btn-primary:hover { background:#5b4bd6; }\n' +
'  .btn-sm { padding:5px 10px; font-size:11px; }\n' +
'  .btn-danger { color:var(--red); border-color:rgba(255,107,107,.3); }\n' +
'  .btn-danger:hover { background:rgba(255,107,107,.1); }\n' +
'  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:24px; }\n' +
'  .stat { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); padding:16px; text-align:center; }\n' +
'  .stat .n { font-size:28px; font-weight:700; font-family:"JetBrains Mono",monospace; }\n' +
'  .stat .l { font-size:11px; color:var(--text2); text-transform:uppercase; letter-spacing:.8px; margin-top:2px; }\n' +
'  .c-accent .n { color:var(--accent2); } .c-blue .n { color:var(--blue); } .c-amber .n { color:var(--amber); }\n' +
'  .c-green .n { color:var(--green); } .c-red .n { color:var(--red); }\n' +
'  .tabs { display:flex; gap:0; border-bottom:1px solid var(--border); margin-bottom:20px; }\n' +
'  .tab { padding:10px 20px; cursor:pointer; font-size:13px; font-weight:600; color:var(--text2); border-bottom:2px solid transparent; transition:all .15s; user-select:none; }\n' +
'  .tab:hover { color:var(--text); }\n' +
'  .tab.active { color:var(--accent2); border-bottom-color:var(--accent); }\n' +
'  .tab-panel { display:none; } .tab-panel.active { display:block; }\n' +
'  .tbl-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }\n' +
'  table { width:100%; border-collapse:collapse; font-size:13px; }\n' +
'  th { text-align:left; padding:10px 12px; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:.7px; color:var(--text2); background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:1; }\n' +
'  td { padding:10px 12px; border-bottom:1px solid var(--border); }\n' +
'  tr:hover td { background:rgba(108,92,231,.04); }\n' +
'  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; font-family:"JetBrains Mono",monospace; }\n' +
'  .b-assigned { background:rgba(116,185,255,.12); color:var(--blue); }\n' +
'  .b-reassigned { background:rgba(162,155,254,.12); color:var(--accent2); }\n' +
'  .b-active { background:rgba(0,206,201,.12); color:var(--green); }\n' +
'  .b-sent { background:rgba(0,206,201,.12); color:var(--green); }\n' +
'  .b-failed { background:rgba(255,107,107,.12); color:var(--red); }\n' +
'  .b-pending { background:rgba(253,203,110,.12); color:var(--amber); }\n' +
'  .log { padding:8px 12px; border-left:3px solid var(--border2); margin-bottom:4px; font-size:12px; background:var(--surface); border-radius:0 var(--radius) var(--radius) 0; font-family:"JetBrains Mono",monospace; }\n' +
'  .log.SUCCESS { border-left-color:var(--green); } .log.FAILED { border-left-color:var(--red); }\n' +
'  .log-time { color:var(--text2); margin-right:8px; } .log-type { font-weight:600; color:var(--accent2); margin-right:6px; }\n' +
'  .toolbar { display:flex; gap:10px; margin-bottom:14px; align-items:center; flex-wrap:wrap; }\n' +
'  .search-input { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); padding:8px 14px; font-size:13px; width:300px; font-family:inherit; }\n' +
'  .search-input:focus { outline:none; border-color:var(--accent); }\n' +
'  .search-input::placeholder { color:var(--text2); }\n' +
'  .modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.6); z-index:100; display:flex; align-items:center; justify-content:center; }\n' +
'  .modal { background:var(--surface); border:1px solid var(--border2); border-radius:12px; padding:24px; width:520px; max-width:95vw; max-height:90vh; overflow-y:auto; }\n' +
'  .modal h2 { font-size:16px; font-weight:700; margin-bottom:16px; color:#fff; }\n' +
'  .form-group { margin-bottom:12px; }\n' +
'  .form-group label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; color:var(--text2); margin-bottom:4px; }\n' +
'  .form-group input, .form-group select { width:100%; padding:8px 12px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-size:13px; font-family:inherit; }\n' +
'  .form-group input:focus, .form-group select:focus { outline:none; border-color:var(--accent); }\n' +
'  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }\n' +
'  .form-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }\n' +
'  .hidden { display:none !important; }\n' +
'  .info-box { background:rgba(108,92,231,.08); border:1px solid rgba(108,92,231,.2); border-radius:var(--radius); padding:14px 16px; margin-bottom:16px; font-size:12px; line-height:1.7; color:var(--text2); }\n' +
'  .info-box strong { color:var(--accent2); }\n' +
'  .info-box code { background:rgba(0,0,0,.3); padding:1px 5px; border-radius:3px; font-family:"JetBrains Mono",monospace; font-size:11px; color:var(--text); }\n' +
'  .upload-zone { border:2px dashed var(--border2); border-radius:var(--radius); padding:24px; text-align:center; cursor:pointer; transition:all .2s; margin-bottom:12px; }\n' +
'  .upload-zone:hover, .upload-zone.dragover { border-color:var(--accent); background:rgba(108,92,231,.05); }\n' +
'  .upload-zone input { display:none; }\n' +
'  .upload-zone .icon { font-size:32px; margin-bottom:8px; }\n' +
'  .upload-zone .label { font-size:13px; color:var(--text2); }\n' +
'  .upload-zone .filename { font-size:12px; color:var(--accent2); margin-top:4px; font-family:"JetBrains Mono",monospace; }\n' +
'  .toast { position:fixed; top:20px; right:20px; padding:12px 20px; border-radius:var(--radius); font-size:13px; font-weight:600; z-index:200; animation:slideIn .3s; }\n' +
'  .toast.success { background:#14532d; color:#4ade80; border:1px solid #22c55e; }\n' +
'  .toast.error { background:#451a1a; color:#f87171; border:1px solid #ef4444; }\n' +
'  @keyframes slideIn { from { transform:translateX(100px); opacity:0; } to { transform:translateX(0); opacity:1; } }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<div class="container">\n' +
'  <div class="header">\n' +
'    <h1>&#9889; Lead Assignment <em>Dashboard</em></h1>\n' +
'    <button class="btn" onclick="loadAll()">&#8635; Refresh</button>\n' +
'  </div>\n' +
'\n' +
'  <div class="stats">\n' +
'    <div class="stat c-accent"><div class="n" id="sTotal">&mdash;</div><div class="l">Total Leads</div></div>\n' +
'    <div class="stat c-blue"><div class="n" id="sAssigned">&mdash;</div><div class="l">Assigned</div></div>\n' +
'    <div class="stat c-amber"><div class="n" id="sReassigned">&mdash;</div><div class="l">Reassigned</div></div>\n' +
'    <div class="stat c-green"><div class="n" id="sActive">&mdash;</div><div class="l">Active</div></div>\n' +
'    <div class="stat c-green"><div class="n" id="sWASent">&mdash;</div><div class="l">WA Sent</div></div>\n' +
'    <div class="stat c-red"><div class="n" id="sWAFail">&mdash;</div><div class="l">WA Failed</div></div>\n' +
'  </div>\n' +
'\n' +
'  <div class="tabs">\n' +
'    <div class="tab active" data-tab="leads">Leads</div>\n' +
'    <div class="tab" data-tab="agents">Agents</div>\n' +
'    <div class="tab" data-tab="sourceConfig">Source Config</div>\n' +
'    <div class="tab" data-tab="logs">Logs</div>\n' +
'  </div>\n' +
'\n' +
'  <!-- LEADS -->\n' +
'  <div class="tab-panel active" id="panel-leads">\n' +
'    <div class="toolbar">\n' +
'      <input class="search-input" id="searchLeads" placeholder="Search leads..." oninput="renderLeads()">\n' +
'    </div>\n' +
'    <div class="tbl-wrap"><table><thead><tr>\n' +
'      <th>Lead</th><th>Phone</th><th>Amount</th><th>Branch</th><th>Source</th>\n' +
'      <th>Assigned To</th><th>Priority</th><th>Status</th><th>WA</th><th>Calls</th><th>Time</th>\n' +
'    </tr></thead><tbody id="leadsBody"><tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text2)">Loading...</td></tr></tbody></table></div>\n' +
'  </div>\n' +
'\n' +
'  <!-- AGENTS -->\n' +
'  <div class="tab-panel" id="panel-agents">\n' +
'    <div class="toolbar">\n' +
'      <input class="search-input" id="searchAgents" placeholder="Search agents..." oninput="renderAgents()">\n' +
'      <button class="btn btn-primary" onclick="openAgentModal()">+ Add Agent</button>\n' +
'      <button class="btn" onclick="openCSVModal()">&#128196; Upload CSV</button>\n' +
'      <a class="btn" href="' + baseUrl + '/api/agents/download-csv" target="_blank">&#11015; Download CSV</a>\n' +
'    </div>\n' +
'    <div class="tbl-wrap"><table><thead><tr>\n' +
'      <th>Branch</th><th>Email</th><th>Name</th><th>Phone</th><th>City</th><th>Pincode</th>\n' +
'      <th>Priority</th><th>City ID</th><th>Pin ID</th><th>Active</th><th>Actions</th>\n' +
'    </tr></thead><tbody id="agentsBody"></tbody></table></div>\n' +
'  </div>\n' +
'\n' +
'  <!-- SOURCE CONFIG -->\n' +
'  <div class="tab-panel" id="panel-sourceConfig">\n' +
'    <div class="info-box">\n' +
'      <strong>How assignment works per lead source:</strong><br>\n' +
'      &#8226; <code>branch_id</code> &mdash; Agents matched by branch_id, assigned by lowest <strong>priority</strong> number.<br>\n' +
'      &#8226; <code>city</code> &mdash; Agents matched by city WHERE <strong>city_identifier = assign</strong>, lowest priority.<br>\n' +
'      &#8226; <code>pincode</code> &mdash; Agents matched by pincode WHERE <strong>pincode_identifier = assign</strong>, lowest priority.<br><br>\n' +
'      If a lead_source has no config here, it defaults to <code>branch_id</code> mode.\n' +
'    </div>\n' +
'    <div class="toolbar">\n' +
'      <button class="btn btn-primary" onclick="openSourceModal()">+ Add Source Config</button>\n' +
'    </div>\n' +
'    <div class="tbl-wrap"><table><thead><tr>\n' +
'      <th>Lead Source</th><th>Assign By</th><th>Active</th><th>Actions</th>\n' +
'    </tr></thead><tbody id="sourceBody"></tbody></table></div>\n' +
'  </div>\n' +
'\n' +
'  <!-- LOGS -->\n' +
'  <div class="tab-panel" id="panel-logs">\n' +
'    <div id="logsBody" style="padding:20px;color:var(--text2)">Loading...</div>\n' +
'  </div>\n' +
'</div>\n' +
'\n' +
'<!-- AGENT MODAL -->\n' +
'<div class="modal-overlay hidden" id="agentModal">\n' +
'<div class="modal">\n' +
'  <h2 id="agentModalTitle">Add Agent</h2>\n' +
'  <input type="hidden" id="agentEditId">\n' +
'  <div class="form-row">\n' +
'    <div class="form-group"><label>Branch ID</label><input id="fBranch" placeholder="BR001"></div>\n' +
'    <div class="form-group"><label>Priority (1=highest)</label><input id="fPriority" type="number" value="1" min="1"></div>\n' +
'  </div>\n' +
'  <div class="form-group"><label>Agent Email</label><input id="fEmail" placeholder="agent@rupeek.com"></div>\n' +
'  <div class="form-row">\n' +
'    <div class="form-group"><label>Agent Name</label><input id="fName" placeholder="Dhruv"></div>\n' +
'    <div class="form-group"><label>Agent Phone</label><input id="fPhone" placeholder="9380720423"></div>\n' +
'  </div>\n' +
'  <div class="form-row">\n' +
'    <div class="form-group"><label>City</label><input id="fCity" placeholder="bangalore"></div>\n' +
'    <div class="form-group"><label>Pincode</label><input id="fPincode" placeholder="574224"></div>\n' +
'  </div>\n' +
'  <div class="form-row">\n' +
'    <div class="form-group"><label>City Identifier</label>\n' +
'      <select id="fCityId"><option value="assign">assign</option><option value="dont assign">dont assign</option></select>\n' +
'    </div>\n' +
'    <div class="form-group"><label>Pincode Identifier</label>\n' +
'      <select id="fPinId"><option value="assign">assign</option><option value="dont assign">dont assign</option></select>\n' +
'    </div>\n' +
'  </div>\n' +
'  <div class="form-actions">\n' +
'    <button class="btn" onclick="closeModal(\'agentModal\')">Cancel</button>\n' +
'    <button class="btn btn-primary" id="btnSaveAgent" onclick="saveAgent()">Save</button>\n' +
'  </div>\n' +
'</div></div>\n' +
'\n' +
'<!-- CSV UPLOAD MODAL -->\n' +
'<div class="modal-overlay hidden" id="csvModal">\n' +
'<div class="modal">\n' +
'  <h2>Upload Agent CSV</h2>\n' +
'  <div class="info-box">\n' +
'    <strong>This will REPLACE ALL existing agents.</strong><br><br>\n' +
'    Required columns: <code>branch_id</code>, <code>agent_email</code>, <code>agent_name</code>, <code>agent_phone</code>, <code>priority</code><br>\n' +
'    Optional: <code>city</code>, <code>pincode</code>, <code>city_identifier</code>, <code>pincode_identifier</code>\n' +
'  </div>\n' +
'  <div class="upload-zone" id="uploadZone" onclick="document.getElementById(\'csvFileInput\').click()">\n' +
'    <input type="file" id="csvFileInput" accept=".csv">\n' +
'    <div class="icon">&#128196;</div>\n' +
'    <div class="label">Click or drag CSV file here</div>\n' +
'    <div class="filename" id="csvFileName"></div>\n' +
'  </div>\n' +
'  <div class="form-actions">\n' +
'    <button class="btn" onclick="closeModal(\'csvModal\')">Cancel</button>\n' +
'    <button class="btn btn-primary" id="btnUploadCSV" onclick="uploadCSV()" disabled>Upload &amp; Replace All Agents</button>\n' +
'  </div>\n' +
'</div></div>\n' +
'\n' +
'<!-- SOURCE CONFIG MODAL -->\n' +
'<div class="modal-overlay hidden" id="sourceModal">\n' +
'<div class="modal">\n' +
'  <h2>Add Lead Source Config</h2>\n' +
'  <div class="form-group"><label>Lead Source Name</label><input id="fSource" placeholder="e.g. chakra, website, partner"></div>\n' +
'  <div class="form-group"><label>Assign By</label>\n' +
'    <select id="fAssignBy">\n' +
'      <option value="branch_id">branch_id &mdash; priority-based</option>\n' +
'      <option value="city">city &mdash; city_identifier filter</option>\n' +
'      <option value="pincode">pincode &mdash; pincode_identifier filter</option>\n' +
'    </select>\n' +
'  </div>\n' +
'  <div class="form-actions">\n' +
'    <button class="btn" onclick="closeModal(\'sourceModal\')">Cancel</button>\n' +
'    <button class="btn btn-primary" id="btnSaveSource" onclick="saveSourceConfig()">Save</button>\n' +
'  </div>\n' +
'</div></div>\n' +
'\n' +
'<script>\n' +
'var API = "' + baseUrl + '/api";\n' +
'var allLeads = [], allAgents = [], allSources = [];\n' +
'\n' +
'// ── Toast ──\n' +
'function toast(msg, type) {\n' +
'  var el = document.createElement("div");\n' +
'  el.className = "toast " + (type || "success");\n' +
'  el.textContent = msg;\n' +
'  document.body.appendChild(el);\n' +
'  setTimeout(function() { el.remove(); }, 3000);\n' +
'}\n' +
'\n' +
'// ── Tabs ──\n' +
'document.querySelectorAll(".tab").forEach(function(t) {\n' +
'  t.addEventListener("click", function() {\n' +
'    document.querySelectorAll(".tab").forEach(function(x) { x.classList.remove("active"); });\n' +
'    document.querySelectorAll(".tab-panel").forEach(function(x) { x.classList.remove("active"); });\n' +
'    t.classList.add("active");\n' +
'    document.getElementById("panel-" + t.dataset.tab).classList.add("active");\n' +
'    if (t.dataset.tab === "logs") loadLogs();\n' +
'    if (t.dataset.tab === "agents") loadAgents();\n' +
'    if (t.dataset.tab === "sourceConfig") loadSourceConfigs();\n' +
'  });\n' +
'});\n' +
'\n' +
'// ── Load All ──\n' +
'function loadAll() { loadStats(); loadAgents(); loadSourceConfigs(); }\n' +
'\n' +
'// ── Stats & Leads ──\n' +
'function loadStats() {\n' +
'  fetch(API + "/stats").then(function(r) { return r.json(); }).then(function(j) {\n' +
'    var d = j.data;\n' +
'    document.getElementById("sTotal").textContent = d.total;\n' +
'    document.getElementById("sAssigned").textContent = d.assigned;\n' +
'    document.getElementById("sReassigned").textContent = d.reassigned;\n' +
'    document.getElementById("sActive").textContent = d.active;\n' +
'    document.getElementById("sWASent").textContent = d.whatsappSent;\n' +
'    document.getElementById("sWAFail").textContent = d.whatsappFailed;\n' +
'    allLeads = d.leads || [];\n' +
'    renderLeads();\n' +
'  }).catch(function(e) {\n' +
'    document.getElementById("leadsBody").innerHTML = "<tr><td colspan=\\"11\\" style=\\"color:var(--red);padding:20px\\">Error: " + esc(e.message) + "</td></tr>";\n' +
'  });\n' +
'}\n' +
'\n' +
'function renderLeads() {\n' +
'  var q = (document.getElementById("searchLeads").value || "").toLowerCase();\n' +
'  var list = q ? allLeads.filter(function(l) {\n' +
'    return (l.name||"").toLowerCase().indexOf(q)>=0 || (l.phone||"").indexOf(q)>=0 ||\n' +
'      (l.branch_id||"").toLowerCase().indexOf(q)>=0 || (l.lead_id||"").toLowerCase().indexOf(q)>=0 ||\n' +
'      (l.lead_source||"").toLowerCase().indexOf(q)>=0;\n' +
'  }) : allLeads;\n' +
'  var b = document.getElementById("leadsBody");\n' +
'  if (!list.length) { b.innerHTML = "<tr><td colspan=\\"11\\" style=\\"padding:20px;color:var(--text2)\\">No leads found</td></tr>"; return; }\n' +
'  b.innerHTML = list.map(function(l) {\n' +
'    var sc = (l.lead_status||"").toLowerCase().replace(/\\s/g,"");\n' +
'    var wa = l.reassigned ? (l.whatsapp_p1_status||"Pending") : (l.whatsapp_p0_status||"Pending");\n' +
'    var cur = l.reassigned ? l.reassigned_name : l.assigned_name;\n' +
'    return "<tr>" +\n' +
'      "<td><strong>"+esc(l.name)+"</strong><br><span style=\\"color:var(--text2);font-size:11px\\">"+esc(l.lead_id)+"</span></td>" +\n' +
'      "<td>"+esc(l.phone)+"</td>" +\n' +
'      "<td style=\\"font-weight:600;font-family:JetBrains Mono,monospace;font-size:12px\\">Rs."+Number(l.loan_amount||0).toLocaleString("en-IN")+"</td>" +\n' +
'      "<td>"+esc(l.branch_id)+"</td>" +\n' +
'      "<td><span class=\\"badge\\" style=\\"background:rgba(108,92,231,.12);color:var(--accent2)\\">"+esc(l.lead_source||"--")+"</span></td>" +\n' +
'      "<td>"+esc(cur||"--")+(l.reassigned?"<br><span style=\\"color:var(--text2);font-size:11px\\">was: "+esc(l.assigned_name)+"</span>":"")+"</td>" +\n' +
'      "<td><span class=\\"badge b-assigned\\">P"+esc(String(l.assigned_priority||0))+"</span>"+(l.reassigned?" &rarr; <span class=\\"badge b-reassigned\\">RE</span>":"")+"</td>" +\n' +
'      "<td><span class=\\"badge b-"+sc+"\\">"+esc(l.lead_status)+"</span></td>" +\n' +
'      "<td><span class=\\"badge b-"+wa.toLowerCase()+"\\">"+esc(wa)+"</span></td>" +\n' +
'      "<td>"+(l.call_count||0)+"</td>" +\n' +
'      "<td style=\\"color:var(--text2);font-size:11px\\">"+timeAgo(l.created_at)+"</td></tr>";\n' +
'  }).join("");\n' +
'}\n' +
'\n' +
'// ── Agents ──\n' +
'function loadAgents() {\n' +
'  fetch(API + "/agents").then(function(r) { return r.json(); }).then(function(j) {\n' +
'    allAgents = j.data || []; renderAgents();\n' +
'  }).catch(function(e) { console.error("loadAgents", e); toast("Failed to load agents: " + e.message, "error"); });\n' +
'}\n' +
'\n' +
'function renderAgents() {\n' +
'  var q = (document.getElementById("searchAgents") ? document.getElementById("searchAgents").value : "").toLowerCase();\n' +
'  var list = q ? allAgents.filter(function(a) {\n' +
'    return (a.agent_name||"").toLowerCase().indexOf(q)>=0 || (a.branch_id||"").toLowerCase().indexOf(q)>=0 ||\n' +
'      (a.agent_email||"").toLowerCase().indexOf(q)>=0 || (a.city||"").toLowerCase().indexOf(q)>=0;\n' +
'  }) : allAgents;\n' +
'  var b = document.getElementById("agentsBody");\n' +
'  if (!list.length) { b.innerHTML = "<tr><td colspan=\\"11\\" style=\\"padding:20px;color:var(--text2)\\">No agents. Add manually or upload CSV.</td></tr>"; return; }\n' +
'  b.innerHTML = list.map(function(a) {\n' +
'    return "<tr>" +\n' +
'      "<td><strong>"+esc(a.branch_id)+"</strong></td>" +\n' +
'      "<td style=\\"font-size:12px\\">"+esc(a.agent_email)+"</td>" +\n' +
'      "<td>"+esc(a.agent_name)+"</td>" +\n' +
'      "<td>"+esc(a.agent_phone)+"</td>" +\n' +
'      "<td>"+esc(a.city||"--")+"</td>" +\n' +
'      "<td>"+esc(a.pincode||"--")+"</td>" +\n' +
'      "<td><span class=\\"badge b-assigned\\">"+a.priority+"</span></td>" +\n' +
'      "<td><span class=\\"badge "+(a.city_identifier==="assign"?"b-active":"b-failed")+"\\">"+esc(a.city_identifier||"assign")+"</span></td>" +\n' +
'      "<td><span class=\\"badge "+(a.pincode_identifier==="assign"?"b-active":"b-failed")+"\\">"+esc(a.pincode_identifier||"assign")+"</span></td>" +\n' +
'      "<td>"+(a.is_active?"<span class=\\"badge b-active\\">Yes</span>":"<span class=\\"badge b-failed\\">No</span>")+"</td>" +\n' +
'      "<td><button class=\\"btn btn-sm\\" onclick=\\"editAgent("+a.id+")\\">Edit</button> <button class=\\"btn btn-sm btn-danger\\" onclick=\\"delAgent("+a.id+")\\">Del</button></td></tr>";\n' +
'  }).join("");\n' +
'}\n' +
'\n' +
'function openAgentModal(agent) {\n' +
'  document.getElementById("agentModalTitle").textContent = agent ? "Edit Agent" : "Add Agent";\n' +
'  document.getElementById("agentEditId").value = agent ? agent.id : "";\n' +
'  document.getElementById("fBranch").value = agent ? agent.branch_id : "";\n' +
'  document.getElementById("fEmail").value = agent ? agent.agent_email : "";\n' +
'  document.getElementById("fName").value = agent ? agent.agent_name : "";\n' +
'  document.getElementById("fPhone").value = agent ? agent.agent_phone : "";\n' +
'  document.getElementById("fCity").value = agent ? (agent.city||"") : "";\n' +
'  document.getElementById("fPincode").value = agent ? (agent.pincode||"") : "";\n' +
'  document.getElementById("fPriority").value = agent ? agent.priority : 1;\n' +
'  document.getElementById("fCityId").value = agent ? (agent.city_identifier||"assign") : "assign";\n' +
'  document.getElementById("fPinId").value = agent ? (agent.pincode_identifier||"assign") : "assign";\n' +
'  document.getElementById("agentModal").classList.remove("hidden");\n' +
'}\n' +
'\n' +
'function editAgent(id) {\n' +
'  var a = allAgents.find(function(x) { return x.id === id; });\n' +
'  if (a) openAgentModal(a);\n' +
'}\n' +
'\n' +
'function saveAgent() {\n' +
'  var btn = document.getElementById("btnSaveAgent");\n' +
'  btn.disabled = true; btn.textContent = "Saving...";\n' +
'  var id = document.getElementById("agentEditId").value;\n' +
'  var body = {\n' +
'    branch_id: document.getElementById("fBranch").value,\n' +
'    agent_email: document.getElementById("fEmail").value,\n' +
'    agent_name: document.getElementById("fName").value,\n' +
'    agent_phone: document.getElementById("fPhone").value,\n' +
'    city: document.getElementById("fCity").value,\n' +
'    pincode: document.getElementById("fPincode").value,\n' +
'    priority: parseInt(document.getElementById("fPriority").value) || 1,\n' +
'    city_identifier: document.getElementById("fCityId").value,\n' +
'    pincode_identifier: document.getElementById("fPinId").value,\n' +
'  };\n' +
'  var url = id ? API + "/agents/" + id : API + "/agents";\n' +
'  var method = id ? "PUT" : "POST";\n' +
'  fetch(url, { method: method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body) })\n' +
'    .then(function(r) { return r.json(); })\n' +
'    .then(function(j) {\n' +
'      if (j.code === 200) { toast("Agent saved!"); closeModal("agentModal"); loadAgents(); }\n' +
'      else { toast("Error: " + j.message, "error"); }\n' +
'    })\n' +
'    .catch(function(e) { toast("Error: " + e.message, "error"); })\n' +
'    .finally(function() { btn.disabled = false; btn.textContent = "Save"; });\n' +
'}\n' +
'\n' +
'function delAgent(id) {\n' +
'  if (!confirm("Delete this agent?")) return;\n' +
'  fetch(API + "/agents/" + id, { method: "DELETE" })\n' +
'    .then(function() { toast("Agent deleted"); loadAgents(); })\n' +
'    .catch(function(e) { toast("Error: " + e.message, "error"); });\n' +
'}\n' +
'\n' +
'// ── CSV Upload ──\n' +
'var csvFile = null;\n' +
'\n' +
'function openCSVModal() {\n' +
'  csvFile = null;\n' +
'  document.getElementById("csvFileInput").value = "";\n' +
'  document.getElementById("csvFileName").textContent = "";\n' +
'  document.getElementById("btnUploadCSV").disabled = true;\n' +
'  document.getElementById("csvModal").classList.remove("hidden");\n' +
'}\n' +
'\n' +
'document.getElementById("csvFileInput").addEventListener("change", function(e) {\n' +
'  if (e.target.files.length > 0) {\n' +
'    csvFile = e.target.files[0];\n' +
'    document.getElementById("csvFileName").textContent = csvFile.name + " (" + (csvFile.size / 1024).toFixed(1) + " KB)";\n' +
'    document.getElementById("btnUploadCSV").disabled = false;\n' +
'  }\n' +
'});\n' +
'\n' +
'// Drag and drop\n' +
'var uz = document.getElementById("uploadZone");\n' +
'uz.addEventListener("dragover", function(e) { e.preventDefault(); uz.classList.add("dragover"); });\n' +
'uz.addEventListener("dragleave", function() { uz.classList.remove("dragover"); });\n' +
'uz.addEventListener("drop", function(e) {\n' +
'  e.preventDefault(); uz.classList.remove("dragover");\n' +
'  if (e.dataTransfer.files.length > 0) {\n' +
'    csvFile = e.dataTransfer.files[0];\n' +
'    document.getElementById("csvFileName").textContent = csvFile.name + " (" + (csvFile.size / 1024).toFixed(1) + " KB)";\n' +
'    document.getElementById("btnUploadCSV").disabled = false;\n' +
'  }\n' +
'});\n' +
'\n' +
'function uploadCSV() {\n' +
'  if (!csvFile) return;\n' +
'  if (!confirm("This will DELETE all existing agents and replace with CSV data. Continue?")) return;\n' +
'  var btn = document.getElementById("btnUploadCSV");\n' +
'  btn.disabled = true; btn.textContent = "Uploading...";\n' +
'  var fd = new FormData();\n' +
'  fd.append("file", csvFile);\n' +
'  fetch(API + "/agents/upload-csv", { method: "POST", body: fd })\n' +
'    .then(function(r) { return r.json(); })\n' +
'    .then(function(j) {\n' +
'      if (j.code === 200) { toast(j.message); closeModal("csvModal"); loadAgents(); }\n' +
'      else { toast("Error: " + (j.message || "Upload failed") + (j.hint ? "\\n" + j.hint : ""), "error"); }\n' +
'    })\n' +
'    .catch(function(e) { toast("Upload failed: " + e.message, "error"); })\n' +
'    .finally(function() { btn.disabled = false; btn.textContent = "Upload \\u0026 Replace All Agents"; });\n' +
'}\n' +
'\n' +
'// ── Source Config ──\n' +
'function loadSourceConfigs() {\n' +
'  fetch(API + "/source-config").then(function(r) { return r.json(); }).then(function(j) {\n' +
'    allSources = j.data || []; renderSourceConfigs();\n' +
'  }).catch(function(e) { console.error("loadSourceConfigs", e); });\n' +
'}\n' +
'\n' +
'function renderSourceConfigs() {\n' +
'  var b = document.getElementById("sourceBody");\n' +
'  if (!allSources.length) { b.innerHTML = "<tr><td colspan=\\"4\\" style=\\"padding:20px;color:var(--text2)\\">No source configs. All sources default to branch_id.</td></tr>"; return; }\n' +
'  b.innerHTML = allSources.map(function(s) {\n' +
'    return "<tr>" +\n' +
'      "<td><strong>"+esc(s.lead_source)+"</strong></td>" +\n' +
'      "<td><span class=\\"badge b-assigned\\">"+esc(s.assign_by)+"</span></td>" +\n' +
'      "<td>"+(s.is_active?"<span class=\\"badge b-active\\">Yes</span>":"<span class=\\"badge b-failed\\">No</span>")+"</td>" +\n' +
'      "<td><button class=\\"btn btn-sm btn-danger\\" onclick=\\"delSource("+s.id+")\\">Delete</button></td></tr>";\n' +
'  }).join("");\n' +
'}\n' +
'\n' +
'function openSourceModal() {\n' +
'  document.getElementById("fSource").value = "";\n' +
'  document.getElementById("fAssignBy").value = "branch_id";\n' +
'  document.getElementById("sourceModal").classList.remove("hidden");\n' +
'}\n' +
'\n' +
'function saveSourceConfig() {\n' +
'  var btn = document.getElementById("btnSaveSource");\n' +
'  btn.disabled = true; btn.textContent = "Saving...";\n' +
'  var body = { lead_source: document.getElementById("fSource").value, assign_by: document.getElementById("fAssignBy").value };\n' +
'  if (!body.lead_source) { toast("Enter a lead source name", "error"); btn.disabled = false; btn.textContent = "Save"; return; }\n' +
'  fetch(API + "/source-config", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body) })\n' +
'    .then(function(r) { return r.json(); })\n' +
'    .then(function(j) {\n' +
'      if (j.code === 200) { toast("Source config saved!"); closeModal("sourceModal"); loadSourceConfigs(); }\n' +
'      else { toast("Error: " + j.message, "error"); }\n' +
'    })\n' +
'    .catch(function(e) { toast("Error: " + e.message, "error"); })\n' +
'    .finally(function() { btn.disabled = false; btn.textContent = "Save"; });\n' +
'}\n' +
'\n' +
'function delSource(id) {\n' +
'  if (!confirm("Delete? Leads from this source will default to branch_id.")) return;\n' +
'  fetch(API + "/source-config/" + id, { method: "DELETE" })\n' +
'    .then(function() { toast("Deleted"); loadSourceConfigs(); })\n' +
'    .catch(function(e) { toast("Error: " + e.message, "error"); });\n' +
'}\n' +
'\n' +
'// ── Logs ──\n' +
'function loadLogs() {\n' +
'  fetch(API + "/logs").then(function(r) { return r.json(); }).then(function(j) {\n' +
'    var logs = (j.data && j.data.logs) ? j.data.logs : [];\n' +
'    var el = document.getElementById("logsBody");\n' +
'    if (!logs.length) { el.innerHTML = "<p style=\\"color:var(--text2)\\">No logs yet</p>"; return; }\n' +
'    el.innerHTML = logs.map(function(l) {\n' +
'      var ts = l.created_at ? String(l.created_at).replace("T"," ").substring(0,19) : "";\n' +
'      return "<div class=\\"log "+(l.status||"")+"\\">" +\n' +
'        "<span class=\\"log-time\\">"+esc(ts)+"</span>" +\n' +
'        "<span class=\\"log-type\\">"+esc(l.type||"")+"</span>" +\n' +
'        (l.lead_id ? "<strong>"+esc(l.lead_id)+"</strong> " : "") +\n' +
'        (l.phone ? "("+esc(l.phone)+") " : "") +\n' +
'        esc(l.details||"") + "</div>";\n' +
'    }).join("");\n' +
'  }).catch(function(e) { document.getElementById("logsBody").innerHTML = "<p style=\\"color:var(--red)\\">Error: " + esc(e.message) + "</p>"; });\n' +
'}\n' +
'\n' +
'// ── Helpers ──\n' +
'function closeModal(id) { document.getElementById(id).classList.add("hidden"); }\n' +
'function timeAgo(d) {\n' +
'  if (!d) return "";\n' +
'  var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);\n' +
'  if (s < 60) return s + "s ago";\n' +
'  if (s < 3600) return Math.floor(s/60) + "m ago";\n' +
'  if (s < 86400) return Math.floor(s/3600) + "h ago";\n' +
'  return Math.floor(s/86400) + "d ago";\n' +
'}\n' +
'function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }\n' +
'\n' +
'// Close modals on overlay click\n' +
'document.querySelectorAll(".modal-overlay").forEach(function(o) {\n' +
'  o.addEventListener("click", function(e) { if (e.target === o) o.classList.add("hidden"); });\n' +
'});\n' +
'\n' +
'loadAll();\n' +
'setInterval(loadStats, 30000);\n' +
'</script>\n' +
'</body></html>'
;
}

module.exports = { getDashboardHTML };
