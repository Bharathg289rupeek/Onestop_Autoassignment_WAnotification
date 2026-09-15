process.env.DATABASE_URL = 'postgresql://postgres@127.0.0.1:5433/leadtest';
const path = require('path');
const ROOT = path.join(__dirname, 'Onestop_Autoassignment_WAnotification-main');
const { pool, initDB } = require(path.join(ROOT, 'db'));
const db = require(path.join(ROOT, 'services/database'));

let fails = 0;
function check(name, cond, extra) {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (extra ? '  -> ' + extra : ''));
  if (!cond) fails++;
}

async function seed() {
  await pool.query('TRUNCATE leads, logs, agents RESTART IDENTITY CASCADE');
  const rows = [
    // pincode 560001 — three agents in rotation
    ['BR1', 'a@x.com', 'Agent A', '9000000001', 'bangalore', '560001', 1, 'assign', 'assign', true],
    ['BR1', 'b@x.com', 'Agent B', '9000000002', 'bangalore', '560001', 2, 'assign', 'assign', true],
    ['BR1', 'c@x.com', 'Agent C', '9000000003', 'bangalore', '560001', 3, 'assign', 'assign', true],
    // same pincode but excluded: pincode_identifier = dont assign
    ['BR1', 'd@x.com', 'Agent D', '9000000004', 'bangalore', '560001', 1, 'assign', 'dont assign', true],
    // same pincode but inactive
    ['BR1', 'e@x.com', 'Agent E', '9000000005', 'bangalore', '560001', 1, 'assign', 'assign', false],
    // different pincode, with untrimmed whitespace to test normalization
    ['BR2', 'f@x.com', 'Agent F', '9000000006', 'mysore', ' 570001 ', 1, 'assign', 'assign', true],
    // agent with no pincode at all
    ['BR3', 'g@x.com', 'Agent G', '9000000007', 'hubli', null, 1, 'assign', 'assign', true],
  ];
  for (const r of rows) {
    await pool.query(
      'INSERT INTO agents (branch_id,agent_email,agent_name,agent_phone,city,pincode,priority,city_identifier,pincode_identifier,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', r);
  }
}

(async () => {
  await initDB();
  console.log('\n[1] Schema applies cleanly, and is re-runnable');
  await initDB(); // must be idempotent — Railway runs it on every boot
  check('initDB twice without error', true);

  await seed();

  console.log('\n[2] Round robin spreads evenly across the pincode');
  const picks = [];
  for (let i = 0; i < 9; i++) {
    const a = await db.claimAgentByPincode('560001', null);
    picks.push(a ? a.agent_email : null);
  }
  console.log('     order: ' + picks.join(' -> '));
  const counts = picks.reduce((m, e) => (m[e] = (m[e] || 0) + 1, m), {});
  check('9 leads split 3/3/3 across A,B,C', JSON.stringify(counts) === JSON.stringify({ 'a@x.com': 3, 'b@x.com': 3, 'c@x.com': 3 }), JSON.stringify(counts));
  check('never picks "dont assign" agent D', !picks.includes('d@x.com'));
  check('never picks inactive agent E', !picks.includes('e@x.com'));
  check('never picks agent F from another pincode', !picks.includes('f@x.com'));
  check('rotation cycles A,B,C repeatedly', picks.slice(0, 3).join() === picks.slice(3, 6).join());

  console.log('\n[3] Do-not-assign rules');
  check('no pincode -> null', (await db.claimAgentByPincode('', null)) === null);
  check('null pincode -> null', (await db.claimAgentByPincode(null, null)) === null);
  check('undefined pincode -> null', (await db.claimAgentByPincode(undefined, null)) === null);
  check('pincode with no agents -> null', (await db.claimAgentByPincode('999999', null)) === null);
  check('countAssignableAgents(999999) = 0', (await db.countAssignableAgents('999999')) === 0);
  check('countAssignableAgents(560001) = 3', (await db.countAssignableAgents('560001')) === 3);

  console.log('\n[4] Pincode normalization');
  const f1 = await db.claimAgentByPincode('570001', null);
  check('lead pin "570001" matches agent stored as " 570001 "', f1 && f1.agent_email === 'f@x.com');
  const f2 = await db.claimAgentByPincode('  570001  ', null);
  check('lead pin with spaces still matches', f2 && f2.agent_email === 'f@x.com');
  const f3 = await db.claimAgentByPincode(570001, null);
  check('numeric pincode matches', f3 && f3.agent_email === 'f@x.com');

  console.log('\n[5] Reassignment stays in pincode and skips current agent');
  await seed();
  const first = await db.claimAgentByPincode('560001', null);
  const next = await db.findNextAgent({ pincode: '560001' }, first.id);
  check('next agent differs from first', next && next.id !== first.id, first.agent_email + ' -> ' + (next && next.agent_email));
  check('next agent is in same pincode', next && String(next.pincode).trim() === '560001');
  const soloNext = await db.findNextAgent({ pincode: '570001' }, f1.id);
  check('lone agent in pincode -> no backup (null)', soloNext === null);

  console.log('\n[6] Concurrency: 12 simultaneous leads must not double-book');
  await seed();
  const conc = await Promise.all(Array.from({ length: 12 }, () => db.claimAgentByPincode('560001', null)));
  const cc = conc.reduce((m, a) => (m[a ? a.agent_email : 'null'] = (m[a ? a.agent_email : 'null'] || 0) + 1, m), {});
  const vals = Object.values(cc);
  check('all 12 got an agent', conc.every(Boolean), JSON.stringify(cc));
  check('load stays balanced under concurrency (max-min <= 1)', Math.max(...vals) - Math.min(...vals) <= 1, JSON.stringify(cc));

  console.log('\n[7] Unassigned leads are still recorded');
  const rec = await db.insertLead({
    lead_id: 'LF-TEST-1', phone: '9999999999', name: 'No Pin', loan_amount: 100000,
    branch_id: null, city: null, pincode: null, loan_type: '2', lead_source: 'chakra',
    lead_status: 'Unassigned - No Pincode',
  });
  check('row inserted with no agent', rec.assigned_agent_id === null);
  check('status preserved', rec.lead_status === 'Unassigned - No Pincode', rec.lead_status);
  check('assigned_at null', rec.assigned_at === null);
  check('activity_checked true so cron skips it', rec.activity_checked === true);
  check('whatsapp marked Skipped', rec.whatsapp_p0_status === 'Skipped', rec.whatsapp_p0_status);

  const assignedRow = await db.insertLead({
    lead_id: 'LF-TEST-2', phone: '8888888888', name: 'Has Pin', loan_amount: 200000,
    branch_id: 'BR1', city: 'bangalore', pincode: '560001', loan_type: '2', lead_source: 'chakra',
    agent_id: first.id, agent_email: first.agent_email, agent_name: first.agent_name,
    agent_phone: first.agent_phone, agent_priority: first.priority, onestop_lead_id: 'OS1',
  });
  check('assigned lead gets status Assigned', assignedRow.lead_status === 'Assigned');
  check('assigned lead has assigned_at', assignedRow.assigned_at !== null);
  check('assigned lead pending WA + uncheck activity', assignedRow.whatsapp_p0_status === 'Pending' && assignedRow.activity_checked === false);

  console.log('\n[8] Reassignment queue only picks up assigned leads');
  const pend = await db.getLeadsPendingReassignment(0);
  const ids = pend.map(l => l.lead_id);
  check('unassigned lead excluded from reassignment queue', !ids.includes('LF-TEST-1'), JSON.stringify(ids));
  check('assigned lead included', ids.includes('LF-TEST-2'));

  console.log('\n[9] Dashboard stats count unassigned');
  const stats = await db.getDashboardStats();
  check('unassigned = 1', stats.unassigned === 1, String(stats.unassigned));
  check('total = 2', stats.total === 2);

  console.log('\n' + (fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'));
  await pool.end();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
