// ══════════════════════════════════════════════════════════
// 프로젝트로그 (projectlog.js)
//
// 목적: 광고주·프로젝트(브랜드)·캠페인·매체·내부업무에 대한 정성 기록 축적
//       기존 '캠페인 수정 이력(history)'은 시스템 자동 기록,
//       프로젝트로그는 사람이 판단해서 쓰는 맥락 기록
//
// 참조: script.js 전역 변수·함수 사용
//       DATA, SELLER_DATA, MEDIA_DATA, USERS, currentUser,
//       _campAdcost, _cName, _escHtml, toast, openModal, closeModal
//
// 제약: 기존 컬렉션 쓰기 금지 (PL_WRITABLE 참조)
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// 안전 가드 — 쓰기 가능 컬렉션 화이트리스트
// 이 파일의 모든 Firestore 접근은 _plDb() 를 거친다.
// 기존 컬렉션 접근 시 데이터 변경 대신 에러가 발생한다.
// ══════════════════════════════════════════════════════════
const PL_WRITABLE = ['projectLogs', 'projectLogHistory', 'projectLogDeleted', 'projectLogImages',
                      'projectLogComments', 'projectGoals'];

function _plDb(name) {
  if (!PL_WRITABLE.includes(name)) {
    throw new Error(`🔴 projectlog.js는 '${name}' 컬렉션에 접근할 수 없습니다`);
  }
  if (!window._db) throw new Error('Firestore 미초기화');
  return window._db.collection(name);
}

// ══════════════════════════════════════════════════════════
// 상수
// ══════════════════════════════════════════════════════════

const PL_LOG_TYPES = ['운영', '요청', '제안', '이슈', '대응', '결과', '피드백', '회고', '자료', '시스템제약'];

const PL_TYPE_COLOR = {
  운영:   { bg: '#eceef0', fg: '#495057' },
  요청:   { bg: '#e3fafc', fg: '#0b7285' },
  제안:   { bg: '#e7f5ff', fg: '#1864ab' },
  이슈:   { bg: '#fff5f5', fg: '#c92a2a' },
  대응:   { bg: '#fff4e6', fg: '#d9480f' },
  결과:   { bg: '#ebfbee', fg: '#2b8a3e' },
  피드백: { bg: '#f8f0fc', fg: '#9c36b5' },
  회고:   { bg: '#f3f0ff', fg: '#5f3dc4' },
  자료:   { bg: '#e6fcf5', fg: '#0ca678' },
  시스템제약: { bg: '#fff9db', fg: '#997404' },
};

const PL_SUMMARY_PH = {
  운영:   '예) 8월 소재 2종 전달, 방학 선물 문구 확정',
  요청:   '예) 국민카드 준회원 타겟 조회 가능 범위 문의',
  제안:   '예) 8월 문자 10만건 부킹 제안 — 단가 50만원 기준',
  이슈:   '예) 0709 캠페인 모수 부족 → 조건 확장 필요',
  대응:   '예) 발송시간 14시→11시 변경 협의 완료',
  결과:   '예) 발송 49,800 / CTR 1.8%',
  피드백: '예) CTR 개선은 인정, 발송량 미달 보완 요청',
  회고:   '예) 부킹 전 모수 확인 누락 → D-14 사전조회 원칙',
  자료:   '예) 공용드라이브 : 업무폴더 D:\\단비교육',
  시스템제약: '예) KT는 동일 광고주 주 1회 발송만 허용',
};

const PL_LABEL_PRESET = {
  운영:   { auto: [], opts: ['내용', '참고'] },
  요청:   { auto: [], opts: ['요청 주체', '요청 내용', '기한', '회신', '참고'] },
  제안:   { auto: [], opts: ['기획의도', '제안 내용', '예상성과', '단가 조건'] },
  이슈:   { auto: ['상황', '원인', '영향'],
            opts: ['상황', '원인', '영향', '확장 조건', '제외 조건', '매체 회신', '참고'] },
  대응:   { auto: [], opts: ['조치', '의사결정', '결정 주체', '협의 내용', '변경 사항', '매체 회신'] },
  결과:   { auto: [], opts: ['지표', '결과 분석', '특이사항', '비교(전월)'] },
  피드백: { auto: [], opts: ['피드백 내용', '후속 조치', '참고'] },
  회고:   { auto: ['잘된 점', '문제점', '다음에는'], opts: ['잘된 점', '문제점', '다음에는'] },
  자료:   { auto: [], opts: ['자료 위치', '참고'] },
  시스템제약: { auto: [], opts: ['상세 조건', '예외', '참고'] },
};

const PL_DRAFT_KEY = 'pl_draft_' + (currentUser?.id || 'anon');

// ══════════════════════════════════════════════════════════
// 상태
// ══════════════════════════════════════════════════════════

// PL_LOGS는 여러 구독(최근 N개월 기본 + 필요할 때 여는 광고주/매체/전체 구독)의 결과를 합친 파생 배열이다.
// 원본은 _plLogsMap(id→doc)에 쌓이고, 구독이 새로 들어올 때마다 PL_LOGS를 다시 정렬해서 만든다.
let PL_LOGS = [];
let _plLogsMap = new Map();
let PL_STATE = {
  tab: 'date',                // 'date' | 'log' | 'advertiser' | 'campaign' | 'media' | 'internal' | 'mine'
  advDetailCompany: null,    // 광고주 탭에서 상세 화면으로 드릴다운했을 때만 값 존재
  mediaDetailCompany: null,  // 매체 탭에서 상세 화면으로 드릴다운했을 때만 값 존재
  internalDetailClient: null, // 내부업무 탭에서 상세 화면으로 드릴다운했을 때만 값 존재
};
let _plWatchStarted = false;
let _plExpanded = new Set();
let _plPage = 1;
const PL_PAGE_SIZE = 30;

// toISOString()은 UTC로 변환한 뒤 자르기 때문에 한국(UTC+9)에서는 자정~오전9시 사이거나
// 날짜 연산(하루 이동 등) 뒤에 호출하면 로컬 날짜가 하루 밀리거나 당겨질 수 있다.
// 날짜 "문자열"이 필요한 곳은 전부 이 로컬 기준 포맷터를 쓴다 (타임스탬프 용도의 순수 toISOString()은 그대로 둠).
function _plFmtDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function _plFmtHHMM(iso) {
  const t = new Date(iso);
  return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
}
// createdAt/changedAt은 toISOString()(UTC)로 저장되므로, 표시 시 new Date()로 로컬(한국)시간 변환 필수.
// 문자열을 그대로 잘라 쓰면 UTC가 그대로 노출돼 실제보다 9시간 느리게 보인다.
function _plFmtDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = String(d.getFullYear()).slice(2);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${mo}.${day} ${hh}:${mi}`;
}
function _plTodayStr() { return _plFmtDateLocal(new Date()); }

// ── 클릭 고정 말풍선 (script.js의 tax-memo-bubble과 같은 패턴 — projectlog 전용으로 독립 구현) ──
// 호버로 미리보기, 클릭하면 고정(sticky)돼서 안 사라지고, 바깥(.pl-bubble-cell 밖)을 클릭하면 닫힘
function _plBubbleEl() {
  let b = document.getElementById('pl-bubble');
  if (!b) {
    b = document.createElement('div');
    b.id = 'pl-bubble';
    b.style.cssText = 'display:none;position:fixed;z-index:9999;max-width:300px;padding:8px 12px;background:#333;color:#fff;font-size:12px;border-radius:6px;line-height:1.5;word-break:break-all;box-shadow:0 4px 16px rgba(0,0,0,.3);';
    document.body.appendChild(b);
  }
  return b;
}
function _plBubblePos(el, b, dx, dy) {
  const r = el.getBoundingClientRect();
  const bw = 300;
  let top = r.bottom + 6 + (dy || 0);
  let left = r.left + (dx || 0);
  if (left + bw > window.innerWidth - 8) left = window.innerWidth - bw - 8;
  if (left < 8) left = 8;
  if (top < 8) top = 8;
  b.style.top = top + 'px';
  b.style.left = left + 'px';
}
function plShowBubble(el, text, dx, dy) {
  if (!text) return;
  const b = _plBubbleEl();
  if (b.dataset.sticky === '1') return;
  b.dataset.sticky = '0';
  b.style.pointerEvents = 'none';
  b.textContent = text;
  b.style.display = 'block';
  _plBubblePos(el, b, dx, dy);
}
function plShowBubbleSticky(el, text, dx, dy) {
  if (!text) return;
  const b = _plBubbleEl();
  b.dataset.sticky = '1';
  b.style.pointerEvents = 'auto';
  b.innerHTML = `<span onclick="event.stopPropagation();plHideBubble()" style="position:absolute;top:5px;right:8px;cursor:pointer;font-size:14px;color:#bbb;line-height:1;padding:2px;">✕</span><span style="display:block;padding-right:20px;">${_escHtml(text)}</span>`;
  b.style.display = 'block';
  _plBubblePos(el, b, dx, dy);
}
function plHideBubble() {
  const b = document.getElementById('pl-bubble');
  if (!b) return;
  b.style.display = 'none';
  b.dataset.sticky = '0';
  b.innerHTML = '';
}
document.addEventListener('click', e => {
  const b = document.getElementById('pl-bubble');
  if (!b || b.dataset.sticky !== '1') return;
  if (!e.target.closest('.pl-bubble-cell')) plHideBubble();
});

// ══════════════════════════════════════════════════════════
// 데이터 구독
// ══════════════════════════════════════════════════════════

// 일지가 계속 쌓이면 컬렉션 전체를 매번 구독하는 게 부담스러워져서(초기로딩 느려짐·Firestore 읽기비용 증가),
// 기본은 최근 몇 개월만 실시간 구독하고, 광고주상세/매체상세처럼 "그 대상의 전체 이력"이 꼭 필요한 화면에
// 들어갈 때만 그 범위를 추가로 구독한다. 자유 텍스트 검색은 범위를 특정할 수 없어서 그때는 전체를 연다.
const PL_RECENT_MONTHS = 2;
function _plRecentCutoff() {
  const d = new Date();
  d.setMonth(d.getMonth() - PL_RECENT_MONTHS);
  return d.toISOString().slice(0, 10);
}
function _plApplySnapshot(snap) {
  snap.docChanges().forEach(ch => {
    if (ch.type === 'removed') _plLogsMap.delete(ch.doc.id);
    else _plLogsMap.set(ch.doc.id, ch.doc.data());
  });
  PL_LOGS = [..._plLogsMap.values()].sort((a, b) => (b.logDate || '').localeCompare(a.logDate || '')
                                                  || (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (document.getElementById('screen-projectlog')?.classList.contains('active')) {
    if (typeof plRenderActiveTab === 'function') plRenderActiveTab();
  }
}
function _plWatchLogs() {
  if (_plWatchStarted || !window._db) return;
  _plWatchStarted = true;
  try {
    _plDb('projectLogs').where('logDate', '>=', _plRecentCutoff())
      .onSnapshot(_plApplySnapshot, err => console.error('[projectlog] 구독 오류', err));
  } catch (e) {
    console.error('[projectlog] 구독 실패', e);
  }
}
let _plWatchedCompanies = new Set();
let _plWatchedMedia = new Set();
let _plFullyWatching = false;
// 광고주상세(G화면)는 ①연간요약 등에서 그 광고주의 전체 이력이 있어야 정확히 계산되므로, 진입 시 그 범위를
// 통째로 별도 구독한다(이미 전체를 보고 있으면 또 열 필요 없음). 한 번 연 구독은 세션 동안 유지.
function _plEnsureCompanyLoaded(company) {
  if (!company || _plFullyWatching || _plWatchedCompanies.has(company) || !window._db) return;
  _plWatchedCompanies.add(company);
  _plDb('projectLogs').where('seller', '==', company)
    .onSnapshot(_plApplySnapshot, err => console.error('[projectlog] 광고주별 구독 오류', err));
}
function _plEnsureMediaLoaded(media) {
  if (!media || _plFullyWatching || _plWatchedMedia.has(media) || !window._db) return;
  _plWatchedMedia.add(media);
  _plDb('projectLogs').where('media', '==', media)
    .onSnapshot(_plApplySnapshot, err => console.error('[projectlog] 매체별 구독 오류', err));
}
// 자유 텍스트 검색은 광고주/매체로 범위를 좁힐 수 없어서(어느 필드에 매칭될지 모름) 이 시점엔 전체를 연다.
function _plEnsureFullyLoaded() {
  if (_plFullyWatching || !window._db) return;
  _plFullyWatching = true;
  _plDb('projectLogs').onSnapshot(_plApplySnapshot, err => console.error('[projectlog] 전체 구독 오류', err));
}
let _plWatchedDates = new Set();
// 일자별 탭은 최근 구독 범위보다 예전 날짜로도 자유롭게 넘어갈 수 있어서, 그 날짜가 범위 밖이면 그 하루치만 따로 구독한다.
function _plEnsureDateLoaded(dateStr) {
  if (!dateStr || _plFullyWatching || dateStr >= _plRecentCutoff() || _plWatchedDates.has(dateStr) || !window._db) return;
  _plWatchedDates.add(dateStr);
  _plDb('projectLogs').where('logDate', '==', dateStr)
    .onSnapshot(_plApplySnapshot, err => console.error('[projectlog] 날짜별 구독 오류', err));
}

// ── 댓글 구독 (로그와 분리 — 로그 목록 전체 리렌더를 피하기 위함) ──
let PL_COMMENTS = [];
let _plWatchCommentsStarted = false;

function _plWatchComments() {
  if (_plWatchCommentsStarted || !window._db) return;
  _plWatchCommentsStarted = true;
  try {
    _plDb('projectLogComments').onSnapshot(snap => {
      PL_COMMENTS = snap.docs.map(d => d.data());
      _plRerenderOpenComments();
      _plUpdateCommentBadges();
    }, err => console.error('[projectlog] 댓글 구독 오류', err));
  } catch (e) {
    console.error('[projectlog] 댓글 구독 실패', e);
  }
}
// 접힌 행의 💬 뱃지 — 목록 전체를 다시 그리면 열려있는 댓글 입력창의 타이핑 중인 내용이 날아가므로,
// 뱃지 span만 id로 찾아 부분 교체한다(목록 전체 리렌더를 피하는 이유는 위 _plWatchComments 주석과 동일).
function _plCommentBadgeHtml(logId) {
  const cnt = PL_COMMENTS.filter(c => c.logId === logId).length;
  return cnt ? ` <span class="form-hint" style="font-weight:700;">💬${cnt}</span>` : '';
}
function _plUpdateCommentBadges() {
  document.querySelectorAll('[id^="pl-cmt-badge-"]').forEach(el => {
    const logId = el.id.slice('pl-cmt-badge-'.length);
    el.innerHTML = _plCommentBadgeHtml(logId);
  });
}
function _plRerenderOpenComments() {
  document.querySelectorAll('[data-pl-comments-for]').forEach(el => {
    const logId = el.dataset.plCommentsFor;
    el.innerHTML = _plCommentsHtml(logId);
  });
}

// ── 광고주/브랜드 연간 목표 구독 (매출처관리와 분리 — 연도별 문서, 취급고 기준) ──
let PL_GOALS = [];
let _plWatchGoalsStarted = false;

function _plWatchGoals() {
  if (_plWatchGoalsStarted || !window._db) return;
  _plWatchGoalsStarted = true;
  try {
    _plDb('projectGoals').onSnapshot(snap => {
      PL_GOALS = snap.docs.map(d => d.data());
      if (document.getElementById('screen-projectlog')?.classList.contains('active') && _plGCompany) {
        if (typeof _plGRenderAnnual === 'function') _plGRenderAnnual();
        if (typeof _plGRenderMonthly === 'function') _plGRenderMonthly();
      }
      // KPI/매출현황의 "KPI 달성률(평균)" 행이 이 데이터를 쓰므로, 그 화면이 열려있으면 같이 갱신.
      if (document.getElementById('screen-kpi')?.classList.contains('active') && typeof renderKpiGrandTable === 'function') {
        renderKpiGrandTable();
      }
    }, err => console.error('[projectlog] 목표 구독 오류', err));
  } catch (e) {
    console.error('[projectlog] 목표 구독 실패', e);
  }
}
function _plGoalDocId(company, brand, year) {
  return `pg_${encodeURIComponent(company)}_${encodeURIComponent(brand || '_company')}_${year}`;
}
function _plGetGoal(company, brand, year) {
  return PL_GOALS.find(g => g.seller === company && (g.brand || '') === (brand || '') && g.year === year);
}
// metric은 항상 '취급고' 고정. dbTarget은 DB등록수 목표 — 지표명이 고정값 하나뿐이라 별도 문서 없이 같은 문서에 필드로 둔다
// (예전엔 지표명을 자유입력받는 별도 KPI 문서 체계였는데, DB등록수 하나로 고정하기로 하면서 단순화함)
async function _plSaveGoal(company, brand, year, valueRaw, pmRaw, dbTargetRaw) {
  const id = _plGoalDocId(company, brand, year);
  const value = +valueRaw || 0;
  const pm = brand ? (pmRaw || '').trim() : ''; // 광고주 전체 목표엔 PM 개념 없음
  const dbTarget = brand ? (+dbTargetRaw || 0) : 0; // DB등록수 목표도 브랜드 단위에만 적용
  try {
    if (!value && !pm && !dbTarget) {
      // 전부 빈값이면 문서를 아예 지워서 "미입력" 상태로 되돌림
      await _plDb('projectGoals').doc(id).delete();
      return;
    }
    await _plDb('projectGoals').doc(id).set({
      id, seller: company, brand: brand || null, year, metric: '취급고', value, pm: pm || null, dbTarget: dbTarget || null,
      updatedAt: new Date().toISOString(), updatedBy: currentUser?.name || '',
    });
  } catch (e) {
    console.error('[projectlog] 목표 저장 실패', e);
    throw e;
  }
}

// ── 브랜드별 월간 목표 (취급고) — 연간 목표(_plSaveGoal)와 별개 문서. ②월간요약에서 인라인 입력 ──
function _plMonthlyGoalDocId(company, brand, ym) {
  return `pgmo_${encodeURIComponent(company)}_${encodeURIComponent(brand || '')}_${ym}`;
}
function _plGetMonthlyGoal(company, brand, ym) {
  return PL_GOALS.find(g => g.kind === 'monthly' && g.seller === company && (g.brand || '') === (brand || '') && g.ym === ym);
}
// value=매출 KPI(취급고 목표, 숫자) · monthKpi=월 KPI(자유 텍스트 메모) · advKpiRate=광고주 KPI 달성률
// (계산식 없이 담당자가 직접 입력하는 숫자, %) — 셋 다 비어있으면 문서를 지워 "미입력"으로 되돌린다.
async function _plSaveMonthlyGoal(company, brand, ym, valueRaw, monthKpiRaw, advKpiRateRaw) {
  const id = _plMonthlyGoalDocId(company, brand, ym);
  const value = +valueRaw || 0;
  const monthKpi = (monthKpiRaw || '').trim();
  const advKpiRate = (advKpiRateRaw === '' || advKpiRateRaw == null) ? null : (+advKpiRateRaw || 0);
  try {
    if (!value && !monthKpi && advKpiRate == null) { await _plDb('projectGoals').doc(id).delete(); return; }
    await _plDb('projectGoals').doc(id).set({
      id, kind: 'monthly', seller: company, brand: brand || null, ym, value,
      monthKpi: monthKpi || null, advKpiRate,
      updatedAt: new Date().toISOString(), updatedBy: currentUser?.name || '',
    });
  } catch (e) {
    console.error('[projectlog] 월간 목표 저장 실패', e);
    throw e;
  }
}
// ══════════════════════════════════════════════════════════
// 진입점 (goScreen('projectlog') 에서 호출)
// ══════════════════════════════════════════════════════════

let _plPendingTab = null; // 내부 네비게이션이 특정 탭을 지정하고 싶을 때만 사용 (예: D모달의 "프로젝트로그에서 보기")

function plInit() {
  _plInjectStyles();
  _plWatchLogs();
  _plWatchComments();
  _plWatchGoals();
  // 사이드바 메뉴로 진입할 때는 항상 일자별 탭부터. 내부에서 특정 탭 지정 시(_plPendingTab)에만 그 탭으로.
  PL_STATE.tab = _plPendingTab || 'date';
  PL_STATE.advDetailCompany = null;
  _plPendingTab = null;
  // 메뉴에 다시 들어올 때마다 일자별 탭이 지난번에 보던 날짜·필터에 머물러 있지 않고 항상 오늘부터
  // 보이도록 초기화한다.
  _plDateTabDate = _plTodayStr();
  _plDateOrgFilter = '';
  _plDateWriterFilters = [];
  _plLogWriterFilters = [];
  _plRenderShell();
}

// ══════════════════════════════════════════════════════════
// 화면 셸 — view-tabs + 탭별 콘텐츠 영역
// ══════════════════════════════════════════════════════════

function _plRenderShell() {
  const container = document.getElementById('screen-projectlog');
  if (!container) return;
  if (!container.dataset.plReady) {
    container.innerHTML = `
      <div class="filter-bar" style="margin-bottom:10px;">
        <div class="view-tabs">
          <button class="view-tab" id="pl-vt-date" onclick="plSwitchTab('date')">일자별</button>
          <button class="view-tab" id="pl-vt-log" onclick="plSwitchTab('log')">일지</button>
          <button class="view-tab" id="pl-vt-advertiser" onclick="plSwitchTab('advertiser')">광고주</button>
          <button class="view-tab" id="pl-vt-media" onclick="plSwitchTab('media')">매체</button>
          <button class="view-tab" id="pl-vt-campaign" onclick="plSwitchTab('campaign')">캠페인</button>
          <button class="view-tab" id="pl-vt-internal" onclick="plSwitchTab('internal')">내부업무</button>
        </div>
        <div class="view-tabs">
          <button class="view-tab" id="pl-vt-mine" onclick="plSwitchTab('mine')">나의 일지</button>
        </div>
        <button class="btn btn-outline btn-sm" id="pl-btn-xlsx" style="margin-left:auto;display:none;" onclick="plOpenXlsxImport()">📥 엑셀 업로드</button>
        <button class="btn btn-primary btn-sm" onclick="plOpenWrite()">+ 일지 작성</button>
      </div>
      <div id="pl-tab-content"></div>
    `;
    container.dataset.plReady = '1';
  }
  // 엑셀 업로드는 대량 쓰기라 관리자·지정 사용자만 노출
  const xlsxBtn = document.getElementById('pl-btn-xlsx');
  if (xlsxBtn) xlsxBtn.style.display = (currentUser?.isAdmin || currentUser?.id === 'soongeun') ? '' : 'none';
  _plUpdateTabButtons();
  plRenderActiveTab();
}
function _plUpdateTabButtons() {
  ['advertiser', 'campaign', 'log', 'media', 'date', 'mine', 'internal'].forEach(t => {
    document.getElementById(`pl-vt-${t}`)?.classList.toggle('active', PL_STATE.tab === t);
  });
}
function plRenderActiveTab() {
  if (PL_STATE.tab === 'advertiser') return plRenderAdvertiserTab();
  if (PL_STATE.tab === 'campaign') return plRenderCampaignTab();
  if (PL_STATE.tab === 'media') return plRenderMediaTab();
  if (PL_STATE.tab === 'date') return plRenderDateTab();
  if (PL_STATE.tab === 'mine') return plRenderMineTab();
  if (PL_STATE.tab === 'internal') return plRenderInternalTab();
  return plRenderLogTab();
}

// ══════════════════════════════════════════════════════════
// C-2. 나의 일지 — 작성한 일지 + 댓글에서 멘션된 일지, 두 섹션으로 분리
// ══════════════════════════════════════════════════════════

const _PL_MINE_THEAD = `<tr>
          <th style="width:22px;"></th><th style="width:78px;">작성일</th><th style="width:120px;">광고주</th>
          <th style="width:90px;">프로젝트</th><th style="width:90px;">캠페인</th><th style="width:120px;">매체</th><th style="width:60px;">유형</th>
          <th>내용</th><th style="width:56px;">진척률</th><th style="width:70px;">작성자</th>
        </tr>`;
// 작성기록이 많아지면 두 표를 세로로 쌓아둔 게 스크롤이 너무 길어져서, 서브탭으로 하나씩만 보여준다.
let _plMineSubTab = 'written'; // 'written' | 'involved' | 'commented' | 'byuser'
let _plMineUserFilters = []; // '작성자 모아보기' 탭에서 고른 사용자 이름들(여러 명 — 직급/조직 계위 기준이 아니라 직접 선택)
// "내가 작성한 일지" 탭 전용 필터 — 남이 댓글 단 것만. 새로고침·메뉴 재진입 시 리셋(작성자
// 필터처럼 localStorage에 남기지 않음 — 매번 걸어두면 새 댓글 놓치기 쉬움).
let _plMineCommentedOnly = false;
// "내가 작성한 일지" 탭 전용 정렬 — 미완료(진척률<100) 중 낮은 순으로 맨 위에 모아 보여준다.
let _plMineSortByProgress = false;
function _plMineUserFilterKey() { return 'pl_mine_user_' + (currentUser?.id || 'anon'); }
function _plBuildMineTabSkeleton(content) {
  // 매번 빈 값으로 리셋되면 탭 열 때마다 다시 골라야 해서, 마지막으로 고른 작성자들을 기억해둔다.
  try { _plMineUserFilters = JSON.parse(localStorage.getItem(_plMineUserFilterKey()) || '[]'); } catch (e) { _plMineUserFilters = []; }
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:14px;">
      <div class="view-tabs">
        <button class="view-tab${_plMineSubTab === 'written' ? ' active' : ''}" id="pl-mine-vt-written" onclick="_plMineSwitchSubTab('written')">내가 작성한 일지</button>
        <button class="view-tab${_plMineSubTab === 'involved' ? ' active' : ''}" id="pl-mine-vt-involved" onclick="_plMineSwitchSubTab('involved')">멘션</button>
        <button class="view-tab${_plMineSubTab === 'commented' ? ' active' : ''}" id="pl-mine-vt-commented" onclick="_plMineSwitchSubTab('commented')">댓글 단 일지</button>
        <button class="view-tab${_plMineSubTab === 'byuser' ? ' active' : ''}" id="pl-mine-vt-byuser" onclick="_plMineSwitchSubTab('byuser')">작성자 모아보기</button>
      </div>
      <div class="combo-wrap" id="pl-mine-user-wrap" style="display:${_plMineSubTab === 'byuser' ? 'flex' : 'none'};align-items:center;gap:4px;flex-wrap:wrap;">
        <div id="pl-mine-user-chips" style="display:inline-flex;gap:3px;flex-wrap:wrap;"></div>
        <input type="text" class="f-search" id="pl-mine-user" placeholder="🔍 작성자 추가" style="width:100px;"
          oninput="_plMineUserSearchInput(this)" onfocus="_plMineUserSearchInput(this)"
          onkeydown="_plComboKeyNav(event,'pl-mine-user-list')"
          onblur="setTimeout(()=>{const l=document.getElementById('pl-mine-user-list');if(l)l.style.display='none';},150)">
        <div class="combo-list" id="pl-mine-user-list" style="display:none;"></div>
      </div>
      <button class="btn btn-outline btn-sm${_plMineCommentedOnly ? ' pl-toggle-on' : ''}" id="pl-mine-commented-toggle" onclick="_plMineToggleCommentedOnly()" style="display:${_plMineSubTab === 'written' ? '' : 'none'};">💬 댓글 있는 것만</button>
      <button class="btn btn-outline btn-sm${_plMineSortByProgress ? ' pl-toggle-on' : ''}" id="pl-mine-progress-toggle" onclick="_plMineToggleSortByProgress()" style="display:${_plMineSubTab === 'written' ? '' : 'none'};" data-tooltip="이어쓰기로 이미 이어진 옛 기록은 제외하고, 진짜 미완료인 것만 진척률 낮은 순으로 맨 위에 모읍니다">📊 미완료 낮은순</button>
      <input type="text" class="f-search" id="pl-mine-search" placeholder="검색어" style="width:160px;" oninput="_plRenderMineBody()">
    </div>
    <div class="table-card">
      <div class="table-header"><span class="card-title" id="pl-mine-title">내가 작성한 일지</span><span class="table-count" id="pl-mine-count"></span></div>
      <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
        <thead>${_PL_MINE_THEAD}</thead>
        <tbody id="pl-mine-tbody"></tbody>
      </table></div>
    </div>
  `;
  _plMineRenderUserChips();
}
function _plMineRenderUserChips() {
  const el = document.getElementById('pl-mine-user-chips');
  if (!el) return;
  el.innerHTML = _plMineUserFilters.map(name =>
    `<span class="tag">${_escHtml(name)}<span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plMineUserRemove('${_escHtml(name)}')">✕</span></span>`
  ).join('');
}
function _plMineUserSearchInput(inputEl) {
  const list = document.getElementById('pl-mine-user-list');
  if (!list) return;
  const already = new Set(_plMineUserFilters);
  const q = (inputEl.value || '').trim().toLowerCase();
  const matched = _plWriterNames().filter(n => !already.has(n) && (!q || n.toLowerCase().includes(q)));
  _plComboNavIndex['pl-mine-user-list'] = -1;
  if (!matched.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.innerHTML = matched.map(n => `<div class="combo-item" onmousedown="_plMineUserPick('${_escHtml(n)}')">${_escHtml(n)}</div>`).join('');
  list.style.display = 'block';
  _plFloatCombo(inputEl, list);
}
function _plMineUserPick(name) {
  if (!_plMineUserFilters.includes(name)) _plMineUserFilters.push(name);
  localStorage.setItem(_plMineUserFilterKey(), JSON.stringify(_plMineUserFilters));
  const input = document.getElementById('pl-mine-user');
  if (input) input.value = '';
  const list = document.getElementById('pl-mine-user-list');
  if (list) list.style.display = 'none';
  _plMineRenderUserChips();
  _plRenderMineBody();
}
function _plMineUserRemove(name) {
  _plMineUserFilters = _plMineUserFilters.filter(n => n !== name);
  localStorage.setItem(_plMineUserFilterKey(), JSON.stringify(_plMineUserFilters));
  _plMineRenderUserChips();
  _plRenderMineBody();
}
function _plMineSwitchSubTab(tab) {
  _plMineSubTab = tab;
  document.getElementById('pl-mine-vt-written')?.classList.toggle('active', tab === 'written');
  document.getElementById('pl-mine-vt-involved')?.classList.toggle('active', tab === 'involved');
  document.getElementById('pl-mine-vt-commented')?.classList.toggle('active', tab === 'commented');
  document.getElementById('pl-mine-vt-byuser')?.classList.toggle('active', tab === 'byuser');
  const userWrap = document.getElementById('pl-mine-user-wrap');
  if (userWrap) userWrap.style.display = tab === 'byuser' ? 'flex' : 'none';
  const commentedToggle = document.getElementById('pl-mine-commented-toggle');
  if (commentedToggle) commentedToggle.style.display = tab === 'written' ? '' : 'none';
  const progressToggle = document.getElementById('pl-mine-progress-toggle');
  if (progressToggle) progressToggle.style.display = tab === 'written' ? '' : 'none';
  _plRenderMineBody();
}
function _plMineToggleCommentedOnly() {
  _plMineCommentedOnly = !_plMineCommentedOnly;
  document.getElementById('pl-mine-commented-toggle')?.classList.toggle('pl-toggle-on', _plMineCommentedOnly);
  _plRenderMineBody();
}
function _plMineToggleSortByProgress() {
  _plMineSortByProgress = !_plMineSortByProgress;
  document.getElementById('pl-mine-progress-toggle')?.classList.toggle('pl-toggle-on', _plMineSortByProgress);
  _plRenderMineBody();
}
// 이어쓰기로 이미 다음 기록이 만들어진 옛 기록은(진척률 값이 그때 그대로 남아있어 실제 최신
// 진행상황을 반영 못 함) "미완료로 남은 일"에서 제외하고, 진짜 미완료(진척률<100)인 것만 골라
// 진척률 낮은 순으로 맨 위에, 나머지(완료·진척률 없음·이미 이어진 것)는 원래 순서 그대로 뒤에 붙인다.
function _plSortByIncompleteProgress(logs) {
  const continuedIds = new Set(PL_LOGS.filter(l => l.continuedFromId).map(l => l.continuedFromId));
  const incomplete = [], rest = [];
  logs.forEach(l => {
    if (l.progress != null && l.progress < 100 && !continuedIds.has(l.id)) incomplete.push(l);
    else rest.push(l);
  });
  incomplete.sort((a, b) => a.progress - b.progress);
  return [...incomplete, ...rest];
}
function _plRenderMineBody() {
  // 최근 구독 범위보다 오래된 내 이력도 다 보여야 하는 탭이라 전체를 열어둔다.
  _plEnsureFullyLoaded();
  const myId = currentUser?.id;
  // "일지" 탭 검색어(pl-search)와 완전히 같은 매칭 로직(_plTokenMatchNormalized) 재사용 — 동작이 갈리지 않게.
  const q = (document.getElementById('pl-mine-search')?.value || '').trim();
  const matchesQ = l => _plTokenMatchNormalized(_plNormalizeSearch(l.searchText || ''), q);

  // "내가 작성한 것"(책임 소재)과 "남이 나를 끌어들인 것"(댓글 멘션 — 참고로 챙길 것)을
  // 서로 겹치지 않게 나눈다. 내가 쓴 일지에 남이 나를 멘션했더라도 작성 쪽에만 표시.
  const othersCommentedIds = new Set(PL_COMMENTS.filter(c => c.writerId !== myId).map(c => c.logId));
  let writtenLogs = PL_LOGS.filter(l => l.writerId === myId && matchesQ(l));
  if (_plMineCommentedOnly) writtenLogs = writtenLogs.filter(l => othersCommentedIds.has(l.id));
  if (_plMineSortByProgress) writtenLogs = _plSortByIncompleteProgress(writtenLogs);
  const mentionLogIds = new Set(PL_COMMENTS.filter(c => (c.mentions || []).some(m => m.id === myId)).map(c => c.logId));
  const involvedLogs = PL_LOGS.filter(l => l.writerId !== myId && mentionLogIds.has(l.id) && matchesQ(l));
  // 내가 댓글을 단 일지 — 멘션 여부와 무관하게 댓글 작성자 기준. 내가 쓴 일지는 "작성" 쪽에만 표시.
  const commentedLogIds = new Set(PL_COMMENTS.filter(c => c.writerId === myId).map(c => c.logId));
  const commentedLogs = PL_LOGS.filter(l => l.writerId !== myId && commentedLogIds.has(l.id) && matchesQ(l));
  // 조직 계위(팀/본부) 기준이 아니라, 직접 고른 사용자들(여러 명 가능)이 쓴 것만 모아 보여준다.
  const userFilterSet = new Set(_plMineUserFilters);
  const byUserLogs = userFilterSet.size ? PL_LOGS.filter(l => userFilterSet.has(l.writer) && matchesQ(l)) : [];

  // 탭 버튼에도 건수를 같이 보여줘서, 안 보고 있는 쪽이 몇 건인지도 바로 알 수 있게
  const writtenBtn = document.getElementById('pl-mine-vt-written');
  if (writtenBtn) writtenBtn.textContent = `내가 작성한 일지 (${writtenLogs.length})`;
  const involvedBtn = document.getElementById('pl-mine-vt-involved');
  if (involvedBtn) involvedBtn.textContent = `멘션 (${involvedLogs.length})`;
  const commentedBtn = document.getElementById('pl-mine-vt-commented');
  if (commentedBtn) commentedBtn.textContent = `댓글 단 일지 (${commentedLogs.length})`;
  const byUserBtn = document.getElementById('pl-mine-vt-byuser');
  if (byUserBtn) byUserBtn.textContent = `작성자 모아보기${userFilterSet.size ? ` (${byUserLogs.length})` : ''}`;

  const active = _plMineSubTab === 'involved' ? involvedLogs : _plMineSubTab === 'commented' ? commentedLogs : _plMineSubTab === 'byuser' ? byUserLogs : writtenLogs;
  const ctx = _plMineSubTab === 'involved' ? 'minemention' : _plMineSubTab === 'commented' ? 'minecommented' : _plMineSubTab === 'byuser' ? 'mineuser' : 'mine';
  const titleEl = document.getElementById('pl-mine-title');
  if (titleEl) titleEl.textContent = _plMineSubTab === 'involved' ? '멘션된 일지'
    : _plMineSubTab === 'commented' ? '내가 댓글 단 일지'
    : _plMineSubTab === 'byuser' ? (userFilterSet.size ? `${_plMineUserFilters.join(', ')}님이 작성한 일지` : '작성자를 선택해주세요') : '내가 작성한 일지';

  const tbody = document.getElementById('pl-mine-tbody');
  if (tbody) {
    const emptyMsg = (_plMineSubTab === 'byuser' && !userFilterSet.size) ? '작성자를 검색해서 선택해주세요.' : '조건에 맞는 일지가 없습니다.';
    tbody.innerHTML = active.length
      ? active.map(l => _plRenderLogRow(l, q, ctx)).join('')
      : `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text3);font-size:13px;">${emptyMsg}</td></tr>`;
  }
  const cntEl = document.getElementById('pl-mine-count');
  if (cntEl) cntEl.innerHTML = `<b>${active.length}</b>건`;
}
function plRenderMineTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (content.dataset.plTab !== 'mine') {
    _plBuildMineTabSkeleton(content);
    content.dataset.plTab = 'mine';
  }
  _plRenderMineBody();
}

// ══════════════════════════════════════════════════════════
// C-3. 내부업무 — 클라이언트(자유입력, 마스터데이터 없음)별 드릴다운.
// 매출·목표 개념이 없는 데이터라 광고주 탭처럼 무겁게 만들지 않고, 목록 → 클릭 시
// 그 클라이언트의 로그 전체를 보여주는 단순 아카이브 형태로 둔다.
// ══════════════════════════════════════════════════════════

function _plInternalClientRows() {
  const byClient = new Map();
  PL_LOGS.filter(l => l.scope === 'internal' && l.seller).forEach(l => {
    if (!byClient.has(l.seller)) byClient.set(l.seller, []);
    byClient.get(l.seller).push(l);
  });
  return [...byClient.entries()].map(([client, logs]) => {
    const taskCount = new Set(logs.map(l => l.content).filter(Boolean)).size;
    const lastDate = logs.reduce((max, l) => (l.logDate || '') > max ? (l.logDate || '') : max, '');
    return { client, count: logs.length, taskCount, lastDate };
  }).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
}
function _plBuildInternalTabSkeleton(content) {
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:14px;">
      <input type="text" class="f-search" id="pl-internal-search" placeholder="🔍 클라이언트 검색" style="width:200px;" oninput="_plRenderInternalListBody()">
      <span class="table-count" style="margin-left:auto;" id="pl-internal-count"></span>
    </div>
    <div class="table-card">
      <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
        <thead><tr><th>클라이언트</th><th style="width:110px;">테스크 수</th><th style="width:90px;">기록 건수</th><th style="width:100px;">최근 작성일</th></tr></thead>
        <tbody id="pl-internal-tbody"></tbody>
      </table></div>
    </div>
  `;
}
function _plRenderInternalListBody() {
  const q = (document.getElementById('pl-internal-search')?.value || '').trim().toLowerCase();
  let rows = _plInternalClientRows();
  if (q) rows = rows.filter(r => r.client.toLowerCase().includes(q));
  const tbody = document.getElementById('pl-internal-tbody');
  if (tbody) {
    tbody.innerHTML = rows.length ? rows.map(r => `
      <tr class="pl-lg-head" style="cursor:pointer;" onclick="_plOpenInternalDetail('${_escHtml(r.client)}')">
        <td>${_escHtml(r.client)}</td>
        <td class="td-c">${r.taskCount || '—'}</td>
        <td class="td-c">${r.count}</td>
        <td class="f-mono td-num">${_escHtml((r.lastDate || '').slice(2).replace(/-/g, '.'))}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text3);font-size:13px;">내부업무 기록이 없습니다.</td></tr>`;
  }
  const cntEl = document.getElementById('pl-internal-count');
  if (cntEl) cntEl.innerHTML = `<b>${rows.length}</b>곳`;
}
function _plOpenInternalDetail(client) {
  PL_STATE.tab = 'internal';
  PL_STATE.internalDetailClient = client;
  _plUpdateTabButtons();
  plRenderActiveTab();
  // 광고주/매체 상세와 동일하게 히스토리를 쌓아둬야 브라우저 뒤로가기로도 목록으로 돌아간다
  // (popstate 핸들러가 이 state를 받아 internalDetailClient를 초기화함).
  history.pushState({ screen: 'projectlog-detail', plTab: 'internal' }, '', '#projectlog');
}
function _plInternalBackToList() {
  PL_STATE.internalDetailClient = null;
  plRenderInternalTab();
}
// "일지" 탭 테이블 행과 같은 펼침 구조(_plToggleRow + _plRenderDetailRow)를 그대로 재사용 —
// 다만 광고주/매체/캠페인 컬럼 대신 테스크(content) 하나만 보여주면 되는 좁은 표라 전용 행 렌더러를 쓴다.
function _plRenderInternalLogRow(log) {
  const isOpen = _plExpanded.has(log.id);
  const arrow = isOpen ? '▾' : '▸';
  const dateShort = (log.logDate || '').slice(2).replace(/-/g, '.');
  const starHtml = log.important ? '<span class="pl-star">★</span> ' : '';
  const cmtBadgeHtml = `<span id="pl-cmt-badge-${log.id}">${_plCommentBadgeHtml(log.id)}</span>`;
  const stateHtml = log.state === '진행중' ? ' <span class="pl-st-open">진행중</span>' : (log.state === '완료' ? ' <span class="pl-st-done">완료</span>' : '');
  if (log.hasImages && log.imageCount == null) _plEnsureImageCountBadge(log.id);
  const attachIconsHtml = (log.hasImages ? `<span id="pl-imgcnt-${log.id}" style="cursor:zoom-in;font-size:11px;margin-left:4px;" onclick="event.stopPropagation();_plOpenLogImages('${log.id}')" title="첨부 이미지 — 클릭하여 보기">📁${log.imageCount || ''}</span>` : '')
    + ((log.links && log.links.length) ? `<span style="font-size:11px;margin-left:4px;" title="링크 ${log.links.length}개">🔗${log.links.length}</span>` : '');
  const progHtml = log.progress != null
    ? `<span class="prog-wrap" style="width:46px;display:inline-block;vertical-align:middle;"><span class="prog-fill" style="width:${Math.max(0, Math.min(100, log.progress))}%;background:var(--green);"></span></span> <span class="f-mono" style="font-size:10.5px;vertical-align:middle;">${log.progress}%</span>`
    : '<span class="td-dim">—</span>';
  const rowHtml = `<tr id="pl-row-${log.id}" class="pl-lg-head" onclick="_plToggleRowGuarded(event,'${log.id}','internal')" style="cursor:pointer;">
    <td class="pl-lg-arrow">${arrow}</td>
    <td class="f-mono td-num">${dateShort}</td>
    <td>${log.content ? _escHtml(log.content) : '<span class="td-dim">—</span>'}</td>
    <td><span class="badge pl-lg-${log.logType}">${_escHtml(log.logType)}</span></td>
    <td><div>${starHtml}${_escHtml(log.summary || '')}${attachIconsHtml}${stateHtml}${cmtBadgeHtml}</div></td>
    <td class="td-c">${progHtml}</td>
    <td>${_escHtml(log.writer || '—')}</td>
  </tr>`;
  return rowHtml + (isOpen ? _plRenderDetailRow(log, 7) : '');
}
function _plWriteFromInternal(client) {
  plOpenWrite({ scope: 'internal', seller: client, content: null, campaignId: null, media: null, product: null });
}
function _plRenderInternalDetail(content, client) {
  const logs = PL_LOGS.filter(l => l.scope === 'internal' && l.seller === client)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:14px;">
      <span class="pl-x" style="font-size:13px;color:var(--accent);cursor:pointer;" onclick="_plInternalBackToList()">← 내부업무 목록</span>
      <span style="font-weight:700;font-size:14px;margin-left:10px;">${_escHtml(client)}</span>
      <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="_plWriteFromInternal('${_escHtml(client)}')">+ 이 클라이언트로 기록</button>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="card-title">기록 ${logs.length}건</span></div>
      <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
        <thead><tr>
          <th style="width:22px;"></th><th style="width:78px;">작성일</th><th style="width:110px;">테스크</th><th style="width:60px;">유형</th>
          <th>내용</th><th style="width:56px;">진척률</th><th style="width:70px;">작성자</th>
        </tr></thead>
        <tbody>${logs.length ? logs.map(l => _plRenderInternalLogRow(l)).join('') : `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3);">기록이 없습니다.</td></tr>`}</tbody>
      </table></div>
    </div>
  `;
}
function plRenderInternalTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (PL_STATE.internalDetailClient) {
    content.dataset.plTab = 'internal-detail';
    _plRenderInternalDetail(content, PL_STATE.internalDetailClient);
    return;
  }
  if (content.dataset.plTab !== 'internal') {
    _plBuildInternalTabSkeleton(content);
    content.dataset.plTab = 'internal';
  }
  _plRenderInternalListBody();
}

// ══════════════════════════════════════════════════════════
// D. 캠페인 상세 → 로그 모달 (index.html 캠페인 상세 버튼, H 목록 행 클릭에서 호출)
// ══════════════════════════════════════════════════════════

let _plCampLogCurrentId = null;

function plOpenCampaignLogs(campaignId) {
  if (!campaignId) return;
  const c = DATA.find(x => x.id === campaignId);
  if (c) {
    _plRenderCampaignLogModal(campaignId, c, false, false);
    openModal('pl-modal-camplog');
    return;
  }
  // DATA에서 못 찾음 — 삭제된 캠페인. deleted_campaigns 1회성 조회 (전역 배열 없음)
  _plRenderCampaignLogModal(campaignId, null, true, false);
  openModal('pl-modal-camplog');
  if (!window._db) { _plRenderCampaignLogModal(campaignId, null, true, true); return; }
  window._db.collection('deleted_campaigns').doc(campaignId).get().then(snap => {
    const dc = snap.exists ? snap.data() : null;
    _plRenderCampaignLogModal(campaignId, dc, true, !snap.exists);
  }).catch(e => {
    console.error('[projectlog] 삭제된 캠페인 조회 실패', e);
    _plRenderCampaignLogModal(campaignId, null, true, true);
  });
}

function _plBuildCampLogModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-camplog';
  overlay.innerHTML = `
    <div class="modal" style="width:640px;max-width:96vw;">
      <div class="modal-head">
        <div>
          <div class="modal-title">✎ 캠페인 일지</div>
          <div id="pl-cl-badges" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center;"></div>
        </div>
        <button class="modal-close" onclick="closeModal('pl-modal-camplog')">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px;">
          <span class="table-count" id="pl-cl-count"></span>
          <button class="btn btn-primary btn-sm" id="pl-cl-writebtn" style="margin-left:auto;" onclick="_plWriteFromCampLog()">+ 일지 작성</button>
        </div>
        <div class="table-card" style="box-shadow:none;margin-bottom:0;">
          <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
            <thead><tr>
              <th style="width:22px;"></th><th style="width:74px;">작성일</th><th style="width:60px;">유형</th>
              <th>내용</th><th style="width:56px;">진척</th><th style="width:70px;">작성자</th>
            </tr></thead>
            <tbody id="pl-cl-tbody"></tbody>
          </table></div>
        </div>
        <p class="form-hint" id="pl-cl-note" style="margin-top:12px;"></p>
      </div>
      <div class="modal-foot">
        <span class="form-hint">프로젝트일지 메뉴에서도 동일하게 조회·수정 가능</span>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="_plGoToLogTabFromCamp()">프로젝트일지에서 보기 →</button>
          <button class="btn btn-ghost btn-sm" onclick="closeModal('pl-modal-camplog')">닫기</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// isRef: 이 캠페인이 로그의 주 소속(campaignId)이 아니라 참조 태그(refCampaignIds)로만 걸린 경우 —
// 원래 어디에 작성된 로그인지 짧은 배지로 알려준다(위계 없이 동등한 참조라는 걸 보여주되 출처는 명시).
function _plRenderCampaignLogRow(log, isRef) {
  const isOpen = _plExpanded.has(log.id);
  const arrow = isOpen ? '▾' : '▸';
  const dateShort = (log.logDate || '').slice(2).replace(/-/g, '.');
  const starHtml = log.important ? '<span class="pl-star">★</span> ' : '';
  const cmtBadgeHtml = `<span id="pl-cmt-badge-${log.id}">${_plCommentBadgeHtml(log.id)}</span>`;
  const stateHtml = log.state === '진행중' ? ' <span class="pl-st-open">진행중</span>' : (log.state === '완료' ? ' <span class="pl-st-done">완료</span>' : '');
  const originLabel = log.content ? `${log.seller || ''} / ${log.content}` : (log.seller || '');
  const refNoteHtml = isRef ? ` <span class="tag pl-ref" style="cursor:default;" data-tooltip="${_escHtml(originLabel)}에서 작성됨">📍 참조</span>` : '';
  const progHtml = log.progress != null
    ? `<span class="prog-wrap" style="width:40px;display:inline-block;vertical-align:middle;"><span class="prog-fill" style="width:${Math.max(0, Math.min(100, log.progress))}%;background:var(--green);"></span></span> <span class="f-mono" style="font-size:10.5px;vertical-align:middle;">${log.progress}</span>`
    : '<span class="td-dim">—</span>';
  const rowHtml = `<tr class="pl-lg-head" onclick="_plToggleRowGuarded(event,'${log.id}','camp')" style="cursor:pointer;">
    <td class="pl-lg-arrow">${arrow}</td>
    <td class="f-mono td-num">${dateShort}</td>
    <td><span class="badge pl-lg-${log.logType}">${_escHtml(log.logType)}</span></td>
    <td>${starHtml}${_escHtml(log.summary || '')}${refNoteHtml}${stateHtml}${cmtBadgeHtml}</td>
    <td class="td-c">${progHtml}</td>
    <td>${_escHtml(log.writer || '—')}</td>
  </tr>`;
  return rowHtml + (isOpen ? _plRenderDetailRow(log, 6) : '');
}
function _plCampLogSectionRowHtml(label, count) {
  return `<tr><td colspan="6" class="card-title" style="padding:8px 9px 4px;background:transparent;border-bottom:none;">${_escHtml(label)} (${count})</td></tr>`;
}

let _plCampLogLastData = null;
let _plCampLogLastIsDeleted = false;
let _plCampLogLastNotFound = false;

function _plRenderCampaignLogModal(campaignId, campaignData, isDeleted, notFound) {
  _plCampLogCurrentId = campaignId;
  _plCampLogLastData = campaignData;
  _plCampLogLastIsDeleted = !!isDeleted;
  _plCampLogLastNotFound = !!notFound;
  if (!document.getElementById('pl-modal-camplog')) _plBuildCampLogModalShell();

  const badgeEl = document.getElementById('pl-cl-badges');
  if (badgeEl) {
    if (notFound || !campaignData) {
      badgeEl.innerHTML = `<span class="tag f-mono">${_escHtml(campaignId)}</span>`;
    } else {
      const c = campaignData;
      const seller = c.seller || c.adv || '';
      const dateShort = (c.date || '').slice(2, 10).replace(/-/g, '.');
      const delBadge = isDeleted ? `<span class="tag" style="background:var(--red-bg);border-color:#ffc9c9;color:var(--red);">삭제됨</span>` : '';
      badgeEl.innerHTML = `
        <span class="form-hint">${_escHtml(seller)}</span>
        ${c.content ? `<span class="tag pl-brand">${_escHtml(c.content)}</span>` : ''}
        <span class="tag f-mono">${_escHtml(campaignId)} · ${_escHtml(dateShort)}</span>
        ${c.media ? `<span class="tag pl-media">${_escHtml(c.media)}</span>` : ''}
        ${c.product ? `<span class="tag">${_escHtml(c.product)}</span>` : ''}
        ${delBadge}`;
    }
  }

  const sortLogs = arr => arr.slice().sort((a, b) => (b.logDate || '').localeCompare(a.logDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  const directLogs = sortLogs(PL_LOGS.filter(l => l.campaignId === campaignId));
  // 참조 캠페인 — 로그 문서 자체가 다른 곳(주로 광고주/프로젝트 전반)에 등록됐지만, 이 캠페인도
  // refCampaignIds에 태그돼있는 것들. 문서는 하나뿐이라 P2/P3처럼 여러 캠페인 상세에서 같은 로그가
  // 각자 "참조로 걸린 일지" 섹션에 나타나는 것이지, 목록이 중복 생성되는 게 아니다.
  const refLogs = sortLogs(PL_LOGS.filter(l => (l.refCampaignIds || []).includes(campaignId)));
  const logs = [...directLogs, ...refLogs];
  const openCnt = logs.filter(l => l.state === '진행중').length;
  const countEl = document.getElementById('pl-cl-count');
  if (countEl) countEl.innerHTML = `이 캠페인의 일지 <b>${logs.length}</b>건${refLogs.length ? ` (참조 ${refLogs.length})` : ''}${openCnt ? ` · <span style="color:var(--red);">진행중 ${openCnt}</span>` : ''}`;
  const tbody = document.getElementById('pl-cl-tbody');
  if (tbody) {
    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text3);font-size:13px;">등록된 일지가 없습니다.</td></tr>`;
    } else {
      const directHtml = directLogs.length
        ? (refLogs.length ? _plCampLogSectionRowHtml('직접 등록된 일지', directLogs.length) : '') + directLogs.map(l => _plRenderCampaignLogRow(l)).join('')
        : '';
      const refHtml = refLogs.length
        ? _plCampLogSectionRowHtml('참조로 걸린 일지', refLogs.length) + refLogs.map(l => _plRenderCampaignLogRow(l, true)).join('')
        : '';
      tbody.innerHTML = directHtml + refHtml;
    }
  }

  const writeBtn = document.getElementById('pl-cl-writebtn');
  if (writeBtn) writeBtn.style.display = isDeleted ? 'none' : '';

  const noteEl = document.getElementById('pl-cl-note');
  if (noteEl) {
    noteEl.textContent = notFound
      ? '캠페인 정보를 찾을 수 없습니다. 일지 기록만 표시됩니다.'
      : (isDeleted ? '삭제된 캠페인입니다. 일지는 조회만 가능하며 새로 작성할 수 없습니다.' : '[+ 일지 작성] 클릭 시 블록 대상이 이 캠페인으로 이미 선택된 상태로 열립니다.');
  }
}

function _plWriteFromCampLog() {
  const c = DATA.find(x => x.id === _plCampLogCurrentId);
  if (!c) return;
  plOpenWrite({
    scope: 'campaign', seller: c.seller || c.adv || null, content: c.content || null,
    campaignId: c.id, media: c.media || null, product: c.product || null,
  });
}
function _plGoToLogTabFromCamp() {
  closeModal('pl-modal-camplog');
  _plPendingTab = 'log';
  // skipPush=false로 goScreen을 부르면 location.hash가 바뀌면서 hashchange 리스너가
  // goScreen('projectlog', true)를 한 번 더 실행시켜, 그 두 번째 plInit()이 이미 소비된
  // _plPendingTab을 못 보고 'date'로 덮어써버린다(다른 화면에서 넘어올 때만 재현되는 버그였음).
  goScreen('projectlog', true);
}

// plOpenWrite() 는 "3-2. 로그 작성 화면" 섹션, plOpenEdit() 는 "3-4. 로그 수정 화면" 섹션에서 구현.

// ══════════════════════════════════════════════════════════
// 신규 스타일 주입 (style.css 는 수정하지 않음)
// ══════════════════════════════════════════════════════════

function _plInjectStyles() {
  if (document.getElementById('pl-styles')) return;
  const badgeCss = Object.entries(PL_TYPE_COLOR).map(([k, v]) =>
    `.pl-lg-${k}{background:${v.bg};color:${v.fg};}`
  ).join('\n');
  const css = `
${badgeCss}
.pg-btn.disabled{opacity:.35;cursor:default;pointer-events:none;}
#pl-f-open.pl-toggle-on,#pl-f-important.pl-toggle-on{outline:2px solid var(--accent);background:var(--accent-light);}
/* 보기 전용 모달 — ㄴ추가/✕삭제/파일첨부/링크추가 등 조작 버튼은 아예 안 보이게(눌러도 반응 없는 게 더 헷갈림) */
#pl-e-block.pl-readonly .pl-subadd,
#pl-e-block.pl-readonly .pl-x,
#pl-e-block.pl-readonly .pl-add,
#pl-e-block.pl-readonly .pl-edit-addbtn,
#pl-e-block.pl-readonly .pl-edit-rmbtn,
#pl-e-block.pl-readonly .pl-paste-zone{display:none;}
.pl-st-open{display:inline-block;background:var(--red-bg);color:var(--red);border:1px solid #ffc9c9;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:800;}
.pl-st-done{display:inline-block;background:var(--green-bg);color:var(--green);border:1px solid #b2f2bb;padding:1px 7px;border-radius:4px;font-size:10px;font-weight:800;}
.pl-st-late{display:inline-block;background:var(--surface2);color:var(--text3);border:1px solid var(--border);padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;}
.pl-star{color:#f08c00;font-size:11px;}
.pl-click{color:var(--accent);font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;cursor:pointer;}
.tag.pl-brand{background:var(--purple-bg);border-color:#d9d2f7;color:var(--accent2);}
.tag.pl-media{background:var(--blue-bg);border-color:#c5e2f7;color:#1971c2;}
.tag.pl-inner{background:#f1f3f5;border-color:#dee2e6;color:#495057;}
.tag.pl-ref{background:var(--blue-bg);border-color:#c5e2f7;color:#1971c2;}
/* 일지/나의일지 표의 "매체" 칸(6번째 컬럼) — 참조 캠페인 여러 개라 매체명이 나열되면(예: "하나카드·신한카드")
   컬럼이 넓어지던 것을 120px로 고정. 넘치는 부분은 평소엔 말줄임표로 숨기고, 그 칸에 마우스를 올렸을 때만
   원래 폭 제한을 풀어서 옆 컬럼 위로 잠깐 드러나 보이게 한다. */
#pl-tab-content .pl-lgt td:nth-child(6){max-width:120px;overflow:hidden;}
#pl-tab-content .pl-lgt td:nth-child(6) .tag{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle;}
#pl-tab-content .pl-lgt td:nth-child(6):hover{overflow:visible;}
#pl-tab-content .pl-lgt td:nth-child(6):hover .tag{max-width:none;position:relative;z-index:5;}
.pl-reftags{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:6px 8px;background:var(--surface2);border:1px dashed var(--border2);border-radius:var(--radius-sm);}
.pl-reftags input{border:none;background:transparent;font-size:11.5px;outline:none;flex:1;min-width:120px;color:var(--text2);}
/* 일자별 뷰 '매체 전반' 카드 앞머리 배지 — 세금계산서 뷰의 매체=보라 색상 규칙을 그대로 재사용 */
.tag.pl-scope-media{background:rgba(124,58,237,.1);color:#7c3aed;}
.tag.pl-muted{background:#f1f3f5;border-color:#dee2e6;color:var(--text3);}
.pl-lg-arrow{width:22px;text-align:center;color:var(--text3);font-size:10px;}
.pl-lg-det td{background:var(--surface2);border-bottom:1px solid var(--border);}
.pl-detbox{padding:10px 14px 10px 8px;border-left:3px solid var(--border);margin:3px 0 7px;}
.pl-lgsub{display:grid;grid-template-columns:auto auto 1fr;gap:4px 8px;font-size:12.5px;line-height:1.7;align-items:baseline;}
.pl-detfoot{display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:8px;border-top:1px dashed var(--border);gap:10px;flex-wrap:wrap;}
.pl-expand-bar{display:flex;gap:5px;margin-left:auto;}
.pl-toggle-on{background:var(--accent-light)!important;border-color:var(--accent)!important;color:var(--accent)!important;}
.pl-mark{background:var(--yellow-bg);padding:0 2px;border-radius:2px;}
.pl-thumb{width:34px;height:24px;border-radius:4px;background:linear-gradient(135deg,#dde3f0,#c6cfe0);border:1px solid var(--border);display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:#6b7590;font-weight:700;}
#screen-projectlog .combo-list,#pl-modal-write .combo-list,#pl-modal-edit .combo-list,#pl-modal-camplog .combo-list{z-index:99999;}
.combo-item.pl-combo-active{background:var(--accent-light);}
.pl-jump-flash{animation:plJumpFlash 1.5s ease;}
@keyframes plJumpFlash{0%,100%{background:transparent;}20%,60%{background:var(--accent-light);}}
.combo-item .pl-ctype{float:right;font-size:10.5px;color:var(--text3);font-weight:600;}

/* ── 작성 화면: 블록 구조 ── */
.pl-block{border:1px solid var(--border2);border-radius:var(--radius);margin-bottom:12px;overflow:hidden;background:var(--surface);}
.pl-bhead{display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surface2);border-bottom:1px solid var(--border);flex-wrap:wrap;}
.pl-tgt{background:#fff;border:1.5px solid var(--border2);border-radius:6px;padding:6px 10px 6px 28px;font-size:13.5px;font-weight:800;color:var(--text);outline:none;min-width:320px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239da3bc' stroke-width='2.5'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M21 21l-4.3-4.3'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:9px center;}
.pl-tgt:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}
.pl-tgt.empty{font-weight:600;color:#b6bccf;}
.pl-bbody{padding:10px 13px;}
.pl-item{border-bottom:2px dashed var(--border2);padding:18px 0;}
/* "+ 매체/캠페인 추가"로 새 그룹이 시작되는 항목은 "+ 항목 추가"로 이어붙인 것과 위쪽 경계를 다르게 줘서 구분한다. */
.pl-item.pl-newgroup{border-top:3px solid var(--accent);padding-top:14px;margin-top:-2px;}
.pl-item:last-of-type{border-bottom:none;}
.pl-irow{display:grid;grid-template-columns:82px 1fr 72px 24px;gap:8px;align-items:center;}
.pl-media-row{margin-bottom:6px;}
.pl-sub{display:grid;grid-template-columns:22px 108px 1fr 24px;gap:6px;align-items:center;margin-top:6px;}
.pl-m{text-align:center;color:var(--text3);font-size:12px;}
.pl-l{color:var(--text2);font-weight:700;white-space:nowrap;}
.pl-subadd{margin-top:5px;margin-left:22px;font-size:11.5px;color:var(--accent);font-weight:700;cursor:pointer;}
/* 일지/일자별 뷰의 접힌(토글 안 한) 행에서도 ㄴ 내용 바로 밑에 보이는 "+ ㄴ 추가" — 버튼이 아니라 글씨로 */
.pl-quickadd{margin:2px 0 0 22px;font-size:11.5px;color:var(--accent);font-weight:700;cursor:pointer;display:inline-block;}
.pl-quickadd:hover{text-decoration:underline;}
.pl-quickadd-form{display:flex;align-items:center;gap:6px;margin:3px 0 0 22px;}
.pl-quickadd-form .pl-mini{width:auto;flex:1;min-width:120px;max-width:670px;}
.pl-quickadd-form .pl-x{font-size:11.5px;}
.pl-add{text-align:center;border:1px dashed var(--border2);border-radius:var(--radius-sm);padding:8px;color:var(--text3);font-size:12px;font-weight:700;cursor:pointer;margin-top:8px;}
.pl-add.block{padding:11px;border-color:var(--accent);color:var(--accent);background:var(--accent-light);}
/* "+ 항목 추가"(같은 그룹에 이어쓰기)와 계위를 구분하기 위해, 새 그룹 시작(매체·캠페인)은 강조색
   테두리를 줘서 한 단계 더 무게감을 준다. */
.pl-add.pl-add-group{border-color:var(--accent);color:var(--accent);margin-top:10px;}
.pl-x{text-align:center;color:var(--text3);cursor:pointer;font-size:12px;}
.pl-mini{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;color:var(--text);width:100%;outline:none;}
.pl-pct{text-align:right;font-family:'JetBrains Mono',Consolas,monospace;padding-right:16px;}
.pl-pct-wrap{position:relative;}
.pl-pct-wrap::after{content:'*';position:absolute;top:-3px;right:-2px;color:var(--red);font-size:12px;font-weight:700;}
.pl-pct-wrap .pl-pct-suffix{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text3);pointer-events:none;}
.pl-opt{display:flex;align-items:center;gap:7px;margin-top:9px;padding-top:9px;border-top:1px dashed var(--border);font-size:11.5px;color:var(--text3);cursor:pointer;flex-wrap:wrap;}
.pl-opt b{color:var(--accent);font-weight:700;}
.pl-dot{display:inline-block;width:7px;height:7px;border-radius:50%;}
.pl-dot-g{background:var(--green);}
.pl-dot-o{background:var(--yellow);}
.pl-dot-r{background:var(--red);}
.pl-g-monthly-tbl th,.pl-g-monthly-tbl td{padding:8px 9px;font-size:11.5px;}
`;
  const style = document.createElement('style');
  style.id = 'pl-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════════════════════
// 3-3. 로그 탭 — 필터·검색·아코디언 목록
// ══════════════════════════════════════════════════════════

function _plNormalizeSearch(s) {
  return (s || '').toLowerCase().replace(/[\s\-_.,·/()[\]{}]/g, '');
}
// 공백으로 끊은 각 토큰이 전부 haystack에 있으면 매칭 (AND) — "2026 단비"처럼 여러 조건을 한번에 검색할 수 있게
function _plTokenMatch(hay, rawQuery) {
  const tokens = (rawQuery || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const h = (hay || '').toLowerCase();
  return tokens.every(t => h.includes(t));
}
// log.searchText 는 저장 시 이미 정규화(공백·기호 제거)돼 있으므로, 토큰도 같은 방식으로 정규화해서 비교
function _plTokenMatchNormalized(hayNormalized, rawQuery) {
  const tokens = (rawQuery || '').trim().split(/\s+/).map(_plNormalizeSearch).filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every(t => hayNormalized.includes(t));
}

function _plSellerNames() {
  return [...new Set(SELLER_DATA.map(s => s.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
}
function _plProjectNames() {
  const set = new Set();
  SELLER_DATA.forEach(s => (s.brands || []).forEach(b => { if (b.name) set.add(b.name); }));
  DATA.forEach(c => { if (c.content) set.add(c.content); });
  set.add('브랜드 미지정');
  return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
}
function _plMediaNames() {
  return [...new Set(MEDIA_DATA.map(m => m.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
}
function _plWriterNames() {
  return [...new Set(USERS.map(u => u.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
}
// 이름 목록을 "최근에 일지가 작성된 순"으로 정렬 — 필터 콤보에서 자주 찾는 항목이 위로 오도록.
// 일지가 한 번도 없는 이름은 맨 뒤로 밀리되, 그 안에서는 가나다순 유지.
function _plSortByRecentLog(names, fieldFn) {
  const lastDate = {};
  PL_LOGS.forEach(l => {
    const key = fieldFn(l);
    if (key && (!lastDate[key] || l.logDate > lastDate[key])) lastDate[key] = l.logDate;
  });
  return names.slice().sort((a, b) => {
    const da = lastDate[a], db = lastDate[b];
    if (da && db) return db.localeCompare(da);
    if (da) return -1;
    if (db) return 1;
    return a.localeCompare(b, 'ko');
  });
}
function _plSellerNamesRecent()  { return _plSortByRecentLog(_plSellerNames(),  l => l.seller); }
function _plProjectNamesRecent() { return _plSortByRecentLog(_plProjectNames(), l => l.content); }
function _plMediaNamesRecent()   { return _plSortByRecentLog(_plMediaNames(),   l => l.media); }

function plSwitchTab(name) {
  PL_STATE.tab = name;
  if (name !== 'advertiser') PL_STATE.advDetailCompany = null;
  if (name !== 'media') PL_STATE.mediaDetailCompany = null;
  if (name !== 'internal') PL_STATE.internalDetailClient = null;
  if (name !== 'date') _plInlineEditId = null; // 다른 탭으로 나가면 인라인 수정 상태도 같이 정리
  _plUpdateTabButtons();
  plRenderActiveTab();
  // 현재 스택 맨 위 항목에 탭 정보를 갱신 — 상세 진입 후 뒤로가기 시 이 탭의 목록으로 복원하기 위함 (새 항목을 쌓지는 않음)
  history.replaceState({ screen: 'projectlog', plTab: name }, '', '#projectlog');
}

// onChange: 값이 바뀔 때마다(입력 중 · 목록에서 선택) 호출되는 콜백. 호출부가 자기 화면에 맞는
// 리렌더 함수를 넘겨준다 (이전엔 _plRenderRows()로 고정돼 있어서 H·일자별탭 등 다른 화면에서 쓰면
// 정작 자기 화면은 안 갱신되고 로그탭 DOM만 건드리려던 버그가 있었음).
function _plComboSetup(inputId, listId, sourceFn, onChange) {
  const input = document.getElementById(inputId);
  const list  = document.getElementById(listId);
  if (!input || !list) return;
  const change = typeof onChange === 'function' ? onChange : () => {};
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const items = sourceFn().filter(v => !q || v.toLowerCase().includes(q)); // .combo-list가 자체 스크롤(max-height)이라 개수 제한 불필요
    _plComboNavIndex[listId] = -1;
    if (!items.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
    list.innerHTML = items.map((v, i) => `<div class="combo-item" data-i="${i}">${_escHtml(v)}</div>`).join('');
    list.style.display = 'block';
    // .filter-bar가 overflow-x:auto라, CSS 스펙상 overflow-y도 덩달아 auto로 계산돼 절대위치 드롭다운이
    // 잘려 보인다(모달의 overflow:auto 클리핑과 같은 문제) — position:fixed로 바꿔서 스크롤 상자 밖으로 뺀다.
    _plFloatCombo(input, list);
    list.querySelectorAll('.combo-item').forEach((el, i) => {
      el.addEventListener('mousedown', () => {
        input.value = items[i];
        list.style.display = 'none';
        change();
      });
    });
  };
  input.addEventListener('focus', render);
  input.addEventListener('input', () => { render(); change(); });
  input.addEventListener('keydown', e => _plComboKeyNav(e, listId));
  input.addEventListener('blur', () => setTimeout(() => { list.style.display = 'none'; }, 150));
}

// 일지 탭 작성자 필터 — "나의 일지 > 작성자 모아보기"와 같은 다중 선택 방식이지만, 저건 개인
// 대시보드라 localStorage로 다음에 또 볼 걸 기억해두는 반면, 이건 그때그때 훑어보는 일반 목록
// 필터라 새로고침(또는 메뉴 재진입)하면 리셋되도록 의도적으로 메모리에만 둔다(localStorage 안 씀).
let _plLogWriterFilters = [];
function _plLogRenderWriterChips() {
  const el = document.getElementById('pl-f-writer-chips');
  if (!el) return;
  el.innerHTML = _plLogWriterFilters.map(name =>
    `<span class="tag">${_escHtml(name)}<span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plLogWriterRemove('${_escHtml(name)}')">✕</span></span>`
  ).join('');
}
function _plLogWriterSearchInput(inputEl) {
  const list = document.getElementById('pl-f-writer-list');
  if (!list) return;
  const already = new Set(_plLogWriterFilters);
  const q = (inputEl.value || '').trim().toLowerCase();
  const matched = _plWriterNames().filter(n => !already.has(n) && (!q || n.toLowerCase().includes(q)));
  _plComboNavIndex['pl-f-writer-list'] = -1;
  if (!matched.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.innerHTML = matched.map(n => `<div class="combo-item" onmousedown="_plLogWriterPick('${_escHtml(n)}')">${_escHtml(n)}</div>`).join('');
  list.style.display = 'block';
  _plFloatCombo(inputEl, list);
}
function _plLogWriterPick(name) {
  if (!_plLogWriterFilters.includes(name)) _plLogWriterFilters.push(name);
  const input = document.getElementById('pl-f-writer');
  if (input) input.value = '';
  const list = document.getElementById('pl-f-writer-list');
  if (list) list.style.display = 'none';
  _plLogRenderWriterChips();
  _plPage = 1;
  _plRenderRows();
}
function _plLogWriterRemove(name) {
  _plLogWriterFilters = _plLogWriterFilters.filter(n => n !== name);
  _plLogRenderWriterChips();
  _plPage = 1;
  _plRenderRows();
}

function _plGetFiltered() {
  const q      = document.getElementById('pl-search')?.value || '';
  const dFrom  = document.getElementById('pl-date-from')?.value || '';
  const dTo    = document.getElementById('pl-date-to')?.value   || '';
  const seller = document.getElementById('pl-f-seller')?.value.trim()  || '';
  const project= document.getElementById('pl-f-project')?.value.trim() || '';
  const media  = document.getElementById('pl-f-media')?.value.trim()   || '';
  const type   = document.getElementById('pl-f-type')?.value  || '';
  const scope  = document.getElementById('pl-f-scope')?.value || '';
  const org    = document.getElementById('pl-f-org')?.value   || '';
  const impOnly  = document.getElementById('pl-f-important')?.classList.contains('pl-toggle-on');
  const openOnly = document.getElementById('pl-f-open')?.classList.contains('pl-toggle-on');
  const { bonbu, team } = _parseOrgFilter(org);

  return PL_LOGS.filter(log => {
    if (!_plTokenMatchNormalized(_plNormalizeSearch(log.searchText || ''), q)) return false;
    if (dFrom && (log.logDate || '') < dFrom) return false;
    if (dTo   && (log.logDate || '') > dTo)   return false;
    if (seller  && log.seller  !== seller)  return false;
    if (project && log.content !== project) return false;
    if (media   && log.media   !== media)   return false;
    if (type    && log.logType !== type)    return false;
    if (scope   && log.scope   !== scope)   return false;
    if (_plLogWriterFilters.length && !_plLogWriterFilters.includes(log.writer)) return false;
    if (impOnly  && !log.important) return false;
    if (openOnly && log.state !== '진행중') return false;
    if (bonbu || team) {
      const u = USERS.find(u => u.name === log.writer);
      if (bonbu && (!u || u.bonbu !== bonbu)) return false;
      if (team  && (!u || u.dept  !== team))  return false;
    }
    return true;
  });
}

function _plHighlight(text, rawQuery) {
  const esc = _escHtml(text || '');
  // 필터(_plTokenMatchNormalized)가 공백으로 끊은 토큰을 AND로 매칭하므로, 하이라이트도 전체 문자열을 통째로
  // 찾지 않고 토큰별로 따로 찾아야 한다 — 안 그러면 "단비 이벤트"처럼 두 단어로 검색했을 때 내용에 "이벤트"만
  // 있어도(공백을 사이에 둔 정확한 문자열이 없으므로) 아무것도 표시되지 않는다.
  const tokens = q => q.trim().split(/\s+/).filter(Boolean);
  const escTokens = tokens(rawQuery || '').map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escTokens.length) return esc;
  try {
    return esc.replace(new RegExp(`(${escTokens.join('|')})`, 'gi'), '<span class="pl-mark">$1</span>');
  } catch (e) { return esc; }
}

// 행 전체가 펼침/접힘 토글 영역이라, 내용을 드래그로 선택(복사)하려다 마우스를 떼는 순간 그 자리에서
// click 이벤트가 그대로 또 발생해 카드가 접혀버리는 문제가 있었다 — 드래그해서 뭔가 선택된 상태로
// 클릭이 끝났으면 그건 "선택하려던 것"으로 보고 토글을 건너뛴다.
function _plToggleRowGuarded(event, id, ctx) {
  const sel = window.getSelection ? String(window.getSelection()) : '';
  if (sel.trim()) return;
  _plToggleRow(id, ctx);
}
function _plToggleRow(id, ctx) {
  if (_plExpanded.has(id)) _plExpanded.delete(id); else _plExpanded.add(id);
  _plRerenderByCtx(ctx);
}
// _plToggleRow와 "+ㄴ 추가" 미니폼(quick-add)이 공통으로 쓰는, ctx별로 맞는 화면만 다시 그리는 디스패처.
function _plRerenderByCtx(ctx) {
  if (ctx === 'gdaily') { _plGRenderDaily(); return; }
  if (ctx === 'mediadaily') { plRenderMediaTab(); return; }
  if (ctx === 'camp') { _plRenderCampaignLogModal(_plCampLogCurrentId, _plCampLogLastData, _plCampLogLastIsDeleted, _plCampLogLastNotFound); return; }
  if (ctx === 'date') { _plRenderDateBody(); return; }
  if (ctx === 'mine' || ctx === 'minemention' || ctx === 'minecommented' || ctx === 'mineuser') { _plRenderMineBody(); return; }
  if (ctx === 'internal') { plRenderInternalTab(); return; }
  _plRenderRows();
}
function _plExpandAll(on) {
  if (on) PL_LOGS.forEach(l => _plExpanded.add(l.id));
  else _plExpanded.clear();
  _plRenderRows();
}
function _plGExpandAll(on) {
  if (on) PL_LOGS.forEach(l => _plExpanded.add(l.id));
  else _plExpanded.clear();
  _plGRenderDaily();
}
function _plToggleBtn(id) {
  document.getElementById(id)?.classList.toggle('pl-toggle-on');
  _plPage = 1;
  _plRenderRows();
}
function _plGoPage(p) { _plPage = p; _plRenderRows(); }

function plResetLogFilter() {
  ['pl-search', 'pl-date-from', 'pl-date-to', 'pl-f-seller', 'pl-f-project', 'pl-f-media', 'pl-f-writer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const typeEl = document.getElementById('pl-f-type'); if (typeEl) typeEl.value = '';
  const scopeEl = document.getElementById('pl-f-scope'); if (scopeEl) scopeEl.value = '';
  const orgEl  = document.getElementById('pl-f-org');  if (orgEl)  orgEl.value  = '';
  document.getElementById('pl-f-important')?.classList.remove('pl-toggle-on');
  document.getElementById('pl-f-open')?.classList.remove('pl-toggle-on');
  _plLogWriterFilters = [];
  _plLogRenderWriterChips();
  _plPage = 1;
  _plRenderRows();
}

// 알림의 "일지 보기 →" 지름길 — "나의 일지" 탭에서 해당 로그를 찾아 펼치고 스크롤한다. 알림을 받는
// 사람은 항상 작성자·멘션 대상 중 하나라(알림 발송 로직 자체가 이 둘에게만 감), 그 로그는
// 100% "나의 일지"의 두 섹션 중 하나에 있다는 게 보장된다 — "일지" 탭(페이지네이션 필요)보다 단순하다.
// 최근 구독 범위보다 오래된 로그일 수 있어 전체를 미리 열어두고(_plEnsureFullyLoaded), 렌더 후 실제로
// 그 행이 DOM에 나타났는지 확인하며 도착할 때까지 짧게 재시도한다(댓글 멘션 목록은 별도 구독이라 로그
// 자체보다 늦게 도착할 수 있어서, PL_LOGS 존재 여부만으로는 부족함).
async function plJumpToLog(logId) {
  if (!logId) return;
  const onScreen = document.getElementById('screen-projectlog')?.classList.contains('active');
  // skipPush=true 필수 — false로 부르면 location.hash 변경이 hashchange 리스너를 다시 트리거해
  // goScreen('projectlog', true)가 한 번 더 실행되고, 그때는 _plPendingTab이 이미 null로 소비돼서
  // 'date' 탭(오늘)으로 덮어써버린다. 다른 화면에 있다가 점프할 때만 재현되던 버그.
  if (!onScreen) { _plPendingTab = 'mine'; goScreen('projectlog', true); }
  else { plSwitchTab('mine'); }
  _plEnsureFullyLoaded();
  const searchEl = document.getElementById('pl-mine-search');
  if (searchEl) searchEl.value = '';
  let tries = 0;
  const tryScroll = () => {
    // 서브탭 하나만 렌더되므로, 로그가 로딩된 뒤에는 그게 속한 쪽(작성/관련·멘션)으로 미리 전환해둬야
    // 엉뚱한 탭을 보고 있다가 못 찾는 일이 없다.
    const log = PL_LOGS.find(l => l.id === logId);
    if (log) {
      _plMineSubTab = (log.writerId === currentUser?.id) ? 'written' : 'involved';
      document.getElementById('pl-mine-vt-written')?.classList.toggle('active', _plMineSubTab === 'written');
      document.getElementById('pl-mine-vt-involved')?.classList.toggle('active', _plMineSubTab === 'involved');
    }
    _plExpanded.add(logId);
    _plRenderMineBody();
    const rowEl = document.getElementById(`pl-row-${logId}`);
    if (!rowEl) {
      if (++tries < 15) { setTimeout(tryScroll, 300); }
      else toast('일지를 찾을 수 없습니다(삭제되었을 수 있습니다)', 'err');
      return;
    }
    setTimeout(() => {
      rowEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      rowEl.classList.add('pl-jump-flash');
      setTimeout(() => rowEl.classList.remove('pl-jump-flash'), 1500);
    }, 60);
  };
  setTimeout(tryScroll, 200);
}

// 페이지가 많을 때(예: 26페이지) 10개씩 그룹으로 나눠 보여준다: <1~10> / <11~20> ... — script.js 캠페인 목록의
// pg-btns(PG_WIN=10, prevPageGroup/nextPageGroup)과 동일한 패턴. ‹/›는 한 페이지가 아니라 그룹 전체를 넘긴다.
function _plPageBtnsHtml(page, totalPages, goFn) {
  if (totalPages <= 1) return '';
  const PG_WIN = 10;
  const curGroup = Math.ceil(page / PG_WIN);
  const totalGroups = Math.ceil(totalPages / PG_WIN);
  const groupStart = (curGroup - 1) * PG_WIN + 1;
  const groupEnd = Math.min(curGroup * PG_WIN, totalPages);
  let mid = '';
  for (let p = groupStart; p <= groupEnd; p++) {
    mid += `<span class="pg-btn${p === page ? ' active' : ''}" onclick="${goFn}(${p})">${p}</span>`;
  }
  const prevBtn = `<span class="pg-btn${curGroup <= 1 ? ' disabled' : ''}"${curGroup > 1 ? ` onclick="${goFn}(${groupStart - 1})"` : ''}>‹</span>`;
  const nextBtn = `<span class="pg-btn${curGroup >= totalGroups ? ' disabled' : ''}"${curGroup < totalGroups ? ` onclick="${goFn}(${groupEnd + 1})"` : ''}>›</span>`;
  return `${prevBtn}${mid}${nextBtn}`;
}
function _plBuildPagination(total, page, totalPages) {
  const start = total === 0 ? 0 : (page - 1) * PL_PAGE_SIZE + 1;
  const end   = Math.min(page * PL_PAGE_SIZE, total);
  return `<span class="pg-info">${start}~${end} / ${total}건</span><div class="pg-btns">${_plPageBtnsHtml(page, totalPages, '_plGoPage')}</div>`;
}

// 삭제는 수정보다 되돌리기 어려운(연결된 이슈 스레드가 끊기는 등) 액션이라 작성자·관리자로 좁게 유지.
function _plCanDeleteLog(log) {
  return !!(currentUser?.isAdmin || log.writerId === currentUser?.id);
}
// 수정은 팀이 같이 관리하는 기록이라는 전제로 로그인한 사람 전부에게 개방 — 누가 뭘 바꿨는지는
// 삭제와 달리 변경 이력(projectLogHistory)에 필드 단위로 항상 남으니 사고 나면 추적 가능.
function _plCanEditLog(log) {
  return !!currentUser;
}

// 링크 태그는 원본 URL을 그대로 onclick에 박아넣으면 따옴표 포함 시 마크업이 깨질 수 있어,
// logId+인덱스로 찾아서 여는 방식(다른 _pl* 콤보 함수들과 동일 패턴)을 쓴다.
function _plNormalizeLinkUrl(url) {
  url = (url || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}
function _plOpenDetailLink(logId, li) {
  const log = PL_LOGS.find(x => x.id === logId);
  const url = _plNormalizeLinkUrl(log?.links?.[li]?.url || log?.links?.[li]?.label);
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}
// 경로에 따옴표·백슬래시가 섞여있을 수 있어(공유폴더 UNC 경로) onclick에 그대로 박아넣지 않고
// logId로 찾아서 읽는다 — _plOpenDetailLink와 동일한 이유.
function _plCopyAttachPath(logId) {
  const log = PL_LOGS.find(x => x.id === logId);
  const val = (log?.attachPath || '').trim();
  if (!val) return;
  navigator.clipboard?.writeText(val).then(() => toast('경로를 복사했습니다', 'ok')).catch(() => toast('복사에 실패했습니다', 'err'));
}

// imageCount는 이 필드가 생기기 전에 저장된 과거 로그엔 없다(undefined) — 이미지는 별도 컬렉션이라
// 실제 개수를 알려면 조회가 필요한데, 목록의 모든 항목을 미리 조회하면 느려지므로 개수를 모르는
// 항목만 백그라운드로 조회해 배지를 채워 넣는다. 한 번 조회한 로그는 재조회하지 않는다.
// 같은 로그가 요약줄(pl-imgcnt-)과 펼친 상세박스(pl-detimgcnt-)에 동시에 떠 있을 수 있어 둘 다 갱신한다.
const _plImageCountFetched = new Set();
function _plEnsureImageCountBadge(logId) {
  if (_plImageCountFetched.has(logId)) return;
  _plImageCountFetched.add(logId);
  _plGetLogImages(logId).then(images => {
    const log = PL_LOGS.find(x => x.id === logId);
    if (log) log.imageCount = images.length;
    ['pl-imgcnt-', 'pl-detimgcnt-'].forEach(prefix => {
      const el = document.getElementById(`${prefix}${logId}`);
      if (el) el.textContent = `📁${images.length || ''}`;
    });
  });
}
// 상세 박스 본체 — 로그 탭 테이블 행뿐 아니라 일자별 뷰의 인라인 펼침에서도 그대로 재사용한다.
// 두 화면이 서로 다른 UI(모달 vs 펼침)를 쓰면 헷갈린다는 피드백에 따라, 펼쳤을 때 보이는 모습을 통일했다.
// compact=true(일자별 뷰 전용) — 요약·하위기록·이슈/해결 역링크는 접힌 줄에 이미 나와 있어 중복이라 빼고,
// 이미지·링크·수정버튼(.pl-detfoot)과 댓글만 보여준다.
function _plDetailBoxHtml(log, q, compact, readOnly) {
  const links = (log.links || []).map((l, li) => `<span class="tag" style="cursor:pointer;" onclick="event.stopPropagation();_plOpenDetailLink('${log.id}',${li})" title="새 탭에서 열기">🔗 ${_escHtml(l.label || l.url || '')}</span>`).join(' ');
  if (log.hasImages && log.imageCount == null) _plEnsureImageCountBadge(log.id);
  const imgNote = log.hasImages ? `<span id="pl-detimgcnt-${log.id}" class="pl-thumb" style="cursor:zoom-in;" onclick="event.stopPropagation();_plOpenLogImages('${log.id}')" title="첨부 이미지 — 클릭하여 보기">📁${log.imageCount || ''}</span>` : '';
  // hover 없이도 어떤 캠페인인지 바로 알 수 있게 "c-2026-0000(매체명 상품명)" 형태로 풀어서 표기.
  const refCampHtml = (log.refCampaignIds || []).map(cid => {
    const c = DATA.find(x => x.id === cid);
    const sub = c ? `(${[c.media, c.product].filter(Boolean).join(' ')})` : '';
    return `<span class="tag pl-ref" style="cursor:pointer;" onclick="event.stopPropagation();openCalPreview(DATA.findIndex(d=>d.id==='${_escHtml(cid)}'))">🔗 ${_escHtml(cid)}${_escHtml(sub)}</span>`;
  }).join(' ');
  const attachParts = [log.attachPath, log.attachName].filter(Boolean).map(_escHtml).join(' / ');
  const attachPathHtml = attachParts
    ? `<span class="tag">📁 ${attachParts}${log.attachPath ? ` <span class="pl-x" style="display:inline;margin-left:2px;" onclick="event.stopPropagation();_plCopyAttachPath('${log.id}')">경로복사</span>` : ''}</span>`
    : '';
  const hasAttach = links || imgNote || refCampHtml || attachPathHtml;
  const color = (PL_TYPE_COLOR[log.logType] || {}).fg || 'var(--border)';
  // 목록의 삭제 버튼은 없애고 수정 모달 안의 삭제 버튼으로 통일 — 수정/삭제 모달 하나로 합쳐서 진입점을 단순화
  // 진행중 이슈는 대응 기록 버튼을 pl-detfoot 안에 보여준다 — 완료 처리는 그 모달 안 체크박스로 흡수돼서
  // (버튼 두 개였던 걸 하나로 합침) 이슈 → 대응(여러 번) → 해결이 한 세트로 남는 구조는 그대로 유지된다.
  const responseHtml = (log.state === '진행중' && !readOnly)
    ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();plOpenResponseModal('${log.id}')">+ 대응 기록</button>`
    : '';
  // compact(일자별 뷰)는 모달을 열지 않고 그 자리에서 바로 수정 폼으로 바뀌는 인라인 수정을 쓴다.
  const editBtnHtml = readOnly ? '' : `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();${compact ? `_plDateStartInlineEdit('${log.id}')` : `plOpenEdit('${log.id}')`}">수정</button>`;
  const detfootHtml = `<div class="pl-detfoot">
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${imgNote}${links}${refCampHtml}${attachPathHtml}${!hasAttach ? '<span class="form-hint">첨부 없음</span>' : ''}</div>
      <div style="display:flex;gap:6px;">${responseHtml}${editBtnHtml}</div>
    </div>`;
  const commentsHtml = `<div data-pl-comments-for="${log.id}" onclick="event.stopPropagation();">${_plCommentsHtml(log.id)}</div>`;
  // 이 로그(주로 이슈)에 달린 대응·해결 기록을 전부 시간순으로 나열 — "+ 대응 기록"을 몇 번 남기다가
  // 마지막에 "완료 처리"로 마무리해도, 전부 threadId로 같은 이슈를 가리키므로(체인이 아니라 방사형)
  // 한 세트로 묶어 보여줄 수 있다. 반대로 이 로그 자체가 대응/해결 기록이면(threadId 보유) 원본 이슈로
  // 가는 역링크를 보여준다. 날짜를 앞에 두고 화살표를 이동 대상 텍스트 바로 뒤에 붙여야 "무엇을 누르면
  // 어디로 가는지"가 헷갈리지 않는다. compact(일자별 뷰)에서도 보여야 해서 조기 return 이전에 계산한다.
  const _plLinkLine = (dateStr, label, text, targetId, action) => {
    const d = _escHtml((dateStr || '').slice(2).replace(/-/g, '.'));
    return `<div class="pl-resolve-link" style="font-size:12px;color:var(--text2);margin-bottom:6px;padding:6px 8px;background:var(--surface2);border-radius:6px;cursor:pointer;" onclick="event.stopPropagation();${action || 'plOpenEdit'}('${targetId}')"><span class="f-mono">${d}</span> · ${label}: ${_escHtml(text || '')} <span style="color:var(--accent);font-weight:600;">보기 →</span></div>`;
  };
  const threadChildren = PL_LOGS.filter(l => l.threadId === log.id)
    .slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  let threadChildrenHtml = '';
  if (threadChildren.length) {
    threadChildrenHtml = `<div style="margin-bottom:6px;">
      <div class="form-hint" style="font-weight:700;margin-bottom:4px;">🔗 관련 기록 (${threadChildren.length})</div>
      ${threadChildren.map(c => _plLinkLine(c.logDate, c.isResolution ? '해결' : '대응', c.summary, c.id, '_plOpenIssueView')).join('')}
    </div>`;
  }
  let threadHtml = '';
  if (log.threadId) {
    const origIssue = PL_LOGS.find(l => l.id === log.threadId);
    if (origIssue) threadHtml = _plLinkLine(origIssue.logDate, '이슈', origIssue.summary, origIssue.id, '_plOpenIssueView');
  }
  // "이어쓰기" 체인 — threadId(이슈-대응-해결, 방사형)와 별개로, continuedFromId는 진척 상황을 그날그날
  // 새 문서로 이어가는 선형 체인이다. 이전 기록(내가 이어쓴 원본)과 이어서 쓴 기록(이 로그를 원본 삼아
  // 또 이어쓴 것들, 실수로 두 번 이어쓰면 여러 개일 수 있어 threadChildren처럼 목록으로 보여준다) 둘 다
  // 계산해서, 위치에 따라 한쪽만 또는 양쪽 다 보여준다.
  let continuePrevHtml = '';
  if (log.continuedFromId) {
    const prevLog = PL_LOGS.find(l => l.id === log.continuedFromId);
    if (prevLog) continuePrevHtml = _plLinkLine(prevLog.logDate, '이전 기록', `${prevLog.summary || ''} (${prevLog.progress != null ? prevLog.progress + '%' : '—'})`, prevLog.id, '_plOpenIssueView');
  }
  const continueNext = PL_LOGS.filter(l => l.continuedFromId === log.id)
    .slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  let continueNextHtml = '';
  if (continueNext.length) {
    continueNextHtml = `<div style="margin-bottom:6px;">
      <div class="form-hint" style="font-weight:700;margin-bottom:4px;">↩ 이어서 쓴 기록 (${continueNext.length})</div>
      ${continueNext.map(c => _plLinkLine(c.logDate, '이어씀', `${c.summary || ''} (${c.progress != null ? c.progress + '%' : '—'})`, c.id, '_plOpenIssueView')).join('')}
    </div>`;
  }
  if (compact) {
    // 일자별 뷰는 작성자를 카드 어디에도 안 보여주는 유일한 화면이라(수정 모달에서만 확인 가능했음),
    // 펼쳤을 때 이 한 줄로 누가·언제 썼는지 + 수정 모달과 같은 이력 보기를 바로 확인할 수 있게 한다.
    const metaHtml = `<div class="form-hint" style="margin-bottom:8px;">${_escHtml(log.writer || '')} · ${_escHtml(log.bonbu || '')} ${_escHtml(log.dept || '')} · <span class="f-mono">${_escHtml(log.logDate || '')}${log.createdAt ? ' ' + _plFmtHHMM(log.createdAt) : ''}</span>
      <span class="pl-x" style="margin-left:6px;" onclick="event.stopPropagation();plOpenHistoryModal('${log.id}')">이력 보기</span>
    </div>`;
    return `<div class="pl-detbox" style="border-left-color:${color};">${metaHtml}${threadHtml}${continuePrevHtml}${threadChildrenHtml}${continueNextHtml}${detfootHtml}${commentsHtml}</div>`;
  }
  const subRowsArr = (log.detail || []).filter(d => (d.text || '').trim());
  const subRows = subRowsArr.length
    ? subRowsArr.map(d => `<span class="pl-m">ㄴ</span><span class="pl-l">${_plHighlight(d.label || '', q)}</span><span style="white-space:pre-line;">${_plHighlight(d.text, q)}</span>`).join('')
    : `<span class="form-hint" style="grid-column:1/-1;">하위 기록이 없습니다.</span>`;
  return `<div class="pl-detbox" style="border-left-color:${color};">
    ${threadHtml}
    ${continuePrevHtml}
    <div style="font-size:13px;font-weight:600;margin-bottom:6px;white-space:pre-line;">${_plHighlight(log.summary || '', q)}</div>
    <div class="pl-lgsub">${subRows}</div>
    ${threadChildrenHtml}
    ${continueNextHtml}
    ${detfootHtml}
    ${commentsHtml}
  </div>`;
}
function _plRenderDetailRow(log, colspan, q) {
  colspan = colspan || 10;
  return `<tr class="pl-lg-det"><td colspan="${colspan}">${_plDetailBoxHtml(log, q)}</td></tr>`;
}
// 대응/해결 기록에서 원본 이슈를 "확인"만 하고 싶을 때 수정 모달(작성 폼)을 여는 대신 쓰는 읽기 전용
// 요약 모달 — 이슈 원문 + 그 이슈에 달린 모든 대응/해결 타임라인(_plDetailBoxHtml의 threadChildrenHtml)을
// 한 화면에서 보여준다. 실제로 손대야 하면 하단 "이슈 수정" 버튼으로 수정 모달로 넘어간다.
// 이슈 자신뿐 아니라 그 밑에 달린 대응/해결 기록을 "확인"만 할 때도 재사용 — 로그 종류에 따라
// 제목만 다르게 표시하고(이슈/대응/해결), 나머지(읽기 전용 상세박스+수정 버튼)는 동일하게 동작한다.
function _plOpenIssueView(logId) {
  const log = PL_LOGS.find(l => l.id === logId);
  if (!log) return;
  if (!document.getElementById('pl-modal-issueview')) _plBuildIssueViewModalShell();
  const typeLabel = log.threadId ? (log.isResolution ? '해결' : '대응') : (log.logType || '이슈');
  const titleEl = document.getElementById('pl-iv-title');
  if (titleEl) titleEl.textContent = `🔍 ${typeLabel} 확인`;
  document.getElementById('pl-iv-body').innerHTML = _plDetailBoxHtml(log, '', false, true);
  const editBtn = document.getElementById('pl-iv-editbtn');
  if (editBtn) editBtn.onclick = () => { closeModal('pl-modal-issueview'); plOpenEdit(logId); };
  openModal('pl-modal-issueview');
}
function _plBuildIssueViewModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-issueview';
  overlay.innerHTML = `
    <div class="modal" style="width:640px;max-width:96vw;">
      <div class="modal-head">
        <span class="modal-title" id="pl-iv-title">🔍 이슈 확인</span>
        <button class="modal-close" onclick="closeModal('pl-modal-issueview')">✕</button>
      </div>
      <div class="modal-body" style="background:var(--bg);max-height:70vh;overflow-y:auto;" id="pl-iv-body"></div>
      <div class="modal-foot">
        <button class="btn btn-outline" id="pl-iv-editbtn">✎ 수정</button>
        <button class="btn btn-primary" onclick="closeModal('pl-modal-issueview')">닫기</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ── 이슈 대응 기록 / 완료 처리 — 원본 이슈 state를 조용히 덮어쓰는 대신, 대응·해결 내용을 별도
// 로그(threadId로 원본 연결)로 남겨서 "이슈 → 대응 → 대응 → 해결"이 추적 가능한 한 세트로 남게 한다.
// threadId는 기존 스키마에 있던 미사용 필드를 재활용. 체인이 아니라 방사형 — 대응이 몇 개든 전부
// threadId가 원본 이슈 하나를 가리키므로 조회가 단순하다(PL_LOGS.filter(l=>l.threadId===이슈ID)).
// 대응·해결도 이미지/링크 첨부가 필요할 수 있어서, 단순 textarea 모달 대신 수정 모달(pl-modal-edit)
// 을 그대로 재사용한다 — _plEditDraft.newFor에 {parentId}를 넣어두면 plSaveEdit()이 "기존 로그 수정" 대신
// "새 로그 생성"으로 분기한다. 대응/완료는 예전엔 버튼 두 개(모드가 열 때 고정)였는데, 저장 시점에 체크박스
// (resolveChecked)로 결정하도록 합쳐서 버튼 하나("+ 대응 기록")로도 완료 처리까지 가능하게 했다.
function plOpenResponseModal(logId) { _plOpenResponseDraft(logId); }
function _plOpenResponseDraft(parentId) {
  const orig = PL_LOGS.find(l => l.id === parentId);
  if (!orig) { toast('일지를 찾을 수 없습니다', 'err'); return; }
  _plEditDraft = {
    id: null, logDate: _plTodayStr(), writer: currentUser?.name || '', writerId: currentUser?.id || '',
    bonbu: currentUser?.bonbu || '', dept: currentUser?.dept || '', createdAt: null,
    scope: orig.scope, seller: orig.seller, content: orig.content,
    campaignId: orig.campaignId, media: orig.media, product: orig.product,
    logType: '대응', summary: '', progress: null,
    detail: [], links: [], images: [],
    important: false, shared: false, state: null, searchQuery: '',
    resolveChecked: false,
    newFor: { parentId },
  };
  if (!document.getElementById('pl-modal-edit')) _plBuildEditModalShell();
  _plRenderEditModal();
  openModal('pl-modal-edit');
}
async function _plSaveNewResponse() {
  const d = _plEditDraft;
  const { parentId } = d.newFor;
  const mode = d.resolveChecked ? 'resolve' : 'response';
  const orig = PL_LOGS.find(l => l.id === parentId);
  if (!orig) { toast('원본을 찾을 수 없습니다', 'err'); return; }
  if (!(d.summary || '').trim()) { alert('내용을 입력해주세요.'); return; }
  if ((d.summary || '').length > 60) { alert('내용은 60자 이하로 입력해주세요.'); return; }
  if (d.progress === '' || d.progress == null) { alert('진척률을 입력해주세요.'); return; }
  {
    const p = Number(d.progress);
    if (isNaN(p) || p < 0 || p > 100) { alert('진척률은 0~100 사이여야 합니다.'); return; }
  }
  const saveBtn = document.querySelector('#pl-modal-edit .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중…'; }
  try {
    const detail = (d.detail || []).filter(x => (x.text || '').trim()).map(x => ({ label: x.label || '', text: x.text.trim() }));
    const progress = (d.progress === '' || d.progress == null) ? null : Math.max(0, Math.min(100, parseInt(d.progress, 10) || 0));
    const images = (d.images || []).filter(Boolean);
    const now = new Date().toISOString();
    const newDoc = {
      id: _plNextLogIdSeq()(),
      logDate: _plTodayStr(), writer: currentUser?.name || '', writerId: currentUser?.id || '',
      bonbu: currentUser?.bonbu || '', dept: currentUser?.dept || '',
      scope: d.scope, seller: d.seller || null, content: d.content || null,
      campaignId: d.campaignId || null, media: d.media || null, product: d.product || null,
      logType: d.logType || '대응', state: null, isResolution: mode === 'resolve',
      summary: d.summary.trim().slice(0, 60), detail, progress,
      important: !!d.important, shared: !!d.shared,
      hasImages: images.length > 0, imageCount: images.length,
      links: (d.links || []).filter(l => (l.label || l.url || '').trim()),
      threadId: parentId, createdAt: now, updatedAt: now,
    };
    newDoc.searchText = _plBuildSearchText(newDoc);
    await _plDb('projectLogs').doc(newDoc.id).set(newDoc);
    await _plLogHistoryCreate(newDoc.id);
    if (images.length) await _plSaveLogImages(newDoc.id, images);

    if (mode === 'resolve') {
      const updatedOrig = Object.assign({}, orig, { state: '완료', updatedAt: now });
      await _plDb('projectLogs').doc(orig.id).set(updatedOrig);
      await _plDb('projectLogHistory').add({
        logId: orig.id, changedBy: currentUser?.name || '', changedAt: now,
        changes: [{ field: 'state', label: '상태', before: '진행중', after: '완료' }],
      });
    }
    if (orig.writerId && orig.writerId !== currentUser?.id) {
      const subject = _plNotifySubject(orig);
      if (mode === 'resolve') {
        _fbSaveNotification(orig.writerId, 'pl_resolved', `${currentUser?.name || ''}님이 "${subject}" ${orig.logType} 일지를 완료 처리했습니다.`, { logId: orig.id });
      } else {
        _fbSaveNotification(orig.writerId, 'pl_response', `${currentUser?.name || ''}님이 "${subject}" 이슈에 대응을 기록했습니다: ${newDoc.summary.slice(0, 40)}`, { logId: orig.id });
      }
    }
    closeModal('pl-modal-edit');
    toast(mode === 'resolve' ? '✓ 완료 처리되었습니다' : '✓ 대응이 기록되었습니다', 'ok');
  } catch (e) {
    console.error('[projectlog] 저장 실패', e);
    toast('저장 중 오류가 발생했습니다', 'err');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
  }
}

// ── 댓글 UI (로그 아코디언 공통 — 로그탭·G·D 전부 공유) ──
// "@이름"으로 등장하는 부분을 강조 표시 — 긴 이름부터 매칭해야 짧은 이름이 긴 이름의 일부를 잘못 잡아채지 않는다.
function _plHighlightMentions(text) {
  let html = _escHtml(text || '');
  const names = [...new Set(USERS.map(u => u.name).filter(Boolean))].sort((a, b) => b.length - a.length);
  names.forEach(name => {
    const marker = '@' + _escHtml(name);
    if (html.includes(marker)) html = html.split(marker).join(`<span style="color:var(--accent);font-weight:700;">${marker}</span>`);
  });
  return html;
}
// 댓글 텍스트에서 "@이름"을 실제 USERS와 대조해 멘션 대상을 뽑는다 — 드롭다운으로 골랐든 직접 타이핑했든
// 결과는 마지막 텍스트 하나로 판단하므로(별도 상태를 안 두므로) 수정/삭제해도 항상 최신 텍스트와 일치한다.
function _plParseMentions(text) {
  const names = [...new Set(USERS.map(u => u.name).filter(Boolean))].sort((a, b) => b.length - a.length);
  let remaining = text || '';
  const found = [];
  const seen = new Set();
  names.forEach(name => {
    const marker = '@' + name;
    if (remaining.includes(marker)) {
      const u = USERS.find(x => x.name === name);
      if (u && !seen.has(u.id)) { seen.add(u.id); found.push({ id: u.id, name }); }
      remaining = remaining.split(marker).join('');
    }
  });
  return found;
}
// 멘션 검색 결과 정렬 — 사용자관리 목록(_renderUserMgmtList, script.js)과 동일하게
// 직급 → 본부 → 팀 → 이름(가나다) 순으로 맞춘다.
function _plCompareUsersOrg(a, b) {
  const bonbuIdx = u => { const i = ORG_STRUCTURE.findIndex(o => o.bonbu === u.bonbu); return i < 0 ? 99 : i; };
  const deptIdx = u => { const o = ORG_STRUCTURE.find(o => o.bonbu === u.bonbu); if (!o) return 99; const i = o.teams.indexOf(u.dept); return i < 0 ? 99 : i; };
  const rankIdx = u => RANK_LEVEL[u.rank || '일반'] ?? 99;
  return rankIdx(a) - rankIdx(b) || bonbuIdx(a) - bonbuIdx(b) || deptIdx(a) - deptIdx(b) || (a.name || '').localeCompare(b.name || '', 'ko');
}
// 댓글 입력창의 "@" 멘션 자동완성 — 검색 콤보와 같은 언어(combo-list)를 재사용
function _plCommentMentionInput(logId, inputEl) {
  const listId = `pl-cm-mention-list-${logId}`;
  const list = document.getElementById(listId);
  if (!list) return;
  const pos = inputEl.selectionStart;
  const m = inputEl.value.slice(0, pos).match(/@([^\s@]*)$/);
  _plComboNavIndex[listId] = -1;
  if (!m) { list.style.display = 'none'; return; }
  const q = m[1].toLowerCase();
  const matched = USERS.filter(u => u.name && u.name.toLowerCase().includes(q)).sort(_plCompareUsersOrg);
  if (!matched.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.innerHTML = matched.map(u => `<div class="combo-item" onmousedown="_plCommentMentionPick('${logId}','${u.id}')">${_escHtml(u.name)}</div>`).join('');
  list.style.display = 'block';
  _plFloatCombo(inputEl, list);
}
function _plCommentMentionPick(logId, userId) {
  const input = document.getElementById(`pl-cm-in-${logId}`);
  const list = document.getElementById(`pl-cm-mention-list-${logId}`);
  const u = USERS.find(x => x.id === userId);
  if (!input || !u) return;
  const pos = input.selectionStart;
  const val = input.value;
  const m = val.slice(0, pos).match(/@([^\s@]*)$/);
  if (!m) return;
  const inserted = `@${u.name} `;
  input.value = val.slice(0, m.index) + inserted + val.slice(pos);
  const newPos = m.index + inserted.length;
  input.focus();
  input.setSelectionRange(newPos, newPos);
  if (list) list.style.display = 'none';
}
function _plCommentsHtml(logId) {
  const comments = PL_COMMENTS.filter(c => c.logId === logId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const rows = comments.map(c => {
    const canDel = !!(currentUser?.isAdmin || c.writerId === currentUser?.id);
    const when = _plFmtDateTimeLocal(c.createdAt);
    return `<div style="display:flex;gap:8px;align-items:baseline;padding:4px 0;font-size:12px;">
      <span style="font-weight:700;color:var(--text2);white-space:nowrap;">${_escHtml(c.writer || '')}</span>
      <span class="form-hint f-mono" style="white-space:nowrap;">${_escHtml(when)}</span>
      <span style="flex:1;">${_plHighlightMentions(c.content)}</span>
      ${canDel ? `<span class="pl-x" onclick="plDeleteComment('${c.id}')">삭제</span>` : ''}
    </div>`;
  }).join('');
  return `<div style="border-top:1px dashed var(--border);margin-top:9px;padding-top:8px;">
    <div class="form-hint" style="font-weight:700;margin-bottom:4px;">💬 댓글 ${comments.length}</div>
    ${rows}
    <div style="display:flex;gap:6px;margin-top:6px;">
      <div class="combo-wrap" style="flex:1;">
        <input type="text" class="pl-mini" id="pl-cm-in-${logId}" placeholder="댓글을 입력하세요 (@이름으로 멘션)" maxlength="500"
          oninput="_plCommentMentionInput('${logId}',this)"
          onkeydown="if(_plComboKeyNav(event,'pl-cm-mention-list-${logId}'))return;if(event.key==='Enter'){plAddComment('${logId}');}"
          onblur="setTimeout(()=>{const l=document.getElementById('pl-cm-mention-list-${logId}');if(l)l.style.display='none';},150)">
        <div class="combo-list" id="pl-cm-mention-list-${logId}" style="display:none;"></div>
      </div>
      <button class="btn btn-outline btn-sm" style="flex-shrink:0;" onclick="plAddComment('${logId}')">등록</button>
    </div>
  </div>`;
}
// 알림 본문에 쓸 "대상" 표기 — 광고주/프로젝트, 매체, 내부업무 등 scope별로 자연스럽게
function _plNotifySubject(log) {
  if (log.scope === 'project' && log.content) return `${log.seller || ''} / ${log.content}`;
  if (log.scope === 'campaign') return `${log.seller || ''} / ${log.content || '브랜드 미지정'} / ${log.campaignId || ''}`;
  return log.seller || log.media || '';
}

async function plAddComment(logId) {
  const input = document.getElementById(`pl-cm-in-${logId}`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;
  if (content.length > 500) { toast('댓글은 500자까지 입력할 수 있습니다', 'err'); return; }
  try {
    const mentions = _plParseMentions(content);
    const ref = _plDb('projectLogComments').doc();
    await ref.set({ id: ref.id, logId, writer: currentUser?.name || '', writerId: currentUser?.id || '', content, mentions, createdAt: new Date().toISOString() });
    input.value = '';
    const mentionListEl = document.getElementById(`pl-cm-mention-list-${logId}`);
    if (mentionListEl) mentionListEl.style.display = 'none';
    const log = PL_LOGS.find(l => l.id === logId);
    const notified = new Set([currentUser?.id]);
    // 알림 ① 댓글 — 로그 작성자 본인 댓글이 아닐 때만
    if (log && log.writerId && !notified.has(log.writerId)) {
      const subject = _plNotifySubject(log);
      _fbSaveNotification(log.writerId, 'pl_comment', `${currentUser?.name || ''}님이 "${subject}" 일지에 댓글을 남겼습니다: ${content.slice(0, 40)}`, { logId });
      notified.add(log.writerId);
    }
    // 알림 ⑤ 멘션 — 댓글 알림을 이미 받은 사람(작성자·본인)에게는 중복 발송하지 않음
    mentions.filter(m => !notified.has(m.id)).forEach(m => {
      const subject = log ? _plNotifySubject(log) : '';
      _fbSaveNotification(m.id, 'pl_mention', `${currentUser?.name || ''}님이 "${subject}" 일지 댓글에서 회원님을 멘션했습니다: ${content.slice(0, 40)}`, { logId });
      notified.add(m.id);
    });
  } catch (e) {
    console.error('[projectlog] 댓글 등록 실패', e);
    toast('댓글 등록 중 오류가 발생했습니다', 'err');
  }
}
async function plDeleteComment(commentId) {
  const c = PL_COMMENTS.find(x => x.id === commentId);
  if (!c) return;
  if (!(currentUser?.isAdmin || c.writerId === currentUser?.id)) { toast('삭제 권한이 없습니다', 'err'); return; }
  if (!confirm('이 댓글을 삭제하시겠습니까?')) return;
  try {
    await _plDb('projectLogComments').doc(commentId).delete();
  } catch (e) {
    console.error('[projectlog] 댓글 삭제 실패', e);
    toast('삭제 중 오류가 발생했습니다', 'err');
  }
}

// 이 캠페인에 걸린 일지 전부 — 직접 등록(campaignId)뿐 아니라 참조 태그(refCampaignIds)로만 걸린
// 것도 포함한다. "기록 유무" 필터·정렬·카운트가 참조만 있는 캠페인을 "기록없음"으로 잘못 보여주면
// 캠페인 상세 로그 모달(참조로 걸린 일지 섹션)과 어긋나므로, 캠페인 목록 탭도 이 기준을 같이 쓴다.
function _plCampaignLogsAll(campaignId) {
  return PL_LOGS.filter(l => l.campaignId === campaignId || (l.refCampaignIds || []).includes(campaignId));
}

// 참조 캠페인 배지 — 목록/상세 어디서든 "이 로그가 이 캠페인들에도 참조로 걸려있다"를 짧게 보여주고,
// 마우스를 올리면 어떤 캠페인인지 풀네임(id+매체+상품)으로 확인 가능. 네이티브 title 대신 이 코드베이스의
// 공용 말풍선(style.css의 [data-tooltip])을 쓴다 — title은 브라우저에 따라 안 뜨는 경우가 있었음.
function _plRefCampBadgeHtml(log) {
  const ids = log.refCampaignIds || [];
  if (!ids.length) return '';
  const tip = ids.map(id => {
    const c = DATA.find(x => x.id === id);
    return c ? `${id} (${[c.media, c.product].filter(Boolean).join(' ')})` : id;
  }).join(', ');
  return ` <span class="tag pl-ref" style="cursor:default;" data-tooltip="참조 캠페인: ${_escHtml(tip)}">🔗${ids.length}</span>`;
}
// "이어쓰기" 체인 힌트 배지 — 표·일자별 뷰의 접힌 행에서는 계단식으로 그리지 않고(정렬·필터가
// 걸리면 체인끼리 인접하지 않을 수 있어서) 존재만 짧게 알려준다. 실제 이전/다음 기록 링크는
// 펼쳤을 때 _plDetailBoxHtml 안에서 확인한다.
function _plContinueChainBadgeHtml(log) {
  const hasPrev = !!log.continuedFromId;
  const hasNext = PL_LOGS.some(l => l.continuedFromId === log.id);
  if (!hasPrev && !hasNext) return '';
  const tip = hasPrev && hasNext ? '이어쓰기 체인의 일부 — 펼치면 이전·다음 기록 링크가 보입니다'
    : hasPrev ? '이어쓰기 체인의 일부 — 펼치면 이전 기록 링크가 보입니다'
    : '이어쓰기 체인의 일부 — 펼치면 다음 기록 링크가 보입니다';
  return ` <span class="tag pl-ref" style="cursor:default;" data-tooltip="${_escHtml(tip)}">↩</span>`;
}
// 참조 캠페인들의 매체로 "매체" 표기를 판단한다(직접 입력한 매체가 없을 때만 호출됨) — 전부 같은
// 매체면 그 이름 하나로, 서로 다르면 하나로 대표할 수 없으니 매체명을 다 나열해서 보여준다. 일지 view
// 표의 매체 칸(_plRefCampMediaCellHtml)과 일자별 뷰의 매체 태그(_plDateItemHtml)가 이 판단을 공유한다.
function _plResolveRefMedia(log) {
  const ids = log.refCampaignIds || [];
  if (!ids.length) return null;
  const medias = [...new Set(ids.map(id => DATA.find(c => c.id === id)?.media).filter(Boolean))];
  if (!medias.length) return null;
  return {
    name: medias.join('·'),
    tooltip: medias.length === 1 ? `참조 캠페인 ${ids.length}건에서 판단` : '참조 캠페인마다 매체가 달라 전부 표시',
  };
}
function _plRefCampMediaCellHtml(log) {
  const r = _plResolveRefMedia(log);
  return r ? `<span class="tag pl-media" data-tooltip="${_escHtml(r.tooltip)}">${_escHtml(r.name)}</span>` : '<span class="td-dim">—</span>';
}

function _plRenderLogRow(log, q, ctx) {
  ctx = ctx || 'log';
  const isOpen = _plExpanded.has(log.id);
  const arrow = isOpen ? '▾' : '▸';
  const dateShort = (log.logDate || '').slice(2).replace(/-/g, '.');

  let sellerCell, projCell, campCell, mediaCell;
  if (log.scope === 'internal') {
    sellerCell = `${_escHtml(log.seller || '—')} <span class="tag pl-inner">내부</span>`;
    projCell = log.content ? `<span class="tag">${_escHtml(log.content)}</span>` : '<span class="td-dim">—</span>';
    campCell = '<span class="td-dim">—</span>';
    mediaCell = '<span class="td-dim">—</span>';
  } else if (log.scope === 'media') {
    sellerCell = '<span class="td-dim">—</span>';
    projCell = '<span class="td-dim">—</span>';
    campCell = '<span class="td-dim">매체 전반</span>';
    mediaCell = log.media ? `<span class="tag pl-media">${_escHtml(log.media)}</span>` : '<span class="td-dim">—</span>';
  } else {
    sellerCell = _escHtml(log.seller || '—');
    projCell = log.content ? `<span class="tag pl-brand">${_escHtml(log.content)}</span>` : '<span class="tag pl-muted">브랜드 미지정</span>';
    if (log.scope === 'campaign' && log.campaignId) {
      campCell = `<span class="pl-click f-mono td-num" onclick="event.stopPropagation();openCalPreview(DATA.findIndex(d=>d.id==='${_escHtml(log.campaignId)}'))">${_escHtml(log.campaignId)}</span>`;
    } else if (log.scope === 'project') {
      campCell = `<span class="td-dim">프로젝트 전반</span>${_plRefCampBadgeHtml(log)}`;
    } else {
      campCell = `<span class="td-dim">광고주 전반</span>${_plRefCampBadgeHtml(log)}`;
    }
    // 직접 입력한 매체가 없으면 참조 캠페인들의 매체로 판단해서 채운다(_plRefCampMediaCellHtml).
    mediaCell = log.media ? `<span class="tag pl-media">${_escHtml(log.media)}</span>` : _plRefCampMediaCellHtml(log);
  }

  const contentHtml = _plHighlight(log.summary, q);
  const starHtml  = log.important ? '<span class="pl-star">★</span> ' : '';
  const cmtBadgeHtml = `<span id="pl-cmt-badge-${log.id}">${_plCommentBadgeHtml(log.id)}</span>`;
  const stateHtml = log.state === '진행중' ? ' <span class="pl-st-open">진행중</span>' : (log.state === '완료' ? ' <span class="pl-st-done">완료</span>' : '');
  const isLate = !!(log.logDate && log.createdAt && Math.abs((new Date(log.createdAt) - new Date(log.logDate)) / 86400000) >= 3);
  const lateHtml = isLate ? ' <span class="pl-st-late">소급</span>' : '';
  // 내용 첫 줄 끝에 첨부/링크 여부만 아이콘으로 표시 — 펼치지 않아도 있는지 정도는 바로 보이게
  if (log.hasImages && log.imageCount == null) _plEnsureImageCountBadge(log.id);
  const attachIconsHtml = (log.hasImages ? `<span id="pl-imgcnt-${log.id}" style="cursor:zoom-in;font-size:11px;margin-left:4px;" onclick="event.stopPropagation();_plOpenLogImages('${log.id}')" title="첨부 이미지 — 클릭하여 보기">📁${log.imageCount || ''}</span>` : '')
    + ((log.links && log.links.length) ? `<span style="font-size:11px;margin-left:4px;" title="링크 ${log.links.length}개">🔗${log.links.length}</span>` : '');
  // 하위 기록(ㄴ)도 접힌 상태에서 같이 보이게 — 펼쳐야만 보이던 걸 목록에서 바로 확인 가능하도록
  const subLinesHtml = (log.detail || []).filter(d => (d.text || '').trim()).map(d =>
    // "ㄴ+라벨"과 본문을 flex 아이템 둘로 나눠야, 본문이 여러 줄일 때 2번째 줄부터도 컨테이너
    // 왼쪽 끝이 아니라 1번째 줄(라벨 뒤)과 같은 위치에서 시작한다(하나의 div에 다 넣으면 줄바꿈된
    // 줄들이 전부 왼쪽 끝으로 붙어버림).
    `<div style="font-size:11px;color:var(--text2);padding:1px 0;display:flex;gap:4px;">
      <span style="flex-shrink:0;"><span style="color:var(--text3);">ㄴ</span>${d.label ? ` <b>${_plHighlight(d.label, q)}</b>` : ''}</span>
      <span style="white-space:pre-line;">${_plHighlight(d.text, q)}</span>
    </div>`
  ).join('') + _plQuickAddTailHtml(log.id, ctx);

  const progHtml = log.progress != null
    ? `<span class="prog-wrap" style="width:46px;display:inline-block;vertical-align:middle;"><span class="prog-fill" style="width:${Math.max(0, Math.min(100, log.progress))}%;background:var(--green);"></span></span> <span class="f-mono" style="font-size:10.5px;vertical-align:middle;">${log.progress}%</span>`
    : '<span class="td-dim">—</span>';

  const rowHtml = `<tr id="pl-row-${log.id}" class="pl-lg-head" onclick="_plToggleRowGuarded(event,'${log.id}','${ctx}')" style="cursor:pointer;">
    <td class="pl-lg-arrow">${arrow}</td>
    <td class="f-mono td-num">${dateShort}</td>
    <td>${sellerCell}</td>
    <td>${projCell}</td>
    <td>${campCell}</td>
    <td>${mediaCell}</td>
    <td><span class="badge pl-lg-${log.logType}">${_escHtml(log.logType)}</span></td>
    <td><div>${starHtml}${contentHtml}${_plContinueChainBadgeHtml(log)}${attachIconsHtml}${stateHtml}${lateHtml}${cmtBadgeHtml}</div>${subLinesHtml}</td>
    <td class="td-c" style="vertical-align:middle;">${progHtml}</td>
    <td>${_escHtml(log.writer || '—')}</td>
  </tr>`;

  return rowHtml + (isOpen ? _plRenderDetailRow(log, undefined, q) : '');
}

function _plRenderRows() {
  // 검색/필터가 최근 구독 범위 밖을 가리키면 그때 필요한 범위를 추가로 구독한다.
  // - 광고주/매체 필터가 걸려있으면 그 범위만(가벼움), 자유 텍스트나 그보다 이전 날짜 필터면 범위를 특정할 수 없어 전체를 연다.
  const searchVal = (document.getElementById('pl-search')?.value || '').trim();
  const dateFromVal = document.getElementById('pl-date-from')?.value || '';
  const sellerFilterVal = document.getElementById('pl-f-seller')?.value.trim() || '';
  const mediaFilterVal = document.getElementById('pl-f-media')?.value.trim() || '';
  if (sellerFilterVal) _plEnsureCompanyLoaded(sellerFilterVal);
  if (mediaFilterVal) _plEnsureMediaLoaded(mediaFilterVal);
  if (searchVal || (dateFromVal && dateFromVal < _plRecentCutoff())) _plEnsureFullyLoaded();

  const filtered = _plGetFiltered();
  const q = (document.getElementById('pl-search')?.value || '').trim();

  // 퀵필터 카드 카운트 — 다른 필터와 무관하게 전체 기준(진행중/중요 총량)으로 보여줘서 "지금 몇 건 밀려있나"가 바로 보이게
  const openCntEl = document.getElementById('pl-open-cnt');
  if (openCntEl) openCntEl.textContent = PL_LOGS.filter(l => l.state === '진행중').length;
  const impCntEl = document.getElementById('pl-important-cnt');
  if (impCntEl) impCntEl.textContent = PL_LOGS.filter(l => l.important).length;

  const typeCounts = {};
  filtered.forEach(l => { typeCounts[l.logType] = (typeCounts[l.logType] || 0) + 1; });
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([t, n]) => `${t} ${n}`).join(' · ');
  const cntEl = document.getElementById('pl-log-count');
  if (cntEl) cntEl.innerHTML = `<b>${filtered.length}</b>건${topTypes ? ' · ' + _escHtml(topTypes) : ''}`;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PL_PAGE_SIZE));
  _plPage = Math.min(Math.max(1, _plPage), totalPages);
  const pageItems = filtered.slice((_plPage - 1) * PL_PAGE_SIZE, _plPage * PL_PAGE_SIZE);

  const tbody = document.getElementById('pl-log-tbody');
  if (tbody) {
    tbody.innerHTML = pageItems.length
      ? pageItems.map(log => _plRenderLogRow(log, q)).join('')
      : `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">조건에 맞는 일지가 없습니다.</td></tr>`;
  }

  const pagEl = document.getElementById('pl-log-pagination');
  if (pagEl) pagEl.innerHTML = _plBuildPagination(filtered.length, _plPage, totalPages);
}

function _plBuildLogTabSkeleton(container) {
  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <button class="btn btn-outline btn-sm" id="pl-f-open" onclick="_plToggleBtn('pl-f-open')" style="background:#fff;border-color:#ffc9c9;color:var(--red);">🔴 진행중 <b id="pl-open-cnt">—</b>건</button>
      <button class="btn btn-outline btn-sm" id="pl-f-important" onclick="_plToggleBtn('pl-f-important')" style="background:#fff;border-color:#ffec99;color:#f08c00;">★ 중요 <b id="pl-important-cnt">—</b>건</button>
    </div>
    <div class="filter-bar" style="margin-bottom:12px;overflow:visible;">
      <input type="date" class="f-date" id="pl-date-from" onchange="_plPage=1;_plRenderRows();" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
      <span class="form-hint">~</span>
      <input type="date" class="f-date" id="pl-date-to" onchange="_plPage=1;_plRenderRows();" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
      <input type="text" class="f-search" id="pl-search" placeholder="검색어" style="width:160px;" oninput="_plPage=1;_plRenderRows();">
      <div class="combo-wrap" style="width:120px;">
        <input type="text" class="f-search" id="pl-f-seller" placeholder="🔍 광고주" style="width:120px;">
        <div class="combo-list" id="pl-f-seller-list" style="display:none;"></div>
      </div>
      <div class="combo-wrap" style="width:110px;">
        <input type="text" class="f-search" id="pl-f-project" placeholder="🔍 프로젝트" style="width:110px;">
        <div class="combo-list" id="pl-f-project-list" style="display:none;"></div>
      </div>
      <div class="combo-wrap" style="width:100px;">
        <input type="text" class="f-search" id="pl-f-media" placeholder="🔍 매체" style="width:100px;">
        <div class="combo-list" id="pl-f-media-list" style="display:none;"></div>
      </div>
      <select class="f-sel" id="pl-f-type" onchange="_plPage=1;_plRenderRows();"><option value="">유형 전체</option></select>
      <select class="f-sel" id="pl-f-scope" onchange="_plPage=1;_plRenderRows();">
        <option value="">대상 전체</option>
        <option value="advertiser">광고주</option>
        <option value="project">프로젝트</option>
        <option value="campaign">캠페인</option>
        <option value="media">매체</option>
        <option value="internal">내부업무</option>
      </select>
      <select class="f-sel" id="pl-f-org" onchange="_plPage=1;_plRenderRows();"><option value="">본부/팀 전체</option></select>
      <div class="combo-wrap" id="pl-f-writer-wrap" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
        <div id="pl-f-writer-chips" style="display:inline-flex;gap:3px;flex-wrap:wrap;"></div>
        <input type="text" class="f-search" id="pl-f-writer" placeholder="🔍 작성자 추가" style="width:100px;"
          oninput="_plLogWriterSearchInput(this)" onfocus="_plLogWriterSearchInput(this)"
          onkeydown="_plComboKeyNav(event,'pl-f-writer-list')"
          onblur="setTimeout(()=>{const l=document.getElementById('pl-f-writer-list');if(l)l.style.display='none';},150)">
        <div class="combo-list" id="pl-f-writer-list" style="display:none;"></div>
      </div>
      <span class="f-reset" onclick="plResetLogFilter()">초기화</span>
    </div>

    <div class="table-card">
      <div class="table-header">
        <span class="card-title">일지</span>
        <span class="table-count" id="pl-log-count">0건</span>
        <div class="pl-expand-bar">
          <button class="btn btn-outline btn-sm" onclick="_plExpandAll(true)">전체 펼침</button>
          <button class="btn btn-ghost btn-sm" onclick="_plExpandAll(false)">요약만</button>
        </div>
      </div>
      <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
        <thead><tr>
          <th style="width:22px;"></th><th style="width:78px;">작성일</th><th style="width:120px;">광고주</th>
          <th style="width:90px;">프로젝트</th><th style="width:90px;">캠페인</th><th style="width:120px;">매체</th><th style="width:60px;">유형</th>
          <th>내용</th><th style="width:56px;">진척률</th><th style="width:70px;">작성자</th>
        </tr></thead>
        <tbody id="pl-log-tbody"></tbody>
      </table></div>
      <div class="pagination" id="pl-log-pagination"></div>
    </div>
  `;

  container.querySelectorAll('.view-tab.off').forEach(btn => {
    btn.onclick = () => plSwitchTab('__off__');
  });

  const _plLogFilterChange = () => { _plPage = 1; _plRenderRows(); };
  _plComboSetup('pl-f-seller',  'pl-f-seller-list',  _plSellerNamesRecent,  _plLogFilterChange);
  _plComboSetup('pl-f-project', 'pl-f-project-list', _plProjectNamesRecent, _plLogFilterChange);
  _plComboSetup('pl-f-media',   'pl-f-media-list',   _plMediaNamesRecent,   _plLogFilterChange);
  // 작성자는 다중 선택(칩)이라 값 하나만 다루는 _plComboSetup 대신 전용 핸들러(_plLogWriter*)를 씀.
  // 새로고침·메뉴 재진입 시 리셋되도록 의도적으로 이 배열을 여기서 비우지 않는다(모듈 전역 상태 그대로 유지)
  // — 탭을 넘나들며 스켈레톤이 다시 그려질 때마다 초기화되면 안 되고, 페이지 자체가 새로 열릴 때만 리셋되면 됨.
  _plLogRenderWriterChips();

  const typeSel = document.getElementById('pl-f-type');
  if (typeSel) typeSel.innerHTML = '<option value="">유형 전체</option>' + PL_LOG_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  const orgSel = document.getElementById('pl-f-org');
  if (orgSel) orgSel.innerHTML = '<option value="">본부/팀 전체</option>' + _buildOrgSelectHTML();
}

function plRenderLogTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (content.dataset.plTab !== 'log') {
    _plBuildLogTabSkeleton(content);
    content.dataset.plTab = 'log';
  }
  _plRenderRows();
}

// ══════════════════════════════════════════════════════════
// 3-2. 로그 작성 화면 — 블록 구조
// ══════════════════════════════════════════════════════════

let _plDraft = { blocks: [] };
let _plSearchCache = {};

// 매체·이미지·링크는 항목(item) 단위로 붙는다 — 항목 하나가 저장되면 각자 독립된 로그 문서가 되므로,
// 블록에 걸어두면 한 블록 안의 서로 다른 항목들이 매체·링크를 강제로 공유하게 되어 실제 저장 결과와 안 맞았음
function _plEmptyItem() {
  return { logType: '운영', summary: '', progress: '', detail: [], media: null, campaignId: null, refCampaigns: [], links: [], images: [], optOpen: false, continuedFromId: null, attachPath: '', attachName: '' };
}
function _plEmptyBlock(extra) {
  const block = Object.assign({
    scope: null, seller: null, content: null, campaignId: null, media: null, product: null,
    items: [_plEmptyItem()], searchQuery: '',
  }, extra || {});
  // 캠페인 하나로 프리필된 블록(캠페인 상세의 "+일지작성" 등)은 시작 항목에도 그 캠페인을 명시적으로
  // 걸어둔다 — 항목별 campaignId가 유일한 기준이 되게 해서(블록 scope로 암묵 추론 안 함), 이후
  // "+ 매체·캠페인 추가"로 다른 캠페인/매체 항목을 섞어도 서로 안 헷갈린다.
  if (block.scope === 'campaign' && block.campaignId) block.items[0].campaignId = block.campaignId;
  return block;
}

// ── 진입점 — 프리필(특정 대상 지정)이면 항상 새 블록으로 시작하고, 아니면 모달을 닫아도 메모리에
// 남아있는 이전 draft를 이어서 보여준다(새로고침하면 사라짐 — 페이지 벗어나도 유지되는 영구저장은 아님).
function plOpenWrite(prefill) {
  if (prefill) {
    _plDraft = { blocks: [_plEmptyBlock(prefill)] };
  } else if (!_plDraft.blocks.length) {
    _plDraft = { blocks: [_plEmptyBlock()] };
  }

  if (!document.getElementById('pl-modal-write')) _plBuildWriteModalShell();

  const dateEl = document.getElementById('pl-w-date');
  if (dateEl) dateEl.value = _plTodayStr();
  const whoEl = document.getElementById('pl-w-who');
  if (whoEl) whoEl.textContent = `${currentUser?.name || ''} · ${currentUser?.bonbu || ''} ${currentUser?.dept || ''} (자동)`;

  _plRenderWriteModal();
  _plRenderWriteContinuePanel();
  openModal('pl-modal-write');

  // 대상이 이미 정해진 프리필(캠페인/광고주 상세발)이면 바로 내용 입력칸에, 아니면 대상 검색창에 포커스
  setTimeout(() => {
    if (prefill) {
      document.querySelector('#pl-w-blocks .pl-irow input.pl-mini:not(.pl-pct)')?.focus();
    } else {
      document.getElementById('pl-tgt-0')?.focus();
    }
  }, 0);
}
function plCloseWrite() {
  // draft를 비우지 않고 그대로 둔다 — 다시 열면 작성 중이던 내용이 이어서 보임(저장 성공 시엔
  // plSaveLog()에서 별도로 비움).
  closeModal('pl-modal-write');
}

function _plBuildWriteModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-write';
  overlay.innerHTML = `
    <div class="modal" style="width:1100px;max-width:96vw;">
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span class="modal-title">✎ 일지 작성</span>
          <span class="form-hint" id="pl-w-who"></span>
          <input type="date" class="form-input f-mono" id="pl-w-date" style="width:150px;font-weight:700;" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
        </div>
        <button class="modal-close" onclick="plCloseWrite()">✕</button>
      </div>
      <div style="display:flex;min-height:0;">
        <div class="modal-body" style="background:var(--bg);max-height:70vh;overflow-y:auto;flex:1;min-width:0;">
          <div id="pl-w-blocks"></div>
          <div class="pl-add block" onclick="_plAddBlock()">＋ 블록 추가 <span class="form-hint" style="font-weight:400;">— 광고주 · 프로젝트 · 매체 · 내부 업무</span></div>
        </div>
        <div style="width:300px;flex-shrink:0;border-left:1px solid var(--border);background:var(--surface2);max-height:70vh;overflow-y:auto;padding:14px;">
          <div style="font-size:12px;font-weight:700;margin-bottom:2px;">📋 나의 미완료 일지</div>
          <div class="form-hint" style="margin-bottom:10px;">최근 2주 · 진척률 100% 미만</div>
          <div id="pl-w-continue-list"></div>
        </div>
      </div>
      <div class="modal-foot">
        <span class="form-hint" id="pl-w-hint">항목 8건이 개별 기록으로 저장됩니다</span>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="plSaveLog()">저장</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  // 이미지 붙여넣기 대상 항목 추적 — 항목 내부 아무 입력에나 포커스가 가면 갱신 (매번 새로 그려지는 DOM이라 위임으로 한 번만 등록)
  document.getElementById('pl-w-blocks')?.addEventListener('focusin', e => {
    const itemEl = e.target.closest('.pl-item');
    if (!itemEl) return;
    _plLastFocusedItem = { bi: +itemEl.dataset.bi, ii: +itemEl.dataset.ii };
  });
}

function _plRenderWriteModal() {
  const el = document.getElementById('pl-w-blocks');
  if (!el) return;
  el.innerHTML = _plDraft.blocks.map((b, bi) => _plRenderBlockHtml(b, bi)).join('');
  const hintEl = document.getElementById('pl-w-hint');
  const totalItems = _plDraft.blocks.reduce((s, b) => s + b.items.filter(it => (it.summary || '').trim()).length, 0);
  if (hintEl) hintEl.textContent = `항목 ${totalItems}건이 개별 기록으로 저장됩니다 · 닫아도 새로고침 전까진 내용이 유지됩니다`;
  // 항목별 대상(매체/캠페인) 검색창(#pl-med-${bi}-${ii})은 인라인 oninput/onfocus로 직접 바인딩돼있어
  // (_plItemTargetSearchInput/_plItemTargetPick) 여기서 별도로 다시 걸어줄 게 없다.
}

// ── 블록 대상 표시/검색 ──
function _plBlockTargetLabel(block) {
  if (!block.scope) return '';
  if (block.scope === 'campaign') return block.seller || '';
  if (block.scope === 'media') return block.media || '';
  return block.seller || '';
}
function _plBlockSubLabel(block) {
  // 프로젝트·캠페인은 아래 secondary select에 이미 같은 정보가 보이므로 여기서 중복 표시하지 않음
  if (block.scope === 'media') return '매체 전반';
  if (block.scope === 'advertiser') return '광고주 전반';
  return '';
}

function _plBlockSearchResults(query) {
  const q = (query || '').trim();
  if (!q) return [];
  // 캠페인은 여기(대상 검색)에서는 안 고른다 — 광고주/프로젝트까지만 정하고, 캠페인은 항목별 대상
  // 검색창(_plItemTargetField)에서 이 블록의 광고주/프로젝트로 좁혀서 고르게 한다(_plItemTargetSearchResults).
  const advResults = [], projResults = [], mediaResults = [], internalResults = [];
  SELLER_DATA.forEach(s => {
    if (_plTokenMatch(s.company, q)) {
      advResults.push({ type: 'advertiser', label: s.company, sub: '광고주 전반', seller: s.company });
    }
  });
  SELLER_DATA.forEach(s => {
    (s.brands || []).forEach(b => {
      if (b.name && _plTokenMatch(`${s.company} ${b.name}`, q)) {
        projResults.push({ type: 'project', label: `${s.company} / ${b.name}`, sub: '프로젝트', seller: s.company, content: b.name });
      }
    });
  });
  const unbrandedSellers = new Set(DATA.filter(c => !c.content && (c.seller || c.adv)).map(c => c.seller || c.adv));
  unbrandedSellers.forEach(seller => {
    if (_plTokenMatch(`${seller} 브랜드 미지정`, q)) {
      projResults.push({ type: 'project', label: `${seller} / 브랜드 미지정`, sub: '프로젝트', seller, content: '브랜드 미지정' });
    }
  });
  MEDIA_DATA.forEach(m => {
    if (_plTokenMatch(m.company, q)) {
      mediaResults.push({ type: 'media', label: m.company, sub: '매체 전반', media: m.company });
    }
  });
  // 내부 업무는 (클라이언트, 테스크) 조합별로 따로 잡아서 — 테스크명만으로도 검색되게
  const internalMap = new Map();
  PL_LOGS.filter(l => l.scope === 'internal' && l.seller)
    .sort((a, b) => (b.logDate || '').localeCompare(a.logDate || ''))
    .forEach(l => {
      const key = `${l.seller}::${l.content || ''}`;
      if (!internalMap.has(key)) internalMap.set(key, { seller: l.seller, content: l.content || '', date: l.logDate });
    });
  internalMap.forEach(({ seller, content, date }) => {
    if (_plTokenMatch(`${seller} ${content}`, q)) {
      const label = content ? `${seller} / ${content}` : seller;
      internalResults.push({ type: 'internal', label, sub: `내부 · 최근 ${date || '—'}`, seller, content: content || null });
    }
  });
  const results = [...advResults, ...projResults, ...mediaResults, ...internalResults];
  return results.slice(0, 30);
}

function _plBlockSearch(bi, query) {
  const block = _plDraft.blocks[bi];
  if (block) block.searchQuery = query;
  const list = document.getElementById(`pl-tgt-list-${bi}`);
  if (!list) return;
  _plComboNavIndex[`pl-tgt-list-${bi}`] = -1;
  const results = _plBlockSearchResults(query);
  _plSearchCache[bi] = results;
  let html = results.map((r, ri) =>
    `<div class="combo-item" onmousedown="_plBlockPick(${bi},${ri})">${_escHtml(r.label)} <span class="pl-ctype">${_escHtml(r.sub)}</span></div>`
  ).join('');
  const trimmed = (query || '').trim();
  if (trimmed) {
    // 검색에 안 걸리면 세 갈래로 새로 만들 수 있게 — 내부업무는 즉석 추가(마스터데이터 없음),
    // 광고주/매체사는 매출처관리·매체관리에 정식 등록해야 하는 데이터라 등록 모달을 띄운다.
    if (!results.some(r => r.type === 'internal' && r.label === trimmed)) {
      html += `<div class="combo-add" onmousedown="_plBlockPickNewInternal(${bi})">＋ "${_escHtml(trimmed)}" 새 내부 업무로 추가</div>`;
    }
    html += `<div class="combo-add" onmousedown="_plBlockPickNewSeller(${bi})">＋ "${_escHtml(trimmed)}" 광고주로 추가 (매출처 등록)</div>`;
    html += `<div class="combo-add" onmousedown="_plBlockPickNewMedia(${bi})">＋ "${_escHtml(trimmed)}" 매체사로 추가 (매체 등록)</div>`;
  }
  if (!html) { list.style.display = 'none'; return; }
  list.innerHTML = html;
  list.style.display = 'block';
}
function _plBlockPick(bi, ri) {
  const r = (_plSearchCache[bi] || [])[ri];
  const block = _plDraft.blocks[bi];
  if (!r || !block) return;
  block.scope = r.type;
  block.seller = r.seller || null;
  block.content = r.content || null;
  block.campaignId = r.campaignId || null;
  block.media = r.media || null;
  block.product = r.product || null;
  // 캠페인을 대상 검색에서 직접 골랐으면(이미 작성 중이던 항목들도) 그 캠페인을 명시적으로 걸어둔다.
  if (block.scope === 'campaign' && block.campaignId) {
    block.items.forEach(it => { if (it.campaignId == null) { it.campaignId = block.campaignId; it.media = block.media; } });
  }
  const list = document.getElementById(`pl-tgt-list-${bi}`);
  if (list) list.style.display = 'none';
  _plRenderWriteModal();
}
function _plBlockPickNewInternal(bi) {
  const block = _plDraft.blocks[bi];
  if (!block) return;
  const q = (block.searchQuery || '').trim();
  if (!q) return;
  block.scope = 'internal'; block.seller = q; block.content = null;
  block.campaignId = null; block.media = null; block.product = null;
  const list = document.getElementById(`pl-tgt-list-${bi}`);
  if (list) list.style.display = 'none';
  _plRenderWriteModal();
}
// 광고주/매체사는 마스터데이터(SELLER_DATA/MEDIA_DATA)라 즉석 추가 대신 정식 등록 모달을 띄운다.
// 저장되면 script.js의 saveSeller()/saveMedia()가 _plHandlePendingNewTarget()을 호출해 이 블록에 자동 반영.
let _plPendingNewTarget = null;
function _plBlockPickNewSeller(bi) {
  const block = _plDraft.blocks[bi];
  const q = (block?.searchQuery || '').trim();
  if (!q) return;
  const list = document.getElementById(`pl-tgt-list-${bi}`);
  if (list) list.style.display = 'none';
  _plPendingNewTarget = { bi, kind: 'seller' };
  openSellerModal(null, '광고주');
  const companyEl = document.getElementById('sel-company');
  if (companyEl) companyEl.value = q;
}
function _plBlockPickNewMedia(bi) {
  const block = _plDraft.blocks[bi];
  const q = (block?.searchQuery || '').trim();
  if (!q) return;
  const list = document.getElementById(`pl-tgt-list-${bi}`);
  if (list) list.style.display = 'none';
  _plPendingNewTarget = { bi, kind: 'media' };
  openMediaModal(null);
  const companyEl = document.getElementById('med-company');
  if (companyEl) companyEl.value = q;
}
function _plHandlePendingNewTarget(kind, company) {
  if (!_plPendingNewTarget || _plPendingNewTarget.kind !== kind || !company) return;
  const block = _plDraft.blocks[_plPendingNewTarget.bi];
  _plPendingNewTarget = null;
  if (!block) return;
  if (kind === 'seller') {
    block.scope = 'advertiser'; block.seller = company; block.content = null;
    block.campaignId = null; block.media = null; block.product = null;
  } else if (kind === 'media') {
    block.scope = 'media'; block.seller = null; block.content = null;
    block.campaignId = null; block.media = company; block.product = null;
  }
  if (document.getElementById('pl-modal-write')?.classList.contains('open')) _plRenderWriteModal();
}

function _plBlockSetProject(bi, value) {
  const block = _plDraft.blocks[bi];
  if (!block) return;
  block.content = value || null;
  // 이미 고른 캠페인이 새 브랜드와 안 맞으면 초기화
  if (block.campaignId) {
    const c = DATA.find(x => x.id === block.campaignId);
    if (!c || (c.content || null) !== (block.content || null)) {
      block.campaignId = null; block.media = null; block.product = null;
    }
  }
  block.scope = block.campaignId ? 'campaign' : (value ? 'project' : 'advertiser');
  _plRenderWriteModal();
}
function _plInternalTaskInput(bi, val) {
  const block = _plDraft.blocks[bi];
  if (block) block.content = val;
  const list = document.getElementById(`pl-task-list-${bi}`);
  if (!list) return;
  _plComboNavIndex[`pl-task-list-${bi}`] = -1;
  const q = (val || '').trim().toLowerCase();
  const tasks = [...new Set(PL_LOGS.filter(l => l.scope === 'internal' && l.seller === block.seller && l.content).map(l => l.content))];
  const matched = q ? tasks.filter(t => t.toLowerCase().includes(q)) : tasks;
  if (!matched.length) { list.style.display = 'none'; return; }
  list.innerHTML = matched.slice(0, 10).map(t => `<div class="combo-item" onmousedown="_plInternalTaskPick(${bi},'${_escHtml(t)}')">${_escHtml(t)}</div>`).join('');
  list.style.display = 'block';
}
function _plInternalTaskPick(bi, val) {
  const block = _plDraft.blocks[bi];
  if (block) block.content = val;
  const list = document.getElementById(`pl-task-list-${bi}`);
  if (list) list.style.display = 'none';
  const input = document.getElementById(`pl-task-${bi}`);
  if (input) input.value = val;
}

function _plBlockSecondaryControl(block, bi) {
  // 광고주 > 브랜드(프로젝트)까지는 블록 헤더에서 좁혀나간다.
  if (block.scope === 'advertiser' || block.scope === 'project' || block.scope === 'campaign') {
    const seller = SELLER_DATA.find(s => s.company === block.seller);
    const brandNames = (seller?.brands || []).map(b => b.name).filter(Boolean);
    const brandOpts = ['', ...brandNames, '브랜드 미지정'].map(v => {
      const val = v || '';
      const label = v || '브랜드 선택 (선택)';
      return `<option value="${_escHtml(val)}" ${(block.content || '') === val ? 'selected' : ''}>${_escHtml(label)}</option>`;
    }).join('');
    const brandSelect = `<select class="f-sel" style="font-weight:700;" onchange="_plBlockSetProject(${bi}, this.value)">${brandOpts}</select>`;

    // 캠페인 select는 이 블록이 "이미 캠페인 하나로 좁혀진 상태"(캠페인 상세의 "+일지작성"으로 들어온
    // 경우 등)일 때만 보여준다 — 광고주/프로젝트 단계에서 이걸 노출하면 눌러서 블록 전체가 그 캠페인
    // 하나로 잠겨버려(scope가 campaign으로 바뀜), 항목별 "+ 매체·캠페인 추가"(여러 캠페인을 섞어 쓰는
    // 새 기능)가 안 보이게 되는 충돌이 있었다. 캠페인 연결은 이제 그 항목별 검색으로만 한다.
    if (block.scope !== 'campaign') return brandSelect;

    const camps = DATA.filter(c => (c.seller || c.adv) === block.seller && c.status !== '삭제'
      && (!block.content || (c.content || null) === (block.content || null)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const campOpts = [`<option value="">캠페인 선택 (선택)</option>`, ...camps.map(c => {
      const dateShort = (c.date || '').slice(5, 10).replace('-', '.');
      const label = `${c.id} · ${dateShort} ${c.media || ''} ${c.product || ''}`;
      return `<option value="${_escHtml(c.id)}" ${c.id === block.campaignId ? 'selected' : ''}>${_escHtml(label)}</option>`;
    })].join('');
    const campSelect = `<select class="f-sel" style="font-weight:700;min-width:190px;" onchange="_plBlockSetCampaign(${bi}, this.value)">${campOpts}</select>`;

    return brandSelect + campSelect;
  }
  if (block.scope === 'internal') {
    return `<div class="combo-wrap" style="position:relative;">
      <input type="text" class="f-sel" style="font-weight:700;width:140px;" id="pl-task-${bi}" value="${_escHtml(block.content || '')}" placeholder="테스크"
        oninput="_plInternalTaskInput(${bi}, this.value)" onfocus="_plInternalTaskInput(${bi}, this.value)"
        onkeydown="_plComboKeyNav(event,'pl-task-list-${bi}')">
      <div class="combo-list" id="pl-task-list-${bi}" style="display:none;"></div>
    </div>`;
  }
  return '';
}
function _plBlockSetCampaign(bi, campaignId) {
  const block = _plDraft.blocks[bi];
  if (!block) return;
  if (!campaignId) {
    // 캠페인 선택 해제 — 프로젝트/광고주 단계로 되돌림
    block.campaignId = null; block.media = null; block.product = null;
    block.scope = block.content ? 'project' : 'advertiser';
    _plRenderWriteModal();
    return;
  }
  const c = DATA.find(x => x.id === campaignId);
  if (!c) return;
  const oldCampaignId = block.campaignId;
  block.campaignId = c.id;
  block.content = c.content || block.content || null; // 브랜드 자동 입력 (기존 검색 흐름과 동일)
  block.media = c.media || null;
  block.product = c.product || null;
  block.scope = 'campaign';
  // 바꾸기 전 캠페인을 암묵적으로 따르던 항목만 새 캠페인으로 갈아탄다 — "+ 매체·캠페인 추가"로
  // 이미 다른 캠페인/매체를 명시적으로 골라둔 항목은 그대로 둔다.
  block.items.forEach(it => {
    if (it.campaignId == null || it.campaignId === oldCampaignId) { it.campaignId = c.id; it.media = c.media || null; }
  });
  _plRenderWriteModal();
}

function _plRenderBlockHtml(block, bi) {
  const targetLabel = _plBlockTargetLabel(block);
  const subLabel = _plBlockSubLabel(block);
  const isInternal = block.scope === 'internal';
  // media scope만 매체가 블록 자체(그 매체 전반)라 그룹핑이 의미 없음. campaign scope도 이제는 항목마다
  // 다른 캠페인/매체를 섞어 쓸 수 있어서(항목별 campaignId), 여기 포함해서 그룹핑을 허용한다.
  // 연속된 항목의 그룹 키(매체 또는 캠페인)가 같으면 행을 생략해서 "그룹 하나에 항목 여러 개"로 묶어 보인다.
  const groupableMedia = block.scope !== 'media';
  let prevGroupKey;
  const itemsHtml = block.items.map((it, ii) => {
    // 그룹 키 = 캠페인이 연결돼있으면 캠페인, 아니면 매체값 — 이게 바뀌면 새 그룹 행을 보여준다.
    // it.newMediaGroup: "+ 매체·캠페인 추가"로 만든 항목은 직전 항목과 그룹 키가 우연히 같아도(둘 다 미입력 등)
    // 강제로 새 그룹 행을 보여준다.
    const groupKey = it.campaignId ? `camp:${it.campaignId}` : `media:${it.media || ''}`;
    const showMediaRow = !groupableMedia ? (ii === 0) : (ii === 0 || groupKey !== prevGroupKey || it.newMediaGroup);
    if (groupableMedia) prevGroupKey = groupKey;
    return _plRenderItemHtml(block, bi, ii, it, showMediaRow);
  }).join('');
  return `<div class="pl-block" data-bi="${bi}">
    <div class="pl-bhead">
      <div class="combo-wrap" style="position:relative;">
        <input type="text" class="pl-tgt${targetLabel ? '' : ' empty'}" id="pl-tgt-${bi}"
          value="${_escHtml(targetLabel)}" placeholder="광고주·프로젝트·매체·내부업무 검색" title="클릭하면 다시 검색"
          oninput="_plBlockSearch(${bi}, this.value)" onfocus="_plBlockSearch(${bi}, this.value)"
          onkeydown="_plComboKeyNav(event,'pl-tgt-list-${bi}')">
        <div class="combo-list" id="pl-tgt-list-${bi}" style="display:none;"></div>
      </div>
      ${_plBlockSecondaryControl(block, bi)}
      ${isInternal ? '<span class="tag pl-inner">내부 업무</span>' : ''}
      ${subLabel ? `<span class="form-hint">${_escHtml(subLabel)}</span>` : ''}
      <span class="pl-x" style="margin-left:auto;" onclick="_plRemoveBlock(${bi})">✕ 블록 삭제</span>
    </div>
    <div class="pl-bbody">
      ${itemsHtml}
      <div class="pl-add" onclick="_plAddItem(${bi})">＋ 항목 추가${groupableMedia ? ' (같은 매체/캠페인)' : ''}</div>
      ${groupableMedia ? `<div class="pl-add pl-add-group" onclick="_plAddMediaGroup(${bi})">＋ 매체/캠페인 추가</div>` : ''}
    </div>
  </div>`;
}

// 항목의 대상 칸 — scope='media'는 블록 자체가 이미 그 매체를 가리키므로 "전반" 표시만. 그 외에는
// 매체 하나 또는 캠페인 여러 개를 한 검색창에서 고른다. 매체·캠페인은 상호배타적: 매체를 고르면
// 그 자리에서 필드가 잠기고(단일값), 캠페인은 몇 개를 고르느냐로 역할이 자동으로 바뀐다 — 1개는 이
// 항목이 그 캠페인에 직접 등록(it.campaignId), 2개 이상은 전부 참조 캠페인(it.refCampaigns, 로그의
// 주 소속은 광고주/프로젝트 그대로 두고 각 캠페인 상세엔 참조로만 표시). 이 규칙은 뺄 때도 똑같이
// 적용되어(_plItemSetCamps), 참조 2개 중 하나를 지워 1개만 남으면 그 하나가 다시 직접등록으로 전환된다.
function _plItemCampsList(it) {
  return it.campaignId ? [it.campaignId] : (it.refCampaigns || []);
}
function _plItemSetCamps(it, ids) {
  if (!ids.length) {
    it.campaignId = null; it.refCampaigns = [];
  } else if (ids.length === 1) {
    const c = DATA.find(x => x.id === ids[0]);
    it.campaignId = ids[0]; it.refCampaigns = [];
    it.media = c?.media || null;
  } else {
    it.campaignId = null; it.refCampaigns = ids;
    it.media = null; // 화면 표시용 매체는 저장/조회 시점에 참조 캠페인들로부터 자동판단(_plResolveRefMedia)
  }
}
// 참조 캠페인(2개 이상)은 광고주/프로젝트 단계 블록에서만 허용한다 — scope==='campaign' 블록은
// 이미 그 자체가 캠페인 하나(block.campaignId)로 좁혀진 상태라, 항목이 참조 다중선택으로 빠지면
// plSaveLog에서 scope가 block.scope('campaign')로 남으면서 campaignId는 block의 원래 캠페인을
// 가리키는 채로 refCampaignIds만 따로 도는 모순된 문서가 만들어진다. scope==='internal'도 같은 이유로 제외.
function _plItemMultiCampEligible(block) {
  return block.scope === 'advertiser' || block.scope === 'project';
}
function _plItemTargetField(block, bi, ii, it) {
  if (block.scope === 'media') {
    return `<span class="form-hint" style="font-size:11px;">전반</span>`;
  }
  const camps = _plItemCampsList(it);
  if (!camps.length && it.media) {
    return `<div class="pl-reftags combo-wrap">
      <span class="tag pl-media">${_escHtml(it.media)}<span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plItemTargetUnsetMedia(${bi},${ii})" title="선택 해제">✕</span></span>
    </div>`;
  }
  const multiEligible = _plItemMultiCampEligible(block);
  const chipsHtml = camps.map((cid, ci) => {
    const c = DATA.find(x => x.id === cid);
    const sub = c ? `${(c.date || '').slice(5, 10).replace('-', '.')} ${c.media || ''} ${c.product || ''}` : '';
    return `<span class="tag pl-ref" data-tooltip="${_escHtml(sub)}">🔗 ${_escHtml(cid)}<span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plItemTargetRemoveCamp(${bi},${ii},${ci})">✕</span></span>`;
  }).join('');
  // 캠페인을 이미 하나 골랐고 이 블록에선 더 추가할 수 없으면(!multiEligible) 검색창 자체를 접는다.
  if (camps.length && !multiEligible) {
    return `<div class="pl-reftags combo-wrap">${chipsHtml}</div>`;
  }
  const ph = camps.length ? '🔍 캠페인 추가 검색' : '🔍 매체 또는 캠페인 검색';
  return `<div class="pl-reftags combo-wrap">
    ${chipsHtml}
    <input type="text" id="pl-med-${bi}-${ii}" placeholder="${ph}" autocomplete="off"
      oninput="_plItemTargetSearchInput(${bi},${ii},this)" onfocus="_plItemTargetSearchInput(${bi},${ii},this)"
      onkeydown="_plComboKeyNav(event,'pl-med-list-${bi}-${ii}')"
      onblur="setTimeout(()=>{const l=document.getElementById('pl-med-list-${bi}-${ii}');if(l)l.style.display='none';},150)">
    <div class="combo-list" id="pl-med-list-${bi}-${ii}" style="display:none;"></div>
  </div>`;
}
function _plItemTargetUnsetMedia(bi, ii) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  it.media = null;
  _plRenderWriteModal();
}
function _plItemTargetRemoveCamp(bi, ii, ci) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  const camps = _plItemCampsList(it);
  camps.splice(ci, 1);
  _plItemSetCamps(it, camps);
  _plRenderWriteModal();
}

// ── 항목 / ㄴ 하위줄 ──
function _plRenderItemHtml(block, bi, ii, it, showMediaRow) {
  const typeOpts = PL_LOG_TYPES.map(t => `<option value="${t}" ${it.logType === t ? 'selected' : ''}>${t}</option>`).join('');
  const ph = PL_SUMMARY_PH[it.logType] || '';
  const subHtml = (it.detail || []).map((d, di) => _plRenderSubHtml(bi, ii, di, d, it.logType)).join('');
  // 새 그룹이 시작되는 항목(showMediaRow)은 "+ 항목 추가"로 이어붙인 항목과 구분되게 위쪽 경계를 다르게
  // 준다 — 첫 항목(ii===0)은 바로 위가 블록 헤더라 이미 경계가 있으니 제외.
  const isNewGroup = showMediaRow && ii > 0;
  // 대상 칸(매체/캠페인)은 항목마다 서로 다를 수 있어(참조 캠페인은 항목별로 독립) showMediaRow와
  // 무관하게 항상 보여준다 — showMediaRow는 위쪽 구분선(isNewGroup) 표시에만 쓰인다.
  return `<div class="pl-item${isNewGroup ? ' pl-newgroup' : ''}" data-bi="${bi}" data-ii="${ii}">
    <div class="pl-media-row">${_plItemTargetField(block, bi, ii, it)}</div>
    <div class="pl-irow">
      <select class="pl-mini" style="font-weight:700;" onchange="_plItemTypeChange(${bi},${ii},this.value)">${typeOpts}</select>
      <input type="text" class="pl-mini" maxlength="60" placeholder="${_escHtml(ph)}" value="${_escHtml(it.summary || '')}"
        oninput="_plItemField(${bi},${ii},'summary',this.value)">
      <div class="pl-pct-wrap"><input type="text" class="pl-mini pl-pct" placeholder="진척률" value="${it.progress ?? ''}"
        oninput="_plItemField(${bi},${ii},'progress',this.value)"><span class="pl-pct-suffix">%</span></div>
      <span class="pl-x" onclick="_plRemoveItem(${bi},${ii})">✕</span>
    </div>
    ${subHtml}
    <div class="pl-subadd" onclick="_plAddSub(${bi},${ii})">ㄴ 추가</div>
    ${_plRenderItemAttachSection(bi, ii, it)}
  </div>`;
}

function _plRenderSubHtml(bi, ii, di, d, logType) {
  const preset = PL_LABEL_PRESET[logType] || { opts: [] };
  const isCustom = !!d.customMode || (!!d.label && !preset.opts.includes(d.label));
  let labelControl;
  if (isCustom) {
    labelControl = `<div class="combo-wrap" style="position:relative;">
      <input type="text" class="pl-mini" id="pl-lbl-${bi}-${ii}-${di}" placeholder="라벨 직접 입력" value="${_escHtml(d.label || '')}"
        oninput="_plSubLabelCustomInput(${bi},${ii},${di},this.value)" onfocus="_plSubLabelCustomInput(${bi},${ii},${di},this.value)"
        onkeydown="_plComboKeyNav(event,'pl-lbl-list-${bi}-${ii}-${di}')">
      <div class="combo-list" id="pl-lbl-list-${bi}-${ii}-${di}" style="display:none;"></div>
    </div>`;
  } else {
    const opts = ['라벨 없음', ...preset.opts, '직접 입력…'];
    const selHtml = opts.map(o => {
      const val = o === '라벨 없음' ? '' : (o === '직접 입력…' ? '__custom__' : o);
      const selected = o === '직접 입력…' ? false : val === (d.label || '');
      return `<option value="${val}" ${selected ? 'selected' : ''}>${o}</option>`;
    }).join('');
    labelControl = `<select class="pl-mini" onchange="_plSubLabelSelect(${bi},${ii},${di},this.value)">${selHtml}</select>`;
  }
  return `<div class="pl-sub"><span class="pl-m">ㄴ</span>
    ${labelControl}
    <textarea class="pl-mini" rows="${Math.max(1, (d.text || '').split('\n').length)}" placeholder="내용을 입력하세요" style="resize:vertical;font-family:inherit;line-height:1.4;overflow:hidden;"
      oninput="_plSubField(${bi},${ii},${di},'text',this.value);_plAutoGrowTextarea(this)">${_escHtml(d.text || '')}</textarea>
    <span class="pl-x" onclick="_plRemoveSub(${bi},${ii},${di})">✕</span>
  </div>`;
}

function _plExistingLabels() {
  const freq = {};
  PL_LOGS.forEach(l => (l.detail || []).forEach(d => { if (d.label) freq[d.label] = (freq[d.label] || 0) + 1; }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([label]) => label);
}
function _plSubLabelSelect(bi, ii, di, val) {
  const d = _plDraft.blocks[bi]?.items[ii]?.detail[di];
  if (!d) return;
  if (val === '__custom__') { d.customMode = true; d.label = ''; }
  else { d.label = val; d.customMode = false; }
  _plRenderWriteModal();
}
function _plSubLabelCustomInput(bi, ii, di, val) {
  const d = _plDraft.blocks[bi]?.items[ii]?.detail[di];
  if (!d) return;
  d.label = val; d.customMode = true;
  const list = document.getElementById(`pl-lbl-list-${bi}-${ii}-${di}`);
  if (!list) return;
  _plComboNavIndex[`pl-lbl-list-${bi}-${ii}-${di}`] = -1;
  const q = val.trim().toLowerCase();
  const existing = _plExistingLabels();
  const matched = q ? existing.filter(l => l.toLowerCase().includes(q)) : existing;
  let html = matched.slice(0, 10).map(l => `<div class="combo-item" onmousedown="_plSubLabelPickCustom(${bi},${ii},${di},'${_escHtml(l)}')">${_escHtml(l)}</div>`).join('');
  const trimmed = val.trim();
  if (trimmed && !existing.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
    html += `<div class="combo-add" onmousedown="_plSubLabelPickCustom(${bi},${ii},${di},'${_escHtml(trimmed)}')">＋ "${_escHtml(trimmed)}" 새 라벨로 추가</div>`;
  }
  if (!html) { list.style.display = 'none'; return; }
  list.innerHTML = html;
  list.style.display = 'block';
}
function _plSubLabelPickCustom(bi, ii, di, val) {
  const d = _plDraft.blocks[bi]?.items[ii]?.detail[di];
  if (!d) return;
  d.label = val; d.customMode = true;
  _plRenderWriteModal();
}

// ── 필드 갱신 (구조 변경 없음 → 리렌더 없이 값만 갱신) ──
function _plItemField(bi, ii, field, val) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  it[field] = val;
}
function _plSubField(bi, ii, di, field, val) {
  const d = _plDraft.blocks[bi]?.items[ii]?.detail[di];
  if (!d) return;
  d[field] = val;
}

// ── 구조 변경 (항목/ㄴ/블록 추가·삭제 → 리렌더) ──
function _plItemTypeChange(bi, ii, val) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  it.logType = val;
  const preset = PL_LABEL_PRESET[val];
  if (preset && preset.auto.length && (!it.detail || it.detail.length === 0)) {
    it.detail = preset.auto.map(label => ({ label, text: '' }));
  }
  _plRenderWriteModal();
}
// 항목/매체·캠페인/블록 추가 버튼을 눌렀을 때 새로 생긴 게 뭔지 눈에 잘 안 띈다는 피드백 —
// 알림 "일지 보기 →" 점프에 쓰던 것과 같은 스크롤+반짝임(pl-jump-flash)을 재사용한다.
function _plFlashScrollTo(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('pl-jump-flash');
  setTimeout(() => el.classList.remove('pl-jump-flash'), 1500);
}
function _plAddItem(bi) {
  const block = _plDraft.blocks[bi];
  if (!block) return;
  const newItem = _plEmptyItem();
  // 직전 항목과 같은 매체/캠페인으로 이어서 작성하는 경우가 흔해서, 그 값을 그대로 이어받는다
  // (다르면 아래 "+ 매체·캠페인 추가"로 새 그룹을 시작하면 됨). 직전 항목이 참조 캠페인 여러 개
  // 상태였으면 그 목록도 같이 이어받아야 "이어쓰기"가 빈 대상으로 시작되지 않는다.
  const lastItem = block.items[block.items.length - 1];
  if (lastItem) {
    newItem.media = lastItem.media;
    newItem.campaignId = lastItem.campaignId;
    newItem.refCampaigns = [...(lastItem.refCampaigns || [])];
  }
  block.items.push(newItem);
  const newIi = block.items.length - 1;
  _plRenderWriteModal();
  _plFlashScrollTo(`#pl-w-blocks .pl-item[data-bi="${bi}"][data-ii="${newIi}"]`);
}
// "+ 매체/캠페인 추가" — 새 그룹의 시작 항목만 비운 채로 밀어넣는다. 실제 매체/캠페인 선택은 그
// 항목 자신의 대상 칸(_plItemTargetField → _plItemTargetSearchInput)에서 검색해서 고른다.
function _plAddMediaGroup(bi) {
  const block = _plDraft.blocks[bi];
  if (!block) return;
  const newItem = _plEmptyItem();
  newItem.newMediaGroup = true;
  block.items.push(newItem);
  const newIi = block.items.length - 1;
  _plRenderWriteModal();
  _plFlashScrollTo(`#pl-w-blocks .pl-item[data-bi="${bi}"][data-ii="${newIi}"]`);
}
// ── 항목의 대상 칸 검색 — 매체명과 이 블록의 광고주/프로젝트에 속한 캠페인을 하나의 검색으로 같이
// 보여준다. 이미 캠페인을 하나 이상 고른 상태면 매체는 상호배타적이라 결과에서 아예 뺀다(_plItemTargetSearchResults).
let _plItemTargetSearchCache = {};
function _plItemTargetSearchResults(block, it, query) {
  const q = (query || '').trim();
  const camps = _plItemCampsList(it);
  const already = new Set(camps);
  const mediaResults = camps.length ? [] : _plMediaNames()
    .filter(m => !q || _plTokenMatch(m, q))
    .map(m => ({ type: 'media', label: m, sub: '매체', media: m }));
  const campResults = DATA.filter(c => (c.seller || c.adv) === block.seller
      && (c.content || null) === (block.content || null) && c.status !== '삭제' && !already.has(c.id))
    .filter(c => !q || _plTokenMatch(`${c.id} ${c.media || ''} ${c.product || ''} ${(c.date || '').slice(0, 10)}`, q))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(c => ({ type: 'campaign', label: `${c.id} · ${(c.date || '').slice(5, 10).replace('-', '.')} ${c.media || ''} ${c.product || ''}`, sub: '캠페인', campaignId: c.id }));
  return [...mediaResults, ...campResults].slice(0, 30);
}
function _plItemTargetSearchInput(bi, ii, inputEl) {
  const block = _plDraft.blocks[bi];
  const it = block?.items[ii];
  const listId = `pl-med-list-${bi}-${ii}`;
  const list = document.getElementById(listId);
  if (!block || !it || !list) return;
  // 매체+캠페인을 합치면 결과가 많아 30개로 잘리는데, 빈 입력(포커스만 한 상태)에서 그 잘린 목록을
  // "전체"인 것처럼 보여주면 오해의 소지가 있어 — 뭐라도 입력해야 결과를 보여준다.
  if (!inputEl.value.trim()) { list.style.display = 'none'; list.innerHTML = ''; return; }
  const results = _plItemTargetSearchResults(block, it, inputEl.value);
  _plItemTargetSearchCache[`${bi}-${ii}`] = results;
  _plComboNavIndex[listId] = -1;
  if (!results.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.innerHTML = results.map((r, i) =>
    `<div class="combo-item" onmousedown="_plItemTargetPick(${bi},${ii},${i})">${_escHtml(r.label)}<span class="pl-ctype">${_escHtml(r.sub)}</span></div>`
  ).join('');
  list.style.display = 'block';
  _plFloatCombo(inputEl, list);
}
function _plItemTargetPick(bi, ii, i) {
  const block = _plDraft.blocks[bi];
  const it = block?.items[ii];
  const r = (_plItemTargetSearchCache[`${bi}-${ii}`] || [])[i];
  if (!block || !it || !r) return;
  if (r.type === 'media') {
    it.media = r.media; it.campaignId = null; it.refCampaigns = [];
  } else if (_plItemMultiCampEligible(block)) {
    _plItemSetCamps(it, [..._plItemCampsList(it), r.campaignId]);
  } else {
    // 참조 다중선택이 안 되는 블록(scope==='campaign' 등)에서는 새로 고른 캠페인 하나로 그대로 교체.
    it.campaignId = r.campaignId; it.refCampaigns = [];
    it.media = DATA.find(c => c.id === r.campaignId)?.media || null;
  }
  const list = document.getElementById(`pl-med-list-${bi}-${ii}`);
  if (list) list.style.display = 'none';
  _plRenderWriteModal();
}
function _plRemoveItem(bi, ii) {
  const block = _plDraft.blocks[bi];
  if (!block) return;
  block.items.splice(ii, 1);
  if (!block.items.length) block.items.push(_plEmptyItem());
  _plRenderWriteModal();
}
function _plAddSub(bi, ii) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  if (!it.detail) it.detail = [];
  it.detail.push({ label: '', text: '' });
  _plRenderWriteModal();
}
function _plRemoveSub(bi, ii, di) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  it.detail.splice(di, 1);
  _plRenderWriteModal();
}
function _plAddBlock() {
  _plDraft.blocks.push(_plEmptyBlock());
  const newBi = _plDraft.blocks.length - 1;
  _plRenderWriteModal();
  _plFlashScrollTo(`#pl-w-blocks .pl-block[data-bi="${newBi}"]`);
}
function _plRemoveBlock(bi) {
  _plDraft.blocks.splice(bi, 1);
  if (!_plDraft.blocks.length) _plDraft.blocks.push(_plEmptyBlock());
  _plRenderWriteModal();
}

// ── 작성 모달 오른쪽 패널: 내가 최근에 쓴 미완료(진척률 100% 미만) 일지 — 어제 하다 만 일을
// 오늘 또 까먹고 새로 이슈화하는 대신, 보면서 바로 "이어쓰기"로 이어 쓸 수 있게 해준다.
function _plContinueCandidates() {
  const cutoff = _plFmtDateLocal(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000));
  // 이미 "이어쓰기"로 다음 기록이 만들어진 로그는 더 이상 미완료 후보가 아니다 — 그날그날의 기록을
  // 덮어쓰지 않고 각자 별개 문서로 남기는 방식이라(진척률도 옛 값 그대로), 최신 진행 상황은 그 다음
  // 기록이 대신하므로 옛 것은 여기서 빠져야 "같은 일이 두 번" 뜨지 않는다.
  const continuedIds = new Set(PL_LOGS.filter(l => l.continuedFromId).map(l => l.continuedFromId));
  return PL_LOGS.filter(l => {
    if (l.writerId !== currentUser?.id) return false;
    if (l.progress == null || l.progress >= 100) return false;
    if ((l.logDate || '') < cutoff) return false;
    if (l.state === '완료') return false; // 이슈·요청 자신이 이미 완료 처리됨
    if (continuedIds.has(l.id)) return false;
    if (l.threadId) {
      const issue = PL_LOGS.find(x => x.id === l.threadId);
      if (issue && issue.state !== '진행중') return false; // 원본 이슈가 이미 닫혀서 더 이어갈 게 없음
    }
    return true;
  }).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
// 로그 자신이 진행중 이슈·요청이면 그 로그를, 대응/해결 기록이면 threadId가 가리키는 원본 이슈를 반환.
// 원본이 이미 완료 처리됐으면(더 이상 대응을 받지 않으므로) null.
function _plContinueOpenIssue(log) {
  const issue = log.threadId ? PL_LOGS.find(l => l.id === log.threadId) : log;
  return (issue && issue.state === '진행중') ? issue : null;
}
function _plRenderWriteContinuePanel() {
  const el = document.getElementById('pl-w-continue-list');
  if (!el) return;
  const logs = _plContinueCandidates();
  el.innerHTML = logs.length ? logs.map(l => {
    const isOpenIssue = !!_plContinueOpenIssue(l);
    const contBtnLabel = isOpenIssue ? '💬 대응 작성하기' : '↩ 이어쓰기';
    return `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:3px;">
        <span class="f-mono" style="font-size:10.5px;color:var(--text3);">${_escHtml((l.logDate || '').slice(2).replace(/-/g, '.'))}</span>
        <span style="font-size:11px;font-weight:700;color:var(--accent);">${l.progress}%</span>
      </div>
      <div style="font-size:12px;font-weight:600;margin-bottom:3px;"><span class="badge pl-lg-${l.logType}" style="margin-right:4px;vertical-align:middle;">${_escHtml(l.logType)}</span>${_plDateBlockLabel({ scope: l.scope, seller: l.seller, content: l.content, campaignId: l.campaignId, media: l.media })}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-bottom:6px;white-space:pre-line;">${_escHtml(l.summary || '')}</div>
      <button class="btn btn-outline btn-sm" style="width:100%;" onclick="_plContinueFromLog('${l.id}')">${contBtnLabel}</button>
    </div>
  `;}).join('') : `<div style="text-align:center;padding:24px 0;color:var(--text3);font-size:12px;">해당 조건의 일지가 없습니다.</div>`;
}
function _plContinueFromLog(logId) {
  const log = PL_LOGS.find(l => l.id === logId);
  if (!log) return;
  // 진행중인 이슈·요청이거나, 그 이슈에 달린 대응/해결 기록이면(threadId로 원본 추적) 새 로그를 또
  // 만드는 대신 이슈 상세의 "+ 대응 기록"과 동일하게 원본 이슈에 threadId로 묶이는 대응 작성 모달을
  // 띄운다. 작성 모달은 닫지 않고 그 위에 레이어링만 한다(같은 z-index라 DOM 순서로 쌓이므로,
  // body 맨 끝으로 옮겨서 위에 그려지게 강제한다).
  const openIssue = _plContinueOpenIssue(log);
  if (openIssue) {
    plOpenResponseModal(openIssue.id);
    const editOverlay = document.getElementById('pl-modal-edit');
    if (editOverlay) document.body.appendChild(editOverlay);
    return;
  }
  const block = _plEmptyBlock({
    scope: log.scope, seller: log.seller || null, content: log.content || null,
    campaignId: log.campaignId || null, product: log.product || null,
    media: log.scope === 'media' ? (log.media || null) : null,
  });
  block.items[0].logType = log.logType || '운영';
  block.items[0].progress = log.progress != null ? String(log.progress) : '';
  // 원본 내용도 그대로 불러와서, 매번 처음부터 다시 타이핑하지 않고 그 자리에서 고쳐 쓸 수 있게 한다
  // (예: 진척률만 30%→50%로 바뀐 거면 요약은 거의 그대로 두고 숫자만 손보면 됨).
  block.items[0].summary = log.summary || '';
  block.items[0].detail = (log.detail || []).map(d => ({ label: d.label || '', text: d.text || '' }));
  if (log.scope !== 'media') block.items[0].media = log.media || null;
  // 원본이 참조 캠페인 여러 개에 걸려있었으면 그것도 그대로 이어받는다 — 안 그러면 이어쓰기할 때마다
  // 조용히 빠져서, 원본이 참조로 걸려있던 캠페인 상세에는 최신 진행상황이 안 보이게 된다.
  block.items[0].refCampaigns = [...(log.refCampaignIds || [])];
  // 이 항목이 어느 로그를 이어쓴 것인지 표시 — plSaveLog에서 저장 문서의 continuedFromId로 반영되고,
  // "나의 미완료 일지"가 원본을 후보에서 빼는 기준이자, 상세 펼침의 "이전/이어서 쓴 기록" 링크의 근거가 된다.
  block.items[0].continuedFromId = log.id;
  _plDraft.blocks.push(block);
  _plRenderWriteModal();
  toast('이전 기록을 불러왔습니다 — 오늘 내용을 이어서 작성하세요', 'ok');
  setTimeout(() => {
    const blocks = document.querySelectorAll('#pl-w-blocks > .pl-block');
    blocks[blocks.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

// ── 접힘 영역: 이미지 · 링크 (매체는 위 .pl-irow로 이동, 항목 단위) ──
function _plItemToggleCollapse(bi, ii) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  it.optOpen = !it.optOpen;
  _plRenderWriteModal();
}
function _plAddLink(bi, ii) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  if (!it.links) it.links = [];
  it.links.push({ label: '', url: '' });
  _plRenderWriteModal();
}
function _plRemoveLink(bi, ii, li) {
  _plDraft.blocks[bi]?.items[ii]?.links.splice(li, 1);
  _plRenderWriteModal();
}
function _plLinkField(bi, ii, li, val) {
  const l = _plDraft.blocks[bi]?.items[ii]?.links[li];
  if (!l) return;
  l.label = val; l.url = val;
}

// 하위 기록(ㄴ) 내용 textarea 자동 높이조절 — 타이핑 중 줄이 늘거나 줄면 그때그때 맞춰준다.
// 처음 열었을 때(이미 여러 줄인 기존 내용을 수정하는 경우 등)는 rows 속성을 내용의 줄 수로 미리
// 계산해서 렌더링하므로, 이 함수는 그 이후의 변화만 담당하면 된다.
function _plAutoGrowTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ── 이름 검색 콤보 공용 유틸 ──
// 모달 본체(.modal)와 .modal-body가 둘 다 overflow-y:auto라 절대위치 드롭다운은 스크롤 상자 경계에서
// 잘려버린다. position:fixed로 바꾸고 입력창 위치를 직접 계산해서 붙이면 그 어떤 조상의 overflow에도
// 안 잘린다(조상에 transform이 없는 한 fixed의 containing block은 뷰포트이므로).
function _plFloatCombo(inputEl, listEl) {
  const r = inputEl.getBoundingClientRect();
  listEl.style.position = 'fixed';
  listEl.style.left = r.left + 'px';
  listEl.style.top = (r.bottom + 3) + 'px';
  listEl.style.width = r.width + 'px';
  listEl.style.right = 'auto';
}
// ↓/↑로 항목을 옮기고 Enter로 확정. 목록이 안 열려 있거나 방향키로 아무 것도 안 골랐으면 false를 돌려줘서
// 호출부가 원래 하던 동작(댓글 등록 등)을 그대로 하게 한다.
let _plComboNavIndex = {};
function _plComboKeyNav(event, listId) {
  const list = document.getElementById(listId);
  if (!list || list.style.display !== 'block') return false;
  // .combo-add("+ 새 라벨로 추가" 등)도 같이 순회 대상에 넣어서 방향키/Tab/Enter로 고를 수 있게 한다.
  const items = [...list.querySelectorAll('.combo-item, .combo-add')];
  if (!items.length) return false;
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) return false;
  if (event.key === 'Escape') { list.style.display = 'none'; _plComboNavIndex[listId] = -1; event.preventDefault(); return true; }
  let idx = _plComboNavIndex[listId] ?? -1;
  if (event.key === 'Enter' || event.key === 'Tab') {
    // 리스트가 열려있는 동안은 방향키로 아무 것도 안 골랐어도(idx<0) 첫 항목을 고른 것으로 취급한다.
    // (전엔 idx<0일 때 Enter를 그냥 흘려보내서, 댓글 입력창처럼 뒤에 체이닝된 onkeydown이 그 Enter를
    // "등록" 같은 별개 동작으로 오인해 실행해버리는 문제가 있었음 — 리스트가 열려있는 한 Enter/Tab은
    // 항상 콤보 선택으로 소비한다.)
    items[idx < 0 ? 0 : idx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    event.preventDefault();
    return true;
  }
  idx = event.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
  _plComboNavIndex[listId] = idx;
  items.forEach((el, i) => el.classList.toggle('pl-combo-active', i === idx));
  items[idx].scrollIntoView({ block: 'nearest' });
  event.preventDefault();
  return true;
}

// ── 항목 이미지 — 정산(계산서) 이미지 첨부와 같은 방식(리사이즈·압축 후 base64) 재사용 ──
function _plItemAddImage(bi, ii, dataUrl) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  const tmpImg = new Image();
  tmpImg.onload = () => {
    const MAX_W = 1400;
    const scale = tmpImg.width > MAX_W ? MAX_W / tmpImg.width : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(tmpImg.width * scale);
    canvas.height = Math.round(tmpImg.height * scale);
    canvas.getContext('2d').drawImage(tmpImg, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    if (!it.images) it.images = [];
    it.images.push(compressed);
    _plRenderWriteModal();
  };
  tmpImg.src = dataUrl;
}
function _plItemImgFileSelect(bi, ii, input) {
  const files = Array.from(input.files || []);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => _plItemAddImage(bi, ii, ev.target.result);
    reader.readAsDataURL(file);
  });
  input.value = '';
}
function _plItemImgRemove(bi, ii, idx) {
  _plDraft.blocks[bi]?.items[ii]?.images.splice(idx, 1);
  _plRenderWriteModal();
}
function _plItemOpenLightbox(bi, ii, idx) {
  const it = _plDraft.blocks[bi]?.items[ii];
  if (!it) return;
  openLightbox(idx, it.images);
}
// 붙여넣기(Ctrl+V) 대상 항목 추적 — 여러 항목이 있을 때 마지막으로 포커스된 항목에 붙여넣음
let _plLastFocusedItem = null;
document.addEventListener('paste', e => {
  const writeModal = document.getElementById('pl-modal-write');
  const editModal = document.getElementById('pl-modal-edit');
  const toWrite = writeModal && writeModal.classList.contains('open') && _plLastFocusedItem;
  const toEdit = !toWrite && editModal && editModal.classList.contains('open') && _plEditDraft;
  if (!toWrite && !toEdit) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    const reader = new FileReader();
    if (toWrite) {
      const { bi, ii } = _plLastFocusedItem;
      reader.onload = ev => _plItemAddImage(bi, ii, ev.target.result);
    } else {
      reader.onload = ev => _plEditAddImage(ev.target.result);
    }
    reader.readAsDataURL(file);
    break;
  }
});

function _plRenderItemAttachSection(bi, ii, it) {
  const arrow = it.optOpen ? '▾' : '▸';
  let inner = '';
  if (it.optOpen) {
    const linksHtml = (it.links || []).map((l, li) =>
      `<span class="tag">🔗 <input type="text" style="border:none;background:none;width:120px;font-size:11px;outline:none;" value="${_escHtml(l.label || l.url || '')}" placeholder="링크명/URL" oninput="_plLinkField(${bi},${ii},${li},this.value)"><span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plRemoveLink(${bi},${ii},${li})">✕</span></span>`
    ).join(' ');
    const imgsHtml = (it.images || []).map((src, i) => `
      <div style="position:relative;display:inline-block;">
        <img src="${src}" onclick="_plItemOpenLightbox(${bi},${ii},${i})" style="width:44px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:zoom-in;">
        <span onclick="_plItemImgRemove(${bi},${ii},${i})" style="position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:50%;background:#e53;color:#fff;font-size:9px;line-height:15px;text-align:center;cursor:pointer;">✕</span>
      </div>`).join('');

    inner = `<div style="padding:8px 4px 2px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="form-hint" style="width:36px;">이미지</span>${imgsHtml}
        <label class="tag" style="cursor:pointer;border-style:dashed;color:var(--text3);">📁 첨부<input type="file" accept="image/*" multiple style="display:none;" onchange="_plItemImgFileSelect(${bi},${ii},this)"></label>
        <span class="pl-paste-zone" tabindex="0" style="border:1px dashed var(--border2);border-radius:5px;padding:3px 9px;font-size:11px;color:var(--text3);cursor:text;outline:none;" onfocus="_plLastFocusedItem={bi:${bi},ii:${ii}}" onclick="this.focus()">여기 클릭 후 Ctrl+V</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span class="form-hint" style="width:36px;">링크</span>${linksHtml}<span class="tag" style="cursor:pointer;border-style:dashed;color:var(--text3);" onclick="_plAddLink(${bi},${ii})">＋ 링크</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="form-hint" style="width:36px;">경로</span>
        <input type="text" class="pl-mini" style="flex:1;min-width:200px;max-width:420px;" placeholder="공유폴더 경로 (예: \\\\192.168.0.250\\공유폴더\\...)" value="${_escHtml(it.attachPath || '')}" oninput="_plItemField(${bi},${ii},'attachPath',this.value)">
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="form-hint" style="width:36px;">파일명</span>
        <input type="text" class="pl-mini" style="flex:1;min-width:160px;max-width:320px;" placeholder="파일명" value="${_escHtml(it.attachName || '')}" oninput="_plItemField(${bi},${ii},'attachName',this.value)">
      </div>
    </div>`;
  }
  return `<div class="pl-opt" onclick="_plItemToggleCollapse(${bi},${ii})"><span>${arrow}</span><b>이미지 · 링크 · 첨부경로</b><span>— ${it.optOpen ? '펼침' : '접힘 · 필요할 때만'}</span></div>${inner}`;
}

// ── 유효성 검사 · 저장 ──
function _plValidateDraft() {
  const errors = [];
  const dateEl = document.getElementById('pl-w-date');
  if (!dateEl || !dateEl.value) errors.push('작성일을 입력해주세요.');

  _plDraft.blocks.forEach((b, bi) => {
    const validItems = b.items.filter(it => (it.summary || '').trim());
    if (!validItems.length) return; // 내용이 모두 빈 블록은 저장 시 자동 제외 — 검증 스킵
    if (!b.scope) { errors.push(`블록 ${bi + 1}: 대상을 선택해주세요.`); return; }
    if (b.scope === 'campaign' && !b.campaignId) errors.push(`블록 ${bi + 1}: 캠페인이 선택되지 않았습니다.`);
    if (b.scope === 'media' && !b.media) errors.push(`블록 ${bi + 1}: 매체를 선택해주세요.`);
    if (b.scope === 'project' && (!b.seller || !b.content)) errors.push(`블록 ${bi + 1}: 광고주·프로젝트를 확인해주세요.`);
    if (b.scope === 'internal' && !b.seller) errors.push(`블록 ${bi + 1}: 클라이언트를 입력해주세요.`);
    validItems.forEach((it, ii) => {
      if (!it.logType) errors.push(`블록 ${bi + 1} 항목 ${ii + 1}: 유형을 선택해주세요.`);
      if ((it.summary || '').length > 60) errors.push(`블록 ${bi + 1} 항목 ${ii + 1}: 내용은 60자 이하로 입력해주세요.`);
      if (it.progress === '' || it.progress == null) {
        errors.push(`블록 ${bi + 1} 항목 ${ii + 1}: 진척률을 입력해주세요.`);
      } else {
        const p = Number(it.progress);
        if (isNaN(p) || p < 0 || p > 100) errors.push(`블록 ${bi + 1} 항목 ${ii + 1}: 진척률은 0~100 사이여야 합니다.`);
      }
    });
  });

  const hasAny = _plDraft.blocks.some(b => b.items.some(it => (it.summary || '').trim()));
  if (!hasAny) errors.push('저장할 항목이 없습니다.');
  return errors;
}

function _plNextLogIdSeq() {
  const year = new Date().getFullYear();
  const prefix = `PL-${year}-`;
  let max = 0;
  PL_LOGS.forEach(l => {
    if ((l.id || '').startsWith(prefix)) {
      const n = parseInt((l.id || '').slice(prefix.length)) || 0;
      if (n > max) max = n;
    }
  });
  let n = max;
  return () => { n += 1; return prefix + n; };
}

function _plLogHistoryCreate(logId) {
  return _plDb('projectLogHistory').add({
    logId, changedBy: currentUser?.name || '', changedAt: new Date().toISOString(),
    changes: [{ field: '_create', label: '최초 작성', before: '', after: '' }],
  });
}

// ── 로그 이미지 — 정산(계산서) 이미지 첨부와 동일한 패턴: 리사이즈·압축 후 base64로 Firestore 저장, 문서ID=logId ──
async function _plSaveLogImages(logId, images) {
  try {
    if (images && images.length) {
      await _plDb('projectLogImages').doc(logId).set({ images, updatedAt: new Date().toISOString() });
    } else {
      await _plDb('projectLogImages').doc(logId).delete();
    }
  } catch (e) {
    console.error('[projectlog] 이미지 저장 실패', e);
  }
}
async function _plGetLogImages(logId) {
  try {
    const snap = await _plDb('projectLogImages').doc(logId).get();
    return snap.exists ? (snap.data().images || []) : [];
  } catch (e) {
    console.error('[projectlog] 이미지 조회 실패', e);
    return [];
  }
}
async function _plOpenLogImages(logId) {
  const images = await _plGetLogImages(logId);
  if (!images.length) { toast('첨부된 이미지가 없습니다', 'warn'); return; }
  openLightbox(0, images);
}

async function plSaveLog() {
  const errors = _plValidateDraft();
  if (errors.length) { alert(errors[0]); return; }

  const saveBtn = document.querySelector('#pl-modal-write .modal-foot .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중…'; }

  try {
    const nextId = _plNextLogIdSeq();
    // 항목추가로 한 번에 여러 건을 저장할 때, createdAt이 전부 똑같으면 목록 정렬(createdAt 내림차순)이
    // 둘을 구분 못 해서 안정정렬 때문에 저장 순서 그대로(오래된 게 위) 나와버린다 — 항목마다 1ms씩 밀어서 방지
    const nowBase = Date.now();
    let _seq = 0;
    const nextNow = () => new Date(nowBase + (_seq++)).toISOString();
    const logDate = document.getElementById('pl-w-date')?.value || _plTodayStr();
    const savedDocs = [];

    _plDraft.blocks.forEach(block => {
      const validItems = block.items.filter(it => (it.summary || '').trim());
      validItems.forEach(it => {
        const detail = (it.detail || []).filter(d => (d.text || '').trim()).map(d => ({ label: d.label || '', text: d.text.trim() }));
        const progress = (it.progress === '' || it.progress == null) ? null : Math.max(0, Math.min(100, parseInt(it.progress, 10) || 0));
        const images = (it.images || []).filter(Boolean);
        const now = nextNow();
        // 항목에 캠페인이 개별로 연결돼있으면(블록 자체는 광고주/프로젝트 단계) 그 항목만 캠페인 로그로
        // 저장한다 — 하나의 블록(같은 광고주/프로젝트) 안에서 캠페인별로 여러 건을 섞어 쓸 수 있게 하기 위함.
        const itemCamp = it.campaignId ? DATA.find(c => c.id === it.campaignId) : null;
        const doc = {
          id: nextId(),
          logDate, writer: currentUser?.name || '', writerId: currentUser?.id || '',
          bonbu: currentUser?.bonbu || '', dept: currentUser?.dept || '',
          scope: itemCamp ? 'campaign' : block.scope, seller: block.seller || null, content: block.content || null,
          campaignId: it.campaignId || block.campaignId || null,
          media: itemCamp ? (itemCamp.media || null) : (it.media || block.media || null),
          product: itemCamp ? (itemCamp.product || null) : (block.product || null),
          // 참조 캠페인 — 이 로그의 주 소속(scope)은 그대로 두고, 여기 담긴 캠페인들의 상세 화면 일지 탭에
          // "참조로 걸린 일지"로 같이 나타나게 하는 태그. 캠페인을 정확히 1개만 고른 항목(itemCamp)은
          // 직접등록으로 전환되므로(_plItemSetCamps) refCampaigns가 항상 비어있다.
          refCampaignIds: itemCamp ? [] : (it.refCampaigns || []).filter(Boolean),
          logType: it.logType || '운영',
          state: ['이슈', '요청'].includes(it.logType) ? '진행중' : null,
          summary: it.summary.trim().slice(0, 60), detail,
          progress,
          important: false, shared: false,
          hasImages: images.length > 0, imageCount: images.length, links: (it.links || []).filter(l => (l.label || l.url || '').trim()),
          attachPath: (it.attachPath || '').trim() || null, attachName: (it.attachName || '').trim() || null,
          threadId: null, createdAt: now, updatedAt: now,
          // "이어쓰기"로 만들어진 항목이면 원본 로그 id — _plContinueCandidates가 원본을 미완료
          // 후보에서 빼는 기준이자, 상세 펼침의 "이전/이어서 쓴 기록" 링크의 근거가 된다.
          continuedFromId: it.continuedFromId || null,
        };
        doc.searchText = _plBuildSearchText(doc);
        savedDocs.push({ doc, images });
      });
    });

    if (!savedDocs.length) { alert('저장할 내용이 없습니다.'); return; }

    for (const { doc, images } of savedDocs) {
      await _plDb('projectLogs').doc(doc.id).set(doc);
      await _plLogHistoryCreate(doc.id);
      if (images.length) await _plSaveLogImages(doc.id, images);
    }

    localStorage.removeItem(PL_DRAFT_KEY); // 이전 버전에서 남아있을 수 있는 임시저장 정리
    _plDraft = { blocks: [] };
    closeModal('pl-modal-write');
    toast(`✓ 일지 ${savedDocs.length}건 저장되었습니다`, 'ok');
    plSwitchTab('log'); // plRenderLogTab()만 부르면 탭 버튼 활성화 표시가 안 바뀌어서 실제 탭과 어긋남
  } catch (e) {
    console.error('[projectlog] 저장 실패', e);
    toast('저장 중 오류가 발생했습니다', 'err');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
  }
}

// ── 1-3. 삭제 (projectLogDeleted 로 이관 후 원본 삭제) ──
async function plDeleteLog(logId) {
  const log = PL_LOGS.find(l => l.id === logId);
  if (!log) return;
  if (!_plCanDeleteLog(log)) { toast('삭제 권한이 없습니다', 'err'); return; }
  // 이슈를 지우면 threadId로 연결된 대응/해결 기록들이 원본 없는 고아 참조로 남는다 — 그걸 막기 위해
  // 하위 기록이 하나라도 있으면 삭제 자체를 막는다. 지우려면 대응/해결부터 먼저 지워야 한다(방사형 구조라
  // 대응 기록은 그 자체로 leaf라서, 순서대로 지우면 고아가 생길 여지가 없다).
  const children = PL_LOGS.filter(l => l.threadId === logId);
  if (children.length) { alert(`이 이슈에 대응·해결 기록이 ${children.length}건 연결되어 있어 삭제할 수 없습니다.\n먼저 하위 기록부터 삭제해주세요.`); return; }
  if (!confirm('이 일지를 삭제하시겠습니까?')) return;
  try {
    const archived = Object.assign({}, log, {
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser?.name || '',
    });
    await _plDb('projectLogDeleted').doc(`del_${logId}_${Date.now()}`).set(archived);
    await _plDb('projectLogs').doc(logId).delete();
    _plExpanded.delete(logId);
    toast('✓ 삭제되었습니다', 'ok');
  } catch (e) {
    console.error('[projectlog] 삭제 실패', e);
    toast('삭제 중 오류가 발생했습니다', 'err');
  }
}

// ══════════════════════════════════════════════════════════
// 3-4. 로그 수정 화면
// ══════════════════════════════════════════════════════════

let _plEditDraft = null;
let _plEditSearchCache = [];

const PL_FIELD_LABELS = {
  scope: '대상 유형', seller: '광고주', content: '프로젝트', campaignId: '캠페인', media: '매체', product: '상품',
  logType: '유형', summary: '내용', progress: '진척률', state: '상태', attachPath: '첨부경로', attachName: '첨부 파일명',
};

// plOpenEdit(모달)과 _plDateStartInlineEdit(일자별 뷰 인라인)가 공유하는 draft 구성 — 필드 목록이
// 어긋나면 둘 중 하나만 최신이 아닌 상태로 갈리기 쉬워서 한 곳으로 모아둠.
function _plBuildEditDraft(log) {
  return {
    id: log.id, logDate: log.logDate, writer: log.writer, writerId: log.writerId,
    bonbu: log.bonbu, dept: log.dept, createdAt: log.createdAt,
    scope: log.scope, seller: log.seller, content: log.content,
    campaignId: log.campaignId, media: log.media, product: log.product,
    logType: log.logType, summary: log.summary || '', progress: log.progress,
    detail: (log.detail || []).map(d => ({ label: d.label || '', text: d.text || '' })),
    links: (log.links || []).map(l => Object.assign({}, l)),
    refCampaigns: [...(log.refCampaignIds || [])],
    attachPath: log.attachPath || '', attachName: log.attachName || '',
    images: [],
    important: !!log.important, shared: !!log.shared,
    state: log.state || null, searchQuery: '',
    extraItems: [], // "+ 항목 추가" — 같은 대상으로 별도 새 로그가 될 항목들(기본줄+하위기록만)
  };
}
async function plOpenEdit(logId) {
  const log = PL_LOGS.find(l => l.id === logId);
  if (!log) { toast('일지를 찾을 수 없습니다', 'err'); return; }
  _plEditDraft = _plBuildEditDraft(log);
  if (!document.getElementById('pl-modal-edit')) _plBuildEditModalShell();
  _plRenderEditModal();
  openModal('pl-modal-edit');
  // 이미지는 별도 컬렉션이라 모달을 먼저 열고 백그라운드로 불러온 뒤 도착하면 다시 그린다
  if (log.hasImages) {
    const images = await _plGetLogImages(logId);
    if (_plEditDraft && _plEditDraft.id === logId) {
      _plEditDraft.images = images;
      _plRenderEditModal();
    }
  }
}

// ── 일자별 뷰 전용 — 모달 없이 그 카드 자리에서 바로 수정 ──
let _plInlineEditId = null;
async function _plDateStartInlineEdit(logId) {
  const log = PL_LOGS.find(l => l.id === logId);
  if (!log) { toast('일지를 찾을 수 없습니다', 'err'); return; }
  if (!_plCanEditLog({ writerId: log.writerId })) { toast('수정 권한이 없습니다', 'err'); return; }
  _plEditDraft = _plBuildEditDraft(log);
  _plEditDraft.__inline = true;
  _plInlineEditId = logId;
  _plRenderDateBody();
  if (log.hasImages) {
    const images = await _plGetLogImages(logId);
    if (_plEditDraft && _plEditDraft.id === logId && _plEditDraft.__inline) {
      _plEditDraft.images = images;
      _plRenderDateBody();
    }
  }
}
function _plDateCancelInlineEdit() {
  _plInlineEditId = null;
  _plRenderDateBody();
}
// 대상(광고주/프로젝트/캠페인/매체)은 인라인에서는 읽기 전용으로만 보여준다 — 검색해서 바꾸는 UI는
// 모달 전용 id(#pl-e-tgt 등)에 묶여있어 여기서 그대로 재사용하면 충돌하고, 대상을 바꾸는 건 애초에
// 자주 있는 일도 아니라서 필요하면 "수정" 대신 기존 모달로 열도록 남겨둔다.
function _plDateInlineTargetLabel() {
  const d = _plEditDraft;
  if (d.scope === 'campaign') return `${_escHtml(d.seller || '')} &gt; ${_escHtml(d.content || '브랜드 미지정')} &gt; ${_escHtml(d.campaignId || '')}`;
  if (d.scope === 'media') return `${_escHtml(d.media || '')} <span class="form-hint">(매체 전반)</span>`;
  if (d.scope === 'internal') return `${_escHtml(d.seller || '')}${d.content ? ' &gt; ' + _escHtml(d.content) : ''} <span class="tag pl-inner">내부</span>`;
  if (d.scope === 'project') return `${_escHtml(d.seller || '')} &gt; ${_escHtml(d.content || '')}`;
  return `${_escHtml(d.seller || '')} <span class="form-hint">(광고주 전반)</span>`;
}
// 수정 모달과 같은 조립 함수(_plEditItemHtml/_plEditExtraItemsHtml/_plEditMetaHtml)를 그대로 재사용 —
// 이 함수들은 HTML 문자열만 만들어서 반환하는 역할이라 모달이 아니라 카드 안에 꽂아도 그대로 동작한다.
function _plDateInlineEditHtml() {
  const d = _plEditDraft;
  const canDel = _plCanDeleteLog({ writerId: d.writerId });
  return `<div class="pl-block" style="border:1.5px dashed var(--accent);border-radius:8px;overflow:hidden;margin-top:4px;">
    <div class="pl-bhead" style="background:var(--accent-light);">
      <b style="font-size:12.5px;">${_plDateInlineTargetLabel()}</b>
      <span class="form-hint" style="margin-left:auto;">✎ 인라인 수정 중</span>
    </div>
    <div class="pl-bbody">
      ${_plEditItemHtml()}
      ${_plEditExtraItemsHtml()}<div class="pl-add" onclick="_plEditAddExtraItem()">＋ 항목 추가 <span class="form-hint" style="font-weight:400;">— 같은 대상으로 새 로그 별도 생성</span></div>
      ${_plEditMetaHtml()}
    </div>
    <div class="modal-foot" style="position:static;">
      ${canDel ? `<span class="pl-x" onclick="plDeleteLogFromEdit()" style="color:var(--red);">삭제</span>` : '<span></span>'}
      <div style="margin-left:auto;display:flex;gap:8px;">
        <button class="btn btn-outline btn-sm" onclick="_plDateCancelInlineEdit()">취소</button>
        <button class="btn btn-primary btn-sm" id="pl-di-savebtn" onclick="plSaveEdit()">저장</button>
      </div>
    </div>
  </div>`;
}

function _plBuildEditModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-edit';
  overlay.innerHTML = `
    <div class="modal" style="width:920px;max-width:96vw;">
      <div class="modal-head">
        <div>
          <div class="modal-title" style="display:flex;align-items:center;gap:8px;"><span id="pl-e-title">✎ 일지 수정</span> <span id="pl-e-delbtn-head"></span></div>
          <div id="pl-e-badges" style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap;align-items:center;"></div>
        </div>
        <button class="modal-close" onclick="closeModal('pl-modal-edit')">✕</button>
      </div>
      <div class="modal-body" style="background:var(--bg);max-height:70vh;overflow-y:auto;">
        <div id="pl-e-block"></div>
      </div>
      <div class="modal-foot">
        <span class="form-hint" id="pl-e-foothint">변경 이력이 자동 기록됩니다 (삭제는 작성자·관리자만 가능)</span>
        <div style="margin-left:auto;display:flex;gap:8px;" id="pl-e-footbtns"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function _plEditTargetLabel() {
  const d = _plEditDraft;
  if (!d.scope) return '';
  if (d.scope === 'media') return d.media || '';
  return d.seller || '';
}
function _plEditSecondaryControl() {
  const d = _plEditDraft;
  if (d.scope === 'advertiser' || d.scope === 'project' || d.scope === 'campaign') {
    const seller = SELLER_DATA.find(s => s.company === d.seller);
    const brandNames = (seller?.brands || []).map(b => b.name).filter(Boolean);
    const brandOpts = ['', ...brandNames, '브랜드 미지정'].map(v => {
      const val = v || '';
      const label = v || '브랜드 선택 (선택)';
      return `<option value="${_escHtml(val)}" ${(d.content || '') === val ? 'selected' : ''}>${_escHtml(label)}</option>`;
    }).join('');
    const brandSelect = `<select class="f-sel" style="font-weight:700;" onchange="_plEditSetProject(this.value)">${brandOpts}</select>`;

    const camps = DATA.filter(c => (c.seller || c.adv) === d.seller && c.status !== '삭제'
      && (!d.content || (c.content || null) === (d.content || null)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const campOpts = [`<option value="">캠페인 선택 (선택)</option>`, ...camps.map(c => {
      const dateShort = (c.date || '').slice(5, 10).replace('-', '.');
      const label = `${c.id} · ${dateShort} ${c.media || ''} ${c.product || ''}`;
      return `<option value="${_escHtml(c.id)}" ${c.id === d.campaignId ? 'selected' : ''}>${_escHtml(label)}</option>`;
    })].join('');
    const campSelect = `<select class="f-sel" style="font-weight:700;min-width:190px;" onchange="_plEditSetCampaign(this.value)">${campOpts}</select>`;

    return brandSelect + campSelect;
  }
  if (d.scope === 'internal') {
    return `<div class="combo-wrap" style="position:relative;">
      <input type="text" class="f-sel" style="font-weight:700;width:140px;" id="pl-e-task" value="${_escHtml(d.content || '')}" placeholder="테스크"
        oninput="_plEditTaskInput(this.value)" onfocus="_plEditTaskInput(this.value)"
        onkeydown="_plComboKeyNav(event,'pl-e-task-list')">
      <div class="combo-list" id="pl-e-task-list" style="display:none;"></div>
    </div>`;
  }
  return '';
}
function _plEditSetCampaign(campaignId) {
  const d = _plEditDraft;
  if (!campaignId) {
    d.campaignId = null; d.media = null; d.product = null;
    d.scope = d.content ? 'project' : 'advertiser';
    _plEditRerender();
    return;
  }
  const c = DATA.find(x => x.id === campaignId);
  if (!c) return;
  d.campaignId = c.id;
  d.content = c.content || d.content || null;
  d.media = c.media || null;
  d.product = c.product || null;
  d.scope = 'campaign';
  _plEditRerender();
}
function _plEditSetProject(value) {
  const d = _plEditDraft;
  d.content = value || null;
  if (d.campaignId) {
    const c = DATA.find(x => x.id === d.campaignId);
    if (!c || (c.content || null) !== (d.content || null)) {
      d.campaignId = null; d.media = null; d.product = null;
    }
  }
  d.scope = d.campaignId ? 'campaign' : (value ? 'project' : 'advertiser');
  _plEditRerender();
}
function _plEditTaskInput(val) {
  _plEditDraft.content = val;
  const list = document.getElementById('pl-e-task-list');
  if (!list) return;
  _plComboNavIndex['pl-e-task-list'] = -1;
  const q = (val || '').trim().toLowerCase();
  const tasks = [...new Set(PL_LOGS.filter(l => l.scope === 'internal' && l.seller === _plEditDraft.seller && l.content).map(l => l.content))];
  const matched = q ? tasks.filter(t => t.toLowerCase().includes(q)) : tasks;
  if (!matched.length) { list.style.display = 'none'; return; }
  list.innerHTML = matched.slice(0, 10).map(t => `<div class="combo-item" onmousedown="_plEditTaskPick('${_escHtml(t)}')">${_escHtml(t)}</div>`).join('');
  list.style.display = 'block';
}
function _plEditTaskPick(val) {
  _plEditDraft.content = val;
  const list = document.getElementById('pl-e-task-list'); if (list) list.style.display = 'none';
  const input = document.getElementById('pl-e-task'); if (input) input.value = val;
}

function _plEditSearch(query) {
  _plEditDraft.searchQuery = query;
  const list = document.getElementById('pl-e-tgt-list');
  if (!list) return;
  _plComboNavIndex['pl-e-tgt-list'] = -1;
  const results = _plBlockSearchResults(query);
  _plEditSearchCache = results;
  let html = results.map((r, ri) =>
    `<div class="combo-item" onmousedown="_plEditPick(${ri})">${_escHtml(r.label)} <span class="pl-ctype">${_escHtml(r.sub)}</span></div>`
  ).join('');
  const trimmed = (query || '').trim();
  if (trimmed && !results.some(r => r.type === 'internal' && r.label === trimmed)) {
    html += `<div class="combo-add" onmousedown="_plEditPickNewInternal()">＋ "${_escHtml(trimmed)}" 새 내부 업무로 추가</div>`;
  }
  if (!html) { list.style.display = 'none'; return; }
  list.innerHTML = html;
  list.style.display = 'block';
}
function _plEditPick(ri) {
  const r = _plEditSearchCache[ri];
  if (!r) return;
  const d = _plEditDraft;
  d.scope = r.type; d.seller = r.seller || null; d.content = r.content || null;
  d.campaignId = r.campaignId || null; d.media = r.media || null; d.product = r.product || null;
  const list = document.getElementById('pl-e-tgt-list'); if (list) list.style.display = 'none';
  _plEditRerender();
}
function _plEditPickNewInternal() {
  const q = (_plEditDraft.searchQuery || '').trim();
  if (!q) return;
  const d = _plEditDraft;
  d.scope = 'internal'; d.seller = q; d.content = null; d.campaignId = null; d.media = null; d.product = null;
  const list = document.getElementById('pl-e-tgt-list'); if (list) list.style.display = 'none';
  _plEditRerender();
}

// ── 참조 캠페인(수정) — 작성 화면의 항목별 참조 태그와 같은 기능을 수정 모달/일자별 인라인 수정에서도
// 그대로 쓸 수 있게 한다(등록폼 바뀌면 수정 화면도 같이 맞추는 규칙). 대상은 _plEditDraft 하나뿐이라
// bi/ii 없이 전역 draft를 직접 다룬다. 인라인 수정 중엔 목록 id가 모달용과 겹치므로 따로 쓴다(_plEditRefCampListId).
function _plEditRefCampEligible() {
  const d = _plEditDraft;
  return !!d && (d.scope === 'advertiser' || d.scope === 'project') && !d.campaignId;
}
let _plEditRefCampSearchCache = [];
function _plEditRefCampSearchResults(query) {
  const d = _plEditDraft;
  const q = (query || '').trim();
  const already = new Set(d.refCampaigns || []);
  return DATA.filter(c => (c.seller || c.adv) === d.seller
      && (c.content || null) === (d.content || null) && c.status !== '삭제' && !already.has(c.id))
    .filter(c => !q || _plTokenMatch(`${c.id} ${c.media || ''} ${c.product || ''} ${(c.date || '').slice(0, 10)}`, q))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(c => ({ label: `${c.id} · ${(c.date || '').slice(5, 10).replace('-', '.')} ${c.media || ''} ${c.product || ''}`, campaignId: c.id }))
    .slice(0, 30);
}
function _plEditRefCampListId() { return _plEditDraft?.__inline ? 'pl-di-ref-list' : 'pl-e-ref-list'; }
function _plEditRefCampSearchInput(inputEl) {
  const listId = _plEditRefCampListId();
  const list = document.getElementById(listId);
  if (!list || !_plEditDraft) return;
  if (!inputEl.value.trim()) { list.style.display = 'none'; list.innerHTML = ''; return; }
  const results = _plEditRefCampSearchResults(inputEl.value);
  _plEditRefCampSearchCache = results;
  _plComboNavIndex[listId] = -1;
  if (!results.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.innerHTML = results.map((r, i) => `<div class="combo-item" onmousedown="_plEditRefCampPick(${i})">${_escHtml(r.label)}</div>`).join('');
  list.style.display = 'block';
  _plFloatCombo(inputEl, list);
}
function _plEditRefCampPick(i) {
  const r = _plEditRefCampSearchCache[i];
  if (!r || !_plEditDraft) return;
  if (!_plEditDraft.refCampaigns) _plEditDraft.refCampaigns = [];
  if (!_plEditDraft.refCampaigns.includes(r.campaignId)) _plEditDraft.refCampaigns.push(r.campaignId);
  const list = document.getElementById(_plEditRefCampListId());
  if (list) list.style.display = 'none';
  _plEditRerender();
}
function _plEditRefCampRemove(ri) {
  _plEditDraft.refCampaigns.splice(ri, 1);
  _plEditRerender();
}
function _plEditRefCampFieldHtml() {
  const d = _plEditDraft;
  const tagsHtml = (d.refCampaigns || []).map((cid, ri) => {
    const c = DATA.find(x => x.id === cid);
    const sub = c ? `${(c.date || '').slice(5, 10).replace('-', '.')} ${c.media || ''} ${c.product || ''}` : '';
    return `<span class="tag pl-ref" data-tooltip="${_escHtml(sub)}">🔗 ${_escHtml(cid)}<span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plEditRefCampRemove(${ri})">✕</span></span>`;
  }).join('');
  const listId = _plEditRefCampListId();
  return `<div class="pl-media-row"><div class="pl-reftags combo-wrap">
    ${tagsHtml}
    <input type="text" placeholder="🔗 참조 캠페인 검색 (선택, 여러 개)" autocomplete="off"
      oninput="_plEditRefCampSearchInput(this)" onfocus="_plEditRefCampSearchInput(this)"
      onkeydown="_plComboKeyNav(event,'${listId}')"
      onblur="setTimeout(()=>{const l=document.getElementById('${listId}');if(l)l.style.display='none';},150)">
    <div class="combo-list" id="${listId}" style="display:none;"></div>
  </div></div>`;
}
function _plEditItemHtml() {
  const d = _plEditDraft;
  const typeOpts = PL_LOG_TYPES.map(t => `<option value="${t}" ${d.logType === t ? 'selected' : ''}>${t}</option>`).join('');
  const ph = PL_SUMMARY_PH[d.logType] || '';
  const subHtml = (d.detail || []).map((det, di) => _plEditSubHtml(di, det)).join('');
  return `<div class="pl-item">
    ${_plEditRefCampEligible() ? _plEditRefCampFieldHtml() : ''}
    <div class="pl-irow">
      <select class="pl-mini" style="font-weight:700;" onchange="_plEditTypeChange(this.value)">${typeOpts}</select>
      <input type="text" class="pl-mini" maxlength="60" placeholder="${_escHtml(ph)}" value="${_escHtml(d.summary || '')}" oninput="_plEditField('summary',this.value)">
      <div class="pl-pct-wrap"><input type="text" class="pl-mini pl-pct" placeholder="진척률" value="${d.progress ?? ''}" oninput="_plEditField('progress',this.value)"><span class="pl-pct-suffix">%</span></div>
      <span></span>
    </div>
    ${subHtml}
    <div class="pl-subadd" onclick="_plEditAddSub()">ㄴ 추가</div>
  </div>`;
}
function _plEditSubHtml(di, d) {
  const preset = PL_LABEL_PRESET[_plEditDraft.logType] || { opts: [] };
  const isCustom = !!d.customMode || (!!d.label && !preset.opts.includes(d.label));
  let labelControl;
  if (isCustom) {
    labelControl = `<div class="combo-wrap" style="position:relative;">
      <input type="text" class="pl-mini" id="pl-e-lbl-${di}" placeholder="라벨 직접 입력" value="${_escHtml(d.label || '')}"
        oninput="_plEditSubLabelCustomInput(${di},this.value)" onfocus="_plEditSubLabelCustomInput(${di},this.value)"
        onkeydown="_plComboKeyNav(event,'pl-e-lbl-list-${di}')">
      <div class="combo-list" id="pl-e-lbl-list-${di}" style="display:none;"></div>
    </div>`;
  } else {
    const opts = ['라벨 없음', ...preset.opts, '직접 입력…'];
    const selHtml = opts.map(o => {
      const val = o === '라벨 없음' ? '' : (o === '직접 입력…' ? '__custom__' : o);
      const selected = o === '직접 입력…' ? false : val === (d.label || '');
      return `<option value="${val}" ${selected ? 'selected' : ''}>${o}</option>`;
    }).join('');
    labelControl = `<select class="pl-mini" onchange="_plEditSubLabelSelect(${di},this.value)">${selHtml}</select>`;
  }
  return `<div class="pl-sub"><span class="pl-m">ㄴ</span>
    ${labelControl}
    <textarea class="pl-mini" rows="${Math.max(1, (d.text || '').split('\n').length)}" placeholder="내용을 입력하세요" style="resize:vertical;font-family:inherit;line-height:1.4;overflow:hidden;" oninput="_plEditSubField(${di},'text',this.value);_plAutoGrowTextarea(this)">${_escHtml(d.text || '')}</textarea>
    <span class="pl-x" onclick="_plEditRemoveSub(${di})">✕</span>
  </div>`;
}
// ── "+ 항목 추가" — 수정 중인 로그와 같은 대상(광고주/프로젝트/캠페인/매체)으로, 별도의 새 로그가 될
// 항목을 여기서 같이 입력할 수 있게 한다. 기본줄+하위기록만(첨부는 없음) — 저장 시 원본 수정과 별개로
// 새 로그 문서로 생성된다(plSaveEdit).
function _plEditExtraItemsHtml() {
  return (_plEditDraft.extraItems || []).map((it, ei) => _plEditExtraItemHtml(ei, it)).join('');
}
function _plEditExtraItemHtml(ei, it) {
  const typeOpts = PL_LOG_TYPES.map(t => `<option value="${t}" ${it.logType === t ? 'selected' : ''}>${t}</option>`).join('');
  const ph = PL_SUMMARY_PH[it.logType] || '';
  const subHtml = (it.detail || []).map((det, di) => _plEditExtraSubHtml(ei, di, det)).join('');
  return `<div class="pl-item pl-newgroup">
    <div class="pl-irow">
      <select class="pl-mini" style="font-weight:700;" onchange="_plEditExtraTypeChange(${ei},this.value)">${typeOpts}</select>
      <input type="text" class="pl-mini" maxlength="60" placeholder="${_escHtml(ph)}" value="${_escHtml(it.summary || '')}" oninput="_plEditExtraField(${ei},'summary',this.value)">
      <div class="pl-pct-wrap"><input type="text" class="pl-mini pl-pct" placeholder="진척률" value="${it.progress ?? ''}" oninput="_plEditExtraField(${ei},'progress',this.value)"><span class="pl-pct-suffix">%</span></div>
      <span class="pl-x" onclick="_plEditRemoveExtraItem(${ei})">✕</span>
    </div>
    ${subHtml}
    <div class="pl-subadd" onclick="_plEditExtraAddSub(${ei})">ㄴ 추가</div>
  </div>`;
}
function _plEditExtraSubHtml(ei, di, d) {
  const it = _plEditDraft?.extraItems[ei];
  const preset = PL_LABEL_PRESET[it?.logType] || { opts: [] };
  const isCustom = !!d.customMode || (!!d.label && !preset.opts.includes(d.label));
  let labelControl;
  if (isCustom) {
    labelControl = `<div class="combo-wrap" style="position:relative;">
      <input type="text" class="pl-mini" id="pl-ee-lbl-${ei}-${di}" placeholder="라벨 직접 입력" value="${_escHtml(d.label || '')}"
        oninput="_plEditExtraSubLabelCustomInput(${ei},${di},this.value)" onfocus="_plEditExtraSubLabelCustomInput(${ei},${di},this.value)"
        onkeydown="_plComboKeyNav(event,'pl-ee-lbl-list-${ei}-${di}')">
      <div class="combo-list" id="pl-ee-lbl-list-${ei}-${di}" style="display:none;"></div>
    </div>`;
  } else {
    const opts = ['라벨 없음', ...preset.opts, '직접 입력…'];
    const selHtml = opts.map(o => {
      const val = o === '라벨 없음' ? '' : (o === '직접 입력…' ? '__custom__' : o);
      const selected = o === '직접 입력…' ? false : val === (d.label || '');
      return `<option value="${val}" ${selected ? 'selected' : ''}>${o}</option>`;
    }).join('');
    labelControl = `<select class="pl-mini" onchange="_plEditExtraSubLabelSelect(${ei},${di},this.value)">${selHtml}</select>`;
  }
  return `<div class="pl-sub"><span class="pl-m">ㄴ</span>
    ${labelControl}
    <textarea class="pl-mini" rows="${Math.max(1, (d.text || '').split('\n').length)}" placeholder="내용을 입력하세요" style="resize:vertical;font-family:inherit;line-height:1.4;overflow:hidden;" oninput="_plEditExtraSubField(${ei},${di},'text',this.value);_plAutoGrowTextarea(this)">${_escHtml(d.text || '')}</textarea>
    <span class="pl-x" onclick="_plEditExtraRemoveSub(${ei},${di})">✕</span>
  </div>`;
}
function _plEditExtraSubLabelSelect(ei, di, val) {
  const d = _plEditDraft?.extraItems[ei]?.detail[di]; if (!d) return;
  if (val === '__custom__') { d.customMode = true; d.label = ''; } else { d.label = val; d.customMode = false; }
  _plEditRerender();
}
function _plEditExtraSubLabelCustomInput(ei, di, val) {
  const d = _plEditDraft?.extraItems[ei]?.detail[di]; if (!d) return;
  d.label = val; d.customMode = true;
  const list = document.getElementById(`pl-ee-lbl-list-${ei}-${di}`);
  if (!list) return;
  _plComboNavIndex[`pl-ee-lbl-list-${ei}-${di}`] = -1;
  const q = val.trim().toLowerCase();
  const existing = _plExistingLabels();
  const matched = q ? existing.filter(l => l.toLowerCase().includes(q)) : existing;
  let html = matched.slice(0, 10).map(l => `<div class="combo-item" onmousedown="_plEditExtraSubLabelPick(${ei},${di},'${_escHtml(l)}')">${_escHtml(l)}</div>`).join('');
  const trimmed = val.trim();
  if (trimmed && !existing.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
    html += `<div class="combo-add" onmousedown="_plEditExtraSubLabelPick(${ei},${di},'${_escHtml(trimmed)}')">＋ "${_escHtml(trimmed)}" 새 라벨로 추가</div>`;
  }
  if (!html) { list.style.display = 'none'; return; }
  list.innerHTML = html;
  list.style.display = 'block';
}
function _plEditExtraSubLabelPick(ei, di, val) {
  const d = _plEditDraft?.extraItems[ei]?.detail[di]; if (!d) return;
  d.label = val; d.customMode = true;
  _plEditRerender();
}
function _plEditExtraField(ei, field, val) { const it = _plEditDraft?.extraItems[ei]; if (it) it[field] = val; }
function _plEditExtraSubField(ei, di, field, val) { const d = _plEditDraft?.extraItems[ei]?.detail[di]; if (d) d[field] = val; }
function _plEditExtraTypeChange(ei, val) {
  const it = _plEditDraft?.extraItems[ei];
  if (!it) return;
  it.logType = val;
  const preset = PL_LABEL_PRESET[val];
  if (preset && preset.auto.length && (!it.detail || it.detail.length === 0)) {
    it.detail = preset.auto.map(label => ({ label, text: '' }));
  }
  _plEditRerender();
}
function _plEditExtraAddSub(ei) {
  const it = _plEditDraft?.extraItems[ei];
  if (!it) return;
  if (!it.detail) it.detail = [];
  it.detail.push({ label: '', text: '' });
  _plEditRerender();
}
function _plEditExtraRemoveSub(ei, di) { _plEditDraft.extraItems[ei].detail.splice(di, 1); _plEditRerender(); }
function _plEditAddExtraItem() {
  if (!_plEditDraft.extraItems) _plEditDraft.extraItems = [];
  _plEditDraft.extraItems.push(_plEmptyItem());
  _plEditRerender();
}
function _plEditRemoveExtraItem(ei) { _plEditDraft.extraItems.splice(ei, 1); _plEditRerender(); }

function _plEditField(field, val) { if (_plEditDraft) _plEditDraft[field] = val; }
function _plEditSubField(di, field, val) { const d = _plEditDraft?.detail[di]; if (d) d[field] = val; }
function _plEditTypeChange(val) {
  _plEditDraft.logType = val;
  const preset = PL_LABEL_PRESET[val];
  if (preset && preset.auto.length && (!_plEditDraft.detail || _plEditDraft.detail.length === 0)) {
    _plEditDraft.detail = preset.auto.map(label => ({ label, text: '' }));
  }
  _plEditRerender();
}
function _plEditAddSub() {
  if (!_plEditDraft.detail) _plEditDraft.detail = [];
  _plEditDraft.detail.push({ label: '', text: '' });
  _plEditRerender();
}
function _plEditRemoveSub(di) { _plEditDraft.detail.splice(di, 1); _plEditRerender(); }
function _plEditSubLabelSelect(di, val) {
  const d = _plEditDraft.detail[di]; if (!d) return;
  if (val === '__custom__') { d.customMode = true; d.label = ''; } else { d.label = val; d.customMode = false; }
  _plEditRerender();
}
function _plEditSubLabelCustomInput(di, val) {
  const d = _plEditDraft.detail[di]; if (!d) return;
  d.label = val; d.customMode = true;
  const list = document.getElementById(`pl-e-lbl-list-${di}`);
  if (!list) return;
  _plComboNavIndex[`pl-e-lbl-list-${di}`] = -1;
  const q = val.trim().toLowerCase();
  const existing = _plExistingLabels();
  const matched = q ? existing.filter(l => l.toLowerCase().includes(q)) : existing;
  let html = matched.slice(0, 10).map(l => `<div class="combo-item" onmousedown="_plEditSubLabelPick(${di},'${_escHtml(l)}')">${_escHtml(l)}</div>`).join('');
  const trimmed = val.trim();
  if (trimmed && !existing.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
    html += `<div class="combo-add" onmousedown="_plEditSubLabelPick(${di},'${_escHtml(trimmed)}')">＋ "${_escHtml(trimmed)}" 새 라벨로 추가</div>`;
  }
  if (!html) { list.style.display = 'none'; return; }
  list.innerHTML = html;
  list.style.display = 'block';
}
function _plEditSubLabelPick(di, val) {
  const d = _plEditDraft.detail[di]; if (!d) return;
  d.label = val; d.customMode = true;
  _plEditRerender();
}

function _plEditToggleFlag(field) {
  _plEditDraft[field] = !_plEditDraft[field];
  _plEditRerender();
}
function _plEditMetaHtml() {
  const d = _plEditDraft;
  const stateOpts = ['', '진행중', '완료'].map(s => `<option value="${s}" ${((d.state || '') === s) ? 'selected' : ''}>${s || '없음'}</option>`).join('');
  const impActive = d.important ? ' pl-toggle-on' : '';
  const shrActive = d.shared ? ' pl-toggle-on' : '';
  return `<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:12px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">
      <div class="fg"><label class="form-label">상태</label><select class="form-sel" onchange="_plEditField('state',this.value||null)">${stateOpts}</select></div>
      <div class="fg"><label class="form-label">표시</label>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm${impActive}" onclick="_plEditToggleFlag('important')">★ 중요</button>
          <button class="btn btn-ghost btn-sm${shrActive}" onclick="_plEditToggleFlag('shared')">🔗 공유</button>
        </div>
      </div>
      <div class="fg"><label class="form-label">작성 정보</label>
        <div class="form-hint" style="padding-top:8px;">${_escHtml(d.writer || '')} · ${_escHtml(d.bonbu || '')} ${_escHtml(d.dept || '')} · <span class="f-mono">${_escHtml(d.logDate || '')}${d.createdAt ? ' ' + _plFmtHHMM(d.createdAt) : ''}</span>
          ${d.newFor ? '' : `<span class="pl-x" style="margin-left:6px;" onclick="plOpenHistoryModal('${d.id}')">이력 보기</span>`}
        </div>
      </div>
    </div>
    ${_plEditAttachHtml()}
  </div>`;
}

function _plEditAttachHtml() {
  const d = _plEditDraft;
  let mediaField;
  if (d.scope === 'campaign') {
    mediaField = `<span class="form-hint">${_escHtml(d.media || '—')} (캠페인에서 자동)</span>`;
  } else {
    const mediaOpts = ['', ..._plMediaNames()].map(m =>
      `<option value="${_escHtml(m)}" ${(d.media || '') === m ? 'selected' : ''}>${m || '매체 선택'}</option>`
    ).join('');
    mediaField = `<select class="f-sel" style="width:140px;" onchange="_plEditField('media',this.value||null)">${mediaOpts}</select>`;
  }
  const linksHtml = (d.links || []).map((l, li) =>
    `<span class="tag">🔗 <input type="text" style="border:none;background:none;width:120px;font-size:11px;outline:none;" value="${_escHtml(l.label || l.url || '')}" placeholder="링크명/URL" oninput="_plEditLinkField(${li},this.value)"><span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plEditRemoveLink(${li})">✕</span></span>`
  ).join(' ');
  const imgsHtml = (d.images || []).map((src, i) => `
    <div style="position:relative;display:inline-block;">
      <img src="${src}" onclick="_plEditOpenLightbox(${i})" style="width:44px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:zoom-in;">
      <span class="pl-edit-rmbtn" onclick="_plEditImgRemove(${i})" style="position:absolute;top:-5px;right:-5px;width:15px;height:15px;border-radius:50%;background:#e53;color:#fff;font-size:9px;line-height:15px;text-align:center;cursor:pointer;">✕</span>
    </div>`).join('');
  return `<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
    <div style="display:flex;align-items:center;gap:8px;"><label class="form-label" style="width:70px;">매체</label>${mediaField}</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <label class="form-label" style="width:70px;">이미지</label>${imgsHtml}
      <label class="tag pl-edit-addbtn" style="cursor:pointer;border-style:dashed;color:var(--text3);">📁 첨부<input type="file" accept="image/*" multiple style="display:none;" onchange="_plEditImgFileSelect(this)"></label>
      <span class="pl-paste-zone" tabindex="0" style="border:1px dashed var(--border2);border-radius:5px;padding:3px 9px;font-size:11px;color:var(--text3);cursor:text;outline:none;" onclick="this.focus()">여기 클릭 후 Ctrl+V</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><label class="form-label" style="width:70px;">링크</label>${linksHtml}<span class="tag pl-edit-addbtn" style="cursor:pointer;border-style:dashed;color:var(--text3);" onclick="_plEditAddLink()">＋ 링크</span></div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <label class="form-label" style="width:70px;">경로</label>
      <input type="text" class="pl-mini" style="flex:1;min-width:200px;max-width:420px;" placeholder="공유폴더 경로 (예: \\\\192.168.0.250\\공유폴더\\...)" value="${_escHtml(d.attachPath || '')}" oninput="_plEditField('attachPath',this.value)">
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <label class="form-label" style="width:70px;">파일명</label>
      <input type="text" class="pl-mini" style="flex:1;min-width:160px;max-width:320px;" placeholder="파일명" value="${_escHtml(d.attachName || '')}" oninput="_plEditField('attachName',this.value)">
    </div>
  </div>`;
}
function _plEditAddLink() { if (!_plEditDraft.links) _plEditDraft.links = []; _plEditDraft.links.push({ label: '', url: '' }); _plEditRerender(); }
function _plEditRemoveLink(li) { _plEditDraft.links.splice(li, 1); _plEditRerender(); }
function _plEditLinkField(li, val) { const l = _plEditDraft.links[li]; if (!l) return; l.label = val; l.url = val; }
function _plEditAddImage(dataUrl) {
  const d = _plEditDraft;
  if (!d) return;
  const tmpImg = new Image();
  tmpImg.onload = () => {
    const MAX_W = 1400;
    const scale = tmpImg.width > MAX_W ? MAX_W / tmpImg.width : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(tmpImg.width * scale);
    canvas.height = Math.round(tmpImg.height * scale);
    canvas.getContext('2d').drawImage(tmpImg, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    if (!d.images) d.images = [];
    d.images.push(compressed);
    _plEditRerender();
  };
  tmpImg.src = dataUrl;
}
function _plEditImgFileSelect(input) {
  const files = Array.from(input.files || []);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => _plEditAddImage(ev.target.result);
    reader.readAsDataURL(file);
  });
  input.value = '';
}
function _plEditImgRemove(idx) {
  _plEditDraft.images.splice(idx, 1);
  _plEditRerender();
}
function _plEditOpenLightbox(idx) {
  openLightbox(idx, _plEditDraft.images);
}
// 필드 조작(토글/추가/삭제 등) 후 다시 그릴 때 이걸 거쳐야, 일자별 뷰 인라인 수정 중이면 모달이 아니라
// 그 자리(카드)를 다시 그린다 — _plEditDraft.__inline이 인라인 수정 여부의 유일한 판단 기준.
function _plEditRerender() {
  if (_plEditDraft?.__inline) _plRenderDateBody();
  else _plRenderEditModal();
}

function _plRenderEditModal() {
  const d = _plEditDraft;
  if (!d) return;
  const badgeEl = document.getElementById('pl-e-badges');
  if (badgeEl) {
    const stateBadge = d.state === '진행중' ? '<span class="pl-st-open">진행중</span>' : (d.state === '완료' ? '<span class="pl-st-done">완료</span>' : '');
    const starBadge = d.important ? '<span class="pl-star">★</span>' : '';
    const sellerTag = d.seller ? `<span class="tag">${_escHtml(d.seller)}</span>` : '';
    const projTag = d.content ? `<span class="tag pl-brand">${_escHtml(d.content)}</span>` : '';
    const camp = d.campaignId ? DATA.find(c => c.id === d.campaignId) : null;
    const campTag = d.campaignId ? `<span class="tag f-mono">${_escHtml(d.campaignId)}${camp ? ' · ' + _escHtml((camp.date || '').slice(5, 10).replace('-', '.')) : ''}</span>` : '';
    const mediaTag = d.media ? `<span class="tag pl-media">${_escHtml(d.media)}</span>` : '';
    badgeEl.innerHTML = `<span class="badge pl-lg-${d.logType}">${_escHtml(d.logType)}</span>${stateBadge}${starBadge}${sellerTag}${projTag}${campTag}${mediaTag}`;
  }
  const blockEl = document.getElementById('pl-e-block');
  if (blockEl) {
    blockEl.innerHTML = `<div class="pl-block">
      <div class="pl-bhead">
        <div class="combo-wrap" style="position:relative;">
          <input type="text" class="pl-tgt${_plEditTargetLabel() ? '' : ' empty'}" id="pl-e-tgt"
            value="${_escHtml(_plEditTargetLabel())}" placeholder="🔍 검색" title="클릭하면 다시 검색"
            oninput="_plEditSearch(this.value)" onfocus="_plEditSearch(this.value)"
            onkeydown="_plComboKeyNav(event,'pl-e-tgt-list')">
          <div class="combo-list" id="pl-e-tgt-list" style="display:none;"></div>
        </div>
        ${_plEditSecondaryControl()}
        ${d.scope === 'internal' ? '<span class="tag pl-inner">내부 업무</span>' : ''}
      </div>
      <div class="pl-bbody">
        ${_plEditItemHtml()}
        ${!d.newFor ? `${_plEditExtraItemsHtml()}<div class="pl-add" onclick="_plEditAddExtraItem()">＋ 항목 추가 <span class="form-hint" style="font-weight:400;">— 같은 대상으로 새 로그 별도 생성</span></div>` : ''}
        ${_plEditMetaHtml()}
      </div>
    </div>`;
  }
  // 수정 권한 없으면(작성자·관리자가 아니면) 조회만 가능하도록 잠금 — 저장 버튼 숨김 + 입력요소 전부 비활성화
  const canEdit = _plCanEditLog({ writerId: d.writerId });
  const footEl = document.getElementById('pl-e-footbtns');
  const saveLabel = d.newFor ? (d.resolveChecked ? '완료 처리' : '대응 기록 저장') : '저장';
  const resolveCheckHtml = d.newFor ? `<label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;cursor:pointer;color:${d.resolveChecked ? 'var(--red)' : 'var(--text2)'};">
      <input type="checkbox" ${d.resolveChecked ? 'checked' : ''} onchange="_plEditToggleFlag('resolveChecked')"> 이 기록으로 이슈 완료 처리
    </label>` : '';
  if (footEl) footEl.innerHTML = canEdit ? `${resolveCheckHtml}<button class="btn btn-primary btn-sm" onclick="plSaveEdit()">${saveLabel}</button>` : '';
  const delHeadEl = document.getElementById('pl-e-delbtn-head');
  if (delHeadEl) {
    // 아직 저장 전(새 대응/해결 작성 중)인 로그는 지울 게 없으니 삭제 버튼을 안 보여준다.
    const canDel = !d.newFor && _plCanDeleteLog({ writerId: d.writerId });
    delHeadEl.innerHTML = canDel ? `<button class="btn btn-danger btn-sm" onclick="plDeleteLogFromEdit()">삭제</button>` : '';
  }
  const titleEl = document.getElementById('pl-e-title');
  if (titleEl) titleEl.textContent = d.newFor
    ? (d.resolveChecked ? '✓ 완료 처리' : '+ 대응 기록')
    : (canEdit ? '✎ 일지 수정' : '👁 일지 보기');
  const hintEl = document.getElementById('pl-e-foothint');
  if (hintEl) hintEl.textContent = d.newFor
    ? (d.resolveChecked ? '저장하면 원본 이슈가 완료로 전환됩니다' : '이슈는 진행중 상태로 유지되고, 대응 기록만 추가됩니다')
    : (canEdit ? '변경 이력이 자동 기록됩니다 (삭제는 작성자·관리자만 가능)' : '');
  if (!canEdit && blockEl) {
    // "ㄴ 추가" 같은 컨트롤은 <button>이 아니라 onclick 달린 <span>/<div>라 disabled로는 안 막혀서,
    // 블록 전체를 pointer-events:none으로 눌러 어떤 요소든 클릭 자체가 안 먹히게 하고,
    // 조작 전용 버튼들(ㄴ추가·✕삭제·첨부·링크추가 등)은 pl-readonly 클래스로 아예 안 보이게 한다.
    blockEl.style.pointerEvents = 'none';
    blockEl.classList.add('pl-readonly');
    blockEl.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = true; });
  } else if (blockEl) {
    blockEl.style.pointerEvents = '';
    blockEl.classList.remove('pl-readonly');
  }
}

async function plDeleteLogFromEdit() {
  if (!_plEditDraft) return;
  const wasInline = !!_plEditDraft.__inline;
  await plDeleteLog(_plEditDraft.id);
  if (wasInline) { _plInlineEditId = null; _plRenderDateBody(); }
  else closeModal('pl-modal-edit');
}

// ── 변경 이력 diff ──
function _plDetailToStr(detail) {
  return (detail || []).filter(d => (d.text || '').trim()).map(d => `${d.label || ''}: ${d.text}`).join('\n');
}
function _plDiffFields(orig, updated) {
  const changes = [];
  const simpleFields = ['scope', 'seller', 'content', 'campaignId', 'media', 'product', 'logType', 'summary', 'progress', 'state', 'attachPath', 'attachName'];
  simpleFields.forEach(f => {
    const b = orig[f]; const a = updated[f];
    if ((b ?? '') !== (a ?? '')) {
      changes.push({ field: f, label: PL_FIELD_LABELS[f] || f, before: b == null ? '' : String(b), after: a == null ? '' : String(a) });
    }
  });
  const bDetail = _plDetailToStr(orig.detail);
  const aDetail = _plDetailToStr(updated.detail);
  if (bDetail !== aDetail) changes.push({ field: 'detail', label: '하위 기록', before: bDetail, after: aDetail });
  if (!!orig.important !== !!updated.important) changes.push({ field: 'important', label: '중요', before: orig.important ? '예' : '아니오', after: updated.important ? '예' : '아니오' });
  if (!!orig.shared !== !!updated.shared) changes.push({ field: 'shared', label: '공유', before: orig.shared ? '예' : '아니오', after: updated.shared ? '예' : '아니오' });
  return changes;
}

// ── 수정 이력 모달 — projectLogHistory에는 계속 쌓이고 있었지만 지금까지 이걸 보여주는 화면이 없었음 ──
function _plBuildHistoryModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-history';
  overlay.innerHTML = `
    <div class="modal sm" style="width:480px;max-width:96vw;">
      <div class="modal-head">
        <span class="modal-title">🕘 수정 이력</span>
        <button class="modal-close" onclick="closeModal('pl-modal-history')">✕</button>
      </div>
      <div class="modal-body" id="pl-history-body" style="max-height:60vh;overflow-y:auto;"></div>
    </div>`;
  document.body.appendChild(overlay);
}
async function plOpenHistoryModal(logId) {
  if (!document.getElementById('pl-modal-history')) _plBuildHistoryModalShell();
  const bodyEl = document.getElementById('pl-history-body');
  if (bodyEl) bodyEl.innerHTML = '<div class="form-hint" style="padding:20px;text-align:center;">불러오는 중…</div>';
  openModal('pl-modal-history');
  try {
    const snap = await _plDb('projectLogHistory').where('logId', '==', logId).get();
    const entries = snap.docs.map(d => d.data()).sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || ''));
    if (!bodyEl) return;
    if (!entries.length) { bodyEl.innerHTML = '<div class="form-hint" style="padding:20px;text-align:center;">이력이 없습니다.</div>'; return; }
    bodyEl.innerHTML = entries.map(e => {
      const when = _plFmtDateTimeLocal(e.changedAt);
      const changesHtml = (e.changes || []).map(c =>
        c.field === '_create'
          ? `<div style="font-size:12px;color:var(--text2);">${_escHtml(c.label)}</div>`
          : `<div style="font-size:12px;color:var(--text2);"><b>${_escHtml(c.label)}</b>: ${_escHtml(c.before || '(없음)')} → ${_escHtml(c.after || '(없음)')}</div>`
      ).join('');
      return `<div style="padding:8px 0;border-bottom:1px dashed var(--border);">
        <div style="font-size:12px;font-weight:700;margin-bottom:4px;">${_escHtml(e.changedBy || '—')} <span class="form-hint f-mono" style="font-weight:400;">${_escHtml(when)}</span></div>
        ${changesHtml}
      </div>`;
    }).join('');
  } catch (err) {
    console.error('[projectlog] 이력 조회 실패', err);
    if (bodyEl) bodyEl.innerHTML = '<div class="form-hint" style="padding:20px;text-align:center;color:var(--red);">불러오기 실패</div>';
  }
}

async function plSaveEdit() {
  const d = _plEditDraft;
  if (!d) return;
  if (d.newFor) { await _plSaveNewResponse(); return; }
  if (!d.scope) { alert('대상을 선택해주세요.'); return; }
  if (!(d.summary || '').trim()) { alert('내용을 입력해주세요.'); return; }
  if ((d.summary || '').length > 60) { alert('내용은 60자 이하로 입력해주세요.'); return; }
  if (d.progress === '' || d.progress == null) { alert('진척률을 입력해주세요.'); return; }
  {
    const p = Number(d.progress);
    if (isNaN(p) || p < 0 || p > 100) { alert('진척률은 0~100 사이여야 합니다.'); return; }
  }
  // "+ 항목 추가"로 만든 것 중 내용이 있는 것만 검증(빈 건 저장 시 조용히 건너뜀 — 일지 작성과 동일한 규칙)
  const validExtras = (d.extraItems || []).filter(it => (it.summary || '').trim());
  for (const it of validExtras) {
    if ((it.summary || '').length > 60) { alert('추가 항목의 내용은 60자 이하로 입력해주세요.'); return; }
    if (it.progress === '' || it.progress == null) { alert('추가 항목의 진척률을 입력해주세요.'); return; }
    const p2 = Number(it.progress);
    if (isNaN(p2) || p2 < 0 || p2 > 100) { alert('추가 항목의 진척률은 0~100 사이여야 합니다.'); return; }
  }

  const orig = PL_LOGS.find(l => l.id === d.id);
  if (!orig) { toast('원본을 찾을 수 없습니다', 'err'); return; }

  const saveBtn = document.querySelector(d.__inline ? '#pl-di-savebtn' : '#pl-modal-edit .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중…'; }

  try {
    const detail = (d.detail || []).filter(x => (x.text || '').trim()).map(x => ({ label: x.label || '', text: x.text.trim() }));
    const progress = (d.progress === '' || d.progress == null) ? null : Math.max(0, Math.min(100, parseInt(d.progress, 10) || 0));
    const images = (d.images || []).filter(Boolean);
    const updated = Object.assign({}, orig, {
      scope: d.scope, seller: d.seller || null, content: d.content || null,
      campaignId: d.campaignId || null, media: d.media || null, product: d.product || null,
      logType: d.logType, summary: d.summary.trim().slice(0, 60), detail, progress,
      state: d.state || null, important: !!d.important, shared: !!d.shared,
      links: (d.links || []).filter(l => (l.label || l.url || '').trim()),
      attachPath: (d.attachPath || '').trim() || null, attachName: (d.attachName || '').trim() || null,
      // 대상을 캠페인/매체/내부로 바꿨는데 참조 태그가 남아있으면(필드 자체는 이미 숨겨짐) 저장 시점에 정리
      refCampaignIds: (d.scope === 'advertiser' || d.scope === 'project') ? (d.refCampaigns || []).filter(Boolean) : [],
      hasImages: images.length > 0, imageCount: images.length,
      updatedAt: new Date().toISOString(),
    });
    updated.searchText = _plBuildSearchText(updated);

    const changes = _plDiffFields(orig, updated);
    await _plDb('projectLogs').doc(d.id).set(updated);
    if (!!orig.hasImages !== !!updated.hasImages || images.length) await _plSaveLogImages(d.id, images);
    if (changes.length) {
      await _plDb('projectLogHistory').add({
        logId: d.id, changedBy: currentUser?.name || '', changedAt: new Date().toISOString(), changes,
      });
    }
    // 알림 ②③ — 본인이 아닌 다른 사람이 수정했을 때만. 진행중→완료 전환이면 그걸 우선(더 구체적인 알림)
    if (orig.writerId && orig.writerId !== currentUser?.id) {
      const subject = _plNotifySubject(updated);
      if (orig.state === '진행중' && updated.state === '완료') {
        _fbSaveNotification(orig.writerId, 'pl_resolved', `${currentUser?.name || ''}님이 "${subject}" ${updated.logType} 일지를 완료 처리했습니다.`, { logId: d.id });
      } else if (changes.length) {
        _fbSaveNotification(orig.writerId, 'pl_edit', `${currentUser?.name || ''}님이 "${subject}" 일지를 수정했습니다.`, { logId: d.id });
      }
    }
    // "+ 항목 추가"로 만든 것들 — 수정한 로그와 같은 대상(scope/seller/content/campaignId/media/product)으로
    // 별도의 새 로그 문서를 만든다(일지 작성 저장과 동일한 방식).
    if (validExtras.length) {
      const nextId = _plNextLogIdSeq();
      const nowBase = Date.now();
      let _seq = 0;
      const nextNow = () => new Date(nowBase + (_seq++)).toISOString();
      for (const it of validExtras) {
        const exDetail = (it.detail || []).filter(x => (x.text || '').trim()).map(x => ({ label: x.label || '', text: x.text.trim() }));
        const exProgress = Math.max(0, Math.min(100, parseInt(it.progress, 10) || 0));
        const now = nextNow();
        const newDoc = {
          id: nextId(),
          logDate: orig.logDate, writer: currentUser?.name || '', writerId: currentUser?.id || '',
          bonbu: currentUser?.bonbu || '', dept: currentUser?.dept || '',
          scope: updated.scope, seller: updated.seller || null, content: updated.content || null,
          campaignId: updated.campaignId || null, media: updated.media || null, product: updated.product || null,
          logType: it.logType || '운영',
          state: ['이슈', '요청'].includes(it.logType) ? '진행중' : null,
          summary: it.summary.trim().slice(0, 60), detail: exDetail, progress: exProgress,
          important: false, shared: false,
          hasImages: false, imageCount: 0, links: [],
          threadId: null, createdAt: now, updatedAt: now,
        };
        newDoc.searchText = _plBuildSearchText(newDoc);
        await _plDb('projectLogs').doc(newDoc.id).set(newDoc);
        await _plLogHistoryCreate(newDoc.id);
      }
    }
    if (d.__inline) { _plInlineEditId = null; _plRenderDateBody(); }
    else closeModal('pl-modal-edit');
    toast(validExtras.length ? `✓ 수정 + 새 항목 ${validExtras.length}건 저장되었습니다` : '✓ 수정되었습니다', 'ok');
  } catch (e) {
    console.error('[projectlog] 수정 저장 실패', e);
    toast('저장 중 오류가 발생했습니다', 'err');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
  }
}

// ── 접힌 행에서 바로 뜨는 "+ ㄴ 추가" 미니폼 — 전체 수정 폼(모달/인라인)을 열지 않고, 입력창 하나 +
// 저장 버튼만 그 자리에서 보여준다. 한 번에 하나만 열 수 있어(logId 하나만 기억) id 충돌 걱정이 없다.
// detail만 바뀐 문서를 plSaveEdit과 동일한 방식(_plDiffFields)으로 저장·이력기록하므로 이력에도 남는다.
let _plQuickAdd = null; // 지금 미니폼이 열려있는 log id
// 일지/나의일지 표(_plRenderLogRow)와 일자별 뷰(_plDateItemHtml)가 공유하는, ㄴ내용 목록 맨 아래 붙는
// 꼬리 — 평소엔 "+ ㄴ 추가" 글씨 링크, 그 로그의 미니폼이 열려있으면 입력창+저장 버튼으로 바뀐다.
function _plQuickAddTailHtml(logId, ctx) {
  if (_plQuickAdd === logId) {
    return `<div class="pl-quickadd-form" onclick="event.stopPropagation()">
      <span style="color:var(--text3);font-size:12px;">ㄴ</span>
      <input type="text" class="pl-mini" id="pl-qa-input" placeholder="내용을 입력하세요"
        onkeydown="if(event.key==='Enter'){event.preventDefault();_plQuickAddSave('${logId}','${ctx}');}else if(event.key==='Escape'){_plQuickAddCancel('${ctx}');}">
      <button class="btn btn-primary btn-sm" id="pl-qa-savebtn" onclick="_plQuickAddSave('${logId}','${ctx}')">저장</button>
      <span class="pl-x" onclick="_plQuickAddCancel('${ctx}')">취소</span>
    </div>`;
  }
  return `<span class="pl-quickadd" onclick="event.stopPropagation();_plQuickAddStart('${logId}','${ctx}')">＋ ㄴ 추가</span>`;
}
function _plQuickAddStart(logId, ctx) {
  _plQuickAdd = logId;
  _plRerenderByCtx(ctx);
  document.getElementById('pl-qa-input')?.focus();
}
function _plQuickAddCancel(ctx) {
  _plQuickAdd = null;
  _plRerenderByCtx(ctx);
}
async function _plQuickAddSave(logId, ctx) {
  const text = (document.getElementById('pl-qa-input')?.value || '').trim();
  if (!text) { toast('내용을 입력해주세요', 'err'); return; }
  const orig = PL_LOGS.find(l => l.id === logId);
  if (!orig) { toast('일지를 찾을 수 없습니다', 'err'); return; }
  const btn = document.getElementById('pl-qa-savebtn');
  if (btn) { btn.disabled = true; btn.textContent = '저장 중…'; }
  try {
    const detail = [...(orig.detail || []), { label: '', text }];
    const updated = Object.assign({}, orig, { detail, updatedAt: new Date().toISOString() });
    updated.searchText = _plBuildSearchText(updated);
    const changes = _plDiffFields(orig, updated);
    await _plDb('projectLogs').doc(logId).set(updated);
    if (changes.length) {
      await _plDb('projectLogHistory').add({ logId, changedBy: currentUser?.name || '', changedAt: new Date().toISOString(), changes });
    }
    if (orig.writerId && orig.writerId !== currentUser?.id && changes.length) {
      _fbSaveNotification(orig.writerId, 'pl_edit', `${currentUser?.name || ''}님이 "${_plNotifySubject(updated)}" 일지를 수정했습니다.`, { logId });
    }
    _plQuickAdd = null;
    _plRerenderByCtx(ctx);
    toast('✓ 추가되었습니다', 'ok');
  } catch (e) {
    console.error('[projectlog] ㄴ 빠른 추가 실패', e);
    toast('저장 중 오류가 발생했습니다', 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '저장'; }
  }
}

// ── 1-1. searchText 생성 (스펙 원문 그대로) ──
function _plBuildSearchText(log) {
  return [
    log.summary,
    ...(log.detail || []).map(d => `${d.label} ${d.text}`),
    log.seller, log.content, log.media, log.product, log.writer, log.attachName,
    ...(log.refCampaignIds || [])
  ].filter(Boolean).join(' ')
   .toLowerCase()
   .replace(/[\s\-_.,·/()[\]{}]/g, '');
}

// ══════════════════════════════════════════════════════════
// F. 광고주 목록
// ══════════════════════════════════════════════════════════

let PL_ADV_YEAR = String(new Date().getFullYear());

function _plAdvSellerCat(s) {
  const camps = DATA.filter(c => (c.seller || c.adv) === s.company).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (camps.length) return camps[0].cat || '';
  return (s.brands && s.brands[0] && s.brands[0].cat) || '';
}
function _plAdvLastLog(company) {
  return PL_LOGS.filter(l => l.seller === company).reduce((max, l) => (!max || (l.logDate || '') > (max.logDate || '')) ? l : max, null);
}
function _plAdvRecordDotClass(lastDate) {
  if (!lastDate) return 'pl-dot-r';
  const days = (Date.now() - new Date(lastDate).getTime()) / 86400000;
  if (days <= 7) return 'pl-dot-g';
  if (days <= 30) return 'pl-dot-o';
  return 'pl-dot-r';
}

function _plAdvFiltered() {
  const q = document.getElementById('pl-adv-search')?.value || '';
  const type = document.getElementById('pl-adv-type')?.value || '';
  const cat = document.getElementById('pl-adv-cat')?.value || '';
  const recFilter = document.getElementById('pl-adv-record')?.value || '';
  let list = SELLER_DATA.filter(s => {
    if (type && s.type !== type) return false;
    if (q) {
      const hay = [s.company, ...(s.brands || []).map(b => b.name), _plAdvSellerCat(s)].join(' ');
      if (!_plTokenMatch(hay, q)) return false;
    }
    if (cat && _plAdvSellerCat(s) !== cat) return false;
    return true;
  });
  if (recFilter) {
    list = list.filter(s => {
      const lastLog = _plAdvLastLog(s.company);
      const cnt = PL_LOGS.filter(l => l.seller === s.company).length;
      const days = lastLog ? (Date.now() - new Date(lastLog.logDate).getTime()) / 86400000 : Infinity;
      if (recFilter === 'recent7') return days <= 7;
      if (recFilter === 'over30') return days > 30;
      if (recFilter === 'none') return cnt === 0;
      return true;
    });
  }
  const sortSel = document.getElementById('pl-adv-sort')?.value || 'recent';
  list = list.slice().sort((a, b) => {
    if (sortSel === 'name') return a.company.localeCompare(b.company, 'ko');
    const la = _plAdvLastLog(a.company)?.logDate || '';
    const lb = _plAdvLastLog(b.company)?.logDate || '';
    return lb.localeCompare(la);
  });
  return list;
}

function _plRenderAdvertiserRow(s, q) {
  const camps = DATA.filter(c => (c.seller || c.adv) === s.company && c.status !== '삭제');
  const yearCamps = camps.filter(c => (c.date || '').startsWith(PL_ADV_YEAR));
  const adcost = yearCamps.reduce((sum, c) => sum + _campAdcost(c), 0);
  const logs = PL_LOGS.filter(l => l.seller === s.company);
  const lastLog = _plAdvLastLog(s.company);
  const cat = _plAdvSellerCat(s);
  const dotCls = _plAdvRecordDotClass(lastLog?.logDate);
  const hasActive = camps.some(c => c.status !== '성과입력완료');
  const highlightRow = hasActive && logs.length === 0;
  const brandTags = (s.brands || []).map(b => {
    const hit = q && b.name.toLowerCase().includes(q.toLowerCase());
    return `<span class="tag pl-brand">${hit ? _plHighlight(b.name, q) : _escHtml(b.name)}</span>`;
  }).join(' ') || '<span class="td-dim">—</span>';
  return `<tr style="cursor:pointer;${highlightRow ? 'background:#fffaf7;' : ''}" onclick="plOpenAdvertiserDetail('${_escHtml(s.company)}')">
    <td><span class="pl-dot ${dotCls}"></span></td>
    <td class="td-bold"><span class="pl-click">${_escHtml(s.company)}</span></td>
    <td><span class="tag">${_escHtml(s.type || '—')}</span></td>
    <td class="td-dim">${_escHtml(cat || '—')}</td>
    <td>${brandTags}</td>
    <td class="${s.startDate ? 'f-mono td-num' : 'td-dim'}">${_escHtml(s.startDate || '미입력')}</td>
    <td class="td-num td-r">${adcost ? _fmtMoney(adcost) : '—'}</td>
    <td class="td-num td-r">${camps.length || '—'}</td>
    <td class="td-num td-r">${logs.length || '—'}</td>
    <td class="${lastLog ? 'f-mono td-num' : 'td-dim'}">${lastLog ? _escHtml(lastLog.logDate.slice(2).replace(/-/g, '.')) : '없음'}</td>
  </tr>`;
}

function _plBuildAdvertiserTabSkeleton(content) {
  const cats = [...new Set(SELLER_DATA.map(s => _plAdvSellerCat(s)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:12px;">
      <input type="text" class="f-search" id="pl-adv-search" placeholder="광고주 · 브랜드 · 업종" style="width:220px;" oninput="_plRenderAdvertiserRows()">
      <select class="f-sel" id="pl-adv-type" onchange="_plRenderAdvertiserRows()"><option value="">유형 전체</option><option value="광고주">광고주</option><option value="대행사">대행사</option><option value="랩사">랩사</option></select>
      <select class="f-sel" id="pl-adv-cat" onchange="_plRenderAdvertiserRows()"><option value="">업종 전체</option>${cats.map(c => `<option value="${_escHtml(c)}">${_escHtml(c)}</option>`).join('')}</select>
      <select class="f-sel" id="pl-adv-record" onchange="_plRenderAdvertiserRows()">
        <option value="">기록 상태 전체</option><option value="recent7">최근 7일 내</option><option value="over30">30일 초과</option><option value="none">⚠ 기록 없음</option>
      </select>
      <select class="f-sel" id="pl-adv-sort" style="margin-left:auto;" onchange="_plRenderAdvertiserRows()"><option value="recent">정렬: 최근 기록순</option><option value="name">정렬: 이름순</option></select>
    </div>
    <div class="table-card">
      <div class="table-header">
        <span class="card-title">광고주</span>
        <span class="table-count" id="pl-adv-count"></span>
      </div>
      <div class="table-wrap"><table style="width:100%;">
        <thead><tr>
          <th style="width:26px;"></th><th>광고주</th><th style="width:70px;">유형</th><th style="width:80px;">업종</th>
          <th>프로젝트</th><th style="width:90px;">업무 시작일</th><th class="td-r" style="width:110px;">${_escHtml(PL_ADV_YEAR)} 광고비</th>
          <th class="td-r" style="width:60px;">캠페인</th><th class="td-r" style="width:56px;">기록</th><th style="width:80px;">최근 기록</th>
        </tr></thead>
        <tbody id="pl-adv-tbody"></tbody>
      </table></div>
    </div>
  `;
}
function _plRenderAdvertiserRows() {
  const q = (document.getElementById('pl-adv-search')?.value || '').trim();
  const list = _plAdvFiltered();
  const countEl = document.getElementById('pl-adv-count');
  if (countEl) countEl.innerHTML = `검색 <b>${list.length}</b>건 · 전체 <b>${SELLER_DATA.length}</b>개`;
  const tbody = document.getElementById('pl-adv-tbody');
  if (tbody) tbody.innerHTML = list.length ? list.map(s => _plRenderAdvertiserRow(s, q)).join('') : `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">조건에 맞는 광고주가 없습니다.</td></tr>`;
}

// 다른 화면(KPI 등)에서 이 광고주 상세로 바로 진입하기 위한 지름길 — plJumpToLog와 같은 이유로
// 이미 프로젝트일지 화면이면 goScreen을 다시 부르지 않고(불필요한 초기화 방지), 아니면
// skipPush=true로 goScreen('projectlog')만 부른 뒤 바로 plOpenAdvertiserDetail로 덮어쓴다.
function plGoToAdvertiserDetail(company) {
  if (!company) return;
  const onScreen = document.getElementById('screen-projectlog')?.classList.contains('active');
  if (!onScreen) { _plPendingTab = 'advertiser'; goScreen('projectlog', true); }
  plOpenAdvertiserDetail(company);
}
function plOpenAdvertiserDetail(company) {
  PL_STATE.tab = 'advertiser';
  PL_STATE.advDetailCompany = company;
  _plUpdateTabButtons();
  _plEnsureCompanyLoaded(company); // ①연간요약 등은 이 광고주의 전체 이력이 있어야 정확해서 진입 시 별도 구독
  plRenderActiveTab();
  history.pushState({ screen: 'projectlog-detail', plTab: 'advertiser' }, '', '#projectlog');
}
function plBackToAdvertiserList() {
  PL_STATE.advDetailCompany = null;
  plRenderActiveTab();
}

function plRenderAdvertiserTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (PL_STATE.advDetailCompany) {
    content.dataset.plTab = 'advertiser-detail';
    _plRenderAdvertiserDetail(content, PL_STATE.advDetailCompany);
    return;
  }
  if (content.dataset.plTab !== 'advertiser') {
    _plBuildAdvertiserTabSkeleton(content);
    content.dataset.plTab = 'advertiser';
  }
  _plRenderAdvertiserRows();
}

// ══════════════════════════════════════════════════════════
// G. 광고주 상세
// ══════════════════════════════════════════════════════════

let _plGCompany = null;
let _plGState = { year: String(new Date().getFullYear()), month: '', dayProject: '', dayType: '', dayMedia: '', dayWriter: '', dayOpenOnly: false, dayProgressSort: false, dayPage: 1, monthPage: 1 };
const PL_G_DAY_PAGE_SIZE = 10;

function _plCurrentYm() { return _plTodayStr().slice(0, 7); }

function _plCompressMonths(months) {
  if (!months.length) return '—';
  const nums = months.map(m => parseInt(m, 10)).sort((a, b) => a - b);
  const ranges = [];
  let start = nums[0], prev = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === prev + 1) { prev = nums[i]; continue; }
    ranges.push(start === prev ? String(start).padStart(2, '0') : `${String(start).padStart(2, '0')}~${String(prev).padStart(2, '0')}`);
    start = prev = nums[i];
  }
  ranges.push(start === prev ? String(start).padStart(2, '0') : `${String(start).padStart(2, '0')}~${String(prev).padStart(2, '0')}`);
  return ranges.join(',');
}

function _plGAnnualRows(company, year) {
  const seller = SELLER_DATA.find(s => s.company === company);
  const camps = DATA.filter(c => (c.seller || c.adv) === company && c.status !== '삭제' && (c.date || '').startsWith(year));
  const brandNames = (seller?.brands || []).map(b => b.name);
  const campBrands = [...new Set(camps.map(c => c.content || ''))];
  const allKeys = [...new Set([...brandNames, ...campBrands])];
  if (!allKeys.length) allKeys.push('');
  return allKeys.map(brand => {
    const bcamps = camps.filter(c => (c.content || '') === brand);
    const months = [...new Set(bcamps.map(c => (c.date || '').slice(5, 7)))].filter(Boolean);
    const products = [...new Set(bcamps.map(c => c.product).filter(Boolean))];
    const prodLabel = products.length === 0 ? '—' : products.join('·');
    const adcost = bcamps.reduce((s, c) => s + _campAdcost(c), 0);
    const qty = bcamps.reduce((s, c) => s + (c.qty || 0), 0);
    const actual = bcamps.reduce((s, c) => s + (c.actual || 0), 0);
    const profit = bcamps.reduce((s, c) => s + _campProfit(c), 0);
    const profitRate = adcost > 0 ? (profit / adcost * 100) : 0;
    const logCnt = PL_LOGS.filter(l => l.seller === company && (l.content || '') === brand).length;
    const goal = _plGetGoal(company, brand, year);
    const target = goal?.value || 0;
    const pm = goal?.pm || '';
    const ops = [...new Set(bcamps.map(c => c.ops).filter(Boolean))].join('·');
    return { brand: brand || '브랜드 미지정', brandKey: brand, months: _plCompressMonths(months), prodLabel, adcost, qty, actual, profit, profitRate, logCnt, target, pm, ops };
  }).filter(r => r.adcost || r.qty || r.actual || r.logCnt)
    .sort((a, b) => b.adcost - a.adcost);
}
function _plGIssueReview(company, brandKey, year) {
  const noteTypes = ['이슈', '회고', '피드백', '자료'];
  const items = PL_LOGS.filter(l => l.seller === company && l.scope === 'project' && (l.content || '') === (brandKey || '')
    && (l.logDate || '').startsWith(year) && noteTypes.includes(l.logType));
  const pick = t => items.filter(l => l.logType === t).sort((a, b) => (b.logDate || '').localeCompare(a.logDate || ''));
  return { issues: pick('이슈'), reviews: pick('회고'), feedback: pick('피드백'), data: pick('자료') };
}
function _plWriteFromProject(company, brandKey) {
  plOpenWrite({ scope: 'project', seller: company, content: brandKey || null, campaignId: null, media: null, product: null });
}
// 연도 × 브랜드 × 상품 그룹핑 — 3순위: 상품별 서브행
function _plGProductRows(company, brandKey, year) {
  const camps = DATA.filter(c => (c.seller || c.adv) === company && c.status !== '삭제'
    && (c.content || '') === (brandKey || '') && (c.date || '').startsWith(year));
  const products = [...new Set(camps.map(c => c.product).filter(Boolean))];
  return products.map(product => {
    const pcamps = camps.filter(c => c.product === product);
    const months = [...new Set(pcamps.map(c => (c.date || '').slice(5, 7)))].filter(Boolean);
    const adcost = pcamps.reduce((s, c) => s + _campAdcost(c), 0);
    const qty = pcamps.reduce((s, c) => s + (c.qty || 0), 0);
    const actual = pcamps.reduce((s, c) => s + (c.actual || 0), 0);
    const profit = pcamps.reduce((s, c) => s + _campProfit(c), 0);
    const profitRate = adcost > 0 ? (profit / adcost * 100) : 0;
    const ops = [...new Set(pcamps.map(c => c.ops).filter(Boolean))].join('·');
    return { product, months: _plCompressMonths(months), adcost, qty, actual, profitRate, ops };
  });
}
// 상품별 서브행 — 부모(브랜드) 행과 같은 표 안에 이어지는 진짜 <tr>. 브랜드명 칸은 부모 행에서
// rowspan으로 이 행들까지 덮으므로 여기서는 그 칸(프로젝트 열)을 아예 렌더링하지 않는다.
// PM은 컬럼이 아니라 부모 행의 브랜드명 아래 표시(_plGRenderAnnual)하므로 여기선 담당자만 전용 칸.
// 연간목표(취급고)는 브랜드 단위 값이라 상품별 행엔 아예 해당사항이 없어 컬럼 자체를 두지 않음(브랜드 상세 패널의 KPI 카드에서만 표시)
function _plGSubRowsHtml(productRows) {
  return productRows.map(r => `<tr class="pl-g-subrow" style="background:var(--surface2);">
    <td class="td-dim f-mono">${_escHtml(r.months)}</td>
    <td class="td-dim">${_escHtml(r.product)}</td>
    <td class="td-num td-r">${r.adcost ? _fmtMoney(r.adcost) : '—'}</td>
    <td class="td-num td-r">${r.qty ? _fmtMoney(r.qty) : '—'}</td>
    <td class="td-num td-r">${r.actual ? _fmtMoney(r.actual) : '—'}</td>
    <td class="td-dim">${r.adcost ? r.profitRate.toFixed(1) + '%' : '-'}</td>
    <td class="td-dim">${r.ops ? _escHtml(r.ops) : '—'}</td>
    <td></td>
  </tr>`).join('');
}
// 이슈사항·리뷰회고·광고주피드백·관련자료 — 2x2 그리드, 항목별 색상칩(PL_TYPE_COLOR 재사용)으로
// 한눈에 구분되게 하고, 칸마다 높이를 제한해(스크롤) 브랜드가 여러 개일 때 화면을 과하게 차지하지 않도록 함.
// "+ 일지 작성"은 여기서 빼고 브랜드명 옆(_plGRenderAnnual의 head 행)으로 옮김.
function _plGBrandDetailRow(company, brandKey, brandLabel, year, colspan) {
  const { issues, reviews, feedback, data } = _plGIssueReview(company, brandKey, year);
  const fmtLine = l => `<div style="font-size:11.5px;padding:2px 0;display:flex;gap:5px;white-space:nowrap;overflow:hidden;" title="${_escHtml(l.summary || '')}">
    <span class="f-mono form-hint" style="flex-shrink:0;">${_escHtml((l.logDate || '').slice(2).replace(/-/g, '.'))}</span>
    <span style="overflow:hidden;text-overflow:ellipsis;">${_escHtml(l.summary || '')}</span>
  </div>`;
  const cell = (label, color, items, lineFmt) => `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
    <span style="display:inline-block;background:${color.bg};color:${color.fg};font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;">${_escHtml(label)}${items.length ? ' · ' + items.length : ''}</span>
    <div style="margin-top:5px;max-height:76px;overflow-y:auto;">
      ${items.length ? items.map(lineFmt || fmtLine).join('') : '<div class="form-hint" style="font-size:11.5px;">—</div>'}
    </div>
  </div>`;
  // 취급고 KPI 카드는 위 "월별 목표" 표로 흡수돼 중복이라 삭제. DB등록수 목표/실적도
  // 이 화면에서는 더 이상 안 보여준다(사용자 확인 완료, 2026-08-27).
  return `<tr class="pl-g-brand-detail">
    <td></td>
    <td colspan="${colspan - 1}" style="background:var(--surface);border-top:1px solid var(--border);padding:10px 14px;">
      ${_plGBrandMonthlyHtml(company, brandKey, brandLabel, year)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;">
        ${cell('이슈사항', PL_TYPE_COLOR['이슈'], issues)}
        ${cell('리뷰·회고', PL_TYPE_COLOR['회고'], reviews)}
        ${cell('광고주 피드백', PL_TYPE_COLOR['피드백'], feedback)}
        ${cell('관련자료', PL_TYPE_COLOR['자료'], data)}
      </div>
    </td>
  </tr>`;
}
function _plGYearOptions() {
  const cur = new Date().getFullYear();
  const years = [cur - 2, cur - 1, cur, cur + 1];
  return years.map(y => `<option value="${y}" ${String(y) === _plGState.year ? 'selected' : ''}>${y}년</option>`).join('');
}
function _plGYearChange(y) { _plGState.year = y; _plGRenderAnnual(); }

function _plGRenderAnnual() {
  const el = document.getElementById('pl-g-annual');
  if (!el) return;
  const year = _plGState.year;
  const rows = _plGAnnualRows(_plGCompany, year);
  const totalAdcost = rows.reduce((s, r) => s + r.adcost, 0);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalProfitRate = totalAdcost > 0 ? (totalProfit / totalAdcost * 100) : 0;
  const companyGoal = _plGetGoal(_plGCompany, null, year);
  const COLS = 9; // 프로젝트 + 집행월 + 광고상품 + 광고예산 + 요청수량 + 발송수량 + 수익율 + 담당자 + 기록 (목표·달성률은 브랜드 상세 패널의 KPI 카드로 이동)
  const totalRow = rows.length ? `<tr class="grp-row">
    <td colspan="3" style="text-align:right;border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;">합계 (${_escHtml(_plGCompany)} 전체)</td>
    <td class="td-num td-r" style="border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;">${totalAdcost ? _fmtMoney(totalAdcost) : '—'}</td>
    <td class="td-num td-r" style="border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;">${totalQty ? _fmtMoney(totalQty) : '—'}</td>
    <td class="td-num td-r" style="border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;">${totalActual ? _fmtMoney(totalActual) : '—'}</td>
    <td class="td-dim" style="border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;">${totalAdcost ? totalProfitRate.toFixed(1) + '%' : '-'}</td>
    <td style="border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;"></td>
    <td style="border-top:1px solid var(--border2);border-bottom:2px solid var(--border2);padding:12px 14px;"></td>
  </tr>` : '';
  // 브랜드가 많아 스크롤이 길어져도 컬럼명을 다시 확인할 수 있도록, 브랜드 그룹이 시작될 때마다 미니 헤더 행을 끼워넣는다.
  // <thead>는 테이블당 하나만 허용되고 소스 위치와 무관하게 항상 맨 위에 그려지므로(위 합계행 이동 때와 동일한 이유),
  // 진짜 <thead>가 아니라 헤더처럼 보이는 <tr>을 <tbody> 안에 반복해서 넣는 방식으로 구현.
  // 숫자 컬럼(취급고·요청수량·발송수량·기록)은 데이터 셀이 td-r로 오른쪽 정렬되므로, 헤더도 같은
  // 정렬로 맞춰야 위아래가 수직으로 이어져 보인다 — 안 맞으면 헤더는 좌측, 데이터는 우측이라 어긋나 보임.
  const miniHeadStyle = 'background:var(--surface2);padding:8px 14px;text-align:left;font-size:10.5px;font-weight:700;color:var(--text2);letter-spacing:.05em;text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap;';
  const miniHeadStyleR = miniHeadStyle.replace('text-align:left', 'text-align:right');
  const miniHeadRow = `<tr>
    <th style="${miniHeadStyle}">프로젝트</th>
    <th style="${miniHeadStyle}">집행월</th>
    <th style="${miniHeadStyle}">광고상품</th>
    <th class="td-r" style="${miniHeadStyleR}">취급고</th>
    <th class="td-r" style="${miniHeadStyleR}">요청수량</th>
    <th class="td-r" style="${miniHeadStyleR}">발송수량</th>
    <th style="${miniHeadStyle}">수익율</th>
    <th style="${miniHeadStyle}">담당자</th>
    <th class="td-r" style="${miniHeadStyleR}">기록</th>
  </tr>`;
  // 브랜드 단위로 표(head+상품행)와 상세 패널(월별목표~관련자료)이 바로 이어지도록 한 번에 렌더링
  const bodyRows = rows.map((r, ri) => {
    const productRows = _plGProductRows(_plGCompany, r.brandKey, year);
    const rowspan = 1 + productRows.length;
    const prodLabel = productRows.length ? '전체' : r.prodLabel;
    const sep = ri > 0 ? 'border-top:2px solid var(--border2);' : ''; // 첫 브랜드는 위쪽 합계행의 2px 테두리와 겹치므로 제외
    const head = `${miniHeadRow}<tr class="pl-lg-head">
      <td class="td-bold" rowspan="${rowspan}" style="vertical-align:top;${sep}">
        <div style="display:flex;align-items:center;gap:4px;">
          <span>${_escHtml(r.brand)}</span>
          <button class="btn-icon" title="${_escHtml(r.brand)} 일지 작성" onclick="_plWriteFromProject('${_escHtml(_plGCompany)}','${_escHtml(r.brandKey)}')"
            style="border:none;background:none;color:var(--accent);cursor:pointer;font-size:13px;line-height:1;padding:1px 3px;flex-shrink:0;">+</button>
        </div>
        ${r.pm ? `<div class="form-hint" style="font-size:11px;margin-top:2px;">PM: ${_escHtml(r.pm)}</div>` : ''}
      </td>
      <td class="td-dim f-mono" style="${sep}">${_escHtml(r.months)}</td>
      <td class="td-dim" style="${sep}">${_escHtml(prodLabel)}</td>
      <td class="td-num td-r" style="${sep}">${r.adcost ? _fmtMoney(r.adcost) : '—'}</td>
      <td class="td-num td-r" style="${sep}">${r.qty ? _fmtMoney(r.qty) : '—'}</td>
      <td class="td-num td-r" style="${sep}">${r.actual ? _fmtMoney(r.actual) : '—'}</td>
      <td class="td-dim" style="${sep}">${r.adcost ? r.profitRate.toFixed(1) + '%' : '-'}</td>
      <td class="td-dim" style="${sep}">${r.ops ? _escHtml(r.ops) : '—'}</td>
      <td class="td-num td-r" style="${sep}">${r.logCnt || '—'}</td>
    </tr>`;
    return head + _plGSubRowsHtml(productRows) + _plGBrandDetailRow(_plGCompany, r.brandKey, r.brand, year, COLS);
  }).join('');

  el.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <span class="card-title">① 연간 요약 — ${_escHtml(year)}년</span>
        ${companyGoal?.value ? `<span style="font-size:11.5px;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:3px 10px;margin-left:10px;">전체 목표 <b>${_fmtMoney(companyGoal.value)}</b> · 실적 ${_fmtMoney(totalAdcost)} (${(totalAdcost / companyGoal.value * 100).toFixed(1)}%)</span>` : ''}
        ${_plCanEditGoal() ? `<button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="plOpenGoalModal()">🎯 목표 설정</button>` : ''}
      </div>
      <div class="table-wrap"><table style="width:100%;">
        <thead><tr><th>프로젝트</th><th>집행월</th><th>광고상품</th><th class="td-r">취급고</th><th class="td-r">요청수량</th><th class="td-r">발송수량</th><th>수익율</th><th>담당자</th><th class="td-r">기록</th></tr></thead>
        <tbody>${totalRow}${bodyRows || `<tr><td colspan="${COLS}" style="text-align:center;padding:24px;color:var(--text3);">${_escHtml(year)}년 캠페인이 없습니다.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}

// ── 목표 설정 모달 (광고주 전체 + 브랜드별, 연도 단위) ──
function _plCanEditGoal() {
  return !!(currentUser?.isAdmin || RANK_LEVEL[currentUser?.rank || '일반'] <= 4);
}
let _plGoalModalYear = null; // G화면의 연도 선택기와는 별개 — 모달 안에서만 오가는 연도

function _plBuildGoalModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-goal';
  overlay.innerHTML = `
    <div class="modal" style="width:420px;max-width:96vw;">
      <div class="modal-head">
        <span class="modal-title">🎯 <span id="pl-goal-company"></span> ·
          <select id="pl-goal-year-sel" class="f-sel" style="width:auto;padding:3px 6px;font-size:13px;font-weight:700;" onchange="_plGoalYearChange(this.value)"></select>
          목표</span>
        <button class="modal-close" onclick="closeModal('pl-modal-goal')">✕</button>
      </div>
      <div class="modal-body" id="pl-goal-body"></div>
      <div class="modal-foot">
        <button class="btn btn-primary btn-sm" onclick="_plSaveGoalModal()">저장</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
function _plGoalYearOptions() {
  const cur = new Date().getFullYear();
  const years = [cur - 2, cur - 1, cur, cur + 1, cur + 2];
  return years.map(y => `<option value="${y}" ${String(y) === String(_plGoalModalYear) ? 'selected' : ''}>${y}년</option>`).join('');
}
function plOpenGoalModal() {
  if (!_plGCompany) return;
  if (!_plCanEditGoal()) { toast('목표 설정 권한이 없습니다', 'err'); return; }
  if (!document.getElementById('pl-modal-goal')) _plBuildGoalModalShell();
  _plGoalModalYear = _plGState.year;
  const companyEl = document.getElementById('pl-goal-company');
  if (companyEl) companyEl.textContent = _plGCompany;
  const yearSelEl = document.getElementById('pl-goal-year-sel');
  if (yearSelEl) yearSelEl.innerHTML = _plGoalYearOptions();
  _plRenderGoalModalBody();
  openModal('pl-modal-goal');
}
function _plGoalYearChange(y) {
  _plGoalModalYear = y;
  _plRenderGoalModalBody();
}
function _plRenderGoalModalBody() {
  const year = _plGoalModalYear;
  const seller = SELLER_DATA.find(s => s.company === _plGCompany);
  // 연간요약 표와 순서를 맞추기 위해 같은 기준(광고예산 내림차순)으로 정렬 — 활동 없는 브랜드는 등록 순서 그대로 뒤로
  const adcostByBrand = {};
  _plGAnnualRows(_plGCompany, year).forEach(r => { adcostByBrand[r.brandKey] = r.adcost; });
  const brandNames = (seller?.brands || []).map(b => b.name)
    .sort((a, b) => (adcostByBrand[b] || 0) - (adcostByBrand[a] || 0));
  const companyGoal = _plGetGoal(_plGCompany, null, year);
  const brandRows = brandNames.length ? brandNames.map((b, bi) => {
    const g = _plGetGoal(_plGCompany, b, year);
    const pmOptions = _plWriterNames().map(n => `<option value="${_escHtml(n)}" ${g?.pm === n ? 'selected' : ''}>${_escHtml(n)}</option>`).join('');
    return `<div style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:8px;">
      <div style="font-size:12.5px;font-weight:600;margin-bottom:7px;">${_escHtml(b)}</div>
      <div style="display:flex;align-items:flex-end;gap:8px;">
        <div style="width:80px;">
          <label style="font-size:9.5px;color:var(--text3);display:block;margin-bottom:2px;">PM</label>
          <select class="form-input pl-goal-brand-pm" data-brand="${_escHtml(b)}" style="width:100%;">
            <option value="">선택안함</option>${pmOptions}
          </select>
        </div>
        <div style="width:105px;">
          <label style="font-size:9.5px;color:var(--text3);display:block;margin-bottom:2px;">취급고 목표</label>
          <input type="number" class="form-input pl-goal-brand-input" data-brand="${_escHtml(b)}" placeholder="미입력" value="${g?.value || ''}" style="width:100%;">
        </div>
        <div style="width:100px;">
          <label style="font-size:9.5px;color:var(--text3);display:block;margin-bottom:2px;">DB등록수 목표</label>
          <input type="number" class="form-input pl-goal-brand-db" data-brand="${_escHtml(b)}" placeholder="미입력" value="${g?.dbTarget || ''}" style="width:100%;">
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="form-hint">매출처관리에 등록된 브랜드가 없습니다.</div>';
  const body = document.getElementById('pl-goal-body');
  if (body) body.innerHTML = `
    <div class="form-label" style="margin-bottom:6px;">광고주 전체 목표(취급고)</div>
    <input type="number" class="form-input" id="pl-goal-company-input" placeholder="미입력" value="${companyGoal?.value || ''}" style="margin-bottom:16px;width:100%;">
    <div class="form-label" style="margin-bottom:6px;">브랜드별 PM · 목표(취급고) · DB등록수 목표</div>
    ${brandRows}
    <div class="form-hint" style="margin-top:8px;">DB등록수 목표는 캠페인 실적에서 자동으로 합산해 달성률까지 보여줍니다. 비워두고 저장하면 해당 목표가 삭제됩니다. ${_escHtml(year)}년에만 적용됩니다.</div>
  `;
}
async function _plSaveGoalModal() {
  if (!_plCanEditGoal()) { toast('목표 설정 권한이 없습니다', 'err'); return; }
  const company = _plGCompany;
  const year = _plGoalModalYear;
  const btn = document.querySelector('#pl-modal-goal .modal-foot .btn-primary');
  if (btn) btn.disabled = true;
  try {
    await _plSaveGoal(company, null, year, document.getElementById('pl-goal-company-input')?.value);
    const pmMap = {};
    document.querySelectorAll('.pl-goal-brand-pm').forEach(inp => { pmMap[inp.dataset.brand] = inp.value; });
    const dbMap = {};
    document.querySelectorAll('.pl-goal-brand-db').forEach(inp => { dbMap[inp.dataset.brand] = inp.value; });
    const inputs = [...document.querySelectorAll('.pl-goal-brand-input')];
    for (const inp of inputs) {
      await _plSaveGoal(company, inp.dataset.brand, year, inp.value, pmMap[inp.dataset.brand], dbMap[inp.dataset.brand]);
    }
    toast('✓ 목표가 저장되었습니다', 'ok');
    closeModal('pl-modal-goal');
    _plGRenderAnnual();
  } catch (e) {
    toast('저장 중 오류가 발생했습니다', 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// 브랜드 하나의 12개월치 목표/실적 — ①연간요약의 브랜드별 펼침 영역(_plGBrandDetailRow) 안에 표시
function _plGBrandMonths(company, brandKey, year) {
  const yearCamps = DATA.filter(c => (c.seller || c.adv) === company && c.status !== '삭제'
    && (c.date || '').startsWith(year) && (c.content || '') === (brandKey || ''));
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const mcamps = yearCamps.filter(c => (c.date || '').startsWith(ym));
    const adcost = mcamps.reduce((s, c) => s + _campAdcost(c), 0);
    const g = _plGetMonthlyGoal(company, brandKey, ym);
    months.push({ ym, adcost, target: g?.value || 0, monthKpi: g?.monthKpi || '', advKpiRate: g?.advKpiRate });
  }
  return months;
}
// KPI/매출현황 메뉴의 표와 같은 형식(구분 | 연간합계 | 월별) — 매출/매출KPI는 script.js의
// _fmtKpi, 매출KPI달성률은 같은 화면의 _kpiRateHtml(목표 대비 ▲▼)을 그대로 재사용해 표기를 통일한다.
// 수정은 행마다가 아니라 표 하나에 "✎ 수정" 버튼 하나로만(→ plOpenMonthlyGoalModal).
function _plGBrandMonthlyHtml(company, brandKey, brandLabel, year) {
  const months = _plGBrandMonths(company, brandKey, year);
  const nd = '<span style="color:var(--text3)">—</span>';
  const totalAdcost = months.reduce((s, m) => s + m.adcost, 0);
  const totalTarget = months.reduce((s, m) => s + m.target, 0);

  const thStyle = 'padding:6px 8px;border:1px solid var(--border);background:var(--surface);font-weight:600;font-size:10px;color:var(--text2);text-align:center;white-space:nowrap;';
  const tdLbl   = 'padding:6px 10px;border:1px solid var(--border);background:var(--surface);font-weight:600;font-size:11px;color:var(--text);white-space:nowrap;';
  const tdVal   = 'padding:6px 8px;border:1px solid var(--border);background:var(--surface);text-align:right;font-size:11.5px;white-space:nowrap;';
  const tdTxt   = 'padding:6px 8px;border:1px solid var(--border);background:var(--surface);text-align:left;font-size:11px;color:var(--text2);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;';
  const tdYr    = 'padding:6px 8px;border:1px solid var(--border);background:#fff9e6;text-align:right;font-size:11.5px;font-weight:700;white-space:nowrap;';

  const heads = months.map(m => `<th style="${thStyle}">${parseInt(m.ym.slice(5, 7), 10)}월</th>`).join('');

  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <span style="font-size:10.5px;font-weight:700;color:var(--text2);">월별 목표</span>
      ${_plCanEditGoal() ? `<span class="pl-x" style="font-size:11px;color:var(--accent);cursor:pointer;" onclick="plOpenMonthlyGoalModal('${_escHtml(brandKey)}','${_escHtml(brandLabel)}')">✎ 수정</span>` : ''}
    </div>
    <div style="overflow-x:auto;">
    <table class="kpi-tbl" style="width:max-content;">
      <thead><tr>
        <th style="${thStyle}text-align:left;min-width:120px;">구분</th>
        <th style="${thStyle}background:#fff9e6;min-width:70px;">연간합계</th>
        ${heads}
      </tr></thead>
      <tbody>
        <tr>
          <td style="${tdLbl}">매출</td>
          <td style="${tdYr}">${_fmtKpi(totalAdcost)}</td>
          ${months.map(m => `<td style="${tdVal}">${_fmtKpi(m.adcost)}</td>`).join('')}
        </tr>
        <tr>
          <td style="${tdLbl}">매출 KPI</td>
          <td style="${tdYr}">${_fmtKpi(totalTarget)}</td>
          ${months.map(m => `<td style="${tdVal}">${_fmtKpi(m.target)}</td>`).join('')}
        </tr>
        <tr>
          <td style="${tdLbl}">매출 KPI 달성률</td>
          <td style="${tdYr}text-align:center;">${_kpiRateHtml(totalAdcost, totalTarget)}</td>
          ${months.map(m => `<td style="${tdVal}text-align:center;">${_kpiRateHtml(m.adcost, m.target)}</td>`).join('')}
        </tr>
        <tr>
          <td style="${tdLbl}">월 KPI</td>
          <td style="${tdYr}text-align:center;">${nd}</td>
          ${months.map(m => `<td style="${tdTxt}" title="${_escHtml(m.monthKpi)}">${m.monthKpi ? _escHtml(m.monthKpi) : nd}</td>`).join('')}
        </tr>
        <tr>
          <td style="${tdLbl}">광고주 KPI 달성률</td>
          <td style="${tdYr}text-align:center;">${nd}</td>
          ${months.map(m => `<td style="${tdVal}text-align:center;">${m.advKpiRate != null ? m.advKpiRate + '%' : nd}</td>`).join('')}
        </tr>
      </tbody>
    </table>
    </div>
  </div>`;
}

// ── 브랜드 월별 목표 입력 모달 (④의 ✎에서 진입) ──
let _plMonthlyGoalModalBrand = null;
function _plBuildMonthlyGoalModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-monthlygoal';
  overlay.innerHTML = `
    <div class="modal" style="width:620px;max-width:96vw;">
      <div class="modal-head">
        <span class="modal-title" id="pl-mg-title">🎯 월별 목표</span>
        <button class="modal-close" onclick="closeModal('pl-modal-monthlygoal')">✕</button>
      </div>
      <div class="modal-body" id="pl-mg-body" style="max-height:60vh;overflow-y:auto;"></div>
      <div class="modal-foot">
        <button class="btn btn-primary btn-sm" onclick="_plSaveMonthlyGoalModal()">저장</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
function plOpenMonthlyGoalModal(brandKey, brandLabel) {
  if (!_plGCompany) return;
  if (!_plCanEditGoal()) { toast('목표 설정 권한이 없습니다', 'err'); return; }
  _plMonthlyGoalModalBrand = brandKey;
  if (!document.getElementById('pl-modal-monthlygoal')) _plBuildMonthlyGoalModalShell();
  const year = _plGState.year;
  const titleEl = document.getElementById('pl-mg-title');
  if (titleEl) titleEl.textContent = `🎯 ${brandLabel} · ${year}년 월별 목표`;
  const bodyEl = document.getElementById('pl-mg-body');
  if (bodyEl) {
    const headStyle = 'font-size:9.5px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.03em;';
    let rows = `<div style="display:grid;grid-template-columns:34px 1fr 1fr 1fr;gap:8px;padding:0 2px 4px;">
      <span></span><span style="${headStyle}">매출 KPI</span><span style="${headStyle}">월 KPI</span><span style="${headStyle}">광고주 KPI 달성률</span>
    </div>`;
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      const g = _plGetMonthlyGoal(_plGCompany, brandKey, ym);
      rows += `<div style="display:grid;grid-template-columns:34px 1fr 1fr 1fr;gap:8px;align-items:center;margin-bottom:6px;">
        <label style="font-size:11.5px;font-weight:600;color:var(--text2);">${m}월</label>
        <input type="number" class="form-input pl-mg-input" data-ym="${ym}" value="${g?.value || ''}" placeholder="미입력" style="font-size:12px;padding:6px 8px;">
        <input type="text" class="form-input pl-mg-kpi-input" data-ym="${ym}" value="${_escHtml(g?.monthKpi || '')}" placeholder="메모" style="font-size:12px;padding:6px 8px;">
        <input type="number" class="form-input pl-mg-adv-input" data-ym="${ym}" value="${g?.advKpiRate ?? ''}" placeholder="%" style="font-size:12px;padding:6px 8px;">
      </div>`;
    }
    bodyEl.innerHTML = rows + `<div class="form-hint" style="margin-top:6px;">전부 비워두고 저장하면 그 달 값이 삭제됩니다. 매출 KPI 달성률은 매출 KPI 대비 자동 계산되어 여기서 따로 입력하지 않습니다.</div>`;
  }
  openModal('pl-modal-monthlygoal');
}
async function _plSaveMonthlyGoalModal() {
  if (!_plCanEditGoal()) { toast('목표 설정 권한이 없습니다', 'err'); return; }
  const brandKey = _plMonthlyGoalModalBrand;
  const btn = document.querySelector('#pl-modal-monthlygoal .modal-foot .btn-primary');
  if (btn) btn.disabled = true;
  try {
    const inputs = [...document.querySelectorAll('.pl-mg-input')];
    for (const inp of inputs) {
      const ym = inp.dataset.ym;
      const kpiInp = document.querySelector(`.pl-mg-kpi-input[data-ym="${ym}"]`);
      const advInp = document.querySelector(`.pl-mg-adv-input[data-ym="${ym}"]`);
      await _plSaveMonthlyGoal(_plGCompany, brandKey, ym, inp.value, kpiInp?.value, advInp?.value);
    }
    toast('✓ 월별 목표가 저장되었습니다', 'ok');
    closeModal('pl-modal-monthlygoal');
    _plGRenderAnnual();
    _plGRenderMonthly();
  } catch (e) {
    toast('저장 중 오류가 발생했습니다', 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}
function _plGMonthlyRows(company, ym) {
  const camps = DATA.filter(c => (c.seller || c.adv) === company && c.status !== '삭제' && (c.date || '').startsWith(ym));
  const keys = [...new Set(camps.map(c => c.content || ''))];
  return keys.map(brand => {
    const bcamps = camps.filter(c => (c.content || '') === brand);
    const products = [...new Set(bcamps.map(c => c.product).filter(Boolean))];
    const medias = [...new Set(bcamps.map(c => c.media).filter(Boolean))];
    const adcost = bcamps.reduce((s, c) => s + _campAdcost(c), 0);
    const qty = bcamps.reduce((s, c) => s + (c.qty || 0), 0);
    const actual = bcamps.reduce((s, c) => s + (c.actual || 0), 0);
    const dbTotal = bcamps.reduce((s, c) => s + (c.db || 0), 0);
    const statusCounts = {};
    bcamps.forEach(c => { statusCounts[c.status || '—'] = (statusCounts[c.status || '—'] || 0) + 1; });
    const statusLabel = Object.entries(statusCounts).map(([s, n]) => `${s} ${n}`).join('\n');
    const target = _plGetMonthlyGoal(company, brand, ym)?.value || 0;
    return {
      brand: brand || '브랜드 미지정', brandKey: brand,
      prodLabel: products.length ? products.join('·') : '—',
      mediasShort: medias.slice(0, 2).join(', ') + (medias.length > 2 ? '...' : '') || '—',
      mediasFull: medias.join(', '), mediasMore: medias.length > 2,
      adcost, qty, actual, dbTotal, statusLabel, target,
    };
  }).sort((a, b) => b.adcost - a.adcost);
}
// ①연간요약의 _plGProductRows와 동일 패턴 — 연 단위 대신 월(ym) 단위로 상품별 집계
function _plGMonthlyProductRows(company, brandKey, ym) {
  const camps = DATA.filter(c => (c.seller || c.adv) === company && c.status !== '삭제'
    && (c.content || '') === (brandKey || '') && (c.date || '').startsWith(ym));
  const products = [...new Set(camps.map(c => c.product).filter(Boolean))];
  return products.map(product => {
    const pcamps = camps.filter(c => c.product === product);
    const medias = [...new Set(pcamps.map(c => c.media).filter(Boolean))];
    const adcost = pcamps.reduce((s, c) => s + _campAdcost(c), 0);
    const qty = pcamps.reduce((s, c) => s + (c.qty || 0), 0);
    const actual = pcamps.reduce((s, c) => s + (c.actual || 0), 0);
    const dbTotal = pcamps.reduce((s, c) => s + (c.db || 0), 0);
    const statusCounts = {};
    pcamps.forEach(c => { statusCounts[c.status || '—'] = (statusCounts[c.status || '—'] || 0) + 1; });
    const statusLabel = Object.entries(statusCounts).map(([s, n]) => `${s} ${n}`).join('\n');
    return {
      product,
      mediasShort: medias.slice(0, 2).join(', ') + (medias.length > 2 ? '...' : '') || '—',
      mediasFull: medias.join(', '), mediasMore: medias.length > 2,
      adcost, qty, actual, dbTotal, statusLabel,
    };
  });
}
// 상품별 서브행 — 프로젝트(브랜드) 칸은 부모 행에서 rowspan으로 덮으므로 여기선 렌더링하지 않음(①연간요약의 _plGSubRowsHtml과 동일 패턴)
function _plGMonthlySubRowsHtml(productRows, monthLabel) {
  return productRows.map(r => `<tr class="pl-g-subrow" style="background:var(--surface2);">
    <td class="td-dim f-mono">${_escHtml(monthLabel)}</td>
    <td class="td-dim">${_escHtml(r.product)}</td>
    <td class="td-dim${r.mediasMore ? ' pl-bubble-cell' : ''}"${r.mediasMore ? ` style="cursor:pointer;" onmouseenter="plShowBubble(this,'${_escHtml(r.mediasFull)}',100,-30)" onmouseleave="if(document.getElementById('pl-bubble')?.dataset.sticky!=='1')plHideBubble()" onclick="event.stopPropagation();plShowBubbleSticky(this,'${_escHtml(r.mediasFull)}',100,-30)"` : ''}>${_escHtml(r.mediasShort)}</td>
    <td></td>
    <td class="td-num td-r">${r.adcost ? _fmtMoney(r.adcost) : '—'}</td>
    <td></td>
    <td class="td-num td-r">${r.qty ? _fmtMoney(r.qty) : '—'}</td>
    <td class="td-num td-r">${r.actual ? _fmtMoney(r.actual) : '—'}</td>
    <td style="white-space:pre-line;font-size:12px;">${_escHtml(r.statusLabel)}</td>
    <td class="td-dim">${r.dbTotal ? 'DB ' + _fmtMoney(r.dbTotal) : '—'}</td>
  </tr>`).join('');
}
function _plGMonthChange(v) { _plGState.month = v; _plGState.monthPage = 1; _plGRenderMonthly(); }
const PL_G_MONTH_PAGE_SIZE = 6;
function _plGMonthGoPage(p) { _plGState.monthPage = p; _plGRenderMonthly(); }
function _plGMonthPaginationHtml(total, page, totalPages) {
  const start = total === 0 ? 0 : (page - 1) * PL_G_MONTH_PAGE_SIZE + 1;
  const end = Math.min(page * PL_G_MONTH_PAGE_SIZE, total);
  return `<span class="pg-info">${start}~${end} / ${total}건</span><div class="pg-btns">${_plPageBtnsHtml(page, totalPages, '_plGMonthGoPage')}</div>`;
}

// ③일간기록처럼 페이지네이션으로 높이를 고정 — 브랜드가 많아도 표가 뷰포트를 벗어나 스크롤을 만들지 않도록 함
function _plGRenderMonthly() {
  const el = document.getElementById('pl-g-monthly');
  if (!el) return;
  const ym = _plGState.month;
  const rows = _plGMonthlyRows(_plGCompany, ym);
  const totalPages = Math.max(1, Math.ceil(rows.length / PL_G_MONTH_PAGE_SIZE));
  _plGState.monthPage = Math.min(Math.max(1, _plGState.monthPage), totalPages);
  const pageRows = rows.slice((_plGState.monthPage - 1) * PL_G_MONTH_PAGE_SIZE, _plGState.monthPage * PL_G_MONTH_PAGE_SIZE);
  const monthLabel = _plCompressMonths([ym.slice(5, 7)]);
  const COLS = 11; // 프로젝트 + 집행월 + 광고상품 + 매체사 + 목표(취급고) + 취급고 + 달성률 + 요청수량 + 발송수량 + 캠페인상태 + DB등록수
  const bodyRows = pageRows.map(r => {
    const productRows = _plGMonthlyProductRows(_plGCompany, r.brandKey, ym);
    const rowspan = 1 + productRows.length;
    const prodLabel = productRows.length ? '전체' : r.prodLabel;
    const head = `<tr>
      <td class="td-bold" rowspan="${rowspan}" style="vertical-align:top;">${_escHtml(r.brand)}</td>
      <td class="td-dim f-mono">${_escHtml(monthLabel)}</td>
      <td class="td-dim">${_escHtml(prodLabel)}</td>
      <td class="td-dim${r.mediasMore ? ' pl-bubble-cell' : ''}"${r.mediasMore ? ` style="cursor:pointer;" onmouseenter="plShowBubble(this,'${_escHtml(r.mediasFull)}',100,-30)" onmouseleave="if(document.getElementById('pl-bubble')?.dataset.sticky!=='1')plHideBubble()" onclick="event.stopPropagation();plShowBubbleSticky(this,'${_escHtml(r.mediasFull)}',100,-30)"` : ''}>${_escHtml(r.mediasShort)}</td>
      <td class="${r.target ? 'td-num td-r' : 'td-dim'}">${r.target ? _fmtMoney(r.target) : '미입력'}</td>
      <td class="td-num td-r">${r.adcost ? _fmtMoney(r.adcost) : '—'}</td>
      <td class="td-dim">${(() => {
        if (!r.target) return '-';
        const rate = r.adcost / r.target * 100;
        const c = rate >= 90 ? 'var(--green)' : rate >= 70 ? 'var(--yellow)' : 'var(--red)';
        return `<span style="font-weight:700;color:${c};">${rate.toFixed(1)}%</span>`;
      })()}</td>
      <td class="td-num td-r">${r.qty ? _fmtMoney(r.qty) : '—'}</td>
      <td class="td-num td-r">${r.actual ? _fmtMoney(r.actual) : '—'}</td>
      <td style="white-space:pre-line;font-size:12px;">${_escHtml(r.statusLabel)}</td>
      <td class="td-dim">${r.dbTotal ? 'DB ' + _fmtMoney(r.dbTotal) : '—'}</td>
    </tr>`;
    return head + _plGMonthlySubRowsHtml(productRows, monthLabel);
  }).join('');
  el.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <span class="card-title">② 월간 요약</span>
        <input type="month" class="f-date" id="pl-g-month" value="${_escHtml(ym)}" onchange="_plGMonthChange(this.value)" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
      </div>
      <div class="table-wrap" style="overflow-y:hidden;"><table class="pl-g-monthly-tbl" style="width:100%;">
        <thead><tr><th>프로젝트</th><th>집행월</th><th>광고상품</th><th>매체사</th><th class="td-r">목표(취급고)</th><th class="td-r">취급고</th><th>달성률</th><th class="td-r">요청수량</th><th class="td-r">발송수량</th><th>캠페인 상태</th><th>DB등록수</th></tr></thead>
        <tbody>${bodyRows || `<tr><td colspan="${COLS}" style="text-align:center;padding:24px;color:var(--text3);">해당 월 캠페인이 없습니다.</td></tr>`}</tbody>
      </table></div>
      ${rows.length ? `<div class="pagination" style="justify-content:flex-end;gap:12px;">${_plGMonthPaginationHtml(rows.length, _plGState.monthPage, totalPages)}</div>` : ''}
    </div>`;
}

function _plGDailyFiltered(company) {
  let logs = PL_LOGS.filter(l => l.seller === company);
  if (_plGState.dayProject) logs = logs.filter(l => (l.content || '브랜드 미지정') === _plGState.dayProject);
  if (_plGState.dayType) logs = logs.filter(l => l.logType === _plGState.dayType);
  if (_plGState.dayMedia) logs = logs.filter(l => l.media === _plGState.dayMedia);
  if (_plGState.dayWriter) logs = logs.filter(l => l.writer === _plGState.dayWriter);
  if (_plGState.dayOpenOnly) logs = logs.filter(l => l.state === '진행중');
  if (_plGState.dayProgressSort) logs = _plSortByIncompleteProgress(logs);
  return logs;
}
function _plGDayFilter(field, val) {
  if (field === 'project') _plGState.dayProject = val;
  if (field === 'type') _plGState.dayType = val;
  if (field === 'media') _plGState.dayMedia = val;
  if (field === 'writer') _plGState.dayWriter = val;
  _plGState.dayPage = 1;
  _plGRenderDaily();
}
function _plGDayToggleOpen() {
  _plGState.dayOpenOnly = !_plGState.dayOpenOnly;
  _plGState.dayPage = 1;
  _plGRenderDaily();
}
function _plGDayToggleProgressSort() {
  _plGState.dayProgressSort = !_plGState.dayProgressSort;
  _plGState.dayPage = 1;
  _plGRenderDaily();
}
function _plGDayGoPage(p) { _plGState.dayPage = p; _plGRenderDaily(); }
function _plGDayPaginationHtml(total, page, totalPages) {
  const start = total === 0 ? 0 : (page - 1) * PL_G_DAY_PAGE_SIZE + 1;
  const end = Math.min(page * PL_G_DAY_PAGE_SIZE, total);
  return `<span class="pg-info">${start}~${end} / ${total}건</span><div class="pg-btns">${_plPageBtnsHtml(page, totalPages, '_plGDayGoPage')}</div>`;
}

function _plGRenderDaily() {
  const el = document.getElementById('pl-g-daily');
  if (!el) return;
  const allLogs = PL_LOGS.filter(l => l.seller === _plGCompany);
  const projects = [...new Set(allLogs.map(l => l.content || '브랜드 미지정'))];
  const medias = [...new Set(allLogs.map(l => l.media).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const writers = [...new Set(allLogs.map(l => l.writer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const filtered = _plGDailyFiltered(_plGCompany);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PL_G_DAY_PAGE_SIZE));
  _plGState.dayPage = Math.min(Math.max(1, _plGState.dayPage), totalPages);
  const pageItems = filtered.slice((_plGState.dayPage - 1) * PL_G_DAY_PAGE_SIZE, _plGState.dayPage * PL_G_DAY_PAGE_SIZE);
  const rowsHtml = pageItems.length ? pageItems.map(l => _plRenderLogRow(l, '', 'gdaily')).join('') : `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text3);">기록이 없습니다.</td></tr>`;

  el.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <span class="card-title">③ 일간 기록</span>
        <span class="table-count">전체 <b>${filtered.length}</b>건</span>
        <select class="f-sel" onchange="_plGDayFilter('project',this.value)">
          <option value="">프로젝트 전체</option>${projects.map(p => `<option value="${_escHtml(p)}" ${_plGState.dayProject === p ? 'selected' : ''}>${_escHtml(p)}</option>`).join('')}
        </select>
        <select class="f-sel" onchange="_plGDayFilter('type',this.value)">
          <option value="">유형 전체</option>${PL_LOG_TYPES.map(t => `<option value="${t}" ${_plGState.dayType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <select class="f-sel" onchange="_plGDayFilter('media',this.value)">
          <option value="">매체 전체</option>${medias.map(m => `<option value="${_escHtml(m)}" ${_plGState.dayMedia === m ? 'selected' : ''}>${_escHtml(m)}</option>`).join('')}
        </select>
        <select class="f-sel" onchange="_plGDayFilter('writer',this.value)">
          <option value="">작성자 전체</option>${writers.map(w => `<option value="${_escHtml(w)}" ${_plGState.dayWriter === w ? 'selected' : ''}>${_escHtml(w)}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm${_plGState.dayOpenOnly ? ' pl-toggle-on' : ''}" onclick="_plGDayToggleOpen()">🔴 진행중</button>
        <button class="btn btn-outline btn-sm${_plGState.dayProgressSort ? ' pl-toggle-on' : ''}" onclick="_plGDayToggleProgressSort()" data-tooltip="이어쓰기로 이미 이어진 옛 기록은 제외하고, 진짜 미완료인 것만 진척률 낮은 순으로 맨 위에 모읍니다">📊 미완료 낮은순</button>
        <button class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="_plGExpandAll(true)">전체 펼침</button>
        <button class="btn btn-ghost btn-sm" onclick="_plGExpandAll(false)">요약만</button>
      </div>
      <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
        <thead><tr>
          <th style="width:22px;"></th><th style="width:78px;">작성일</th><th style="width:110px;">광고주</th><th style="width:90px;">프로젝트</th>
          <th style="width:90px;">캠페인</th><th style="width:70px;">매체</th><th style="width:60px;">유형</th><th>내용</th><th style="width:56px;">진척</th><th style="width:60px;">작성자</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>
      <div class="pagination" style="justify-content:flex-end;gap:12px;">${_plGDayPaginationHtml(filtered.length, _plGState.dayPage, totalPages)}</div>
    </div>`;
}

function _plWriteFromAdvertiser(company) {
  plOpenWrite({ scope: 'advertiser', seller: company, content: null, campaignId: null, media: null, product: null });
}

function _plRenderAdvertiserDetail(content, company) {
  if (_plGCompany !== company) {
    _plGCompany = company;
    _plGState = { year: String(new Date().getFullYear()), month: _plCurrentYm(), dayProject: '', dayType: '', dayMedia: '', dayWriter: '', dayOpenOnly: false, dayProgressSort: false, dayPage: 1, monthPage: 1 };
  }
  const seller = SELLER_DATA.find(s => s.company === company);
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="plBackToAdvertiserList()">← 광고주 목록</button>
      <span style="font-size:16px;font-weight:800;">${_escHtml(company)}</span>
      ${seller ? `<span class="tag">${_escHtml(seller.type || '')}</span>` : ''}
      <select class="f-sel" id="pl-g-year" style="margin-left:auto;" onchange="_plGYearChange(this.value)">${_plGYearOptions()}</select>
      <button class="btn btn-primary btn-sm" onclick="_plWriteFromAdvertiser('${_escHtml(company)}')">+ 일지 작성</button>
    </div>
    <div id="pl-g-annual"></div>
    <div id="pl-g-monthly" style="margin-top:16px;"></div>
    <div id="pl-g-daily" style="margin-top:16px;"></div>
  `;
  _plGRenderAnnual();
  _plGRenderMonthly();
  _plGRenderDaily();
}

// ══════════════════════════════════════════════════════════
// H. 캠페인 목록 (신규 — 목업 없음)
// ══════════════════════════════════════════════════════════

let _plCampTabState = { page: 1 };
const PL_CAMP_PAGE_SIZE = 20;

function _plProductOptionsHtml() {
  const prods = [...new Set(DATA.map(c => c.product).filter(Boolean))].sort();
  return prods.map(p => `<option value="${_escHtml(p)}">${_escHtml(p)}</option>`).join('');
}
function _plStatusOptionsHtml() {
  return Object.keys(typeof STATUS_COLORS !== 'undefined' ? STATUS_COLORS : {}).map(s => `<option value="${_escHtml(s)}">${_escHtml(s)}</option>`).join('');
}

function _plCampFiltered() {
  const q = document.getElementById('pl-camp-search')?.value || '';
  const seller = document.getElementById('pl-camp-seller')?.value.trim() || '';
  const media = document.getElementById('pl-camp-media')?.value.trim() || '';
  const product = document.getElementById('pl-camp-product')?.value || '';
  const dFrom = document.getElementById('pl-camp-from')?.value || '';
  const dTo = document.getElementById('pl-camp-to')?.value || '';
  const status = document.getElementById('pl-camp-status')?.value || '';
  const record = document.getElementById('pl-camp-record')?.value || '';
  let list = DATA.filter(c => {
    if (c.status === '삭제') return false;
    const sellerName = c.seller || c.adv || '';
    if (q) {
      const hay = `${c.id} ${sellerName} ${c.content || ''} ${c.date || ''} ${c.media || ''} ${c.product || ''} ${_cName(c)}`;
      if (!_plTokenMatch(hay, q)) return false;
    }
    if (seller && sellerName !== seller) return false;
    if (media && c.media !== media) return false;
    if (product && c.product !== product) return false;
    if (dFrom && (c.date || '') < dFrom) return false;
    if (dTo && (c.date || '') > dTo) return false;
    if (status && c.status !== status) return false;
    if (record) {
      const cnt = _plCampaignLogsAll(c.id).length;
      if (record === 'has' && cnt === 0) return false;
      if (record === 'none' && cnt > 0) return false;
    }
    return true;
  });
  const sortSel = document.getElementById('pl-camp-sort')?.value || 'recent';
  list = list.slice().sort((a, b) => {
    if (sortSel === 'date') return (b.date || '').localeCompare(a.date || '');
    const la = _plCampaignLogsAll(a.id).reduce((m, l) => (!m || (l.logDate || '') > m) ? l.logDate : m, '');
    const lb = _plCampaignLogsAll(b.id).reduce((m, l) => (!m || (l.logDate || '') > m) ? l.logDate : m, '');
    return (lb || '').localeCompare(la || '');
  });
  return list;
}

function _plRenderCampaignRow(c) {
  const sellerName = c.seller || c.adv || '—';
  const logs = _plCampaignLogsAll(c.id);
  const lastLog = logs.reduce((m, l) => (!m || (l.logDate || '') > (m.logDate || '')) ? l : m, null);
  const statusColor = (typeof STATUS_COLORS !== 'undefined' ? STATUS_COLORS[c.status] : null) || '#999';
  const dateShort = (c.date || '').slice(2, 10).replace(/-/g, '.');
  return `<tr style="cursor:pointer;" onclick="plOpenCampaignLogs('${c.id}')">
    <td class="f-mono td-num">${_escHtml(c.id)}</td>
    <td class="td-bold">${_escHtml(sellerName)}</td>
    <td>${c.content ? `<span class="tag pl-brand">${_escHtml(c.content)}</span>` : '<span class="tag pl-muted">브랜드 미지정</span>'}</td>
    <td class="td-dim">${_escHtml(c.media || '—')}</td>
    <td class="td-dim">${_escHtml(c.product || '—')}</td>
    <td class="f-mono td-num">${dateShort}</td>
    <td><span class="badge" style="background:${statusColor}22;color:${statusColor};">${_escHtml(c.status || '—')}</span></td>
    <td class="td-num td-r">${logs.length || '—'}</td>
    <td class="${lastLog ? 'f-mono td-num' : 'td-dim'}">${lastLog ? _escHtml(lastLog.logDate.slice(2).replace(/-/g, '.')) : '—'}</td>
  </tr>`;
}

function _plBuildCampaignTabSkeleton(content) {
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:12px;overflow:visible;">
      <input type="text" class="f-search" id="pl-camp-search" placeholder="캠페인ID·광고주·브랜드·매체" style="width:190px;" oninput="_plCampTabState.page=1;_plRenderCampaignRows();">
      <div class="combo-wrap" style="width:110px;"><input type="text" class="f-search" id="pl-camp-seller" placeholder="🔍 광고주" style="width:110px;"><div class="combo-list" id="pl-camp-seller-list" style="display:none;"></div></div>
      <div class="combo-wrap" style="width:100px;"><input type="text" class="f-search" id="pl-camp-media" placeholder="🔍 매체" style="width:100px;"><div class="combo-list" id="pl-camp-media-list" style="display:none;"></div></div>
      <select class="f-sel" id="pl-camp-product" onchange="_plCampTabState.page=1;_plRenderCampaignRows();"><option value="">상품 전체</option>${_plProductOptionsHtml()}</select>
      <input type="date" class="f-date" id="pl-camp-from" onchange="_plCampTabState.page=1;_plRenderCampaignRows();" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
      <span class="form-hint">~</span>
      <input type="date" class="f-date" id="pl-camp-to" onchange="_plCampTabState.page=1;_plRenderCampaignRows();" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
      <select class="f-sel" id="pl-camp-status" onchange="_plCampTabState.page=1;_plRenderCampaignRows();"><option value="">상태 전체</option>${_plStatusOptionsHtml()}</select>
      <select class="f-sel" id="pl-camp-record" onchange="_plCampTabState.page=1;_plRenderCampaignRows();"><option value="">기록 전체</option><option value="has">기록있음</option><option value="none">기록없음</option></select>
      <select class="f-sel" id="pl-camp-sort" style="margin-left:auto;" onchange="_plRenderCampaignRows();"><option value="recent">정렬: 최근 기록순</option><option value="date">정렬: 발송일순</option></select>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="card-title">캠페인</span><span class="table-count" id="pl-camp-count"></span></div>
      <div class="table-wrap"><table style="width:100%;">
        <thead><tr>
          <th style="width:90px;">캠페인ID</th><th style="width:110px;">광고주</th><th style="width:90px;">브랜드</th><th style="width:80px;">매체</th><th style="width:60px;">상품</th>
          <th style="width:70px;">발송일</th><th style="width:90px;">상태</th><th class="td-r" style="width:56px;">기록</th><th style="width:80px;">최근기록</th>
        </tr></thead>
        <tbody id="pl-camp-tbody"></tbody>
      </table></div>
      <div class="pagination" id="pl-camp-pagination" style="justify-content:flex-end;gap:12px;"></div>
    </div>
  `;
  const _plCampFilterChange = () => { _plCampTabState.page = 1; _plRenderCampaignRows(); };
  _plComboSetup('pl-camp-seller', 'pl-camp-seller-list', _plSellerNames, _plCampFilterChange);
  _plComboSetup('pl-camp-media', 'pl-camp-media-list', _plMediaNames, _plCampFilterChange);
}
function _plCampPaginationHtml(total, page, totalPages) {
  const start = total === 0 ? 0 : (page - 1) * PL_CAMP_PAGE_SIZE + 1;
  const end = Math.min(page * PL_CAMP_PAGE_SIZE, total);
  return `<span class="pg-info">${start}~${end} / ${total}건</span><div class="pg-btns">${_plPageBtnsHtml(page, totalPages, '_plCampGoPage')}</div>`;
}
function _plCampGoPage(p) { _plCampTabState.page = p; _plRenderCampaignRows(); }

function _plRenderCampaignRows() {
  const filtered = _plCampFiltered();
  const countEl = document.getElementById('pl-camp-count');
  if (countEl) countEl.innerHTML = `검색 <b>${filtered.length}</b>건 · 전체 <b>${DATA.filter(c => c.status !== '삭제').length}</b>개`;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PL_CAMP_PAGE_SIZE));
  _plCampTabState.page = Math.min(Math.max(1, _plCampTabState.page), totalPages);
  const pageItems = filtered.slice((_plCampTabState.page - 1) * PL_CAMP_PAGE_SIZE, _plCampTabState.page * PL_CAMP_PAGE_SIZE);
  const tbody = document.getElementById('pl-camp-tbody');
  if (tbody) tbody.innerHTML = pageItems.length ? pageItems.map(_plRenderCampaignRow).join('') : `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3);">조건에 맞는 캠페인이 없습니다.</td></tr>`;
  const pagEl = document.getElementById('pl-camp-pagination');
  if (pagEl) pagEl.innerHTML = _plCampPaginationHtml(filtered.length, _plCampTabState.page, totalPages);
}

function plRenderCampaignTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (content.dataset.plTab !== 'campaign') {
    _plBuildCampaignTabSkeleton(content);
    content.dataset.plTab = 'campaign';
  }
  // 이 탭은 "기록없음 캠페인 찾기"처럼 전체를 훑어보는 용도라 최근 구독 범위만으론 기록 개수가 부정확해짐 — 전체 구독 필요
  _plEnsureFullyLoaded();
  _plRenderCampaignRows();
}

// ══════════════════════════════════════════════════════════
// 매체 탭 — 매체 지식 (시스템 제약·매체 회신 라벨 자동 집계)
// 스펙 1단계 3-2절 "시스템 제약 · 매체 회신 라벨은 3단계 매체 지식 화면에
// 자동 집계된다"는 문장이 이 탭의 설계 근거.
// ══════════════════════════════════════════════════════════

function _plMediaLastLog(company) {
  return PL_LOGS.filter(l => l.media === company).reduce((max, l) => (!max || (l.logDate || '') > (max.logDate || '')) ? l : max, null);
}
function _plMediaFiltered() {
  const q = document.getElementById('pl-med-search')?.value || '';
  const recFilter = document.getElementById('pl-med-record')?.value || '';
  let list = MEDIA_DATA.filter(m => !q || _plTokenMatch(m.company, q));
  if (recFilter) {
    list = list.filter(m => {
      const lastLog = _plMediaLastLog(m.company);
      const cnt = PL_LOGS.filter(l => l.media === m.company).length;
      const days = lastLog ? (Date.now() - new Date(lastLog.logDate).getTime()) / 86400000 : Infinity;
      if (recFilter === 'recent7') return days <= 7;
      if (recFilter === 'over30') return days > 30;
      if (recFilter === 'none') return cnt === 0;
      return true;
    });
  }
  const sortSel = document.getElementById('pl-med-sort')?.value || 'recent';
  list = list.slice().sort((a, b) => {
    if (sortSel === 'name') return (a.company || '').localeCompare(b.company || '', 'ko');
    const la = _plMediaLastLog(a.company)?.logDate || '';
    const lb = _plMediaLastLog(b.company)?.logDate || '';
    return lb.localeCompare(la);
  });
  return list;
}
function _plMediaLabelCount(company, label) {
  let n = 0;
  PL_LOGS.filter(l => l.media === company).forEach(l => (l.detail || []).forEach(d => {
    if (d.label === label && (d.text || '').trim()) n++;
  }));
  return n;
}
// 시스템제약은 하위기록 라벨이 아니라 로그 유형 자체라 상위(logType) 기준으로 센다 — 매체회신은 여전히 하위기록 라벨 기준.
function _plMediaConstraintCount(company) {
  return PL_LOGS.filter(l => l.media === company && l.logType === '시스템제약').length;
}
function _plRenderMediaRow(m) {
  const camps = DATA.filter(c => c.media === m.company && c.status !== '삭제');
  const logs = PL_LOGS.filter(l => l.media === m.company);
  const constraintCnt = _plMediaConstraintCount(m.company);
  const replyCnt = _plMediaLabelCount(m.company, '매체 회신');
  const lastLog = _plMediaLastLog(m.company);
  const dotCls = _plAdvRecordDotClass(lastLog?.logDate);
  return `<tr style="cursor:pointer;" onclick="plOpenMediaDetail('${_escHtml(m.company)}')">
    <td><span class="pl-dot ${dotCls}"></span></td>
    <td class="td-bold"><span class="pl-click">${_escHtml(m.company)}</span></td>
    <td class="td-dim">${_escHtml(m.contact || '—')}</td>
    <td class="td-num td-r">${camps.length || '—'}</td>
    <td class="td-num td-r">${logs.length || '—'}</td>
    <td class="td-num td-r">${constraintCnt || '—'}</td>
    <td class="td-num td-r">${replyCnt || '—'}</td>
    <td class="${lastLog ? 'f-mono td-num' : 'td-dim'}">${lastLog ? _escHtml(lastLog.logDate.slice(2).replace(/-/g, '.')) : '없음'}</td>
  </tr>`;
}
function _plBuildMediaTabSkeleton(content) {
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:12px;">
      <input type="text" class="f-search" id="pl-med-search" placeholder="매체명" style="width:200px;" oninput="_plRenderMediaRows()">
      <select class="f-sel" id="pl-med-record" onchange="_plRenderMediaRows()">
        <option value="">기록 상태 전체</option><option value="recent7">최근 7일 내</option><option value="over30">30일 초과</option><option value="none">⚠ 기록 없음</option>
      </select>
      <select class="f-sel" id="pl-med-sort" style="margin-left:auto;" onchange="_plRenderMediaRows()"><option value="recent">정렬: 최근 기록순</option><option value="name">정렬: 이름순</option></select>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="card-title">매체</span><span class="table-count" id="pl-med-count"></span></div>
      <div class="table-wrap"><table style="width:100%;">
        <thead><tr>
          <th style="width:26px;"></th><th>매체명</th><th style="width:110px;">담당자</th>
          <th class="td-r" style="width:60px;">캠페인</th><th class="td-r" style="width:56px;">기록</th>
          <th class="td-r" style="width:76px;">시스템제약</th><th class="td-r" style="width:70px;">매체회신</th><th style="width:80px;">최근 기록</th>
        </tr></thead>
        <tbody id="pl-med-tbody"></tbody>
      </table></div>
    </div>
  `;
}
function _plRenderMediaRows() {
  const list = _plMediaFiltered();
  const countEl = document.getElementById('pl-med-count');
  if (countEl) countEl.innerHTML = `검색 <b>${list.length}</b>건 · 전체 <b>${MEDIA_DATA.length}</b>개`;
  const tbody = document.getElementById('pl-med-tbody');
  if (tbody) tbody.innerHTML = list.length ? list.map(_plRenderMediaRow).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">조건에 맞는 매체가 없습니다.</td></tr>`;
}

function plOpenMediaDetail(company) {
  PL_STATE.tab = 'media';
  PL_STATE.mediaDetailCompany = company;
  _plUpdateTabButtons();
  _plEnsureMediaLoaded(company); // 매체지식(시스템제약·매체회신)은 전체 이력을 봐야 해서 진입 시 별도 구독
  plRenderActiveTab();
  history.pushState({ screen: 'projectlog-detail', plTab: 'media' }, '', '#projectlog');
}
function plBackToMediaList() {
  PL_STATE.mediaDetailCompany = null;
  plRenderActiveTab();
}
function _plWriteFromMedia(company) {
  plOpenWrite({ scope: 'media', seller: null, content: null, campaignId: null, media: company, product: null });
}
// 시스템제약은 로그 유형 자체라 요약(summary)이 곧 내용 — _plMediaKnowledgeHtml(하위기록 라벨 기준)과는 별도 집계
function _plMediaConstraintHtml(company) {
  const items = PL_LOGS.filter(l => l.media === company && l.logType === '시스템제약')
    .slice().sort((a, b) => (b.logDate || '').localeCompare(a.logDate || ''));
  if (!items.length) return '<div class="form-hint" style="padding:4px 0;">없음</div>';
  return items.map(l => {
    const ctxParts = [l.seller, l.content, l.campaignId].filter(Boolean);
    const ctx = ctxParts.length ? `<span class="form-hint"> — ${_escHtml(ctxParts.join(' / '))}</span>` : '';
    return `<div style="font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--border);">
      <span class="f-mono form-hint">${_escHtml((l.logDate || '').slice(2).replace(/-/g, '.'))}</span> ${_escHtml(l.summary || '')}${ctx}
    </div>`;
  }).join('');
}
function _plMediaKnowledgeHtml(company, label) {
  const items = [];
  PL_LOGS.filter(l => l.media === company).forEach(l => {
    (l.detail || []).forEach(d => {
      if (d.label === label && (d.text || '').trim()) {
        items.push({ text: d.text, summary: l.summary, logDate: l.logDate, seller: l.seller, content: l.content, campaignId: l.campaignId });
      }
    });
  });
  items.sort((a, b) => (b.logDate || '').localeCompare(a.logDate || ''));
  if (!items.length) return '<div class="form-hint" style="padding:4px 0;">없음</div>';
  // 회신 내용만 있으면 무엇에 대한 답인지 알 수 없어서, 그 회신이 딸린 로그의 원래 내용(요약)을 같이 보여준다.
  return items.map(it => {
    const ctxParts = [it.seller, it.content, it.campaignId].filter(Boolean);
    const ctx = ctxParts.length ? `<span class="form-hint"> — ${_escHtml(ctxParts.join(' / '))}</span>` : '';
    const summaryLine = it.summary ? `<div style="color:var(--text2);">문의: ${_escHtml(it.summary)}</div>` : '';
    return `<div style="font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--border);">
      <span class="f-mono form-hint">${_escHtml((it.logDate || '').slice(2).replace(/-/g, '.'))}</span>
      ${summaryLine}
      <div style="display:flex;gap:4px;">
        <span style="flex-shrink:0;">회신:</span>
        <span style="white-space:pre-line;">${_escHtml(it.text)}${ctx}</span>
      </div>
    </div>`;
  }).join('');
}
let _plMCompany = null;
let _plMState = { seller: '', type: '', writer: '' };
function _plMediaDetailFiltered(company) {
  let logs = PL_LOGS.filter(l => l.media === company);
  if (_plMState.seller) logs = logs.filter(l => l.seller === _plMState.seller);
  if (_plMState.type) logs = logs.filter(l => l.logType === _plMState.type);
  if (_plMState.writer) logs = logs.filter(l => l.writer === _plMState.writer);
  return logs.slice().sort((a, b) => (b.logDate || '').localeCompare(a.logDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
}
function _plMDetailFilter(field, val) {
  if (field === 'seller') _plMState.seller = val;
  if (field === 'type') _plMState.type = val;
  if (field === 'writer') _plMState.writer = val;
  _plMRenderAllLogs();
}
function _plMRenderAllLogs() {
  const el = document.getElementById('pl-m-alllogs');
  if (!el) return;
  const company = _plMCompany;
  const allLogs = PL_LOGS.filter(l => l.media === company);
  const sellers = [...new Set(allLogs.map(l => l.seller).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const writers = [...new Set(allLogs.map(l => l.writer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const logs = _plMediaDetailFiltered(company);
  el.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <span class="card-title">전체 일지</span>
        <span class="table-count"><b>${logs.length}</b>건</span>
        <select class="f-sel" onchange="_plMDetailFilter('seller',this.value)">
          <option value="">광고주 전체</option>${sellers.map(s => `<option value="${_escHtml(s)}" ${_plMState.seller === s ? 'selected' : ''}>${_escHtml(s)}</option>`).join('')}
        </select>
        <select class="f-sel" onchange="_plMDetailFilter('type',this.value)">
          <option value="">유형 전체</option>${PL_LOG_TYPES.map(t => `<option value="${t}" ${_plMState.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <select class="f-sel" onchange="_plMDetailFilter('writer',this.value)">
          <option value="">작성자 전체</option>${writers.map(w => `<option value="${_escHtml(w)}" ${_plMState.writer === w ? 'selected' : ''}>${_escHtml(w)}</option>`).join('')}
        </select>
      </div>
      <div class="table-wrap"><table class="pl-lgt" style="width:100%;">
        <thead><tr>
          <th style="width:22px;"></th><th style="width:78px;">작성일</th><th style="width:110px;">광고주</th><th style="width:90px;">프로젝트</th>
          <th style="width:90px;">캠페인</th><th style="width:70px;">매체</th><th style="width:60px;">유형</th><th>내용</th><th style="width:56px;">진척</th><th style="width:60px;">작성자</th>
        </tr></thead>
        <tbody>${logs.length ? logs.map(l => _plRenderLogRow(l, '', 'mediadaily')).join('') : `<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text3);">기록이 없습니다.</td></tr>`}</tbody>
      </table></div>
    </div>`;
}
function _plRenderMediaDetail(content, company) {
  if (_plMCompany !== company) { _plMCompany = company; _plMState = { seller: '', type: '' }; }
  const m = MEDIA_DATA.find(x => x.company === company);
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="plBackToMediaList()">← 매체 목록</button>
      <span style="font-size:16px;font-weight:800;">${_escHtml(company)}</span>
      ${m?.contact ? `<span class="form-hint">담당 ${_escHtml(m.contact)}${m.tel ? ' · ' + _escHtml(m.tel) : ''}</span>` : ''}
      <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="_plWriteFromMedia('${_escHtml(company)}')">+ 일지 작성</button>
    </div>
    <div class="table-card" style="margin-bottom:14px;">
      <div class="table-header"><span class="card-title">⚠ 시스템 제약</span><span class="form-hint">일지 작성 시 이 매체를 지정하고, 유형을 <b>시스템제약</b>으로 선택하면 여기 모입니다.</span></div>
      <div class="card-body" style="padding:10px 18px;">
        ${_plMediaConstraintHtml(company)}
      </div>
    </div>
    <div class="table-card" style="margin-bottom:14px;">
      <div class="table-header"><span class="card-title">💬 매체 회신</span><span class="form-hint">일지 작성 시 이 매체를 지정하고, 유형을 <b>이슈</b> 또는 <b>대응</b>으로 선택 → 하위 기록 라벨에서 <b>"매체 회신"</b>을 고르면 여기 모입니다.</span></div>
      <div class="card-body" style="padding:10px 18px;">
        ${_plMediaKnowledgeHtml(company, '매체 회신')}
      </div>
    </div>
    <div id="pl-m-alllogs"></div>
  `;
  _plMRenderAllLogs();
}
function plRenderMediaTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (PL_STATE.mediaDetailCompany) {
    content.dataset.plTab = 'media-detail';
    _plRenderMediaDetail(content, PL_STATE.mediaDetailCompany);
    return;
  }
  if (content.dataset.plTab !== 'media') {
    _plBuildMediaTabSkeleton(content);
    content.dataset.plTab = 'media';
  }
  _plRenderMediaRows();
}

// ══════════════════════════════════════════════════════════
// 일자별 탭 — 하루치 로그를 작성자 → 대상(블록) 단위로 묶어
// 원래 일일업무보고 형식(목업 E)처럼 보여주는 뷰
// ══════════════════════════════════════════════════════════

let _plDateTabDate = _plTodayStr();

function _plDateBlockLabel(b) {
  if (b.scope === 'campaign') {
    const c = DATA.find(x => x.id === b.campaignId);
    const mediaProduct = c ? `${_escHtml(c.media || '')} ${_escHtml(c.product || '')}` : '';
    const campIdx = DATA.findIndex(d => d.id === b.campaignId);
    const campIdTag = campIdx >= 0
      ? `<span class="pl-click f-mono" style="font-weight:600;" onclick="event.stopPropagation();openCalPreview(${campIdx})">(${_escHtml(b.campaignId || '')})</span>`
      : `<span style="font-weight:600;">(${_escHtml(b.campaignId || '')})</span>`;
    return `${_escHtml(b.seller || '')} &gt; ${_escHtml(b.content || '브랜드 미지정')} &gt; ${mediaProduct}${mediaProduct ? ' ' : ''}${campIdTag}`;
  }
  if (b.scope === 'media') return `<span class="tag pl-scope-media">매체</span> ${_escHtml(b.media || '')}`;
  if (b.scope === 'internal') return `<span class="tag pl-inner">내부</span> ${_escHtml(b.seller || '')}${b.content ? ' &gt; ' + _escHtml(b.content) : ''}`;
  if (b.scope === 'project') return `${_escHtml(b.seller || '')} &gt; ${_escHtml(b.content || '')}`;
  return `${_escHtml(b.seller || '')} <span class="form-hint">(광고주 전반)</span>`;
}
// "일지" 탭 테이블 행과 동일한 상호작용으로 통일 — 클릭하면 펼쳐지고, 펼친 내용(_plDetailBoxHtml)에
// 링크·댓글·수정 버튼이 다 들어있다. 링크/댓글 아이콘은 "몇 개 있는지" 힌트만 주고(탭 테이블 행과 동일하게
// 클릭 불가), 이미지만 라이트박스로 바로 열리는 지름길을 유지한다(탭 테이블 행의 📁과 동일한 예외).
function _plDateItemHtml(l, hideMediaTag) {
  // 인라인 수정 중인 항목은 원본 요약 줄(더미)을 아예 그리지 않는다 — 수정 폼 자체에 이미 같은
  // 내용이 입력값으로 남아있어서, 위에 원본을 또 보여주면 같은 정보가 두 번 겹쳐 보이기만 함.
  if (_plInlineEditId === l.id) {
    return `<div style="padding:4px 0;">${_plDateInlineEditHtml()}</div>`;
  }
  const isOpen = _plExpanded.has(l.id);
  const arrow = isOpen ? '▾' : '▸';
  const starHtml = l.important ? '<span class="pl-star" style="vertical-align:middle;">★</span> ' : '';
  const progText = l.progress != null ? ` <span class="form-hint" style="vertical-align:middle;">(${l.progress}%)</span>` : '';
  // 매체는 항목(item) 단위로 선택되는 값이지만, 카드 안에서 이미 매체별 소그룹 헤더로 보여주고 있으면
  // (hideMediaTag) 항목마다 또 반복해서 보여줄 필요가 없어 생략한다. scope='media'는 카드 제목이 매체명 자체라 생략.
  // 직접 입력한 매체가 없으면 참조 캠페인들의 매체로 판단해서 채운다 — 일지 view 표(_plRefCampMediaCellHtml)와
  // 동일한 판단 로직(_plResolveRefMedia)을 공유.
  let mediaHtml = '';
  if (l.scope !== 'media' && !hideMediaTag) {
    if (l.media) {
      mediaHtml = `<span class="tag pl-media" style="margin-right:4px;vertical-align:middle;">${_escHtml(l.media)}</span>`;
    } else {
      const r = _plResolveRefMedia(l);
      if (r) mediaHtml = `<span class="tag pl-media" style="margin-right:4px;vertical-align:middle;" data-tooltip="${_escHtml(r.tooltip)}">${_escHtml(r.name)}</span>`;
    }
  }
  const subHtml = (l.detail || []).filter(d => (d.text || '').trim()).map(d =>
    // 본문이 여러 줄일 때 2번째 줄부터도 "ㄴ+라벨" 뒤(1번째 줄 시작 위치)에서 이어지도록 flex로 분리.
    `<div style="padding-left:20px;font-size:12px;color:var(--text2);display:flex;gap:4px;">
      <span style="flex-shrink:0;">ㄴ${d.label ? ` <b>${_escHtml(d.label)}</b>` : ''}</span>
      <span style="white-space:pre-line;">${_escHtml(d.text)}</span>
    </div>`
  ).join('') + _plQuickAddTailHtml(l.id, 'date');
  if (l.hasImages && l.imageCount == null) _plEnsureImageCountBadge(l.id);
  const attachIconsHtml = (l.hasImages ? `<span id="pl-imgcnt-${l.id}" style="cursor:zoom-in;font-size:11px;margin-left:4px;vertical-align:middle;" onclick="event.stopPropagation();_plOpenLogImages('${l.id}')" title="첨부 이미지 — 클릭하여 보기">📁${l.imageCount || ''}</span>` : '')
    + ((l.links && l.links.length) ? `<span style="font-size:11px;margin-left:4px;vertical-align:middle;" title="링크 ${l.links.length}개">🔗${l.links.length}</span>` : '')
    + `<span id="pl-cmt-badge-${l.id}" style="vertical-align:middle;">${_plCommentBadgeHtml(l.id)}</span>`;
  return `<div style="padding:4px 0;">
    <div style="display:flex;align-items:flex-start;gap:4px;cursor:pointer;" onclick="_plToggleRowGuarded(event,'${l.id}','date')">
      <span style="flex-shrink:0;font-size:10px;color:var(--text3);width:12px;">${arrow}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;">${starHtml}<span class="badge pl-lg-${l.logType}" style="margin-right:4px;vertical-align:middle;">${_escHtml(l.logType)}</span>${mediaHtml}${_escHtml(l.summary || '')}${_plContinueChainBadgeHtml(l)}${progText}${attachIconsHtml}</div>
        ${subHtml}
      </div>
    </div>
    ${isOpen ? `<div style="padding-left:16px;">${_plDetailBoxHtml(l, '', true)}</div>` : ''}
  </div>`;
}
let _plDateOrgFilter = '';
// 일지 탭과 동일한 다중 선택(칩) 작성자 필터 — localStorage에 남기지 않아 새로고침·메뉴 재진입 시
// 리셋된다(plInit에서도 매번 비움, 아래 참고).
let _plDateWriterFilters = [];

function _plDateFilteredLogs(dateStr) {
  let logs = PL_LOGS.filter(l => l.logDate === dateStr);
  // "일지" 탭 검색창(pl-search)과 완전히 같은 매칭 로직(_plTokenMatchNormalized) 재사용 — 동작이 갈리지 않게.
  const q = document.getElementById('pl-date-search')?.value || '';
  if (q.trim()) logs = logs.filter(l => _plTokenMatchNormalized(_plNormalizeSearch(l.searchText || ''), q));
  if (_plDateWriterFilters.length) logs = logs.filter(l => _plDateWriterFilters.includes(l.writer));
  const { bonbu, team } = _parseOrgFilter(_plDateOrgFilter);
  if (bonbu || team) {
    logs = logs.filter(l => {
      const u = USERS.find(u => u.name === l.writer);
      if (bonbu && (!u || u.bonbu !== bonbu)) return false;
      if (team  && (!u || u.dept  !== team))  return false;
      return true;
    });
  }
  return logs;
}
function _plDateRenderWriterChips() {
  const el = document.getElementById('pl-date-writer-chips');
  if (!el) return;
  el.innerHTML = _plDateWriterFilters.map(name =>
    `<span class="tag">${_escHtml(name)}<span class="pl-x" style="display:inline;margin-left:2px;" onclick="_plDateWriterRemove('${_escHtml(name)}')">✕</span></span>`
  ).join('');
}
function _plDateWriterSearchInput(inputEl) {
  const list = document.getElementById('pl-date-writer-list');
  if (!list) return;
  const already = new Set(_plDateWriterFilters);
  const q = (inputEl.value || '').trim().toLowerCase();
  const matched = _plWriterNames().filter(n => !already.has(n) && (!q || n.toLowerCase().includes(q)));
  _plComboNavIndex['pl-date-writer-list'] = -1;
  if (!matched.length) { list.style.display = 'none'; list.innerHTML = ''; return; }
  list.innerHTML = matched.map(n => `<div class="combo-item" onmousedown="_plDateWriterPick('${_escHtml(n)}')">${_escHtml(n)}</div>`).join('');
  list.style.display = 'block';
  _plFloatCombo(inputEl, list);
}
function _plDateWriterPick(name) {
  if (!_plDateWriterFilters.includes(name)) _plDateWriterFilters.push(name);
  const input = document.getElementById('pl-date-writer');
  if (input) input.value = '';
  const list = document.getElementById('pl-date-writer-list');
  if (list) list.style.display = 'none';
  _plDateRenderWriterChips();
  _plRenderDateBody();
}
function _plDateWriterRemove(name) {
  _plDateWriterFilters = _plDateWriterFilters.filter(n => n !== name);
  _plDateRenderWriterChips();
  _plRenderDateBody();
}
function _plDateResetFilter() {
  _plDateOrgFilter = '';
  _plDateWriterFilters = [];
  const orgEl = document.getElementById('pl-date-org');
  if (orgEl) orgEl.value = '';
  const searchEl = document.getElementById('pl-date-search');
  if (searchEl) searchEl.value = '';
  _plDateRenderWriterChips();
  _plRenderDateBody();
}
function _plDateOrgChange(v) {
  _plDateOrgFilter = v;
  _plRenderDateBody();
}
// 카드 = 대분류(광고주/프로젝트/캠페인/매체/내부) 하나. 매체는 카드를 쪼개는 기준이 아니라 카드 안의
// 소그룹 기준으로 내려서, 같은 프로젝트를 여러 매체로 동시에 진행 중이어도(혹은 같은 본부 여러 명이
// 같은 프로젝트를 나눠 맡아도) 카드 하나에 모인다. 작성자는 이 화면엔 아예 안 보이고 수정 모달에서만 확인.
function _plDateGroupedData(dateStr) {
  const logs = _plDateFilteredLogs(dateStr);
  // PL_LOGS 자체는 최신순(createdAt 내림차순)이라, 그 순서 그대로 묶으면 "가장 나중에 쓴 게 위로" 온다.
  // 일자별 뷰는 그날 하루를 시간순으로 읽는 일지라, 미리 오름차순으로 뒤집어야 카드·매체 소그룹 둘 다
  // "먼저 등장한 게 위, 늦게 쓴 게 아래"로 나온다(나머지 화면은 PL_LOGS의 원래 내림차순을 그대로 씀).
  const logsAsc = logs.slice().sort((x, y) => (x.createdAt || '').localeCompare(y.createdAt || ''));
  const byBlock = new Map();
  logsAsc.forEach(l => {
    // advertiser/project/campaign은 전부 "같은 프로젝트"라는 상위 정체성 하나로 합친다(campaignId는
    // 카드 키에서 뺌) — 프로젝트 전반 로그와 그 프로젝트의 여러 캠페인 로그가 예전엔 캠페인마다 카드가
    // 따로 떨어져서 같은 프로젝트명이 반복됐는데, 이제 카드 하나 안에서 캠페인별 소그룹으로만 나뉜다.
    // scope='media'는 seller/content가 항상 비어있어서(매체 자체가 대상) media를 키에 넣어야 서로 다른
    // 매체가 한 카드로 뭉치지 않는다.
    const family = (l.scope === 'advertiser' || l.scope === 'project' || l.scope === 'campaign') ? 'proj' : l.scope;
    const key = `${family}::${l.seller || ''}::${l.content || ''}::${family === 'media' ? (l.media || '') : ''}`;
    if (!byBlock.has(key)) byBlock.set(key, { family, seller: l.seller, content: l.content, media: l.media, byGroup: new Map() });
    const block = byBlock.get(key);
    // 소그룹 키 = 캠페인이 있으면 캠페인 단위로, 없으면 매체 단위로 나눈다 — "매체 미지정"·"신한카드"
    // 같은 프로젝트 전반 항목과 "국민카드 캠페인" 같은 특정 캠페인 항목이 섞여도 각자 구분되게.
    const groupKey = l.campaignId ? `camp:${l.campaignId}` : `media:${l.media || ''}`;
    if (!block.byGroup.has(groupKey)) block.byGroup.set(groupKey, { campaignId: l.campaignId || null, media: l.media || null, items: [] });
    block.byGroup.get(groupKey).items.push(l);
  });
  return [...byBlock.values()].map(block => ({
    family: block.family, seller: block.seller, content: block.content, media: block.media,
    // 소그룹이 하나뿐이고 캠페인도 매체도 없으면 소그룹 헤더를 보여줄 이유가 없다 — 카드 제목에 이미
    // 나와있거나(매체 스코프) 굳이 나눌 필요가 없는 경우라 렌더링 쪽에서 mediaGroups.length로 판단.
    mediaGroups: [...block.byGroup.values()],
  }));
}
// 소그룹 헤더용 매체 라벨 — 직접 입력한 매체(m.media)가 있으면 그대로. 없으면(참조 캠페인만 있는
// 로그들이 모인 그룹) 그 안의 모든 로그가 참조한 캠페인들의 매체를 전부 모아 판단한다 — "매체 미지정"은
// 정말 매체를 전혀 알 수 없을 때만 남긴다(_plResolveRefMedia와 같은 '·' 구분자 관례를 그대로 씀).
function _plDateGroupMediaLabel(m) {
  if (m.media) return m.media;
  const ids = new Set();
  m.items.forEach(l => (l.refCampaignIds || []).forEach(id => ids.add(id)));
  const medias = [...new Set([...ids].map(id => DATA.find(c => c.id === id)?.media).filter(Boolean))];
  return medias.length ? medias.join('·') : '매체 미지정';
}
// 카드(블록) 제목 — 캠페인은 이제 카드 단위가 아니라 소그룹 단위라(_plDateSubGroupLabelHtml) 여기선
// "광고주 > 프로젝트"까지만 보여준다. _plDateBlockLabel(나의 미완료 일지 패널에서 재사용 중)은 단일
// 로그의 캠페인까지 보여줘야 해서 별도로 남겨두고 여긴 건드리지 않는다.
function _plDateGroupBlockTitle(b) {
  if (b.family === 'media') return `<span class="tag pl-scope-media">매체</span> ${_escHtml(b.media || '')}`;
  if (b.family === 'internal') return `<span class="tag pl-inner">내부</span> ${_escHtml(b.seller || '')}${b.content ? ' &gt; ' + _escHtml(b.content) : ''}`;
  if (b.content) return `${_escHtml(b.seller || '')} &gt; ${_escHtml(b.content)}`;
  return `${_escHtml(b.seller || '')} <span class="form-hint">(광고주 전반)</span>`;
}
// 소그룹 헤더 — 캠페인이 있으면 매체 태그 옆에 "· 상품명 (캠페인ID, 클릭 시 캠페인 미리보기)"를 붙여서
// 캠페인 단위 소그룹임을 알려준다. 캠페인이 없으면(프로젝트/광고주 전반 항목) 매체 태그만.
function _plDateSubGroupLabelHtml(m) {
  if (m.campaignId) {
    const c = DATA.find(x => x.id === m.campaignId);
    const mediaLabel = c?.media || m.media || '매체 미지정';
    const campIdx = DATA.findIndex(x => x.id === m.campaignId);
    const campIdTag = campIdx >= 0
      ? `<span class="pl-click f-mono" style="font-weight:600;font-size:11px;" onclick="event.stopPropagation();openCalPreview(${campIdx})">(${_escHtml(m.campaignId)})</span>`
      : `<span style="font-weight:600;font-size:11px;">(${_escHtml(m.campaignId)})</span>`;
    const productHtml = c?.product ? ` <span class="form-hint">· ${_escHtml(c.product)}</span>` : '';
    return `<span class="tag pl-media">${_escHtml(mediaLabel)}</span>${productHtml} ${campIdTag}`;
  }
  return `<span class="tag pl-media">${_escHtml(_plDateGroupMediaLabel(m))}</span>`;
}
function _plDateNav(delta) {
  const d = new Date(_plDateTabDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  _plDateTabDate = _plFmtDateLocal(d);
  _plRenderDateBody();
}
function _plDateToday() {
  _plDateTabDate = _plTodayStr();
  _plRenderDateBody();
}
function _plDatePick(v) {
  if (!v) return;
  _plDateTabDate = v;
  _plRenderDateBody();
}
function _plBuildDateTabSkeleton(content) {
  content.innerHTML = `
    <div class="filter-bar" style="margin-bottom:14px;overflow:visible;">
      <button class="btn btn-ghost btn-sm" onclick="_plDateNav(-1)">← 전날</button>
      <input type="date" class="f-date f-mono" style="font-weight:700;" id="pl-date-picker" value="${_escHtml(_plDateTabDate)}" onchange="_plDatePick(this.value)" onmousedown="event.preventDefault();this.focus();try{this.showPicker&&this.showPicker()}catch(e){console.error('[projectlog] showPicker 실패',e);}">
      <button class="btn btn-ghost btn-sm" onclick="_plDateNav(1)">다음날 →</button>
      <button class="btn btn-outline btn-sm" onclick="_plDateToday()">오늘</button>
      <input type="text" class="f-search" id="pl-date-search" placeholder="검색어" style="width:160px;" oninput="_plRenderDateBody()">
      <select class="f-sel" id="pl-date-org" onchange="_plDateOrgChange(this.value)">
        <option value="">본부/팀 전체</option>${_buildOrgSelectHTML()}
      </select>
      <div class="combo-wrap" id="pl-date-writer-wrap" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
        <div id="pl-date-writer-chips" style="display:inline-flex;gap:3px;flex-wrap:wrap;"></div>
        <input type="text" class="f-search" id="pl-date-writer" placeholder="🔍 작성자 추가" style="width:110px;"
          oninput="_plDateWriterSearchInput(this)" onfocus="_plDateWriterSearchInput(this)"
          onkeydown="_plComboKeyNav(event,'pl-date-writer-list')"
          onblur="setTimeout(()=>{const l=document.getElementById('pl-date-writer-list');if(l)l.style.display='none';},150)">
        <div class="combo-list" id="pl-date-writer-list" style="display:none;"></div>
      </div>
      <span class="f-reset" onclick="_plDateResetFilter()">초기화</span>
      <span class="table-count" style="margin-left:auto;" id="pl-date-count"></span>
    </div>
    <div id="pl-date-body"></div>
  `;
  const orgEl = document.getElementById('pl-date-org');
  if (orgEl) orgEl.value = _plDateOrgFilter;
  _plDateRenderWriterChips();
}
function _plRenderDateBody() {
  const bodyEl = document.getElementById('pl-date-body');
  if (!bodyEl) return;
  const pickerEl = document.getElementById('pl-date-picker');
  if (pickerEl) pickerEl.value = _plDateTabDate;
  _plEnsureDateLoaded(_plDateTabDate); // 기본 구독 범위보다 예전 날짜면 그 하루치를 따로 불러옴

  const grouped = _plDateGroupedData(_plDateTabDate);
  const totalLogs = grouped.reduce((s, b) => s + b.mediaGroups.reduce((s2, m) => s2 + m.items.length, 0), 0);
  const countEl = document.getElementById('pl-date-count');
  if (countEl) countEl.innerHTML = `이 날짜 일지 <b>${totalLogs}</b>건`;

  // 블록마다 카드를 따로 만들면 카드 패딩·테두리가 누적되어 스크롤이 과도하게 길어진다.
  // 하루치 전체를 카드 하나에 담고, 블록(광고주/프로젝트 등)은 굵은 텍스트 헤더로만 구분한다.
  bodyEl.innerHTML = `<div class="table-card"><div class="card-body">` + (grouped.length ? grouped.map((b, bi) => {
    const blockCount = b.mediaGroups.reduce((s, m) => s + m.items.length, 0);
    // 매체 스코프 블록은 헤더에 이미 매체가 나와있어 소그룹 라벨을 또 보여줄 필요가 없다.
    // 그 외에는 매체가 하나뿐이어도(항목 옆 인라인 태그 대신) 블록 헤더와 같은 계위의
    // 소그룹 라벨로 통일해서 보여준다 — 매체가 여러 개일 때와 UI 계위를 맞추기 위함.
    return `
    <div style="${bi > 0 ? 'margin-top:24px;padding-top:22px;border-top:1px solid var(--border2);' : ''}">
      <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${_plDateGroupBlockTitle(b)} <span style="font-weight:400;font-size:12px;color:var(--text3);">${blockCount}건</span></div>
      ${b.mediaGroups.map((m, mi) => {
        const showSub = b.family !== 'media' && (m.media || m.campaignId || b.mediaGroups.length > 1);
        return `
        <div style="${b.mediaGroups.length > 1 && mi < b.mediaGroups.length - 1 ? 'margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed var(--border);' : ''}">
          ${showSub ? `<div style="margin-bottom:4px;">${_plDateSubGroupLabelHtml(m)}</div>` : ''}
          ${m.items.map(l => _plDateItemHtml(l, showSub)).join('')}
        </div>
      `;}).join('')}
    </div>`;
  }).join('') : `<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px;">조건에 맞는 일지가 없습니다.</div>`) + `</div></div>`;
}
function plRenderDateTab() {
  const content = document.getElementById('pl-tab-content');
  if (!content) return;
  if (content.dataset.plTab !== 'date') {
    _plBuildDateTabSkeleton(content);
    content.dataset.plTab = 'date';
  }
  _plRenderDateBody();
}

// ══════════════════════════════════════════════════════════
// 엑셀 업로드 — 기존 일간보고 이력을 한번에 옮겨 담기 위한 일괄 등록
// index.html 에 이미 로드된 SheetJS(XLSX 전역, xlsx.full.min.js)를 그대로 재사용.
// ══════════════════════════════════════════════════════════

const PL_XLSX_HEADERS = ['작성일', '작성자', '유형', '광고주', '프로젝트', '캠페인ID', '매체', '일지유형', '내용', '진척률', '라벨1', '내용1', '라벨2', '내용2', '라벨3', '내용3'];
const PL_XLSX_SCOPE_MAP = { '광고주': 'advertiser', '프로젝트': 'project', '캠페인': 'campaign', '매체': 'media', '내부': 'internal' };
let _plXlsxRows = [];

function _plXlsxDownloadTemplate() {
  const example = ['2026-08-01', '신지수', '프로젝트', '단비교육', '윙크', '', 'KT', '운영', '8월 소재 2종 전달, 방학 선물 문구 확정', '80', '', '', '', '', '', ''];
  const rows = [PL_XLSX_HEADERS, example];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '프로젝트일지');
  XLSX.writeFile(wb, '프로젝트일지_업로드양식.xlsx');
}

function _plXlsxDateStr(v) {
  if (v instanceof Date) return _plFmtDateLocal(v);
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function _plXlsxValidateRow(row, rowNum) {
  const errors = [];
  const logDate = _plXlsxDateStr(row['작성일']);
  if (!logDate) errors.push('작성일 형식 오류(YYYY-MM-DD)');

  const writerName = String(row['작성자'] || '').trim();
  const user = USERS.find(u => u.name === writerName);
  if (!writerName) errors.push('작성자 없음');
  else if (!user) errors.push(`작성자 "${writerName}" 를 찾을 수 없음`);

  const scopeLabel = String(row['유형'] || '').trim();
  const scope = PL_XLSX_SCOPE_MAP[scopeLabel];
  if (!scope) errors.push(`유형은 광고주/프로젝트/캠페인/매체/내부 중 하나여야 함(입력값: "${scopeLabel}")`);

  const seller = String(row['광고주'] || '').trim() || null;
  const content = String(row['프로젝트'] || '').trim() || null;
  const campaignId = String(row['캠페인ID'] || '').trim() || null;
  const mediaInput = String(row['매체'] || '').trim() || null;

  let camp = null;
  if (scope === 'campaign') {
    if (!campaignId) errors.push('캠페인 유형인데 캠페인ID가 없음');
    else {
      camp = DATA.find(c => c.id === campaignId);
      if (!camp) errors.push(`캠페인ID "${campaignId}" 를 찾을 수 없음`);
    }
  } else if (scope === 'advertiser' || scope === 'project' || scope === 'internal') {
    if (!seller) errors.push('광고주(또는 내부업무 클라이언트)가 없음');
  } else if (scope === 'media') {
    if (!mediaInput) errors.push('매체 유형인데 매체명이 없음');
  }
  if (scope === 'project' && !content) errors.push('프로젝트 유형인데 프로젝트(브랜드)명이 없음');

  const logType = String(row['일지유형'] || '').trim();
  if (!PL_LOG_TYPES.includes(logType)) errors.push(`일지유형은 ${PL_LOG_TYPES.join('/')} 중 하나여야 함`);

  const summary = String(row['내용'] || '').trim();
  if (!summary) errors.push('내용 없음');
  if (summary.length > 60) errors.push('내용은 60자 이하');

  let progress = null;
  const progRaw = row['진척률'];
  if (progRaw !== '' && progRaw != null) {
    const p = Number(progRaw);
    if (isNaN(p) || p < 0 || p > 100) errors.push('진척률은 0~100 사이여야 함');
    else progress = Math.round(p);
  }

  const detail = [];
  for (let i = 1; i <= 3; i++) {
    const label = String(row[`라벨${i}`] || '').trim();
    const text = String(row[`내용${i}`] || '').trim();
    if (text) detail.push({ label, text });
  }
  const doc = {
    logDate, writer: user?.name || writerName, writerId: user?.id || '',
    bonbu: user?.bonbu || '', dept: user?.dept || '',
    scope: scope || null,
    seller: scope === 'media' ? null : seller,
    content: (scope === 'project' || scope === 'internal') ? content : null,
    campaignId: scope === 'campaign' ? campaignId : null,
    media: scope === 'campaign' ? (camp?.media || mediaInput || null) : (scope === 'media' ? mediaInput : mediaInput),
    product: scope === 'campaign' ? (camp?.product || null) : null,
    logType, state: ['이슈', '요청'].includes(logType) ? '진행중' : null,
    summary: summary.slice(0, 60), detail, progress,
    important: false, shared: false, hasImages: false, imageCount: 0, links: [],
    threadId: null,
  };

  return { rowNum, valid: errors.length === 0, errors, doc };
}

function _plXlsxFileSelect(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      _plXlsxRows = json.map((row, i) => _plXlsxValidateRow(row, i + 2)); // 헤더가 1행이므로 데이터는 2행부터
    } catch (err) {
      console.error('[projectlog] 엑셀 읽기 실패', err);
      toast('엑셀 파일을 읽을 수 없습니다', 'err');
      _plXlsxRows = [];
    }
    _plXlsxRenderPreview();
  };
  reader.readAsArrayBuffer(file);
}

function _plXlsxRenderPreview() {
  const el = document.getElementById('pl-xlsx-preview');
  if (!el) return;
  const total = _plXlsxRows.length;
  const validCnt = _plXlsxRows.filter(r => r.valid).length;
  const errRows = _plXlsxRows.filter(r => !r.valid);
  const errHtml = errRows.length ? `
    <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;margin-top:8px;">
      <table style="width:100%;font-size:12px;">
        <thead><tr style="background:var(--surface2);"><th style="padding:5px 8px;text-align:left;">행</th><th style="padding:5px 8px;text-align:left;">오류</th></tr></thead>
        <tbody>${errRows.map(r => `<tr><td style="padding:4px 8px;color:var(--text3);">${r.rowNum}</td><td style="padding:4px 8px;color:var(--red);">${_escHtml(r.errors.join(', '))}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : '';
  el.innerHTML = total
    ? `<div class="form-hint">총 <b>${total}</b>행 · 정상 <b style="color:var(--green);">${validCnt}</b>건 · 오류 <b style="color:var(--red);">${errRows.length}</b>건${errRows.length ? ' (오류 행은 제외하고 가져옵니다)' : ''}</div>${errHtml}`
    : '';
  const importBtn = document.getElementById('pl-xlsx-import-btn');
  if (importBtn) importBtn.disabled = validCnt === 0;
}

async function plXlsxImport() {
  const validRows = _plXlsxRows.filter(r => r.valid);
  if (!validRows.length) return;
  const btn = document.getElementById('pl-xlsx-import-btn');
  if (btn) { btn.disabled = true; btn.textContent = '가져오는 중…'; }
  try {
    const nextId = _plNextLogIdSeq();
    const nowBase = Date.now(); // 여러 건을 한 번에 저장할 때 createdAt이 겹치면 정렬이 저장 순서로 뒤집혀버림 — 1ms씩 밀어서 방지
    let _seq = 0;
    let successCnt = 0;
    for (const r of validRows) {
      const now = new Date(nowBase + (_seq++)).toISOString();
      const doc = Object.assign({}, r.doc, { id: nextId(), createdAt: now, updatedAt: now });
      doc.searchText = _plBuildSearchText(doc);
      await _plDb('projectLogs').doc(doc.id).set(doc);
      await _plLogHistoryCreate(doc.id);
      successCnt++;
    }
    toast(`✓ 일지 ${successCnt}건을 가져왔습니다`, 'ok');
    closeModal('pl-modal-xlsx');
    _plXlsxRows = [];
    plSwitchTab('log');
  } catch (e) {
    console.error('[projectlog] 엑셀 가져오기 실패', e);
    toast('가져오기 중 오류가 발생했습니다', 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '가져오기'; }
  }
}

function _plBuildXlsxModalShell() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pl-modal-xlsx';
  overlay.innerHTML = `
    <div class="modal" style="width:560px;max-width:96vw;">
      <div class="modal-head">
        <span class="modal-title">📥 엑셀로 일지 가져오기</span>
        <button class="modal-close" onclick="closeModal('pl-modal-xlsx')">✕</button>
      </div>
      <div class="modal-body">
        <p class="form-hint" style="line-height:1.6;">
          정해진 양식의 엑셀 파일로 일지를 한번에 등록할 수 있습니다. 먼저 양식을 받아 작성한 뒤 업로드해주세요.<br>
          <b>필수 열</b>: 작성일, 작성자(이름), 유형(광고주/프로젝트/캠페인/매체/내부), 일지유형, 내용<br>
          <b>선택 열</b>: 광고주, 프로젝트, 캠페인ID, 매체, 진척률, 라벨1~3/내용1~3(하위기록)
        </p>
        <div style="display:flex;gap:8px;margin:12px 0;">
          <button class="btn btn-outline btn-sm" onclick="_plXlsxDownloadTemplate()">📄 양식 다운로드</button>
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('pl-xlsx-file').click()">📁 파일 선택</button>
          <input type="file" id="pl-xlsx-file" accept=".xlsx,.xls" style="display:none;" onchange="_plXlsxFileSelect(this)">
        </div>
        <div id="pl-xlsx-preview"></div>
      </div>
      <div class="modal-foot">
        <span class="form-hint">오류 행은 제외하고 나머지만 가져옵니다</span>
        <div style="margin-left:auto;">
          <button class="btn btn-primary btn-sm" id="pl-xlsx-import-btn" onclick="plXlsxImport()" disabled>가져오기</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
function plOpenXlsxImport() {
  _plXlsxRows = [];
  if (!document.getElementById('pl-modal-xlsx')) _plBuildXlsxModalShell();
  const fileInp = document.getElementById('pl-xlsx-file');
  if (fileInp) fileInp.value = '';
  const previewEl = document.getElementById('pl-xlsx-preview');
  if (previewEl) previewEl.innerHTML = '';
  const importBtn = document.getElementById('pl-xlsx-import-btn');
  if (importBtn) importBtn.disabled = true;
  openModal('pl-modal-xlsx');
}

// ══════════════════════════════════════════════════════════
// 새로고침 시 initRoute()(script.js)가 해시로 이 화면을 먼저 활성화시켜놓고
// plInit() 호출은 건너뛴 경우(이 스크립트가 아직 로드되기 전이었으므로) —
// 지금 로드가 끝났으니 바로 이어서 초기화한다.
// ══════════════════════════════════════════════════════════
if (document.getElementById('screen-projectlog')?.classList.contains('active')) {
  plInit();
}
// PL_GOALS(광고주/브랜드 목표)는 원래 프로젝트일지 화면에 들어가야만 구독이 시작됐는데,
// KPI/매출현황 메뉴의 "KPI 달성률(평균)" 행이 여기서 수기로 입력한 광고주 KPI 달성률을
// 평균내 써야 해서, 프로젝트일지를 한 번도 안 열어도 항상 로드되도록 여기서 바로 시작한다.
_plWatchGoals();
