class ContributionGroup {
  constructor(name, amount) {
    this.name = name;
    this.amount = amount;
    this.members = [];
    this.contributions = [];
    this.payouts = [];
    this.cycle = 1;
  }
  addMember(name) {
    if (this.members.some(m => m.name === name)) throw new Error(`${name} is already a member`);
    const member = { id: this.members.length + 1, name };
    this.members.push(member);
    return member;
  }
  contribute(name, amount) {
    const m = this.members.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!m) throw new Error(`Member "${name}" not found`);
    if (this.paid(m.id)) throw new Error(`${m.name} already contributed for cycle ${this.cycle}`);
    this.contributions.push({ memberId: m.id, name: m.name, amount, cycle: this.cycle });
    return m.name;
  }
  pool() { return this.contributions.filter(x => x.cycle === this.cycle).reduce((s, x) => s + x.amount, 0); }
  paid(id) { return this.contributions.some(x => x.memberId === id && x.cycle === this.cycle); }
  defaulters() { return this.members.filter(m => !this.paid(m.id)).map(m => m.name); }
  recipient() { return this.members.length ? this.members[(this.cycle - 1) % this.members.length] : null; }
  payout() {
    const r = this.recipient();
    if (!r) throw new Error('No members to pay out to');
    const d = this.defaulters();
    if (d.length) throw new Error(`Defaulters: ${d.join(', ')}`);
    const p = { recipient: r.name, amount: this.pool(), cycle: this.cycle };
    this.payouts.push(p);
    this.cycle++;
    return p;
  }
}

const ajo = new ContributionGroup('Lagos Traders Ajo', 10000);
const $ = id => document.getElementById(id);
const fmt = n => '₦' + n.toLocaleString();

function log(msg, err) {
  const el = $('log');
  if (el.querySelector('.empty')) el.innerHTML = '';
  const e = document.createElement('div');
  e.className = 'log-entry' + (err ? ' error' : '');
  e.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(e);
}

const STATES = {
  next:    ['recipient', 'tag-next',    'Next recipient'],
  paid:    ['paid',      'tag-paid',    'Paid'],
  pending: ['',          'tag-pending', 'Pending'],
};

function render() {
  $('cycleNum').textContent = ajo.cycle;
  document.querySelectorAll('.cycleInline').forEach(el => el.textContent = ajo.cycle);
  $('statPool').textContent = fmt(ajo.pool());
  $('statMembers').textContent = ajo.members.length;
  $('statRecipient').textContent = ajo.recipient()?.name || '—';
  const list = $('memberList');
  if (!ajo.members.length) { list.innerHTML = '<div class="empty">No members yet — add one to begin.</div>'; return; }
  const r = ajo.recipient();
  list.innerHTML = ajo.members.map(m => {
    const key = r && r.id === m.id ? 'next' : ajo.paid(m.id) ? 'paid' : 'pending';
    const [rowCls, tagCls, label] = STATES[key];
    return `<div class="member-row ${rowCls}"><span class="member-name">${m.name}</span><span class="member-tag ${tagCls}">${label}</span></div>`;
  }).join('');
}

const handle = fn => { try { fn(); render(); } catch (err) { log(err.message, true); } };

$('memberForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('memberName');
  handle(() => { ajo.addMember(input.value.trim()); log(`Added member: ${input.value.trim()}`); input.value = ''; });
});

$('contribForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('contribName').value.trim();
  const amount = parseInt($('contribAmount').value, 10);
  handle(() => { const who = ajo.contribute(name, amount); log(`${who} contributed ${fmt(amount)} for cycle ${ajo.cycle}`); $('contribName').value = ''; });
});

$('payoutBtn').addEventListener('click', () => {
  handle(() => { const p = ajo.payout(); log(`💰 Paid out ${fmt(p.amount)} to ${p.recipient} (cycle ${p.cycle})`); });
});

render();
