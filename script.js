

// ══════════════════════════════════════════
// 본부/팀 통합 필터 헬퍼
// ══════════════════════════════════════════
/** ORG_STRUCTURE 기반 optgroup HTML 생성 */
function _buildOrgSelectHTML() {
  return ORG_STRUCTURE.map(o => {
    const teamOpts = (o.teams || []).map(t =>
      `<option value="${o.bonbu}/${t}">\u00a0\u00a0 ${t}</option>`
    ).join('');
    return `<optgroup label="${o.bonbu}">` +
      `<option value="${o.bonbu}">${o.bonbu} 전체</option>` +
      teamOpts +
      `</optgroup>`;
  }).join('');
}
/** "1본부" 또는 "1본부/1팀" 값을 { bonbu, team }으로 파싱 */
function _parseOrgFilter(val) {
  if (!val) return { bonbu: '', team: '' };
  const idx = val.indexOf('/');
  if (idx === -1) return { bonbu: val, team: '' };
  return { bonbu: val.slice(0, idx), team: val.slice(idx + 1) };
}

// ══════════════════════════════════════════
// 상품 목록 (중앙 관리)
// ══════════════════════════════════════════
const PRODUCT_LIST = ['MMS', 'LMS', '실시간 발송', 'DA', 'CPA', 'PUSH', '카톡MSG', '퍼미션콜'];

function _populateProductSelects() {
  const opts = PRODUCT_LIST.map(p => `<option value="${p}">${p}</option>`).join('');
  // 필터: 빈값 옵션 유지
  ['fProd', 'stl-fProd'].forEach(id => {
    const fEl = document.getElementById(id);
    if (fEl) fEl.innerHTML = '<option value="">상품</option>' + opts;
  });
  // 등록/수정/파이프라인: 선택 옵션 유지
  ['r_product', 'e_product', 'pm-product'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">선택</option>' + opts;
    if (cur) el.value = cur;
  });
}

// ══════════════════════════════════════════
// DATA
// ══════════════════════════════════════════
const DATA = [];
let _nextCampaignNum = 1;

// ══════════════════════════════════════════
// TAX INVOICE DATA
// ══════════════════════════════════════════
let TAX_DATA = [];

// ══════════════════════════════════════════
// PIPELINE DATA
// ══════════════════════════════════════════
let PIPELINE_DATA = [];
let _pendingPipelineConvertId = null;
let _pipelineShowArchived = false;
let _pipelineNextNum = 4;

// 파이프라인 예산/목표 통계 데이터 (단위: 원)
// months[0]=1월 ~ months[11]=12월, 각 {t:목표, a:현황}
// 현재 월 이전/해당 월: 목표+현황+달성률 표시 / 미래 월: 목표만 표시
const PIPELINE_BUDGET_DATA = {
  depts: [
    {
      name: '1본부',
      rows: [
        { stage:'Actual', months:[
          {t:1394217531,a:1394217531},{t:1284000000,a:474410000},{t:1280000000,a:null},
          {t:1582000000,a:null},{t:2152000000,a:null},{t:2065000000,a:null},
          {t:2327000000,a:null},{t:2540000000,a:null},{t:2313000000,a:null},
          {t:2571000000,a:null},{t:2570000000,a:null},{t:2957000000,a:null}
        ], total:25035217531 },
        { stage:'Commitment', months:[
          {t:null,a:null},{t:null,a:511320000},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null}
        ], total:null },
        { stage:'Potential', months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
        { stage:'Make-up',   months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
      ],
      sub: { months:[
        {t:null,a:1394217531},{t:null,a:985730000},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null}
      ], total:null }
    },
    {
      name: '2본부',
      rows: [
        { stage:'Actual', months:[
          {t:31500000,a:31500000},{t:300000000,a:47200000},{t:500000000,a:null},
          {t:600000000,a:null},{t:700000000,a:null},{t:800000000,a:null},
          {t:900000000,a:null},{t:1000000000,a:null},{t:1100000000,a:null},
          {t:1200000000,a:null},{t:1300000000,a:null},{t:1400000000,a:null}
        ], total:9831500000 },
        { stage:'Commitment', months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
        { stage:'Potential',  months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
        { stage:'Make-up', months:[
          {t:null,a:null},{t:null,a:5000000},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null}
        ], total:null },
      ],
      sub: { months:[
        {t:null,a:31500000},{t:null,a:52200000},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null}
      ], total:9831500000 }
    },
    {
      name: '3본부',
      rows: [
        { stage:'Actual', months:[
          {t:14924843,a:14924843},{t:25000000,a:0},{t:25000000,a:null},
          {t:30000000,a:null},{t:30000000,a:null},{t:30000000,a:null},
          {t:35000000,a:null},{t:35000000,a:null},{t:35000000,a:null},
          {t:40000000,a:null},{t:40000000,a:null},{t:40000000,a:null}
        ], total:379924843 },
        { stage:'Commitment', months:[
          {t:null,a:null},{t:null,a:17231089},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null},
          {t:null,a:null},{t:null,a:null},{t:null,a:null}
        ], total:null },
        { stage:'Potential', months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
        { stage:'Make-up',   months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
      ],
      sub: { months:[
        {t:null,a:14924843},{t:null,a:17231089},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null}
      ], total:379924843 }
    },
  ],
  grand: {
    name: '광고본부',
    rows: [
      { stage:'Actual', months:[
        {t:1440642374,a:1440642374},{t:1609000000,a:521610000},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null}
      ], total:null },
      { stage:'Committed', months:[
        {t:null,a:null},{t:null,a:528551089},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null}
      ], total:null },
      { stage:'Potential', months:Array.from({length:12},function(){return{t:null,a:null};}), total:null },
      { stage:'Make-up', months:[
        {t:null,a:null},{t:null,a:5000000},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null},
        {t:null,a:null},{t:null,a:null},{t:null,a:null}
      ], total:null },
    ],
    total: { months:[
      {t:null,a:1440642374},{t:null,a:1055161089},{t:325000000,a:null},
      {t:525000000,a:null},{t:630000000,a:null},{t:730000000,a:null},
      {t:830000000,a:null},{t:935000000,a:null},{t:1035000000,a:null},
      {t:1135000000,a:null},{t:1240000000,a:null},{t:1340000000,a:null}
    ], total:10211424843 }
  }
};

// ══════════════════════════════════════════
// USERS & AUTH
// ══════════════════════════════════════════
const USERS = [];
// 본부-팀 구조 (드롭다운용)
const ORG_STRUCTURE = [
  { bonbu:'1본부', teams:['1팀','2팀','3팀'] },
  { bonbu:'2본부', teams:['1팀'] },
  { bonbu:'3본부', teams:['1팀'] },
];
let currentUser = null;
let NOTIFICATIONS = [];
let _notifUnsub = null;

function hasPerm(perm) {
  if (!currentUser) return false;
  if (currentUser.isAdmin) return true;
  return !!(currentUser.perms && currentUser.perms[perm] === true);
}
function canEdit(c) {
  if (!currentUser) return false;
  if (currentUser.isAdmin) return true;
  if (currentUser.id === 'yoonhee') return true;
  if (c.regUser && c.regUser === currentUser.id) return true;
  // 등록자와 같은 팀 소속이면 수정 가능
  if (c.regUser && currentUser.bonbu && currentUser.dept) {
    const regUser = USERS.find(u => u.id === c.regUser);
    if (regUser && regUser.bonbu === currentUser.bonbu && regUser.dept === currentUser.dept) return true;
  }
  return false;
}
function checkAuth() {
  const saved = localStorage.getItem('cu');
  if (!saved) return false;
  try {
    const u = JSON.parse(saved);
    // 구버전 세션({id만 있는 형식}) 감지 → 재로그인 유도
    if (!u || !u.id || !u.name) { localStorage.removeItem('cu'); return false; }
    currentUser = u;
    return true;
  } catch(e) { return false; }
}
async function login() {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-err');
  // USERS 배열이 아직 로드 안 됐을 수 있으므로 Firebase에서 직접 조회
  let user = USERS.find(u => u.id === id && u.pw === pw);
  if (!user && window._db) {
    try {
      const doc = await window._db.collection('users').doc(id).get();
      if (doc.exists) { const u = doc.data(); if (u.pw === pw) user = u; }
    } catch(e) {}
  }
  if (!user) { if (errEl) errEl.style.display = ''; return; }
  if (errEl) errEl.style.display = 'none';
  currentUser = user;
  localStorage.setItem('cu', JSON.stringify(user));
  if (window._db) {
    window._db.collection('loginHistory').add({
      userId: user.id, name: user.name,
      dept: [user.bonbu, user.dept].filter(Boolean).join(' ') || '',
      loginAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }
  _updateUserUI();
  _fbWatchNotifications();
  // 로그인 전에 detail URL로 접근했던 경우 복원
  const afterHash = sessionStorage.getItem('_afterLoginHash');
  if (afterHash) {
    sessionStorage.removeItem('_afterLoginHash');
    const id = afterHash.split('/')[1];
    if (id) {
      const idx = DATA.findIndex(c => c.id === id);
      if (idx !== -1) { openDetail(idx); return; }
      window._pendingDetailId = id; // Firebase 로드 후 처리
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById('screen-detail').classList.add('active');
      document.querySelector('.topbar').style.display = 'none';
      return;
    }
  }
  goScreen('dashboard');
}
function logout() {
  if (_notifUnsub) { _notifUnsub(); _notifUnsub = null; }
  NOTIFICATIONS.length = 0;
  currentUser = null;
  localStorage.removeItem('cu');
  goScreen('login');
}
async function openLoginHistory() {
  if (!currentUser?.isAdmin) return;
  const el = document.getElementById('login-history-list');
  if (el) el.innerHTML = '<div style="padding:20px;color:var(--text3);text-align:center;">불러오는 중...</div>';
  openModal('modalLoginHistory');
  try {
    const snap = await window._db.collection('loginHistory').orderBy('loginAt', 'desc').limit(300).get();
    if (!el) return;
    if (snap.empty) { el.innerHTML = '<div style="padding:20px;color:var(--text3);text-align:center;">기록 없음</div>'; return; }
    el.innerHTML = snap.docs.map(d => {
      const r = d.data();
      const dt = r.loginAt?.toDate ? r.loginAt.toDate() : new Date(0);
      const pad = n => String(n).padStart(2, '0');
      const dtStr = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
      return `<div style="display:flex;gap:16px;padding:8px 16px;border-bottom:1px solid var(--border);font-size:13px;align-items:center;">
        <span style="color:var(--text3);min-width:150px;font-family:monospace;">${dtStr}</span>
        <span style="font-weight:600;min-width:56px;">${r.name}</span>
        <span style="color:var(--text3);font-size:12px;">${r.dept || ''}</span>
        <span style="margin-left:auto;color:var(--text3);font-size:12px;">로그인</span>
      </div>`;
    }).join('');
  } catch(e) {
    if (el) el.innerHTML = '<div style="padding:20px;color:var(--danger);">불러오기 실패</div>';
  }
}
function _updateUserUI() {
  if (!currentUser) return;
  const av = document.getElementById('sidebar-avatar');
  const nm = document.getElementById('sidebar-name');
  const tm = document.getElementById('sidebar-team');
  if (av) av.textContent = currentUser.name[0];
  if (nm) nm.textContent = currentUser.name;
  if (tm) tm.textContent = [currentUser.bonbu, currentUser.dept].filter(Boolean).join(' ') || '—';
  const regBtn = document.getElementById('btn-reg');
  if (regBtn) regBtn.style.display = hasPerm('ops') ? '' : 'none';
  const canManageUsers = currentUser.isAdmin || ['대표이사','이사','본부장'].includes(currentUser.rank);
  const navUsers = document.getElementById('nav-users');
  if (navUsers) navUsers.style.display = canManageUsers ? '' : 'none';
}
// ══════════════════════════════════════════
// AVATAR POPOVER & PASSWORD CHANGE
// ══════════════════════════════════════════

function toggleAvatarPopover(e) {
  e.stopPropagation();
  const pop = document.getElementById('avatar-popover');
  if (!pop) return;
  const isOpen = pop.style.display !== 'none';
  pop.style.display = isOpen ? 'none' : '';
  if (!isOpen && currentUser) {
    const lbl = document.getElementById('popover-id-label');
    if (lbl) lbl.textContent = `ID: ${currentUser.id}`;
  }
}

// 팝오버 외부 클릭 시 닫기
document.addEventListener('click', () => {
  const pop = document.getElementById('avatar-popover');
  if (pop) pop.style.display = 'none';
});

function openChangePwModal() {
  document.getElementById('avatar-popover').style.display = 'none';
  ['cpw-current','cpw-new','cpw-confirm'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const errEl = document.getElementById('cpw-error');
  if (errEl) errEl.style.display = 'none';
  openModal('modalChangePw');
}

function submitChangePw() {
  const current = document.getElementById('cpw-current').value;
  const next    = document.getElementById('cpw-new').value;
  const confirm = document.getElementById('cpw-confirm').value;
  const errEl   = document.getElementById('cpw-error');

  const showErr = (msg) => { errEl.textContent = msg; errEl.style.display = ''; };

  if (!current || !next || !confirm) return showErr('모든 항목을 입력해주세요.');
  if (currentUser.pw !== current)    return showErr('현재 비밀번호가 올바르지 않습니다.');
  if (next.length < 4)               return showErr('새 비밀번호는 4자 이상이어야 합니다.');
  if (next !== confirm)              return showErr('새 비밀번호가 일치하지 않습니다.');

  // ── DB 연동 시 아래 로컬 저장 대신 API 호출로 교체 ──
  // await _apiChangePassword(currentUser.id, current, next);
  _localChangePassword(currentUser.id, next);
}

function _localChangePassword(userId, newPw) {
  const u = USERS.find(x => x.id === userId);
  if (!u) return;
  u.pw = newPw;
  if (currentUser && currentUser.id === userId) currentUser.pw = newPw;
  _fbSaveUser(u);
  closeModal('modalChangePw');
  toast('✓ 비밀번호가 변경되었습니다', 'ok');
}

function openUserMgmt() {
  goScreen('users');
}
function _renderUserMgmtList() {
  const tb = document.getElementById('users-tbody');
  if (!tb) return;
  const list = USERS.filter(u => !u.isAdmin && u.id !== 'user').sort((a, b) => {
    if (a.id === 'wonjoon') return -1;
    if (b.id === 'wonjoon') return 1;
    const bonbuIdx = u => { const i = ORG_STRUCTURE.findIndex(o => o.bonbu === u.bonbu); return i < 0 ? 99 : i; };
    const deptIdx  = u => { const o = ORG_STRUCTURE.find(o => o.bonbu === u.bonbu); if (!o) return 99; const i = o.teams.indexOf(u.dept); return i < 0 ? 99 : i; };
    const RANK_ORDER = ['이사','본부장','팀장','일반'];
    const rankIdx = u => { const i = RANK_ORDER.indexOf(u.rank || '일반'); return i < 0 ? 99 : i; };
    return rankIdx(a) - rankIdx(b) || bonbuIdx(a) - bonbuIdx(b) || deptIdx(a) - deptIdx(b) || a.name.localeCompare(b.name, 'ko');
  });
  tb.innerHTML = list.map((u, i) => `
    <tr id="urow-${u.id}">
      <td class="td-dim">${i + 1}</td>
      <td><span style="font-size:11px;color:var(--text3);display:block;">${u.id}</span><span style="font-weight:500;">${u.name}</span></td>
      <td id="urank-cell-${u.id}"><span style="color:var(--text2);font-size:12px;">${u.rank || '일반'}</span></td>
      <td id="ubonbu-cell-${u.id}"><span style="color:var(--text2);font-size:12px;">${u.bonbu || '—'}</span></td>
      <td id="udept-cell-${u.id}"><span style="color:var(--text2);font-size:12px;">${u.dept || '—'}</span></td>
      <td style="white-space:nowrap;" id="uact-${u.id}">
        <button class="btn btn-outline btn-sm" onclick="enterUserEdit('${u.id}')">수정</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6" style="padding:32px;text-align:center;color:var(--text3);">등록된 사용자가 없습니다.</td></tr>';
}
function enterUserEdit(uid) {
  const u = USERS.find(x => x.id === uid);
  if (!u) return;
  // 본부 셀 → select
  const bonbuOpts = ['', ...ORG_STRUCTURE.map(o => o.bonbu)].map(b =>
    `<option value="${b}" ${u.bonbu === b ? 'selected' : ''}>${b || '—'}</option>`).join('');
  document.getElementById(`ubonbu-cell-${uid}`).innerHTML =
    `<select class="form-input" id="uedit-bonbu-${uid}" style="width:90px;" onchange="_syncDeptOpts('${uid}')">${bonbuOpts}</select>`;
  // 팀 셀 → select
  document.getElementById(`udept-cell-${uid}`).innerHTML =
    `<select class="form-input" id="uedit-dept-${uid}" style="width:70px;">${_deptOptsHtml(u.bonbu, u.dept)}</select>`;
  // 직급 셀 → select
  const rankOpts = ['이사','본부장','팀장','일반'].map(r =>
    `<option value="${r}" ${(u.rank||'일반') === r ? 'selected' : ''}>${r}</option>`).join('');
  document.getElementById(`urank-cell-${uid}`).innerHTML =
    `<select class="form-input" id="uedit-rank-${uid}" style="width:70px;">${rankOpts}</select>`;
  // 버튼 셀 교체
  document.getElementById(`uact-${uid}`).innerHTML =
    `<button class="btn btn-outline btn-sm" onclick="openResetPwModal('${uid}')">비밀번호 초기화</button>
     <button class="btn btn-primary btn-sm" style="margin-left:6px;" onclick="saveUserEdit('${uid}')">저장</button>`;
}
function _deptOptsHtml(bonbu, selectedDept) {
  const org = ORG_STRUCTURE.find(o => o.bonbu === bonbu);
  const teams = org ? org.teams : [];
  return ['', ...teams].map(t =>
    `<option value="${t}" ${selectedDept === t ? 'selected' : ''}>${t || '—'}</option>`).join('');
}
function _syncDeptOpts(uid) {
  const bonbu = document.getElementById(`uedit-bonbu-${uid}`)?.value || '';
  const deptSel = document.getElementById(`uedit-dept-${uid}`);
  if (deptSel) deptSel.innerHTML = _deptOptsHtml(bonbu, '');
}
function saveUserEdit(uid) {
  const u = USERS.find(x => x.id === uid);
  if (!u) return;
  u.bonbu = document.getElementById(`uedit-bonbu-${uid}`)?.value.trim() ?? u.bonbu;
  u.dept  = document.getElementById(`uedit-dept-${uid}`)?.value.trim() ?? u.dept;
  u.rank  = document.getElementById(`uedit-rank-${uid}`)?.value ?? u.rank;
  if (currentUser && currentUser.id === uid) { currentUser.bonbu = u.bonbu; currentUser.dept = u.dept; currentUser.rank = u.rank; _updateUserUI(); }
  _fbSaveUser(u);
  _renderUserMgmtList();
  toast('✓ 저장되었습니다', 'ok');
}
let _pendingResetUid = null;
function openResetPwModal(uid) {
  const u = USERS.find(x => x.id === uid);
  if (!u) return;
  _pendingResetUid = uid;
  document.getElementById('reset-pw-name').textContent = u.name;
  openModal('modalResetPw');
}
function confirmResetPw() {
  const u = USERS.find(x => x.id === _pendingResetUid);
  if (u) { u.pw = '1234'; _fbSaveUser(u); toast(`✓ ${u.name} 비밀번호가 1234로 초기화되었습니다`, 'ok'); }
  _pendingResetUid = null;
  closeModal('modalResetPw');
}
function togglePerm(uid, perm, val) {
  const u = USERS.find(x => x.id === uid);
  if (!u) return;
  u.perms[perm] = val;
  if (currentUser && currentUser.id === uid) { currentUser = u; _updateUserUI(); }
  _fbSaveUser(u);
}
function openUserRegModal() {
  ['ureg-name','ureg-id','ureg-pw'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // 본부/직급 select 초기화
  const bonbuSel = document.getElementById('ureg-bonbu');
  if (bonbuSel) { bonbuSel.value = ''; _syncRegDeptOpts(); }
  const rankSel = document.getElementById('ureg-rank');
  if (rankSel) rankSel.value = '일반';
  openModal('modalUserReg');
}
function _syncRegDeptOpts() {
  const bonbu = document.getElementById('ureg-bonbu')?.value || '';
  const deptSel = document.getElementById('ureg-dept');
  if (deptSel) deptSel.innerHTML = _deptOptsHtml(bonbu, '');
}
function submitUserReg() {
  const name  = document.getElementById('ureg-name').value.trim();
  const id    = document.getElementById('ureg-id').value.trim();
  const pw    = document.getElementById('ureg-pw').value;
  const bonbu = document.getElementById('ureg-bonbu')?.value.trim() || '';
  const dept  = document.getElementById('ureg-dept')?.value.trim() || '';
  const rank  = document.getElementById('ureg-rank')?.value || '일반';
  if (!name || !id || !pw) { toast('⚠ 이름, 아이디, 비밀번호는 필수입니다', 'warn'); return; }
  if (USERS.find(u => u.id === id)) { toast('⚠ 이미 사용 중인 아이디입니다', 'warn'); return; }
  const newUser = { id, pw, name, bonbu, dept, rank, isAdmin: false, perms: { ops: true } };
  USERS.push(newUser);
  _fbSaveUser(newUser);
  _renderUserMgmtList();
  closeModal('modalUserReg');
  toast(`✓ ${name} 사용자가 등록되었습니다`, 'ok');
}

let filtered = [...DATA];
let activeStatus = 'all';
let currentPage = 1;
let PAGE_SIZE = 10;
let pendingTestEl = null, pendingTestIdx = null;
let pendingSendEl = null, pendingSendIdx = null;
let currentDetailIdx = null;
let _detailFromScreen = 'campaigns'; // 상세보기 진입 전 화면 (back-btn 귀환 대상)

// ══════════════════════════════════════════
// HISTORY (수정 이력)
//   - openHistory() 의 entries 조회 → GET /api/history?campaignId=xxx 로 교체
// ══════════════════════════════════════════

// 이력 저장소: { campaignId(string): Entry[] }
const HISTORY = {};

// 필드 한글 레이블 매핑 (DB 연동 시에도 그대로 사용)
const FIELD_LABELS = {
  name:'광고내용',
  cat:'카테고리', date:'발송일시', media:'매체사',
  product:'상품', contract:'계약주체', adv:'광고주', agency:'대행사',
  ops:'담당자', dept:'부서', status:'단계',
  qty:'발송예약수량', svc:'서비스물량', unit:'단가', disc:'할인금액',
  comm:'수수료율', agrate:'대행료율', target:'타겟조건', dtarget:'디타겟조건', msg:'발송문구',
  note:'특기사항', testOk:'테스트수신', sent:'성과입력대기',
  actual:'실발송수량', clicks:'클릭수', ctr:'클릭률', db:'DB등록수', dbr:'DB등록률',
  invoiceOut:'매출계산서발행', payIn:'입금', invoiceIn:'매입계산서발행', payOut:'지급',
};

function _nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/**
 * 수정 이력 기록
 * DB 연동 시: 함수 본문을 아래처럼 교체
 *   await fetch('/api/history', { method:'POST', body: JSON.stringify({campaignId,who,when,type,field,before,after}) })
 *
 * @param {string}      campaignId  캠페인 ID (DB: foreign key)
 * @param {string}      type        이벤트 유형 register|field|check|perf
 * @param {string|null} field       변경 필드 키 (FIELD_LABELS 키)
 * @param {string|null} before      변경 전 값
 * @param {string|null} after       변경 후 값
 */
function _log(campaignId, type, field, before, after) {
  const entry = {
    id:         `${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    campaignId,
    who:        currentUser ? currentUser.name : '—',
    when:       _nowStr(),
    type,
    field:      field  ?? null,
    before:     before != null ? String(before) : null,
    after:      after  != null ? String(after)  : null,
  };
  if (!HISTORY[campaignId]) HISTORY[campaignId] = [];
  HISTORY[campaignId].unshift(entry);
  _fbSaveHistory(entry);
}

async function _fbSaveHistory(entry) {
  if (!window._db) return;
  try {
    await window._db.collection('history').doc(entry.id).set(entry);
  } catch(e) { console.error('[FB] 이력 저장 실패:', e); }
}

async function _fbLoadHistory(campaignId) {
  if (!window._db) return [];
  try {
    const snap = await window._db.collection('history')
      .where('campaignId', '==', campaignId)
      .get();
    return snap.docs.map(d => d.data()).sort((a, b) => b.id.localeCompare(a.id));
  } catch(e) {
    console.error('[FB] 이력 로드 실패:', e);
    return [];
  }
}

/**
 * 이력 모달 열기
 * DB 연동 시: entries = await fetch(`/api/history?campaignId=${c.id}`).then(r=>r.json())
 */
async function openHistory() {
  const c = DATA[currentDetailIdx];
  if (!c) return;

  document.getElementById('histTitle').textContent = _cName(c);
  const regDateEl = document.getElementById('histRegDate');
  const regDateVal = document.getElementById('histRegDateVal');
  const regUserVal = document.getElementById('histRegUserVal');
  if (regDateEl && regDateVal && c.regDate) {
    regDateVal.textContent = c.regDate;
    if (regUserVal) {
      const u = USERS.find(u => u.id === c.regUser);
      regUserVal.textContent = u ? u.name : (c.regUser || '—');
    }
    regDateEl.style.display = '';
  } else if (regDateEl) {
    regDateEl.style.display = 'none';
  }
  const container = document.getElementById('histList');
  container.innerHTML = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:32px 0;">불러오는 중...</div>';
  openModal('modalHistory');

  const fbEntries = await _fbLoadHistory(c.id);
  if (fbEntries.length > 0) {
    HISTORY[c.id] = fbEntries;
  }
  const entries = HISTORY[c.id] || [];

  if (entries.length === 0) {
    container.innerHTML = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:32px 0;">수정 이력이 없습니다.</div>';
    return;
  }

  // 날짜별 그룹핑
  const groups = {};
  const dateOrder = [];
  entries.forEach(e => {
    const datePart = e.when.split(' ')[0];
    if (!groups[datePart]) { groups[datePart] = []; dateOrder.push(datePart); }
    groups[datePart].push(e);
  });

  container.innerHTML = dateOrder.map(date => {
    const d   = new Date(date);
    const dow = ['일','월','화','수','목','금','토'][d.getDay()];

    // 시간+사용자 기준으로 재그룹핑
    const subGroups = [];
    const subKeyOrder = [];
    const subGroupMap = {};
    groups[date].forEach(e => {
      const timePart = (e.when.split(' ')[1] || '').slice(0, 5); // HH:MM
      const key = timePart + '||' + e.who;
      if (!subGroupMap[key]) { subGroupMap[key] = { time: timePart, who: e.who, entries: [] }; subKeyOrder.push(key); }
      subGroupMap[key].entries.push(e);
    });

    const rowsHtml = subKeyOrder.map(key => {
      const sg = subGroupMap[key];
      const changesHtml = sg.entries.map(e => {
        if (e.type === 'register') {
          return `<div class="hist-change"><span class="hist-tag-register">캠페인 등록</span></div>`;
        }
        const label = FIELD_LABELS[e.field] || e.field || '';
        const bStr  = (e.before != null && e.before !== '') ? e.before : '미입력';
        const aStr  = (e.after  != null && e.after  !== '') ? e.after  : '미입력';
        return `<div class="hist-change">`
          + `<span class="hist-field">${_escHtml(label)}</span>`
          + `<span class="hist-before">${_escHtml(bStr)}</span>`
          + `<span class="hist-arrow">›</span>`
          + `<span class="hist-after">${_escHtml(aStr)}</span>`
          + `</div>`;
      }).join('');

      return `<div class="hist-entry">
        <div class="hist-dot"></div>
        <div class="hist-body">
          <div class="hist-meta"><span class="hist-time">${sg.time}</span><span class="hist-who">${_escHtml(sg.who)}</span></div>
          ${changesHtml}
        </div>
      </div>`;
    }).join('');

    return `<div class="hist-group">
      <div class="hist-date-chip">${date} (${dow})</div>
      <div class="hist-group-body">${rowsHtml}</div>
    </div>`;
  }).join('');
}

function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ══════════════════════════════════════════
// SCREEN ROUTING
// ══════════════════════════════════════════
function toggleCalFilter() {
  const hdr = document.querySelector('.cal-header');
  if (!hdr) return;
  const open = hdr.classList.toggle('filter-open');
  const btn  = document.getElementById('cal-filter-toggle');
  if (btn) btn.textContent = open ? '🔍 필터 ▲' : '🔍 필터';
}

function toggleCampaignFilter() {
  const bar = document.getElementById('campaigns-filter-bar');
  if (!bar) return;
  const open = bar.classList.toggle('filter-open');
  const btn  = document.getElementById('mob-filter-toggle');
  if (btn) btn.textContent = open ? '필터 ▲' : '필터 ▼';
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

function goScreen(name, skipPush) {
  // 현재 화면이 campaigns/settlement이면 필터 상태 저장 (뒤로가기 복원용)
  const _curScreen = (window.location.hash || '').replace('#', '').split('/')[0];
  if (['campaigns', 'settlement', 'tax'].includes(_curScreen)) {
    _saveFilterState(_curScreen);
  }
  closeSidebar();
  document.querySelector('.topbar').style.display = '';
  // update URL hash so refresh keeps same screen
  if (!skipPush) {
    try { window.location.hash = name; } catch (e) {}
  }

  // 로그인 오버레이 처리
  const loginEl = document.getElementById('screen-login');
  if (name === 'login') { if (loginEl) loginEl.style.display = 'flex'; return; }
  if (loginEl) loginEl.style.display = 'none';


  // hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  if (name !== 'settlement') {
    const fs = document.getElementById('stl-fake-scroll');
    if (fs) fs.style.display = 'none';
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  const contentEl = document.querySelector('.content');
  if (contentEl) contentEl.scrollTop = 0;

  // nav highlight
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navIds = {dashboard:'nav-dashboard',calendar:'nav-calendar',campaigns:'nav-campaigns',settlement:'nav-settlement',monthly:'nav-monthly',tax:'nav-tax',pipeline:'nav-pipeline',adreport:'nav-adreport',media:'nav-media','media-detail':'nav-media',seller:'nav-seller',users:'nav-users',payment:'nav-payment','payment-detail':'nav-payment'};
  if (navIds[name]) document.getElementById(navIds[name])?.classList.add('active');

  // breadcrumb
  const labels = {dashboard:'대시보드',calendar:'캘린더',campaigns:'캠페인 목록',settlement:'정산',monthly:'월별 발송량',tax:'세금계산서',pipeline:'영업 리포트',adreport:'광고주 리포트',media:'매체 관리','media-detail':'매체 상세',seller:'매출처 관리',users:'사용자 관리',payment:'월별 지급내역','payment-detail':'월별 지급내역 상세'};
  if (labels[name]) {
    document.getElementById('breadcrumb').innerHTML = `<span class="cur">${labels[name]}</span>`;
  }

  // screen-specific init
  if (name === 'calendar') {
    calView = 'month';
    calProductTab = localStorage.getItem('calProductTab') || 'sms';
    document.querySelectorAll('#screen-calendar .view-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('vt-month').classList.add('active');
    document.getElementById('cpt-sms').classList.toggle('active', calProductTab === 'sms');
    document.getElementById('cpt-da').classList.toggle('active',  calProductTab === 'da');
    if (!skipPush) resetCalFilters();
    else renderCalendar();
  }
  if (name === 'campaigns') {
    if (skipPush) {
      _restoreFilterState('campaigns');
    } else {
      resetFilter();
      _populateAdvFilter();
    }
  }
  // 캠페인 등록 버튼: 대시보드·캘린더·캠페인 목록에서만 표시
  const btnReg = document.getElementById('btn-reg');
  if (btnReg) btnReg.style.display = ['dashboard','calendar','campaigns'].includes(name) ? '' : 'none';

  if (name === 'dashboard') renderDashboard();
  if (name === 'pipeline') initPipelineScreen();
  if (name === 'adreport') {
    if (!skipPush) { rptReset(); effReset(); }
    if (typeof initAdReport === 'function') initAdReport();
  }
  if (name === 'monthly') {
    if (!skipPush) {
      const now = new Date();
      const yEl = document.getElementById('mly-year');
      const mEl = document.getElementById('mly-month');
      if (yEl) yEl.value = String(now.getFullYear());
      if (mEl) mEl.value = String(now.getMonth() + 1).padStart(2, '0');
    }
    renderMonthly();
  }
  if (name === 'media') {
    if (!skipPush) resetMediaSearch();
    else renderMediaList();
  }
  if (name === 'seller') {
    if (!skipPush) resetSellerSearch();
    switchSellerTab(_sellerTab || 'adv');
  }
  if (name === 'users')  { _renderUserMgmtList(); }
  if (name === 'payment') {
    const yEl = document.getElementById('pay-year');
    const mEl = document.getElementById('pay-month');
    if (!skipPush && yEl) {
      const now = new Date();
      yEl.value = String(now.getFullYear());
      mEl.value = String(now.getMonth()+1).padStart(2,'0');
    } else if (yEl && !yEl.dataset.init) {
      const now = new Date();
      yEl.value = String(now.getFullYear());
      mEl.value = String(now.getMonth()+1).padStart(2,'0');
      yEl.dataset.init = '1';
    }
    renderPaymentList();
  }
  if (name === 'settlement') {
    if (skipPush) {
      _restoreFilterState('settlement');
    } else {
      resetStlFilter();
    }
  }
  if (name === 'tax') {
    if (skipPush) {
      _restoreFilterState('tax');
    } else {
      resetTaxFilter();
    }
  }

  if (!skipPush) {
    history.pushState({ screen: name }, '', '#' + name);
  }
}

function openDetail(idx, skipPush) {
  document.querySelector('.topbar').style.display = 'none';
  // skipPush=true는 상세화면 내부 갱신(수정저장·성과저장)이므로 이전 화면 유지
  if (!skipPush) {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id !== 'screen-detail' && activeScreen.id !== 'screen-edit') {
      _detailFromScreen = activeScreen.id.replace('screen-', '');
      // 뒤로가기 시 필터 복원을 위해 현재 필터 상태 저장
      if (['campaigns', 'settlement', 'tax'].includes(_detailFromScreen)) {
        _saveFilterState(_detailFromScreen);
      }
    }
  }
  currentDetailIdx = idx;
  const c = DATA[idx];

  // 권한별 버튼 표시
  const btnEdit = document.getElementById('btn-detail-edit');
  const btnCopy = document.getElementById('btn-detail-copy');
  const btnDel  = document.getElementById('btn-detail-del');
  const btnTgt  = document.getElementById('btn-edit-target');
  const btnNote = document.getElementById('btn-edit-note');
  const btn2nd  = document.getElementById('btn-2nd');
  if (btnEdit) btnEdit.style.display = canEdit(c) ? '' : 'none';
  if (btnCopy) btnCopy.style.display = hasPerm('ops') ? '' : 'none';
  const _superDel = currentUser && ['wonjoon','sukjoo'].includes(currentUser.id);
  const showDel = (_superDel || canEdit(c)) ? '' : 'none';
  if (btnDel)  btnDel.style.display  = showDel;
  if (btnTgt)  btnTgt.style.display  = canEdit(c) ? '' : 'none';
  if (btnNote) btnNote.style.display = canEdit(c) ? '' : 'none';
  const can2nd = c.product !== '퍼미션콜' && hasPerm('ops') && (c.status === '성과입력대기' || c.status === '성과입력완료');
  if (btn2nd) {
    btn2nd.style.display = hasPerm('ops') ? '' : 'none';
    btn2nd.disabled = !can2nd;
  }
  const wrap2nd = document.getElementById('btn-2nd-wrap');
  if (wrap2nd) {
    if (can2nd) wrap2nd.removeAttribute('data-tooltip');
    else wrap2nd.setAttribute('data-tooltip', '성과입력대기 단계에서 성과 입력이 가능합니다.');
  }
  // 진행체크 클릭 가능 여부
  ['detailChkTest','detailChkSend'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.pointerEvents = hasPerm('ops') ? '' : 'none';
  });
  document.getElementById('dId').textContent = c.id;
  document.getElementById('dName').textContent = _cName(c);
  document.getElementById('dCat').textContent = _getCat(c);
  const dDateLbl = document.getElementById('dDateLbl');
  if (dDateLbl) dDateLbl.textContent = c.product === 'DA' ? '노출기간' : '발송일시';
  document.getElementById('dDate').textContent = _formatDateRange(c);
  document.getElementById('dCampaign').textContent = _cName(c);
  document.getElementById('dPromo').textContent = c.promo || '—';
  document.getElementById('dMedia').textContent = c.media;
  document.getElementById('dProduct').textContent = c.product;
  const dSellerEl = document.getElementById('dSeller');
  if (dSellerEl) {
    const contractLabel = c.contract ? `<span style="font-size:11px;color:var(--text3);background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;margin-left:6px;">${c.contract}</span>` : '';
    dSellerEl.innerHTML = _escHtml(c.seller || c.adv || '—') + contractLabel;
  }
  document.getElementById('dContent').textContent = c.content || '—';
  document.getElementById('dOps').textContent = c.ops || '—';
  document.getElementById('delName').textContent = _cName(c);

  // 수량/금액 동적 계산
  const qty = c.qty||0, svc = c.svc||0, unit = c.sellUnit||0, buyUnit = c.buyUnit||0, disc = c.disc||0, comm = c.comm||0, agrate = c.agrate||0;
  const actual = c.actual||0;
  const isCPADetail = c.product === 'CPA';
  const sellBillBase = c.sellBillBase || c.billBase || 'actual';
  const buyBillBase  = c.buyBillBase  || c.billBase || 'actual';
  const _billQty = (base) => base === 'sched' ? (qty - svc) : (actual ? (actual - svc) : (qty - svc));
  const _baseLbl = (base) => base === 'sched' ? '예약수량 기준' : '실발송수량 기준';
  // CPA: DB등록수(c.db||c.qty) 기준, 일반: actual 기준
  const cpaBillQty = c.db || c.qty || 0;
  const adcBill  = isCPADetail ? cpaBillQty : _billQty(sellBillBase);
  const buyBill  = isCPADetail ? cpaBillQty : _billQty(buyBillBase);
  const bill     = isCPADetail ? (cpaBillQty || null) : (actual ? actual - svc : null);
  const eu      = disc > 0 ? disc : unit;           // 실적용단가 (할인단가 입력 시 우선)
  const adcCalc  = adcBill * unit;
  const adc      = c.adcostFixed  || adcCalc;       // 광고비 (수동 고정값 우선)
  const real     = c.amtFixed     || (adcBill * eu);// 실청구
  const buyAmt   = c.buyAmtFixed  || (buyBill * buyUnit);
  // CPA: buyUnit/buyAmtFixed 있으면 실제 매입액 기준, 없으면 comm% 기준
  const revCalc  = c.product === 'CPA'
    ? ((c.buyUnit || c.buyAmtFixed) ? (adc - buyAmt) : Math.round(real * comm / 100))
    : real - buyAmt;                                // 일반: 실청구 기준 매출수익
  const rev      = c.revFixed     || revCalc;       // 매출수익
  const agf      = Math.round(real * (agrate / 100));
  const prf      = c.profitFixed  || (rev - agf);   // 이익
  document.getElementById('dQty').textContent       = qty    ? qty.toLocaleString()    + ' 건' : '—';
  document.getElementById('dSvc').textContent       = svc    ? svc.toLocaleString()    + ' 건' : '—';
  const billEl = document.getElementById('dBill');
  if (billEl) {
    if (bill != null) { billEl.className = 'f-val'; billEl.style.color = 'var(--green)'; billEl.style.fontWeight = '700'; billEl.textContent = bill.toLocaleString() + ' 건'; }
    else { billEl.className = 'f-val f-pending'; billEl.style.color = ''; billEl.style.fontWeight = ''; billEl.textContent = '— 실발송 입력 후 계산'; }
  }
  // dBillBase 제거됨 — sellBillBase/buyBillBase 레이블로 대체 (_baseLbl은 위에서 정의)
  document.getElementById('dSellUnit').textContent  = unit    ? unit.toLocaleString()    + '원'  : '—';
  document.getElementById('dBuyUnit').textContent   = buyUnit ? buyUnit.toLocaleString() + '원'  : '—';
  const dBuyAmtEl = document.getElementById('dBuyAmt');
  if (dBuyAmtEl) dBuyAmtEl.textContent = buyAmt ? buyAmt.toLocaleString() + '원' : '—';
  const dBuyLbl = document.getElementById('dBuyBillBaseLbl');
  if (dBuyLbl) dBuyLbl.textContent = _baseLbl(buyBillBase);
  const dSellLbl = document.getElementById('dSellBillBaseLbl');
  if (dSellLbl) dSellLbl.textContent = _baseLbl(sellBillBase);
  document.getElementById('dAdcost').textContent = adc  ? adc.toLocaleString()  + '원' : '—';
  document.getElementById('dDisc').textContent   = disc ? disc.toLocaleString() + '원' : '—';
  document.getElementById('dAmt').textContent    = adc  ? real.toLocaleString() + '원' : '—';
  document.getElementById('dComm').textContent   = comm ? comm + '%'            : '—';
  document.getElementById('dRev').textContent    = rev  ? rev.toLocaleString()  + '원'  : '—';
  document.getElementById('dAgrateLbl').textContent = `– 대행료 (${agrate}%)`;
  document.getElementById('dAgfee').textContent  = agf  ? agf.toLocaleString()  + '원'  : '—';
  document.getElementById('dProfit').textContent = prf  ? prf.toLocaleString()  + '원'  : '—';

  // 타겟 & 문구
  const targetEl = document.getElementById('dTarget');
  const tags = (c.target||'').split('\n').map(t=>t.trim()).filter(Boolean);
  targetEl.innerHTML = tags.length ? tags.map(t=>`<span class="tag">${t}</span>`).join('') : '<span style="color:var(--text3);font-size:12px;">—</span>';
  const dtargetEl = document.getElementById('dDtarget');
  if (dtargetEl) { const dtags = (c.dtarget||'').split('\n').map(t=>t.trim()).filter(Boolean); dtargetEl.innerHTML = dtags.length ? dtags.map(t=>`<span class="tag">${t}</span>`).join('') : '<span style="color:var(--text3);font-size:12px;">—</span>'; }
  const dMsgSection = document.getElementById('dMsgSection');
  if (dMsgSection) dMsgSection.style.display = isCPADetail ? 'none' : '';
  document.getElementById('dMsg').innerHTML      = _linkify(c.msg || '');
  document.getElementById('dMsgFinal').innerHTML = c.msgFinal ? _linkify(c.msgFinal) : '<span style="color:var(--text3);font-size:12px;">아직 검수완료된 문구가 없습니다.</span>';
  // 탭 초기화 — 항상 검수전 탭으로 시작
  msgTabSwitch('draft');

  // 특기사항
  document.getElementById('dNote').innerHTML = (c.note||'').replace(/\n/g,'<br>') || '<span style="color:var(--text3);">—</span>';

  // step track
  const steps = ['부킹확정','테스트완료','성과입력대기','성과입력완료'];
  const ci = steps.indexOf(c.status);
  document.querySelectorAll('#stepTrack .step').forEach((el,i) => {
    el.className = 'step';
    if (i < ci) el.classList.add('done');
    else if (i === ci) el.classList.add('current');
  });

  // 진행체크 동기화
  _syncDetailChks();

  // 실발송수량 (2차입력 여부)
  const actualEl = document.getElementById('dActual');
  if (actualEl) {
    if (c.actual) {
      actualEl.className = 'f-val'; actualEl.style.color='var(--green)';
      actualEl.textContent = c.actual.toLocaleString() + ' 건';
    } else {
      actualEl.className = 'f-val f-pending'; actualEl.style.color='';
      actualEl.textContent = '— 2차 입력 대기';
    }
  }

  // DA 캠페인이 '부킹확정' 상태면 자동으로 '성과입력대기'로 전환
  const isDAcamp  = c.product === 'DA';
  const isPCcamp  = c.product === '퍼미션콜';
  const isCPAcamp = c.product === 'CPA';
  if (isDAcamp && c.status === '부킹확정') {
    c.status = '성과입력대기';
    _fbSaveCampaign(c);
  }

  // 성과 카드: PC는 숨김
  const dCardPerf = document.getElementById('dCardPerf');
  if (dCardPerf) dCardPerf.style.display = isPCcamp ? 'none' : '';
  // perfStatus 2차 입력 현황 반영
  document.getElementById('perfStatus').style.display   = (isDAcamp || isPCcamp) ? 'none' : '';
  document.getElementById('perfStatusDA').style.display = isDAcamp ? '' : 'none';

  // DA / PC / CPA / 일반 카드 토글
  document.getElementById('dCardQty').style.display    = (isDAcamp || isPCcamp) ? 'none' : '';
  document.getElementById('dGridBottom').style.display = (isDAcamp || isPCcamp) ? 'none' : '';
  document.getElementById('dSectionDA').style.display  = isDAcamp ? 'flex' : 'none';
  const dCardPC = document.getElementById('dCardPC');
  if (dCardPC) dCardPC.style.display = isPCcamp ? 'flex' : 'none';

  // CPA: 수량 카드 레이블 동적 변경 + 발송예약/서비스수량 행 숨김
  const dFieldQtySvc = document.getElementById('dFieldQtySvc');
  if (isCPAcamp) {
    const qtyLbl = document.querySelector('#dCardQty .card-title');
    if (qtyLbl) qtyLbl.textContent = '정산 / 금액';
    if (dFieldQtySvc) dFieldQtySvc.style.display = 'none'; // 발송예약/서비스수량 행 숨김
    // CPA: 노출수(dFieldActual) 행 숨김
    const dFieldActual = document.getElementById('dFieldActual');
    if (dFieldActual) dFieldActual.style.display = 'none';
    // CPA: dBill = DB등록수, 미입력 시 '2차 입력 대기'
    const dBillEl = document.getElementById('dBill');
    if (dBillEl) {
      if (cpaBillQty) {
        dBillEl.className = 'f-val f-mono'; dBillEl.style.color = 'var(--green)'; dBillEl.style.fontWeight = '700';
        dBillEl.textContent = cpaBillQty.toLocaleString() + ' 건';
      } else {
        dBillEl.className = 'f-val f-pending'; dBillEl.style.color = ''; dBillEl.style.fontWeight = '';
        dBillEl.textContent = '— 2차 입력 대기';
      }
    }
    // CPA: 기준 레이블 → DB등록수 기준
    const dSellLbl2 = document.getElementById('dSellBillBaseLbl');
    if (dSellLbl2) dSellLbl2.textContent = 'DB등록수 기준';
    const dBuyLbl2 = document.getElementById('dBuyBillBaseLbl');
    if (dBuyLbl2) dBuyLbl2.textContent = 'DB등록수 기준';
    const cpaBillBaseEl = document.getElementById('dCpaBillBase');
    if (cpaBillBaseEl) cpaBillBaseEl.textContent = c.billBase || '—';
    const cpaBillBaseField = document.getElementById('dCpaBillBaseField');
    if (cpaBillBaseField) cpaBillBaseField.style.display = '';
    const cpaFeeEl = document.getElementById('dCpaFeeYn');
    if (cpaFeeEl) cpaFeeEl.textContent = c.cpaFeeYn || '—';
    const cpaFeeField = document.getElementById('dCpaFeeYnField');
    if (cpaFeeField) cpaFeeField.style.display = '';
    // CPA: '실발송수량' → '노출수'
    const _setActualLbl = (t) => {
      const a = document.getElementById('dActualLbl');    if (a) a.textContent = t;
      const b = document.getElementById('perfActualLbl'); if (b) b.textContent = t;
      const c = document.querySelector('#ep_normal .fg:first-child .form-label'); if (c) c.textContent = t;
      const h = document.querySelector('#ep_ctr ~ .form-hint');
      if (h) h.textContent = t === '노출수' ? '클릭수 ÷ 노출수 × 100' : '클릭수 ÷ 실발송 × 100';
    };
    _setActualLbl('노출수');
  } else {
    const qtyLbl = document.querySelector('#dCardQty .card-title');
    if (qtyLbl) qtyLbl.textContent = '수량 / 금액';
    if (dFieldQtySvc) dFieldQtySvc.style.display = '';
    const dFieldActual = document.getElementById('dFieldActual');
    if (dFieldActual) dFieldActual.style.display = '';
    const cpaFeeField = document.getElementById('dCpaFeeYnField');
    if (cpaFeeField) cpaFeeField.style.display = 'none';
    const cpaBillBaseField2 = document.getElementById('dCpaBillBaseField');
    if (cpaBillBaseField2) cpaBillBaseField2.style.display = 'none';
    // 비CPA: 원래 라벨 복원
    const _setActualLbl = (t) => {
      const a = document.getElementById('dActualLbl');    if (a) a.textContent = t;
      const b = document.getElementById('perfActualLbl'); if (b) b.textContent = t;
      const c = document.querySelector('#ep_normal .fg:first-child .form-label'); if (c) c.textContent = t;
      const h = document.querySelector('#ep_ctr ~ .form-hint');
      if (h) h.textContent = t === '노출수' ? '클릭수 ÷ 노출수 × 100' : '클릭수 ÷ 실발송 × 100';
    };
    _setActualLbl('실발송수량');
  }

  if (isDAcamp) {
    const daAdc    = c.daAdcost || 0;
    const daComm   = c.comm     || 0;
    const daAgrate = c.agrate   || 0;
    const daBuyU   = c.buyUnit  || Math.round(daAdc * (1 - daComm / 100));
    const daRev    = Math.round(daAdc * daComm / 100);
    const daAgf    = Math.round(daAdc * daAgrate / 100);
    const daPrf    = daRev - daAgf;
    const setText  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('dDaAdcostShow', daAdc   ? daAdc.toLocaleString()  + '원' : '—');
    setText('dDaBillBase',   c.daBillBase || '—');
    setText('dDaFeeYn',      c.daFeeYn    || '—');
    setText('dDaComm',       daComm  ? daComm + '%'            : '—');
    setText('dDaBuyUnit',    daBuyU  ? daBuyU.toLocaleString() + '원' : '—');
    setText('dDaRev',        daRev   ? daRev.toLocaleString()  + '원' : '—');
    setText('dDaProfit',     daAdc   ? daPrf.toLocaleString()  + '원' : '—');
    const agLbl = document.getElementById('dDaAgratelbl');
    if (agLbl) agLbl.textContent = `– 대행료 (${daAgrate}%)`;
    setText('dDaAgfee',      daAgf   ? daAgf.toLocaleString()  + '원' : '—');
    // 타겟 조건
    const daTargetEl = document.getElementById('dDaTarget');
    const daTags = (c.target||'').split('\n').map(t=>t.trim()).filter(Boolean);
    daTargetEl.innerHTML = daTags.length ? daTags.map(t=>`<span class="tag">${t}</span>`).join('') : '<span style="color:var(--text3);font-size:12px;">—</span>';
    const daDtargetEl = document.getElementById('dDaDtarget');
    if (daDtargetEl) { const daDtags = (c.dtarget||'').split('\n').map(t=>t.trim()).filter(Boolean); daDtargetEl.innerHTML = daDtags.length ? daDtags.map(t=>`<span class="tag">${t}</span>`).join('') : '<span style="color:var(--text3);font-size:12px;">—</span>'; }
    // 소재 이미지 (구버전 string · 신버전 array 호환)
    const daImgWrap = document.getElementById('dDaImgWrap');
    const daImgNone = document.getElementById('dDaImgNone');
    const daImgs = Array.isArray(c.daImage) ? c.daImage : (c.daImage ? [c.daImage] : []);
    if (daImgWrap) {
      daImgWrap.innerHTML = '';
      daImgs.forEach(b64 => {
        const img = document.createElement('img');
        img.src = b64;
        img.style.cssText = 'max-width:300px;width:100%;height:auto;border-radius:6px;border:1px solid var(--border);cursor:zoom-in;';
        img.title = '클릭하면 원본 크기로 열립니다';
        img.onclick = () => openImgNewTab(b64);
        daImgWrap.appendChild(img);
      });
    }
    if (daImgNone) daImgNone.style.display = daImgs.length ? 'none' : '';
    // 특기사항
    document.getElementById('dDaNote').innerHTML = (c.note||'').replace(/\n/g,'<br>') || '<span style="color:var(--text3);">—</span>';
  }

  if (isDAcamp) {
    const adcost = c.daAdcost || 0;
    const imp    = c.daImp   ?? null;
    const click  = c.daClick ?? null;
    const conv   = c.daConv  ?? null;
    const rev    = c.daRev   ?? null;
    const ctr    = (imp && click)   ? (click / imp * 100).toFixed(2) + '%'                   : null;
    const cpa    = (conv && adcost) ? Math.round(adcost / conv).toLocaleString() + '원'       : null;
    const roas   = (adcost && rev)  ? Math.round(rev / adcost * 100).toLocaleString() + '%'  : null;
    const daFields = [
      { id:'dDaImp',   val: imp,   fmt: v => Number(v).toLocaleString()+'건', auto: false },
      { id:'dDaClick', val: click, fmt: v => Number(v).toLocaleString()+'건', auto: false },
      { id:'dDaConv',  val: conv,  fmt: v => Number(v).toLocaleString()+'건', auto: false },
      { id:'dDaRev',   val: rev,   fmt: v => Number(v).toLocaleString()+'원', auto: false },
      { id:'dDaCtr',   val: ctr,   fmt: v => v,                               auto: true  },
      { id:'dDaCpa',   val: cpa,   fmt: v => v,                               auto: true  },
      { id:'dDaRoas',  val: roas,  fmt: v => v,                               auto: true  },
    ];
    daFields.forEach(f => {
      const el  = document.getElementById(f.id);
      const dot = el?.closest('.ist-item')?.querySelector('.s-dot');
      if (!el) return;
      if (f.val != null) {
        if (dot) dot.className = 's-dot dot-ok';
        el.classList.remove('f-pending'); el.style.color = 'var(--green)';
        el.textContent = f.fmt(f.val);
      } else {
        if (dot) dot.className = 's-dot dot-pend';
        el.classList.add('f-pending'); el.style.color = '';
        el.textContent = f.auto ? '자동계산' : '미입력';
      }
    });
  } else {
    const perfItems = document.querySelectorAll('#perfStatus .ist-item');
    const perfData = [
      { val: c.actual, fmt: v => Number(v).toLocaleString() + '건', auto: false },
      { val: c.clicks, fmt: v => Number(v).toLocaleString() + '건', auto: false },
      { val: c.ctr,    fmt: v => parseFloat(v).toFixed(2) + '%',    auto: true  },
      { val: c.db,     fmt: v => Number(v).toLocaleString() + '건', auto: false },
      { val: c.dbr,    fmt: v => parseFloat(v).toFixed(2) + '%',    auto: true  },
    ];
    perfItems.forEach((el, i) => {
      const dot = el.querySelector('.s-dot');
      const valEl = el.querySelector('.s-val');
      if (!dot || !valEl) return;
      const pd = perfData[i];
      if (pd.val != null && pd.val !== '') {
        dot.className = 's-dot dot-ok';
        valEl.classList.remove('f-pending'); valEl.style.color = 'var(--green)';
        valEl.textContent = pd.fmt(pd.val);
      } else {
        dot.className = 's-dot dot-pend';
        valEl.classList.add('f-pending'); valEl.style.color = '';
        valEl.textContent = pd.auto ? '자동계산' : '미입력';
      }
    });
  }

  // 퍼미션콜 성과 데이터 렌더링
  if (isPCcamp) {
    const inflow  = c.pcInflow  || 0;
    const agree   = c.pcAgree   || 0;
    const advU    = c.pcAdvUnit || 0;
    const adc     = agree * advU;
    const ohcCost = c.pcOhcCost || 0;
    const dnuCost = agree * 5500;
    const profit  = adc - ohcCost - dnuCost;
    const prfRate = adc > 0 ? (profit / adc * 100).toFixed(1) + '%' : '—';
    const cvr     = inflow > 0 ? (agree / inflow * 100).toFixed(1) + '%' : '—';
    const nd = '—';
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('dPcInflow',  inflow  ? inflow.toLocaleString()  + '건' : nd);
    setText('dPcAgree',   agree   ? agree.toLocaleString()   + '건' : nd);
    setText('dPcCvr',     cvr);
    setText('dPcAdvUnit', advU    ? advU.toLocaleString()    + '원' : nd);
    setText('dPcAdc',     adc     ? adc.toLocaleString()     + '원' : nd);
    setText('dPcOhcCost', ohcCost ? ohcCost.toLocaleString() + '원' : nd);
    setText('dPcDnuCost', dnuCost ? dnuCost.toLocaleString() + '원' : nd);
    setText('dPcProfit',  profit  ? profit.toLocaleString()  + '원' : nd);
    setText('dPcPrfRate', prfRate);
  }

  // breadcrumb
  document.getElementById('breadcrumb').innerHTML =
    `<span onclick="goScreen('campaigns')" style="cursor:pointer;color:var(--text2);">캠페인 목록</span>
     <span class="sep">›</span><span class="cur">${_cName(c)}</span>`;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const detailScreen = document.getElementById('screen-detail');
  detailScreen.classList.add('active');
  detailScreen.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });
  const contentEl = document.querySelector('.content');
  if (contentEl) contentEl.scrollTop = 0;
  document.getElementById('nav-campaigns').classList.add('active');

  if (!skipPush) {
    history.pushState({ screen: 'detail', id: c.id }, '', '#detail/' + c.id);
  }
}

// ══════════════════════════════════════════
// CAMPAIGN LIST
// ══════════════════════════════════════════
function updateBoardCounts() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const y  = String(now.getFullYear());
  document.getElementById('cnt-thismonth').textContent = DATA.filter(c => c.date?.startsWith(ym)).length + '건';
  document.getElementById('cnt-thisyear').textContent  = DATA.filter(c => c.date?.startsWith(y)).length + '건';
  // 단계별 카운트: 조회기간 필터 적용
  const from = document.getElementById('fFrom')?.value || '';
  const to   = document.getElementById('fTo')?.value   || '';
  const dateFiltered = DATA.filter(c => {
    const d = (c.date || '').slice(0, 10);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
  document.getElementById('cnt-booking').textContent = dateFiltered.filter(c => c.status === '부킹확정').length;
  document.getElementById('cnt-test').textContent    = dateFiltered.filter(c => c.status === '테스트완료').length;
  document.getElementById('cnt-sent').textContent    = dateFiltered.filter(c => c.status === '성과입력대기').length;
  document.getElementById('cnt-settle').textContent  = dateFiltered.filter(c => c.status === '성과입력완료').length;
}

function renderTable(data) {
  updateBoardCounts();
  const total      = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = 1;
  const start    = (currentPage - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);

  // 카운트
  document.getElementById('shownCnt').textContent = total;
  const totalAdc = data.reduce((s, c) => {
    if (c.product === 'DA') return s + (c.daAdcost || 0);
    if (c.product === 'CPA') return s + (c.adcostFixed || (c.db || c.qty || 0) * (c.sellUnit || 0));
    const base = (c.sellBillBase||c.billBase||'actual') === 'sched' ? (c.qty||0)-(c.svc||0) : (c.actual ? c.actual-(c.svc||0) : (c.qty||0)-(c.svc||0));
    return s + base * (c.sellUnit||0);
  }, 0);
  const adcEl = document.getElementById('shownAdc');
  if (adcEl) adcEl.textContent = totalAdc
    ? (totalAdc >= 100000000 ? (totalAdc/100000000).toFixed(2).replace(/\.?0+$/,'')+'억원' : (totalAdc/10000).toFixed(2).replace(/\.?0+$/,'')+'만원')
    : '—';

  // pg-info
  const pgInfo = document.getElementById('pg-info');
  if (pgInfo) {
    const from = total === 0 ? 0 : start + 1;
    const to   = Math.min(start + PAGE_SIZE, total);
    pgInfo.textContent = `${from} – ${to} / ${total}건`;
  }

  // pg-btns (10페이지 단위 그룹)
  const pgBtns = document.getElementById('pg-btns');
  if (pgBtns) {
    const PG_WIN = 10;
    const curGroup   = Math.ceil(currentPage / PG_WIN);
    const totalGroups = Math.ceil(totalPages / PG_WIN);
    const groupStart = (curGroup - 1) * PG_WIN + 1;
    const groupEnd   = Math.min(curGroup * PG_WIN, totalPages);
    let html = `<button class="pg-btn" onclick="prevPageGroup()" ${curGroup===1?'disabled':''}>‹</button>`;
    for (let p = groupStart; p <= groupEnd; p++) {
      html += `<button class="pg-btn${p===currentPage?' active':''}" onclick="goPage(${p})">${p}</button>`;
    }
    html += `<button class="pg-btn" onclick="nextPageGroup()" ${curGroup===totalGroups?'disabled':''}>›</button>`;
    pgBtns.innerHTML = html;
  }

  document.getElementById('tbody').innerHTML = pageData.map(c => {
    const i = DATA.indexOf(c);
    return `<tr onclick="openDetail(${i})">
      <td onclick="event.stopPropagation()"><input type="checkbox"></td>
      <td class="td-dim">${_getCat(c)}</td>
      <td class="td-num">${_formatDateRange(c)}</td>
      <td class="td-bold">${c.content||_cCompany(c)}<span style="color:var(--text2);font-weight:400;">_${c.media}</span></td>
      <td class="td-dim">${c.product}</td>
      <td class="td-dim">${c.ops || '—'}</td>
      <td class="td-num td-r">${(c.qty||0).toLocaleString()}</td>
      <td class="td-num td-r">${(()=>{ const adc = c.product==='DA' ? (c.daAdcost||0) : c.product==='CPA' ? (c.adcostFixed||(c.db||c.qty||0)*(c.sellUnit||0)) : (c.adcostFixed || (()=>{ const base=(c.sellBillBase||c.billBase||'actual')==='sched'?(c.qty||0)-(c.svc||0):(c.actual?(c.actual-(c.svc||0)):(c.qty||0)-(c.svc||0)); return base*(c.sellUnit||0); })()); return adc?(adc>=10000?(adc/10000).toFixed(0)+'만':adc.toLocaleString())+'원':'<span style="color:var(--text3)">—</span>'; })()}</td>
      <td class="td-num td-r">${c.clicks!=null?c.clicks.toLocaleString():'<span style="color:var(--text3)">—</span>'}</td>
      <td class="td-num td-r">${(()=>{ const v=c.ctr; if(v==null)return '<span style="color:var(--text3)">—</span>'; const n=typeof v==='string'?parseFloat(v):v; return isNaN(n)?'<span style="color:var(--text3)">—</span>':n.toFixed(2)+'%'; })()}</td>
      <td><span class="badge b-${c.status}">${c.status}</span></td>
      <td onclick="event.stopPropagation()" style="text-align:center;">
        <div class="chk ${c.testOk?'on':''}" onclick="clickTest(${i},this)">${c.testOk?'✓':''}</div>
      </td>
      <td onclick="event.stopPropagation()" style="text-align:center;">
        <div class="chk ${c.sent?'on':''}" onclick="clickSend(${i},this)">${c.sent?'✓':''}</div>
      </td>
    </tr>`;
  }).join('');
}

function goPage(n)  { currentPage = n; renderTable(filtered); }
function prevPage() { if (currentPage > 1) { currentPage--; renderTable(filtered); } }
function nextPage() { if (currentPage < Math.ceil(filtered.length / PAGE_SIZE)) { currentPage++; renderTable(filtered); } }
function prevPageGroup() {
  const curGroup = Math.ceil(currentPage / 10);
  if (curGroup > 1) goPage((curGroup - 2) * 10 + 1);
}
function nextPageGroup() {
  const curGroup  = Math.ceil(currentPage / 10);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const nextFirst  = curGroup * 10 + 1;
  if (nextFirst <= totalPages) goPage(nextFirst);
}
function changePageSize(val) { PAGE_SIZE = +val; currentPage = 1; renderTable(filtered); }

function _populateAdvFilter() {
  const sel = document.getElementById('fAdv');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">광고주/대행사</option>' +
    SELLER_DATA.map(s => `<option value="${s.company}">${s.company}</option>`).join('');
  sel.value = current; // 기존 선택값 유지
}

function applyFilter() {
  const cat    = document.getElementById('fCat').value;
  const prod   = document.getElementById('fProd').value;
  const media  = document.getElementById('fMedia').value;
  const mgr    = document.getElementById('fMgr').value;
  const adv    = document.getElementById('fAdv').value;
  const q      = document.getElementById('fQ').value.toLowerCase();
  const from   = document.getElementById('fFrom')?.value || '';
  const to     = document.getElementById('fTo')?.value   || '';
  filtered = DATA.filter(c => {
    if (activeStatus !== 'all' && c.status !== activeStatus) return false;
    if (cat    && _getCat(c) !== cat)   return false;
    if (prod   && c.product !== prod)   return false;
    if (media  && c.media   !== media)  return false;
    if (mgr    && c.ops     !== mgr)    return false;
    if (adv && (c.seller || c.adv) !== adv) return false;
    if (q && !_cName(c).toLowerCase().includes(q) && !(c.id||'').toString().toLowerCase().includes(q)) return false;
    const dateStr = (c.date || '').slice(0, 10);
    if (from && dateStr < from) return false;
    if (to   && dateStr > to)   return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  currentPage = 1;
  renderTable(filtered);
}

function filterStatus(s) {
  activeStatus = s;
  const boardIds = {all:'board-all', 부킹확정:'board-booking', 테스트완료:'board-test', 성과입력대기:'board-sent', 성과입력완료:'board-settle'};
  document.querySelectorAll('#screen-campaigns .board').forEach(b => b.classList.remove('active-board'));
  const activeEl = document.getElementById(boardIds[s]);
  if (activeEl) activeEl.classList.add('active-board');
  applyFilter();
}

function _saveFilterState(screen) {
  if (screen === 'campaigns') {
    sessionStorage.setItem('filterState_campaigns', JSON.stringify({
      fCat:   document.getElementById('fCat')?.value   || '',
      fProd:  document.getElementById('fProd')?.value  || '',
      fMedia: document.getElementById('fMedia')?.value || '',
      fMgr:   document.getElementById('fMgr')?.value   || '',
      fAdv:   document.getElementById('fAdv')?.value   || '',
      fQ:     document.getElementById('fQ')?.value     || '',
      fFrom:  document.getElementById('fFrom')?.value  || '',
      fTo:    document.getElementById('fTo')?.value    || '',
      activeStatus
    }));
  } else if (screen === 'tax') {
    sessionStorage.setItem('filterState_tax', JSON.stringify({
      year:     document.getElementById('tax-year')?.value     || '',
      month:    document.getElementById('tax-month')?.value    || '',
      fManager: document.getElementById('tax-fManager')?.value || '',
      fStatus:  document.getElementById('tax-fStatus')?.value  || '',
      fCompany: document.getElementById('tax-fCompany')?.value || ''
    }));
  } else if (screen === 'settlement') {
    sessionStorage.setItem('filterState_settlement', JSON.stringify({
      year:   document.getElementById('stl-year')?.value    || '',
      month:  document.getElementById('stl-month')?.value   || '',
      fScope: document.getElementById('stl-fScope')?.value  || 'settled',
      fProd:  document.getElementById('stl-fProd')?.value   || '',
      fCat:   document.getElementById('stl-fCat')?.value    || '',
      fMedia: document.getElementById('stl-fMedia')?.value  || '',
      fAdv:   document.getElementById('stl-fAdv')?.value    || '',
      fOps:   document.getElementById('stl-fOps')?.value    || '',
      fOrg:   document.getElementById('stl-fOrg')?.value    || '',
      stlView
    }));
  }
}

function _restoreFilterState(screen) {
  if (screen === 'campaigns') {
    const raw = sessionStorage.getItem('filterState_campaigns');
    if (!raw) { resetFilter(); _populateAdvFilter(); return; }
    const s = JSON.parse(raw);
    ['fCat','fProd','fMedia','fMgr','fAdv','fQ','fFrom','fTo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = s[id] || '';
    });
    activeStatus = s.activeStatus || 'all';
    document.querySelectorAll('#screen-campaigns .board').forEach(b => b.classList.remove('active-board'));
    const boardEl = document.getElementById('board-' + activeStatus);
    if (boardEl) boardEl.classList.add('active-board');
    _populateAdvFilter();
    applyFilter();
  } else if (screen === 'tax') {
    resetTaxFilter();
  } else if (screen === 'settlement') {
    const raw = sessionStorage.getItem('filterState_settlement');
    if (!raw) { resetStlFilter(); return; }
    const s = JSON.parse(raw);
    const _set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    _set('stl-year',    s.year);
    _set('stl-month',   s.month);
    _set('stl-fScope',  s.fScope);
    _set('stl-fProd',   s.fProd);
    _set('stl-fCat',    s.fCat);
    _set('stl-fMedia',  s.fMedia);
    _set('stl-fAdv',    s.fAdv);
    _set('stl-fOps',    s.fOps);
    _set('stl-fOrg',    s.fOrg);
    stlView = s.stlView || 'media';
    ['campaign','adv','agency','media','pc'].forEach(t => {
      const el = document.getElementById('stl-vt-' + t);
      if (el) el.classList.toggle('active', t === stlView);
    });
    _stlPopulateDynFilters();
    renderSettlement();
  }
}

function resetFilter() {
  ['fCat','fProd','fMedia','fMgr','fAdv'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
  document.getElementById('fQ').value='';
  const now = new Date();
  document.getElementById('fFrom').value = _dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  document.getElementById('fTo').value   = _dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  // 날짜 피커 트리거 레이블 초기화
  const _drpLbl = document.getElementById('drp-label');
  if (_drpLbl) {
    const _m = String(now.getMonth()+1).padStart(2,'0');
    const _lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    _drpLbl.textContent = now.getFullYear()+'.'+_m+'.01. ~ '+now.getFullYear()+'.'+_m+'.'+String(_lastDay).padStart(2,'0')+'.';
  }
  activeStatus='all';
  document.querySelectorAll('#screen-campaigns .board').forEach(b => b.classList.remove('active-board'));
  document.getElementById('board-all').classList.add('active-board');
  currentPage = 1;
  applyFilter();
}

function toggleAll(el) {
  document.querySelectorAll('#tbody input[type=checkbox]').forEach(c => c.checked = el.checked);
}

// ══════════════════════════════════════════
// CHECKBOXES
// ══════════════════════════════════════════
function clickTest(idx, el) {
  if (DATA[idx].testOk) return;
  pendingTestIdx = idx; pendingTestEl = el;
  document.querySelectorAll('#clItems .cl-item').forEach(i => i.classList.remove('ticked'));
  document.getElementById('btnTestOk').disabled = true;
  document.getElementById('btnTestOk').style.opacity = '.4';
  openModal('modalTest');
}
function tickCl(el) {
  el.classList.toggle('ticked');
  const all = [...document.querySelectorAll('#clItems .cl-item')].every(i => i.classList.contains('ticked'));
  document.getElementById('btnTestOk').disabled = !all;
  document.getElementById('btnTestOk').style.opacity = all?'1':'.4';
}
function confirmTest() {
  const c = DATA[pendingTestIdx];
  c.testOk = true;
  _log(c.id, 'check', 'testOk', '대기 중', '완료');
  const prevStatus = c.status;
  if (c.status === '부킹확정') c.status = '테스트완료';
  if (c.status !== prevStatus) _log(c.id, 'field', 'status', prevStatus, c.status);
  if (pendingTestEl) { pendingTestEl.classList.add('on'); pendingTestEl.innerHTML='✓'; }
  _fbSaveCampaign(c);
  closeModal('modalTest');
  _syncDetailChks();
  if (pendingTestIdx === currentDetailIdx) _updateStepTrack(c.status);
  renderTable(filtered);
  toast('✓ 테스트 수신이 확인되었습니다','ok');
}
function cancelTest() { closeModal('modalTest'); }

function clickSend(idx, el) {
  if (DATA[idx].sent) return;
  pendingSendIdx=idx; pendingSendEl=el;
  document.getElementById('sendName').textContent = _cName(DATA[idx]);
  openModal('modalSend');
}
function confirmSend() {
  const c = DATA[pendingSendIdx];
  c.sent = true;
  _log(c.id, 'check', 'sent', '대기 중', '완료');
  const prevStatus = c.status;
  if (c.status === '부킹확정' || c.status === '테스트완료') c.status = '성과입력대기';
  if (c.status !== prevStatus) _log(c.id, 'field', 'status', prevStatus, c.status);
  if (pendingSendEl) { pendingSendEl.classList.add('on'); pendingSendEl.innerHTML='✓'; }
  _fbSaveCampaign(c);
  closeModal('modalSend');
  _syncDetailChks();
  if (pendingSendIdx === currentDetailIdx) _updateStepTrack(c.status);
  renderTable(filtered);
  toast('🚀 발송이 확인되었습니다','ok');
}
function cancelSend() { closeModal('modalSend'); }

function _updateStepTrack(status) {
  const steps = ['부킹확정','테스트완료','성과입력대기','성과입력완료'];
  const ci = steps.indexOf(status);
  document.querySelectorAll('#stepTrack .step').forEach((el,i) => {
    el.className = 'step';
    if (i < ci) el.classList.add('done');
    else if (i === ci) el.classList.add('current');
  });
}

// 상세페이지 진행체크 동기화
function _syncDetailChks() {
  const c = DATA[currentDetailIdx];
  if (!c) return;
  _setDetailChk(document.getElementById('detailChkTest'), c.testOk);
  _setDetailChk(document.getElementById('detailChkSend'), c.sent);
}
function _setDetailChk(el, done) {
  if (!el) return;
  const dot = el.querySelector('.s-dot');
  const val = el.querySelector('span:last-child');
  if (done) { dot.className='s-dot dot-ok'; val.style.color='var(--green)'; val.textContent='✓ 완료'; }
  else      { dot.className='s-dot dot-pend'; val.style.color='var(--text3)'; val.textContent='대기 중'; }
}
// 상세페이지에서 진행체크 클릭
function detailClickTest() {
  const c = DATA[currentDetailIdx];
  if (!c || c.testOk) return;
  pendingTestIdx = currentDetailIdx;
  pendingTestEl  = null; // 캠페인목록 .chk 없음
  document.querySelectorAll('#clItems .cl-item').forEach(i => i.classList.remove('ticked'));
  document.getElementById('btnTestOk').disabled = true;
  document.getElementById('btnTestOk').style.opacity = '.4';
  openModal('modalTest');
}
function detailClickSend() {
  const c = DATA[currentDetailIdx];
  if (!c || c.sent) return;
  if (!c.testOk) { toast('⚠ 테스트 수신 확인 후 발송 처리할 수 있습니다', 'warn'); return; }
  pendingSendIdx = currentDetailIdx;
  pendingSendEl  = null;
  document.getElementById('sendName').textContent = _cName(c);
  openModal('modalSend');
}

function toggleChk(el) { el.classList.toggle('on'); el.innerHTML = el.classList.contains('on')?'✓':''; }

function toggleStatus(el) {
  const dot = el.querySelector('.s-dot');
  const val = el.querySelector('span:last-child');
  if (dot.classList.contains('dot-ok')) {
    dot.className='s-dot dot-pend'; val.style.color='var(--text3)'; val.textContent='대기 중';
  } else {
    dot.className='s-dot dot-ok'; val.style.color='var(--green)'; val.textContent='✓ 완료';
  }
}

// 캠페인 표시명: 매출처_매체사
function _cCompany(c) {
  return c.seller || c.adv || '—';
}
// 캠페인의 카테고리를 SELLER_DATA 브랜드에서 동적으로 조회, 없으면 c.cat 폴백
function _getCat(c) {
  const sellerName = c.seller || c.adv;
  const s = sellerName ? SELLER_DATA.find(x => x.company === sellerName) : null;
  if (s && s.brands && c.content) {
    const brand = s.brands.find(b => (b.name || b) === c.content);
    if (brand && brand.cat) return brand.cat;
  }
  return c.cat || '';
}
function _linkify(text) {
  if (!text) return '<span style="color:var(--text3);">—</span>';
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent);word-break:break-all;">$1</a>')
    .replace(/\n/g, '<br>');
}
function _cName(c) {
  if (c.product === '퍼미션콜') {
    const brand = c.content || _cCompany(c);
    return brand && brand !== '—' ? `${brand}_퍼미션콜` : '퍼미션콜';
  }
  const label = c.content || _cCompany(c);
  if (label && label !== '—' && c.media) return `${label}_${c.media}`;
  return c.promo || '—';
}
function _buildCampaignName(seller, media) {
  if (!seller || !media) return '';
  return `${seller}_${media}`;
}
function autoNameReg() {
  const content = document.getElementById('r_content').value || document.getElementById('r_content_text').value;
  const seller  = document.getElementById('r_seller').value;
  document.getElementById('r_promo').value = _buildCampaignName(content || seller, document.getElementById('r_media').value);
}
function autoNameEdit() {
  const content = document.getElementById('e_content').value || document.getElementById('e_content_text').value;
  const seller  = document.getElementById('e_seller').value;
  document.getElementById('e_promo').value = _buildCampaignName(content || seller, document.getElementById('e_media').value);
}

// ══════════════════════════════════════════
// FORMS
// ══════════════════════════════════════════
// ══════════════════════════════════════════
// 매체사 데이터 (매체사만, 대행사는 SELLER_DATA로 이동)
const MEDIA_DATA = [];
const SELLER_DATA = [];

// 매체사 등록 모달을 콤보박스 연동으로 열었을 때 저장할 콤보 이름
let mediaPendingCombo = null;
// 광고주 등록 모달을 콤보박스 연동으로 열었을 때 저장할 콤보 이름
let pendingAdvCombo = null;

// ── 매출처 콤보 헬퍼 ──
// 모든 매출처 항목을 "브랜드명_회사명" 형식으로 반환 (브랜드 없으면 회사명만)
function _getSellerItems() {
  return SELLER_DATA.map(s => s.company);
}
// "브랜드명_회사명" 레이블 → {company, brand} 파싱
function _parseSellerItem(label) {
  for (const s of SELLER_DATA) {
    if (s.brands && s.brands.length > 0) {
      for (const b of s.brands) {
        const bName = b.name || b;
        if (`${bName}_${s.company}` === label) return { company: s.company, brand: bName };
      }
    }
  }
  return { company: label, brand: null };
}

// ── 콤보박스 설정 ──
function _comboConfig(name) {
  return {
    seller: {
      textId:'r_seller_text', hiddenId:'r_seller', listId:'combo-seller-list',
      getItems: () => _getSellerItems(),
      onSelect: () => {
        const company = document.getElementById('r_seller_text').value;
        document.getElementById('r_seller').value = company;
        document.getElementById('r_content_text').value = '';
        document.getElementById('r_content').value = '';
        document.getElementById('r_cat').value = '';
        autoSellerReg();
        autoNameReg();
      },
      getLabelFromHidden: (company) => company,
      addLabel:'+ 신규 매출처 추가',
      onAddNew: () => { comboCloseAll(); openSellerModalForCombo(null,'seller'); },
    },
    content: {
      textId:'r_content_text', hiddenId:'r_content', listId:'combo-content-list',
      getItems: () => {
        const sellerName = document.getElementById('r_seller')?.value;
        const s = SELLER_DATA.find(x => x.company === sellerName);
        return s ? (s.brands || []).map(b => b.name || b) : [];
      },
      onSelect: () => {
        const sellerName = document.getElementById('r_seller')?.value;
        const s = SELLER_DATA.find(x => x.company === sellerName);
        const contentVal = document.getElementById('r_content').value;
        if (s && s.brands) {
          const brand = s.brands.find(b => (b.name || b) === contentVal);
          if (brand && brand.cat) document.getElementById('r_cat').value = brand.cat;
        }
        autoNameReg();
      },
      addLabel:'+ 브랜드 추가',
      onAddNew: () => {
        if (!document.getElementById('r_seller')?.value) { toast('⚠ 광고주/대행사를 먼저 선택해주세요','warn'); return; }
        comboCloseAll(); openBrandAddModal('r');
      },
    },
    media: {
      textId:'r_media_text', hiddenId:'r_media', listId:'combo-media-list',
      getItems: () => MEDIA_DATA.filter(m => m.type === '매체사' && m.active !== false).map(m => m.company),
      onSelect: () => { autoNameReg(); autoCommReg(); },
      addLabel:'+ 신규 매체사 추가',
      onAddNew: () => { comboCloseAll(); openMediaModalForCombo('매체사','media'); },
    },
    pm_linked: {
      textId:'pm_linked_text', hiddenId:'pm_linked', listId:'combo-pm_linked-list',
      getItems: () => DATA.map(c => {
        const dateStr = c.date ? c.date.split(' ')[0] : '';
        return _cName(c) + '_' + dateStr + ' (' + c.id + ')';
      }),
      onSelect: () => {
        const text = document.getElementById('pm_linked_text').value;
        const match = text.match(/\(([^)]+)\)$/);
        if (match) document.getElementById('pm_linked').value = match[1];
      },
      getLabelFromHidden: (id) => {
        const c = DATA.find(x => x.id === id);
        if (!c) return id;
        const dateStr = c.date ? c.date.split(' ')[0] : '';
        return _cName(c) + '_' + dateStr + ' (' + c.id + ')';
      },
      addLabel: null,
      onAddNew: () => {},
    },
    pm_seller: {
      textId:'pm_seller_text', hiddenId:'pm_seller', listId:'combo-pm_seller-list',
      getItems: () => _getSellerItems(),
      onSelect: () => {
        const company = document.getElementById('pm_seller_text').value;
        document.getElementById('pm_seller').value = company;
        document.getElementById('pm_content_text').value = '';
        document.getElementById('pm_content').value = '';
        document.getElementById('pm-cat').value = '';
      },
      getLabelFromHidden: (company) => company,
      addLabel:'+ 신규 매출처 추가',
      onAddNew: () => { comboCloseAll(); openSellerModalForCombo(null,'pm_seller'); },
    },
    pm_content: {
      textId:'pm_content_text', hiddenId:'pm_content', listId:'combo-pm_content-list',
      getItems: () => {
        const sellerName = document.getElementById('pm_seller')?.value;
        const s = SELLER_DATA.find(x => x.company === sellerName);
        return s ? (s.brands || []).map(b => b.name || b) : [];
      },
      onSelect: () => {
        const sellerName = document.getElementById('pm_seller')?.value;
        const s = SELLER_DATA.find(x => x.company === sellerName);
        const contentVal = document.getElementById('pm_content').value;
        if (s && s.brands) {
          const brand = s.brands.find(b => (b.name || b) === contentVal);
          if (brand && brand.cat) document.getElementById('pm-cat').value = brand.cat;
        }
      },
      addLabel:'+ 브랜드 추가',
      onAddNew: () => {
        if (!document.getElementById('pm_seller')?.value) { toast('⚠ 광고주/대행사를 먼저 선택해주세요','warn'); return; }
        comboCloseAll(); openBrandAddModal('pm');
      },
    },
    pm_media: {
      textId:'pm_media_text', hiddenId:'pm_media', listId:'combo-pm_media-list',
      getItems: () => MEDIA_DATA.filter(m => m.type === '매체사' && m.active !== false).map(m => m.company),
      onSelect: () => { _calcPipeAmt(); },
      addLabel:'+ 신규 매체사 추가',
      onAddNew: () => { comboCloseAll(); openMediaModalForCombo('매체사','pm_media'); },
    },
    e_seller: {
      textId:'e_seller_text', hiddenId:'e_seller', listId:'combo-e_seller-list',
      getItems: () => _getSellerItems(),
      onSelect: () => {
        const company = document.getElementById('e_seller_text').value;
        document.getElementById('e_seller').value = company;
        document.getElementById('e_content_text').value = '';
        document.getElementById('e_content').value = '';
        document.getElementById('e_cat').value = '';
        autoSellerEdit();
        autoNameEdit();
      },
      getLabelFromHidden: (company) => company,
      addLabel:'+ 신규 매출처 추가',
      onAddNew: () => { comboCloseAll(); openSellerModalForCombo(null,'e_seller'); },
    },
    e_content: {
      textId:'e_content_text', hiddenId:'e_content', listId:'combo-e_content-list',
      getItems: () => {
        const sellerName = document.getElementById('e_seller')?.value;
        const s = SELLER_DATA.find(x => x.company === sellerName);
        return s ? (s.brands || []).map(b => b.name || b) : [];
      },
      onSelect: () => {
        const sellerName = document.getElementById('e_seller')?.value;
        const s = SELLER_DATA.find(x => x.company === sellerName);
        const contentVal = document.getElementById('e_content').value;
        if (s && s.brands) {
          const brand = s.brands.find(b => (b.name || b) === contentVal);
          if (brand && brand.cat) document.getElementById('e_cat').value = brand.cat;
        }
        autoNameEdit();
      },
      addLabel:'+ 브랜드 추가',
      onAddNew: () => {
        if (!document.getElementById('e_seller')?.value) { toast('⚠ 광고주/대행사를 먼저 선택해주세요','warn'); return; }
        comboCloseAll(); openBrandAddModal('e');
      },
    },
    e_media: {
      textId:'e_media_text', hiddenId:'e_media', listId:'combo-e_media-list',
      getItems: () => MEDIA_DATA.filter(m => m.type === '매체사' && m.active !== false).map(m => m.company),
      onSelect: () => { autoNameEdit(); autoCommEdit(); },
      addLabel:'+ 신규 매체사 추가',
      onAddNew: () => { comboCloseAll(); openMediaModalForCombo('매체사','e_media'); },
    },
  }[name];
}

function comboCloseAll() {
  ['seller','content','media','pm_linked','pm_seller','pm_content','pm_media','e_seller','e_content','e_media'].forEach(name => {
    const cfg = _comboConfig(name);
    const el = document.getElementById(cfg.listId);
    if (el) el.style.display = 'none';
  });
}

function comboRender(name) {
  comboCloseAll();
  const cfg = _comboConfig(name);
  const q = (document.getElementById(cfg.textId).value || '').trim().toLowerCase();
  const items = cfg.getItems();
  const filtered = q ? items.filter(it => it.toLowerCase().includes(q)) : items;
  const listEl = document.getElementById(cfg.listId);

  // innerHTML 대신 DOM 직접 생성 → 인라인 이벤트 핸들러의 따옴표 충돌 방지
  listEl.innerHTML = '';
  if (filtered.length) {
    filtered.forEach(val => {
      const div = document.createElement('div');
      div.className = 'combo-item';
      div.textContent = val;
      div.addEventListener('mousedown', e => { e.preventDefault(); comboSelect(name, val); });
      listEl.appendChild(div);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'combo-empty';
    empty.textContent = '검색 결과 없음';
    listEl.appendChild(empty);
  }
  if (cfg.addLabel) {
    const addDiv = document.createElement('div');
    addDiv.className = 'combo-add';
    addDiv.textContent = cfg.addLabel;
    addDiv.addEventListener('mousedown', e => { e.preventDefault(); comboAddNew(name); });
    listEl.insertBefore(addDiv, listEl.firstChild);
  }

  listEl.style.display = 'block';
}

function comboSelect(name, val) {
  const cfg = _comboConfig(name);
  document.getElementById(cfg.textId).value = val;
  document.getElementById(cfg.hiddenId).value = val;
  document.getElementById(cfg.listId).style.display = 'none';
  cfg.onSelect();
}

function comboClose(name) {
  setTimeout(() => {
    const cfg = _comboConfig(name);
    const listEl = document.getElementById(cfg.listId);
    if (listEl) listEl.style.display = 'none';
    const textEl = document.getElementById(cfg.textId);
    const hiddenEl = document.getElementById(cfg.hiddenId);
    if (textEl && hiddenEl) textEl.value = cfg.getLabelFromHidden ? cfg.getLabelFromHidden(hiddenEl.value) : hiddenEl.value;
  }, 150);
}

function comboAddNew(name) {
  _comboConfig(name).onAddNew();
}

function openAdvRegModal(comboName) {
  pendingAdvCombo = comboName || 'adv';
  document.getElementById('adv-reg-input').value = '';
  openModal('modalAdvReg');
}

function saveAdvReg() {
  const name = document.getElementById('adv-reg-input').value.trim();
  if (!name) { toast('⚠ 광고주명을 입력해주세요','warn'); return; }
  if (!SELLER_DATA.find(s => s.company === name && s.type === '광고주')) {
    SELLER_DATA.push({type:'광고주', company:name, agrate:0, brands:[]});
  }
  closeModal('modalAdvReg');
  comboSelect(pendingAdvCombo || 'adv', name);
  pendingAdvCombo = null;
  toast('✓ 광고주가 추가되었습니다','ok');
}

function openMediaModalForCombo(type, comboName) {
  openMediaModal(null);
  mediaPendingCombo = comboName;
  document.getElementById('med-type').value = type;
}

function closeMediaModal() {
  mediaPendingCombo = null;
  closeModal('modalMedia');
}

function medTypeChange() {}

// 매체별 기본 수수료율 (MEDIA_DATA에서 동적으로 조회)
function _mediaComm(mediaName) {
  const m = MEDIA_DATA.find(m => m.company === mediaName);
  return m ? m.c1Adj : 0;
}

function autoCommReg() {
  const media = document.getElementById('r_media').value;
  const m = MEDIA_DATA.find(x => x.company === media);
  if (media && m) {
    const comm = m.c1Adj !== '' && m.c1Adj != null ? m.c1Adj : (m.c1Base !== '' && m.c1Base != null ? m.c1Base : null);
    if (m.unit != null && m.unit !== '') document.getElementById('r_sellUnit').value = m.unit;
    if (comm != null) document.getElementById('r_comm').value = comm;
  }
  calcReg();
}

function autoCommEdit() {
  const media = document.getElementById('e_media').value;
  const m = MEDIA_DATA.find(x => x.company === media);
  if (media && m) {
    const comm = m.c1Adj !== '' && m.c1Adj != null ? m.c1Adj : (m.c1Base !== '' && m.c1Base != null ? m.c1Base : null);
    if (m.unit != null && m.unit !== '') document.getElementById('e_sellUnit').value = m.unit;
    if (comm != null) document.getElementById('e_comm').value = comm;
  }
  calcEdit();
}

function autoSellerReg() {
  const sellerName = document.getElementById('r_seller').value;
  const s = SELLER_DATA.find(x => x.company === sellerName && x.type === '대행사');
  if (s && s.agrate) document.getElementById('r_agrate').value = s.agrate;
  else document.getElementById('r_agrate').value = '';
  calcReg();
}

function autoSellerEdit() {
  const sellerName = document.getElementById('e_seller').value;
  const s = SELLER_DATA.find(x => x.company === sellerName && x.type === '대행사');
  if (s && s.agrate) document.getElementById('e_agrate').value = s.agrate;
  else document.getElementById('e_agrate').value = '';
  calcEdit();
}

let _daImagesBase64     = [];  // 등록폼
let _daEditImagesBase64 = [];  // 수정폼

// ── 공통: 이미지 리사이즈 후 콜백 ──
function _daResizeAndAdd(file, arr, renderFn) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const MAX = 900;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      arr.push(canvas.toDataURL('image/jpeg', 0.82));
      renderFn();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ── 공통: 프리뷰 그리드 렌더 ──
function _daRenderGrid(gridId, arr) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  arr.forEach((b64, i) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block;';
    const img = document.createElement('img');
    img.src = b64;
    img.style.cssText = 'width:200px;height:auto;border-radius:6px;border:1px solid var(--border);display:block;';
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.style.cssText = 'position:absolute;top:4px;right:4px;background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:1;';
    btn.onclick = () => { arr.splice(i, 1); _daRenderGrid(gridId, arr); };
    wrap.appendChild(img); wrap.appendChild(btn);
    grid.appendChild(wrap);
  });
}

// ── 등록폼 ──
function daOnDrop(e) {
  e.preventDefault();
  const dz = document.getElementById('r_da_dropzone');
  if (dz) { dz.style.borderColor = 'var(--border)'; dz.style.background = 'var(--surface2)'; }
  Array.from(e.dataTransfer.files).forEach(f => _daResizeAndAdd(f, _daImagesBase64, () => _daRenderGrid('r_da_preview_grid', _daImagesBase64)));
}
function daFilesSelected(files) {
  Array.from(files).forEach(f => _daResizeAndAdd(f, _daImagesBase64, () => _daRenderGrid('r_da_preview_grid', _daImagesBase64)));
  document.getElementById('r_da_file').value = '';
}

// ── 수정폼 ──
function daEditOnDrop(e) {
  e.preventDefault();
  const dz = document.getElementById('e_da_dropzone');
  if (dz) { dz.style.borderColor = 'var(--border)'; dz.style.background = 'var(--surface2)'; }
  Array.from(e.dataTransfer.files).forEach(f => _daResizeAndAdd(f, _daEditImagesBase64, () => _daRenderGrid('e_da_preview_grid', _daEditImagesBase64)));
}
function daEditFilesSelected(files) {
  Array.from(files).forEach(f => _daResizeAndAdd(f, _daEditImagesBase64, () => _daRenderGrid('e_da_preview_grid', _daEditImagesBase64)));
  document.getElementById('e_da_file').value = '';
}

function onEditProductChange() {
  const prod  = document.getElementById('e_product').value;
  const isDA  = prod === 'DA';
  const isPC  = prod === '퍼미션콜';
  const isCPA = prod === 'CPA';
  const useMonthPicker = isDA || isPC || isCPA;

  document.getElementById('e_date_normal').style.display    = useMonthPicker ? 'none' : '';
  document.getElementById('e_date_da').style.display        = useMonthPicker ? '' : 'none';
  document.getElementById('e_card_qty').style.display       = (isDA || isPC || isCPA) ? 'none' : '';
  document.getElementById('e_card_da_adcost').style.display = isDA  ? '' : 'none';

  const eMsgSec   = document.getElementById('e_msg_section');
  const eDaImgSec = document.getElementById('e_da_img_section');
  const eCardPC   = document.getElementById('e_card_pc');
  const eCardCPA  = document.getElementById('e_card_cpa');
  if (eMsgSec)   eMsgSec.style.display   = (isDA || isPC || isCPA) ? 'none' : '';
  if (eDaImgSec) eDaImgSec.style.display = isDA  ? '' : 'none';
  if (eCardPC)   eCardPC.style.display   = isPC  ? '' : 'none';
  if (eCardCPA)  eCardCPA.style.display  = isCPA ? '' : 'none';
  const ePerfCardProd = document.getElementById('e_card_perf');
  if (ePerfCardProd) {
    ePerfCardProd.style.display = isPC ? 'none' : '';
    const epN = document.getElementById('ep_normal');
    const epD = document.getElementById('ep_da');
    if (epN) epN.style.display = isDA ? 'none' : '';
    if (epD) epD.style.display = isDA ? '' : 'none';
  }

  // 월 피커 기본값 세팅
  if (useMonthPicker) {
    const now = new Date();
    const yr  = String(now.getFullYear());
    const mo  = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('e_da_year').value  = yr;
    document.getElementById('e_da_month').value = mo;
    if (isDA) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      document.getElementById('e_da_day').value    = '01';
      document.getElementById('e_da_eyear').value  = yr;
      document.getElementById('e_da_emonth').value = mo;
      document.getElementById('e_da_eday').value   = String(lastDay).padStart(2, '0');
    }
  }
}

function onRegProductChange() {
  const prod  = document.getElementById('r_product').value;
  const isDA  = prod === 'DA';
  const isPC  = prod === '퍼미션콜';
  const isCPA = prod === 'CPA';
  const useMonthPicker = isDA || isPC || isCPA;
  document.getElementById('r_date_normal').style.display = useMonthPicker ? 'none' : 'flex';
  document.getElementById('r_date_da').style.display     = useMonthPicker ? 'flex' : 'none';
  if (useMonthPicker) {
    const now = new Date();
    const yr  = String(now.getFullYear());
    const mo  = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('r_da_year').value  = yr;
    document.getElementById('r_da_month').value = mo;
    if (isDA) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      document.getElementById('r_da_day').value    = '01';
      document.getElementById('r_da_eyear').value  = yr;
      document.getElementById('r_da_emonth').value = mo;
      document.getElementById('r_da_eday').value   = String(lastDay).padStart(2, '0');
    }
  }
  document.getElementById('r_qty_normal').style.display  = (isDA || isPC || isCPA) ? 'none' : '';
  document.getElementById('r_qty_da').style.display      = isDA  ? '' : 'none';
  document.getElementById('r_qty_cpa').style.display     = isCPA ? '' : 'none';
  document.getElementById('r_pc_section').style.display  = isPC  ? '' : 'none';
  const secQtyLbl = document.getElementById('r_sec_qty_lbl');
  if (secQtyLbl) secQtyLbl.style.display = isPC ? 'none' : '';
  const adpromoWrap = document.getElementById('r_adpromo_wrap');
  if (adpromoWrap) adpromoWrap.style.display = isPC ? 'none' : '';
  const targetSec = document.getElementById('r_target_section');
  if (targetSec) targetSec.style.display = isPC ? 'none' : '';
  const msgSec = document.getElementById('r_msg_section');
  const imgSec = document.getElementById('r_da_img_section');
  if (msgSec) msgSec.style.display = (isDA || isPC || isCPA) ? 'none' : '';
  if (imgSec) imgSec.style.display = isDA ? '' : 'none';
}


function calcPC(prefix) {
  const p = prefix || 'r';
  const g = id => +document.getElementById(p + '_pc_' + id)?.value || 0;
  const set = (id, v) => { const el = document.getElementById(p + '_pc_' + id); if (el) el.value = v; };
  const inflow   = g('inflow');
  const agree    = g('agree');
  const advUnit  = g('adv_unit');
  const ohcCost  = g('ohc_cost');          // 직접 입력
  const dnuCost  = agree * 5500;           // DNU 단가 5,500원 고정
  const adc      = agree * advUnit;
  const profit   = adc - ohcCost - dnuCost;
  const prfRate  = adc > 0 ? (profit / adc * 100) : 0;
  const cvr      = inflow > 0 ? (agree / inflow * 100) : 0;
  set('adc',      adc      ? adc.toLocaleString() + '원' : '');
  set('dnu_cost', dnuCost  ? dnuCost.toLocaleString() + '원' : '');
  set('profit',   profit   ? profit.toLocaleString() + '원' : '');
  set('prf_rate', adc > 0  ? prfRate.toFixed(1) + '%' : '');
  set('cvr',      inflow > 0 ? cvr.toFixed(1) + '%' : '');
}

function calcReg() {
  const s=+document.getElementById('r_sched').value||0, sv=+document.getElementById('r_svc').value||0,
        u=+document.getElementById('r_sellUnit').value||0, d=+document.getElementById('r_disc').value||0,
        c=+document.getElementById('r_comm').value||0, ag=+document.getElementById('r_agrate').value||0;
  const sellBillBase = document.getElementById('r_sellBillBase')?.value || 'actual';
  const buyBillBase  = document.getElementById('r_buyBillBase')?.value  || 'actual';
  const _rBillQty = (base) => base === 'sched' ? (s - sv) : (s - sv); // 등록 시 actual 미입력이므로 예약수량으로 미리보기
  const sellBill = _rBillQty(sellBillBase);
  const buyBill  = _rBillQty(buyBillBase);
  const eu   = d > 0 ? d : u;
  const buyU = u ? Math.round(u * (1 - c / 100)) : 0;
  const rBuyEl = document.getElementById('r_buyUnit');
  if (rBuyEl && !rBuyEl.dataset.manual) rBuyEl.value = u ? buyU : '';
  const curBuyU = rBuyEl?.dataset.manual ? (+rBuyEl.value || buyU) : buyU;
  const bill = sellBill;
  const adc  = bill * u;
  const real = bill * eu;
  const rAdcEl = document.getElementById('r_adcost');
  if (rAdcEl && !rAdcEl.dataset.manual) rAdcEl.value = adc || '';
  const rAmtEl = document.getElementById('r_amt');
  if (rAmtEl && !rAmtEl.dataset.manual) rAmtEl.value = real || '';
  const curAdc  = rAdcEl?.dataset.manual  ? (+rAdcEl.value  || adc)  : adc;
  const curReal = rAmtEl?.dataset.manual  ? (+rAmtEl.value  || real) : real;
  const buyAmt = curBuyU * buyBill;
  const rBuyAmtEl = document.getElementById('r_buyAmt');
  if (rBuyAmtEl && !rBuyAmtEl.dataset.manual) rBuyAmtEl.value = buyBill ? buyAmt : '';
  const rev  = curReal - buyAmt;
  const agf  = curReal * (ag / 100);
  const prf  = rev - agf;
  const rRevEl = document.getElementById('r_rev');
  if (rRevEl && !rRevEl.dataset.manual) rRevEl.value = rev || '';
  const rPrfEl = document.getElementById('r_profit');
  if (rPrfEl && !rPrfEl.dataset.manual) rPrfEl.value = prf || '';
  const billHint = document.querySelector('#r_bill + .form-hint');
  if (billHint) billHint.textContent = sellBillBase === 'sched' ? '발송예약수량 − 서비스수량' : '실발송수량 − 서비스수량 (실발송 입력 후 확정)';
  document.getElementById('r_bill').value = s ? bill.toLocaleString()+'건' : '';
}
function _calcDAByPrefix(p) {
  const g      = id => +document.getElementById(p + id)?.value || 0;
  const getRaw = id => { const el = document.getElementById(p + id); return el ? el.value.trim() : ''; };
  const set    = (id, v) => { const el = document.getElementById(p + id); if (el) el.value = v; };
  const adc  = g('adcost');
  const comm = g('comm');
  const ag   = g('agrate');
  // 매입단가: 사용자 입력값 있으면 유지, 비어있으면 자동계산
  let buyUnit;
  if (getRaw('buyUnit') === '') {
    buyUnit = adc ? Math.round(adc * (1 - comm / 100)) : 0;
    set('buyUnit', buyUnit || '');
  } else {
    buyUnit = g('buyUnit');
  }
  const rev = adc ? (adc - buyUnit) : 0;
  const agf = adc ? Math.round(adc * ag / 100) : 0;
  const prf = rev - agf;
  set('rev',    adc ? rev.toLocaleString() + '원' : '');
  set('profit', adc ? prf.toLocaleString() + '원' : '');
}
function calcDA()     { _calcDAByPrefix('r_da_'); }
function calcDAEdit() { _calcDAByPrefix('e_da_'); }
function _calcCPAByPrefix(p) {
  const g        = id => +document.getElementById(p + id)?.value || 0;
  const set      = (id, v) => { const el = document.getElementById(p + id); if (el) el.value = v; };
  const setAuto  = (id, v) => { const el = document.getElementById(p + id); if (el && !el.dataset.manual) el.value = v; };
  const isManual = id => !!document.getElementById(p + id)?.dataset.manual;
  const qty  = g('qty');   // 등록폼: 0 (필드 없음), 수정폼: 실제값
  const unit = g('unit');
  const comm = g('comm');
  const ag   = g('agrate');
  // 광고비: manual이면 유지, 아니면 qty×unit
  const adcAuto = qty * unit;
  const adc     = isManual('adcost') ? g('adcost') : adcAuto;
  setAuto('adcost', adcAuto || '');
  set('bill', adc ? adc.toLocaleString() + '원' : '');  // bill은 항상 readonly text
  // 매입단가: manual이면 유지, 아니면 unit×(1-comm%)
  const buyUnitEl = document.getElementById(p + 'buyUnit');
  const buyUnit   = buyUnitEl?.dataset.manual ? (+buyUnitEl.value || 0) : (unit ? Math.round(unit * (1 - comm / 100)) : 0);
  setAuto('buyUnit', buyUnit || '');
  // 매입액: manual이면 유지, 아니면 buyUnit×qty
  const autoBuyAmt = buyUnit * qty;
  const buyAmt     = isManual('buyAmt') ? g('buyAmt') : autoBuyAmt;
  setAuto('buyAmt', autoBuyAmt || '');
  // 매출수익: manual이면 유지, 아니면 adc×comm%
  const revAuto = adc ? Math.round(adc * comm / 100) : 0;
  const rev     = isManual('rev') ? g('rev') : revAuto;
  setAuto('rev', revAuto || '');
  // 이익: manual이면 유지, 아니면 자동계산
  const agf       = adc ? Math.round(adc * ag / 100) : 0;
  const useActual = isManual('buyAmt') || !!buyUnitEl?.dataset.manual;
  const prfAuto   = adc ? (useActual ? (adc - buyAmt - agf) : (rev - agf)) : 0;
  setAuto('profit', adc ? prfAuto : '');
}
function calcCPA() { _calcCPAByPrefix('r_cpa_'); }
function calcCPAEdit() {
  const qty  = +document.getElementById('e_cpa_qty')?.value    || 0;
  const unit = +document.getElementById('e_cpa_unit')?.value   || 0;
  const comm = +document.getElementById('e_cpa_comm')?.value   || 0;
  const ag   = +document.getElementById('e_cpa_agrate')?.value || 0;
  const isManual = id => !!document.getElementById(id)?.dataset.manual;
  const adc           = qty * unit;
  const buyUnitEl     = document.getElementById('e_cpa_buyUnit');
  const buyUnit       = buyUnitEl?.dataset.manual ? (+buyUnitEl.value || 0) : (unit ? Math.round(unit * (1 - comm / 100)) : 0);
  const autoBuyAmt    = buyUnit * qty;
  const buyAmt     = isManual('e_cpa_buyAmt') ? (+document.getElementById('e_cpa_buyAmt').value || 0) : autoBuyAmt;
  const rev        = adc ? Math.round(adc * comm / 100) : 0;
  const agf        = adc ? Math.round(adc * ag   / 100) : 0;
  const useActual  = isManual('e_cpa_buyAmt') || !!buyUnitEl?.dataset.manual;
  const prf        = useActual ? (adc - buyAmt - agf) : (rev - agf);
  const setAuto = (id, v) => { const el = document.getElementById(id); if (el && !el.dataset.manual) el.value = v !== '' ? v : ''; };
  setAuto('e_cpa_adcost',  adc        || '');
  setAuto('e_cpa_buyUnit', buyUnit    || '');
  setAuto('e_cpa_buyAmt',  autoBuyAmt || '');
  setAuto('e_cpa_rev',     rev        || '');
  setAuto('e_cpa_profit',  adc ? prf  : '');
  const adcFinal = isManual('e_cpa_adcost') ? (+document.getElementById('e_cpa_adcost').value || adc) : adc;
  const billEl = document.getElementById('e_cpa_bill');
  if (billEl) billEl.value = adcFinal ? adcFinal.toLocaleString() + '원' : '';
}
function calcDaPerf() {
  const imp    = +document.getElementById('p_imp')?.value    || 0;
  const click  = +document.getElementById('p_da_click')?.value || 0;
  const conv   = +document.getElementById('p_conv')?.value   || 0;
  const rev    = +document.getElementById('p_da_rev')?.value  || 0;
  const c = DATA[currentDetailIdx];
  const adcost = c ? (c.daAdcost || 0) : 0;

  const ctr  = imp   ? (click / imp * 100).toFixed(2) + '%'          : '—';
  const cpa  = conv  ? Math.round(adcost / conv).toLocaleString() + '원' : '—';
  const roas = adcost ? Math.round(rev / adcost * 100).toLocaleString() + '%' : '—';

  document.getElementById('p_da_ctr').value  = ctr;
  document.getElementById('p_da_cpa').value  = cpa;
  document.getElementById('p_da_roas').value = roas;
}

function calcCTR() {
  const a=+document.getElementById('p_actual').value||0, cl=+document.getElementById('p_click').value||0;
  document.getElementById('p_ctr').value = (a&&cl)?(cl/a*100).toFixed(2)+'%':'';
}
function calcDBR() {
  const a=+document.getElementById('p_actual').value||0, db=+document.getElementById('p_db').value||0;
  document.getElementById('p_dbr').value = (a&&db)?(db/a*100).toFixed(2)+'%':'';
}
function submitReg() {
  // 필수 항목 검증
  const prod  = document.getElementById('r_product').value;
  const isDA  = prod === 'DA';
  const isPC  = prod === '퍼미션콜';
  const isCPA = prod === 'CPA';
  const REQ_FIELDS = isDA ? [
    { id:'r_product',    label:'상품' },
    { id:'r_media',      label:'매체사',  focusId:'r_media_text' },
    { id:'r_seller',     label:'매출처',  focusId:'r_seller_text' },
    { id:'r_da_adcost',  label:'광고비' },
  ] : isPC ? [
    { id:'r_product',     label:'상품' },
    { id:'r_seller',      label:'매출처',  focusId:'r_seller_text' },
    { id:'r_pc_adv_unit', label:'광고주단가' },
  ] : isCPA ? [
    { id:'r_product',  label:'상품' },
    { id:'r_media',    label:'매체사',  focusId:'r_media_text' },
    { id:'r_seller',   label:'매출처',  focusId:'r_seller_text' },
    { id:'r_cpa_unit', label:'정산단가' },
  ] : [
    { id:'r_product', label:'상품' },
    { id:'r_date',    label:'발송일시' },
    { id:'r_media',   label:'매체사',  focusId:'r_media_text' },
    { id:'r_seller',  label:'매출처',  focusId:'r_seller_text' },
    { id:'r_sched',   label:'발송예약수량' },
    { id:'r_target',  label:'타겟조건' },
    { id:'r_msg',     label:'발송문구' },
  ];
  for (const f of REQ_FIELDS) {
    const el = document.getElementById(f.id);
    if (!el || !el.value || el.value === '0') {
      toast(`⚠ '${f.label}'을(를) 입력해주세요`, 'warn');
      (document.getElementById(f.focusId || f.id) || el)?.focus();
      return;
    }
  }

  // 시간 검증 (LMS/MMS/push/카톡msg는 00:00 불가)
  const TIME_REQUIRED = ['LMS','MMS','push','카톡msg'];
  if (TIME_REQUIRED.includes(prod)) {
    const _dt = _getDateTime('r');
    if (!_dt || _dt.endsWith('00:00')) {
      toast('⚠ 시간을 설정해주세요', 'warn');
      document.getElementById('r_hour')?.focus();
      return;
    }
  }

  // 광고주/대행사 등록 여부 검증
  const _rSellerVal = document.getElementById('r_seller').value;
  if (_rSellerVal && !SELLER_DATA.some(s => s.company === _rSellerVal)) {
    toast('⚠ 신규 광고주/대행사를 추가해주세요', 'warn');
    document.getElementById('r_seller_text').focus();
    return;
  }
  // 브랜드 등록 여부 검증
  const _rContentVal = document.getElementById('r_content').value.trim();
  if (_rContentVal) {
    const _rSellerObj = SELLER_DATA.find(s => s.company === _rSellerVal);
    const _rBrands = _rSellerObj ? (_rSellerObj.brands || []) : [];
    if (!_rBrands.some(b => (b.name || b) === _rContentVal)) {
      toast('⚠ 신규 브랜드를 추가해주세요', 'warn');
      document.getElementById('r_content_text').focus();
      return;
    }
  }

  const newId = 'C-2026-' + String(_nextCampaignNum++).padStart(4, '0');
  const _rYear  = document.getElementById('r_da_year').value;
  const _rMonth = document.getElementById('r_da_month').value;
  const _rDay   = isDA ? (document.getElementById('r_da_day').value  || '01') : '01';
  const dateVal = (isDA || isPC || isCPA)
    ? `${_rYear}-${_rMonth}-${_rDay} 00:00`
    : _getDateTime('r');
  const now = new Date();
  const regDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  DATA.unshift({
    id:       newId,
    regDate:  regDate,
    promo:    document.getElementById('r_adpromo').value,
    cat:      document.getElementById('r_cat').value,
    date:     dateVal ? dateVal.replace('T', ' ') : '',
    media:    document.getElementById('r_media').value,
    product:  document.getElementById('r_product').value,
    clicks:   null, ctr: null,
    status:   isDA ? '성과입력대기' : (isPC ? '성과입력완료' : (isCPA ? '성과입력대기' : '부킹확정')),
    testOk:   false, sent: false,
    regUser:  currentUser ? currentUser.id : '',
    seller:   document.getElementById('r_seller').value,
    content:  document.getElementById('r_content').value || document.getElementById('r_content_text').value,
    adv:      document.getElementById('r_seller').value,
    ops:      document.getElementById('r_ops').value,
    dept:     _getDeptByName(document.getElementById('r_ops').value) || [currentUser?.bonbu, currentUser?.dept].filter(Boolean).join(' ') || '',
    sellUnit:  isCPA ? (+document.getElementById('r_cpa_unit').value || 0) : (+document.getElementById('r_sellUnit').value || 0),
    qty:       isCPA ? 0 : (+document.getElementById('r_sched').value || 0),
    svc:       isCPA ? 0 : (+document.getElementById('r_svc').value  || 0),
    disc:      isCPA ? 0 : (+document.getElementById('r_disc').value || 0),
    billBase:  isDA  ? 'da' : (isCPA ? (document.getElementById('r_cpa_billbase')?.value || '') : 'actual'), // 하위호환용
    sellBillBase: isDA || isPC || isCPA ? '' : (document.getElementById('r_sellBillBase')?.value || 'actual'),
    buyBillBase:  isDA || isPC || isCPA ? '' : (document.getElementById('r_buyBillBase')?.value  || 'actual'),
    comm:      isDA  ? (+document.getElementById('r_da_comm')?.value   || 0) : (isCPA ? (+document.getElementById('r_cpa_comm')?.value  || 0) : (+document.getElementById('r_comm').value  || 0)),
    buyUnit:   isDA  ? (+document.getElementById('r_da_buyUnit')?.value || 0)
                     : (isCPA ? (document.getElementById('r_cpa_buyUnit')?.dataset.manual ? (+document.getElementById('r_cpa_buyUnit').value || 0) : Math.round((+document.getElementById('r_cpa_unit').value || 0) * (1 - (+document.getElementById('r_cpa_comm')?.value || 0) / 100)))
                              : (+document.getElementById('r_buyUnit').value || 0)),
    adcostFixed:  isCPA
      ? (document.getElementById('r_cpa_adcost')?.dataset.manual ? (+document.getElementById('r_cpa_adcost').value || 0) : 0)
      : (!isDA && !isPC && document.getElementById('r_adcost')?.dataset.manual ? (+document.getElementById('r_adcost').value || 0) : 0),
    amtFixed:     (!isDA && !isPC && !isCPA && document.getElementById('r_amt')?.dataset.manual)     ? (+document.getElementById('r_amt').value     || 0) : 0,
    buyAmtFixed:  isCPA
      ? (document.getElementById('r_cpa_buyAmt')?.dataset.manual ? (+document.getElementById('r_cpa_buyAmt').value || 0) : 0)
      : (!isDA && !isPC && document.getElementById('r_buyAmt')?.dataset.manual ? (+document.getElementById('r_buyAmt').value || 0) : 0),
    revFixed:     isCPA
      ? (document.getElementById('r_cpa_rev')?.dataset.manual ? (+document.getElementById('r_cpa_rev').value || 0) : 0)
      : (!isDA && !isPC && document.getElementById('r_rev')?.dataset.manual ? (+document.getElementById('r_rev').value || 0) : 0),
    profitFixed:  isCPA
      ? (document.getElementById('r_cpa_profit')?.dataset.manual ? (+document.getElementById('r_cpa_profit').value || 0) : 0)
      : (!isDA && !isPC && document.getElementById('r_profit')?.dataset.manual ? (+document.getElementById('r_profit').value || 0) : 0),
    agrate:    isDA  ? (+document.getElementById('r_da_agrate')?.value || 0) : (isCPA ? (+document.getElementById('r_cpa_agrate')?.value || 0) : (+document.getElementById('r_agrate').value || 0)),
    dateEnd:   isDA  ? `${document.getElementById('r_da_eyear').value}-${document.getElementById('r_da_emonth').value}-${document.getElementById('r_da_eday').value}` : '',
    daAdcost:  isDA  ? (+document.getElementById('r_da_adcost').value  || 0) : 0,
    daBillBase: isDA ? (document.getElementById('r_da_billbase')?.value || '') : '',
    daFeeYn:   isDA  ? (document.getElementById('r_da_fee_yn')?.value   || '') : '',
    cpaFeeYn:  isCPA ? (document.getElementById('r_cpa_fee_yn')?.value  || '') : '',
    daImage:  isDA ? [..._daImagesBase64] : [],
    pcAdvUnit: isPC ? (+document.getElementById('r_pc_adv_unit').value  || 0) : 0,
    pcOhcCost: isPC ? (+document.getElementById('r_pc_ohc_cost').value  || 0) : 0,
    pcDnuUnit: isPC ? 5500 : 0,
    pcInflow:  isPC ? (+document.getElementById('r_pc_inflow').value   || 0) : 0,
    pcAgree:   isPC ? (+document.getElementById('r_pc_agree').value    || 0) : 0,
    target:   document.getElementById('r_target').value,
    dtarget:  document.getElementById('r_dtarget').value,
    msg:      document.getElementById('r_msg').value,
    note:     document.getElementById('r_note').value,
  });
  _log(newId, 'register', null, null, null); // 이력: 캠페인 등록
  _fbSaveCampaign(DATA[0]);

  // 파이프라인 전환 후처리
  if (_pendingPipelineConvertId) {
    const pc = PIPELINE_DATA.find(x => x.id === _pendingPipelineConvertId);
    if (pc) { pc.archived = true; pc.convertedCampaignId = newId; _fbSavePipeline(pc); }
    _pendingPipelineConvertId = null;
    const _newCamDate = DATA[0].date ? DATA[0].date.slice(0,10) : '';
    closeModal('modalReg');
    resetRegForm();
    resetFilter();
    if (_newCamDate) {
      const _ff = document.getElementById('fFrom');
      const _ft = document.getElementById('fTo');
      if (_ff && _newCamDate < _ff.value) _ff.value = _newCamDate;
      if (_ft && _newCamDate > _ft.value) _ft.value = _newCamDate;
    }
    openDetail(0);
    toast('✓ 캠페인으로 전환되었습니다', 'ok');
    return;
  }

  const _newCamDate = DATA[0].date ? DATA[0].date.slice(0,10) : '';
  closeModal('modalReg');
  resetRegForm();
  // 필터 초기화 → 새 캠페인이 목록/캘린더에 바로 표시되도록
  resetFilter();
  if (_newCamDate) {
    const _ff = document.getElementById('fFrom');
    const _ft = document.getElementById('fTo');
    if (_ff && _newCamDate < _ff.value) _ff.value = _newCamDate;
    if (_ft && _newCamDate > _ft.value) _ft.value = _newCamDate;
  }
  openDetail(0);
  toast('✓ 캠페인이 등록되었습니다', 'ok');
}

function openRegModal(dateStr) {
  resetRegForm();
  openModal('modalReg');
  if (currentUser) { setSelectVal('r_ops', currentUser.name); }
  const rDateEl = document.getElementById('r_date');
  if (rDateEl) {
    rDateEl.min = '';
    if (dateStr) rDateEl.value = dateStr;
  }
}

function resetRegForm() {
  const rCat = document.getElementById('r_cat'); if (rCat) rCat.value = '';
  ['r_product'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  const rOps = document.getElementById('r_ops'); if (rOps) rOps.selectedIndex = 0;
  // 콤보박스 초기화
  ['seller','content','media'].forEach(name => {
    const cfg = _comboConfig(name);
    const textEl = document.getElementById(cfg.textId);
    const hiddenEl = document.getElementById(cfg.hiddenId);
    const listEl = document.getElementById(cfg.listId);
    if (textEl) textEl.value = '';
    if (hiddenEl) hiddenEl.value = '';
    if (listEl) listEl.style.display = 'none';
  });
  const rHour = document.getElementById('r_hour'); if (rHour) rHour.selectedIndex = 0;
  const rMin  = document.getElementById('r_min');  if (rMin)  rMin.selectedIndex  = 0;
  const rDaAdcost = document.getElementById('r_da_adcost'); if (rDaAdcost) rDaAdcost.value = '';
  ['r_pc_adv_unit','r_pc_ohc_unit','r_pc_dnu_unit','r_pc_inflow','r_pc_agree',
   'r_pc_adc','r_pc_ohc_cost','r_pc_dnu_cost','r_pc_profit','r_pc_prf_rate','r_pc_cvr']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _daImagesBase64 = [];
  _daRenderGrid('r_da_preview_grid', _daImagesBase64);
  onRegProductChange();
  ['r_promo','r_adpromo','r_date','r_sched','r_svc','r_sellUnit','r_buyUnit','r_disc','r_comm','r_agrate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const rSellBB = document.getElementById('r_sellBillBase');
  const rBuyBB  = document.getElementById('r_buyBillBase');
  if (rSellBB) rSellBB.value = 'actual';
  if (rBuyBB)  rBuyBB.value  = 'actual';
  ['r_bill','r_amt','r_adcost','r_buyAmt','r_rev','r_profit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; delete el.dataset.manual; }
  });
  ['r_target','r_dtarget','r_msg','r_note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// 날짜+시간 셀렉트 → "YYYY-MM-DD HH:MM" 문자열 조합
function _getDateTime(prefix) {
  const date = document.getElementById(prefix + '_date').value;
  if (!date) return '';
  const h = parseInt(document.getElementById(prefix + '_hour').value) || 0;
  const m = document.getElementById(prefix + '_min').value;
  return `${date} ${String(h).padStart(2,'0')}:${m}`;
}

// "YYYY-MM-DD HH:MM" 문자열 → 날짜+시간 셀렉트 세팅
function _setDateTime(prefix, dtStr) {
  if (!dtStr) return;
  const [datePart, timePart] = dtStr.replace('T',' ').split(' ');
  document.getElementById(prefix + '_date').value = datePart || '';
  if (!timePart) return;
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr) || 0;
  const mRaw = parseInt(mStr) || 0;
  const m = String(Math.min(50, Math.round(mRaw / 10) * 10)).padStart(2, '0');
  document.getElementById(prefix + '_hour').value = String(h);
  document.getElementById(prefix + '_min').value = m;
}

function confirmRegDate() {
  const el = document.getElementById('r_date');
  if (!el.value) { toast('⚠ 발송일시를 선택해주세요', 'warn'); return; }
  el.blur();
  document.getElementById('r_media_text').focus();
  toast('✓ 발송일시가 설정되었습니다', 'ok');
}

function openCopyCampaign() {
  const c = DATA[currentDetailIdx];
  if (!c) return;

  const isDA  = c.product === 'DA';
  const isPC  = c.product === '퍼미션콜';
  const isCPA = c.product === 'CPA';

  // 1. 폼 초기화 후 제품 유형 설정 (섹션 표시 변경)
  resetRegForm();
  setSelectVal('r_product', c.product);
  onRegProductChange();

  // 2. 콤보박스 세팅 헬퍼
  const _setCombo = (name, val) => {
    const cfg = _comboConfig(name);
    const textEl   = document.getElementById(cfg.textId);
    const hiddenEl = document.getElementById(cfg.hiddenId);
    if (textEl)   textEl.value   = val || '';
    if (hiddenEl) hiddenEl.value = val || '';
  };

  // 3. 공통 필드 복사 (날짜·시간은 제외)
  const _set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  _set('r_cat',     c.cat);
  _set('r_adpromo', c.promo);
  setSelectVal('r_ops', c.ops || (currentUser ? currentUser.name : ''));

  // 매출처·브랜드·매체 콤보
  _setCombo('seller',  c.seller || c.adv);
  _set('r_content',      c.content || '');
  _set('r_content_text', c.content || '');
  _setCombo('media',   c.media);

  // 금액·수량·수수료 (공통)
  _set('r_sellBillBase', c.sellBillBase || c.billBase || 'actual');
  _set('r_buyBillBase',  c.buyBillBase  || c.billBase || 'actual');
  _set('r_sched',   c.qty      || '');
  _set('r_svc',     c.svc      || '');
  _set('r_disc',    c.disc     || '');
  _set('r_sellUnit', c.sellUnit || '');
  _set('r_buyUnit',  c.buyUnit  || '');
  _set('r_comm',    c.comm     || '');
  _set('r_agrate',  c.agrate   || '');

  // 고정값 (manual)
  const _setManual = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val) { el.value = val; el.dataset.manual = '1'; }
    else { el.value = ''; delete el.dataset.manual; }
  };
  _setManual('r_adcost', c.adcostFixed || 0);
  _setManual('r_amt',    c.amtFixed    || 0);
  _setManual('r_buyAmt', c.buyAmtFixed || 0);
  _setManual('r_rev',    c.revFixed    || 0);
  _setManual('r_profit', c.profitFixed || 0);

  // 타겟·메시지·메모
  _set('r_target',  c.target);
  _set('r_dtarget', c.dtarget);
  _set('r_msg',     c.msg);
  _set('r_note',    c.note);

  // 4. 상품별 전용 필드
  if (isDA) {
    // DA: 날짜는 초기화(연도/월만 현재값 유지), 광고비·수수료 복사
    _set('r_da_adcost',   c.daAdcost   || '');
    _set('r_da_billbase', c.daBillBase || 'CPP');
    _set('r_da_fee_yn',   c.daFeeYn   || '포함');
    _set('r_da_comm',     c.comm       || '');
    _set('r_da_agrate',   c.agrate     || '');
    _set('r_da_buyUnit',  c.buyUnit    || '');
    // DA 이미지는 복사하지 않음 (새 캠페인 용도)
    _daImagesBase64 = [];
    _daRenderGrid('r_da_preview_grid', _daImagesBase64);
  } else if (isPC) {
    _set('r_pc_adv_unit', c.pcAdvUnit || '');
    _set('r_pc_ohc_cost', c.pcOhcCost || '');
    _set('r_pc_inflow',   c.pcInflow  || '');
    _set('r_pc_agree',    c.pcAgree   || '');
  } else if (isCPA) {
    _set('r_cpa_unit',     c.sellUnit  || '');
    _set('r_cpa_billbase', c.billBase  || '신청수');
    _set('r_cpa_fee_yn',   c.cpaFeeYn  || '포함');
    _set('r_cpa_comm',     c.comm      || '');
    _set('r_cpa_agrate',   c.agrate    || '');
  }

  // 5. 모달 열기
  openModal('modalReg');
  toast('📋 캠페인 정보를 불러왔습니다. 날짜를 입력해주세요.', 'ok');
}

function openEdit() {
  document.querySelector('.topbar').style.display = 'none';
  const c = DATA[currentDetailIdx];
  document.getElementById('eId').textContent = c.id;
  document.getElementById('eId2').textContent = c.id;
  const authorEl = document.getElementById('e-author');
  if (authorEl) authorEl.textContent = c.ops || '—';
  document.getElementById('e_cat').value = c.cat || '';
  setSelectVal('e_product', c.product);
  setSelectVal('e_ops', c.ops);
  _setDateTime('e', c.date);
  // 콤보박스: hidden + text 동시 세팅
  const _setCombo = (name, val) => {
    const cfg = _comboConfig(name);
    document.getElementById(cfg.hiddenId).value = val;
    document.getElementById(cfg.textId).value   = val;
  };
  _setCombo('e_media',  c.media);
  document.getElementById('e_adpromo').value = c.promo || '';
  // 매출처 콤보: 브랜드명_회사명 형식으로 표시, hidden에는 회사명만 저장
  const _sellerCompany = c.seller || c.adv || '';
  const _sellerBrand   = c.content || '';
  const _eSCfg = _comboConfig('e_seller');
  document.getElementById(_eSCfg.hiddenId).value = _sellerCompany;
  document.getElementById(_eSCfg.textId).value   = _sellerCompany;
  document.getElementById('e_content').value      = _sellerBrand;
  document.getElementById('e_content_text').value = _sellerBrand;
  autoNameEdit();
  document.getElementById('e_qty').value    = c.qty    || '';
  document.getElementById('e_svc').value    = c.svc    || '';
  const eSellBillBase = document.getElementById('e_sellBillBase');
  const eBuyBillBase  = document.getElementById('e_buyBillBase');
  if (eSellBillBase) eSellBillBase.value = c.sellBillBase || c.billBase || 'actual';
  if (eBuyBillBase)  eBuyBillBase.value  = c.buyBillBase  || c.billBase || 'actual';
  document.getElementById('e_sellUnit').value = c.sellUnit || '';
  // adcostFixed / amtFixed: 수동 입력값 복원
  const _restoreManual = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (val) { el.value = val; el.dataset.manual = '1'; }
    else { el.value = ''; delete el.dataset.manual; }
  };
  // e_buyUnit은 calcEdit()에서 항상 재계산 (수동 입력 초기화)
  const eBuyUnitEl = document.getElementById('e_buyUnit');
  if (eBuyUnitEl) { eBuyUnitEl.value = ''; delete eBuyUnitEl.dataset.manual; }
  _restoreManual('e_adcost',  c.adcostFixed  || 0);
  _restoreManual('e_billamt', c.amtFixed     || 0);
  _restoreManual('e_buyAmt',  c.buyAmtFixed  || 0);
  _restoreManual('e_rev',     c.revFixed     || 0);
  _restoreManual('e_profit',  c.profitFixed  || 0);
  document.getElementById('e_disc').value   = c.disc   || '';
  document.getElementById('e_comm').value   = c.comm   || '';
  document.getElementById('e_agrate').value = c.agrate || '';
  document.getElementById('e_target').value  = c.target  || '';
  document.getElementById('e_dtarget').value = c.dtarget || '';
  document.getElementById('e_msg').value     = c.msg     || '';
  document.getElementById('e_note').value   = c.note   || '';

  // DA / 퍼미션콜 vs 일반 수정 화면 토글
  const isEditDA  = c.product === 'DA';
  const isEditPC  = c.product === '퍼미션콜';
  const isEditCPA = c.product === 'CPA';
  const useMonthPicker = isEditDA || isEditPC || isEditCPA;
  document.getElementById('e_date_normal').style.display      = useMonthPicker ? 'none' : '';
  document.getElementById('e_date_da').style.display          = useMonthPicker ? '' : 'none';
  document.getElementById('e_card_qty').style.display         = (isEditDA || isEditPC || isEditCPA) ? 'none' : '';
  document.getElementById('e_card_da_adcost').style.display   = isEditDA  ? '' : 'none';
  const eMsgSec   = document.getElementById('e_msg_section');
  const eDaImgSec = document.getElementById('e_da_img_section');
  const eCardPC   = document.getElementById('e_card_pc');
  const eCardCPA  = document.getElementById('e_card_cpa');
  if (eMsgSec)   eMsgSec.style.display   = (isEditDA || isEditPC || isEditCPA) ? 'none' : '';
  if (eDaImgSec) eDaImgSec.style.display = isEditDA  ? '' : 'none';
  if (eCardPC)   eCardPC.style.display   = isEditPC  ? '' : 'none';
  if (eCardCPA)  eCardCPA.style.display  = isEditCPA ? '' : 'none';
  if (isEditDA) {
    const dateParts = (c.date || '').split('-');
    const eDAYear  = document.getElementById('e_da_year');
    const eDAMonth = document.getElementById('e_da_month');
    const eDADay   = document.getElementById('e_da_day');
    if (eDAYear  && dateParts[0]) eDAYear.value  = dateParts[0];
    if (eDAMonth && dateParts[1]) eDAMonth.value = dateParts[1];
    if (eDADay   && dateParts[2]) eDADay.value   = dateParts[2].split(' ')[0].padStart(2,'0');
    const endParts = (c.dateEnd || '').split('-');
    const eDAEYear  = document.getElementById('e_da_eyear');
    const eDAEMonth = document.getElementById('e_da_emonth');
    const eDAEDay   = document.getElementById('e_da_eday');
    if (eDAEYear  && endParts[0]) eDAEYear.value  = endParts[0];
    if (eDAEMonth && endParts[1]) eDAEMonth.value = endParts[1];
    if (eDAEDay   && endParts[2]) eDAEDay.value   = endParts[2].padStart(2,'0');
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    setEl('e_da_adcost',  c.daAdcost  || '');
    setEl('e_da_billbase', c.daBillBase || 'CPP');
    setEl('e_da_fee_yn',  c.daFeeYn   || '포함');
    setEl('e_da_comm',    c.comm      || '');
    setEl('e_da_agrate',  c.agrate    || '');
    setEl('e_da_buyUnit', c.buyUnit   || '');
    calcDAEdit();
    // 구버전(string) · 신버전(array) 모두 호환
    _daEditImagesBase64 = Array.isArray(c.daImage) ? [...c.daImage] : (c.daImage ? [c.daImage] : []);
    _daRenderGrid('e_da_preview_grid', _daEditImagesBase64);
  }
  if (isEditPC) {
    const dateParts = (c.date || '').split('-');
    const eDAYear  = document.getElementById('e_da_year');
    const eDAMonth = document.getElementById('e_da_month');
    if (eDAYear  && dateParts[0]) eDAYear.value  = dateParts[0];
    if (eDAMonth && dateParts[1]) eDAMonth.value = dateParts[1];
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    setEl('e_pc_adv_unit', c.pcAdvUnit || '');
    setEl('e_pc_ohc_cost', c.pcOhcCost || '');
    setEl('e_pc_inflow',   c.pcInflow  || '');
    setEl('e_pc_agree',    c.pcAgree   || '');
    calcPC('e');
  }
  if (isEditCPA) {
    const dateParts = (c.date || '').split('-');
    const eDAYear  = document.getElementById('e_da_year');
    const eDAMonth = document.getElementById('e_da_month');
    if (eDAYear  && dateParts[0]) eDAYear.value  = dateParts[0];
    if (eDAMonth && dateParts[1]) eDAMonth.value = dateParts[1];
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    setEl('e_cpa_qty',      c.qty       || '');
    setEl('e_cpa_unit',     c.sellUnit  || '');
    setEl('e_cpa_billbase', c.billBase  || '신청수');
    setEl('e_cpa_fee_yn',   c.cpaFeeYn  || '포함');
    setEl('e_cpa_comm',     c.comm      || '');
    setEl('e_cpa_agrate',   c.agrate    || '');
    // 수기입력 고정값 복원 (있으면 manual 표시, 없으면 자동계산)
    const _restoreCpaManual = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (val) { el.value = val; el.dataset.manual = '1'; }
      else     { el.value = ''; delete el.dataset.manual; }
    };
    _restoreCpaManual('e_cpa_adcost',  c.adcostFixed  || 0);
    const calcBuyUnit = Math.round((c.sellUnit || 0) * (1 - (c.comm || 0) / 100));
    _restoreCpaManual('e_cpa_buyUnit', c.buyUnit !== calcBuyUnit ? c.buyUnit : 0);
    _restoreCpaManual('e_cpa_buyAmt',  c.buyAmtFixed  || 0);
    _restoreCpaManual('e_cpa_rev',     c.revFixed     || 0);
    _restoreCpaManual('e_cpa_profit',  c.profitFixed  || 0);
    calcCPAEdit();
  }

  // 2차 성과 카드 표시 & 값 로드
  const ePerfCard = document.getElementById('e_card_perf');
  const epNormal  = document.getElementById('ep_normal');
  const epDA      = document.getElementById('ep_da');
  if (ePerfCard) {
    const showPerf = !isEditPC;
    ePerfCard.style.display = showPerf ? '' : 'none';
    if (showPerf) {
      if (epNormal) epNormal.style.display = isEditDA ? 'none' : '';
      if (epDA)     epDA.style.display     = isEditDA ? '' : 'none';
      // CPA: 2차성과 '실발송수량' → '노출수'
      const _lbl = isEditCPA ? '노출수' : '실발송수량';
      const _pa = document.getElementById('perfActualLbl'); if (_pa) _pa.textContent = _lbl;
      const _ea = document.querySelector('#ep_normal .fg:first-child .form-label'); if (_ea) _ea.textContent = _lbl;
      const _eh = document.querySelector('#ep_ctr ~ .form-hint'); if (_eh) _eh.textContent = isEditCPA ? '클릭수 ÷ 노출수 × 100' : '클릭수 ÷ 실발송 × 100';
      const setEp = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
      if (isEditDA) {
        setEp('ep_imp',      c.daImp);
        setEp('ep_da_click', c.daClick);
        setEp('ep_conv',     c.daConv);
        setEp('ep_da_rev',   c.daRev);
        epCalcDA();
      } else {
        setEp('ep_actual', c.actual);
        setEp('ep_click',  c.clicks);
        setEp('ep_ctr',    c.ctr);
        setEp('ep_db',     c.db);
        setEp('ep_dbr',    c.dbr);
        epCalcCTR();
        epCalcDBR();
      }
    }
  }

  calcEdit();
  // 성과 카드 최종 표시 확정 (calcEdit 이후 덮어쓰기 방지)
  const _ePerfFinal = document.getElementById('e_card_perf');
  if (_ePerfFinal) _ePerfFinal.style.display = isEditPC ? 'none' : '';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-edit').classList.add('active');
  history.pushState({ screen: 'edit', id: c.id }, '', '#edit/' + c.id);
  document.getElementById('breadcrumb').innerHTML =
    `<span onclick="goScreen('campaigns')" style="cursor:pointer;color:var(--text2);">캠페인 목록</span>
     <span class="sep">›</span>
     <span onclick="cancelEdit()" style="cursor:pointer;color:var(--text2);">${_cName(c)}</span>
     <span class="sep">›</span><span class="cur">수정</span>`;
}

function _getDeptByName(name) {
  const u = USERS.find(x => x.name === name);
  if (!u || (!u.bonbu && !u.dept)) return '';
  return [u.bonbu, u.dept].filter(Boolean).join(' ');
}

function setSelectVal(id, val) {
  const sel = document.getElementById(id);
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === val || sel.options[i].textContent === val) { sel.selectedIndex = i; return; }
  }
}

function calcEdit() {
  const s  = +document.getElementById('e_qty').value     || 0;
  const sv = +document.getElementById('e_svc').value     || 0;
  const u  = +document.getElementById('e_sellUnit').value || 0;
  const d  = +document.getElementById('e_disc').value    || 0;
  const c  = +document.getElementById('e_comm').value    || 0;
  const ag = +document.getElementById('e_agrate').value  || 0;
  const sellBillBase = document.getElementById('e_sellBillBase')?.value || 'actual';
  const buyBillBase  = document.getElementById('e_buyBillBase')?.value  || 'actual';
  // 수정 시 actual 값은 캠페인에서 가져옴 (currentDetailIdx 기준)
  const cActual = (DATA[currentDetailIdx]?.actual) || 0;
  const _eBillQty = (base) => base === 'sched' ? (s - sv) : (cActual ? cActual - sv : s - sv);
  const sellBill = _eBillQty(sellBillBase);
  const buyBill  = _eBillQty(buyBillBase);
  const eu   = d > 0 ? d : u;
  const buyU = u ? Math.round(u * (1 - c / 100)) : 0;
  const eBuyEl = document.getElementById('e_buyUnit');
  if (eBuyEl && !eBuyEl.dataset.manual) eBuyEl.value = u ? buyU : '';
  const curBuyU = eBuyEl?.dataset.manual ? (+eBuyEl.value || buyU) : buyU;
  const adc  = sellBill * u;
  const real = sellBill * eu;
  const eAdcEl = document.getElementById('e_adcost');
  if (eAdcEl && !eAdcEl.dataset.manual) eAdcEl.value = adc || '';
  const eBillAmt = document.getElementById('e_billamt');
  if (eBillAmt && !eBillAmt.dataset.manual) eBillAmt.value = real || '';
  const curAdc  = eAdcEl?.dataset.manual  ? (+eAdcEl.value  || adc)  : adc;
  const curReal = eBillAmt?.dataset.manual ? (+eBillAmt.value || real) : real;
  const buyAmtCalc = curBuyU * buyBill;
  const eBuyAmtEl = document.getElementById('e_buyAmt');
  if (eBuyAmtEl && !eBuyAmtEl.dataset.manual) eBuyAmtEl.value = buyBill ? buyAmtCalc : '';
  const rev  = curReal - buyAmtCalc;
  const agf  = curReal * (ag / 100);
  const prf  = rev - agf;
  document.getElementById('e_bill').value = s ? (sellBill).toLocaleString() + '건' : '';
  const eRevEl = document.getElementById('e_rev');
  if (eRevEl && !eRevEl.dataset.manual) eRevEl.value = rev || '';
  const ePrfEl = document.getElementById('e_profit');
  if (ePrfEl && !ePrfEl.dataset.manual) ePrfEl.value = prf || '';
}

function submitEdit() {
  document.querySelector('.topbar').style.display = '';
  const c = DATA[currentDetailIdx];
  // 변경 전 스냅샷 (이력용)
  const TRACK = ['promo','cat','date','media','product','seller','content','dept','ops','status','qty','svc','sellUnit','buyUnit','disc','comm','agrate','target','dtarget','msg','msgFinal','note','pcAdvUnit','pcOhcCost','pcInflow','pcAgree'];
  const snap = {};
  TRACK.forEach(k => { snap[k] = String(c[k] ?? ''); });

  c.promo    = document.getElementById('e_adpromo').value;
  c.cat      = document.getElementById('e_cat').value;
  c.product  = document.getElementById('e_product').value;
  c.ops      = document.getElementById('e_ops').value;
  c.media    = document.getElementById('e_media').value;
  c.seller   = document.getElementById('e_seller').value;
  c.content  = document.getElementById('e_content').value || document.getElementById('e_content_text').value;
  c.adv      = c.seller;
  c.dept     = _getDeptByName(c.ops);
  c.target   = document.getElementById('e_target').value;
  c.dtarget  = document.getElementById('e_dtarget').value;
  c.note     = document.getElementById('e_note').value;

  const isEditDA  = c.product === 'DA';
  const isEditPC  = c.product === '퍼미션콜';
  const isEditCPA = c.product === 'CPA';
  if (isEditDA) {
    const yr  = document.getElementById('e_da_year').value;
    const mo  = document.getElementById('e_da_month').value;
    const day = document.getElementById('e_da_day')?.value || '01';
    c.date       = `${yr}-${mo}-${day} 00:00`;
    const eyr = document.getElementById('e_da_eyear')?.value || yr;
    c.dateEnd    = `${eyr}-${document.getElementById('e_da_emonth')?.value || mo}-${document.getElementById('e_da_eday')?.value || '01'}`;
    c.daAdcost   = +document.getElementById('e_da_adcost').value  || 0;
    c.daBillBase = document.getElementById('e_da_billbase')?.value || '';
    c.daFeeYn    = document.getElementById('e_da_fee_yn')?.value   || '';
    c.comm       = +document.getElementById('e_da_comm')?.value    || 0;
    c.agrate     = +document.getElementById('e_da_agrate')?.value  || 0;
    c.buyUnit    = +document.getElementById('e_da_buyUnit')?.value || Math.round(c.daAdcost * (1 - c.comm / 100));
    c.billBase     = 'da';
    c.sellBillBase = '';
    c.buyBillBase  = '';
    c.daImage = [..._daEditImagesBase64];
    if (c.status !== '성과입력완료') c.status = '성과입력대기';
  } else if (isEditPC) {
    const yr = document.getElementById('e_da_year').value;
    const mo = document.getElementById('e_da_month').value;
    c.date      = `${yr}-${mo}-01 00:00`;
    c.pcAdvUnit = +document.getElementById('e_pc_adv_unit').value  || 0;
    c.pcOhcCost = +document.getElementById('e_pc_ohc_cost').value  || 0;
    c.pcDnuUnit = 5500;
    c.pcInflow  = +document.getElementById('e_pc_inflow').value    || 0;
    c.pcAgree      = +document.getElementById('e_pc_agree').value   || 0;
    c.sellBillBase = '';
    c.buyBillBase  = '';
    c.status    = '성과입력완료';
  } else if (isEditCPA) {
    const yr = document.getElementById('e_da_year').value;
    const mo = document.getElementById('e_da_month').value;
    c.date      = `${yr}-${mo}-01 00:00`;
    c.sellUnit  = +document.getElementById('e_cpa_unit').value     || 0;
    c.billBase  = document.getElementById('e_cpa_billbase')?.value || '';
    c.cpaFeeYn  = document.getElementById('e_cpa_fee_yn')?.value   || '';
    c.comm      = +document.getElementById('e_cpa_comm')?.value    || 0;
    c.agrate    = +document.getElementById('e_cpa_agrate')?.value  || 0;
    // 매입단가: 수기입력 시 고정, 아니면 자동계산
    const eCpaBuyUnitEl = document.getElementById('e_cpa_buyUnit');
    c.buyUnit   = eCpaBuyUnitEl?.dataset.manual ? (+eCpaBuyUnitEl.value || 0) : Math.round(c.sellUnit * (1 - c.comm / 100));
    // 광고비·매출수익·이익: 수기입력 시 Fixed에 저장
    const eCpaAdcEl = document.getElementById('e_cpa_adcost');
    const eCpaRevEl = document.getElementById('e_cpa_rev');
    const eCpaPrfEl = document.getElementById('e_cpa_profit');
    c.adcostFixed  = eCpaAdcEl?.dataset.manual ? (+eCpaAdcEl.value || 0) : 0;
    c.revFixed     = eCpaRevEl?.dataset.manual ? (+eCpaRevEl.value || 0) : 0;
    c.profitFixed  = eCpaPrfEl?.dataset.manual ? (+eCpaPrfEl.value || 0) : 0;
    c.amtFixed     = 0;
    const eCpaBuyAmtEl = document.getElementById('e_cpa_buyAmt');
    c.buyAmtFixed  = eCpaBuyAmtEl?.dataset.manual ? (+eCpaBuyAmtEl.value || 0) : 0;
    c.sellBillBase = '';
    c.buyBillBase  = '';
    c.svc       = 0;
    c.disc      = 0;
  } else {
    c.date     = _getDateTime('e');
    c.qty      = +document.getElementById('e_qty').value    || c.qty;
    c.svc      = +document.getElementById('e_svc').value;
    c.sellUnit = +document.getElementById('e_sellUnit').value;
    c.buyUnit  = +document.getElementById('e_buyUnit').value;
    c.disc     = +document.getElementById('e_disc').value;
    c.comm     = +document.getElementById('e_comm').value;
    c.agrate   = +document.getElementById('e_agrate').value;
    c.sellBillBase = document.getElementById('e_sellBillBase')?.value || 'actual';
    c.buyBillBase  = document.getElementById('e_buyBillBase')?.value  || 'actual';
    c.msg      = document.getElementById('e_msg').value;
    const eAdcEl2    = document.getElementById('e_adcost');
    const eAmtEl2    = document.getElementById('e_billamt');
    const eBuyAmtEl2 = document.getElementById('e_buyAmt');
    const eRevEl2    = document.getElementById('e_rev');
    const ePrfEl2    = document.getElementById('e_profit');
    c.adcostFixed  = eAdcEl2?.dataset.manual    ? (+eAdcEl2.value    || 0) : 0;
    c.amtFixed     = eAmtEl2?.dataset.manual    ? (+eAmtEl2.value    || 0) : 0;
    c.buyAmtFixed  = eBuyAmtEl2?.dataset.manual ? (+eBuyAmtEl2.value || 0) : 0;
    c.revFixed     = eRevEl2?.dataset.manual    ? (+eRevEl2.value    || 0) : 0;
    c.profitFixed  = ePrfEl2?.dataset.manual    ? (+ePrfEl2.value    || 0) : 0;
  }

  // 2차 성과 저장 (PC 제외)
  if (!isEditPC) {
    if (isEditDA) {
      c.daImp   = +document.getElementById('ep_imp')?.value       || 0;
      c.daClick = +document.getElementById('ep_da_click')?.value  || 0;
      c.daConv  = +document.getElementById('ep_conv')?.value      || 0;
      c.daRev   = +document.getElementById('ep_da_rev')?.value    || 0;
    } else {
      const _epVal = id => document.getElementById(id)?.value ?? '';
      const _epNum = id => { const v = _epVal(id); return v !== '' ? Number(v)      : null; };
      const _epFlt = id => { const v = _epVal(id); return v !== '' ? parseFloat(v)  : null; };
      c.actual = _epNum('ep_actual');
      c.clicks = _epNum('ep_click');
      c.ctr    = _epFlt('ep_ctr');   // "2.34%" → 2.34 (parseFloat이 % 무시)
      c.db     = _epNum('ep_db');
      c.dbr    = _epFlt('ep_dbr');
      // CPA: DB등록수 = 정산수량 자동 동기화
      if (c.product === 'CPA' && c.db != null) c.qty = c.db;
    }
  }

  // 변경된 필드만 이력 기록
  TRACK.forEach(k => {
    const bv = snap[k];
    const av = String(c[k] ?? '');
    if (bv !== av) _log(c.id, 'field', k, bv, av);
  });

  _fbSaveCampaign(DATA[currentDetailIdx]);
  const _savedCampId = DATA[currentDetailIdx].id;
  history.replaceState({ screen: 'detail', id: _savedCampId }, '', '#detail/' + _savedCampId);
  openDetail(currentDetailIdx, true);
  toast('✓ 수정사항이 저장되었습니다','ok');
}

function cancelEdit() {
  document.querySelector('.topbar').style.display = '';
  const _cancelCampId = DATA[currentDetailIdx]?.id;
  if (_cancelCampId) history.replaceState({ screen: 'detail', id: _cancelCampId }, '', '#detail/' + _cancelCampId);
  openDetail(currentDetailIdx, true);
}
function goDetailBack() { goScreen((_detailFromScreen && _detailFromScreen !== 'edit') ? _detailFromScreen : 'campaigns', true); }

function open2ndModal() {
  const c = DATA[currentDetailIdx];
  if (!c) return;
  if (c.status !== '성과입력대기' && c.status !== '성과입력완료') return;
  const isDA = c.product === 'DA';
  document.getElementById('perf-normal').style.display = isDA ? 'none' : '';
  document.getElementById('perf-da').style.display     = isDA ? '' : 'none';
  if (isDA) {
    document.getElementById('p_imp').value      = c.daImp   != null ? c.daImp   : '';
    document.getElementById('p_da_click').value = c.daClick != null ? c.daClick : '';
    document.getElementById('p_conv').value     = c.daConv  != null ? c.daConv  : '';
    document.getElementById('p_da_rev').value   = c.daRev   != null ? c.daRev   : '';
    calcDaPerf();
  } else {
    const isCPA2 = c.product === 'CPA';
    const pLbl = document.getElementById('p_actualLbl');
    if (pLbl) pLbl.textContent = isCPA2 ? '노출수' : '실발송수량';
    document.getElementById('p_actual').value = c.actual != null ? c.actual : '';
    document.getElementById('p_click').value  = c.clicks != null ? c.clicks : '';
    document.getElementById('p_ctr').value    = c.ctr    != null ? c.ctr    : '';
    document.getElementById('p_db').value     = c.db     != null ? c.db     : '';
    document.getElementById('p_dbr').value    = c.dbr    != null ? c.dbr    : '';
    calcCTR();
    calcDBR();
  }
  openModal('modal2nd');
}

function submit2nd()  {
  const c = DATA[currentDetailIdx];
  if (!c) return;
  const isDA = c.product === 'DA';

  if (isDA) {
    const imp   = document.getElementById('p_imp').value;
    const click = document.getElementById('p_da_click').value;
    const conv  = document.getElementById('p_conv').value;
    const rev   = document.getElementById('p_da_rev').value;
    const newImp   = imp   !== '' ? Number(imp)   : null;
    const newClick = click !== '' ? Number(click) : null;
    const newConv  = conv  !== '' ? Number(conv)  : null;
    const newRev   = rev   !== '' ? Number(rev)   : null;
    if (newImp   !== c.daImp)   { _log(c.id,'perf','daImp',   String(c.daImp  ??'미입력'), newImp  !=null?newImp  +'건':'미입력'); c.daImp   = newImp; }
    if (newClick !== c.daClick) { _log(c.id,'perf','daClick', String(c.daClick??'미입력'), newClick!=null?newClick+'건':'미입력'); c.daClick = newClick; }
    if (newConv  !== c.daConv)  { _log(c.id,'perf','daConv',  String(c.daConv ??'미입력'), newConv !=null?newConv +'건':'미입력'); c.daConv  = newConv; }
    if (newRev   !== c.daRev)   { _log(c.id,'perf','daRev',   String(c.daRev  ??'미입력'), newRev  !=null?newRev  +'원':'미입력'); c.daRev   = newRev; }
    const prevStatus = c.status;
    c.status = '성과입력완료';
    if (c.status !== prevStatus) _log(c.id,'field','status', prevStatus, c.status);
    _fbSaveCampaign(c);
    closeModal('modal2nd');
    openDetail(currentDetailIdx, true);
    toast('✓ DA 성과가 저장되었습니다', 'ok');
    return;
  }

  const actual = document.getElementById('p_actual').value;
  const click  = document.getElementById('p_click').value;
  const ctr    = document.getElementById('p_ctr').value;
  const db     = document.getElementById('p_db').value;
  const dbr    = document.getElementById('p_dbr').value;
  // DATA 업데이트 (변경된 필드만 이력 기록)
  if (c) {
    const newActual = actual !== '' ? Number(actual) : null;
    const newClicks = click  !== '' ? Number(click)  : null;
    const newCtr    = ctr    !== '' ? parseFloat(ctr): null;
    const newDb     = db     !== '' ? Number(db)     : null;
    const newDbr    = dbr    !== '' ? parseFloat(dbr): null;

    if (newActual !== c.actual) { _log(c.id,'perf','actual', String(c.actual??'미입력'), newActual!=null?newActual+'건':'미입력'); c.actual = newActual; }
    if (newClicks !== c.clicks) { _log(c.id,'perf','clicks', String(c.clicks??'미입력'), newClicks!=null?newClicks+'건':'미입력'); c.clicks = newClicks; }
    if (newCtr    !== c.ctr)    { _log(c.id,'perf','ctr',    String(c.ctr??'미입력'),    newCtr!=null?newCtr+'%':'미입력');        c.ctr    = newCtr; }
    if (newDb     !== c.db)     { _log(c.id,'perf','db',     String(c.db??'미입력'),     newDb!=null?newDb+'건':'미입력');         c.db     = newDb; }
    if (newDbr    !== c.dbr)    { _log(c.id,'perf','dbr', String(c.dbr??'미입력'), newDbr!=null?newDbr+'%':'미입력'); c.dbr = newDbr; }
    // CPA: DB등록수 = 정산수량 자동 동기화
    if (c.product === 'CPA' && c.db != null) { const prevQty = c.qty; c.qty = c.db; if (prevQty !== c.qty) _log(c.id,'field','qty', String(prevQty??''), String(c.qty)); }
    const prevStatus = c.status;
    c.status = '성과입력완료';
    if (c.status !== prevStatus) _log(c.id,'field','status', prevStatus, c.status);
  }

  _fbSaveCampaign(DATA[currentDetailIdx]);
  closeModal('modal2nd');
  openDetail(currentDetailIdx, true);
  toast('✓ 성과 데이터가 저장되었습니다', 'ok');
}
// ── 수정화면 성과 자동계산 ──────────────────────────
function epCalcCTR() {
  const actual = parseFloat(document.getElementById('ep_actual')?.value) || 0;
  const click  = parseFloat(document.getElementById('ep_click')?.value)  || 0;
  const el = document.getElementById('ep_ctr');
  if (el) el.value = actual > 0 ? (click / actual * 100).toFixed(2) + '%' : '';
}
function epCalcDBR() {
  const click = parseFloat(document.getElementById('ep_click')?.value) || 0;
  const db    = parseFloat(document.getElementById('ep_db')?.value)    || 0;
  const el = document.getElementById('ep_dbr');
  if (el) el.value = click > 0 ? (db / click * 100).toFixed(2) + '%' : '';
}
function epCalcDA() {
  const imp   = parseFloat(document.getElementById('ep_imp')?.value)      || 0;
  const click = parseFloat(document.getElementById('ep_da_click')?.value) || 0;
  const conv  = parseFloat(document.getElementById('ep_conv')?.value)     || 0;
  const rev   = parseFloat(document.getElementById('ep_da_rev')?.value)   || 0;
  const ctrEl  = document.getElementById('ep_da_ctr');
  const cpaEl  = document.getElementById('ep_da_cpa');
  const roasEl = document.getElementById('ep_da_roas');
  const c = DATA[currentDetailIdx];
  const adcost = c ? (c.daAdcost || 0) : 0;
  if (ctrEl)  ctrEl.value  = imp  > 0 ? (click / imp  * 100).toFixed(2) + '%' : '';
  if (cpaEl)  cpaEl.value  = conv > 0 ? Math.round(rev / conv).toLocaleString() + '원' : '';
  if (roasEl) roasEl.value = adcost > 0 ? (rev / adcost * 100).toFixed(1) + '%' : '';
}

function openDelModal() {
  const c = DATA[currentDetailIdx];
  if (!c) return;
  document.getElementById('delName').textContent = _cName(c);
  openModal('modalDel');
}

function confirmDel() {
  const c = DATA[currentDetailIdx];
  if (c) {
    _fbDeleteCampaign(c.id);
    DATA.splice(currentDetailIdx, 1);
  }
  closeModal('modalDel');
  goScreen('campaigns');
  toast('🗑 캠페인이 삭제되었습니다', 'err');
}

function openEditTarget() {
  const c = DATA[currentDetailIdx] || {};
  const isDA = c.product === 'DA';
  const hasReviewed = !!c.msgFinal;
  document.getElementById('et_target').value  = c.target  || '';
  document.getElementById('et_dtarget').value = c.dtarget || '';
  document.getElementById('et_msg').value = hasReviewed ? c.msgFinal : (c.msg || '');
  document.getElementById('et_reviewed').checked = hasReviewed;
  const etMsgSec = document.getElementById('et_msg_section');
  if (etMsgSec) etMsgSec.style.display = isDA ? 'none' : '';
  openModal('modalEditTarget');
}
function etReviewedToggle(checked) {
  const c = DATA[currentDetailIdx] || {};
  document.getElementById('et_msg').value = checked ? (c.msgFinal || '') : (c.msg || '');
}
function saveEditTarget() {
  const c = DATA[currentDetailIdx];
  if (!c) return;
  const tagsRaw    = document.getElementById('et_target').value;
  const dtargetRaw = document.getElementById('et_dtarget').value;
  const msg        = document.getElementById('et_msg').value;
  const reviewed   = document.getElementById('et_reviewed').checked;
  const newTarget  = tagsRaw;
  if (newTarget !== (c.target || '')) _log(c.id, 'field', 'target', c.target || '', newTarget);
  c.target = newTarget;
  if (dtargetRaw !== (c.dtarget || '')) _log(c.id, 'field', 'dtarget', c.dtarget || '', dtargetRaw);
  c.dtarget = dtargetRaw;
  if (reviewed) {
    if (msg !== (c.msgFinal || '')) _log(c.id, 'field', 'msgFinal', c.msgFinal || '', msg);
    c.msgFinal = msg;
  } else {
    if (msg !== (c.msg || '')) _log(c.id, 'field', 'msg', c.msg || '', msg);
    c.msg = msg;
  }
  const tags = c.target.split('\n').map(t => t.trim()).filter(Boolean);
  document.getElementById('dTarget').innerHTML = tags.length
    ? tags.map(t => `<span class="tag">${t}</span>`).join('')
    : '<span style="color:var(--text3);">—</span>';
  const dtargetEl2 = document.getElementById('dDtarget');
  if (dtargetEl2) { const dtags2 = (c.dtarget||'').split('\n').map(t=>t.trim()).filter(Boolean); dtargetEl2.innerHTML = dtags2.length ? dtags2.map(t=>`<span class="tag">${t}</span>`).join('') : '<span style="color:var(--text3);">—</span>'; }
  document.getElementById('dMsg').innerHTML     = _linkify(c.msg || '');
  document.getElementById('dMsgFinal').innerHTML = c.msgFinal ? _linkify(c.msgFinal) : '<span style="color:var(--text3);font-size:12px;">아직 검수완료된 문구가 없습니다.</span>';
  _fbSaveCampaign(c);
  closeModal('modalEditTarget');
  toast(reviewed ? '✓ 검수완료 문구가 저장되었습니다' : '✓ 타겟 & 문구가 저장되었습니다', 'ok');
}

function msgTabSwitch(tab) {
  document.getElementById('msg-tab-draft').classList.toggle('active', tab === 'draft');
  document.getElementById('msg-tab-final').classList.toggle('active', tab === 'final');
  document.getElementById('dMsg').style.display      = tab === 'draft' ? '' : 'none';
  document.getElementById('dMsgFinal').style.display = tab === 'final' ? '' : 'none';
}

function openEditNote() {
  const c = DATA[currentDetailIdx] || {};
  document.getElementById('en_note').value = (c.note || '').replace(/<br\s*\/?>/gi, '\n');
  openModal('modalEditNote');
}
function saveEditNote() {
  const c = DATA[currentDetailIdx];
  if (!c) return;
  const note = document.getElementById('en_note').value;
  if (note !== (c.note||'')) _log(c.id, 'field', 'note', c.note||'', note);
  c.note = note;
  document.getElementById('dNote').innerHTML = note.replace(/\n/g, '<br>') || '<span style="color:var(--text3);">—</span>';
  closeModal('modalEditNote');
  toast('✓ 특기사항이 저장되었습니다', 'ok');
}

// ══════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════
let calView = 'month';
let calDate = new Date(); // 기준 날짜
let calY = calDate.getFullYear(), calM = calDate.getMonth() + 1;
let calProductTab = 'sms'; // 'sms' | 'da'

const CAT_COLOR = {
  '분양': '#8fd3a0',
  '교육': '#91c7f5',
  '수송': '#ffc078',
  '금융': '#a9e4ef',
  '뷰티': '#fcc2d7',
  '기타': '#d4c5f9',
  '병의원': '#ff8787',
};
function _evColor(ev) {
  if (ev.idx !== null && DATA[ev.idx]) return CAT_COLOR[_getCat(DATA[ev.idx])] || '#868e96';
  return ev.c || '#868e96';
}

// CAL_EVENTS는 DATA에서 동적으로 생성 — 별도 등록 불필요
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const DAY_KO = ['일','월','화','수','목','금','토'];

function _dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _getFilteredEvents(key) {
  const catF     = document.getElementById('calFilterCat')?.value    || '';
  const mediaF   = document.getElementById('calFilterMedia')?.value  || '';
  const companyF = document.getElementById('calFilterCompany')?.value || '';
  const brandF   = document.getElementById('calFilterBrand')?.value  || '';
  const { bonbu: bonbuF, team: teamF } = _parseOrgFilter(document.getElementById('calFilterOrg')?.value || '');

  // 탭별 상품 필터 + 날짜 매칭
  const isDA = calProductTab === 'da';
  const evts = DATA
    .map((c, idx) => ({ t: '', idx }))
    .filter(ev => {
      const c = DATA[ev.idx];
      if (!c) return false;
      const prod = c.product || '';
      if (isDA) {
        // DA 탭: DA 상품만, 날짜 범위 내 포함 여부
        if (prod !== 'DA') return false;
        const startKey = (c.date || '').slice(0, 10);
        const endKey   = (c.dateEnd || startKey).slice(0, 10);
        return key >= startKey && key <= endKey;
      } else {
        // 문자광고 탭: 퍼미션콜·CPA·DA 제외, 시작일 기준
        if (prod === '퍼미션콜' || prod === 'CPA' || prod === 'DA') return false;
        return (c.date || '').startsWith(key);
      }
    });

  const sortEvts = arr => arr.slice().sort((a, b) => {
    const da = DATA[a.idx]?.date || '';
    const db = DATA[b.idx]?.date || '';
    return da < db ? -1 : da > db ? 1 : 0;
  });

  if (!catF && !mediaF && !companyF && !brandF && !bonbuF && !teamF) return sortEvts(evts);
  return sortEvts(evts.filter(ev => {
    const c = DATA[ev.idx];
    if (!c) return false;
    if (catF     && _getCat(c)      !== catF)     return false;
    if (mediaF   && c.media         !== mediaF)   return false;
    if (companyF && _cCompany(c)    !== companyF) return false;
    if (brandF   && (c.content||'') !== brandF)   return false;
    if (teamF || bonbuF) {
      const opsUser = USERS.find(u => u.name === c.ops);
      const opsTeam  = opsUser ? opsUser.dept  : c.dept;
      const opsBonbu = opsUser ? opsUser.bonbu : null;
      if (teamF  && opsTeam  !== teamF)  return false;
      if (bonbuF) {
        if (opsBonbu) {
          if (opsBonbu !== bonbuF) return false;
        } else {
          // ops 사용자 못찾으면 c.dept로 본부 소속 확인
          const org = ORG_STRUCTURE.find(o => o.bonbu === bonbuF);
          if (!org || !org.teams.includes(opsTeam)) return false;
        }
      }
    }
    return true;
  }));
}

function setCalProductTab(tab) {
  calProductTab = tab;
  localStorage.setItem('calProductTab', tab);
  document.getElementById('cpt-sms').classList.toggle('active', tab === 'sms');
  document.getElementById('cpt-da').classList.toggle('active',  tab === 'da');
  renderCalendar();
}

function setCalView(v) {
  calView = v;
  if (v === 'day' || v === 'week') {
    calDate = new Date();
    calY = calDate.getFullYear();
    calM = calDate.getMonth() + 1;
  }
  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('vt-' + v).classList.add('active');
  renderCalendar();
}

function goToday() {
  const t = new Date();
  calDate = new Date(t);
  calY = t.getFullYear();
  calM = t.getMonth() + 1;
  renderCalendar();
}

function changeNav(d) {
  if (calView === 'month') {
    calDate = new Date(calY, calM - 1 + d, 1);
  } else if (calView === 'week') {
    calDate = new Date(calDate.getTime() + d * 7 * 86400000);
  } else {
    calDate = new Date(calDate.getTime() + d * 86400000);
  }
  calY = calDate.getFullYear();
  calM = calDate.getMonth() + 1;
  renderCalendar();
}

function _makeEvtEl(ev) {
  const el = document.createElement('div');
  el.className = 'cal-evt';
  el.style.background = _evColor(ev) + '80';
  el.style.color = '#333';
  const c = ev.idx !== null ? DATA[ev.idx] : null;
  const label = c ? _cName(c) : ev.t;
  const time  = (c?.product === 'DA') ? '' : (c?.date ? c.date.split(' ')[1] || '' : '');
  el.textContent = time ? `[${time}] ${label}` : label;
  el.title = label;
  el.onclick = e => { e.stopPropagation(); ev.idx !== null ? openCalPreview(ev.idx) : toast(label + ' 클릭됨', 'ok'); };
  return el;
}

function _formatDate(dateStr) {
  if (!dateStr) return '—';
  const [datePart, timePart] = dateStr.split(' ');
  const d = new Date(datePart);
  const day = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${datePart} (${day})${timePart ? ' ' + timePart : ''}`;
}
function openImgNewTab(b64) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>소재 이미지</title><style>body{margin:0;background:#111;display:flex;justify-content:center;align-items:flex-start;}img{max-width:100%;height:auto;display:block;}</style></head><body><img src="${b64}"></body></html>`);
  win.document.close();
}

function _formatDateRange(c) {
  if (c.product === 'DA' && c.dateEnd) {
    const sp = (c.date    || '').split('-');
    const ep = (c.dateEnd || '').split('-');
    if (sp.length >= 3 && ep.length >= 3)
      return `${sp[0]}년 ${+sp[1]}월 ${+sp[2].split(' ')[0]}일 ~ ${ep[0]}년 ${+ep[1]}월 ${+ep[2]}일`;
  }
  return _formatDate(c.date);
}

function openCalPreview(idx) {
  const c = DATA[idx];
  if (!c) return;
  document.getElementById('cp-name').textContent     = _cName(c);
  document.getElementById('cp-promo').textContent    = c.promo || '—';
  document.getElementById('cp-cat').textContent      = _getCat(c) || '—';
  const cpDateLbl = document.getElementById('cp-date-lbl');
  if (cpDateLbl) cpDateLbl.textContent = c.product === 'DA' ? '노출기간' : '발송일시';
  document.getElementById('cp-date').textContent = _formatDateRange(c);
  document.getElementById('cp-product').textContent  = c.product || '—';
  const cpSellerEl = document.getElementById('cp-seller');
  if (cpSellerEl) {
    const contractLabel = c.contract ? `<span style="font-size:11px;color:var(--text3);background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;margin-left:6px;">${c.contract}</span>` : '';
    cpSellerEl.innerHTML = _escHtml(c.seller || c.adv || '—') + contractLabel;
  }
  document.getElementById('cp-ops').textContent      = c.ops || '—';
  document.getElementById('cp-status').innerHTML     = `<span class="badge b-${c.status}">${c.status}</span>`;
  document.getElementById('cp-detail-btn').onclick   = () => { closeModal('modalCalPreview'); openDetail(idx); };
  openModal('modalCalPreview');
}

function _populateCalFilters() {
  const companies = [...new Set(DATA.map(c => _cCompany(c)).filter(Boolean))].sort();
  const brands    = [...new Set(DATA.map(c => c.content).filter(Boolean))].sort();
  const compSel  = document.getElementById('calFilterCompany');
  const brandSel = document.getElementById('calFilterBrand');
  if (compSel) {
    const cur = compSel.value;
    compSel.innerHTML = '<option value="">광고주/대행사</option>' +
      companies.map(s => `<option${s===cur?' selected':''}>${s}</option>`).join('');
  }
  if (brandSel) {
    const cur = brandSel.value;
    brandSel.innerHTML = '<option value="">브랜드</option>' +
      brands.map(s => `<option${s===cur?' selected':''}>${s}</option>`).join('');
  }
  // 본부/팀 통합 드롭다운 초기화 (최초 1회)
  const orgSel = document.getElementById('calFilterOrg');
  if (orgSel && !orgSel.dataset.init) {
    orgSel.innerHTML = '<option value="">본부/팀 전체</option>' + _buildOrgSelectHTML();
    orgSel.dataset.init = '1';
  }
  // 초기화 버튼 표시 여부
  const anyActive = ['calFilterCat','calFilterMedia','calFilterCompany','calFilterBrand','calFilterOrg']
    .some(id => document.getElementById(id)?.value);
  const resetBtn = document.getElementById('calResetBtn');
  if (resetBtn) resetBtn.style.display = anyActive ? '' : 'none';
}

function resetCalFilters() {
  ['calFilterCat','calFilterMedia','calFilterCompany','calFilterBrand','calFilterOrg']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderCalendar();
}

function openCalDayModal(key) {
  const evts = _getFilteredEvents(key);
  const d = new Date(key + 'T00:00:00');
  const dayNames = ['일','월','화','수','목','금','토'];
  document.getElementById('cdm-title').textContent = `${key} (${dayNames[d.getDay()]}) 전체 일정`;
  const list = document.getElementById('cdm-list');
  list.innerHTML = '';
  if (evts.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px 0;font-size:13px;">일정이 없습니다.</div>';
  } else {
    evts.forEach(ev => {
      const c = ev.idx !== null ? DATA[ev.idx] : null;
      const label = c ? _cName(c) : ev.t;
      const time  = c?.date ? c.date.split(' ')[1] || '' : '';
      const row = document.createElement('div');
      row.className = 'cdm-row';
      row.innerHTML =
        `<span class="cdm-dot" style="background:${_evColor(ev)};"></span>` +
        `<span class="cdm-time">${time||'—'}</span>` +
        `<span class="cdm-label">${label}</span>` +
        (c ? `<span class="badge b-${c.status}">${c.status}</span>` : '');
      if (ev.idx !== null) row.onclick = () => { closeModal('modalCalDayEvts'); openCalPreview(ev.idx); };
      list.appendChild(row);
    });
  }
  openModal('modalCalDayEvts');
}

function renderCalendar() {
  _populateCalFilters();
  if (calView === 'month')     renderMonthView();
  else if (calView === 'week') renderWeekView();
  else                         renderDayView();
  _updateCalMeta();
}

function _updateCalMeta() {
  const catF     = document.getElementById('calFilterCat')?.value     || '';
  const mediaF   = document.getElementById('calFilterMedia')?.value   || '';
  const companyF = document.getElementById('calFilterCompany')?.value || '';
  const brandF   = document.getElementById('calFilterBrand')?.value   || '';
  const { bonbu: bonbuF, team: teamF } = _parseOrgFilter(document.getElementById('calFilterOrg')?.value || '');
  const yearStr  = String(calY);
  const monthStr = String(calM).padStart(2, '0');
  const prefix   = `${yearStr}-${monthStr}`;

  const isDATab = calProductTab === 'da';
  const monthStart = prefix + '-01';
  const monthEnd   = prefix + '-' + String(new Date(calY, calM, 0).getDate()).padStart(2, '0');
  const visible = DATA.filter(c => {
    const prod = c.product || '';
    if (isDATab) {
      if (prod !== 'DA') return false;
      const startKey = (c.date    || '').slice(0, 10);
      const endKey   = (c.dateEnd || startKey).slice(0, 10);
      if (endKey < monthStart || startKey > monthEnd) return false;
    } else {
      if (prod === '퍼미션콜' || prod === 'CPA' || prod === 'DA') return false;
      if (!(c.date || '').startsWith(prefix)) return false;
    }
    if (catF     && _getCat(c)      !== catF)     return false;
    if (mediaF   && c.media         !== mediaF)   return false;
    if (companyF && _cCompany(c)    !== companyF) return false;
    if (brandF   && (c.content||'') !== brandF)   return false;
    if (teamF || bonbuF) {
      const opsUser = USERS.find(u => u.name === c.ops);
      const opsTeam  = opsUser ? opsUser.dept  : c.dept;
      const opsBonbu = opsUser ? opsUser.bonbu : null;
      if (teamF  && opsTeam  !== teamF)  return false;
      if (bonbuF) {
        if (opsBonbu) {
          if (opsBonbu !== bonbuF) return false;
        } else {
          const org = ORG_STRUCTURE.find(o => o.bonbu === bonbuF);
          if (!org || !org.teams.includes(opsTeam)) return false;
        }
      }
    }
    return true;
  });

  const totalQty = visible.reduce((s, c) => s + (c.actual || c.qty || 0), 0);
  const totalAdc = visible.reduce((s, c) => {
    if (c.product === 'DA') return s + (c.daAdcost || 0);
    const base = (c.sellBillBase||c.billBase||'actual') === 'sched' ? (c.qty||0) - (c.svc||0) : (c.actual ? c.actual - (c.svc||0) : (c.qty||0) - (c.svc||0));
    return s + (c.adcostFixed || base * (c.sellUnit || 0));
  }, 0);
  const qtyEl = document.getElementById('calMetaQty');
  const cntEl = document.getElementById('calMetaCnt');
  const adcEl = document.getElementById('calMetaAdc');
  if (qtyEl) qtyEl.textContent = totalQty >= 10000
    ? (totalQty / 10000).toFixed(1).replace(/\.0$/, '') + '만건'
    : totalQty.toLocaleString() + '건';
  if (cntEl) cntEl.textContent = visible.length + '건';
  if (adcEl) adcEl.textContent = totalAdc >= 100000000
    ? (totalAdc / 100000000).toFixed(2).replace(/\.?0+$/, '') + '억원'
    : totalAdc >= 10000
    ? (totalAdc / 10000).toFixed(2).replace(/\.?0+$/, '') + '만원'
    : totalAdc.toLocaleString() + '원';
}

// ── 월 뷰 아래 오늘 캠페인 목록 ──
function _renderCalTodayList(today) {
  const wrap = document.getElementById('cal-today-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!today) return;

  const key  = _dateKey(today);
  const evts = _getFilteredEvents(key);
  if (evts.length === 0) return;

  const head = document.createElement('div');
  head.className = 'cal-today-head';
  head.textContent = `오늘 (${today.getMonth()+1}월 ${today.getDate()}일) 캠페인 ${evts.length}건`;
  wrap.appendChild(head);

  evts.forEach(ev => {
    const c = ev.idx !== null ? DATA[ev.idx] : null;
    const label = c ? _cName(c) : ev.t;
    const time  = c?.date ? c.date.split(' ')[1] || '' : '';
    const item  = document.createElement('div');
    item.className = 'cal-day-item';
    item.innerHTML = `<div class="cal-day-dot" style="background:${_evColor(ev)};"></div>${time ? `<span class="cal-day-time">${time}</span>` : ''}<span>${label}</span>`;
    item.onclick = () => ev.idx !== null ? openCalPreview(ev.idx) : null;
    wrap.appendChild(item);
  });
}

// ── 월 뷰 ──
function renderMonthView() {
  document.getElementById('calTitle').textContent = `${calY}년 ${calM}월`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  grid.className = 'cal-grid';

  DAYS.forEach(d => {
    const el = document.createElement('div'); el.className = 'cal-dh'; el.textContent = d; grid.appendChild(el);
  });

  const first = new Date(calY, calM-1, 1).getDay();
  const dim   = new Date(calY, calM, 0).getDate();
  const prev  = new Date(calY, calM-1, 0).getDate();
  const today = new Date();
  const isCur = today.getFullYear() === calY && today.getMonth()+1 === calM;

  let cells = [];
  for (let i = first-1; i >= 0; i--) cells.push({d: prev-i, t:'other'});
  for (let d = 1; d <= dim; d++) cells.push({d, t:'cur'});
  while (cells.length < 42) cells.push({d: cells.length - first - dim + 1, t:'other'});

  const isDA = calProductTab === 'da';
  const todayIdx = (isCur && calProductTab === 'da')
    ? cells.findIndex(c => c.t === 'cur' && c.d === today.getDate())
    : -1;
  const cellBars = isDA ? _computeDABars(cells, dim, todayIdx) : {};

  cells.forEach((c, cellIdx) => {
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (c.t !== 'cur' ? ' other' : '') + (c.t === 'cur' && isCur && c.d === today.getDate() ? ' today' : '');
    const dt = document.createElement('div'); dt.className = 'cal-date'; dt.textContent = c.d; cell.appendChild(dt);
    if (c.t === 'cur') {
      const key = `${calY}-${String(calM).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`;
      if (isDA) {
        const bars = (cellBars[cellIdx] || []).sort((a, b) => a.track - b.track);
        bars.forEach(bar => cell.appendChild(_makeDABarEl(bar)));
      } else {
        const evts = _getFilteredEvents(key);
        evts.forEach(ev => cell.appendChild(_makeEvtEl(ev)));
      }
      if (hasPerm('ops')) {
        cell.style.cursor = 'pointer';
        cell.onclick = () => { resetRegForm(); openRegModal(key); };
      }
    }
    grid.appendChild(cell);
  });

  // 오늘 날짜 캠페인 목록 (현재 달 보고 있을 때만)
  _renderCalTodayList(isCur ? today : null);
}

// DA 탭 월 뷰: 셀별 bar 레이아웃 계산
function _computeDABars(cells, dim, todayIdx = -1) {
  const catF     = document.getElementById('calFilterCat')?.value    || '';
  const mediaF   = document.getElementById('calFilterMedia')?.value  || '';
  const companyF = document.getElementById('calFilterCompany')?.value || '';
  const brandF   = document.getElementById('calFilterBrand')?.value  || '';
  const { bonbu: bonbuF, team: teamF } = _parseOrgFilter(document.getElementById('calFilterOrg')?.value || '');

  // 날짜 키 → 셀 인덱스 매핑 (cur 셀만)
  const dateToIdx = {};
  cells.forEach((c, i) => {
    if (c.t === 'cur') {
      const key = `${calY}-${String(calM).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`;
      dateToIdx[key] = i;
    }
  });

  const monthStart = `${calY}-${String(calM).padStart(2,'0')}-01`;
  const monthEnd   = `${calY}-${String(calM).padStart(2,'0')}-${String(dim).padStart(2,'0')}`;

  // 필터 적용 + 이번 달 겹치는 DA 캠페인 수집
  const daCamps = DATA.filter(c => {
    if ((c.product || '') !== 'DA') return false;
    const s = (c.date    || '').slice(0, 10);
    const e = (c.dateEnd || s  ).slice(0, 10);
    if (e < monthStart || s > monthEnd) return false;
    if (catF     && _getCat(c)      !== catF)     return false;
    if (mediaF   && c.media         !== mediaF)   return false;
    if (companyF && _cCompany(c)    !== companyF) return false;
    if (brandF   && (c.content||'') !== brandF)   return false;
    if (teamF || bonbuF) {
      const opsUser = USERS.find(u => u.name === c.ops);
      const opsTeam  = opsUser ? opsUser.dept  : c.dept;
      const opsBonbu = opsUser ? opsUser.bonbu : null;
      if (teamF  && opsTeam  !== teamF)  return false;
      if (bonbuF) {
        if (opsBonbu) { if (opsBonbu !== bonbuF) return false; }
        else {
          const org = ORG_STRUCTURE.find(o => o.bonbu === bonbuF);
          if (!org || !org.teams.includes(opsTeam)) return false;
        }
      }
    }
    return true;
  });

  // 시작일 오름차순, 기간 내림차순 정렬
  daCamps.sort((a, b) => {
    const as = (a.date || '').slice(0, 10), bs = (b.date || '').slice(0, 10);
    if (as !== bs) return as < bs ? -1 : 1;
    const ae = (a.dateEnd || as).slice(0, 10), be = (b.dateEnd || bs).slice(0, 10);
    return ae < be ? 1 : -1;
  });

  // 셀별 트랙 점유 + bar 정보 계산
  const trackUsage = Array.from({length: 42}, () => new Set());
  const cellBars = {};

  daCamps.forEach(camp => {
    const s = (camp.date    || '').slice(0, 10);
    const e = (camp.dateEnd || s  ).slice(0, 10);
    const clampS = s < monthStart ? monthStart : s;
    const clampE = e > monthEnd   ? monthEnd   : e;
    const startIdx = dateToIdx[clampS];
    const endIdx   = dateToIdx[clampE];
    if (startIdx === undefined || endIdx === undefined) return;

    // 전체 범위에서 비어 있는 가장 낮은 트랙 번호 탐색
    let track = 0;
    outer: while (true) {
      for (let i = startIdx; i <= endIdx; i++) {
        if (trackUsage[i].has(track)) { track++; continue outer; }
      }
      break;
    }
    for (let i = startIdx; i <= endIdx; i++) trackUsage[i].add(track);

    const campIdx = DATA.indexOf(camp);
    for (let i = startIdx; i <= endIdx; i++) {
      const col = i % 7;
      // 주 경계(col=0) 또는 캠페인 시작이면 왼쪽 둥글게
      const leftRound  = (i === startIdx) || (col === 0);
      // 주 경계(col=6) 또는 캠페인 끝이면 오른쪽 둥글게
      const rightRound = (i === endIdx)   || (col === 6);
      // 레이블은 캠페인 시작 셀, 주 새로 시작하는 셀, 또는 오늘 날짜 셀에 표시
      const showLabel  = (i === startIdx) || (col === 0) || (i === todayIdx);
      if (!cellBars[i]) cellBars[i] = [];
      cellBars[i].push({ camp, idx: campIdx, track, leftRound, rightRound, showLabel, placeholder: false });
    }
  });

  // 같은 주 행 내에서 트랙 높이 정렬을 위한 플레이스홀더 삽입
  for (let row = 0; row < 6; row++) {
    const rowStart = row * 7, rowEnd = rowStart + 6;
    let maxTrack = -1;
    for (let i = rowStart; i <= rowEnd; i++) {
      (cellBars[i] || []).forEach(b => { if (b.track > maxTrack) maxTrack = b.track; });
    }
    if (maxTrack < 0) continue;
    for (let i = rowStart; i <= rowEnd; i++) {
      if (cells[i].t !== 'cur') continue;
      if (!cellBars[i]) cellBars[i] = [];
      const used = new Set(cellBars[i].map(b => b.track));
      for (let t = 0; t <= maxTrack; t++) {
        if (!used.has(t)) {
          cellBars[i].push({ camp: null, idx: -1, track: t, leftRound: false, rightRound: false, showLabel: false, placeholder: true });
        }
      }
    }
  }

  return cellBars;
}

// DA bar 요소 생성
function _makeDABarEl(bar) {
  const el = document.createElement('div');
  el.className = 'cal-evt';
  if (bar.placeholder) {
    el.style.cssText = 'visibility:hidden;margin-bottom:3px;';
    el.textContent = '\u00a0';
    return el;
  }
  const color = CAT_COLOR[_getCat(bar.camp)] || '#868e96';
  const lr = bar.leftRound  ? '4px' : '0';
  const rr = bar.rightRound ? '4px' : '0';
  const ml = bar.leftRound  ? '0'   : '-9px';
  const mr = bar.rightRound ? '0'   : '-9px';
  const pl = bar.leftRound  ? '6px' : '1px';
  const pr = bar.rightRound ? '6px' : '1px';
  el.style.cssText = `background:${color}cc;color:#333;border-radius:${lr} ${rr} ${rr} ${lr};margin-left:${ml};margin-right:${mr};padding-left:${pl};padding-right:${pr};margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
  el.textContent = bar.showLabel ? _cName(bar.camp) : '\u00a0';
  el.title = _cName(bar.camp);
  el.onclick = e => { e.stopPropagation(); if (bar.idx !== -1) openCalPreview(bar.idx); };
  return el;
}

// ── 주 뷰 ──
function renderWeekView() {
  const sunday = new Date(calDate);
  sunday.setDate(calDate.getDate() - calDate.getDay());
  const saturday = new Date(sunday); saturday.setDate(sunday.getDate() + 6);

  const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
  document.getElementById('calTitle').textContent =
    `${sunday.getFullYear()}년  ${fmt(sunday)} – ${fmt(saturday)}`;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  grid.className = 'cal-grid cal-week-grid';

  const today = new Date();

  // 헤더
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    const el = document.createElement('div');
    el.className = 'cal-dh' + (isToday ? ' cal-dh-today' : '');
    el.textContent = DAYS[i] + ' ' + d.getDate();
    grid.appendChild(el);
  }

  // 이벤트 셀
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (isToday ? ' today' : '');
    const key = _dateKey(d);
    const evts = _getFilteredEvents(key);
    if (evts.length === 0) {
      const emp = document.createElement('div'); emp.className = 'cal-empty'; emp.textContent = '—'; cell.appendChild(emp);
    } else {
      evts.forEach(ev => cell.appendChild(_makeEvtEl(ev)));
    }
    if (hasPerm('sales')) {
      cell.style.cursor = 'pointer';
      cell.onclick = () => { resetRegForm(); openRegModal(key); };
    }
    grid.appendChild(cell);
  }
}

// ── 일 뷰 ──
function renderDayView() {
  const tl = document.getElementById('cal-today-list'); if (tl) tl.innerHTML = '';
  const d = calDate;
  document.getElementById('calTitle').textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${DAY_KO[d.getDay()]})`;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  grid.className = 'cal-day-view';

  // 필터에 따른 이벤트 목록 생성
  const evts = _getFilteredEvents(_dateKey(d));
  if (evts.length === 0) {
    const emp = document.createElement('div'); emp.className = 'cal-day-empty'; emp.textContent = '이 날의 캠페인이 없습니다.'; grid.appendChild(emp);
    return;
  }
  evts.forEach(ev => {
    const c = ev.idx !== null ? DATA[ev.idx] : null;
    const label = c ? _cName(c) : ev.t;
    const time  = c?.date ? c.date.split(' ')[1] || '' : '';
    const item = document.createElement('div');
    item.className = 'cal-day-item';
    item.innerHTML = `<div class="cal-day-dot" style="background:${_evColor(ev)};"></div>${time ? `<span class="cal-day-time">${time}</span>` : ''}<span>${label}</span>`;
    item.onclick = () => ev.idx !== null ? openCalPreview(ev.idx) : toast(label + ' 클릭됨', 'ok');
    grid.appendChild(item);
  });
}

// ══════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════
function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.classList.add('open');
  const modal = overlay.querySelector('.modal');
  if (modal) modal.scrollTop = 0;
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ESC로 모든 모달 닫기 (배경 클릭으로는 닫히지 않음)
document.addEventListener('keydown', e => {
  // 로그인 기록 (admin 전용 비밀 단축키)
  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
    e.preventDefault();
    openLoginHistory();
    return;
  }
  // 라이트박스가 열려있으면 방향키 / ESC 처리
  const lb = document.getElementById('modalLightbox');
  if (lb && lb.style.display === 'flex') {
    if (e.key === 'ArrowRight') { lightboxNav(1);  return; }
    if (e.key === 'ArrowLeft')  { lightboxNav(-1); return; }
    if (e.key === 'Escape')     { closeLightbox(); return; }
  }
  if (e.key !== 'Escape') return;
  // 캠페인 수정 화면이 활성 중이면 ESC 무시
  if (document.getElementById('screen-edit')?.classList.contains('active')) return;
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
let _tt;
function toast(msg, type='ok'){
  clearTimeout(_tt);
  const t=document.getElementById('toast');
  t.className=`toast ${type}`;
  document.getElementById('toastMsg').textContent=msg;
  t.style.display='flex';
  _tt=setTimeout(()=>t.style.display='none',3000);
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
const STATUS_COLORS = {'부킹확정':'#3b5bdb','테스트완료':'#e67700','성과입력대기':'#2f9e44','성과입력완료':'#7048e8'};

function _renderMiniList(campaigns, listElId) {
  const listEl = document.getElementById(listElId);
  if (campaigns.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px;">해당 조건의 캠페인이 없습니다.</div>';
    return;
  }
  listEl.innerHTML = campaigns.map(c => {
    const idx = DATA.indexOf(c);
    const color = CAT_COLOR[_getCat(c)] || '#9da3bc';
    const dateStr = _formatDate(c.date);
    // 모바일용 짧은 날짜: MM-DD HH:mm
    const dateShort = (c.date || '').length >= 10
      ? c.date.slice(5, 10) + (c.date.length > 10 ? ' ' + c.date.slice(11, 16) : '')
      : dateStr;
    return `<div class="mini-item" onclick="openCalPreview(${idx})">
    <div class="mini-dot" style="background:${color};"></div>
    <span class="mini-cat" style="color:${color};">${_escHtml(_getCat(c))}</span>
    <span class="mini-date"><span class="mini-date-full">${dateStr}</span><span class="mini-date-short">${dateShort}</span></span>
    <span class="mini-name">${_escHtml(_cName(c))}</span>
    <span class="badge b-${c.status}">${c.status}</span>
    ${c.ops ? `<span class="mini-ops">${_escHtml(c.ops)}</span>` : ''}
    </div>`;
  }).join('');
}

// ── 브레인큐브: 전체 캠페인 단계별 리스트 ──
let activeAllFilter = '부킹확정';

function filterAllList(type) {
  activeAllFilter = type;
  document.querySelectorAll('.stage-row').forEach(r => r.classList.remove('active-stage'));
  const activeRow = document.getElementById('stage-' + type);
  if (activeRow) activeRow.classList.add('active-stage');

  _renderMiniList(DATA.filter(c => c.status === type), 'allMiniList');
}

// ── 나의 캠페인: 내 캠페인만 단계별 필터 ──
let activeMyCampaignFilter = '부킹확정';

function filterMyList(type) {
  activeMyCampaignFilter = type;
  const boardMap = {'부킹확정': 'mb-booking', '테스트완료': 'mb-test', '성과입력대기': 'mb-sent', '성과입력완료': 'mb-settle'};
  document.querySelectorAll('#my-boards .board').forEach(b => b.classList.remove('active-board'));
  const activeBoard = document.getElementById(boardMap[type]);
  if (activeBoard) activeBoard.classList.add('active-board');

  const myCampaigns = currentUser?.isAdmin ? DATA : DATA.filter(c => c.ops === (currentUser?.name || ''));
  _renderMiniList(myCampaigns.filter(c => c.status === type), 'myMiniList');
}

function renderDashboard() {
  const myCampaigns = currentUser?.isAdmin ? DATA : DATA.filter(c => c.ops === (currentUser?.name || ''));

  // ── 상단 통계 카드 ──
  const now = new Date();
  const thisYear = String(now.getFullYear());
  const curMonth = String(now.getMonth() + 1).padStart(2, '0');

  // 월 필터 초기화 (첫 렌더 시 현재 월로 설정)
  const dashMonthEl = document.getElementById('dash-stat-month');
  if (dashMonthEl && dashMonthEl.dataset.init !== '1') {
    dashMonthEl.value = curMonth;
    dashMonthEl.dataset.init = '1';
  }
  const selMonth = dashMonthEl?.value || '';
  const prefix = selMonth ? `${thisYear}-${selMonth}` : thisYear;

  const statData = DATA.filter(c => (c.date || '').startsWith(prefix));
  const campCnt  = statData.length;
  const sentQty  = statData.filter(c => c.sent).reduce((s, c) => s + (c.actual || c.qty || 0), 0);
  const totalQty = statData.reduce((s, c) => s + (c.qty || 0), 0);
  const statAdc  = statData.reduce((s, c) => {
    let adc = 0;
    if (c.product === 'DA') {
      adc = c.daAdcost || 0;
    } else if (c.product === 'CPA') {
      adc = c.adcostFixed || (c.db || c.qty || 0) * (c.sellUnit || 0);
    } else {
      const base = (c.sellBillBase||c.billBase||'actual') === 'sched' ? (c.qty||0)-(c.svc||0) : (c.actual ? c.actual-(c.svc||0) : (c.qty||0)-(c.svc||0));
      adc = c.adcostFixed || base * (c.sellUnit || 0);
    }
    return s + adc;
  }, 0);

  const lbl = selMonth ? `${+selMonth}월` : `${thisYear}년`;
  const campLbl = document.getElementById('dash-camp-lbl');
  const campSub = document.getElementById('dash-camp-sub');
  const adcLbl  = document.getElementById('dash-adc-lbl');
  if (campLbl) campLbl.textContent = lbl + ' 진행 캠페인';
  if (campSub) campSub.textContent = lbl + ' 기준';
  if (adcLbl)  adcLbl.textContent  = lbl + ' 광고비';

  const eYearCnt  = document.getElementById('dash-year-cnt');
  const eSentQty  = document.getElementById('dash-sent-qty');
  const eTotalQty = document.getElementById('dash-total-qty');
  const eMonthAdc = document.getElementById('dash-month-adc');
  if (eYearCnt)  eYearCnt.textContent  = campCnt + '건';
  if (eSentQty)  eSentQty.textContent  = sentQty.toLocaleString() + '건';
  if (eTotalQty) eTotalQty.textContent = '예정 ' + totalQty.toLocaleString() + '건 중';
  if (eMonthAdc) eMonthAdc.textContent = statAdc
    ? (statAdc >= 100000000 ? (statAdc/100000000).toFixed(2).replace(/\.?0+$/,'')+'억원' : (statAdc/10000).toFixed(2).replace(/\.?0+$/,'')+'만원')
    : '—';

  // 단계별 현황 (전체 캠페인 기준) - 건수
  ['부킹확정', '테스트완료', '성과입력대기', '성과입력완료'].forEach(s => {
    const cnt = DATA.filter(c => c.status === s).length;
    const cntEl = document.getElementById('stage-cnt-' + s);
    if (cntEl) cntEl.textContent = cnt + '건';
  });

  // 나의 캠페인 보드 (내 캠페인 기준)
  document.getElementById('mb-booking-cnt').textContent  = myCampaigns.filter(c => c.status === '부킹확정').length + '건';
  document.getElementById('mb-test-cnt').textContent     = myCampaigns.filter(c => c.status === '테스트완료').length + '건';
  document.getElementById('mb-sent-cnt').textContent     = myCampaigns.filter(c => c.status === '성과입력대기').length + '건';
  document.getElementById('mb-settle-cnt').textContent   = myCampaigns.filter(c => c.status === '성과입력완료').length + '건';

  filterAllList(activeAllFilter);
  filterMyList(activeMyCampaignFilter);

  // ── 파이프라인 통계 ──
  const activePipe = PIPELINE_DATA.filter(x => !x.archived);
  const pipeTotal  = activePipe.length;
  const pipeAmt    = activePipe.reduce((s, x) => s + _pipelineEstAmt(x), 0);
  const pipeComAct = activePipe.filter(x => x.stage === 'COMMITMENT' || x.stage === 'ACTUAL').length;
  const ePipeTotal = document.getElementById('dash-pipe-total');
  const ePipeAmt   = document.getElementById('dash-pipe-amt');
  const ePipeCom   = document.getElementById('dash-pipe-com');
  if (ePipeTotal) ePipeTotal.textContent = pipeTotal + '건';
  if (ePipeAmt)   ePipeAmt.textContent   = Math.round(pipeAmt / 10000).toLocaleString() + '만원';
  if (ePipeCom)   ePipeCom.textContent   = pipeComAct + '건';
}

// ══════════════════════════════════════════
// EXCEL EXPORT
// ══════════════════════════════════════════

function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

function _xlsxDownload(rows, filename) {
  if (typeof XLSX === 'undefined') { toast('엑셀 라이브러리 로드 실패. 인터넷 연결을 확인해주세요.', 'err'); return; }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // 헤더 행 스타일 (굵게) - xlsx-lite에서 지원
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

/** 캠페인 목록 엑셀 다운로드 (현재 필터 적용된 목록) */
function downloadCampaignsExcel() {
  const headers = [
    'ID', '카테고리', '캠페인명', '매체사', '상품', '매출처', '광고내용',
    '담당자', '부서', '발송일시',
    '발송예약수량', '실발송수량', '클릭수', 'CTR(%)',
    '매출단가(원)', '매입단가(원)', '서비스물량', '할인금액(원)', '수수료율(%)', '대행료율(%)', '단계'
  ];
  const rows = [headers, ...filtered.map(c => {
    const ctrVal = c.ctr != null ? (typeof c.ctr === 'string' ? parseFloat(c.ctr) : c.ctr) : '';
    const opsUser = USERS.find(u => u.name === c.ops);
    const deptDisplay = opsUser ? [opsUser.bonbu, opsUser.dept].filter(Boolean).join(' ') : c.dept;
    return [
      c.id, c.cat, _cName(c), c.media, c.product,
      c.seller || c.adv || '', c.content || '',
      c.ops, deptDisplay, c.date,
      c.qty || '', c.actual || '', c.clicks != null ? c.clicks : '', ctrVal,
      c.sellUnit || '', c.buyUnit || '', c.svc || '', c.disc || '', c.comm || '', c.agrate || '', c.status
    ];
  })];
  _xlsxDownload(rows, `캠페인목록_${_todayStr()}.xlsx`);
  toast('✓ 캠페인 목록 엑셀 다운로드 완료', 'ok');
}

/** 정산탭 현재 필터 기준 데이터 반환 (renderSettlement와 동일 로직) */
function _getStlFilteredData() {
  const scope    = document.getElementById('stl-fScope')?.value  || 'settled';
  const prod     = document.getElementById('stl-fProd')?.value   || '';
  const cat      = document.getElementById('stl-fCat')?.value    || '';
  const media    = document.getElementById('stl-fMedia')?.value  || '';
  const adv      = document.getElementById('stl-fAdv')?.value    || '';
  const ops      = document.getElementById('stl-fOps')?.value    || '';
  const fQ       = (document.getElementById('stl-fQ')?.value     || '').trim().toLowerCase();
  const { bonbu, team } = _parseOrgFilter(document.getElementById('stl-fOrg')?.value || '');
  const selYear  = document.getElementById('stl-year')?.value    || '';
  const selMonth = document.getElementById('stl-month')?.value   || '';
  return DATA.filter(c => {
    if (scope === 'settled') {
      if      (c.product === 'DA')  { if (!c.daAdcost)              return false; }
      else if (c.product === 'CPA') { if (!c.db && !c.qty)            return false; }
      else if (c.status !== '성과입력완료') return false;
    }
    if (prod  && c.product !== prod) return false;
    if (cat   && c.cat   !== cat)    return false;
    if (media && c.media !== media)  return false;
    if (adv   && (c.seller || c.adv || '') !== adv) return false;
    if (ops   && c.ops   !== ops)    return false;
    if (team || bonbu) {
      const u = USERS.find(u => u.name === c.ops);
      if (bonbu && (!u || u.bonbu !== bonbu)) return false;
      if (team  && (!u || u.dept  !== team))  return false;
    }
    if (selYear  && !c.date.startsWith(selYear))    return false;
    if (selMonth && c.date.slice(5,7) !== selMonth) return false;
    if (fQ && !_cName(c).toLowerCase().includes(fQ) && !(c.id||'').toLowerCase().includes(fQ)) return false;
    return true;
  });
}

/** 정산 엑셀 다운로드 */
async function downloadSettlementExcel() {
  if (typeof ExcelJS === 'undefined') { toast('ExcelJS 라이브러리 로드 실패. 인터넷 연결을 확인해주세요.', 'err'); return; }
  const settled = _getStlFilteredData().slice().sort((a, b) => {
    const ca = (a.cat || '').localeCompare(b.cat || '', 'ko');
    if (ca !== 0) return ca;
    const cb = (_cCompany(a) || '').localeCompare(_cCompany(b) || '', 'ko');
    if (cb !== 0) return cb;
    return (a.content || '').localeCompare(b.content || '', 'ko');
  });
  if (settled.length === 0) { toast('다운로드할 정산 데이터가 없습니다.', 'err'); return; }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dashboard';
  const ws = wb.addWorksheet('정산내역');

  // 열 정의 (너비 + 헤더)
  const colDefs = [
    { header: '발송일자',      width: 13 },
    { header: '상품',          width: 10 },
    { header: '카테고리',      width: 12 },
    { header: '매출처',        width: 18 },
    { header: '캠페인',        width: 28 },
    { header: '매출단가',      width: 12, numFmt: '#,##0' },
    { header: '발송수량',      width: 11, numFmt: '#,##0' },
    { header: '정산수량',      width: 11, numFmt: '#,##0' },
    { header: '매출액',        width: 14, numFmt: '#,##0' },
    { header: 'VAT포함(매출)', width: 15, numFmt: '#,##0' },
    { header: '정산율(%)',     width: 10, numFmt: '0.0' },
    { header: '매체사',        width: 16 },
    { header: '매입처',        width: 16 },
    { header: '매입단가',      width: 12, numFmt: '#,##0' },
    { header: '인정수량',      width: 11, numFmt: '#,##0' },
    { header: '매입액',        width: 14, numFmt: '#,##0' },
    { header: 'VAT포함(매입)', width: 15, numFmt: '#,##0' },
    { header: '정산율(%)',     width: 10, numFmt: '0.0' },
    { header: '대행수수료%',   width: 12, numFmt: '0.0' },
    { header: '대행수수료',    width: 14, numFmt: '#,##0' },
    { header: '매출이익',      width: 14, numFmt: '#,##0' },
    { header: '매출이익율(%)', width: 13, numFmt: '0.0' },
    { header: '매출계산서발행', width: 14 },
    { header: '입금',          width: 10 },
    { header: '매입계산서발행', width: 14 },
    { header: '지급',          width: 10 },
  ];
  ws.columns = colDefs.map(d => ({ width: d.width }));

  // 구분선 열 (오른쪽 border 두껍게): 매출 정산율%, 매입 정산율%, 매출이익율%
  const SEP_COLS = new Set([11, 18, 22]);

  // 헤더 행
  const headerRow = ws.addRow(colDefs.map(d => d.header));
  headerRow.eachCell((cell, colNum) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = {
      top:    { style: 'thin',  color: { argb: 'FFB0BBD0' } },
      bottom: { style: 'thin',  color: { argb: 'FFB0BBD0' } },
      left:   { style: 'thin',  color: { argb: 'FFB0BBD0' } },
      right:  SEP_COLS.has(colNum)
        ? { style: 'medium', color: { argb: 'FF7A94C1' } }
        : { style: 'thin',  color: { argb: 'FFB0BBD0' } },
    };
  });
  headerRow.height = 22;

  // 자동 필터
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colDefs.length } };

  // 데이터 행
  settled.forEach(c => {
    const a      = _stlAmt(c);
    const has    = _stlHas(c);
    const hasBuy = has && (!!c.buyUnit || !!c.buyAmtFixed || (c.product === 'DA' && !!c.comm));
    const r  = v => has    ? v : null;
    const rb = v => hasBuy ? v : null;
    const buyQty = a.buyActual ?? a.actual ?? 0;

    const values = [
      c.date ? c.date.slice(0, 10) : '',
      c.product, c.cat, _cCompany(c), _cName(c),
      r(c.sellUnit), r(c.qty), r(a.actual),
      r(a.amt ?? a.adc), r((a.amt ?? a.adc) + a.adcVat), r(+a.stlRate.toFixed(1)),
      c.media, MEDIA_DATA.find(x => x.company === c.media)?.invoiceTo || '',
      rb(c.buyUnit), rb(buyQty), rb(a.buyAmt), rb(a.buyAmt + a.buyVat), rb(+a.stlRate.toFixed(1)),
      r(c.comm), r(a.agFee), r(a.prf), r(+a.prfRate.toFixed(1)),
      c.invoiceOut ? '발행' : '미발행',
      c.payIn      ? '완료' : '미완료',
      c.invoiceIn  ? '발행' : '미발행',
      c.payOut     ? '완료' : '미완료',
    ];

    const row = ws.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const def = colDefs[colNum - 1];
      if (def?.numFmt && cell.value !== null && cell.value !== '') cell.numFmt = def.numFmt;
      if (typeof cell.value === 'number') cell.alignment = { horizontal: 'right' };
      cell.border = {
        top:    { style: 'hair',  color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'hair',  color: { argb: 'FFDDDDDD' } },
        left:   { style: 'hair',  color: { argb: 'FFDDDDDD' } },
        right:  SEP_COLS.has(colNum)
          ? { style: 'medium', color: { argb: 'FF7A94C1' } }
          : { style: 'hair',  color: { argb: 'FFDDDDDD' } },
      };
    });
  });

  // 첫 행 고정
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `정산내역_${_todayStr()}.xlsx`; a.click();
  URL.revokeObjectURL(url);
  toast('✓ 정산 내역 엑셀 다운로드 완료', 'ok');
}

/** 계산서 엑셀 — 매체사(매입처)별 시트 + 이미지 포함 (ExcelJS) */
async function downloadInvoiceExcel() {
  if (typeof ExcelJS === 'undefined') { toast('ExcelJS 라이브러리 로드 실패. 인터넷 연결을 확인해주세요.', 'err'); return; }
  const settled = _getStlFilteredData();
  if (settled.length === 0) { toast('다운로드할 데이터가 없습니다.', 'err'); return; }

  toast('엑셀 생성 중...', 'ok');

  // 이미지 캐시 미스 시 Firebase에서 로드
  const needLoad = settled.filter(c => c.invoiceInHasImg && !_INVOICE_IMG_CACHE[c.id]);
  await Promise.all(needLoad.map(async c => {
    const img = await _fbLoadInvoiceImage(c.id);
    if (img) _INVOICE_IMG_CACHE[c.id] = img;
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dashboard';

  // 퍼미션콜 항목은 별도 시트(디앤유/OHC)로 분리
  const pcCamps = settled.filter(c => c.product === '퍼미션콜');

  // 퍼미션콜 제외하고 매체사별 그룹핑
  const byMedia = {};
  settled.filter(c => c.product !== '퍼미션콜').forEach(c => {
    const key = c.media || '미지정';
    if (!byMedia[key]) byMedia[key] = [];
    byMedia[key].push(c);
  });

  for (const media of Object.keys(byMedia).sort()) {
    const mediaInfo = MEDIA_DATA.find(x => x.company === media);
    if (mediaInfo?.payDay === '선입금') continue; // 선입금 매체사는 시트 생성 제외
    const camps = byMedia[media];
    const invoiceTo = mediaInfo?.invoiceTo || '';
    const ws = wb.addWorksheet(media.slice(0, 31));

    // A열 공백, B열(2)부터 표
    // 열 순서: A(빈칸), B광고기간, C캠페인명, D상품, E광고비, F매입단가, G매입액, H VAT, I합계, J계산서
    ws.columns = [
      { width: 3  }, // A — 빈칸
      { width: 14 }, // B — 광고기간
      { width: 36 }, // C — 캠페인명
      { width: 12 }, // D — 상품
      { width: 14 }, // E — 광고비(실청구액)
      { width: 13 }, // F — 매입단가
      { width: 14 }, // G — 매입액
      { width: 12 }, // H — VAT
      { width: 14 }, // I — 합계
      { width: 10 }, // J — 계산서
    ];

    // 제목 행 (B열에 표기)
    const titleRow = ws.addRow(['', `[${media}] 광고비 지급요청서`]);
    titleRow.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF185FA5' } };
    if (invoiceTo) {
      const subRow = ws.addRow(['', `청구처: ${invoiceTo}`]);
      subRow.getCell(2).font = { size: 11, color: { argb: 'FF555555' } };
    }
    ws.addRow([]);

    // 헤더 행
    const headerRow = ws.addRow(['', '광고기간', '캠페인명', '상품', '광고비', '매입단가(원)', '매입액(원)', 'VAT(원)', '합계(원)', '계산서']);
    headerRow.eachCell((cell, colNum) => {
      if (colNum === 1) return;
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 데이터 행
    // 숫자 열(1-based): E=5(광고비), F=6(매입단가), G=7(매입액), H=8(VAT), I=9(합계)
    const NUM_COLS = new Set([5, 6, 7, 8, 9]);
    let totalAdc = 0, totalBuy = 0, totalVat = 0;
    camps.forEach(c => {
      const a = _stlAmt(c);
      const has = _stlHas(c);
      const hasBuy = has && (!!c.buyUnit || !!c.buyAmtFixed || (c.product === 'DA' && !!c.comm));
      const adcost = has ? (a.amt ?? a.adc) : null;
      const buyAmt = hasBuy ? a.buyAmt : null;
      const buyVat = hasBuy ? a.buyVat : null;
      if (adcost) totalAdc += adcost;
      if (buyAmt)  totalBuy += buyAmt;
      if (buyVat)  totalVat += buyVat;

      const row = ws.addRow([
        '',
        (c.date || '').slice(0, 10),
        _cName(c),
        c.product || '',
        adcost,
        hasBuy ? (c.buyUnit || null) : null,
        buyAmt,
        buyVat,
        hasBuy ? buyAmt + buyVat : null,
        c.invoiceIn || '미처리',
      ]);
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum === 1) return;
        if (NUM_COLS.has(colNum) && typeof cell.value === 'number') {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        }
        cell.border = {
          top:    { style: 'hair', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
          left:   { style: 'hair', color: { argb: 'FFDDDDDD' } },
          right:  { style: 'hair', color: { argb: 'FFDDDDDD' } },
        };
      });
    });

    // 합계 행
    const totalRow = ws.addRow(['', '합계', '', '', totalAdc, '', totalBuy, totalVat, totalBuy + totalVat, '']);
    totalRow.eachCell((cell, colNum) => {
      if (colNum === 1) return;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };
      if (NUM_COLS.has(colNum) && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
    });

    ws.addRow([]);
    ws.addRow([]);

    // 이미지 삽입
    for (const c of camps) {
      const imgs = _INVOICE_IMG_CACHE[c.id];
      if (!imgs || !imgs.length) continue;

      // 캠페인 레이블 행 (B열에 표기)
      const labelRow = ws.addRow(['', `▼ ${_cName(c)}`]);
      labelRow.getCell(2).font = { italic: false, color: { argb: 'FF333333' }, size: 10 };

      for (const imgData of imgs) {
        const ext = imgData.startsWith('data:image/png') ? 'png' : 'jpeg';
        const base64 = imgData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        const imgId = wb.addImage({ base64, extension: ext });
        const anchorRow = ws.rowCount;

        ws.addImage(imgId, {
          tl: { col: 1, row: anchorRow },        // B열(0-based=1)부터
          br: { col: 9, row: anchorRow + 20 },   // J열(0-based=9)까지
          editAs: 'oneCell',
        });

        for (let i = 0; i < 20; i++) ws.addRow([]);
        ws.addRow([]);
      }
    }
  }

  // 퍼미션콜 → 디앤유 / OHC 시트 2개 생성
  if (pcCamps.length > 0) {
    const PC_NUM_COLS = new Set([5, 6, 7, 8, 9]); // E(광고비) F(매입단가) G(매입액) H(VAT) I(합계)
    const _buildPCSheet = (sheetName, billTo, getBuyAmt, buyUnit) => {
      const ws = wb.addWorksheet(sheetName);
      ws.columns = [
        { width: 3  }, { width: 14 }, { width: 36 }, { width: 12 },
        { width: 14 }, { width: 13 }, { width: 14 }, { width: 12 },
        { width: 14 }, { width: 10 },
      ];

      // 1행: 제목
      const titleRow = ws.addRow(['', '[퍼미션콜] 광고비 지급요청서']);
      titleRow.getCell(2).font = { bold: true, size: 14, color: { argb: 'FF185FA5' } };

      // 2행: 청구처
      const subRow = ws.addRow(['', `청구처: ${billTo}`]);
      subRow.getCell(2).font = { size: 11, color: { argb: 'FF555555' } };

      // 3행: 헤더 (빈 행 없이 바로)
      const hdrRow = ws.addRow(['', '광고기간', '캠페인명', '상품', '광고비', '매입단가(원)', '매입액(원)', 'VAT(원)', '합계(원)', '계산서']);
      hdrRow.eachCell((cell, colNum) => {
        if (colNum === 1) return;
        cell.font = { bold: true, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // 데이터 행
      let totalAdc = 0, totalBuy = 0;
      pcCamps.forEach(c => {
        const agree  = c.pcAgree   || 0;
        const advU   = c.pcAdvUnit || 0;
        const adcost = agree * advU;
        const buyAmt = getBuyAmt(c);
        const vat    = Math.round(buyAmt * 0.1);
        const total  = buyAmt + vat;
        totalAdc += adcost;
        totalBuy += buyAmt;

        const dataRow = ws.addRow([
          '', (c.date || '').slice(0, 10), _cName(c), '퍼미션콜',
          adcost || null, buyUnit || null, buyAmt, vat, total, '미처리',
        ]);
        dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
          if (colNum === 1) return;
          if (PC_NUM_COLS.has(colNum)) {
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right' };
          }
          cell.border = {
            top: { style: 'hair', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
            left: { style: 'hair', color: { argb: 'FFDDDDDD' } }, right: { style: 'hair', color: { argb: 'FFDDDDDD' } },
          };
        });
      });

      // 합계 행
      const totalVat   = Math.round(totalBuy * 0.1);
      const totalTotal = totalBuy + totalVat;
      const totalRow = ws.addRow([
        '', '합계', '', '', totalAdc || null, '', totalBuy, totalVat, totalTotal, '',
      ]);
      totalRow.eachCell((cell, colNum) => {
        if (colNum === 1) return;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };
        if (PC_NUM_COLS.has(colNum)) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        }
      });
    };

    _buildPCSheet('디앤유', '디앤유', c => (c.pcAgree || 0) * 5500, 5500);
    _buildPCSheet('OHC', 'OHC', c => c.pcOhcCost || 0, null);
  }

  // 버퍼 → Blob → 다운로드
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `광고비 지급요청서_${_todayStr()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ 광고비 지급요청서 다운로드 완료', 'ok');
}

/** 다운로드 드롭다운 토글 (fixed 위치 계산) */
function toggleStlDownload(btn) {
  const menu = document.getElementById('stl-dl-menu');
  if (!menu) return;
  const opening = menu.style.display === 'none' || !menu.style.display;
  if (!opening) { menu.style.display = 'none'; return; }
  // 버튼 위치 기준으로 fixed 좌표 계산
  const r = btn.getBoundingClientRect();
  menu.style.display = '';
  const menuW = menu.offsetWidth;
  menu.style.top  = (r.bottom + 4) + 'px';
  menu.style.left = Math.max(4, r.right - menuW) + 'px';
  setTimeout(() => {
    document.addEventListener('click', function _close(e) {
      if (!e.target.closest('#stl-dl-menu') && !e.target.closest('#stl-dl-wrap')) {
        menu.style.display = 'none';
        document.removeEventListener('click', _close);
      }
    });
  }, 0);
}

// ── 계산서 이미지 캐시 (campaignId → base64) ──
const _INVOICE_IMG_CACHE = {}; // campaignId → string[] (base64 배열)
let _invoiceInPendingImgs = []; // 모달 임시 배열

/** Firebase — 계산서 이미지 로드 (배열 반환, 구버전 단일 데이터 호환) */
async function _fbLoadInvoiceImage(campaignId) {
  if (!window._db) return null;
  try {
    const doc = await window._db.collection('invoiceImages').doc(campaignId).get();
    if (!doc.exists) return null;
    const d = doc.data();
    // 구버전: { data: '...' } → 배열로 변환
    if (d.images) return d.images;
    if (d.data)   return [d.data];
    return null;
  } catch(e) { console.error('[FB] 계산서 이미지 로드 실패:', e); return null; }
}

/** Firebase — 계산서 이미지 저장 (null이면 삭제) */
async function _fbSaveInvoiceImage(campaignId, imgs) {
  if (!window._db) return;
  try {
    if (imgs && imgs.length) {
      await window._db.collection('invoiceImages').doc(campaignId).set({
        images: imgs, updatedAt: new Date().toISOString()
      });
    } else {
      await window._db.collection('invoiceImages').doc(campaignId).delete();
    }
  } catch(e) { console.error('[FB] 계산서 이미지 저장 실패:', e); }
}

/** 이미지 리사이즈/압축 후 배열에 추가 */
function _invInAddImage(dataUrl) {
  const tmpImg = new Image();
  tmpImg.onload = () => {
    const MAX_W = 1400;
    const scale = tmpImg.width > MAX_W ? MAX_W / tmpImg.width : 1;
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(tmpImg.width  * scale);
    canvas.height = Math.round(tmpImg.height * scale);
    canvas.getContext('2d').drawImage(tmpImg, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    _invoiceInPendingImgs.push(compressed);
    _renderInvInImgList();
  };
  tmpImg.src = dataUrl;
}

/** 이미지 목록 렌더링 */
function _renderInvInImgList() {
  const list = document.getElementById('invInImgList');
  const st   = document.getElementById('invInPasteStatus');
  if (!list) return;
  list.innerHTML = _invoiceInPendingImgs.map((src, i) => `
    <div style="position:relative;display:inline-block;">
      <img src="${src}" onclick="openLightbox(${i})" style="width:90px;height:72px;object-fit:cover;border-radius:5px;border:1px solid var(--border);cursor:zoom-in;">
      <button onclick="invInRemoveImg(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#e53;color:#fff;border:none;cursor:pointer;font-size:11px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;">✕</button>
    </div>`).join('');
  if (st) st.textContent = _invoiceInPendingImgs.length ? `✓ ${_invoiceInPendingImgs.length}장 첨부됨` : '';
}

// ── 이미지 라이트박스 ──
let _lbImgs = [];
let _lbIdx  = 0;

function openLightbox(idx) {
  _lbImgs = [..._invoiceInPendingImgs];
  _lbIdx  = idx;
  _lbRender();
  const el = document.getElementById('modalLightbox');
  if (el) { el.style.display = 'flex'; }
}

function closeLightbox() {
  const el = document.getElementById('modalLightbox');
  if (el) el.style.display = 'none';
  _lbImgs = [];
}

function lightboxNav(dir) {
  _lbIdx = (_lbIdx + dir + _lbImgs.length) % _lbImgs.length;
  _lbRender();
}

function _lbRender() {
  const img     = document.getElementById('lb-img');
  const counter = document.getElementById('lb-counter');
  const prev    = document.getElementById('lb-prev');
  const next    = document.getElementById('lb-next');
  if (img)     img.src = _lbImgs[_lbIdx] || '';
  if (counter) counter.textContent = _lbImgs.length > 1 ? `${_lbIdx + 1} / ${_lbImgs.length}` : '';
  const multi = _lbImgs.length > 1;
  if (prev) prev.style.display = multi ? 'flex' : 'none';
  if (next) next.style.display = multi ? 'flex' : 'none';
}

/** 이미지 삭제 */
function invInRemoveImg(idx) {
  _invoiceInPendingImgs.splice(idx, 1);
  _renderInvInImgList();
}

/** 파일 선택 → 이미지 추가 */
function invInFileSelect(input) {
  const files = Array.from(input.files || []);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => _invInAddImage(ev.target.result);
    reader.readAsDataURL(file);
  });
  input.value = ''; // 동일 파일 재선택 허용
}

// 클립보드 붙여넣기 → 계산서 이미지 (modalInvoiceIn 열렸을 때만)
document.addEventListener('paste', function(e) {
  const modal = document.getElementById('modalInvoiceIn');
  if (!modal || !modal.classList.contains('open')) return;
  if (_invoiceInPendingValue !== '발행완료') return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    const reader = new FileReader();
    reader.onload = ev => _invInAddImage(ev.target.result);
    reader.readAsDataURL(file);
    break;
  }
});

// ══════════════════════════════════════════
// 월별 발송량
// ══════════════════════════════════════════
function renderMonthly() {
  // 연도 셀렉트 초기화 (최초 1회)
  const yearSel  = document.getElementById('mly-year');
  const monthSel = document.getElementById('mly-month');
  const now = new Date();
  const curYear  = String(now.getFullYear());
  const curMonth = String(now.getMonth() + 1).padStart(2, '0');
  const years = [...new Set(DATA.map(c => c.date.slice(0,4)))].sort();
  if (yearSel.options.length === 0) {
    years.forEach(y => { const o = document.createElement('option'); o.value=y; o.textContent=y+'년'; yearSel.appendChild(o); });
    yearSel.value = years.includes(curYear) ? curYear : years[years.length-1];
    monthSel.value = curMonth;
  }
  const year = yearSel.value;
  const month = monthSel.value; // '' or '01'~'12'
  const src = DATA.filter(c => {
    if (!c.date.startsWith(year)) return false;
    if (month && c.date.slice(5,7) !== month) return false;
    return true;
  });
  const fmt = n => n ? n.toLocaleString() : '—';

  // ── 1열: 요약 블록 ──────────────────────────
  const totalQty    = src.reduce((s,c) => s+(c.qty||0), 0);
  const totalActual = src.reduce((s,c) => s+(c.actual||0), 0);
  const totalAdc    = src.reduce((s,c) => {
    if (c.product === 'DA') return s + (c.daAdcost || 0);
    if (c.product === 'CPA') return s + (c.adcostFixed || (c.db || c.qty || 0) * (c.sellUnit || 0));
    if (c.product === '퍼미션콜') return s + (c.pcAgree || 0) * (c.pcAdvUnit || 0);
    const base = (c.sellBillBase||c.billBase||'actual')==='sched' ? (c.qty||0)-(c.svc||0) : (c.actual ? c.actual-(c.svc||0) : (c.qty||0)-(c.svc||0));
    return s + (c.adcostFixed || base*(c.sellUnit||0));
  }, 0);
  const fmtAdc = v => v >= 100000000 ? (v/100000000).toFixed(2).replace(/\.?0+$/,'')+'억원' : (v/10000).toFixed(2).replace(/\.?0+$/,'')+'만원';
  document.getElementById('mly-stats').innerHTML = [
    ['집행건수',    src.length,           '건',  null],
    ['총 부킹수량', totalQty,             '건',  null],
    ['실 발송수량', totalActual||null,    '건',  null],
    ['총 광고비',   totalAdc||null,       '',    fmtAdc],
  ].map(([label,val,unit,customFmt]) => `
    <div class="mly-stat-row">
      <span class="mly-stat-label">${label}</span>
      <span class="mly-stat-val">${val ? (customFmt ? customFmt(val) : fmt(val)+'<span class="mly-stat-unit">'+unit+'</span>') : '—'}</span>
    </div>`).join('');

  // ── 2열: 매체별 발송량 ───────────────────────
  const mediaMap = {};
  src.forEach(c => {
    if (!mediaMap[c.media]) mediaMap[c.media] = {qty:0,actual:0,campaigns:[]};
    mediaMap[c.media].qty    += c.qty||0;
    mediaMap[c.media].actual += c.actual||0;
    mediaMap[c.media].campaigns.push(c);
  });
  const mediaMaxQty = Math.max(...Object.values(mediaMap).map(m=>m.qty), 1);
  document.getElementById('mly-media-list').innerHTML = Object.entries(mediaMap)
    .sort((a,b) => b[1].qty - a[1].qty)
    .map(([name,m]) => {
      const pct = m.qty / mediaMaxQty * 100;
      return `<div onclick="mlySelectMedia('${name}')" style="cursor:pointer;padding:10px 12px;border-radius:8px;margin-bottom:6px;border:1px solid var(--border);transition:background .15s;" class="mly-media-row" data-media="${name}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:600;font-size:13px;">${name}</span>
          <span style="font-size:12px;color:var(--text2);">${m.qty.toLocaleString()}건</span>
        </div>
        <div style="background:var(--border);border-radius:3px;height:6px;overflow:hidden;">
          <div style="width:${pct.toFixed(1)}%;height:100%;background:var(--accent);border-radius:3px;"></div>
        </div>
      </div>`;
    }).join('') || '<div style="color:var(--text3);font-size:13px;">데이터 없음</div>';

  // ── 3열: 광고주별 발송량 (카테고리 토글) ──────
  const catMap = {};
  src.forEach(c => {
    if (!catMap[c.cat]) catMap[c.cat] = {};
    const adv = _cCompany(c) || c.adv || '—';
    if (!catMap[c.cat][adv]) catMap[c.cat][adv] = 0;
    catMap[c.cat][adv] += c.qty||0;
  });
  document.getElementById('mly-adv-list').innerHTML = Object.entries(catMap)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([cat,advs]) => {
      const catTotal = Object.values(advs).reduce((s,v)=>s+v,0);
      const rows = Object.entries(advs).sort((a,b)=>b[1]-a[1])
        .map(([adv,qty]) => `
          <div style="display:flex;justify-content:space-between;padding:5px 12px 5px 24px;font-size:13px;border-bottom:1px solid var(--border);">
            <span>${adv}</span><span style="color:var(--text2);">${qty.toLocaleString()}건</span>
          </div>`).join('');
      const borderColor = CAT_COLOR[cat] || 'var(--border)';
      return `<div style="margin-bottom:4px;">
        <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none';this.querySelector('.mly-arrow').textContent=this.nextElementSibling.style.display===''?'▲':'▼';"
          style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:6px;font-weight:600;font-size:13px;border-left:4px solid ${borderColor};">
          <span><span class="mly-arrow">▲</span> ${cat}</span>
          <span style="color:var(--text2);font-weight:400;">${catTotal.toLocaleString()}건</span>
        </div>
        <div>${rows}</div>
      </div>`;
    }).join('') || '<div style="color:var(--text3);font-size:13px;">데이터 없음</div>';

  // 카테고리 패널 초기화
  document.getElementById('mly-cat-title').textContent = '카테고리별 성과';
  document.getElementById('mly-cat-panel').innerHTML = '<div style="color:var(--text3);font-size:13px;">매체사를 클릭하면 카테고리별 성과가 표시됩니다.</div>';
}

function mlyToggleCat(subId, row) {
  const sub   = document.getElementById(subId);
  const arrow = document.getElementById(subId + '-arrow');
  if (!sub) return;
  const open = sub.style.display === 'none';
  sub.style.display = open ? '' : 'none';
  if (arrow) arrow.textContent = open ? '▼' : '▶';
}

function mlySelectMedia(mediaName) {
  // 선택 하이라이트
  document.querySelectorAll('.mly-media-row').forEach(el => {
    el.style.background = el.dataset.media === mediaName ? 'var(--primary-light, #eff6ff)' : '';
    el.style.borderColor = el.dataset.media === mediaName ? 'var(--primary)' : 'var(--border)';
  });

  const year  = document.getElementById('mly-year').value;
  const month = document.getElementById('mly-month').value;
  const src = DATA.filter(c => {
    if (c.media !== mediaName) return false;
    if (!c.date.startsWith(year)) return false;
    if (month && c.date.slice(5,7) !== month) return false;
    return true;
  });

  const catMap = {};
  src.forEach(c => {
    if (!catMap[c.cat]) catMap[c.cat] = {qty:0,clicks:0,adc:0,list:[]};
    const base = (c.sellBillBase||c.billBase||'actual')==='sched' ? (c.qty||0)-(c.svc||0) : (c.actual ? c.actual-(c.svc||0) : (c.qty||0)-(c.svc||0));
    catMap[c.cat].qty    += c.qty||0;
    catMap[c.cat].clicks += c.clicks||0;
    catMap[c.cat].adc    += base*(c.sellUnit||0);
    catMap[c.cat].list.push(c);
  });

  const fmtAdc = v => v >= 100000000 ? (v/100000000).toFixed(2).replace(/\.?0+$/,'')+'억원' : v >= 10000 ? (v/10000).toFixed(2).replace(/\.?0+$/,'')+'만원' : v ? v.toLocaleString()+'원' : '—';

  document.getElementById('mly-cat-title').textContent = `카테고리별 성과 — ${mediaName}`;
  document.getElementById('mly-cat-panel').innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="border-bottom:2px solid var(--border);">
        <th style="text-align:left;padding:6px 8px;color:var(--text2);">카테고리</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text2);">발송수량</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text2);">광고비</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text2);">클릭수</th>
        <th style="text-align:right;padding:6px 8px;color:var(--text2);">클릭률</th>
      </tr></thead>
      <tbody>
        ${Object.entries(catMap).sort((a,b)=>b[1].qty-a[1].qty).map(([cat,d], i) => {
          const ctr = d.qty ? (d.clicks/d.qty*100).toFixed(2)+'%' : '—';
          const subId = `mly-sub-${i}`;
          const subRows = d.list.sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(c => {
            const cBase = (c.sellBillBase||c.billBase||'actual')==='sched' ? (c.qty||0)-(c.svc||0) : (c.actual ? c.actual-(c.svc||0) : (c.qty||0)-(c.svc||0));
            const cAdc  = cBase * (c.sellUnit||0);
            const cCtr  = (c.qty && c.clicks) ? (c.clicks/c.qty*100).toFixed(2)+'%' : '—';
            return `<tr style="background:var(--surface2);cursor:pointer;" onclick="openCalPreview(DATA.indexOf(DATA.find(d=>d.id==='${c.id}')))">
              <td style="padding:5px 8px 5px 22px;color:var(--text2);font-size:12px;">${(c.date||'').slice(0,10)}</td>
              <td colspan="1" style="padding:5px 8px;font-size:12px;color:var(--text);">${_escHtml(_cName(c))}</td>
              <td style="text-align:right;padding:5px 8px;font-size:12px;">${c.qty ? c.qty.toLocaleString() : '—'}</td>
              <td style="text-align:right;padding:5px 8px;font-size:12px;color:var(--accent);">${fmtAdc(cAdc)}</td>
              <td style="text-align:right;padding:5px 8px;font-size:12px;">${cCtr}</td>
            </tr>`;
          }).join('');
          return `<tr style="border-top:1px solid var(--border);cursor:pointer;" onclick="mlyToggleCat('${subId}',this)">
            <td style="padding:8px;font-weight:600;">
              <span id="${subId}-arrow" style="font-size:10px;margin-right:4px;color:var(--text3);">▶</span>${cat}
              <span style="font-size:11px;font-weight:400;color:var(--text3);margin-left:4px;">${d.list.length}건</span>
            </td>
            <td style="text-align:right;padding:8px;">${d.qty.toLocaleString()}</td>
            <td style="text-align:right;padding:8px;color:var(--accent);font-weight:600;">${fmtAdc(d.adc)}</td>
            <td style="text-align:right;padding:8px;">${d.clicks ? d.clicks.toLocaleString() : '—'}</td>
            <td style="text-align:right;padding:8px;">${ctr}</td>
          </tr>
          <tr id="${subId}" style="display:none;"><td colspan="5" style="padding:0;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid var(--border);">
                <th style="text-align:left;padding:4px 8px 4px 22px;font-size:11px;color:var(--text3);font-weight:600;">날짜</th>
                <th style="text-align:left;padding:4px 8px;font-size:11px;color:var(--text3);font-weight:600;">캠페인</th>
                <th style="text-align:right;padding:4px 8px;font-size:11px;color:var(--text3);font-weight:600;">발송수량</th>
                <th style="text-align:right;padding:4px 8px;font-size:11px;color:var(--text3);font-weight:600;">광고비</th>
                <th style="text-align:right;padding:4px 8px;font-size:11px;color:var(--text3);font-weight:600;">클릭률</th>
              </tr></thead>
              <tbody>${subRows}</tbody>
            </table>
          </td></tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
// 매체사 관리
// ══════════════════════════════════════════
let mediaEditIdx = null; // null=신규, n=수정

let mediaSortDir = null; // null | 'asc' | 'desc'

function toggleMediaSort() {
  mediaSortDir = mediaSortDir === 'asc' ? 'desc' : mediaSortDir === 'desc' ? null : 'asc';
  const arrow = document.getElementById('media-sort-arrow');
  if (arrow) arrow.textContent = mediaSortDir === 'asc' ? ' ▲' : mediaSortDir === 'desc' ? ' ▼' : '';
  renderMediaList();
}

function searchMedia() { renderMediaList(); }

function resetMediaSearch() {
  document.getElementById('mediaQ').value = '';
  document.getElementById('mediaType').value = '';
  mediaSortDir = null;
  const arrow = document.getElementById('media-sort-arrow');
  if (arrow) arrow.textContent = '';
  renderMediaList();
}

function renderMediaList() {
  const q    = (document.getElementById('mediaQ')?.value   || '').trim().toLowerCase();
  const type = (document.getElementById('mediaType')?.value || '');
  const isAdmin = currentUser && currentUser.isAdmin;
  const nd = '<span style="color:var(--text3)">—</span>';
  const v = x => x || nd;
  const pct = x => x != null && x !== '' ? x+'%' : nd;

  // admin 전용 컬럼 헤더 표시
  const thActive = document.getElementById('media-th-active');
  if (thActive) thActive.style.display = isAdmin ? '' : 'none';

  let list = MEDIA_DATA.map((m, realIdx) => ({m, realIdx})).filter(({m}) => {
    if (type && m.type !== type) return false;
    if (q && ![(m.company||''),(m.contact||''),(m.tel||'')].some(s => s.toLowerCase().includes(q))) return false;
    return true;
  });
  if (mediaSortDir) {
    const order = {'매체사':0, '대행사':1};
    list.sort((a, b) => {
      const va = order[a.m.type] ?? 2, vb = order[b.m.type] ?? 2;
      return mediaSortDir === 'asc' ? va - vb : vb - va;
    });
  }
  const colspan = isAdmin ? 20 : 19;
  document.getElementById('media-tbody').innerHTML = list.map(({m, realIdx}, i) => {
    const isOn = m.active !== false;
    const toggleCell = isAdmin
      ? `<td style="text-align:center;" onclick="toggleMediaActive(${realIdx}, event)">
           <span class="toggle-sw${isOn ? ' on' : ''}"></span>
         </td>`
      : '';
    return `<tr onclick="openMediaDetail(${realIdx})" style="cursor:pointer;${isOn ? '' : 'opacity:.45;'}">
      <td class="td-dim" style="border-right:1px solid var(--border);">${i+1}</td>
      ${toggleCell}
      <td style="font-weight:600;">${v(m.company)}</td>
      <td>${v(m.invoiceTo)}</td>
      <td class="td-r" style="border-right:1px solid var(--border);">${m.unit ? m.unit.toLocaleString()+'원' : nd}</td>
      <td class="td-r">${pct(m.c1Base)}</td>
      <td class="td-r">${pct(m.c1Req)}</td>
      <td class="td-r" style="font-weight:600;">${pct(m.c1Adj)}</td>
      <td>${v(m.c1Reason)}</td>
      <td style="border-right:1px solid var(--border);">${v(m.note1)}</td>
      <td class="td-r">${pct(m.c2Base)}</td>
      <td class="td-r">${pct(m.c2Req)}</td>
      <td class="td-r" style="font-weight:600;">${pct(m.c2Adj)}</td>
      <td>${v(m.c2Reason)}</td>
      <td>${v(m.note2)}</td>
      <td>${v(m.excTarget)}</td>
      <td>${v(m.excAdj)}</td>
      <td>${v(m.payDay)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="${colspan}" style="padding:32px;text-align:center;color:var(--text3);font-size:13px;">검색 결과가 없습니다.</td></tr>`;
}

function toggleMediaActive(realIdx, e) {
  e.stopPropagation();
  const m = MEDIA_DATA[realIdx];
  if (!m) return;
  m.active = m.active === false ? true : false;
  _fbSaveMedia(m);
  renderMediaList();
}

// ── 매체사/대행사 상세보기 ──
let currentMediaIdx = null;

function openMediaDetail(idx) {
  currentMediaIdx = idx;
  renderMediaDetail();
  goScreen('media-detail');
}

function renderMediaDetail() {
  const m = MEDIA_DATA[currentMediaIdx];
  if (!m) return;
  const nd = '<span class="f-pending">—</span>';
  const v   = x => (x != null && x !== '') ? _escHtml(String(x)) : nd;
  const pct = x => (x != null && x !== '') ? `<span class="f-mono">${x}%</span>` : nd;
  const isAgency = m.type === '대행사';

  // 상단 배지 + 제목
  const badge = document.getElementById('med-detail-badge');
  badge.className = `badge ${isAgency ? 'b-테스트완료' : 'b-확정'}`;
  badge.textContent = m.type || '매체사';
  document.getElementById('med-detail-title').textContent = m.company || '';
  const delBtn = document.getElementById('med-detail-del-btn');
  if (delBtn) delBtn.style.display = (currentUser && currentUser.isAdmin) ? '' : 'none';

  // 기본 정보
  document.getElementById('med-detail-basic').innerHTML =
    `<div class="field"><span class="f-label">매체명</span><span class="f-val" style="font-weight:600;">${v(m.company)}</span></div>
    <div class="field"><span class="f-label">매입처 (청구)</span><span class="f-val">${v(m.invoiceTo)}</span></div>
    <div class="field"><span class="f-label">단가 (원/건)</span><span class="f-val f-mono">${m.unit ? m.unit.toLocaleString()+'원' : nd}</span></div>
    <div class="field"><span class="f-label">담당자</span><span class="f-val">${v(m.contact)}</span></div>
    <div class="field"><span class="f-label">연락처</span><span class="f-val f-mono">${v(m.tel)}</span></div>
    <div class="field"><span class="f-label">작성일</span><span class="f-val f-mono">${v(m.createdAt)}</span></div>`;

  // 수수료1
  document.getElementById('med-detail-c1').innerHTML =
    `<div class="field"><span class="f-label">기준</span><span class="f-val">${pct(m.c1Base)}</span></div>
    <div class="field"><span class="f-label">요청</span><span class="f-val">${pct(m.c1Req)}</span></div>
    <div class="field"><span class="f-label">조정</span><span class="f-val" style="font-weight:700;color:var(--accent);">${pct(m.c1Adj)}</span></div>
    <div class="field"><span class="f-label">조정사유</span><span class="f-val">${v(m.c1Reason)}</span></div>
    <div class="field"><span class="f-label">비고</span><span class="f-val">${v(m.note1)}</span></div>`;

  // 수수료2
  document.getElementById('med-detail-c2').innerHTML =
    `<div class="field"><span class="f-label">기준</span><span class="f-val">${pct(m.c2Base)}</span></div>
    <div class="field"><span class="f-label">요청</span><span class="f-val">${pct(m.c2Req)}</span></div>
    <div class="field"><span class="f-label">조정</span><span class="f-val" style="font-weight:700;color:var(--accent);">${pct(m.c2Adj)}</span></div>
    <div class="field"><span class="f-label">조정사유</span><span class="f-val">${v(m.c2Reason)}</span></div>
    <div class="field"><span class="f-label">비고</span><span class="f-val">${v(m.note2)}</span></div>`;

  // 예외사항
  document.getElementById('med-detail-exc').innerHTML =
    `<div class="field"><span class="f-label">대상</span><span class="f-val">${v(m.excTarget)}</span></div>
    <div class="field"><span class="f-label">조정</span><span class="f-val">${v(m.excAdj)}</span></div>
    <div class="field"><span class="f-label">광고비 지급일자</span><span class="f-val">${v(m.payDay)}</span></div>`;
}

function openMediaModalFromDetail() {
  openMediaModal(currentMediaIdx);
}

function deleteMediaFromDetail() {
  if (currentMediaIdx == null) return;
  const m = MEDIA_DATA[currentMediaIdx];
  if (!m) return;
  const linked = DATA.filter(c => c.media === m.company);
  if (linked.length > 0) {
    toast(`⚠ 해당 매체사를 사용 중인 캠페인이 ${linked.length}건 있어 삭제할 수 없습니다.`, 'warn');
    return;
  }
  if (!confirm(`'${m.company}' 항목을 삭제하시겠습니까?`)) return;
  const company = m.company;
  MEDIA_DATA.splice(currentMediaIdx, 1);
  currentMediaIdx = null;
  _fbDeleteMedia(company);
  renderMediaList();
  goScreen('media');
  toast('✓ 삭제되었습니다', 'ok');
}

function openMediaModal(idx) {
  mediaPendingCombo = null;
  mediaEditIdx = idx ?? null;
  const d = {type:'매체사',company:'',invoiceTo:'',unit:'',contact:'',tel:'',c1Base:'',c1Req:'',c1Adj:'',c1Reason:'',note1:'',c2Base:'',c2Req:'',c2Adj:'',c2Reason:'',note2:'',excTarget:'',excAdj:'',createdAt:''};
  const m = idx != null ? MEDIA_DATA[idx] : d;
  document.getElementById('med-title').textContent = idx != null ? '매체사 수정' : '매체사 등록';
  document.getElementById('med-del-btn').style.display = idx != null ? '' : 'none';
  document.getElementById('med-type').value = m.type || '매체사';
  medTypeChange();
  const _medNumKeys = ['unit','c1Base','c1Req','c1Adj','c2Base','c2Req','c2Adj'];
  ['company','invoiceTo','unit','contact','tel','c1Base','c1Req','c1Adj','c1Reason','note1','c2Base','c2Req','c2Adj','c2Reason','note2','excTarget','excAdj','payDay','createdAt']
    .forEach(k => { const el=document.getElementById('med-'+k); if(el) el.value = _medNumKeys.includes(k) ? (m[k] || '') : (m[k] ?? ''); });
  const taxYnEl = document.getElementById('med-taxYn');
  if (taxYnEl) taxYnEl.checked = m.taxYn !== false; // 기본값 true
  openModal('modalMedia');
}

function saveMedia() {
  const company = document.getElementById('med-company').value.trim();
  if (!company) { toast('⚠ 매체명을 입력해주세요','warn'); return; }
  const keys = ['company','invoiceTo','unit','contact','tel','c1Base','c1Req','c1Adj','c1Reason','note1','c2Base','c2Req','c2Adj','c2Reason','note2','excTarget','excAdj','payDay'];
  const obj = { type: document.getElementById('med-type').value || '매체사' };
  keys.forEach(k => {
    const v = document.getElementById('med-'+k)?.value ?? '';
    obj[k] = ['unit','c1Base','c1Req','c1Adj','c2Base','c2Req','c2Adj'].includes(k) ? (v===''?'':+v) : v;
  });
  obj.taxYn = document.getElementById('med-taxYn')?.checked !== false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  obj.createdAt = (mediaEditIdx != null && MEDIA_DATA[mediaEditIdx]?.createdAt) ? MEDIA_DATA[mediaEditIdx].createdAt : todayStr;
  const oldObj = mediaEditIdx != null ? Object.assign({}, MEDIA_DATA[mediaEditIdx]) : null;
  if (mediaEditIdx != null) MEDIA_DATA[mediaEditIdx] = obj;
  else { MEDIA_DATA.push(obj); currentMediaIdx = MEDIA_DATA.length - 1; }
  // 이름이 바뀐 경우 기존 문서 삭제 + 캠페인 media 필드 일괄 업데이트
  if (oldObj && oldObj.company !== obj.company) {
    _fbDeleteMedia(oldObj.company);
    DATA.forEach(c => {
      if (c.media === oldObj.company) {
        c.media = obj.company;
        _fbSaveCampaign(c);
      }
    });
  }
  _fbSaveMedia(obj);
  if (oldObj) _fbSaveMediaLog(oldObj, obj);
  const pendingCombo = mediaPendingCombo;
  mediaPendingCombo = null;
  closeModal('modalMedia');
  renderMediaList();
  // 상세보기에서 수정한 경우 상세화면도 갱신
  if (currentMediaIdx != null && document.getElementById('screen-media-detail').classList.contains('active')) {
    renderMediaDetail();
  }
  toast('✓ 저장되었습니다','ok');
  if (pendingCombo) {
    comboSelect(pendingCombo, obj.company);
  }
}

function deleteMedia() {
  if (mediaEditIdx == null) return;
  if (!confirm(`'${MEDIA_DATA[mediaEditIdx].company}' 항목을 삭제하시겠습니까?`)) return;
  const delCompany = MEDIA_DATA[mediaEditIdx].company;
  MEDIA_DATA.splice(mediaEditIdx, 1);
  _fbDeleteMedia(delCompany);
  currentMediaIdx = null;
  closeModal('modalMedia');
  renderMediaList();
  goScreen('media');
  toast('🗑 삭제되었습니다','err');
}

// ══════════════════════════════════════════
// 매출처 관리 (SELLER_DATA)
// ══════════════════════════════════════════
let sellerEditIdx = null;
let sellerPendingCombo = null;
let sellerBrands = [];
let _brandRenames = [];   // [{old, new}] — 모달 1회 편집 중 발생한 브랜드명 변경 추적
let _editingBrandName = null; // 현재 수정 중인 브랜드 구 이름
let _sellerTab = 'adv'; // 'adv' | 'agency'

function switchSellerTab(tab) {
  _sellerTab = tab;
  document.querySelectorAll('#seller-tabs .view-tab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('seller-vt-' + tab);
  if (btn) btn.classList.add('active');
  document.getElementById('seller-tab-adv').style.display    = tab === 'adv'    ? '' : 'none';
  document.getElementById('seller-tab-agency').style.display = tab === 'agency' ? '' : 'none';
  document.getElementById('seller-tab-lab').style.display    = tab === 'lab'    ? '' : 'none';

  // 등록 버튼 클릭 시 현재 탭 유형으로 열리도록 기본값 세팅
  const addBtn = document.getElementById('seller-add-btn');
  if (addBtn) addBtn.onclick = () => openSellerModal(null, tab === 'adv' ? '광고주' : tab === 'lab' ? '랩사' : '대행사');
  renderSellerList();
}

function renderSellerList() {
  const nd = '<span style="color:var(--text3)">—</span>';
  const q  = (document.getElementById('sellerQ')?.value || '').trim().toLowerCase();

  const searchResult  = document.getElementById('seller-search-result');
  const tabWrap       = document.getElementById('seller-tab-wrap');

  if (q) {
    // ── 통합 검색 결과 ──
    if (searchResult) searchResult.style.display = '';
    if (tabWrap)      tabWrap.style.display = 'none';

    const matched = SELLER_DATA.map((s, i) => ({s, i})).filter(({s}) => {
      const matchCompany = (s.company || '').toLowerCase().includes(q);
      const matchBrand   = (s.brands || []).some(b => (b.name || b).toLowerCase().includes(q));
      return matchCompany || matchBrand;
    });

    let rows = '';
    matched.forEach(({s, i}, rowNum) => {
      const typeBadge = s.type === '대행사'
        ? `<span class="badge b-테스트완료">대행사</span>`
        : s.type === '랩사'
        ? `<span class="badge b-성과입력대기">랩사</span>`
        : `<span class="badge b-확정">광고주</span>`;
      rows += `<tr onclick="openSellerModal(${i})" style="cursor:pointer;">
        <td class="td-dim">${rowNum + 1}</td>
        <td>${typeBadge}</td>
        <td style="font-weight:600;">${_escHtml(s.company)}</td>
        <td class="td-r">${(s.type === '대행사' || s.type === '랩사') && s.agrate ? s.agrate + '%' : nd}</td>
        <td class="td-dim td-r">${s.brands.length ? s.brands.length + '개' : nd}</td>
      </tr>`;
      (s.brands || []).forEach(b => {
        rows += `<tr style="background:var(--surface2);">
          <td></td><td></td>
          <td style="padding-left:20px;font-size:12px;color:var(--text2);">└ ${_escHtml(b.name||b)}${b.cat?`<span style="color:var(--text3);margin-left:4px;">(${b.cat})</span>`:''}</td>
          <td></td><td></td>
        </tr>`;
      });
    });
    const tbody = document.getElementById('seller-tbody-search');
    if (tbody) tbody.innerHTML = rows || '<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text3);">검색 결과가 없습니다.</td></tr>';
    const cnt = document.getElementById('seller-search-count');
    if (cnt) cnt.textContent = matched.length + '개사';

  } else {
    // ── 탭 뷰 ──
    if (searchResult) searchResult.style.display = 'none';
    if (tabWrap)      tabWrap.style.display = '';

    // 광고주
    const advList = SELLER_DATA.map((s, i) => ({s, i})).filter(({s}) => s.type === '광고주');
    let advRows = '';
    advList.forEach(({s, i}, rowNum) => {
      advRows += `<tr onclick="openSellerModal(${i})" style="cursor:pointer;">
        <td class="td-dim">${rowNum + 1}</td>
        <td style="font-weight:600;">${_escHtml(s.company)}</td>
        <td class="td-dim td-r">${s.brands.length ? s.brands.length + '개' : nd}</td>
      </tr>`;
      (s.brands || []).forEach(b => {
        advRows += `<tr style="background:var(--surface2);">
          <td></td>
          <td style="padding-left:20px;font-size:12px;color:var(--text2);">└ ${_escHtml(b.name||b)}${b.cat?`<span style="color:var(--text3);margin-left:4px;">(${b.cat})</span>`:''}</td>
          <td></td>
        </tr>`;
      });
    });
    const advTbody = document.getElementById('seller-tbody-adv');
    if (advTbody) advTbody.innerHTML = advRows || '<tr><td colspan="3" style="padding:32px;text-align:center;color:var(--text3);">등록된 광고주가 없습니다.</td></tr>';
    const advCnt = document.getElementById('seller-adv-count');
    if (advCnt) advCnt.textContent = advList.length + '개사';

    // 랩사
    const labList = SELLER_DATA.map((s, i) => ({s, i})).filter(({s}) => s.type === '랩사');
    let labRows = '';
    labList.forEach(({s, i}, rowNum) => {
      labRows += `<tr onclick="openSellerModal(${i})" style="cursor:pointer;">
        <td class="td-dim">${rowNum + 1}</td>
        <td style="font-weight:600;">${_escHtml(s.company)}</td>
        <td class="td-r">${s.agrate ? s.agrate + '%' : nd}</td>
        <td class="td-dim td-r">${s.brands.length ? s.brands.length + '개' : nd}</td>
      </tr>`;
      (s.brands || []).forEach(b => {
        labRows += `<tr style="background:var(--surface2);">
          <td></td>
          <td style="padding-left:20px;font-size:12px;color:var(--text2);">└ ${_escHtml(b.name||b)}${b.cat?`<span style="color:var(--text3);margin-left:4px;">(${b.cat})</span>`:''}</td>
          <td></td><td></td>
        </tr>`;
      });
    });
    const labTbody = document.getElementById('seller-tbody-lab');
    if (labTbody) labTbody.innerHTML = labRows || '<tr><td colspan="4" style="padding:32px;text-align:center;color:var(--text3);">등록된 랩사가 없습니다.</td></tr>';
    const labCnt = document.getElementById('seller-lab-count');
    if (labCnt) labCnt.textContent = labList.length + '개사';

    // 대행사
    const agencyList = SELLER_DATA.map((s, i) => ({s, i})).filter(({s}) => s.type === '대행사');
    let agencyRows = '';
    agencyList.forEach(({s, i}, rowNum) => {
      agencyRows += `<tr onclick="openSellerModal(${i})" style="cursor:pointer;">
        <td class="td-dim">${rowNum + 1}</td>
        <td style="font-weight:600;">${_escHtml(s.company)}</td>
        <td class="td-r">${s.agrate ? s.agrate + '%' : nd}</td>
        <td class="td-dim td-r">${s.brands.length ? s.brands.length + '개' : nd}</td>
      </tr>`;
      (s.brands || []).forEach(b => {
        agencyRows += `<tr style="background:var(--surface2);">
          <td></td>
          <td style="padding-left:20px;font-size:12px;color:var(--text2);">└ ${_escHtml(b.name||b)}${b.cat?`<span style="color:var(--text3);margin-left:4px;">(${b.cat})</span>`:''}</td>
          <td></td><td></td>
        </tr>`;
      });
    });
    const agencyTbody = document.getElementById('seller-tbody-agency');
    if (agencyTbody) agencyTbody.innerHTML = agencyRows || '<tr><td colspan="4" style="padding:32px;text-align:center;color:var(--text3);">등록된 대행사가 없습니다.</td></tr>';
    const agencyCnt = document.getElementById('seller-agency-count');
    if (agencyCnt) agencyCnt.textContent = agencyList.length + '개사';
  }
}

function searchSeller() { renderSellerList(); }
function resetSellerSearch() {
  const q = document.getElementById('sellerQ'); if (q) q.value = '';
  renderSellerList();
}

let brandAddPrefix = 'r';
function openBrandAddModal(prefix) {
  brandAddPrefix = prefix || 'r';
  const sellerName = document.getElementById(prefix + '_seller')?.value || '';
  document.getElementById('brand-add-company').textContent = sellerName;
  document.getElementById('brand-add-name').value = '';
  document.getElementById('brand-add-cat').selectedIndex = 0;
  openModal('modalBrandAdd');
}
function saveBrandAdd() {
  const name = document.getElementById('brand-add-name').value.trim();
  const cat  = document.getElementById('brand-add-cat').value;
  if (!name) { toast('⚠ 브랜드명을 입력해주세요', 'warn'); return; }
  if (!cat)  { toast('⚠ 카테고리를 선택해주세요', 'warn'); return; }
  const sellerName = document.getElementById('brand-add-company').textContent;
  const s = SELLER_DATA.find(x => x.company === sellerName);
  if (!s) { toast('⚠ 매출처를 찾을 수 없습니다', 'warn'); return; }
  if (!s.brands.find(b => (b.name || b) === name)) s.brands.push({name, cat});
  _fbSaveSeller(s);
  closeModal('modalBrandAdd');
  const contentCombo = brandAddPrefix === 'r' ? 'content' : brandAddPrefix === 'pm' ? 'pm_content' : 'e_content';
  comboSelect(contentCombo, name);
  const catId = brandAddPrefix === 'pm' ? 'pm-cat' : brandAddPrefix + '_cat';
  document.getElementById(catId).value = cat;
  if (brandAddPrefix === 'r') autoNameReg(); else if (brandAddPrefix !== 'pm') autoNameEdit();
  toast('✓ 브랜드가 추가되었습니다', 'ok');
}

function openSellerModalForCombo(type, comboName) {
  sellerPendingCombo = comboName;
  openSellerModal(null, type);
}

function openSellerModal(idx, defaultType) {
  sellerEditIdx = idx ?? null;
  const d = {type: defaultType || '광고주', company:'', agrate:0, brands:[]};
  const s = idx != null ? SELLER_DATA[idx] : d;
  sellerBrands = [...(s.brands || [])];
  _brandRenames = [];
  _editingBrandName = null;
  const _addBtn  = document.getElementById('sel-brand-add-btn');
  const _saveBtn = document.getElementById('sel-save-btn');
  if (_addBtn)  _addBtn.textContent = '추가';
  if (_saveBtn) { _saveBtn.disabled = false; _saveBtn.style.opacity = ''; }
  document.getElementById('sel-title').textContent = idx != null ? '매출처 수정' : '매출처 등록';
  document.getElementById('sel-del-btn').style.display = idx != null ? '' : 'none';
  document.getElementById('sel-type').value    = s.type || defaultType || '광고주';
  document.getElementById('sel-company').value = s.company || '';
  document.getElementById('sel-agrate').value  = s.agrate || '';
  document.getElementById('sel-brand-input').value = '';
  selTypeChange();
  renderSellerBrands();
  openModal('modalSeller');
}

function selTypeChange() {
  const type = document.getElementById('sel-type').value;
  const isAgency = type === '대행사' || type === '랩사';
  document.getElementById('sel-agency-fields').style.display = isAgency ? '' : 'none';
  document.getElementById('sel-adv-fields').style.display   = '';
}

function renderSellerBrands() {
  const el = document.getElementById('sel-brand-list');
  if (!el) return;
  if (!sellerBrands.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:4px 0;">추가된 브랜드 없음</div>';
    return;
  }
  el.innerHTML = sellerBrands.map((b, i) => {
    const name = b.name || b, cat = b.cat || '';
    return `<span class="tag" style="display:inline-flex;align-items:center;gap:4px;margin:2px 2px 2px 0;">
      ${_escHtml(name)}${cat?`<span style="font-size:11px;color:var(--text3);">(${cat})</span>`:''}
      <span style="cursor:pointer;color:var(--accent);font-size:12px;line-height:1;" title="수정" onclick="editSellerBrand(${i})">✏</span>
      <span style="cursor:pointer;color:var(--text2);font-size:14px;line-height:1;" title="삭제" onclick="removeSellerBrand(${i})">×</span>
    </span>`;
  }).join('');
}

function addSellerBrand() {
  const inp = document.getElementById('sel-brand-input');
  const cat = document.getElementById('sel-brand-cat')?.value || '';
  const val = (inp.value || '').trim();
  if (!val) return;
  if (!cat) { toast('⚠ 카테고리를 선택해주세요', 'warn'); return; }
  if (sellerBrands.find(b => (b.name || b) === val)) { toast('이미 추가된 브랜드입니다', 'warn'); return; }
  if (_editingBrandName && _editingBrandName !== val) {
    _brandRenames.push({ old: _editingBrandName, new: val });
  }
  _editingBrandName = null;
  sellerBrands.push({name: val, cat});
  inp.value = '';
  renderSellerBrands();
  const addBtn  = document.getElementById('sel-brand-add-btn');
  const saveBtn = document.getElementById('sel-save-btn');
  if (addBtn)  addBtn.textContent = '추가';
  if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = ''; }
}

function removeSellerBrand(i) {
  sellerBrands.splice(i, 1);
  renderSellerBrands();
}

function editSellerBrand(i) {
  const b = sellerBrands[i];
  if (!b) return;
  _editingBrandName = b.name || b;
  const inp = document.getElementById('sel-brand-input');
  const catSel = document.getElementById('sel-brand-cat');
  if (inp) inp.value = b.name || b;
  if (catSel && b.cat) catSel.value = b.cat;
  sellerBrands.splice(i, 1);
  renderSellerBrands();
  const addBtn  = document.getElementById('sel-brand-add-btn');
  const saveBtn = document.getElementById('sel-save-btn');
  if (addBtn)  addBtn.textContent = '수정';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.4'; }
  if (inp) inp.focus();
}

function saveSeller() {
  const type    = document.getElementById('sel-type').value;
  const company = document.getElementById('sel-company').value.trim();
  if (!company) { toast('⚠ 회사명을 입력해주세요', 'warn'); return; }
  const agrate  = +document.getElementById('sel-agrate').value || 0;
  const obj = { type, company, agrate, brands: [...sellerBrands] };
  if (sellerEditIdx != null) SELLER_DATA[sellerEditIdx] = obj;
  else SELLER_DATA.push(obj);
  _fbSaveSeller(obj);

  // 브랜드명 변경 → 관련 캠페인 일괄 업데이트
  if (_brandRenames.length > 0) {
    let updatedCount = 0;
    _brandRenames.forEach(({old: oldName, new: newName}) => {
      DATA.forEach(c => {
        if ((c.seller === company || c.adv === company) && c.content === oldName) {
          c.content = newName;
          _fbSaveCampaign(c);
          updatedCount++;
        }
      });
    });
    if (updatedCount > 0) toast(`✓ 저장되었습니다 (관련 캠페인 ${updatedCount}건 업데이트)`, 'ok');
    else toast('✓ 저장되었습니다', 'ok');
  } else {
    toast('✓ 저장되었습니다', 'ok');
  }
  _brandRenames = [];
  _editingBrandName = null;

  const pendingCombo = sellerPendingCombo;
  sellerPendingCombo = null;
  closeModal('modalSeller');
  renderSellerList();
  _populateAdvFilter();
  if (pendingCombo) comboSelect(pendingCombo, obj.company);
}

function deleteSellerItem() {
  if (sellerEditIdx == null) return;
  const name = SELLER_DATA[sellerEditIdx]?.company;
  if (!confirm(`'${name}' 항목을 삭제하시겠습니까?`)) return;
  const delName = SELLER_DATA[sellerEditIdx].company;
  SELLER_DATA.splice(sellerEditIdx, 1);
  _fbDeleteSeller(delName);
  sellerEditIdx = null;
  closeModal('modalSeller');
  renderSellerList();
  _populateAdvFilter();
  toast('🗑 삭제되었습니다', 'err');
}

// ══════════════════════════════════════════
// 월별 지급내역
// ══════════════════════════════════════════
const PAYMENT_DATA = [
  // ── 2026년 1월 ──
  {cat:'문자광고',media:'국민카드',  company:'국민카드',  amount:266200000, memo:'전체광고비 입금후 수수료 지급받음', account:'국민은행 009937-04-029374 (주)KB국민카드(데이터사업부)님',
   detail:{title:'국민카드 1월 정산',period:'2026-01',vatExcl:242000000,vatIncl:266200000,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'롯데카드',  company:'롯데카드',  amount:59677156,  memo:'', account:'',
   detail:{title:'롯데카드 1월 정산',period:'2026-01',vatExcl:54252000,vatIncl:59677156,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'BC카드',   company:'BC카드',   amount:64913195,  memo:'', account:'',
   detail:{title:'BC카드 1월 정산',period:'2026-01',vatExcl:59012000,vatIncl:64913195,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'우리카드',  company:'우리카드',  amount:39600000,  memo:'10월 입금건부터 계좌번호 변경', account:'우리은행 1005-103-718971',
   detail:{title:'우리카드 1월 정산',period:'2026-01',vatExcl:36000000,vatIncl:39600000,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'삼성카드',  company:'삼성카드',  amount:70117212,  memo:'', account:'',
   detail:{title:'삼성카드 1월 정산',period:'2026-01',vatExcl:63743000,vatIncl:70117212,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'신한카드',  company:'신한카드',  amount:28575800,  memo:'', account:'',
   detail:{title:'신한카드 1월 정산',period:'2026-01',vatExcl:25978000,vatIncl:28575800,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'하나카드',  company:'하나카드',  amount:59152401,  memo:'펫보험 CPS 6월비용포함', account:'하나은행 140-910039-19904 하나카드주식회사',
   detail:{title:'하나카드 1월 정산',period:'2026-01',vatExcl:53775000,vatIncl:59152401,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'CNCAD',   company:'CNCAD',   amount:43422500,  memo:'현대해상광고비 차감반영', account:'',
   detail:{title:'CNCAD 1월 정산',period:'2026-01',vatExcl:39475000,vatIncl:43422500,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'SKP',     company:'SKP',     amount:28985000,  memo:'25년 6월 지급건', account:'신한은행 56100351011831 에스케이플래닛㈜ 가상계좌로 25.07월 변경',
   detail:{title:'SKP 1월 정산',period:'2026-01',vatExcl:26350000,vatIncl:28985000,rows:[],editorHtml:''}},
  // ── 2026년 2월 ──
  {cat:'문자광고',media:'SKT비즈챗', company:'SKT',     amount:55427801,  memo:'전체광고비 입금후 수수료 지급받음', account:'신한은행 561-001-40016641 에스케이텔레콤(주)',
   detail:{title:'SKT비즈챗 2월 정산',period:'2026-02',vatExcl:50389000,vatIncl:55427801,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'KT',       company:'KT',      amount:0,          memo:'1억 선입금', account:'',
   detail:{title:'KT 2월 정산',period:'2026-02',vatExcl:0,vatIncl:0,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'LG',       company:'LG',      amount:0,          memo:'', account:'260-997015-18-394 ㈜LG유플러스 가상계좌',
   detail:{title:'LG 2월 정산',period:'2026-02',vatExcl:0,vatIncl:0,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'KB페이',    company:'디지털컴퍼니', amount:0,      memo:'메리츠보험 진행건은 별도 지급요청', account:'신한은행 140-013-336611 디지털컴퍼니㈜이영빈',
   detail:{title:'KB페이 2월 정산',period:'2026-02',vatExcl:0,vatIncl:0,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'신한카드',  company:'신한카드',  amount:7700000,   memo:'쏠페이 광고집행건', account:'[앱테크] 249-901-85412384 (신한)',
   detail:{title:'신한카드 2월 정산(쏠페이)',period:'2026-02',vatExcl:7000000,vatIncl:7700000,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'카카오페이', company:'카카오페이', amount:4400000, memo:'', account:'신한은행 140-011-985482 (주)카카오페이',
   detail:{title:'카카오페이 2월 정산',period:'2026-02',vatExcl:4000000,vatIncl:4400000,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'엘포인트',  company:'대홍기획',  amount:7040000,   memo:'', account:'우리은행 105-01-038814 ㈜대홍기획',
   detail:{title:'엘포인트 2월 정산',period:'2026-02',vatExcl:6400000,vatIncl:7040000,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'에듀패밀리', company:'아바드',   amount:12408000,  memo:'', account:'기업은행 330-025165-01-014 아바드㈜',
   detail:{title:'에듀패밀리 2월 정산',period:'2026-02',vatExcl:11280000,vatIncl:12408000,rows:[],editorHtml:''}},
  {cat:'문자광고',media:'앙쥬',    company:'무크하우스', amount:22770000, memo:'', account:'',
   detail:{title:'앙쥬 2월 정산',period:'2026-02',vatExcl:20700000,vatIncl:22770000,rows:[],editorHtml:''}},
];

let payEditIdx = null;

function renderPaymentList() {
  const fmt = n => n ? n.toLocaleString() : '—';
  const selYear  = document.getElementById('pay-year')?.value  || '';
  const selMonth = document.getElementById('pay-month')?.value || '';

  // 필터: 해당 연/월에 발송된 캠페인(DATA)이 있는 매체사만 표시
  const list = PAYMENT_DATA.map((p, i) => ({p, i})).filter(({p}) => {
    if (!selYear && !selMonth) return true;
    return DATA.some(c => {
      if (c.media !== p.media) return false;
      if (selYear  && !c.date.startsWith(selYear))  return false;
      if (selMonth && c.date.slice(5,7) !== selMonth) return false;
      return true;
    });
  });

  // 필터 레이블 업데이트
  const label = document.getElementById('pay-filter-label');
  if (label) {
    if (selYear || selMonth) {
      const y = selYear || '전체';
      const m = selMonth ? parseInt(selMonth)+'월' : '전체';
      label.textContent = `${y} ${m} — ${list.length}건`;
    } else {
      label.textContent = `전체 ${list.length}건`;
    }
  }

  document.getElementById('pay-tbody').innerHTML = list.map(({p, i}) => `
    <tr>
      <td>${p.cat}</td>
      <td style="font-weight:600;">${p.media}</td>
      <td>${p.company}</td>
      <td class="td-r" style="font-weight:600;">${p.amount ? p.amount.toLocaleString() : '—'}</td>
      <td style="color:var(--text2);font-size:12px;">${p.memo||'—'}</td>
      <td style="font-size:12px;color:var(--text2);">${p.account||'—'}</td>
      <td style="text-align:center;">
        <button class="btn btn-outline btn-sm" onclick="openPaymentDetail(${i})">더보기</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="7" style="padding:32px;text-align:center;color:var(--text3);">해당 기간의 지급내역이 없습니다.</td></tr>`;
}

function openPaymentDetail(idx, skipPush) {
  payEditIdx = idx;
  const p = PAYMENT_DATA[idx];
  const d = p.detail;
  const fmt = n => n ? n.toLocaleString() : '—';

  // 기간 파싱
  let monthLabel = '', yearMonthLabel = '';
  if (d.period) {
    const m = d.period.match(/(\d{4})-(\d{2})/);
    if (m) { monthLabel = `${parseInt(m[2])}월`; yearMonthLabel = `${m[1]}년 ${monthLabel}`; }
  }

  // 1열: 헤더
  document.getElementById('pd-headline').innerHTML =
    `<span style="font-size:18px;font-weight:700;">${p.media}</span>` +
    `<span style="font-size:15px;font-weight:500;margin-left:8px;">${yearMonthLabel ? yearMonthLabel+' ' : ''}정산금액</span>` +
    (d.period ? `<span style="font-size:13px;color:var(--text3);margin-left:12px;">정산기간 : ${d.period}</span>` : '');

  // 1열: 요약 표
  document.getElementById('pd-summary').innerHTML = `
    <table style="border-collapse:collapse;font-size:13px;">
      <thead><tr>
        <th style="padding:8px 24px;border:1px solid var(--border);background:var(--surface2);"></th>
        <th style="padding:8px 24px;border:1px solid var(--border);background:var(--surface2);">VAT별도</th>
        <th style="padding:8px 24px;border:1px solid var(--border);background:var(--surface2);">VAT포함</th>
      </tr></thead>
      <tbody><tr>
        <td style="padding:8px 24px;border:1px solid var(--border);font-weight:600;">${monthLabel || '정산'}금액</td>
        <td style="padding:8px 24px;border:1px solid var(--border);text-align:right;">${fmt(d.vatExcl)}</td>
        <td style="padding:8px 24px;border:1px solid var(--border);text-align:right;font-weight:700;">${fmt(d.vatIncl)}</td>
      </tr></tbody>
    </table>`;

  // 2열: 상세 내역 테이블
  const rowCols = ['date','campaign','sector','media','method','advertiser','reqQty','settlQty','mediaUnit','netUnit','adCostExcl','settlExcl','settlIncl','memo'];
  const rowHdrs = ['발송일','캠페인명','업종','매체사','발송방식','광고주','요청건수','정산건수','매체단가','입금단가(수수료제외)','광고비','정산금액(VAT별도)','정산금액(VAT포함)','메모'];
  const numCols = ['reqQty','settlQty','mediaUnit','netUnit','adCostExcl','settlExcl','settlIncl'];
  let tableHtml = '';
  if (d.rows && d.rows.length) {
    const totals = {reqQty:0,settlQty:0,adCostExcl:0,settlExcl:0,settlIncl:0};
    d.rows.forEach(r => { totals.reqQty+=r.reqQty||0; totals.settlQty+=r.settlQty||0; totals.adCostExcl+=r.adCostExcl||0; totals.settlExcl+=r.settlExcl||0; totals.settlIncl+=r.settlIncl||0; });
    const rowsHtml = d.rows.map(r => `<tr>${rowCols.map(k => `<td style="padding:6px 10px;border:1px solid var(--border);white-space:nowrap;text-align:${numCols.includes(k)?'right':'left'};">${r[k]!=null?(typeof r[k]==='number'?r[k].toLocaleString():r[k]):'—'}</td>`).join('')}</tr>`).join('');
    const totalHtml = `<tr style="font-weight:700;background:var(--surface2);">
      <td colspan="6" style="padding:6px 10px;border:1px solid var(--border);">TOTAL</td>
      <td style="padding:6px 10px;border:1px solid var(--border);text-align:right;">${totals.reqQty.toLocaleString()}</td>
      <td style="padding:6px 10px;border:1px solid var(--border);text-align:right;">${totals.settlQty.toLocaleString()}</td>
      <td colspan="2" style="border:1px solid var(--border);"></td>
      <td style="padding:6px 10px;border:1px solid var(--border);text-align:right;">${totals.adCostExcl.toLocaleString()}</td>
      <td style="padding:6px 10px;border:1px solid var(--border);text-align:right;">${totals.settlExcl.toLocaleString()}</td>
      <td style="padding:6px 10px;border:1px solid var(--border);text-align:right;">${totals.settlIncl.toLocaleString()}</td>
      <td style="border:1px solid var(--border);"></td>
    </tr>`;
    tableHtml = `${rowsHtml}${totalHtml}`;
  } else {
    tableHtml = `<tr><td colspan="${rowCols.length}" style="padding:32px;text-align:center;color:var(--text3);">등록된 상세 내역이 없습니다.</td></tr>`;
  }
  document.getElementById('pd-detail-table').innerHTML = tableHtml;

  // 3열: 첨부 이미지/메모
  document.getElementById('pd-editor').innerHTML = d.editorHtml || '<span style="color:var(--text3);font-size:13px;">첨부된 내용이 없습니다.</span>';

  goScreen('payment-detail', true);
  if (!skipPush) {
    history.pushState({ screen: 'payment-detail', payIdx: idx }, '', '#payment-detail');
  }
}

function openPaymentReg(idx) {
  payEditIdx = idx ?? null;
  const p = idx != null ? PAYMENT_DATA[idx] : {cat:'문자광고',media:'',company:'',amount:'',memo:'',account:'',detail:{title:'',period:'',vatExcl:'',vatIncl:'',rows:[],editorHtml:''}};
  const d = p.detail;
  document.getElementById('pay-reg-title').textContent = idx != null ? '월별 지급내역 수정' : '월별 지급내역 등록';
  // 연/월 셀렉트: 기존 period(YYYY-MM)에서 추출, 없으면 현재 연-월
  const now = new Date();
  const periodMatch = (d.period || '').match(/^(\d{4})-(\d{2})/);
  document.getElementById('pr-year').value  = periodMatch ? periodMatch[1] : String(now.getFullYear());
  document.getElementById('pr-month').value = periodMatch ? periodMatch[2] : String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('pr-cat').value     = p.cat;
  document.getElementById('pr-media').value   = p.media;
  document.getElementById('pr-company').value = p.company;
  document.getElementById('pr-amount').value  = p.amount || '';
  document.getElementById('pr-memo').value    = p.memo;
  document.getElementById('pr-account').value = p.account;
  document.getElementById('pr-det-title').value  = d.title;
  document.getElementById('pr-det-period').value = d.period;
  document.getElementById('pr-vatExcl').value    = d.vatExcl || '';
  document.getElementById('pr-vatIncl').value    = d.vatIncl || '';
  document.getElementById('pr-editor').innerHTML = d.editorHtml || '';
  _renderPayRows(d.rows || []);
  openModal('modalPayReg');
  _initPayEditor('pr-editor');
}

function _renderPayRows(rows) {
  document.getElementById('pr-rows').innerHTML = rows.map((r,i) => `
    <tr id="pr-row-${i}">
      <td><input class="form-input" style="width:95px;" id="prr-date-${i}" value="${r.date||''}"></td>
      <td><input class="form-input" style="width:130px;" id="prr-campaign-${i}" value="${r.campaign||''}"></td>
      <td><input class="form-input" style="width:70px;" id="prr-sector-${i}" value="${r.sector||''}"></td>
      <td><input class="form-input" style="width:80px;" id="prr-media-${i}" value="${r.media||''}"></td>
      <td><input class="form-input" style="width:70px;" id="prr-method-${i}" value="${r.method||''}"></td>
      <td><input class="form-input" style="width:100px;" id="prr-advertiser-${i}" value="${r.advertiser||''}"></td>
      <td><input class="form-input" style="width:75px;" type="number" id="prr-reqQty-${i}" value="${r.reqQty||''}"></td>
      <td><input class="form-input" style="width:75px;" type="number" id="prr-settlQty-${i}" value="${r.settlQty||''}"></td>
      <td><input class="form-input" style="width:70px;" type="number" id="prr-mediaUnit-${i}" value="${r.mediaUnit||''}"></td>
      <td><input class="form-input" style="width:70px;" type="number" id="prr-netUnit-${i}" value="${r.netUnit||''}"></td>
      <td><input class="form-input" style="width:100px;" type="number" id="prr-adCostExcl-${i}" value="${r.adCostExcl||''}"></td>
      <td><input class="form-input" style="width:100px;" type="number" id="prr-settlExcl-${i}" value="${r.settlExcl||''}"></td>
      <td><input class="form-input" style="width:100px;" type="number" id="prr-settlIncl-${i}" value="${r.settlIncl||''}"></td>
      <td><button class="btn btn-outline btn-sm" style="color:var(--err);" onclick="document.getElementById('pr-row-${i}').remove()">✕</button></td>
    </tr>`).join('');
}

function _addPayRow() {
  const tbody = document.getElementById('pr-rows');
  const i = tbody.rows.length;
  const tr = document.createElement('tr');
  tr.id = `pr-row-${i}`;
  tr.innerHTML = `
    <td><input class="form-input" style="width:95px;" id="prr-date-${i}"></td>
    <td><input class="form-input" style="width:130px;" id="prr-campaign-${i}"></td>
    <td><input class="form-input" style="width:70px;" id="prr-sector-${i}"></td>
    <td><input class="form-input" style="width:80px;" id="prr-media-${i}"></td>
    <td><input class="form-input" style="width:70px;" id="prr-method-${i}"></td>
    <td><input class="form-input" style="width:100px;" id="prr-advertiser-${i}"></td>
    <td><input class="form-input" style="width:75px;" type="number" id="prr-reqQty-${i}"></td>
    <td><input class="form-input" style="width:75px;" type="number" id="prr-settlQty-${i}"></td>
    <td><input class="form-input" style="width:70px;" type="number" id="prr-mediaUnit-${i}"></td>
    <td><input class="form-input" style="width:70px;" type="number" id="prr-netUnit-${i}"></td>
    <td><input class="form-input" style="width:100px;" type="number" id="prr-adCostExcl-${i}"></td>
    <td><input class="form-input" style="width:100px;" type="number" id="prr-settlExcl-${i}"></td>
    <td><input class="form-input" style="width:100px;" type="number" id="prr-settlIncl-${i}"></td>
    <td><button class="btn btn-outline btn-sm" style="color:var(--err);" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
}

function _initPayEditor(id) {
  const el = document.getElementById(id);
  if (el._pasteInit) return;
  el._pasteInit = true;
  el.addEventListener('paste', e => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = ev => {
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'max-width:100%;border-radius:4px;margin:4px 0;display:block;';
          const sel = window.getSelection();
          if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            range.setStartAfter(img);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            el.appendChild(img);
          }
        };
        reader.readAsDataURL(item.getAsFile());
        return;
      }
    }
  });
}

function savePayment() {
  const media = document.getElementById('pr-media').value.trim();
  if (!media) { toast('⚠ 매체명을 입력해주세요','warn'); return; }
  const rows = [];
  document.querySelectorAll('#pr-rows tr').forEach((tr,i) => {
    const g = k => document.getElementById(`prr-${k}-${i}`)?.value ?? '';
    const n = k => +g(k) || 0;
    rows.push({date:g('date'),campaign:g('campaign'),sector:g('sector'),media:g('media'),method:g('method'),advertiser:g('advertiser'),reqQty:n('reqQty'),settlQty:n('settlQty'),mediaUnit:n('mediaUnit'),netUnit:n('netUnit'),adCostExcl:n('adCostExcl'),settlExcl:n('settlExcl'),settlIncl:n('settlIncl')});
  });
  const obj = {
    cat:     document.getElementById('pr-cat').value,
    media,
    company: document.getElementById('pr-company').value,
    amount:  +document.getElementById('pr-amount').value || 0,
    memo:    document.getElementById('pr-memo').value,
    account: document.getElementById('pr-account').value,
    detail: {
      title:     document.getElementById('pr-det-title').value,
      period:    `${document.getElementById('pr-year').value}-${document.getElementById('pr-month').value}`,
      vatExcl:   +document.getElementById('pr-vatExcl').value || 0,
      vatIncl:   +document.getElementById('pr-vatIncl').value || 0,
      rows,
      editorHtml: document.getElementById('pr-editor').innerHTML,
    }
  };
  if (payEditIdx != null) PAYMENT_DATA[payEditIdx] = obj;
  else PAYMENT_DATA.push(obj);
  closeModal('modalPayReg');
  renderPaymentList();
  toast('✓ 저장되었습니다','ok');
}

// ══════════════════════════════════════════
// HISTORY-BASED ROUTING
// ══════════════════════════════════════════
window.addEventListener('popstate', (e) => {
  const state = e.state;
  if (!state) { goScreen('dashboard', true); return; }

  if (state.screen === 'edit') {
    // 수정화면 뒤로가기 → 캠페인 상세
    const idx = DATA.findIndex(d => d.id === state.id);
    if (idx !== -1) openDetail(idx, true);
    else goScreen('campaigns', true);
  } else if (state.screen === 'detail') {
    const idx = DATA.findIndex(d => d.id === state.id);
    if (idx !== -1) openDetail(idx, true);
    else goScreen('campaigns', true);
  } else if (state.screen === 'payment-detail') {
    if (state.payIdx != null) openPaymentDetail(state.payIdx, true);
    else goScreen('payment', true);
  } else {
    goScreen(state.screen, true);
  }
});

let stlView = 'adv'; // 'media' | 'adv' | 'agency' | 'campaign'

(function initRoute() {
  if (!checkAuth()) {
    // 비로그인 상태에서 detail URL 접근 시 → 로그인 후 복원을 위해 저장
    const h = location.hash.slice(1);
    if (h.startsWith('detail/')) sessionStorage.setItem('_afterLoginHash', h);
    goScreen('login', true);
    return;
  }
  _updateUserUI();
  // hash 기반으로 초기 스크린 결정 (새로고침 시 유지)
  const h = location.hash.slice(1); // e.g. "detail/C-2026-0047" or "dashboard"
  const parts = h.split('/');
  const screenName = parts[0];

  if ((screenName === 'detail' || screenName === 'edit') && parts[1]) {
    // 캠페인 상세/수정 복원 — edit는 새로고침 시 detail로 복원 (수정 상태는 유지 불가)
    window._pendingDetailId = parts[1];
    // campaigns 플래시 방지: detail 화면을 바로 활성화 (데이터는 FB 로드 후 채워짐)
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-detail').classList.add('active');
    document.querySelector('.topbar').style.display = 'none';
    history.replaceState({ screen: 'detail', id: parts[1] }, '', '#detail/' + parts[1]);
  } else if (screenName && document.getElementById('screen-' + screenName)) {
    goScreen(screenName, true);
    // 새로고침 시 필터 초기화
    if (screenName === 'campaigns') resetFilter();
    if (screenName === 'settlement') resetStlFilter();
    history.replaceState({ screen: screenName }, '', '#' + screenName);
  } else {
    goScreen('dashboard', true);
  }
})();

// hash 직접 변경(주소창 입력 등) 대응
window.addEventListener('hashchange', () => {
  if (!currentUser) return;
  const h = location.hash.slice(1);
  const parts = h.split('/');
  const screenName = parts[0];
  if ((screenName === 'detail' || screenName === 'edit') && parts[1]) {
    const idx = DATA.findIndex(c => c.id === parts[1]);
    if (idx !== -1) openDetail(idx, true);
    else { window._pendingDetailId = parts[1]; }
  } else if (screenName && document.getElementById('screen-' + screenName)) {
    goScreen(screenName, true);
  }
});


// ══════════════════════════════════════════
// SETTLEMENT (정산)
// DB 연동 시: invoiceOut/invoiceIn/payIn/payOut → campaigns 테이블 컬럼
//             또는 별도 settlement 테이블로 분리
// ══════════════════════════════════════════

/** 정산 데이터 표시 여부 (상품별 기준 필드 다름) */
function _stlHas(c) {
  if (c.product === 'DA')        return !!c.daAdcost;
  if (c.product === 'CPA')       return !!(c.db || c.qty);  // DB등록수 우선, 없으면 정산수량 기준
  if (c.product === '퍼미션콜')  return !!c.pcAdvUnit || !!c.pcAgree;
  return !!(c.sellUnit && c.qty);
}

/** 실발송수량(actual) 기준 정산 금액 계산 */
function _stlAmt(c) {
  // DA 캠페인: daAdcost 기준 (수량 개념 없음)
  if (c.product === 'DA') {
    const adc    = c.daAdcost || 0;
    const buyAmt = c.buyUnit  || Math.round(adc * (1 - (c.comm || 0) / 100));
    const adcVat = Math.round(adc * 0.1);
    const buyVat = Math.round(buyAmt * 0.1);
    const rev    = Math.round(adc * (c.comm   || 0) / 100);
    const agFee  = Math.round(adc * (c.agrate || 0) / 100);
    const prf    = rev - agFee;
    const prfRate = adc > 0 ? (prf / adc * 100) : 0;
    return { actual: 0, qty: 0, eu: 0, adc, amt: adc, adcVat, buyAmt, buyVat, stlRate: 0, agFee, prf, prfRate };
  }
  // 퍼미션콜
  if (c.product === '퍼미션콜') {
    const agree   = c.pcAgree   || 0;
    const advU    = c.pcAdvUnit || 0;
    const adc     = agree * advU;
    const ohcCost = c.pcOhcCost || 0;
    const dnuCost = agree * 5500;
    const prf     = adc - ohcCost - dnuCost;
    const prfRate = adc > 0 ? (prf / adc * 100) : 0;
    const adcVat  = Math.round(adc * 0.1);
    return { actual: agree, qty: agree, eu: advU, adc, amt: adc, adcVat, buyAmt: ohcCost + dnuCost, buyVat: Math.round((ohcCost + dnuCost) * 0.1), stlRate: 100, agFee: 0, prf, prfRate };
  }
  // CPA 캠페인: 실발송수량(actual) 기준, 미입력 시 정산수량(qty) 기준으로 폴백
  if (c.product === 'CPA') {
    const billQty = c.db || c.qty || 0;  // DB등록수 우선, 없으면 정산수량
    const qty     = c.qty      || 0;  // 정산예정수량 (stlRate 계산용)
    const unit    = c.sellUnit || 0;
    const adc     = c.adcostFixed || billQty * unit;
    const adcVat  = Math.round(adc * 0.1);
    const rev     = Math.round(adc * (c.comm   || 0) / 100);
    // 매입액 우선순위: buyAmtFixed > buyUnit × billQty > adc - rev(comm% 역산)
    const buyAmt  = c.buyAmtFixed || (c.buyUnit ? billQty * c.buyUnit : adc - rev);
    const buyVat  = Math.round(buyAmt * 0.1);
    const agFee   = Math.round(adc * (c.agrate || 0) / 100);
    const prf     = (c.buyAmtFixed || c.buyUnit) ? (adc - buyAmt - agFee) : (rev - agFee);
    const prfRate = adc > 0 ? (prf / adc * 100) : 0;
    const stlRate = qty > 0 ? (billQty / qty * 100) : 0;
    return { actual: billQty, qty, eu: unit, adc, amt: adc, adcVat, buyAmt, buyVat, stlRate, agFee, prf, prfRate };
  }
  const actual   = c.actual   || 0;
  const qty      = c.qty      || 0;
  const svc      = c.svc      || 0;
  const unit     = c.sellUnit || 0;
  const buyU     = c.buyUnit  || Math.round(unit * (1 - (c.comm || 0) / 100));
  const sellBillBase = c.sellBillBase || c.billBase || 'actual';
  const buyBillBase  = c.buyBillBase  || c.billBase || 'actual';
  const _stlBillQty = (base) => Math.max(0, (base === 'sched' ? qty : actual) - svc);
  const sellQty = _stlBillQty(sellBillBase);
  const buyQty  = _stlBillQty(buyBillBase);
  const disc    = c.disc || 0;
  const eu      = disc > 0 ? disc : unit;             // 실적용단가
  const adc     = c.adcostFixed  || sellQty * unit;   // 광고비 (매출단가 기준)
  const amt     = c.amtFixed     || sellQty * eu;     // 실청구 (할인단가 기준)
  const adcVat  = Math.round(amt * 0.1);
  const buyAmt  = c.buyAmtFixed  || buyQty * buyU;
  const buyVat  = Math.round(buyAmt * 0.1);
  const stlRate = qty > 0 ? (actual / qty * 100) : 0;
  const agFee   = Math.round(amt * (c.agrate || 0) / 100); // 대행료: agrate(대행%) 기준
  const prf     = c.profitFixed  || Math.round(amt - buyAmt - agFee);
  const prfRate = amt > 0 ? (prf / amt * 100) : 0;
  return { actual: sellQty, buyActual: buyQty, qty, disc, eu, adc, amt, adcVat, buyAmt, buyVat, stlRate, agFee, prf, prfRate };
}

/** 정산 동적 필터 드롭다운 채우기 (매출처·담당자·본부·팀) */
function _stlPopulateDynFilters() {
  // 광고주/대행사 (seller)
  const advEl = document.getElementById('stl-fAdv');
  if (advEl) {
    const cur = advEl.value;
    const advList = [...new Set(DATA.map(c => c.seller || c.adv || '').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    advEl.innerHTML = '<option value="">광고주/대행사</option>' + advList.map(v=>`<option value="${v}">${v}</option>`).join('');
    if (cur) advEl.value = cur;
  }
  // 담당자 (ops)
  const opsEl = document.getElementById('stl-fOps');
  if (opsEl) {
    const cur = opsEl.value;
    const opsList = [...new Set(DATA.map(c => c.ops || '').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
    opsEl.innerHTML = '<option value="">담당자</option>' + opsList.map(v=>`<option value="${v}">${v}</option>`).join('');
    if (cur) opsEl.value = cur;
  }
  // 본부/팀 통합 드롭다운 초기화 (최초 1회)
  const stlOrgEl = document.getElementById('stl-fOrg');
  if (stlOrgEl && !stlOrgEl.dataset.init) {
    stlOrgEl.innerHTML = '<option value="">본부/팀 전체</option>' + _buildOrgSelectHTML();
    stlOrgEl.dataset.init = '1';
  }
}


/** 정산 탭 필터 초기화 */
function resetStlFilter() {
  const now = new Date();
  const yEl = document.getElementById('stl-year');
  const mEl = document.getElementById('stl-month');
  if (yEl) yEl.value = String(now.getFullYear());
  if (mEl) mEl.value = String(now.getMonth() + 1).padStart(2, '0');
  const ids = ['stl-fScope', 'stl-fProd', 'stl-fCat', 'stl-fMedia', 'stl-fAdv', 'stl-fOps', 'stl-fOrg'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'stl-fScope' ? 'settled' : '';
  });
  const qEl = document.getElementById('stl-fQ');
  if (qEl) qEl.value = '';
  stlView = 'adv';
  ['campaign', 'adv', 'agency', 'media', 'pc'].forEach(t => {
    const el = document.getElementById('stl-vt-' + t);
    if (el) el.classList.toggle('active', t === 'adv');
  });
  _stlPopulateDynFilters();
  renderSettlement();
}

/** 보기 전환 */
function stlSetView(v) {
  stlView = v;
  ['campaign', 'adv', 'agency', 'media', 'pc'].forEach(t => {
    const el = document.getElementById('stl-vt-' + t);
    if (el) el.classList.toggle('active', t === v);
  });
  renderSettlement();
}


// ── 정산 테이블 wheel 스크롤 순서 제어 ──
// 화면 전체 스크롤 → 바닥 도달 후 표 스크롤
function _stlSetupWheelScroll() {
  const wrap    = document.querySelector('#screen-settlement .settle-table-wrap');
  const content = document.getElementById('content');
  if (!wrap || !content) return;
  wrap.addEventListener('wheel', e => {
    const down    = e.deltaY > 0;
    const wrapBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 1;
    const wrapTop    = wrap.scrollTop <= 0;
    if (down && wrapBottom) {
      e.preventDefault();
      content.scrollTop += e.deltaY;
    } else if (!down && wrapTop) {
      e.preventDefault();
      content.scrollTop += e.deltaY;
    }
  }, { passive: false });
}

// ── 정산 테이블 wrap 높이 동적 계산 (sticky thead 동작 조건) ──
function _stlSetWrapHeight() {
  const wrap = document.querySelector('#screen-settlement .settle-table-wrap');
  if (!wrap) return;
  const fake = document.getElementById('stl-fake-scroll');
  const fakeH = (fake && fake.style.display !== 'none') ? fake.offsetHeight : 0;
  const top = wrap.getBoundingClientRect().top;
  wrap.style.height = Math.max(200, window.innerHeight - top - fakeH + 200) + 'px';
}
window.addEventListener('resize', () => {
  if (document.getElementById('screen-settlement')?.classList.contains('active')) {
    _stlSetWrapHeight();
  }
});

// ── 정산 스크롤 잠금 (onSnapshot re-render 시 위치 보존) ──
let _stlScrollLock = null;
function _stlSaveScroll() {
  const wrap = document.querySelector('#screen-settlement .settle-table-wrap');
  _stlScrollLock = {
    left:  wrap ? wrap.scrollLeft : 0,
    top:   wrap ? wrap.scrollTop  : 0,
    until: Date.now() + 3000,
  };
}
function _stlRestoreScroll() {
  const lock = _stlScrollLock;
  if (!lock || Date.now() > lock.until) return;
  const _apply = () => {
    const nw = document.querySelector('#screen-settlement .settle-table-wrap');
    if (nw) { nw.scrollLeft = lock.left; nw.scrollTop = lock.top; }
    const fake = document.getElementById('stl-fake-scroll');
    if (fake && nw) fake.scrollLeft = lock.left;
  };
  _apply();
  requestAnimationFrame(_apply);
}

// ── 정산 체크 셀 in-place 업데이트 (renderSettlement 없이 해당 셀만 변경) ──
function _stlCellUpdate(campaignId, field) {
  const c = DATA.find(d => d.id === campaignId);
  if (!c) return;

  const td = document.querySelector(`[data-stlcell="${campaignId}_${field}"]`);
  if (td) {
    const sm = td.dataset.stlsmall === '1';
    if (field === 'invoiceIn') {
      const v = c.invoiceIn || '';
      if (v === '발행완료')
        td.innerHTML = `<span class="stl-inv-badge done" onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${campaignId}')">✓ 발행완료</span>`;
      else if (v === '발행필요없음')
        td.innerHTML = `<span class="stl-inv-badge none" onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${campaignId}')">불필요</span>`;
      else
        td.innerHTML = `<div class="chk" style="${sm?'width:18px;height:18px;':''}" onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${campaignId}')"></div>`;
    } else if (field === 'payIn' && c.payIn && c.payInDate) {
      td.innerHTML = `<span class="stl-inv-badge done" style="font-size:10px;white-space:nowrap;cursor:pointer;" onmousedown="event.preventDefault()" onclick="event.stopPropagation();toggleSettlePay('${campaignId}','payIn')">${c.payInDate}</span>`;
    } else {
      const on  = !!c[field];
      const sz  = sm ? 'width:18px;height:18px;font-size:10px;' : '';
      const dis = !_stlCanEdit(field) ? 'opacity:0.35;cursor:not-allowed;pointer-events:none;' : '';
      td.innerHTML = `<div class="chk${on?' on':''}" style="${sz}${dis}" onmousedown="event.preventDefault()" onclick="event.stopPropagation();toggleSettlePay('${campaignId}','${field}')">${on?'✓':''}</div>`;
    }
  }

  // 그룹 집계 배지 업데이트 (그룹 뷰에만 해당)
  const campRow = document.querySelector(`tr[data-stlcamp="${campaignId}"]`);
  if (!campRow) return;
  let groupRow = campRow.previousElementSibling;
  while (groupRow && !groupRow.hasAttribute('data-stlgroup')) groupRow = groupRow.previousElementSibling;
  if (!groupRow) return;
  const badgeTd = groupRow.querySelector(`[data-stlbadge="${field}"]`);
  if (!badgeTd) return;
  // 이 그룹에 속한 캠페인 IDs 수집
  const ids = [];
  let sib = groupRow.nextElementSibling;
  while (sib && !sib.hasAttribute('data-stlgroup')) {
    if (sib.dataset.stlcamp) ids.push(sib.dataset.stlcamp);
    sib = sib.nextElementSibling;
  }
  const total = ids.length;
  const done  = ids.filter(id => {
    const camp = DATA.find(d => d.id === id);
    if (!camp) return false;
    return field === 'invoiceIn'
      ? (camp.invoiceIn === '발행완료' || camp.invoiceIn === '발행필요없음')
      : !!camp[field];
  }).length;
  const col = done === total ? 'var(--green)' : done > 0 ? 'var(--yellow)' : 'var(--text3)';
  badgeTd.innerHTML = `<span style="color:${col};font-weight:600;">${done}/${total}</span>`;
}

/** 매입계산서 모달 열기 */
let _invoiceInCampaignId  = null;
let _invoiceInPendingValue = '';
function openInvoiceInModal(campaignId) {
  _invoiceInCampaignId = campaignId;
  const c = DATA.find(d => d.id === campaignId);
  if (!c) return;
  _invoiceInPendingValue = c.invoiceIn || '';
  _invoiceInPendingImgs = [];
  document.getElementById('invoiceInCampName').textContent = _cName(c);

  // 이미지 목록 초기화
  const list = document.getElementById('invInImgList');
  const st   = document.getElementById('invInPasteStatus');
  if (list) list.innerHTML = '';
  if (st)   st.textContent = '';

  // 기존 이미지 로드
  if (c.invoiceIn === '발행완료') {
    const cached = _INVOICE_IMG_CACHE[campaignId];
    if (cached && cached.length) {
      _invoiceInPendingImgs = [...cached];
      _renderInvInImgList();
    } else if (c.invoiceInHasImg) {
      _fbLoadInvoiceImage(campaignId).then(imgs => {
        if (!imgs || !imgs.length) return;
        _INVOICE_IMG_CACHE[campaignId] = imgs;
        _invoiceInPendingImgs = [...imgs];
        _renderInvInImgList();
      });
    }
  }

  _updateInvoiceInOptUI();
  openModal('modalInvoiceIn');
}

/** 옵션 선택 (저장 전 UI만 업데이트) */
function selectInvoiceInOpt(value) {
  _invoiceInPendingValue = value;
  _updateInvoiceInOptUI();
}
function _updateInvoiceInOptUI() {
  const o1 = document.getElementById('invInOpt1');
  const o2 = document.getElementById('invInOpt2');
  if (!o1 || !o2) return;
  o1.className = 'btn ' + (_invoiceInPendingValue === '발행필요없음' ? 'btn-primary' : 'btn-outline');
  o2.className = 'btn ' + (_invoiceInPendingValue === '발행완료'    ? 'btn-primary' : 'btn-outline');
  o1.style.width = '100%'; o1.style.padding = '13px'; o1.style.fontSize = '14px';
  o2.style.width = '100%'; o2.style.padding = '13px'; o2.style.fontSize = '14px';
  const pasteArea = document.getElementById('invInPasteArea');
  if (pasteArea) pasteArea.style.display = _invoiceInPendingValue === '발행완료' ? '' : 'none';
}

/** 매입계산서 선택 저장 (value='' 이면 초기화) */
function saveInvoiceInChoice(value) {
  _invoiceInPendingValue = value;
  const c = DATA.find(d => d.id === _invoiceInCampaignId);
  if (!c) return;
  const before = c.invoiceIn || '';
  c.invoiceIn = value;

  // 이미지 처리
  if (value === '발행완료' && _invoiceInPendingImgs.length) {
    _INVOICE_IMG_CACHE[_invoiceInCampaignId] = [..._invoiceInPendingImgs];
    _fbSaveInvoiceImage(_invoiceInCampaignId, _invoiceInPendingImgs);
    c.invoiceInHasImg = true;
  } else if (!value) {
    delete _INVOICE_IMG_CACHE[_invoiceInCampaignId];
    _fbSaveInvoiceImage(_invoiceInCampaignId, null);
    c.invoiceInHasImg = false;
  }
  _invoiceInPendingImgs = [];

  if (before !== value) {
    const beforeLabel = before === '발행완료' ? '발행완료' : before === '발행필요없음' ? '발행필요없음' : '미선택';
    const afterLabel  = value  === '발행완료' ? '발행완료' : value  === '발행필요없음' ? '발행필요없음' : '미선택';
    _log(_invoiceInCampaignId, 'check', 'invoiceIn', beforeLabel, afterLabel);
  }
  _fbSaveCampaign(c);
  _stlSaveScroll();
  closeModal('modalInvoiceIn');
  _stlCellUpdate(_invoiceInCampaignId, 'invoiceIn');
}

/** 정산/세금계산서 체크박스 편집 권한 */
function _stlCanEdit(field) {
  const id = currentUser?.id;
  if (field === 'invoiceOut' || field === 'invoiceIn') return ['wonjoon','yoonhee','admin'].includes(id);
  if (field === 'payOut') return id === 'wonjoon';
  if (field === 'payIn')  return true; // 전체 사용자
  return false;
}

// ── 입금날짜 모달 ──
let _payInDateCtx = null; // { type:'settle'|'tax', campaignId?, gid? }

function openPayInDateModal(ctx) {
  _payInDateCtx = ctx;
  const el = document.getElementById('payInDateInput');
  if (el) el.value = new Date().toISOString().slice(0, 10);
  openModal('modalPayInDate');
  setTimeout(() => el?.focus(), 100);
}

async function confirmPayInDate() {
  const date = document.getElementById('payInDateInput')?.value;
  if (!date) { alert('입금날짜를 입력해주세요.'); return; }
  closeModal('modalPayInDate');
  if (_payInDateCtx?.type === 'settle') {
    await _applyPayIn(_payInDateCtx.campaignId, true, date);
  } else if (_payInDateCtx?.type === 'tax') {
    await _applyTaxPaid(_payInDateCtx.gid, true, date);
  } else if (_payInDateCtx?.type === 'taxgen') {
    const card = _payInDateCtx.card;
    if (card) card.dataset.payInDate = date;
  }
  _payInDateCtx = null;
}

async function _applyPayIn(campaignId, on, date) {
  const c = DATA.find(d => d.id === campaignId);
  if (!c) return;
  const before = c.payIn;
  c.payIn = on;
  c.payInDate = on ? date : null;
  _log(campaignId, 'check', 'payIn', before ? '완료' : '미완료', on ? '완료' : '미완료');
  _fbSaveCampaign(c);
  _stlSaveScroll();
  _stlCellUpdate(campaignId, 'payIn');
  // 세금계산서 탭 동기화
  const t = TAX_DATA.find(x => x.campaignId === campaignId && (x.taxType === 'adv' || !x.taxType))
         || TAX_DATA.find(x => x.campaignId === campaignId);
  if (t) {
    const gid = _taxGroupId(t);
    const newVal = on ? '완료' : '';
    for (const tx of TAX_DATA.filter(x => _taxGroupId(x) === gid)) {
      tx.paid = newVal;
      tx.payInDate = on ? date : null;
      if (on) tx.unpaid = 0;
      await _fbSaveTax(tx);
    }
  }
}

async function _applyTaxPaid(gid, on, date) {
  const items = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  if (!items.length) return;
  const newVal = on ? '완료' : '';
  for (const t of items) {
    t.paid = newVal;
    t.payInDate = on ? date : null;
    if (on) t.unpaid = 0;
    await _fbSaveTax(t);
    // 정산 탭 동기화
    if (t.campaignId && (t.taxType === 'adv' || !t.taxType)) {
      const c = DATA.find(d => d.id === t.campaignId);
      if (c) {
        const prevIn = c.payIn;
        c.payIn = on;
        c.payInDate = on ? date : null;
        _log(t.campaignId, 'check', 'payIn', prevIn ? '완료' : '미완료', on ? '완료' : '미완료');
        _fbSaveCampaign(c);
        _stlCellUpdate(t.campaignId, 'payIn');
      }
    }
  }
  // 담당자 알림
  const rep = items[0];
  const toUser = USERS.find(u => u.name === (rep.createdBy || rep.manager));
  if (toUser && toUser.id !== currentUser?.id) {
    const type = on ? 'tax_payment' : 'tax_payment_cancel';
    const body = _notifBody(type, rep.company || '', '', undefined, gid);
    _fbSaveNotification(toUser.id, type, body);
  }
  renderTaxList();
}

/** 정산 체크박스 토글 (입금/지급/매출계산서) */
function toggleSettlePay(campaignId, field) {
  if (!_stlCanEdit(field)) return;
  const c = DATA.find(d => d.id === campaignId);
  if (!c) return;

  // 입금: 체크 ON → 날짜 모달, OFF → 즉시 해제
  if (field === 'payIn') {
    if (c.payIn) {
      _applyPayIn(campaignId, false, null);
    } else {
      openPayInDateModal({ type: 'settle', campaignId });
    }
    return;
  }

  const isInvoice = field === 'invoiceOut' || field === 'invoiceIn';
  const before = c[field];
  c[field] = !c[field];

  const beforeLabel = isInvoice ? (before ? '발행' : '미발행') : (before ? '완료' : '미완료');
  const afterLabel  = isInvoice ? (c[field] ? '발행' : '미발행') : (c[field] ? '완료' : '미완료');
  _log(campaignId, 'check', field, beforeLabel, afterLabel);
  _fbSaveCampaign(c);
  _stlSaveScroll();
  _stlCellUpdate(campaignId, field);

  // 세금계산서 탭 동기화 (invoiceOut ↔ taxStatus)
  if (field === 'invoiceOut') {
    const t = TAX_DATA.find(x => x.campaignId === campaignId && (x.taxType === 'adv' || !x.taxType))
           || TAX_DATA.find(x => x.campaignId === campaignId);
    if (t) {
      const newVal = c[field] ? '완료' : '';
      const gid = _taxGroupId(t);
      TAX_DATA.filter(x => _taxGroupId(x) === gid).forEach(x => {
        if (x.taxStatus !== newVal) { x.taxStatus = newVal; _fbSaveTax(x); }
      });
    }
  }
}

/** 정산 테이블 플로팅 가로스크롤바 동기화 */
function _stlSyncFakeScroll() {
  const fake  = document.getElementById('stl-fake-scroll');
  const inner = document.getElementById('stl-fake-inner');
  if (!fake || !inner) return;
  const wrap = document.querySelector('#screen-settlement .settle-table-wrap');
  if (!wrap) { fake.style.display = 'none'; return; }
  // display:none 상태에선 clientWidth=0이므로 먼저 표시 후 너비 계산
  fake.style.display = '';
  // fake는 .main 전체 너비, wrap은 .content 패딩 안쪽 너비 → 차이만큼 inner 너비 보정
  const widthDiff = fake.clientWidth - wrap.clientWidth;
  inner.style.width = (wrap.scrollWidth + widthDiff) + 'px';
  fake.onscroll = () => { wrap.scrollLeft = fake.scrollLeft; };
  wrap.onscroll = () => { fake.scrollLeft = wrap.scrollLeft; };
}

/** 정산 화면 메인 렌더 */
function renderSettlement() {
  const scope    = document.getElementById('stl-fScope')?.value || 'settled';
  const prod     = document.getElementById('stl-fProd')?.value  || '';
  const cat      = document.getElementById('stl-fCat')?.value   || '';
  const media    = document.getElementById('stl-fMedia')?.value || '';
  const adv      = document.getElementById('stl-fAdv')?.value   || '';
  const ops      = document.getElementById('stl-fOps')?.value   || '';
  const fQ       = (document.getElementById('stl-fQ')?.value    || '').trim().toLowerCase();
  const { bonbu, team } = _parseOrgFilter(document.getElementById('stl-fOrg')?.value || '');
  const selYear  = document.getElementById('stl-year')?.value   || '';
  const selMonth = document.getElementById('stl-month')?.value  || '';
  const settled = DATA.filter(c => {
    if (scope === 'settled') {
      if      (c.product === 'DA')  { if (!c.daAdcost)        return false; }
      else if (c.product === 'CPA') { if (!c.db && !c.qty)     return false; }
      else if (c.status !== '성과입력완료') return false;
    }
    if (prod  && c.product !== prod) return false;
    if (cat   && c.cat   !== cat)   return false;
    if (media && c.media !== media) return false;
    if (adv   && (c.seller || c.adv || '') !== adv) return false;
    if (ops   && c.ops   !== ops)   return false;
    if (team || bonbu) {
      const u = USERS.find(u => u.name === c.ops);
      if (bonbu && (!u || u.bonbu !== bonbu)) return false;
      if (team  && (!u || u.dept  !== team))  return false;
    }
    if (selYear  && !c.date.startsWith(selYear))    return false;
    if (selMonth && c.date.slice(5,7) !== selMonth) return false;
    if (fQ && !_cName(c).toLowerCase().includes(fQ) && !(c.id||'').toLowerCase().includes(fQ)) return false;
    return true;
  });

  // 합산 — 표에 실제로 표시되는 값 기준
  let totalAdc = 0, totalBuy = 0, totalPrf = 0, totalSellQty = 0, totalBuyQty = 0;
  settled.forEach(c => {
    const a      = _stlAmt(c);
    const has    = _stlHas(c);
    const hasBuy = has && (!!c.buyUnit || !!c.buyAmtFixed || (c.product === 'DA' && !!c.comm));
    if (has)    totalAdc += (a.amt ?? a.adc);
    if (hasBuy) totalBuy += a.buyAmt;
    if (has)    totalPrf += a.prf;
    if (has && c.product !== 'DA') {
      totalSellQty += a.actual ?? 0;
      totalBuyQty  += a.buyActual ?? a.actual ?? 0;
    }
  });

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const cntSubEl = document.querySelector('#stl-cnt')?.closest('.stat-card')?.querySelector('.stat-sub');
  if (cntSubEl) cntSubEl.textContent = scope === 'settled' ? '성과입력완료 기준' : '전체 캠페인 기준';
  set('stl-cnt',      settled.length + '건');
  set('stl-adcost',   totalAdc ? Math.round(totalAdc).toLocaleString() + '원' : '—');
  set('stl-rev',      totalBuy ? Math.round(totalBuy).toLocaleString() + '원' : '—');
  set('stl-profit',   totalPrf ? Math.round(totalPrf).toLocaleString() + '원' : '—');
  const rateEl = document.getElementById('stl-profit-rate');
  if (rateEl) {
    if (totalAdc && totalPrf) {
      const rate = (totalPrf / totalAdc * 100).toFixed(1);
      rateEl.textContent = rate + '%';
      rateEl.style.color = totalPrf >= 0 ? 'var(--green)' : 'var(--red)';
    } else {
      rateEl.textContent = '';
    }
  }
  set('stl-sell-qty', totalSellQty ? totalSellQty.toLocaleString() + ' 건' : '—');
  set('stl-buy-qty',  totalBuyQty  ? totalBuyQty.toLocaleString()  + ' 건' : '—');

  const container = document.getElementById('stl-table-container');
  if (!container) return;

  if (settled.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text3);font-size:13px;">${scope === 'settled' ? '성과입력완료 상태의 캠페인이 없습니다.' : '캠페인 데이터가 없습니다.'}</div>`;
    return;
  }

  if      (stlView === 'campaign') renderStlCampaignView(settled, container);
  else if (stlView === 'adv')      renderStlGroupView(settled, container, c => c.seller || c.adv || '—', '매출처');
  else if (stlView === 'media')    renderStlGroupView(settled, container, 'media',  '매체사');
  else if (stlView === 'pc')       renderStlPermCall(container);
  else                             renderStlGroupView(settled, container, c => c.seller || c.adv || '—', '매출처');
  setTimeout(() => { _stlSetWrapHeight(); _stlSyncFakeScroll(); _stlSetupWheelScroll(); }, 0);
}

/** 퍼미션콜 뷰 */
function renderStlPermCall(container) {
  const cat      = document.getElementById('stl-fCat')?.value   || '';
  const ops      = document.getElementById('stl-fOps')?.value   || '';
  const { bonbu, team } = _parseOrgFilter(document.getElementById('stl-fOrg')?.value || '');
  const selYear  = document.getElementById('stl-year')?.value   || '';
  const selMonth = document.getElementById('stl-month')?.value  || '';

  const data = DATA.filter(c => {
    if (c.product !== '퍼미션콜') return false;
    if (cat  && c.cat  !== cat)  return false;
    if (ops  && c.ops  !== ops)  return false;
    if (team || bonbu) {
      const u = USERS.find(u => u.name === c.ops);
      if (bonbu && (!u || u.bonbu !== bonbu)) return false;
      if (team  && (!u || u.dept  !== team))  return false;
    }
    if (selYear  && !c.date.startsWith(selYear))    return false;
    if (selMonth && c.date.slice(5,7) !== selMonth) return false;
    return true;
  });

  if (data.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text3);font-size:13px;">퍼미션콜 데이터가 없습니다.</div>';
    return;
  }

  const nd = '<span style="color:var(--text3);">—</span>';
  let rows = '';
  let totAdc = 0, totOhc = 0, totDnu = 0, totPrf = 0;

  const fmtMonth = d => { const p = (d || '').split('-'); return p.length >= 2 ? `${p[0]}년 ${+p[1]}월` : (d || '—'); };

  data.forEach(c => {
    const inflow  = c.pcInflow  || 0;
    const agree   = c.pcAgree   || 0;
    const advU    = c.pcAdvUnit || 0;
    const adc     = agree * advU;
    const ohcCost = c.pcOhcCost || 0;
    const dnuCost = agree * 5500;
    const profit  = adc - ohcCost - dnuCost;
    const prfRate = adc > 0 ? (profit / adc * 100).toFixed(1) + '%' : null;
    const cvr     = inflow > 0 ? (agree / inflow * 100).toFixed(1) + '%' : null;
    totAdc += adc; totOhc += ohcCost; totDnu += dnuCost; totPrf += profit;
    const idx = DATA.indexOf(c);
    rows += `<tr onclick="openDetail(${idx})" style="cursor:pointer;">
      <td>${_cName(c)}</td>
      <td>${fmtMonth(c.date)}</td>
      <td>${c.seller || c.adv || '—'}</td>
      <td>${c.ops || '—'}</td>
      <td style="text-align:right;">${inflow ? inflow.toLocaleString() : nd}</td>
      <td style="text-align:right;">${agree  ? agree.toLocaleString()  : nd}</td>
      <td style="text-align:right;">${cvr !== null ? cvr : nd}</td>
      <td style="text-align:right;">${advU ? advU.toLocaleString() + '원' : nd}</td>
      <td style="text-align:right;">${adc ? adc.toLocaleString() + '원' : nd}</td>
      <td style="text-align:right;">${ohcCost ? ohcCost.toLocaleString() + '원' : nd}</td>
      <td style="text-align:right;">${dnuCost ? dnuCost.toLocaleString() + '원' : nd}</td>
      <td style="text-align:right;font-weight:700;color:${profit >= 0 ? 'var(--green)' : 'var(--red)'};">${profit ? profit.toLocaleString() + '원' : nd}</td>
      <td style="text-align:right;">${prfRate !== null ? prfRate : nd}</td>
    </tr>`;
  });

  const totPrfRate = totAdc > 0 ? (totPrf / totAdc * 100).toFixed(1) + '%' : '—';
  container.innerHTML = `
    <div class="settle-table-wrap">
      <table class="stl-table">
        <thead><tr>
          <th>캠페인명</th><th>집행월</th><th>매출처</th><th>담당자</th>
          <th style="text-align:right;">매체유입</th><th style="text-align:right;">동의건</th><th style="text-align:right;">CVR</th>
          <th style="text-align:right;">광고주단가</th><th style="text-align:right;">광고비</th>
          <th style="text-align:right;">OHC비용</th><th style="text-align:right;">DNU비용</th>
          <th style="text-align:right;">이익</th><th style="text-align:right;">이익률</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="font-weight:700;background:var(--surface2);">
          <td colspan="8" style="text-align:right;color:var(--text2);height:44px;padding:10px 12px;">합계</td>
          <td style="text-align:right;">${totAdc ? totAdc.toLocaleString() + '원' : '—'}</td>
          <td style="text-align:right;">${totOhc ? totOhc.toLocaleString() + '원' : '—'}</td>
          <td style="text-align:right;">${totDnu ? totDnu.toLocaleString() + '원' : '—'}</td>
          <td style="text-align:right;color:${totPrf >= 0 ? 'var(--green)' : 'var(--red)'};">${totPrf ? totPrf.toLocaleString() + '원' : '—'}</td>
          <td style="text-align:right;">${totPrfRate}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

/** 캠페인별 뷰 */
function renderStlCampaignView(data, container) {
  const nd  = '<span style="color:var(--text3);">—</span>';
  const bg0 = 'var(--surface)';
  const fmt = v => v.toLocaleString();
  const pct = v => v.toFixed(1) + '%';
  const invInCell = (c) => {
    const v = c.invoiceIn || '';
    if (v === '발행완료')    return `<span class="stl-inv-badge done"   onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${c.id}')">✓ 발행완료</span>`;
    if (v === '발행필요없음') return `<span class="stl-inv-badge none"   onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${c.id}')">불필요</span>`;
    return `<div class="chk" onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${c.id}')"></div>`;
  };

  const rows = data.map(c => {
    const a      = _stlAmt(c);
    const isDA   = c.product === 'DA';
    const has    = _stlHas(c);
    const hasBuy = has && (!!c.buyUnit || !!c.buyAmtFixed || (c.product === 'DA' && !!c.comm));
    const chk = (field) => { if (field === 'payIn' && c.payIn && c.payInDate) return `<span class="stl-inv-badge done" style="font-size:10px;white-space:nowrap;cursor:pointer;" onmousedown="event.preventDefault()" onclick="event.stopPropagation();toggleSettlePay('${c.id}','payIn')">${c.payInDate}</span>`; const dis = !_stlCanEdit(field)?'opacity:0.35;cursor:not-allowed;pointer-events:none;':''; return `<div class="chk ${c[field]?'on':''}" style="${dis}" onmousedown="event.preventDefault()" onclick="event.stopPropagation();toggleSettlePay('${c.id}','${field}')">${c[field]?'✓':''}</div>`; };

    return `<tr data-stlcamp="${c.id}" style="cursor:pointer;" onclick="openCalPreview(DATA.findIndex(d=>d.id==='${c.id}'))">
      <td class="td-dim stl-s1" style="background:${bg0};">${_escHtml(c.cat)}</td>
      <td class="stl-s2" style="background:${bg0};font-weight:600;">${_escHtml(_cCompany(c))}</td>
      <td class="td-bold stl-s3" style="background:${bg0};cursor:default;" onmousemove="showMemoBubbleAtMouse(event,'${_escHtml(_cName(c))}')" onmouseleave="hideMemoBubble()">${_escHtml(_cName(c))}<div style="font-size:11px;font-weight:400;color:var(--text3);margin-top:2px;">${(c.date||'').slice(0,10)}</div></td>
      <td class="td-num td-r grp-revenue">${has && !isDA ? fmt(a.eu) : nd}</td>
      <td class="td-num td-r">${has && !isDA ? fmt(c.qty) : nd}</td>
      <td class="td-num td-r">${has && !isDA ? fmt(a.actual) : nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${has ? fmt(a.amt ?? a.adc) : nd}</td>
      <td class="td-num td-r" style="color:var(--text2);">${has ? fmt((a.amt ?? a.adc) + a.adcVat) : nd}</td>
      <td class="td-num td-r" style="color:var(--text3);">${has && c.product === 'CPA' ? pct(a.stlRate) : nd}</td>
      <td class="td-dim grp-purchase">${_escHtml(c.media)}</td>
      <td class="td-dim">${_escHtml(MEDIA_DATA.find(x=>x.company===c.media)?.invoiceTo||'—')}</td>
      <td class="td-num td-r">${hasBuy && !isDA ? fmt(c.buyUnit) : nd}</td>
      <td class="td-num td-r">${has && !isDA ? fmt(a.buyActual ?? a.actual) : nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${hasBuy ? fmt(a.buyAmt) : nd}</td>
      <td class="td-num td-r" style="color:var(--text2);">${hasBuy ? fmt(a.buyAmt + a.buyVat) : nd}</td>
      <td class="td-num td-r" style="color:var(--text3);">${has && c.product === 'CPA' ? pct(a.stlRate) : nd}</td>
      <td class="td-num grp-pnl" style="text-align:center;">${has ? ((c.agrate || 0) + '%') : nd}</td>
      <td class="td-num td-r">${has ? fmt(a.agFee) : nd}</td>
      <td class="td-num td-r" style="color:var(--green);font-weight:700;">${has ? fmt(a.prf) : nd}</td>
      <td class="td-num" style="text-align:center;">${has ? pct(a.prfRate) : nd}</td>
      <td class="grp-status" style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_invoiceOut">${chk('invoiceOut')}</td>
      <td style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_payIn">${chk('payIn')}</td>
      <td class="grp-status2" style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_invoiceIn">${invInCell(c)}</td>
      <td style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_payOut">${chk('payOut')}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `<div class="settle-table-wrap"><table class="stl-table">
    <thead>
      <tr>
        <th rowspan="2" class="stl-s1" style="background:var(--surface2);vertical-align:middle;">카테고리</th>
        <th rowspan="2" class="stl-s2" style="background:var(--surface2);vertical-align:middle;">매출처</th>
        <th rowspan="2" class="stl-s3" style="background:var(--surface2);vertical-align:middle;">캠페인</th>
        <th colspan="6" class="grp-head grp-revenue">매출</th>
        <th colspan="7" class="grp-head grp-purchase">매입</th>
        <th colspan="4" class="grp-head grp-pnl">손익</th>
        <th colspan="4" class="grp-head grp-status">정산</th>
      </tr>
      <tr>
        <th class="grp-revenue" style="text-align:right;">적용단가</th>
        <th style="text-align:right;">발송수량</th>
        <th style="text-align:right;">정산수량</th>
        <th style="text-align:right;">실청구액</th>
        <th style="text-align:right;">VAT포함</th>
        <th style="text-align:right;">정산율</th>
        <th class="grp-purchase">매체사</th>
        <th>매입처</th>
        <th style="text-align:right;">매입단가</th>
        <th style="text-align:right;">인정수량</th>
        <th style="text-align:right;">매입액</th>
        <th style="text-align:right;">VAT포함</th>
        <th style="text-align:right;">정산율</th>
        <th class="grp-pnl" style="text-align:center;">대행수수료%</th>
        <th style="text-align:right;">대행수수료</th>
        <th style="text-align:right;">매출이익</th>
        <th style="text-align:center;">매출이익율</th>
        <th class="grp-status" style="text-align:center;">매출계산서</th>
        <th style="text-align:center;">입금</th>
        <th class="grp-status2" style="text-align:center;">매입계산서</th>
        <th style="text-align:center;">지급</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/** 매출처별 / 매체사별 그룹 뷰 */
function renderStlGroupView(data, container, groupKey, groupLabel) {
  const groups = {}, groupOrder = [];
  const _getKey = typeof groupKey === 'function' ? groupKey : (c => c[groupKey] || '—');
  data.forEach(c => {
    const key = _getKey(c) || '—';
    if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
    groups[key].push(c);
  });

  const nd   = '<span style="color:var(--text3);">—</span>';
  const bg0  = 'var(--surface)';
  const bgSb = 'var(--surface2)';
  const fmt  = v => v.toLocaleString();
  const pct  = v => v.toFixed(1) + '%';
  const cntBadge = (done, total) => {
    const col = done === total ? 'var(--green)' : done > 0 ? 'var(--yellow)' : 'var(--text3)';
    return `<span style="color:${col};font-weight:600;">${done}/${total}</span>`;
  };

  groupOrder.sort((a, b) => a.localeCompare(b, 'ko'));

  const rows = groupOrder.map(gname => {
    const camps = groups[gname];
    let tAdc = 0, tAdcVat = 0, tBuy = 0, tBuyVat = 0, tFee = 0, tPrf = 0, tQty = 0, tActual = 0, tBuyActual = 0;
    camps.forEach(c => {
      const a    = _stlAmt(c);
      const isDA = c.product === 'DA';
      const has  = _stlHas(c);
      tAdc += (a.amt ?? a.adc); tAdcVat += a.adcVat; tBuy += a.buyAmt; tBuyVat += a.buyVat; tFee += a.agFee; tPrf += a.prf;
      if (has && !isDA) { tQty += a.qty; tActual += a.actual; tBuyActual += (a.buyActual ?? a.actual); }
    });
    const tPrfRate = tAdc > 0 ? pct(tPrf / tAdc * 100) : '—';
    const n           = camps.length;
    const payInDone   = camps.filter(c => c.payIn).length;
    const payOutDone  = camps.filter(c => c.payOut).length;
    const invOutDone  = camps.filter(c => c.invoiceOut).length;
    const invInDone   = camps.filter(c => c.invoiceIn === '발행완료' || c.invoiceIn === '발행필요없음').length;

    const subRows = camps.map(c => {
      const a      = _stlAmt(c);
      const chk = (field) => { if (field === 'payIn' && c.payIn && c.payInDate) return `<span class="stl-inv-badge done" style="font-size:10px;white-space:nowrap;cursor:pointer;" onmousedown="event.preventDefault()" onclick="event.stopPropagation();toggleSettlePay('${c.id}','payIn')">${c.payInDate}</span>`; const dis = !_stlCanEdit(field)?'opacity:0.35;cursor:not-allowed;pointer-events:none;':''; return `<div class="chk ${c[field]?'on':''}" style="width:18px;height:18px;font-size:10px;${dis}" onmousedown="event.preventDefault()" onclick="event.stopPropagation();toggleSettlePay('${c.id}','${field}')">${c[field]?'✓':''}</div>`; };
      const invInCellSub = () => {
        const v = c.invoiceIn || '';
        if (v === '발행완료')    return `<span class="stl-inv-badge done"   onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${c.id}')">✓ 발행완료</span>`;
        if (v === '발행필요없음') return `<span class="stl-inv-badge none"   onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${c.id}')">불필요</span>`;
        return `<div class="chk" style="width:18px;height:18px;" onmousedown="event.preventDefault()" onclick="event.stopPropagation();openInvoiceInModal('${c.id}')"></div>`;
      };

      const isDA   = c.product === 'DA';
      const has    = _stlHas(c);
      const hasBuy = has && (!!c.buyUnit || !!c.buyAmtFixed || (c.product === 'DA' && !!c.comm));
      return `<tr data-stlcamp="${c.id}" style="font-size:12px;cursor:pointer;" onclick="openCalPreview(DATA.findIndex(d=>d.id==='${c.id}'))">
        <td class="td-dim stl-s1" style="background:${bgSb};padding-left:20px;">${_escHtml(c.cat)}</td>
        <td class="stl-s2" style="background:${bgSb};color:var(--text2);">${_escHtml(_cCompany(c))}</td>
        <td class="stl-s3" style="background:${bgSb};cursor:default;" onmousemove="showMemoBubbleAtMouse(event,'${_escHtml(_cName(c))}')" onmouseleave="hideMemoBubble()">${_escHtml(_cName(c))}<div style="font-size:11px;font-weight:400;color:var(--text3);margin-top:2px;">${(c.date||'').slice(0,10)}</div></td>
        <td class="td-num td-r grp-revenue">${has && !isDA ? fmt(a.eu) : nd}</td>
        <td class="td-num td-r">${has && !isDA ? fmt(c.qty) : nd}</td>
        <td class="td-num td-r">${has && !isDA ? fmt(a.actual) : nd}</td>
        <td class="td-num td-r" style="font-weight:600;">${has ? fmt(a.amt ?? a.adc) : nd}</td>
        <td class="td-num td-r" style="color:var(--text2);">${has ? fmt((a.amt ?? a.adc) + a.adcVat) : nd}</td>
        <td class="td-num td-r" style="color:var(--text3);">${has && c.product === 'CPA' ? pct(a.stlRate) : nd}</td>
        <td class="td-dim grp-purchase">${_escHtml(c.media)}</td>
        <td class="td-dim">${_escHtml(MEDIA_DATA.find(x=>x.company===c.media)?.invoiceTo||'—')}</td>
        <td class="td-num td-r">${hasBuy && !isDA ? fmt(c.buyUnit) : nd}</td>
        <td class="td-num td-r">${has && !isDA ? fmt(a.buyActual ?? a.actual) : nd}</td>
        <td class="td-num td-r" style="font-weight:600;">${hasBuy ? fmt(a.buyAmt) : nd}</td>
        <td class="td-num td-r" style="color:var(--text2);">${hasBuy ? fmt(a.buyAmt + a.buyVat) : nd}</td>
        <td class="td-num td-r" style="color:var(--text3);">${has && c.product === 'CPA' ? pct(a.stlRate) : nd}</td>
        <td class="td-num grp-pnl" style="text-align:center;">${has ? ((c.agrate || 0) + '%') : nd}</td>
        <td class="td-num td-r">${has ? fmt(a.agFee) : nd}</td>
        <td class="td-num td-r" style="color:var(--green);">${has ? fmt(a.prf) : nd}</td>
        <td class="td-num" style="text-align:center;">${has ? pct(a.prfRate) : nd}</td>
        <td class="grp-status" style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_invoiceOut" data-stlsmall="1">${chk('invoiceOut')}</td>
        <td style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_payIn" data-stlsmall="1">${chk('payIn')}</td>
        <td class="grp-status2" style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_invoiceIn" data-stlsmall="1">${invInCellSub()}</td>
        <td style="text-align:center;" onclick="event.stopPropagation()" data-stlcell="${c.id}_payOut" data-stlsmall="1">${chk('payOut')}</td>
      </tr>`;
    }).join('');

    return `<tr data-stlgroup style="border-top:2px solid var(--border2);">
      <td colspan="3" class="td-bold stl-sc3" style="background:${bg0};">
        ${_escHtml(groupLabel)}: ${_escHtml(gname)} <span style="font-size:11px;font-weight:400;color:var(--text3);">${n}건</span>
      </td>
      <td>${nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${tQty ? fmt(tQty) : nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${tActual ? fmt(tActual) : nd}</td>
      <td class="td-num td-r grp-revenue" style="font-weight:700;">${tAdc ? fmt(tAdc) : nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${tAdc ? fmt(tAdc + tAdcVat) : nd}</td>
      <td>${nd}</td>
      <td class="grp-purchase">${nd}</td><td>${nd}</td><td>${nd}</td><td class="td-num td-r" style="font-weight:700;">${tBuyActual ? fmt(tBuyActual) : nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${tBuy ? fmt(tBuy) : nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${tBuy ? fmt(tBuy + tBuyVat) : nd}</td>
      <td>${nd}</td>
      <td class="grp-pnl">${nd}</td>
      <td class="td-num td-r" style="font-weight:700;">${tFee ? fmt(tFee) : nd}</td>
      <td class="td-num td-r" style="color:var(--green);font-weight:700;">${tPrf ? fmt(tPrf) : nd}</td>
      <td class="td-num" style="text-align:center;font-weight:700;">${tPrfRate}</td>
      <td class="grp-status" style="text-align:center;" data-stlbadge="invoiceOut">${cntBadge(invOutDone, n)}</td>
      <td style="text-align:center;" data-stlbadge="payIn">${cntBadge(payInDone, n)}</td>
      <td class="grp-status2" style="text-align:center;" data-stlbadge="invoiceIn">${cntBadge(invInDone, n)}</td>
      <td style="text-align:center;" data-stlbadge="payOut">${cntBadge(payOutDone, n)}</td>
    </tr>${subRows}`;
  }).join('');

  container.innerHTML = `<div class="settle-table-wrap"><table class="stl-table">
    <thead>
      <tr>
        <th colspan="3" class="stl-sc3" style="background:var(--surface2);vertical-align:middle;">${_escHtml(groupLabel)}</th>
        <th colspan="6" class="grp-head grp-revenue">매출</th>
        <th colspan="7" class="grp-head grp-purchase">매입</th>
        <th colspan="4" class="grp-head grp-pnl">손익</th>
        <th colspan="4" class="grp-head grp-status">정산</th>
      </tr>
      <tr>
        <th colspan="3" class="stl-sc3" style="background:var(--surface2);">캠페인 상세</th>
        <th class="grp-revenue" style="text-align:right;">적용단가</th>
        <th style="text-align:right;">발송수량</th>
        <th style="text-align:right;">정산수량</th>
        <th style="text-align:right;">실청구액</th>
        <th style="text-align:right;">VAT포함</th>
        <th style="text-align:right;">정산율</th>
        <th class="grp-purchase">매체사</th>
        <th>매입처</th>
        <th style="text-align:right;">매입단가</th>
        <th style="text-align:right;">인정수량</th>
        <th style="text-align:right;">매입액</th>
        <th style="text-align:right;">VAT포함</th>
        <th style="text-align:right;">정산율</th>
        <th class="grp-pnl" style="text-align:center;">대행수수료%</th>
        <th style="text-align:right;">대행수수료</th>
        <th style="text-align:right;">매출이익</th>
        <th style="text-align:center;">매출이익율</th>
        <th class="grp-status" style="text-align:center;">매출계산서</th>
        <th style="text-align:center;">입금</th>
        <th class="grp-status2" style="text-align:center;">매입계산서</th>
        <th style="text-align:center;">지급</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}
// ══════════════════════════════════════════
// 영업 파이프라인
// ══════════════════════════════════════════

const PIPELINE_STAGES = ['MAKEUP','POTENTIAL','COMMITMENT','ACTUAL'];
const PIPELINE_STAGE_LABEL = {MAKEUP:'메이크업',POTENTIAL:'포텐셜',COMMITMENT:'커밋먼트',ACTUAL:'액추얼'};
const PIPELINE_STAGE_COLOR = {MAKEUP:'#6366f1',POTENTIAL:'#f59e0b',COMMITMENT:'#10b981',ACTUAL:'#ef4444'};

function _pipelineEstAmt(p) {
  if (p.estAmt) return p.estAmt;
  const m = MEDIA_DATA.find(x => x.company === p.media);
  const unit = m ? (m.unit || 0) : 0;
  return (p.estQty || 0) * unit;
}

function _nextPipelineId() {
  const num = String(_pipelineNextNum++).padStart(4,'0');
  return 'P-2026-' + num;
}

function renderPipeline() {
  const board = document.getElementById('pipe-board');
  if (!board) return;

  const archBtn = document.getElementById('pipe-arch-btn');
  if (archBtn) archBtn.textContent = _pipelineShowArchived ? '활성만 보기' : '아카이브 포함';

  const list = _pipelineShowArchived ? PIPELINE_DATA : PIPELINE_DATA.filter(x => !x.archived);

  board.innerHTML = PIPELINE_STAGES.map(function(stage) {
    const cards = list.filter(function(p) { return p.stage === stage; });
    const stageAmt = cards.reduce(function(s, p) { return s + _pipelineEstAmt(p); }, 0);
    const color = PIPELINE_STAGE_COLOR[stage];
    const cardHtml = cards.map(function(p) { return _renderPipeCard(p); }).join('');
    return '<div class="kanban-col">' +
      '<div class="kanban-col-head" style="border-top:3px solid ' + color + ';">' +
        '<span style="font-weight:700;color:' + color + ';">' + PIPELINE_STAGE_LABEL[stage] + '</span>' +
        '<span class="pipe-stage-cnt">' + cards.length + '건</span>' +
      '</div>' +
      '<div class="kanban-cards" id="pipe-col-' + stage + '">' + cardHtml + '</div>' +
      '<div class="kanban-col-foot">예상 ' + Math.round(stageAmt/10000).toLocaleString() + '만원</div>' +
    '</div>';
  }).join('');

  const active = PIPELINE_DATA.filter(function(x) { return !x.archived; });
  const el = function(id) { return document.getElementById(id); };
  if (el('pipe-stat-total')) el('pipe-stat-total').textContent = active.length + '건';
  if (el('pipe-stat-amt'))   el('pipe-stat-amt').textContent   = Math.round(active.reduce(function(s,p){return s+_pipelineEstAmt(p);},0)/10000).toLocaleString() + '만원';
  if (el('pipe-stat-com'))   el('pipe-stat-com').textContent   = active.filter(function(p){return p.stage==='COMMITMENT'||p.stage==='ACTUAL';}).length + '건';
}

function _renderPipeCard(p) {
  const amt = _pipelineEstAmt(p);
  const tags = (p.tags||[]).map(function(t){ return '<span class="pipe-tag">' + _escHtml(t) + '</span>'; }).join('');
  const archStyle = p.archived ? 'opacity:.5;' : '';
  const convertBtn = (p.stage === 'ACTUAL' && !p.archived && !p.convertedCampaignId)
    ? '<button class="btn btn-primary btn-sm" style="width:100%;margin-top:6px;font-size:11px;" onclick="convertToCampaign(\'' + p.id + '\')">캠페인 전환 →</button>' : '';
  const convertedLabel = p.convertedCampaignId
    ? '<div style="font-size:10px;color:var(--green);margin-top:4px;">✓ ' + p.convertedCampaignId + '로 전환됨</div>' : '';
  const archiveBtn = !p.archived
    ? '<button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px;color:var(--text3);" onclick="archivePipelineCard(\'' + p.id + '\')">🗄</button>' : '';
  return '<div class="pipe-card" style="' + archStyle + '" id="pcard-' + p.id + '">' +
    '<div class="pipe-card-head">' +
      '<span class="pipe-card-id">' + _escHtml(p.id) + '</span>' +
      '<div style="display:flex;gap:4px;">' +
        '<button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px;" onclick="openPipelineModal(\'' + p.id + '\')">✏</button>' +
        archiveBtn +
      '</div>' +
    '</div>' +
    '<div class="pipe-card-seller">' + _escHtml(p.seller||'—') + '</div>' +
    '<div class="pipe-card-brand">' + _escHtml(p.brand||'—') + '</div>' +
    '<div class="pipe-card-meta"><span>' + _escHtml(p.media||'—') + '</span>·<span>' + _escHtml(p.product||'—') + '</span>·<span>' + (p.estQty||0).toLocaleString() + '건</span></div>' +
    '<div class="pipe-card-amt">' + Math.round(amt/10000).toLocaleString() + '만원</div>' +
    '<div class="pipe-card-tags">' + tags + '</div>' +
    (p.memo ? '<div class="pipe-card-memo">' + _escHtml(p.memo) + '</div>' : '') +
    convertBtn +
    convertedLabel +
    '<div class="pipe-card-foot">' + _escHtml([p.bonbu, p.dept].filter(Boolean).join(' ') || '—') + ' · ' + _escHtml(p.month||'') + '</div>' +
  '</div>';
}

function _calcPipeAmt() {
  const media = document.getElementById('pm_media') && document.getElementById('pm_media').value;
  const qty   = parseFloat(document.getElementById('pm-estQty').value) || 0;
  const m     = MEDIA_DATA.find(function(x) { return x.company === media; });
  const unit  = m ? (m.unit || 0) : 0;
  if (qty && unit) {
    document.getElementById('pm-estAmt').value = qty * unit;
  }
}

function openPipelineModal(id) {
  const isNew = !id;
  const p = isNew ? {id:'',bonbu:'',dept:'',stage:'MAKEUP',month:'',cat:'',seller:'',brand:'',media:'',product:'SMS',estQty:0,memo:'',tags:[],linkedCampaignId:'',archived:false,convertedCampaignId:'',createdAt:''} : PIPELINE_DATA.find(function(x){return x.id===id;});
  if (!p) return;

  const el = function(k) { return document.getElementById(k); };

  // 카테고리 동적 생성
  const catSel = el('pm-cat');
  catSel.innerHTML = '<option value="">선택</option>' +
    Object.keys(CAT_COLOR).map(function(c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

  el('pm-id').value       = p.id;
  el('pm-stage').value    = p.stage;
  el('pm-bonbu-dept').value = (p.bonbu && p.dept) ? p.bonbu + '|' + p.dept : '';
  el('pm-month').value    = p.month;
  el('pm-cat').value      = p.cat;
  el('pm_seller').value        = p.seller || '';
  el('pm_seller_text').value   = p.seller || '';
  el('pm_content').value       = p.brand  || '';
  el('pm_content_text').value  = p.brand  || '';
  el('pm_media').value         = p.media  || '';
  el('pm_media_text').value    = p.media  || '';
  el('pm-product').value  = p.product;
  el('pm-estQty').value   = p.estQty || '';
  el('pm-estAmt').value   = p.estAmt || '';
  el('pm-memo').value     = p.memo;
  el('pm-tags').value     = (p.tags||[]).join(', ');
  el('pm-upsell').checked = (p.tags||[]).includes('업셀링');
  el('pm_linked').value      = p.linkedCampaignId || '';
  const _lc = DATA.find(x => x.id === p.linkedCampaignId);
  el('pm_linked_text').value = _lc ? _cName(_lc) + ' (' + _lc.id + ')' : '';

  _togglePipeUpsell();

  const title = document.getElementById('pm-title');
  if (title) title.textContent = isNew ? '새 기회 등록' : '기회 수정';

  openModal('modalPipelineCard');
}


function _togglePipeUpsell() {
  const upsellEl = document.getElementById('pm-upsell');
  const checked = upsellEl && upsellEl.checked;
  const wrap = document.getElementById('pm-linked-wrap');
  if (wrap) wrap.style.display = checked ? 'flex' : 'none';
}

function savePipelineCard() {
  const el = function(k) { return document.getElementById(k); };
  const id = el('pm-id').value.trim();
  const isNew = !id;

  if (!el('pm-month').value) { toast('⚠ 해당 월을 입력해주세요', 'warn'); return; }
  if (!el('pm-bonbu-dept').value) { toast('⚠ 본부/팀을 선택해주세요', 'warn'); return; }
  if (!(el('pm_seller').value || el('pm_seller_text').value).trim()) { toast('⚠ 매출처를 입력해주세요', 'warn'); return; }

  const tags = el('pm-tags').value.split(',').map(function(t){return t.trim();}).filter(Boolean);
  if (el('pm-upsell').checked && !tags.includes('업셀링')) tags.unshift('업셀링');
  if (!el('pm-upsell').checked) { const i = tags.indexOf('업셀링'); if (i>=0) tags.splice(i,1); }

  const now = new Date();
  const nowStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  const existing = isNew ? null : PIPELINE_DATA.find(function(x){return x.id===id;});
  const obj = {
    id:                  isNew ? _nextPipelineId() : id,
    bonbu:               (el('pm-bonbu-dept').value.split('|')[0] || '').trim(),
    dept:                (el('pm-bonbu-dept').value.split('|')[1] || '').trim(),
    stage:               el('pm-stage').value,
    month:               el('pm-month').value,
    cat:                 el('pm-cat').value,
    seller:              (el('pm_seller').value || el('pm_seller_text').value).trim(),
    brand:               (el('pm_content').value || el('pm_content_text').value).trim(),
    media:               (el('pm_media').value || el('pm_media_text').value).trim(),
    product:             el('pm-product').value,
    estQty:              +el('pm-estQty').value || 0,
    estAmt:              +el('pm-estAmt').value || 0,
    memo:                el('pm-memo').value.trim(),
    tags:                tags,
    linkedCampaignId:    el('pm_linked').value.trim(),
    archived:            isNew ? false : (existing ? existing.archived : false),
    convertedCampaignId: isNew ? '' : (existing ? existing.convertedCampaignId : ''),
    createdAt:           isNew ? nowStr : (existing ? existing.createdAt : nowStr),
  };

  if (isNew) {
    PIPELINE_DATA.unshift(obj);
  } else {
    const idx = PIPELINE_DATA.findIndex(function(x){return x.id===id;});
    if (idx>=0) PIPELINE_DATA[idx] = obj;
  }

  _fbSavePipeline(obj);
  closeModal('modalPipelineCard');
  renderPipeline();
  if (isNew) switchPipelineTab('kanban');
  toast('✓ 저장되었습니다', 'ok');
}

let _pendingArchiveId = null;

function archivePipelineCard(id) {
  const p = PIPELINE_DATA.find(function(x){return x.id===id;});
  if (!p) return;
  _pendingArchiveId = id;
  const lbl = document.getElementById('arch-confirm-label');
  if (lbl) lbl.textContent = (p.seller || p.id) + (p.brand ? ' · ' + p.brand : '');
  openModal('modalArchiveConfirm');
}

function confirmArchivePipelineCard() {
  const p = PIPELINE_DATA.find(function(x){return x.id===_pendingArchiveId;});
  if (p) { p.archived = true; _fbSavePipeline(p); }
  _pendingArchiveId = null;
  closeModal('modalArchiveConfirm');
  renderPipeline();
  toast('✓ 아카이브 처리되었습니다', 'ok');
}

function togglePipelineArchive() {
  _pipelineShowArchived = !_pipelineShowArchived;
  renderPipeline();
}

function convertToCampaign(id) {
  const p = PIPELINE_DATA.find(function(x){return x.id===id;});
  if (!p) return;
  _pendingPipelineConvertId = id;
  openRegModal();

  const sellerTextEl = document.getElementById('r_seller_text');
  const sellerHidEl  = document.getElementById('r_seller');
  if (sellerTextEl) sellerTextEl.value = p.seller;
  if (sellerHidEl)  sellerHidEl.value  = p.seller;

  const contentTextEl = document.getElementById('r_content_text');
  const contentHidEl  = document.getElementById('r_content');
  if (contentTextEl) contentTextEl.value = p.brand;
  if (contentHidEl)  contentHidEl.value  = p.brand;

  const mediaTextEl = document.getElementById('r_media_text');
  const mediaHidEl  = document.getElementById('r_media');
  if (mediaTextEl) mediaTextEl.value = p.media;
  if (mediaHidEl)  mediaHidEl.value  = p.media;

  const setVal = function(elId, val) { const e = document.getElementById(elId); if (e) e.value = val; };
  setVal('r_cat',     p.cat);
  setVal('r_product', p.product);
  setVal('r_sched',   String(p.estQty || 0));
  if (p.month) setVal('r_date', p.month + '-01');
  if (p.tags && p.tags.length) setVal('r_adpromo', p.tags.filter(function(t){ return t !== '업셀링'; }).join(', '));

  const opsUser = USERS.find(function(u) { return u.dept === p.dept && !u.isAdmin; });
  if (opsUser) setVal('r_ops', opsUser.name);
  else if (currentUser && !currentUser.isAdmin) setVal('r_ops', currentUser.name);

  autoNameReg();
}

// ══════════════════════════════════════════
// 파이프라인 탭 전환
// ══════════════════════════════════════════

function initPipelineScreen() {
  var activeBtn = document.querySelector('#pipe-tabs .view-tab.active');
  var tab = activeBtn ? activeBtn.id.replace('pipe-vt-','') : 'stats';
  switchPipelineTab(tab);
}

function switchPipelineTab(tab) {
  document.querySelectorAll('#pipe-tabs .view-tab').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.getElementById('pipe-vt-' + tab);
  if (btn) btn.classList.add('active');

  var statsPane  = document.getElementById('pipe-tab-stats');
  var kanbanPane = document.getElementById('pipe-tab-kanban');
  if (statsPane)  statsPane.style.display  = tab === 'stats'  ? '' : 'none';
  if (kanbanPane) kanbanPane.style.display = tab === 'kanban' ? '' : 'none';

  if (tab === 'stats')  renderPipelineStats();
  if (tab === 'kanban') renderPipeline();
}

// ══════════════════════════════════════════
// 파이프라인 통계 테이블 렌더링 (인라인 편집 지원)
// ══════════════════════════════════════════

function renderPipelineStats() {
  var container = document.getElementById('pipe-stats-container');
  if (!container) return;

  const _canEditTarget = () => currentUser && (currentUser.isAdmin || ['이사','본부장'].includes(currentUser.rank));
  const hint = document.getElementById('pst-hint');
  if (hint) hint.style.display = _canEditTarget() ? '' : 'none';

  var now = new Date();
  var curYear = now.getFullYear();
  var curMonthIdx = now.getMonth(); // 0=1월 ~ 11=12월
  var MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  // 스테이지 매핑 (통계 표기 → PIPELINE_DATA.stage)
  var STAGE_MAP = { 'Actual':'ACTUAL', 'Commitment':'COMMITMENT', 'Committed':'ACTUAL',
                    'Potential':'POTENTIAL', 'Make-up':'MAKEUP' };

  // 등록 캠페인 DATA에서 월별/본부별 광고비 합산 (ACTUAL 현황용)
  // bonbu가 null이면 전체 본부 합산
  function _calcCampaignActual(bonbu, monthStr) {
    var sum = 0;
    DATA.forEach(function(c) {
      if (!c.date || c.date.slice(0, 7) !== monthStr) return;
      if (bonbu) {
        var u = USERS.find(function(usr) { return usr.name === c.ops; });
        if (!u || u.bonbu !== bonbu) return;
      }
      var amt = c.product === 'DA' ? (c.daAdcost || 0) : (c.qty || 0) * (c.sellUnit || 0);
      sum += amt;
    });
    return sum;
  }

  // PIPELINE_DATA에서 현황(estAmt 합산) 계산; ACTUAL 단계는 등록 캠페인 DATA 사용
  function calcActual(bonbu, stage, monthIdx) {
    var pStage = STAGE_MAP[stage];
    if (!pStage) return null;
    var monthStr = curYear + '-' + String(monthIdx + 1).padStart(2, '0');
    if (pStage === 'ACTUAL') {
      var s = _calcCampaignActual(bonbu, monthStr);
      return s || null;
    }
    var sum = 0;
    PIPELINE_DATA.forEach(function(p) {
      if (!p.archived && p.bonbu === bonbu && p.stage === pStage && p.month === monthStr)
        sum += _pipelineEstAmt(p);
    });
    return sum || null;
  }
  // 소계: 해당 본부 전체 stage 합산 (ACTUAL은 등록 캠페인 DATA 사용)
  function calcSubActual(bonbu, monthIdx) {
    var monthStr = curYear + '-' + String(monthIdx + 1).padStart(2, '0');
    var sum = 0;
    PIPELINE_DATA.forEach(function(p) {
      if (!p.archived && p.bonbu === bonbu && p.month === monthStr && p.stage !== 'ACTUAL')
        sum += _pipelineEstAmt(p);
    });
    sum += _calcCampaignActual(bonbu, monthStr);
    return sum || null;
  }
  // 광고본부 합계: stage별 또는 전체 합산 (ACTUAL은 등록 캠페인 DATA 사용)
  function calcGrandActual(stage, monthIdx) {
    var monthStr = curYear + '-' + String(monthIdx + 1).padStart(2, '0');
    var pStage = STAGE_MAP[stage];
    var sum = 0;
    if (pStage === 'ACTUAL') {
      sum = _calcCampaignActual(null, monthStr);
    } else if (!pStage) {
      // ALL: 비ACTUAL은 PIPELINE_DATA, ACTUAL은 등록 캠페인 DATA
      PIPELINE_DATA.forEach(function(p) {
        if (!p.archived && p.month === monthStr && p.stage !== 'ACTUAL')
          sum += _pipelineEstAmt(p);
      });
      sum += _calcCampaignActual(null, monthStr);
    } else {
      PIPELINE_DATA.forEach(function(p) {
        if (!p.archived && p.month === monthStr && p.stage === pStage)
          sum += _pipelineEstAmt(p);
      });
    }
    return sum || null;
  }

  function fmtN(n) {
    if (n === null || n === undefined) return '<span class="pst-nil">—</span>';
    if (n === 0) return '<span class="pst-nil">-</span>';
    return n.toLocaleString();
  }
  function calcRate(t, a) {
    if (a === null || a === undefined || t === null || t === undefined || t === 0) return null;
    return (a / t) * 100;
  }
  function fmtR(r) {
    if (r === null || r === undefined) return '<span class="pst-nil">—</span>';
    var color = r >= 80 ? '#16a34a' : r >= 50 ? '#d97706' : r > 0 ? '#dc2626' : '#9ca3af';
    var pct = Math.min(r, 100);
    return '<div class="pst-rate-wrap">' +
      '<div class="pst-rate-bar"><div style="width:' + pct + '%;background:' + color + ';height:100%;border-radius:2px;transition:width .3s;"></div></div>' +
      '<span style="color:' + color + ';font-weight:700;font-size:11.5px;">' + r.toFixed(1) + '%</span>' +
    '</div>';
  }
  function stageColor(stage) {
    var map = { 'Actual':'#16a34a','Commitment':'#d97706','Committed':'#d97706','Potential':'#6366f1','Make-up':'#9ca3af' };
    return map[stage] || 'var(--text2)';
  }
  function eCell(dtype, di, ri, mi, field, val) {
    var raw = (val === null || val === undefined) ? '' : val;
    var isAdmin = currentUser && (currentUser.isAdmin || ['이사','본부장'].includes(currentUser.rank));
    var cls = 'pst-num' + (isAdmin ? ' pst-editable' : '');
    var title = isAdmin ? 'title="클릭하여 수정"' : '';
    return '<td class="' + cls + '" ' + title + ' ' +
      'data-dtype="' + dtype + '" data-di="' + di + '" data-ri="' + ri + '" ' +
      'data-mi="' + mi + '" data-field="' + field + '" data-raw="' + raw + '" ' +
      'onclick="editPipelineCell(this)">' + fmtN(val) + '</td>';
  }
  function rCell(val) { return '<td class="pst-num">' + fmtN(val) + '</td>'; }

  // 월별 셀 생성: 지난달/이번달 → 목표+현황+달성률, 미래 → 목표만
  // bonbu/stage 전달 시 현황을 PIPELINE_DATA에서 동적 계산, 없으면 months[mi].a 사용
  function monthCells(dtype, di, ri, months, total, bonbu, stage) {
    var out = '';
    for (var mi = 0; mi <= 11; mi++) {
      var m = (months && months[mi]) ? months[mi] : {t:null, a:null};
      var bgStyle = mi === curMonthIdx ? 'background:#f3f4fe;' : '';
      if (mi <= curMonthIdx) {
        // 현황: bonbu/stage가 있으면 동적 계산, 소계/합계면 별도 함수 사용
        var aVal;
        if (bonbu === '__sub__') aVal = calcSubActual(stage, mi);
        else if (bonbu === '__grand__') aVal = calcGrandActual(stage, mi);
        else if (bonbu && stage) aVal = calcActual(bonbu, stage, mi);
        else aVal = m.a;
        var rate = calcRate(m.t, aVal);
        out += eCell(dtype, di, ri, mi, 't', m.t);
        out += '<td class="pst-num">' + fmtN(aVal) + '</td>';
        out += '<td class="pst-rate-cell" style="' + bgStyle + '">' + fmtR(rate) + '</td>';
      } else {
        out += eCell(dtype, di, ri, mi, 't', m.t);
      }
    }
    out += eCell(dtype, di, ri, -1, 'total', total);
    return out;
  }

  // ── 공통 헤더 생성 함수 ──
  function buildHead() {
    var h1 = '<tr>' +
      '<th class="pst-th pst-sticky0 pst-th-dept" rowspan="2">부서</th>' +
      '<th class="pst-th pst-sticky1 pst-th-stage" rowspan="2">Stage</th>';
    var h2 = '<tr>';
    for (var mi = 0; mi <= 11; mi++) {
      var mnm = MONTH_NAMES[mi];
      var isCur = mi === curMonthIdx;
      var curBg = isCur ? 'background:#eef1fd;' : '';
      if (mi <= curMonthIdx) {
        h1 += '<th class="pst-th pst-grp1" colspan="3" style="text-align:center;' + curBg + '">' +
              mnm + (isCur ? ' <span style="font-size:9px;color:#6366f1;vertical-align:middle;">●</span>' : '') + '</th>';
        h2 += '<th class="pst-th pst-grp1" style="min-width:88px;' + curBg + '">목표</th>' +
              '<th class="pst-th pst-grp1" style="min-width:88px;' + curBg + '">현황</th>' +
              '<th class="pst-th pst-grp2" style="min-width:88px;' + curBg + '">달성률</th>';
      } else {
        h1 += '<th class="pst-th pst-grp2" rowspan="2" style="min-width:88px;">' +
              mnm + '<br><small style="font-weight:400;color:var(--text3);">목표</small></th>';
      }
    }
    h1 += '<th class="pst-th pst-grp2 pst-total-head" rowspan="2">합계</th></tr>';
    h2 += '</tr>';
    return '<thead>' + h1 + h2 + '</thead>';
  }

  // ── 메인 행 (1~3본부) ──
  var bd = PIPELINE_BUDGET_DATA;
  var mainRows = '';

  bd.depts.forEach(function(dept, di) {
    var rc = dept.rows.length;
    dept.rows.forEach(function(row, ri) {
      var sc = stageColor(row.stage);
      var stageTag = '<span class="pst-stage-badge" style="background:' + sc + '1a;color:' + sc + ';border-color:' + sc + '40;">' + row.stage + '</span>';
      mainRows += '<tr class="pst-data-row">' +
        (ri === 0 ? '<td class="pst-dept pst-sticky0" rowspan="' + (rc + 1) + '">' + _escHtml(dept.name) + '</td>' : '') +
        '<td class="pst-stage-cell pst-sticky1">' + stageTag + '</td>' +
        monthCells('dept-row', di, ri, row.months, row.total, dept.name, row.stage) +
        '</tr>';
    });
    var s = dept.sub;
    mainRows += '<tr class="pst-sub-row">' +
      '<td class="pst-sub-label pst-sticky1">' + _escHtml(dept.name) + ' 소계</td>' +
      monthCells('dept-sub', di, 0, s.months, s.total, '__sub__', dept.name) +
      '</tr>';
  });

  container.innerHTML =
    '<table class="pst-table">' + buildHead() + '<tbody>' + mainRows + '</tbody>' + '</table>';

  // ── 광고본부 (하단 고정 영역) ──
  var grandContainer = document.getElementById('pipe-grand-container');
  if (grandContainer) {
    var grand = bd.grand;
    var grandRows = '';
    grand.rows.forEach(function(row, ri) {
      var sc = stageColor(row.stage);
      var stageTag = '<span class="pst-stage-badge" style="background:' + sc + '1a;color:' + sc + ';border-color:' + sc + '40;">' + row.stage + '</span>';
      grandRows += '<tr class="pst-grand-row">' +
        (ri === 0 ? '<td class="pst-dept pst-grand-dept pst-sticky0" rowspan="' + (grand.rows.length + 1) + '">' + _escHtml(grand.name) + '</td>' : '') +
        '<td class="pst-stage-cell pst-sticky1 pst-grand-stage-cell">' + stageTag + '</td>' +
        monthCells('grand-row', 0, ri, row.months, row.total, '__grand__', row.stage) +
        '</tr>';
    });
    var gt = grand.total;
    grandRows += '<tr class="pst-grand-total">' +
      '<td class="pst-sub-label pst-grand-total-label pst-sticky1">Grand Total</td>' +
      monthCells('grand-total', 0, 0, gt.months, gt.total, '__grand__', 'ALL') +
      '</tr>';
    grandContainer.innerHTML =
      '<table class="pst-table">' + buildHead() + '<tbody>' + grandRows + '</tbody>' + '</table>';
  }

  // 헤더 2행의 top 값을 1행 높이로 자동 설정
  requestAnimationFrame(_pstFixHeaderTops);

  // 본부 표 세로 리사이즈 핸들 초기화 (최초 1회)
  _initPstResize();
}

function _initPstResize() {
  if (window._pstResizeInited) return;
  window._pstResizeInited = true;
  var handle   = document.getElementById('pst-resize-handle');
  var mainOuter = document.getElementById('pst-main-outer');
  if (!handle || !mainOuter) return;
  var startY, startH;
  handle.addEventListener('mousedown', function(e) {
    startY = e.clientY;
    startH = mainOuter.getBoundingClientRect().height;
    handle.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });
  function onMove(e) {
    var newH = Math.max(80, startH + (e.clientY - startY));
    mainOuter.style.flex = 'none';
    mainOuter.style.height = newH + 'px';
  }
  function onUp() {
    handle.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

function _pstFixHeaderTops() {
  ['.pst-scroll-wrap', '.pst-grand-wrap'].forEach(function(sel) {
    var thead = document.querySelector(sel + ' .pst-table thead');
    if (!thead) return;
    var rows = thead.querySelectorAll('tr');
    if (rows.length < 2) return;
    var row1H = rows[0].offsetHeight - 3;
    rows[1].querySelectorAll('th').forEach(function(th) {
      th.style.top = row1H + 'px';
    });
  });
}

function editPipelineCell(el) {
  if (!currentUser || !(currentUser.isAdmin || ['이사','본부장'].includes(currentUser.rank))) return;
  if (el.querySelector('input')) return;
  var raw = el.getAttribute('data-raw');
  var inp = document.createElement('input');
  inp.type = 'number';
  inp.value = raw;
  inp.className = 'pst-edit-input';
  el.innerHTML = '';
  el.appendChild(inp);
  inp.focus();
  inp.select();
  function save() {
    var v = inp.value.trim() === '' ? null : Number(inp.value);
    _savePipeStatCell(el, v);
  }
  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') { renderPipelineStats(); }
  });
}

function _savePipeStatCell(el, val) {
  var dtype = el.getAttribute('data-dtype');
  var di    = +el.getAttribute('data-di');
  var ri    = +el.getAttribute('data-ri');
  var mi    = +el.getAttribute('data-mi'); // -1 = 합계
  var field = el.getAttribute('data-field'); // 't' | 'a' | 'total'
  var bd    = PIPELINE_BUDGET_DATA;
  function setField(obj) {
    if (mi === -1) { obj.total = val; }
    else {
      if (!obj.months[mi]) obj.months[mi] = {t:null, a:null};
      obj.months[mi][field] = val;
    }
  }
  if      (dtype === 'dept-row')    setField(bd.depts[di].rows[ri]);
  else if (dtype === 'dept-sub')    setField(bd.depts[di].sub);
  else if (dtype === 'grand-row')   setField(bd.grand.rows[ri]);
  else if (dtype === 'grand-total') setField(bd.grand.total);

  // Firebase에 목표 데이터 저장
  _fbSavePipelineTargets();

  // 스크롤 위치 보존 후 재렌더
  var wrap = document.getElementById('pst-scroll-wrap');
  var sx = wrap ? wrap.scrollLeft : 0;
  var sy = wrap ? wrap.scrollTop  : 0;
  renderPipelineStats();
  requestAnimationFrame(function() {
    var w = document.getElementById('pst-scroll-wrap');
    if (w) { w.scrollLeft = sx; w.scrollTop = sy; }
  });
}


// ══════════════════════════════════════════
// ══════════════════════════════════════════
// 세금계산서 — 유틸
// ══════════════════════════════════════════
function _taxNextId() {
  return TAX_DATA.reduce((max, t) => Math.max(max, t.id || 0), 0) + 1;
}
function _memoBubblePos(el, b) {
  const r  = el.getBoundingClientRect();
  const bw = 300;
  let top  = r.bottom + 6;
  let left = r.left;
  if (left + bw > window.innerWidth  - 8) left = window.innerWidth  - bw - 8;
  if (top  + 80 > window.innerHeight - 8) top  = r.top - 80 - 6;
  b.style.top  = top  + 'px';
  b.style.left = left + 'px';
}
function _memoBubblePosFromMouse(e, b) {
  const bw = 300;
  let top  = e.clientY + 14;
  let left = e.clientX;
  if (left + bw > window.innerWidth  - 8) left = window.innerWidth  - bw - 8;
  if (top  + 60 > window.innerHeight - 8) top  = e.clientY - 60 - 8;
  b.style.top  = top  + 'px';
  b.style.left = left + 'px';
}
function showMemoBubbleAtMouse(e, text) {
  if (!text) return;
  const b = document.getElementById('tax-memo-bubble');
  if (!b || b.dataset.sticky === '1') return;
  b.dataset.sticky = '0';
  b.style.pointerEvents = 'none';
  b.textContent = text;
  b.style.display = 'block';
  _memoBubblePosFromMouse(e, b);
}
function showMemoBubble(el, text) {
  if (!text) return;
  const b = document.getElementById('tax-memo-bubble');
  if (!b || b.dataset.sticky === '1') return;
  b.dataset.sticky = '0';
  b.style.pointerEvents = 'none';
  b.textContent = text;
  b.style.display = 'block';
  _memoBubblePos(el, b);
}
function showMemoBubbleSticky(el, text) {
  if (!text) return;
  const b = document.getElementById('tax-memo-bubble');
  if (!b) return;
  b.dataset.sticky = '1';
  b.style.pointerEvents = 'auto';
  b.style.position = 'fixed';
  b.innerHTML = `<span onclick="event.stopPropagation();hideMemoBubble()" style="position:absolute;top:5px;right:8px;cursor:pointer;font-size:14px;color:#bbb;line-height:1;padding:2px;">✕</span><span style="display:block;padding-right:20px;">${_escHtml(text)}</span>`;
  b.style.display = 'block';
  _memoBubblePos(el, b);
}
function hideMemoBubble() {
  const b = document.getElementById('tax-memo-bubble');
  if (!b) return;
  b.style.display = 'none';
  b.dataset.sticky = '0';
  b.innerHTML = '';
}
document.addEventListener('click', e => {
  const b = document.getElementById('tax-memo-bubble');
  if (!b || b.dataset.sticky === '1') return;
  if (!e.target.closest('.tax-memo-cell')) hideMemoBubble();
});

function _taxNextGroupId() {
  return TAX_DATA.reduce((max, t) => Math.max(max, t.groupId || 0), 0) + 1;
}
function _taxGroupLabel(gid) {
  return `T-${String(gid).padStart(3, '0')}`;
}
function _taxGroupId(t) {
  // 하위호환: groupId 없는 기존 항목은 id를 groupId로 사용
  return t.groupId != null ? t.groupId : t.id;
}
function _taxMonthLabel(c) {
  if (!c.date) return '';
  return `${c.date.slice(0,4)}년${parseInt(c.date.slice(5,7))}월`;
}
function _taxContentAuto(c) {
  const m = c.date ? parseInt(c.date.slice(5,7)) + '월' : '';
  return [m, c.adv||'', c.media||'', c.product||'', '광고비'].filter(Boolean).join('_');
}
function _taxIsSettled(c) {
  if (c.product === 'DA')  return !!c.daAdcost;
  if (c.product === 'CPA') return !!(c.db || c.qty);
  return c.status === '성과입력완료';
}
function _taxCampaignPending(c) {
  if (!_taxIsSettled(c)) return false;
  const mediaRec   = MEDIA_DATA.find(m => m.company === c.media);
  const mediaNoTax = mediaRec && mediaRec.taxYn === false;
  // 광고주 타입: 플래그 OR 기존 TAX_DATA 항목 (taxType 없는 구버전도 광고주로 간주)
  const hasAdvTax   = c.taxAdvReq   || TAX_DATA.some(t => t.campaignId===c.id && (t.taxType==='adv' || !t.taxType));
  // 매체 타입: 플래그 OR 매체 타입 TAX_DATA 항목
  const hasMediaTax = c.taxMediaReq || TAX_DATA.some(t => t.campaignId===c.id && t.taxType==='media');
  const canAdv   = !hasAdvTax;
  const canMedia = !hasMediaTax && !mediaNoTax;
  return canAdv || canMedia;
}

// ── 세금계산서 필터/렌더 ──
var _taxQuickFilter = null; // 'unissued' | 'unpaid' | null

function resetTaxFilter() {
  _taxQuickFilter = null;
  const now = new Date();
  const el = id => document.getElementById(id);
  if (el('tax-year'))     el('tax-year').value     = String(now.getFullYear());
  if (el('tax-month'))    el('tax-month').value     = String(now.getMonth() + 1).padStart(2, '0');
  if (el('tax-fManager')) el('tax-fManager').value  = '';
  if (el('tax-fStatus'))  el('tax-fStatus').value   = '';
  if (el('tax-fSeller'))  el('tax-fSeller').value   = '';
  if (el('tax-fCompany')) el('tax-fCompany').value  = '';
  _taxPopulateManagerFilter();
  renderTaxList();
}

function _taxPopulateManagerFilter() {
  const sel = document.getElementById('tax-fManager');
  if (!sel) return;
  const cur = sel.value;
  const names = [...new Set(TAX_DATA.map(t => t.manager).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">담당자 전체</option>' +
    names.map(n => `<option value="${n}" ${n===cur?'selected':''}>${n}</option>`).join('');
}

function _taxPopulateSellerFilter() {
  const sel = document.getElementById('tax-fSeller');
  if (!sel) return;
  const cur = sel.value;
  const sellers = [...new Set(TAX_DATA.map(t => t.seller || t.company).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  sel.innerHTML = '<option value="">매출처 전체</option>' +
    sellers.map(s => `<option value="${s}" ${s===cur?'selected':''}>${s}</option>`).join('');
}

// 접힌 그룹 ID 목록
const _taxCollapsed = new Set(); // 명시적으로 접힌 그룹 (기본: 열림)

function setTaxQuickFilter(type) {
  _taxQuickFilter = (type === null || _taxQuickFilter === type) ? null : type;
  renderTaxList();
}

function renderTaxList() {
  const purgeBtn = document.getElementById('btn-tax-purge');
  if (purgeBtn) purgeBtn.style.display = currentUser?.isAdmin ? '' : 'none';
  _taxPopulateManagerFilter();
  _taxPopulateSellerFilter();
  const year    = document.getElementById('tax-year')?.value     || '';
  const month   = document.getElementById('tax-month')?.value    || '';
  const manager = document.getElementById('tax-fManager')?.value || '';
  const status  = document.getElementById('tax-fStatus')?.value  || '';
  const seller  = document.getElementById('tax-fSeller')?.value  || '';
  const company = (document.getElementById('tax-fCompany')?.value || '').trim().toLowerCase();

  // 필터링
  const filtered = TAX_DATA.filter(t => {
    if (year    && !(t.month || '').includes(year+'년')) return false;
    if (month   && !(t.month || '').includes(parseInt(month)+'월'))  return false;
    if (manager && t.manager !== manager) return false;
    if (status  && t.taxStatus !== status) return false;
    if (seller  && (t.seller || t.company) !== seller) return false;
    if (company && !(t.company||'').toLowerCase().includes(company) && !(t.tradeShopName||'').toLowerCase().includes(company)) return false;
    return true;
  });

  // groupId 기준으로 묶기
  const groupMap = new Map(); // groupId → items[]
  filtered.forEach(t => {
    const gid = _taxGroupId(t);
    if (!groupMap.has(gid)) groupMap.set(gid, []);
    groupMap.get(gid).push(t);
  });
  // 그룹 정렬: 가장 큰 id 기준 내림차순
  const groups = [...groupMap.entries()].sort((a, b) => {
    const maxA = Math.max(...a[1].map(t => t.id || 0));
    const maxB = Math.max(...b[1].map(t => t.id || 0));
    return maxB - maxA;
  });

  // 퀵필터 카운트 (필터 적용 전 전체 기준)
  const unissuedCnt = groups.filter(([, items]) => items[0].taxStatus !== '완료').length;
  const unpaidCnt   = groups.filter(([, items]) => items[0].paid !== '완료').length;

  // 퀵필터 적용
  const displayGroups = _taxQuickFilter === 'unissued'
    ? groups.filter(([, items]) => items[0].taxStatus !== '완료')
    : _taxQuickFilter === 'unpaid'
    ? groups.filter(([, items]) => items[0].paid !== '완료')
    : groups;

  // 요약 통계 (표시되는 그룹 기준)
  let totalSupply = 0, totalVat = 0, totalUnpaid = 0;
  displayGroups.forEach(([, items]) => {
    items.forEach(t => {
      totalSupply += t.supplyAmt || 0;
      totalVat    += t.vatAmt    || 0;
    });
    if (items[0].taxStatus === '완료' && items[0].paid !== '완료')
      items.forEach(t => { totalUnpaid += t.vatAmt || 0; });
  });

  const _v = n => n ? n.toLocaleString() : '—';
  const _el = id => document.getElementById(id);
  const issuedCnt = displayGroups.filter(([, items]) => items[0].taxStatus === '완료').length;
  const totalByMonth = DATA.filter(c => {
    if (!c.date) return false;
    if (year  && !c.date.startsWith(year))        return false;
    if (month && c.date.slice(5, 7) !== month)    return false;
    return true;
  }).length;
  if (_el('tax-cnt'))     _el('tax-cnt').textContent     = displayGroups.length + '건';
  if (_el('tax-cnt-sub')) _el('tax-cnt-sub').textContent = `발행 ${issuedCnt}건 / 전체 ${totalByMonth}건`;
  if (_el('tax-supply')) _el('tax-supply').textContent = _v(totalSupply);
  if (_el('tax-vat'))    _el('tax-vat').textContent    = _v(totalVat);
  if (_el('tax-unpaid')) _el('tax-unpaid').textContent = totalUnpaid ? totalUnpaid.toLocaleString() : '—';

  // 퀵필터 카드 업데이트
  if (_el('tax-unissued-cnt')) _el('tax-unissued-cnt').textContent = unissuedCnt + '건';
  if (_el('tax-unpaid-cnt'))   _el('tax-unpaid-cnt').textContent   = unpaidCnt   + '건';
  _el('tax-card-unissued')?.classList.toggle('tax-qf-active', _taxQuickFilter === 'unissued');
  _el('tax-card-unpaid')?.classList.toggle('tax-qf-active', _taxQuickFilter === 'unpaid');

  const listEl = document.getElementById('tax-list');
  if (!listEl) return;
  if (!displayGroups.length) {
    listEl.innerHTML = `<div class="tax-card-empty">해당 조건의 세금계산서가 없습니다.</div>`;
    return;
  }

  const _dateDisp = v => v ? v.replace(/-/g, '.').slice(2) : '—'; // 2026-04-22 → 26.04.22

  const cards = [];
  displayGroups.forEach(([gid, items]) => {
    const rep = items[0];
    const isDone      = rep.taxStatus === '완료';
    const isPaid      = rep.paid === '완료';
    const isCollapsed = _taxCollapsed.has(gid);
    const canDelete   = !!(currentUser?.isAdmin || currentUser?.name === (rep.createdBy || rep.manager));
    const canStatus   = ['wonjoon','yoonhee','admin'].includes(currentUser?.id);
    const canPaid     = true; // 전체 사용자
    const supplySum   = items.reduce((s, t) => s + (t.supplyAmt || 0), 0);
    const vatSum      = items.reduce((s, t) => s + (t.vatAmt    || 0), 0);
    const unpaidVal   = rep.unpaid != null ? rep.unpaid : null;

    // ── 캠페인 행들 ──
    const campRows = items.map(t => {
      const camp = DATA.find(c => c.id === t.campaignId);
      const campName = camp ? _cName(camp) : (t.content || '—');
      const mgr = t.manager || '—';
      const monthShort = (t.month || '').replace(/\d+년/, ''); // "2026년4월" → "4월"
      return `<tr>
        <td style="padding:7px 10px 7px 10px;white-space:nowrap;">${monthShort||'—'}</td>
        <td style="width:150px;min-width:150px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_escHtml(t.bizName||'—')}</td>
        <td style="font-weight:500;">${_escHtml(campName)}</td>
        <td style="color:var(--text2);">${_escHtml(mgr)}</td>
        <td class="td-r">${t.supplyAmt ? t.supplyAmt.toLocaleString() : '—'}</td>
        <td class="td-r" style="font-weight:600;">${t.vatAmt ? t.vatAmt.toLocaleString() : '—'}</td>
        <td style="color:var(--text2);">${_escHtml(t.contactEmail||'—')}</td>
        <td class="tax-memo-cell" data-memo="${_escHtml(t.memo||'')}"
          style="width:150px;min-width:150px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:${t.memo?'pointer':'default'};color:var(--text2);"
          onmouseenter="if(this.dataset.memo)showMemoBubble(this,this.dataset.memo)"
          onmouseleave="if(document.getElementById('tax-memo-bubble')?.dataset.sticky!=='1')hideMemoBubble()"
          onclick="event.stopPropagation();if(this.dataset.memo)showMemoBubbleSticky(this,this.dataset.memo)"
        >${_escHtml(t.memo||'')}</td>
        <td style="text-align:right;padding:4px 8px;">
          ${canDelete ? `<button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:transparent;font-size:11px;" onclick="deleteTax(${t.id})">×</button>` : ''}
        </td>
      </tr>`;
    }).join('');

    const sumRow = items.length > 1 ? `
      <tr class="tax-camp-sum">
        <td colspan="4" style="text-align:right;color:var(--text3);font-size:11px;">합계</td>
        <td class="td-r">${supplySum.toLocaleString()}</td>
        <td class="td-r">${vatSum.toLocaleString()}</td>
        <td colspan="2"></td>
      </tr>` : '';

    const bodyHtml = isCollapsed ? '' : `
      <div class="tax-card-body">
        <table class="tax-camp-table">
          <thead>
            <tr>
              <th style="padding:6px 10px;width:60px;min-width:60px;white-space:nowrap;">월</th>
              <th style="width:150px;min-width:150px;max-width:150px;">상호명</th>
              <th style="min-width:160px;">캠페인명</th>
              <th>담당자</th>
              <th class="td-r">공급가액</th>
              <th class="td-r">부가세포함</th>
              <th style="min-width:180px;">담당자 이름/이메일</th>
              <th style="width:150px;min-width:150px;">메모</th>
              <th style="width:36px;"></th>
            </tr>
          </thead>
          <tbody>${campRows}</tbody>
          ${sumRow ? `<tfoot>${sumRow}</tfoot>` : ''}
        </table>
      </div>`;

    const datePart = `
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <span style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:11px;color:var(--text3);white-space:nowrap;">요청일</span>
          <span style="font-size:12px;color:var(--text1);">${rep.reqDate||'—'}</span>
        </span>
        <span style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:11px;color:var(--text3);white-space:nowrap;">발행일</span>
          <span style="font-size:12px;color:var(--text1);">${rep.issueDate||'—'}</span>
        </span>
        <span style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:11px;color:var(--text3);white-space:nowrap;">입금예정</span>
          <span style="font-size:12px;color:var(--text1);">${rep.payDue||'—'}</span>
        </span>
      </div>`;

    cards.push(`
      <div class="tax-card" data-gid="${gid}">
        <div class="tax-card-head">
          <div class="tax-card-toggle" onclick="taxToggleCollapse(${gid})">${isCollapsed ? '▶' : '▼'}</div>
          <div class="tax-card-head-main">
            <span style="font-size:11px;font-weight:700;color:var(--primary);background:var(--primary-light);padding:2px 7px;border-radius:10px;white-space:nowrap;flex-shrink:0;">${_taxGroupLabel(gid)}</span>
            <span class="tax-card-company">${_escHtml(rep.company||'(업체명 없음)')}</span>
            <span style="font-size:12px;color:var(--text2);white-space:nowrap;min-width:240px;">공급가 <b>${supplySum.toLocaleString()}</b> · 부가세포함 <b>${vatSum.toLocaleString()}</b></span>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;color:var(--text3);">세발</span>
              <span style="display:inline-flex;align-items:center;justify-content:center;width:52px;">
                ${isDone
                  ? `<span class="stl-inv-badge done" ${canStatus ? `onclick="taxGroupToggleStatus(${gid})"` : `style="cursor:default;"`}>✓ 완료</span>`
                  : `<div class="chk" style="margin:0;${canStatus ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;'}" ${canStatus ? `onclick="taxGroupToggleStatus(${gid})"` : ''}></div>`}
              </span>
              <span style="font-size:11px;color:var(--text3);margin-left:4px;">입금</span>
              <span style="display:inline-flex;align-items:center;justify-content:center;min-width:52px;">
                ${isPaid && rep.payInDate
                  ? `<span class="stl-inv-badge done" style="font-size:10px;white-space:nowrap;cursor:pointer;" onclick="taxGroupTogglePaid(${gid})">${rep.payInDate}</span>`
                  : isPaid
                  ? `<span class="stl-inv-badge done" onclick="taxGroupTogglePaid(${gid})">✓ 완료</span>`
                  : `<div class="chk" style="margin:0;" onclick="taxGroupTogglePaid(${gid})"></div>`}
              </span>
            </div>
            ${datePart}
            <div style="flex:1;"></div>
            ${(rep.createdBy||rep.manager) ? `<span class="tax-card-manager">요청자: ${_escHtml(rep.createdBy||rep.manager)}</span>` : ''}
            ${canDelete ? `<button class="btn btn-ghost btn-sm" onclick="taxEditGroup(${gid})">수정</button>` : ''}
            ${canDelete ? `<button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:transparent;" onclick="deleteGroup(${gid})">삭제</button>` : ''}
          </div>
        </div>
        ${bodyHtml}
      </div>`);
  });

  listEl.innerHTML = cards.join('');
}

function taxToggleCollapse(gid) {
  if (_taxCollapsed.has(gid)) _taxCollapsed.delete(gid);
  else _taxCollapsed.add(gid);
  renderTaxList();
}

// ── 삭제 ──
async function deleteTax(id) {
  if (!confirm('이 캠페인 항목을 삭제하시겠습니까?')) return;
  const t = TAX_DATA.find(x => x.id === id);
  if (!t) return;
  const { campaignId, taxType } = t;
  const idx = TAX_DATA.findIndex(x => x.id === id);
  if (idx !== -1) TAX_DATA.splice(idx, 1);
  await _fbDeleteTax(id);
  // 캠페인 요청 플래그 리셋 (삭제 후 같은 타입 항목이 없으면)
  if (campaignId && taxType) {
    const stillExists = TAX_DATA.some(x => x.campaignId === campaignId && x.taxType === taxType);
    if (!stillExists) {
      const c = DATA.find(x => x.id === campaignId);
      if (c) {
        if (taxType === 'adv')   c.taxAdvReq   = false;
        if (taxType === 'media') c.taxMediaReq = false;
        _fbSaveCampaign(c);
      }
    }
  }
  renderTaxList();
}

async function deleteGroup(gid) {
  if (!confirm('이 발행요청 전체를 삭제하시겠습니까?')) return;
  const toDelete = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  toDelete.forEach(t => {
    const idx = TAX_DATA.findIndex(x => x.id === t.id);
    if (idx !== -1) TAX_DATA.splice(idx, 1);
  });
  await Promise.all(toDelete.map(t => _fbDeleteTax(t.id)));
  // 각 캠페인 요청 플래그 리셋
  toDelete.forEach(t => {
    if (!t.campaignId || !t.taxType) return;
    const stillExists = TAX_DATA.some(x => x.campaignId === t.campaignId && x.taxType === t.taxType);
    if (!stillExists) {
      const c = DATA.find(x => x.id === t.campaignId);
      if (c) {
        if (t.taxType === 'adv')   c.taxAdvReq   = false;
        if (t.taxType === 'media') c.taxMediaReq = false;
        _fbSaveCampaign(c);
      }
    }
  });
  renderTaxList();
}

async function taxPurgeAll() {
  if (!currentUser?.isAdmin) { toast('관리자만 사용할 수 있습니다.', 'warn'); return; }
  const cnt = TAX_DATA.length;
  if (!cnt) { toast('삭제할 항목이 없습니다.', 'warn'); return; }
  if (!confirm(`세금계산서 요청 전체 ${cnt}건을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  // 캠페인 플래그 초기화
  const affectedCids = [...new Set(TAX_DATA.map(t => t.campaignId).filter(Boolean))];
  affectedCids.forEach(cid => {
    const c = DATA.find(x => x.id === cid);
    if (c) {
      c.taxAdvReq   = false;
      c.taxMediaReq = false;
      _fbSaveCampaign(c);
    }
  });

  // Firebase 일괄 삭제
  await Promise.all(TAX_DATA.map(t => _fbDeleteTax(t.id)));
  TAX_DATA.length = 0;
  renderTaxList();
  toast('✓ 전체 삭제 완료', 'ok');
}

// ── 그룹 단위 토글/저장 ──
async function taxGroupToggleStatus(gid) {
  if (!['wonjoon','yoonhee','admin'].includes(currentUser?.id)) { toast('세발 처리 권한이 없습니다.', 'err'); return; }
  const items = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  if (!items.length) return;
  const isDone = items[0].taxStatus === '완료';
  if (!confirm(isDone ? '완료를 취소하시겠습니까?' : '완료 처리하시겠습니까?')) return;
  const newStatus = isDone ? '' : '완료';
  for (const t of items) {
    t.taxStatus = newStatus;
    await _fbSaveTax(t);
    // 정산 탭 invoiceOut 동기화 (광고주 타입만)
    if (t.campaignId && (t.taxType === 'adv' || !t.taxType)) {
      const c = DATA.find(d => d.id === t.campaignId);
      if (c && !!c.invoiceOut !== !isDone) {
        const prevOut = c.invoiceOut;
        c.invoiceOut = !isDone;
        _log(t.campaignId, 'check', 'invoiceOut', prevOut ? '발행' : '미발행', c.invoiceOut ? '발행' : '미발행');
        _fbSaveCampaign(c);
        _stlCellUpdate(t.campaignId, 'invoiceOut');
      }
    }
  }
  // 완료/취소 시 담당자에게 알림
  const rep1 = items[0];
  const toUser1 = USERS.find(u => u.name === (rep1.createdBy || rep1.manager));
  if (toUser1 && toUser1.id !== currentUser?.id) {
    const type = isDone ? 'tax_issue_cancel' : 'tax_issue';
    const body = _notifBody(type, rep1.company || '', '', undefined, gid);
    _fbSaveNotification(toUser1.id, type, body);
  }
  renderTaxList();
}

function taxGroupTogglePaid(gid) {
  const items = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  if (!items.length) return;
  const isPaid = items[0].paid === '완료';
  if (isPaid) {
    if (!confirm('입금 완료를 취소하시겠습니까?')) return;
    _applyTaxPaid(gid, false, null);
  } else {
    openPayInDateModal({ type: 'tax', gid });
  }
}

async function taxGroupSaveField(gid, field, value) {
  const items = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  for (const t of items) {
    t[field] = value;
    await _fbSaveTax(t);
  }
}

function taxGroupInlineEdit(el, gid, field) {
  if (el.querySelector('input')) return;
  const items = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  if (!items.length) return;
  const rep = items[0];
  const curVal = field === 'unpaid'
    ? (rep.unpaid != null ? rep.unpaid : 0)
    : (rep[field] || '');
  const isNum = field === 'unpaid';
  el.innerHTML = `<input type="${isNum?'number':'text'}" class="form-input"
    style="font-size:12px;padding:3px 6px;width:${isNum?'90px':'140px'};"
    value="${String(curVal).replace(/"/g,'&quot;')}">`;
  const inp = el.querySelector('input');
  inp.focus(); inp.select();
  let saved = false;
  const save = async () => {
    if (saved) return; saved = true;
    const newVal = isNum ? (parseFloat(inp.value) || 0) : inp.value.trim();
    await taxGroupSaveField(gid, field, newVal);
    renderTaxList();
  };
  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') { saved = true; renderTaxList(); }
  });
}

async function taxSaveField(id, field, value) {
  const t = TAX_DATA.find(x => x.id === id);
  if (!t) return;
  t[field] = value;
  await _fbSaveTax(t);
}

function taxInlineEdit(td, id, field) {
  if (td.querySelector('input')) return;
  const t = TAX_DATA.find(x => x.id === id);
  if (!t) return;
  const curVal = t[field] || '';
  td.innerHTML = `<input type="text" class="form-input"
    style="font-size:12px;padding:3px 6px;width:100%;min-width:180px;"
    value="${String(curVal).replace(/"/g,'&quot;')}">`;
  const inp = td.querySelector('input');
  inp.focus(); inp.select();
  let saved = false;
  const save = async () => {
    if (saved) return; saved = true;
    const tObj = TAX_DATA.find(x => x.id === id);
    if (tObj) { tObj[field] = inp.value.trim(); await _fbSaveTax(tObj); }
    renderTaxList();
  };
  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') { saved = true; renderTaxList(); }
  });
}

// ── 등록/수정 모달 ──
function taxUpdateVat() {
  const supply = parseFloat(document.getElementById('tax-r-supplyAmt')?.value) || 0;
  const vatEl = document.getElementById('tax-r-vatAmt');
  if (vatEl && supply) vatEl.value = Math.round(supply * 1.1);
}

function _taxRegInitYearSel() {
  const sel = document.getElementById('tax-r-year');
  if (!sel || sel.options.length) return;
  const cur = new Date().getFullYear();
  for (let y = cur - 2; y <= cur + 1; y++) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y + '년';
    sel.appendChild(o);
  }
}

function openTaxReg(id) {
  const _el = k => document.getElementById(k);
  _taxRegInitYearSel();
  const now  = new Date();
  const isNew = id === null;
  _el('taxRegTitle').textContent = isNew ? '세금계산서 등록' : '세금계산서 수정';
  if (isNew) {
    ['tax-edit-id','tax-edit-campaignId','tax-r-manager',
     'tax-r-reqDate','tax-r-issueDate','tax-r-payDue','tax-r-company',
     'tax-r-content','tax-r-bizName','tax-r-contactEmail','tax-r-memo'].forEach(k => { if(_el(k)) _el(k).value = ''; });
    if (_el('tax-r-supplyAmt')) _el('tax-r-supplyAmt').value = '';
    if (_el('tax-r-vatAmt'))    _el('tax-r-vatAmt').value    = '';
    if (_el('tax-r-taxType'))   _el('tax-r-taxType').value   = 'adv';
    if (_el('tax-r-year'))      _el('tax-r-year').value      = now.getFullYear();
    if (_el('tax-r-mon'))       _el('tax-r-mon').value       = now.getMonth() + 1;
    if (_el('tax-r-manager') && currentUser) _el('tax-r-manager').value = currentUser.name;
  } else {
    const t = TAX_DATA.find(x => x.id === id);
    if (!t) return;
    // 월 파싱: "2026년3월" → year=2026, mon=3
    const mMatch = (t.month || '').match(/(\d{4})년(\d+)월/);
    _el('tax-edit-id').value           = t.id;
    _el('tax-edit-campaignId').value   = t.campaignId    || '';
    _el('tax-r-taxType').value         = t.taxType        || 'adv';
    if (mMatch) { _el('tax-r-year').value = mMatch[1]; _el('tax-r-mon').value = parseInt(mMatch[2]); }
    _el('tax-r-reqDate').value         = t.reqDate        || '';
    _el('tax-r-issueDate').value       = t.issueDate      || '';
    _el('tax-r-payDue').value          = t.payDue         || '';
    _el('tax-r-manager').value         = t.manager        || '';
    _el('tax-r-company').value         = t.company        || '';
    _el('tax-r-bizName').value         = t.bizName        || '';
    _el('tax-r-content').value         = t.content        || '';
    _el('tax-r-supplyAmt').value       = t.supplyAmt      || '';
    _el('tax-r-vatAmt').value          = t.vatAmt         || '';
    _el('tax-r-contactEmail').value    = t.contactEmail   || '';
    _el('tax-r-memo').value            = t.memo           || '';
  }
  openModal('modalTaxReg');
}

function saveTaxReg() {
  const _v  = id => (document.getElementById(id)?.value || '').trim();
  const _n  = id => parseFloat(document.getElementById(id)?.value) || 0;
  const editId = _v('tax-edit-id');
  const isNew  = !editId;
  const newId  = isNew ? _taxNextId() : parseInt(editId);
  const existingT = isNew ? null : TAX_DATA.find(x => x.id === newId);
  const year = _v('tax-r-year');
  const mon  = _v('tax-r-mon');
  const month = (year && mon) ? `${year}년${mon}월` : '';
  const t = {
    id:           newId,
    groupId:      existingT ? _taxGroupId(existingT) : newId,
    campaignId:   _v('tax-edit-campaignId') || null,
    createdBy:    existingT?.createdBy || currentUser?.name || '',
    taxType:      _v('tax-r-taxType') || 'adv',
    manager:      _v('tax-r-manager'),
    month,
    reqDate:      _v('tax-r-reqDate'),
    issueDate:    _v('tax-r-issueDate'),
    taxStatus:    existingT?.taxStatus || '',
    payDue:       _v('tax-r-payDue'),
    paid:         existingT?.paid || false,
    company:      _v('tax-r-company'),
    content:      _v('tax-r-content'),
    bizName:      _v('tax-r-bizName'),
    supplyAmt:    _n('tax-r-supplyAmt'),
    vatAmt:       _n('tax-r-vatAmt'),
    contactEmail: _v('tax-r-contactEmail'),
    memo:         _v('tax-r-memo')
  };
  if (isNew) {
    TAX_DATA.push(t);
  } else {
    const idx = TAX_DATA.findIndex(x => x.id === t.id);
    if (idx !== -1) TAX_DATA[idx] = t; else TAX_DATA.push(t);
  }
  _fbSaveTax(t);
  // 신규 등록 시 wonjoon에게 알림 (본인이 wonjoon이 아닌 경우만)
  if (isNew && currentUser?.id !== 'wonjoon') {
    const body = _notifBody('tax_new', t.company || '', '', 1, t.groupId);
    _fbSaveNotification('wonjoon', 'tax_new', body);
  }
  closeModal('modalTaxReg');
  renderTaxList();
}

// ── 자동 생성 모달 ──
// 전체 eligible 캐시 (필터링용)
let _taxGenEligible = [];

function openTaxAutoGen() {
  _taxGenEligible = DATA.filter(c => _taxCampaignPending(c));

  // 필터 드롭다운 채우기
  const months   = [...new Set(_taxGenEligible.map(c => _taxMonthLabel(c)).filter(Boolean))].sort();
  const sellers  = [...new Set(_taxGenEligible.map(c => c.seller||c.adv||'').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  const medias   = [...new Set(_taxGenEligible.map(c => c.media||'').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  const managers = [...new Set(_taxGenEligible.map(c => c.ops||'').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  const fMonth  = document.getElementById('tax-gen-fMonth');
  const fSeller = document.getElementById('tax-gen-fSeller');
  const fMedia  = document.getElementById('tax-gen-fMedia');
  const fMgr    = document.getElementById('tax-gen-fManager');
  if (fMonth) {
    fMonth.innerHTML = '<option value="">발송월 전체</option>' + months.map(v=>`<option>${_escHtml(v)}</option>`).join('');
    const now = new Date();
    const curLabel = `${now.getFullYear()}년${now.getMonth()+1}월`;
    if (months.includes(curLabel)) fMonth.value = curLabel;
  }
  if (fSeller) fSeller.innerHTML = '<option value="">광고주/대행사 전체</option>' + sellers.map(v=>`<option>${_escHtml(v)}</option>`).join('');
  if (fMedia)  fMedia.innerHTML  = '<option value="">매체사 전체</option>'        + medias.map(v=>`<option>${_escHtml(v)}</option>`).join('');
  if (fMgr)    fMgr.innerHTML    = '<option value="">담당자 전체</option>'        + managers.map(v=>`<option>${_escHtml(v)}</option>`).join('');

  // step1 초기화
  document.getElementById('tax-gen-step1').style.display = '';
  document.getElementById('tax-gen-step2').style.display = 'none';
  document.getElementById('tax-gen-title').innerHTML = '캠페인 선택 <span style="font-size:12px;color:var(--text3);font-weight:400;">1단계 / 2단계</span>';
  const allChk = document.getElementById('tax-gen-chk-all');
  if (allChk) allChk.checked = false;

  taxGenRenderList();
  openModal('modalTaxAutoGen');
}

function taxGenRenderList() {
  const fMonth  = document.getElementById('tax-gen-fMonth')?.value  || '';
  const fSeller = document.getElementById('tax-gen-fSeller')?.value || '';
  const fMedia  = document.getElementById('tax-gen-fMedia')?.value  || '';
  const fMgr    = document.getElementById('tax-gen-fManager')?.value || '';
  const fSearch = (document.getElementById('tax-gen-fSearch')?.value || '').trim().toLowerCase();
  const filtered = _taxGenEligible.filter(c => {
    if (fMonth  && _taxMonthLabel(c) !== fMonth)                    return false;
    if (fSeller && (c.seller||c.adv||'') !== fSeller)              return false;
    if (fMedia  && (c.media||'') !== fMedia)                        return false;
    if (fMgr    && (c.ops||'') !== fMgr)                            return false;
    if (fSearch && !_cName(c).toLowerCase().includes(fSearch) && !(c.id||'').toLowerCase().includes(fSearch)) return false;
    return true;
  });
  const countEl = document.getElementById('tax-gen-count');
  if (countEl) countEl.textContent = `${filtered.length}건`;
  const tbody = document.getElementById('tax-gen-tbody');
  if (!tbody) return;
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:28px;text-align:center;color:var(--text3);">해당 조건의 캠페인이 없습니다.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(c => {
    const supply    = _stlAmt(c).adc || 0;
    const mediaRec  = MEDIA_DATA.find(m => m.company === c.media);
    const mediaNoTax = mediaRec && mediaRec.taxYn === false;

    // 요청 가능한 타입만 옵션으로 구성 (플래그 or 기존 TAX_DATA 기준)
    const hasAdv   = c.taxAdvReq   || TAX_DATA.some(t => t.campaignId===c.id && (t.taxType==='adv' || !t.taxType));
    const hasMedia = c.taxMediaReq || TAX_DATA.some(t => t.campaignId===c.id && t.taxType==='media');
    const opts = ['<option value="">선택</option>'];
    if (!hasAdv)              opts.push('<option value="adv">광고주</option>');
    if (!hasMedia && !mediaNoTax) opts.push('<option value="media">매체</option>');

    const typeSelect = `<select class="tax-gen-type form-sel" data-id="${c.id}" data-supply="${supply}"
      style="font-size:12px;padding:2px 4px;width:80px;opacity:0.4;cursor:not-allowed;"
      disabled onclick="event.stopPropagation()" onchange="taxGenUpdateTotal()">
      ${opts.join('')}
    </select>`;

    return `<tr style="cursor:pointer;" onclick="event.target.tagName!=='SELECT'&&event.target.tagName!=='OPTION'&&this.querySelector('.tax-gen-chk').click()">
      <td style="text-align:center;" onclick="event.stopPropagation()">
        <input type="checkbox" class="tax-gen-chk" data-id="${c.id}" data-supply="${supply}" onchange="taxGenRowToggle(this)">
      </td>
      <td>${_taxMonthLabel(c)}</td>
      <td>${_escHtml(c.product||'—')}</td>
      <td style="font-weight:600;">${_escHtml(_cName(c))}</td>
      <td style="text-align:center;" onclick="event.stopPropagation()">${typeSelect}</td>
      <td class="td-r">${supply ? supply.toLocaleString() : '—'}</td>
      <td>${_escHtml(c.ops||'—')}</td>
    </tr>`;
  }).join('');
  taxGenUpdateTotal();
}

function taxGenRowToggle(chk) {
  const sel = chk.closest('tr')?.querySelector('.tax-gen-type');
  if (sel) {
    sel.disabled = !chk.checked;
    sel.style.opacity = chk.checked ? '1' : '0.4';
    sel.style.cursor  = chk.checked ? '' : 'not-allowed';
    if (!chk.checked) sel.value = '';
  }
  taxGenUpdateTotal();
}

function taxGenToggleAll(chk) {
  document.querySelectorAll('.tax-gen-chk').forEach(c => {
    c.checked = chk.checked;
    taxGenRowToggle(c);
  });
}

// 체크된 행에 발행구분 일괄 적용
function taxGenBulkType(type) {
  document.querySelectorAll('.tax-gen-chk:checked').forEach(chk => {
    const sel = chk.closest('tr')?.querySelector('.tax-gen-type');
    if (!sel || sel.disabled) return;
    // 해당 옵션이 존재하는 경우에만 적용
    if ([...sel.options].some(o => o.value === type)) sel.value = type;
  });
  taxGenUpdateTotal();
}

function taxGenUpdateTotal() {
  let total = 0;
  document.querySelectorAll('.tax-gen-chk:checked').forEach(chk => {
    const typeEl = chk.closest('tr')?.querySelector('.tax-gen-type');
    if (typeEl && typeEl.value) total += parseInt(chk.dataset.supply || 0, 10);
  });
  const el = document.getElementById('tax-gen-total');
  if (el) el.innerHTML = `선택 합계 <b>${total ? total.toLocaleString() : '0'}</b>원`;
}

function taxGenNext() {
  const checked = [...document.querySelectorAll('.tax-gen-chk:checked')];
  if (!checked.length) { alert('캠페인을 1개 이상 선택해주세요.'); return; }

  // 선택된 행에서 발행구분 select 값 수집
  const entries = [];
  checked.forEach(chk => {
    const c = DATA.find(x => x.id === chk.dataset.id);
    if (!c) return;
    const typeEl = chk.closest('tr')?.querySelector('.tax-gen-type');
    const taxType = typeEl?.value;
    if (taxType === 'adv' || taxType === 'media') entries.push({c, taxType});
  });
  if (!entries.length) { alert('발행 구분(광고주/매체)을 선택해주세요.'); return; }

  // taxType+업체명으로 그룹화
  const byGroup = new Map();
  entries.forEach(({c, taxType}) => {
    const company = taxType==='adv' ? (c.seller||c.adv||'(미지정)') : (c.media||'(미지정)');
    const key = `${taxType}::${company}`;
    if (!byGroup.has(key)) byGroup.set(key, {company, taxType, campaigns:[]});
    byGroup.get(key).campaigns.push(c);
  });

  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthEndStr = prevMonthEnd.toISOString().slice(0,10);

  const container = document.getElementById('tax-gen-step2-container');
  if (container) {
    const cards = [];
    cards.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;">
      <span style="font-size:12px;font-weight:600;color:var(--text2);white-space:nowrap;">발행요청일자 (공통)</span>
      <input type="date" class="form-input" id="tax-gen-common-req" style="font-size:12px;padding:4px 8px;width:160px;" value="${todayStr}">
      <span style="font-size:12px;color:var(--text3);">※ 아래 모든 업체에 동일하게 적용됩니다</span>
    </div>`);

    let gi = 0;
    byGroup.forEach(({company, taxType, campaigns}) => {
      const supplyTotal = campaigns.reduce((s,c) => s + (_stlAmt(c).adc||0), 0);
      const typeLabel = taxType==='adv' ? '광고주' : '매체';
      const campaignRows = campaigns.map(c => {
        const supply = _stlAmt(c).adc||0;
        return `<tr data-cid="${c.id}" data-taxtype="${taxType}" data-supply="${supply}" class="tax-gen-camp-row">
          <td style="font-size:12px;color:var(--text2);padding:5px 4px;">${_taxMonthLabel(c)}</td>
          <td style="font-size:12px;color:var(--text2);padding:5px 4px;">${_escHtml(c.product||'—')}</td>
          <td style="font-size:12px;font-weight:600;padding:5px 4px;">${_escHtml(_cName(c))}</td>
          <td class="td-r tax-gen-supply-cell" style="font-size:12px;padding:5px 4px;cursor:pointer;text-decoration:underline dotted;" title="클릭하여 수정" onclick="taxGenEditSupply(this)">${supply ? supply.toLocaleString() : '—'}</td>
          <td style="padding:5px 4px;"><input type="text" class="form-input tax-gen-email" placeholder="이름, email@domain.com" style="font-size:12px;padding:3px 6px;width:100%;min-width:180px;"></td>
          <td style="padding:5px 4px;"><input type="text" class="form-input tax-gen-memo" placeholder="메모" style="font-size:12px;padding:3px 6px;width:100%;min-width:120px;"></td>
        </tr>`;
      }).join('');
      cards.push(`<div class="tax-gen-group-card" data-gi="${gi}" style="border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
        <div style="background:var(--surface2);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;font-size:14px;">${_escHtml(company)}</span>
          <span style="font-size:11px;color:var(--primary,#1a73e8);background:rgba(26,115,232,.1);padding:2px 8px;border-radius:20px;font-weight:600;">${typeLabel}</span>
          <span style="font-size:12px;color:var(--text2);">캠페인 ${campaigns.length}건 · 공급가액 합계 ${supplyTotal.toLocaleString()}원</span>
          <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;margin-left:auto;">
            <input type="checkbox" class="tax-gen-paid-chk" onchange="taxGenPaidChkChange(this,${gi})"> 입금완료
          </label>
        </div>
        <div style="padding:10px 14px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px;">발행일자</label>
              <input type="date" class="form-input tax-gen-iss" style="font-size:12px;padding:4px 6px;width:100%;" value="${prevMonthEndStr}">
            </div>
            <div class="tax-gen-paydue-wrap">
              <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px;">입금예정일</label>
              <input type="date" class="form-input tax-gen-paydue" style="font-size:12px;padding:4px 6px;width:100%;">
            </div>
          </div>
          <table style="width:100%;font-size:12px;border-collapse:collapse;border-top:1px solid var(--border);">
            <thead>
              <tr style="color:var(--text3);">
                <th style="text-align:left;padding:6px 4px;font-weight:500;">월별</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">상품</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">캠페인명</th>
                <th style="text-align:right;padding:6px 4px;font-weight:500;">공급가액</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">담당자 이름/이메일</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">메모</th>
              </tr>
            </thead>
            <tbody>${campaignRows}</tbody>
          </table>
        </div>
      </div>`);
      gi++;
    });
    container.innerHTML = cards.join('');
  }

  document.getElementById('tax-gen-step1').style.display = 'none';
  document.getElementById('tax-gen-step2').style.display = '';
  document.getElementById('tax-gen-title').innerHTML = '정보 입력 <span style="font-size:12px;color:var(--text3);font-weight:400;">2단계 / 2단계</span>';
}

function taxGenPrev() {
  document.getElementById('tax-gen-step2').style.display = 'none';
  document.getElementById('tax-gen-step1').style.display = '';
  document.getElementById('tax-gen-title').innerHTML = '캠페인 선택 <span style="font-size:12px;color:var(--text3);font-weight:400;">1단계 / 2단계</span>';
  _taxSetStep2Footer('new');
}

let _taxEditGid = null;

function _taxSetStep2Footer(mode) {
  const foot = document.querySelector('#tax-gen-step2 .modal-foot');
  if (!foot) return;
  if (mode === 'edit') {
    foot.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('modalTaxAutoGen');_taxEditGid=null;">취소</button>
      <button class="btn btn-primary" onclick="confirmTaxEdit()">저장</button>`;
  } else {
    foot.innerHTML = `
      <button class="btn btn-ghost" onclick="taxGenPrev()">← 이전</button>
      <button class="btn btn-primary" onclick="confirmTaxAutoGen()">등록</button>`;
  }
}

// 입금완료 체크박스 토글 → 입금예정일 비활성화 + 날짜 모달
function taxGenPaidChkChange(chkEl, gi) {
  const card = chkEl.closest('.tax-gen-group-card');
  if (!card) return;
  const payDueWrap = card.querySelector('.tax-gen-paydue-wrap');
  const payDueInput = card.querySelector('.tax-gen-paydue');
  if (chkEl.checked) {
    if (payDueWrap) payDueWrap.style.opacity = '0.4';
    if (payDueInput) payDueInput.disabled = true;
    openPayInDateModal({ type: 'taxgen', card });
  } else {
    if (payDueWrap) payDueWrap.style.opacity = '';
    if (payDueInput) payDueInput.disabled = false;
    card.dataset.payInDate = '';
  }
}

// 공급가액 인라인 수정
function taxGenEditSupply(td) {
  if (td.querySelector('input')) return;
  const tr = td.closest('tr');
  const cur = parseInt((td.textContent||'').replace(/,/g,'')) || 0;
  const memoTd = tr.querySelector('.form-input.tax-gen-memo');
  td.innerHTML = `<input type="number" class="form-input" style="font-size:12px;padding:2px 4px;width:90px;text-align:right;" value="${cur}">`;
  const inp = td.querySelector('input');
  inp.focus(); inp.select();
  const done = () => {
    const newVal = parseInt(inp.value) || 0;
    tr.dataset.supply = newVal;
    td.textContent = newVal ? newVal.toLocaleString() : '—';
    if (newVal !== cur && memoTd && !memoTd.value.trim()) {
      memoTd.style.border = '1.5px solid var(--red)';
      memoTd.placeholder = '금액 변경 시 메모 필수';
      memoTd.focus();
    }
  };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { td.textContent = cur ? cur.toLocaleString() : '—'; } });
}

function taxEditGroup(gid) {
  _taxEditGid = gid;
  const items = TAX_DATA.filter(t => _taxGroupId(t) === gid);
  if (!items.length) return;
  const rep = items[0];

  const container = document.getElementById('tax-gen-step2-container');
  if (container) {
    const supplyTotal = items.reduce((s, t) => s + (t.supplyAmt||0), 0);
    const campaignRows = items.map(t => {
      const camp = DATA.find(c => c.id === t.campaignId);
      const campName = camp ? _cName(camp) : (t.content||'—');
      const supply = t.supplyAmt||0;
      return `<tr data-tid="${t.id}" class="tax-gen-camp-row">
        <td style="font-size:12px;color:var(--text2);padding:5px 4px;">${_escHtml(t.month||'—')}</td>
        <td style="font-size:12px;color:var(--text2);padding:5px 4px;">${_escHtml(camp?.product||'—')}</td>
        <td style="font-size:12px;font-weight:600;padding:5px 4px;">${_escHtml(campName)}</td>
        <td class="td-r" style="font-size:12px;padding:5px 4px;">${supply ? supply.toLocaleString() : '—'}</td>
        <td style="padding:5px 4px;"><input type="text" class="form-input tax-gen-email" value="${_escHtml(t.contactEmail||'')}" placeholder="이름, email@domain.com" style="font-size:12px;padding:3px 6px;width:100%;min-width:180px;"></td>
        <td style="padding:5px 4px;"><input type="text" class="form-input tax-gen-memo" value="${_escHtml(t.memo||'')}" placeholder="메모" style="font-size:12px;padding:3px 6px;width:100%;min-width:120px;"></td>
      </tr>`;
    }).join('');

    const prevMonthEndStr = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0,10);
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;">
        <span style="font-size:12px;font-weight:600;color:var(--text2);white-space:nowrap;">발행요청일자 (공통)</span>
        <input type="date" class="form-input" id="tax-gen-common-req" style="font-size:12px;padding:4px 8px;width:160px;" value="${rep.reqDate||''}">
      </div>
      <div class="tax-gen-group-card" style="border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
        <div style="background:var(--surface2);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-weight:700;font-size:14px;">${_escHtml(rep.company||'')}</span>
          <span style="font-size:12px;color:var(--text3);">캠페인 ${items.length}건 · 공급가액 합계 ${supplyTotal.toLocaleString()}원</span>
        </div>
        <div style="padding:10px 14px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px;">발행일자</label>
              <input type="date" class="form-input tax-gen-iss" style="font-size:12px;padding:4px 6px;width:100%;" value="${rep.issueDate||prevMonthEndStr}">
            </div>
            <div>
              <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:3px;">입금예정일</label>
              <input type="date" class="form-input tax-gen-paydue" style="font-size:12px;padding:4px 6px;width:100%;" value="${rep.payDue||''}">
            </div>
          </div>
          <table style="width:100%;font-size:12px;border-collapse:collapse;border-top:1px solid var(--border);">
            <thead>
              <tr style="color:var(--text3);">
                <th style="text-align:left;padding:6px 4px;font-weight:500;">월별</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">상품</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">캠페인명</th>
                <th style="text-align:right;padding:6px 4px;font-weight:500;">공급가액</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">담당자 이름/이메일</th>
                <th style="text-align:left;padding:6px 4px;font-weight:500;">메모</th>
              </tr>
            </thead>
            <tbody>${campaignRows}</tbody>
          </table>
        </div>
      </div>`;
  }

  document.getElementById('tax-gen-step1').style.display = 'none';
  document.getElementById('tax-gen-step2').style.display = '';
  document.getElementById('tax-gen-title').innerHTML = '발행요청 수정';
  _taxSetStep2Footer('edit');
  openModal('modalTaxAutoGen');
}

async function confirmTaxEdit() {
  if (!_taxEditGid) return;
  const commonReq = document.getElementById('tax-gen-common-req')?.value || '';
  const card      = document.querySelector('#tax-gen-step2-container .tax-gen-group-card');
  if (!card) return;
  const issDate = card.querySelector('.tax-gen-iss')?.value    || '';
  const payDue  = card.querySelector('.tax-gen-paydue')?.value || '';
  const campRows = [...card.querySelectorAll('.tax-gen-camp-row')];

  for (const tr of campRows) {
    const tid = parseInt(tr.dataset.tid);
    const t   = TAX_DATA.find(x => x.id === tid);
    if (!t) continue;
    t.reqDate      = commonReq;
    t.issueDate    = issDate;
    t.payDue       = payDue;
    t.contactEmail = tr.querySelector('.tax-gen-email')?.value.trim() || '';
    t.memo         = tr.querySelector('.tax-gen-memo')?.value.trim()  || '';
    await _fbSaveTax(t);
  }

  _taxEditGid = null;
  closeModal('modalTaxAutoGen');
  renderTaxList();
  toast('✓ 수정되었습니다', 'ok');
}

async function confirmTaxAutoGen() {
  const commonReq = document.getElementById('tax-gen-common-req')?.value || '';
  if (!commonReq) { alert('발행요청일자를 입력해주세요.'); return; }

  const _savedItems = []; // 알림용 추적
  const cards = [...document.querySelectorAll('.tax-gen-group-card')];

  for (const card of cards) {
    const issDate    = card.querySelector('.tax-gen-iss')?.value    || '';
    const payDue     = card.querySelector('.tax-gen-paydue')?.value || '';
    const paidChk    = card.querySelector('.tax-gen-paid-chk')?.checked || false;
    const payInDate  = card.dataset.payInDate || null;
    const campRows   = [...card.querySelectorAll('.tax-gen-camp-row')];
    if (!campRows.length) continue;

    // 공급가액 수정 시 메모 검증
    for (const tr of campRows) {
      const origSupply = _stlAmt(DATA.find(x => x.id === tr.dataset.cid) || {}).adc || 0;
      const newSupply  = parseInt(tr.dataset.supply) || origSupply;
      if (newSupply !== origSupply) {
        const memo = tr.querySelector('.tax-gen-memo')?.value.trim() || '';
        if (!memo) { alert('공급가액을 수정한 경우 메모를 입력해주세요.'); return; }
      }
    }

    const groupId = _taxNextGroupId();

    for (const tr of campRows) {
      const cid     = tr.dataset.cid;
      const taxType = tr.dataset.taxtype; // 'adv' | 'media'
      const c       = DATA.find(x => x.id === cid);
      if (!c) continue;

      // 이미 완료된 타입은 스킵
      const existing = TAX_DATA.find(t => t.campaignId===cid && t.taxType===taxType);
      if (existing && existing.taxStatus==='완료') continue;

      const origSupply = _stlAmt(c).adc || 0;
      const supply  = parseInt(tr.dataset.supply) || origSupply;
      const email   = tr.querySelector('.tax-gen-email')?.value.trim() || '';
      const memo    = tr.querySelector('.tax-gen-memo')?.value.trim()  || '';
      const company = taxType==='adv' ? (c.seller||c.adv||'') : (c.media||'');

      const t = {
        id:           _taxNextId(),
        groupId:      groupId,
        campaignId:   c.id,
        taxType:      taxType,
        createdBy:    currentUser?.name || '',
        manager:      c.ops || '',
        month:        _taxMonthLabel(c),
        reqDate:      commonReq,
        issueDate:    issDate,
        taxStatus:    '',
        payDue:       paidChk ? '' : payDue,
        paid:         paidChk ? '완료' : null,
        payInDate:    paidChk ? (payInDate || null) : null,
        unpaid:       paidChk ? 0 : null,
        company:      company,
        content:      _taxContentAuto(c),
        bizName:      company,
        supplyAmt:    supply,
        vatAmt:       Math.round(supply * 1.1),
        contactEmail: email,
        memo:         memo
      };

      // 캠페인에 요청 플래그 기록
      if (taxType==='adv')   c.taxAdvReq   = true;
      if (taxType==='media') c.taxMediaReq = true;
      _fbSaveCampaign(c);

      TAX_DATA.push(t);
      await _fbSaveTax(t);
      _savedItems.push(t);
    }
  }

  // 불러오기 완료 후 wonjoon에게 알림 1개 (본인이 wonjoon이 아닌 경우만)
  if (_savedItems.length > 0 && currentUser?.id !== 'wonjoon') {
    const companies = [...new Set(_savedItems.map(t => t.company).filter(Boolean))];
    const companyStr = companies.length === 1 ? companies[0] : (companies[0] || '');
    const firstGid = _savedItems[0]?.groupId;
    const body = _notifBody('tax_new', companyStr, '', _savedItems.length, firstGid);
    if (body) _fbSaveNotification('wonjoon', 'tax_new', body);
  }
  closeModal('modalTaxAutoGen');
  const _now = new Date();
  const elY = document.getElementById('tax-year');
  const elM = document.getElementById('tax-month');
  if (elY) elY.value = String(_now.getFullYear());
  if (elM) elM.value = String(_now.getMonth() + 1).padStart(2, '0');
  renderTaxList();
}

// ══════════════════════════════════════════
// 알림 (NOTIFICATIONS)
// ══════════════════════════════════════════

function _notifBody(type, company, content, count, gid) {
  const label = gid ? `[${_taxGroupLabel(gid)}] ` : '';
  const subject = content ? `${company} / ${content}` : company;
  if (type === 'tax_issue')          return `${label}${subject}에 대한 세금계산서 발행이 완료되었습니다.`;
  if (type === 'tax_issue_cancel')   return `${label}${subject}에 대한 세금계산서 발행 완료가 취소되었습니다.`;
  if (type === 'tax_payment')        return `${label}${subject}에 대한 입금이 완료되었습니다.`;
  if (type === 'tax_payment_cancel') return `${label}${subject}에 대한 입금 완료가 취소되었습니다.`;
  if (type === 'tax_new') {
    const name = currentUser?.name || '';
    return count > 1
      ? `${label}${name}님이 ${company} 세금계산서 ${count}건 발행을 요청했습니다.`
      : `${label}${name}님이 ${company} 세금계산서 발행을 요청했습니다.`;
  }
  return '';
}

async function _fbSaveNotification(toUserId, type, body) {
  if (!window._db || !toUserId) return;
  const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const notif = { id, toUserId, type, body, createdAt: new Date().toISOString(), read: false };
  try { await window._db.collection('notifications').doc(id).set(notif); }
  catch(e) { console.error('[FB] 알림 저장 실패:', e); }
}

async function notifMarkAllRead() {
  if (!window._db) return;
  const unread = NOTIFICATIONS.filter(n => !n.read);
  for (const n of unread) {
    try { await window._db.collection('notifications').doc(n.id).update({ read: true }); }
    catch(e) {}
  }
}

function _updateNotifBadge() {
  const cnt = NOTIFICATIONS.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (cnt > 0) { badge.style.display = ''; badge.textContent = cnt > 99 ? '99+' : cnt; }
  else { badge.style.display = 'none'; }
}

function _renderNotifList() {
  const el = document.getElementById('notif-list');
  if (!el) return;
  if (!NOTIFICATIONS.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:40px 0;">알림이 없습니다.</div>';
    return;
  }
  el.innerHTML = NOTIFICATIONS.map(n => {
    const dt = n.createdAt ? new Date(n.createdAt) : null;
    const timeStr = dt ? `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : '';
    return `<div style="display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);${n.read ? '' : 'background:var(--primary-light);'}">
      <div style="flex-shrink:0;margin-top:4px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${n.read ? 'var(--border)' : 'var(--primary)'};"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;color:var(--text1);line-height:1.5;">${_escHtml(n.body)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;">${timeStr}</div>
      </div>
    </div>`;
  }).join('');
}

function openNotifModal() {
  _renderNotifList();
  openModal('modalNotif');
  // 모달 열면 모두 읽음
  const unread = NOTIFICATIONS.filter(n => !n.read);
  if (unread.length) notifMarkAllRead();
}

function _fbWatchNotifications() {
  if (!window._db || !currentUser) return;
  if (_notifUnsub) { _notifUnsub(); _notifUnsub = null; }
  _notifUnsub = window._db.collection('notifications')
    .where('toUserId', '==', currentUser.id)
    .onSnapshot(snap => {
      NOTIFICATIONS.length = 0;
      snap.forEach(d => NOTIFICATIONS.push(d.data()));
      NOTIFICATIONS.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      _updateNotifBadge();
      if (document.getElementById('modalNotif')?.classList.contains('active')) _renderNotifList();
    }, e => console.error('[FB] 알림 구독 실패:', e));
}

// ══════════════════════════════════════════
// FIREBASE — 캠페인 연동
// ══════════════════════════════════════════

// 캠페인 1건 Firestore에 저장 (등록/수정)
async function _fbSaveCampaign(c) {
  if (!window._db) return;
  try {
    await window._db.collection('campaigns').doc(c.id).set(c);
  } catch(e) {
    console.error('[FB] 캠페인 저장 실패:', e);
  }
}

// 캠페인 1건 Firestore에서 삭제
async function _fbDeleteCampaign(id) {
  if (!window._db) return;
  try {
    await window._db.collection('campaigns').doc(id).delete();
  } catch(e) {
    console.error('[FB] 캠페인 삭제 실패:', e);
  }
}

// 기존 DATA 전체를 Firestore에 업로드 (최초 1회)
// Firestore 실시간 구독 — 캠페인
function _fbWatchCampaigns() {
  if (!window._db) return;
  window._db.collection('campaigns').onSnapshot(snap => {
    DATA.length = 0;
    snap.forEach(d => DATA.push(d.data()));
    DATA.sort((a, b) => (b.regDate || '').localeCompare(a.regDate || ''));
    _nextCampaignNum = DATA.reduce((max, c) => {
      const m = c.id && c.id.match(/C-\d{4}-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1]) + 1) : max;
    }, 1);
    // 새로고침 시 캠페인 상세 복원 (최초 1회)
    if (window._pendingDetailId) {
      const idx = DATA.findIndex(c => c.id === window._pendingDetailId);
      window._pendingDetailId = null;
      if (idx !== -1) { openDetail(idx); return; }
    }
    // 현재 활성 화면 재렌더
    const sid = document.querySelector('.screen.active')?.id;
    if (sid === 'screen-dashboard') renderDashboard();
    if (sid === 'screen-campaigns') applyFilter();
    if (sid === 'screen-calendar')  renderCalendar();
    if (sid === 'screen-settlement') {
      _stlPopulateDynFilters();
      _stlSaveScroll();
      renderSettlement();
      _stlSetWrapHeight();
      _stlRestoreScroll();
    }
    if (sid === 'screen-monthly')   renderMonthly();
    if (sid === 'screen-adreport' && typeof _rptPopulateSeller === 'function') _rptPopulateSeller();
  }, e => console.error('[FB] 캠페인 구독 실패:', e));
}

// ── 매출처 Firebase CRUD ──
async function _fbSaveSeller(s) {
  if (!window._db) return;
  const key = s.company.replace(/\//g, '_');
  try { await window._db.collection('sellers').doc(key).set(s); }
  catch(e) { console.error('[FB] 매출처 저장 실패:', e); }
}
async function _fbDeleteSeller(company) {
  if (!window._db) return;
  const key = company.replace(/\//g, '_');
  try { await window._db.collection('sellers').doc(key).delete(); }
  catch(e) { console.error('[FB] 매출처 삭제 실패:', e); }
}
// Firestore 실시간 구독 — 매출처
function _fbWatchSellers() {
  if (!window._db) return;
  window._db.collection('sellers').onSnapshot(snap => {
    SELLER_DATA.length = 0;
    snap.forEach(d => SELLER_DATA.push(d.data()));
    _populateAdvFilter();
    if (typeof _rptPopulateSeller === 'function') _rptPopulateSeller();
    if (document.getElementById('screen-seller')?.classList.contains('active')) renderSellerList();
  }, e => console.error('[FB] 매출처 구독 실패:', e));
}

// ── 매체사 수정 이력 ──
const MEDIA_FIELD_LABELS = {
  company:'매체명', type:'유형', invoiceTo:'청구처', unit:'단가',
  contact:'담당자', tel:'연락처',
  c1Base:'수수료1 기준', c1Req:'수수료1 요청', c1Adj:'수수료1 조정', c1Reason:'수수료1 사유', note1:'메모1',
  c2Base:'수수료2 기준', c2Req:'수수료2 요청', c2Adj:'수수료2 조정', c2Reason:'수수료2 사유', note2:'메모2',
  excTarget:'예외 대상', excAdj:'예외 조정', createdAt:'등록일'
};
let _mediaLogs = []; // 로드된 이력 캐시

async function _fbSaveMediaLog(oldObj, newObj) {
  if (!window._db || !currentUser) return;
  const changes = [];
  Object.keys(MEDIA_FIELD_LABELS).forEach(k => {
    const before = String(oldObj[k] ?? '');
    const after  = String(newObj[k]  ?? '');
    if (before !== after) changes.push({ field: k, label: MEDIA_FIELD_LABELS[k], before, after });
  });
  if (!changes.length) return;
  const log = {
    company:   newObj.company,
    changedBy: currentUser.name,
    changedAt: new Date().toISOString(),
    changes
  };
  try { await window._db.collection('mediaLogs').add(log); }
  catch(e) { console.error('[FB] 매체사 이력 저장 실패:', e); }
}

let _mediaLogsCache = [];
async function openMediaLog() {
  openModal('modalMediaLog');
  document.getElementById('mediaLogBody').innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3);">불러오는 중...</div>';
  try {
    const snap = await window._db.collection('mediaLogs').orderBy('changedAt','desc').limit(300).get();
    _mediaLogsCache = snap.docs.map(d => d.data());
  } catch(e) {
    _mediaLogsCache = [];
    console.error('[FB] 매체사 이력 조회 실패:', e);
  }
  // 필터 옵션 구성
  const companies = [...new Set(_mediaLogsCache.map(l => l.company))].sort((a,b) => a.localeCompare(b,'ko'));
  const sel = document.getElementById('mediaLogFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체 매체사</option>' + companies.map(c => `<option value="${_escHtml(c)}">${_escHtml(c)}</option>`).join('');
  if (cur) sel.value = cur;
  renderMediaLog();
}

function renderMediaLog() {
  const filter = document.getElementById('mediaLogFilter')?.value || '';
  const logs = filter ? _mediaLogsCache.filter(l => l.company === filter) : _mediaLogsCache;
  const body = document.getElementById('mediaLogBody');
  if (!logs.length) {
    body.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text3);font-size:13px;">수정 이력이 없습니다.</div>';
    return;
  }
  body.innerHTML = logs.map(l => {
    const dt = l.changedAt ? new Date(l.changedAt).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
    const rows = (l.changes||[]).map(ch =>
      `<tr>
        <td style="padding:5px 12px;font-size:12px;color:var(--text2);white-space:nowrap;">${_escHtml(ch.label)}</td>
        <td style="padding:5px 12px;font-size:12px;color:var(--text3);max-width:200px;word-break:break-all;">${_escHtml(ch.before||'—')}</td>
        <td style="padding:5px 12px;font-size:14px;color:var(--text3);">→</td>
        <td style="padding:5px 12px;font-size:12px;color:var(--text);font-weight:600;max-width:200px;word-break:break-all;">${_escHtml(ch.after||'—')}</td>
      </tr>`
    ).join('');
    return `<div style="border-bottom:1px solid var(--border);padding:12px 20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:700;color:var(--text);">${_escHtml(l.company)}</span>
        <span style="font-size:12px;color:var(--accent);font-weight:600;">${_escHtml(l.changedBy)}</span>
        <span style="font-size:11.5px;color:var(--text3);">${dt}</span>
        <span style="font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1px 8px;color:var(--text2);">${(l.changes||[]).length}개 항목 변경</span>
      </div>
      <table style="border-collapse:collapse;width:100%;background:var(--surface2);border-radius:6px;overflow:hidden;">
        <thead><tr style="background:var(--border);">
          <th style="padding:5px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:700;">항목</th>
          <th style="padding:5px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:700;">변경 전</th>
          <th style="padding:5px 12px;"></th>
          <th style="padding:5px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:700;">변경 후</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');
}

// ── 매체사 Firebase CRUD ──
async function _fbSaveMedia(m) {
  if (!window._db) return;
  const key = m.company.replace(/\//g, '_');
  try { await window._db.collection('media').doc(key).set(m); }
  catch(e) { console.error('[FB] 매체사 저장 실패:', e); }
}
async function _fbDeleteMedia(company) {
  if (!window._db) return;
  const key = company.replace(/\//g, '_');
  try { await window._db.collection('media').doc(key).delete(); }
  catch(e) { console.error('[FB] 매체사 삭제 실패:', e); }
}
function _populateMediaSelects() {
  const opts = MEDIA_DATA.map(m => `<option value="${m.company}">${m.company}</option>`).join('');
  ['fMedia', 'calFilterMedia', 'stl-fMedia'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">매체사</option>' + opts;
    if (cur) el.value = cur;
  });
}

function _populateSalesSelects() {
  const RANK_ORDER = ['이사','본부장','팀장','일반'];
  const salesUsers = USERS
    .filter(u => !u.isAdmin && u.id !== 'user')
    .sort((a, b) => {
      const ri = u => { const i = RANK_ORDER.indexOf(u.rank||'일반'); return i<0?99:i; };
      return ri(a) - ri(b) || (a.name||'').localeCompare(b.name||'', 'ko');
    });
  const nameOpts = salesUsers.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
  // 담당 선택 (폼용, 빈 옵션 없음)
  ['r_ops','e_ops'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = nameOpts;
    if (cur) el.value = cur;
  });
  // 세금계산서 수동등록 담당자 (빈 옵션 포함)
  const taxMgr = document.getElementById('tax-r-manager');
  if (taxMgr) {
    const cur = taxMgr.value;
    taxMgr.innerHTML = '<option value="">담당자 선택</option>' + nameOpts;
    if (cur) taxMgr.value = cur;
  }
  // 필터용 (빈 옵션 포함)
  const fMgr = document.getElementById('fMgr');
  if (fMgr) {
    const cur = fMgr.value;
    fMgr.innerHTML = '<option value="">담당자</option>' + nameOpts;
    if (cur) fMgr.value = cur;
  }
}

// Firestore 실시간 구독 — 매체사
function _fbWatchMedia() {
  if (!window._db) return;
  window._db.collection('media').onSnapshot(snap => {
    MEDIA_DATA.length = 0;
    snap.forEach(d => MEDIA_DATA.push(d.data()));
    _populateMediaSelects();
    if (document.getElementById('screen-media')?.classList.contains('active')) renderMediaList();
    if (document.getElementById('screen-settlement')?.classList.contains('active')) renderSettlement();
  }, e => console.error('[FB] 매체사 구독 실패:', e));
}

// ── 파이프라인 Firebase CRUD ──
async function _fbSavePipeline(p) {
  if (!window._db) return;
  try {
    await window._db.collection('pipeline').doc(p.id).set(p);
  } catch(e) { console.error('[FB] 파이프라인 저장 실패:', e); }
}
async function _fbDeletePipeline(id) {
  if (!window._db) return;
  try {
    await window._db.collection('pipeline').doc(id).delete();
  } catch(e) { console.error('[FB] 파이프라인 삭제 실패:', e); }
}
// Firestore 실시간 구독 — 파이프라인
function _fbWatchPipeline() {
  if (!window._db) return;
  window._db.collection('pipeline').onSnapshot(snap => {
    PIPELINE_DATA.length = 0;
    snap.forEach(d => PIPELINE_DATA.push(d.data()));
    PIPELINE_DATA.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    _pipelineNextNum = PIPELINE_DATA.reduce((max, p) => {
      const m = p.id && p.id.match(/P-\d{4}-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1]) + 1) : max;
    }, 1);
    const sid = document.querySelector('.screen.active')?.id;
    if (sid === 'screen-pipeline') renderPipeline();
    if (sid === 'screen-dashboard') renderDashboard();
  }, e => console.error('[FB] 파이프라인 구독 실패:', e));
}


async function _fbSavePipelineTargets() {
  if (!window._db) return;
  try {
    await window._db.collection('settings').doc('pipeline_targets').set(PIPELINE_BUDGET_DATA);
  } catch(e) { console.error('[FB] 목표 저장 실패:', e); }
}
function _fbLoadPipelineTargets() {
  if (!window._db) return;
  window._db.collection('settings').doc('pipeline_targets').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    if (data && data.depts) Object.assign(PIPELINE_BUDGET_DATA, data);
    // 현재 통계 탭이 열려 있으면 즉시 재렌더
    const active = document.querySelector('#pipe-tabs .view-tab.active');
    if (active && active.id === 'pipe-vt-stats') renderPipelineStats();
  }, e => console.error('[FB] 목표 구독 실패:', e));
}

// ── 사용자 Firebase CRUD ──
async function _fbSaveUser(u) {
  if (!window._db) return;
  try {
    await window._db.collection('users').doc(u.id).set(u);
  } catch(e) { console.error('[FB] 사용자 저장 실패:', e); }
}
// Firestore 실시간 구독 — 사용자
function _fbWatchUsers() {
  if (!window._db) return;
  window._db.collection('users').onSnapshot(snap => {
    USERS.length = 0;
    snap.forEach(d => {
      const u = d.data();
      if (!u.rank) u.rank = '일반';
      if (!u.perms) u.perms = {};
      if (u.perms.ops !== true) { u.perms.ops = true; _fbSaveUser(u); }
      USERS.push(u);
    });
    // 로그인된 경우 currentUser 최신 데이터로 갱신
    if (currentUser) { const fresh = USERS.find(u => u.id === currentUser.id); if (fresh) { currentUser = fresh; localStorage.setItem('cu', JSON.stringify(fresh)); } }
    _populateSalesSelects();
    if (document.getElementById('screen-users')?.classList.contains('active')) _renderUserMgmtList();
  }, e => console.error('[FB] 사용자 구독 실패:', e));
}

// ── 세금계산서 Firebase CRUD ──
async function _fbSaveTax(t) {
  if (!window._db) return;
  try { await window._db.collection('taxInvoices').doc(String(t.id)).set(t); }
  catch(e) { console.error('[FB] 세금계산서 저장 실패:', e); }
}
async function _fbDeleteTax(id) {
  if (!window._db) return;
  try { await window._db.collection('taxInvoices').doc(String(id)).delete(); }
  catch(e) { console.error('[FB] 세금계산서 삭제 실패:', e); }
}
function _fbWatchTax() {
  if (!window._db) return;
  window._db.collection('taxInvoices').onSnapshot(snap => {
    TAX_DATA.length = 0;
    snap.forEach(d => TAX_DATA.push(d.data()));
    TAX_DATA.sort((a, b) => (b.id||0) - (a.id||0));
    if (document.getElementById('screen-tax')?.classList.contains('active')) renderTaxList();
  }, e => console.error('[FB] 세금계산서 구독 실패:', e));
}

// 상품 드롭다운 초기화
_populateProductSelects();

// 페이지 로드 시 Firestore 실시간 구독 시작
_fbWatchCampaigns();
_fbWatchPipeline();
_fbLoadPipelineTargets();
_fbWatchSellers();
_fbWatchMedia();
_fbWatchUsers();
_fbWatchTax();
if (currentUser) _fbWatchNotifications();

// 최원준 계정 최초 1회 자동 등록
(async function() {
  if (!window._db) return;
  try {
    const doc = await window._db.collection('users').doc('wonjoon').get();
    if (!doc.exists) {
      await window._db.collection('users').doc('wonjoon').set({
        id:'wonjoon', pw:'1234', name:'최원준', bonbu:'', dept:'',
        rank:'대표이사', isAdmin:false, perms:{ops:true}
      });
    }
  } catch(e) {}
})();

// ══════════════════════════════════════════
// 효율 분석 (Efficiency Analysis)
// ══════════════════════════════════════════

function adrSwitchTab(tab) {
  const tabs = ['rpt','eff'];
  tabs.forEach(t => {
    const btn = document.getElementById('adr-tab-'+t);
    const pane = document.getElementById('adr-pane-'+t);
    const isActive = t === tab;
    if (btn) {
      btn.style.color = isActive ? '#185FA5' : 'var(--text3)';
      btn.style.fontWeight = isActive ? '700' : '600';
      btn.style.borderBottom = isActive ? '2px solid #185FA5' : '2px solid transparent';
    }
    if (pane) pane.style.display = isActive ? '' : 'none';
  });
  if (tab === 'eff') {
    _effPopulateFilters();
    effRender();
  }
}

function _effPopulateFilters() {
  // 브랜드
  const brands = [...new Set(DATA.map(c => c.content).filter(Boolean))].sort();
  const bSel = document.getElementById('eff-brand');
  if (bSel) {
    const cur = bSel.value;
    bSel.innerHTML = '<option value="">전체 브랜드</option>' +
      brands.map(b => `<option value="${b}">${b}</option>`).join('');
    bSel.value = cur;
  }
  // 매체사
  const medias = [...new Set(DATA.map(c => c.media).filter(Boolean))].sort();
  const mSel = document.getElementById('eff-media');
  if (mSel) {
    const cur = mSel.value;
    mSel.innerHTML = '<option value="">전체 매체사</option>' +
      medias.map(m => `<option value="${m}">${m}</option>`).join('');
    mSel.value = cur;
  }
  // 상품
  const prods = [...new Set(DATA.map(c => c.product).filter(Boolean))].sort();
  const pSel = document.getElementById('eff-prod');
  if (pSel) {
    const cur = pSel.value;
    pSel.innerHTML = '<option value="">전체 상품</option>' +
      prods.map(p => `<option value="${p}">${p}</option>`).join('');
    pSel.value = cur;
  }
}

function rptReset() {
  ['rpt-seller','rpt-brand','rpt-from','rpt-to','rpt-campaign'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; if (el.tagName === 'SELECT') el.disabled = (id === 'rpt-brand' || id === 'rpt-campaign'); }
  });
  const rptResult = document.getElementById('rpt-result');
  if (rptResult) rptResult.innerHTML = '';
}

function effReset() {
  ['eff-brand','eff-media','eff-prod'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const mo = document.getElementById('eff-months');
  if (mo) mo.value = '12';
  effRender();
}

function effRender() {
  const brandF = document.getElementById('eff-brand')?.value || '';
  const mediaF = document.getElementById('eff-media')?.value || '';
  const prodF  = document.getElementById('eff-prod')?.value  || '';
  const months = parseInt(document.getElementById('eff-months')?.value || '12');

  // 조회 월 목록 생성 (최근 N개월, 최신→과거 역순)
  const now = new Date();
  const monthKeys = []; // 'YYYY-MM'
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.unshift(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }

  // 필터링
  const base = DATA.filter(c => {
    if (brandF && c.content !== brandF) return false;
    if (mediaF && c.media   !== mediaF) return false;
    if (prodF  && c.product !== prodF)  return false;
    const mo = (c.date||'').slice(0,7);
    return monthKeys.includes(mo);
  });

  if (!base.length) {
    document.getElementById('eff-body').innerHTML =
      '<div style="padding:40px;text-align:center;color:var(--text3);">해당 조건의 데이터가 없습니다.</div>';
    return;
  }

  // 브랜드×매체사 그룹핑
  const groupMap = {}; // key: 'brand||media'
  base.forEach(c => {
    const brand = c.content || '(미지정)';
    const media = c.media   || '(미지정)';
    const key = brand + '||' + media;
    if (!groupMap[key]) groupMap[key] = { brand, media, months: {} };
    const mo = (c.date||'').slice(0,7);
    if (!groupMap[key].months[mo]) {
      groupMap[key].months[mo] = { actual:0, clicks:0, db:0, adc:0, prf:0, count:0 };
    }
    const m = groupMap[key].months[mo];
    m.count++;
    m.actual += c.actual || 0;
    m.clicks += c.clicks || 0;
    m.db     += c.db     || 0;
    // 광고비
    const adc = _stlAmt(c).adc || 0;
    m.adc += adc;
    m.prf += _stlAmt(c).prf || 0;
  });

  // 브랜드별로 묶어서 렌더
  const byBrand = {};
  Object.values(groupMap).forEach(g => {
    if (!byBrand[g.brand]) byBrand[g.brand] = [];
    byBrand[g.brand].push(g);
  });

  const fmtNum = n => n ? n.toLocaleString() : '—';
  const fmtCtr = (clicks, actual) => actual > 0 ? (clicks/actual*100).toFixed(2)+'%' : '—';
  const fmtAdc = n => n >= 10000 ? (n/10000).toFixed(0)+'만' : (n ? n.toLocaleString() : '—');

  // 변화 방향 아이콘
  const trend = (vals) => {
    const nonNull = vals.filter(v => v !== null);
    if (nonNull.length < 2) return '';
    const last = nonNull[nonNull.length-1], prev = nonNull[nonNull.length-2];
    if (last > prev) return '<span style="color:#2f9e44;font-weight:700;">▲</span>';
    if (last < prev) return '<span style="color:#c92a2a;font-weight:700;">▼</span>';
    return '<span style="color:var(--text3);">━</span>';
  };

  const thStyle = 'padding:7px 10px;text-align:center;font-size:11px;font-weight:600;color:var(--text3);background:var(--bg);border-bottom:1px solid var(--border);white-space:nowrap;';
  const tdStyle = 'padding:6px 10px;text-align:right;font-size:12px;border-bottom:1px solid var(--border);white-space:nowrap;';
  const tdLStyle = 'padding:6px 10px;text-align:left;font-size:12px;border-bottom:1px solid var(--border);white-space:nowrap;font-weight:600;';

  let html = '';
  Object.keys(byBrand).sort().forEach(brand => {
    const rows = byBrand[brand].sort((a,b) => a.media.localeCompare(b.media));

    // 브랜드 헤더
    html += `<div style="margin-bottom:20px;">
      <div style="font-size:14px;font-weight:700;color:var(--text1);padding:8px 4px;border-left:3px solid #185FA5;padding-left:10px;margin-bottom:6px;">${brand}</div>
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;border:1px solid var(--border);border-radius:8px;overflow:hidden;font-size:12px;">
        <thead><tr>
          <th style="${thStyle}text-align:left;">매체사</th>`;

    monthKeys.forEach(mk => {
      const [y,m] = mk.split('-');
      html += `<th colspan="4" style="${thStyle}border-left:1px solid var(--border);">${parseInt(m)}월${y !== String(now.getFullYear()) ? ' ('+y+')' : ''}</th>`;
    });
    html += '<th style="'+thStyle+'border-left:1px solid var(--border);">추이</th></tr>';

    // 서브헤더
    html += '<tr><th style="'+thStyle+'text-align:left;">　</th>';
    monthKeys.forEach(() => {
      html += `<th style="${thStyle}font-weight:500;">광고비</th>
               <th style="${thStyle}font-weight:500;">실발송</th>
               <th style="${thStyle}font-weight:500;">CTR</th>
               <th style="${thStyle}font-weight:500;">DB</th>`;
    });
    html += '<th style="'+thStyle+'"></th></tr></thead><tbody>';

    rows.forEach(g => {
      const ctrVals = monthKeys.map(mk => {
        const m = g.months[mk];
        return m && m.actual > 0 ? m.clicks/m.actual*100 : null;
      });
      html += `<tr><td style="${tdLStyle}">${g.media}</td>`;
      monthKeys.forEach(mk => {
        const m = g.months[mk];
        if (!m) {
          html += `<td style="${tdStyle}color:var(--text3);">—</td><td style="${tdStyle}color:var(--text3);">—</td><td style="${tdStyle}color:var(--text3);">—</td><td style="${tdStyle}color:var(--text3);">—</td>`;
        } else {
          const ctr = m.actual > 0 ? (m.clicks/m.actual*100).toFixed(2)+'%' : '—';
          html += `<td style="${tdStyle}">${fmtAdc(m.adc)}</td>
                   <td style="${tdStyle}">${fmtNum(m.actual)}</td>
                   <td style="${tdStyle}">${ctr}</td>
                   <td style="${tdStyle}">${fmtNum(m.db)}</td>`;
        }
      });
      html += `<td style="${tdStyle}text-align:center;">${trend(ctrVals)}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
  });

  document.getElementById('eff-body').innerHTML = html;
}

// ══════════════════════════════════════════
// DATE RANGE PICKER (drp)
// ══════════════════════════════════════════
(function() {
  const DRP = {
    start: null, end: null,
    hover: null,
    picking: 'from',
    viewYear: 0, viewMonth: 0,
    activePreset: null,
  };

  function _ymd(d) {
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function _parse(s) {
    if (!s) return null;
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function _fmt(d) {
    if (!d) return '—';
    return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')+'.';
  }
  function _sod(d) { const r=new Date(d); r.setHours(0,0,0,0); return r; }
  function _addDays(d, n) { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
  function _startOfWeek(d) { const r=new Date(d); r.setDate(r.getDate()-r.getDay()); return _sod(r); }
  function _endOfWeek(d)   { return _addDays(_startOfWeek(d), 6); }
  function _startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function _endOfMonth(d)  { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
  function _startOfQuarter(d){ const q=Math.floor(d.getMonth()/3); return new Date(d.getFullYear(), q*3, 1); }
  function _endOfQuarter(d)  { const q=Math.floor(d.getMonth()/3); return new Date(d.getFullYear(), q*3+3, 0); }

  function _presetRange(key) {
    const today = _sod(new Date());
    switch(key) {
      case 'thisweek':    return { s:_startOfWeek(today), e:_endOfWeek(today) };
      case 'lastweek':    { const sm=_addDays(_startOfWeek(today),-7); return { s:sm, e:_addDays(sm,6) }; }
      case 'last7':       return { s:_addDays(today,-7), e:_addDays(today,-1) };
      case 'thismonth':   return { s:_startOfMonth(today), e:_endOfMonth(today) };
      case 'lastmonth':   { const lm=new Date(today.getFullYear(), today.getMonth()-1, 1); return { s:lm, e:_endOfMonth(lm) }; }
      case 'nextmonth':   { const nm=new Date(today.getFullYear(), today.getMonth()+1, 1); return { s:nm, e:_endOfMonth(nm) }; }
      case 'last30':      return { s:_addDays(today,-30), e:_addDays(today,-1) };
      case 'thisquarter': return { s:_startOfQuarter(today), e:_endOfQuarter(today) };
      case 'lastquarter': { const lqs=new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3-3, 1); return { s:lqs, e:_endOfQuarter(lqs) }; }
      case 'nextquarter': { const nqs=new Date(today.getFullYear(), Math.floor(today.getMonth()/3)*3+3, 1); return { s:nqs, e:_endOfQuarter(nqs) }; }
    }
    return null;
  }

  function _updateChips() {
    const cf = document.getElementById('drp-chip-from');
    const ct = document.getElementById('drp-chip-to');
    if (cf) { cf.textContent = _fmt(DRP.start); cf.classList.toggle('active', DRP.picking==='from'); }
    if (ct) { ct.textContent = _fmt(DRP.end);   ct.classList.toggle('active', DRP.picking==='to'); }
    const lbl = document.getElementById('drp-label');
    if (lbl) {
      if (DRP.start && DRP.end) lbl.textContent = _fmt(DRP.start)+' ~ '+_fmt(DRP.end);
      else if (DRP.start) lbl.textContent = _fmt(DRP.start)+' ~ —';
      else lbl.textContent = '기간 선택';
    }
  }

  function _renderCals() {
    const ly = DRP.viewYear, lm = DRP.viewMonth;
    const ry = lm === 11 ? ly+1 : ly;
    const rm = lm === 11 ? 0 : lm+1;
    document.getElementById('drp-cal-title-l').textContent = ly+'년 '+(lm+1)+'월';
    document.getElementById('drp-cal-title-r').textContent = ry+'년 '+(rm+1)+'월';
    document.getElementById('drp-cal-l').innerHTML = _buildCal(ly, lm);
    document.getElementById('drp-cal-r').innerHTML = _buildCal(ry, rm);
  }

  // 이벤트 위임: popup 컨테이너 하나에 한 번만 등록, 재렌더 후에도 유지됨
  (function() {
    const popup = document.getElementById('drp-popup');
    if (!popup) return;
    popup.addEventListener('mouseover', function(e) {
      const day = e.target.closest('.drp-day:not(.empty)');
      if (!day || !DRP.start || DRP.end) return;
      const ds = day.dataset.date;
      if (DRP.hover && _ymd(DRP.hover) === ds) return; // 같은 날 중복 렌더 방지
      DRP.hover = _parse(ds);
      _renderCals();
    });
    popup.addEventListener('mouseleave', function() {
      if (DRP.start && !DRP.end && DRP.hover) {
        DRP.hover = null;
        _renderCals();
      }
    });
  })();

  function _buildCal(y, m) {
    const today = _sod(new Date());
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const S = DRP.start ? _sod(DRP.start) : null;
    const hov = (DRP.hover && DRP.start && !DRP.end) ? _sod(DRP.hover) : null;
    const E = DRP.end ? _sod(DRP.end) : hov;
    const rangeS = S && E ? (S <= E ? S : E) : S;
    const rangeE = S && E ? (S <= E ? E : S) : null;

    let html = '<div class="drp-cal-grid">';
    ['일','월','화','수','목','금','토'].forEach(function(day) { html += '<div class="drp-dow">'+day+'</div>'; });
    for (let i=0; i<firstDay; i++) html += '<div class="drp-day empty"></div>';
    for (let d=1; d<=daysInMonth; d++) {
      const dt = _sod(new Date(y, m, d));
      const ds = _ymd(dt);
      let cls = 'drp-day';
      if (dt.getTime() === today.getTime()) cls += ' today';
      const isStart = S && dt.getTime() === S.getTime();
      const isEnd   = rangeE && dt.getTime() === rangeE.getTime();
      const inRange = rangeS && rangeE && dt > rangeS && dt < rangeE;
      if (isStart) cls += ' start';
      if (isEnd)   cls += ' end';
      if (inRange || (isStart && rangeE) || (isEnd && rangeS)) cls += ' in-range';
      html += '<div class="'+cls+'" data-date="'+ds+'" onclick="drpDayClick(\''+ds+'\')">'+d+'</div>';
    }
    html += '</div>';
    return html;
  }

  window.drpOpen = function() {
    const popup = document.getElementById('drp-popup');
    const trigger = document.getElementById('drp-trigger');
    if (!popup || !trigger) return;
    const fv = document.getElementById('fFrom') ? document.getElementById('fFrom').value : '';
    const tv = document.getElementById('fTo')   ? document.getElementById('fTo').value   : '';
    DRP.start = fv ? _parse(fv) : null;
    DRP.end   = tv ? _parse(tv) : null;
    DRP.hover = null;
    DRP.picking = 'from';
    DRP.activePreset = null;
    const base = DRP.start || new Date();
    DRP.viewYear  = base.getFullYear();
    DRP.viewMonth = base.getMonth();
    const rect = trigger.getBoundingClientRect();
    const backdrop = document.getElementById('drp-backdrop');
    if (backdrop) backdrop.style.display = 'block';
    popup.style.display = 'block';
    popup.style.top  = (rect.bottom + window.scrollY + 6)+'px';
    popup.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 690)+'px';
    _updateChips();
    _renderCals();
    document.querySelectorAll('.drp-preset').forEach(function(b){ b.classList.remove('active'); });
  };

  window.drpClose = function() {
    const popup = document.getElementById('drp-popup');
    if (popup) popup.style.display = 'none';
    const backdrop = document.getElementById('drp-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  };
  window.drpCancel = window.drpClose;

  window.drpConfirm = function() {
    const s = DRP.start ? _ymd(DRP.start) : '';
    const e = DRP.end   ? _ymd(DRP.end)   : s;
    const fFrom = document.getElementById('fFrom');
    const fTo   = document.getElementById('fTo');
    if (fFrom) fFrom.value = s;
    if (fTo)   fTo.value   = e;
    _updateChips();
    drpClose();
    if (typeof applyFilter === 'function') applyFilter();
  };

  window.drpChipClick = function(which) {
    DRP.picking = which;
    _updateChips();
  };

  window.drpDayClick = function(ds) {
    const dt = _parse(ds);
    if (!DRP.start || DRP.end) {
      DRP.start = dt; DRP.end = null; DRP.hover = null; DRP.picking = 'to';
    } else {
      if (dt < DRP.start) { DRP.end = DRP.start; DRP.start = dt; }
      else DRP.end = dt;
      DRP.picking = 'from';
    }
    DRP.activePreset = null;
    document.querySelectorAll('.drp-preset').forEach(function(b){ b.classList.remove('active'); });
    _updateChips();
    _renderCals();
  };

  window.drpPrevMonth = function() {
    if (DRP.viewMonth === 0) { DRP.viewYear--; DRP.viewMonth = 11; }
    else DRP.viewMonth--;
    _renderCals();
  };
  window.drpNextMonth = function() {
    if (DRP.viewMonth === 11) { DRP.viewYear++; DRP.viewMonth = 0; }
    else DRP.viewMonth++;
    _renderCals();
  };

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.drp-preset');
    if (!btn) return;
    const key = btn.dataset.preset;
    const r = _presetRange(key);
    if (!r) return;
    DRP.start = r.s; DRP.end = r.e; DRP.hover = null; DRP.picking = 'from';
    DRP.activePreset = key;
    DRP.viewYear  = r.s.getFullYear();
    DRP.viewMonth = r.s.getMonth();
    document.querySelectorAll('.drp-preset').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    _updateChips();
    _renderCals();
  });
})();
