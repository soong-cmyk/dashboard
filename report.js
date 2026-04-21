// ══════════════════════════════════════════
// 광고주 리포트 (report.js)
// DATA, SELLER_DATA, _cName, _escHtml, _linkify, _dateKey, toast, goScreen
// 등 script.js 전역 변수/함수를 그대로 참조합니다.
// ══════════════════════════════════════════

// ── 초기화 ────────────────────────────────
function initAdReport() {
  _rptPopulateSeller();

  const brandSel = document.getElementById('rpt-brand');
  if (brandSel) { brandSel.innerHTML = '<option value="">전체</option>'; brandSel.disabled = true; }

  const campSel = document.getElementById('rpt-campaign');
  if (campSel) { campSel.innerHTML = '<option value="">전체</option>'; campSel.disabled = true; }

  // 기간 기본값: 이번 달
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const _rptFrom = document.getElementById('rpt-from');
  const _rptTo   = document.getElementById('rpt-to');
  if (_rptFrom) _rptFrom.value = _dateKey(new Date(y, m, 1));
  if (_rptTo)   _rptTo.value   = _dateKey(new Date(y, m + 1, 0));

  // 체크박스 초기화
  const chk = document.getElementById('rpt-show-cost');
  if (chk) chk.checked = true;
  const chkBench = document.getElementById('rpt-show-benchmark');
  if (chkBench) chkBench.checked = true;
  const benchSection = document.getElementById('rpt-benchmark-section');
  if (benchSection) benchSection.style.display = 'none';

  const _rptBody  = document.getElementById('rpt-body');
  const _rptEmpty = document.getElementById('rpt-empty');
  if (_rptBody)  _rptBody.style.display  = 'none';
  if (_rptEmpty) _rptEmpty.style.display = '';
}

// ── 광고주 콤보 populate ──────────────────
function _rptPopulateSeller() {
  const sel = document.getElementById('rpt-seller');
  if (!sel) return;
  const current = sel.value;
  const list = [...(SELLER_DATA || [])].sort((a, b) => (a.company || '').localeCompare(b.company || ''));
  sel.innerHTML = '<option value="">-- 선택 --</option>' +
    list.map(s => `<option value="${_escHtml(s.company)}">${_escHtml(s.company)}</option>`).join('');
  if (current) sel.value = current;
}

// ── 광고주 변경 시 브랜드·캠페인 연동 ───────
function rptOnSellerChange() {
  const sellerName = document.getElementById('rpt-seller').value;
  const brandSel   = document.getElementById('rpt-brand');
  const campSel    = document.getElementById('rpt-campaign');

  if (sellerName) {
    const seller = SELLER_DATA.find(s => s.company === sellerName);
    const brands = seller ? (seller.brands || []).map(b => b.name || b) : [];
    brandSel.innerHTML = '<option value="">전체</option>' +
      brands.map(b => `<option value="${_escHtml(b)}">${_escHtml(b)}</option>`).join('');
    brandSel.disabled = brands.length === 0;
    _rptUpdateCampaignCombo(sellerName, '');
    campSel.disabled = false;
  } else {
    brandSel.innerHTML = '<option value="">전체</option>';
    brandSel.disabled  = true;
    campSel.innerHTML  = '<option value="">전체</option>';
    campSel.disabled   = true;
  }
}

// ── 브랜드 변경 시 캠페인 연동 ───────────────
function rptOnBrandChange() {
  const sellerName = document.getElementById('rpt-seller').value;
  const brand      = document.getElementById('rpt-brand').value;
  _rptUpdateCampaignCombo(sellerName, brand);
}

// ── 날짜 변경 시 캠페인 콤보 갱신 ────────────
function rptOnDateChange() {
  const sellerName = document.getElementById('rpt-seller').value;
  if (!sellerName) return;
  const brand = document.getElementById('rpt-brand').value;
  _rptUpdateCampaignCombo(sellerName, brand);
}

// ── 캠페인 콤보 갱신 ─────────────────────────
function _rptUpdateCampaignCombo(sellerName, brand) {
  const campSel = document.getElementById('rpt-campaign');
  if (!campSel) return;
  const from = document.getElementById('rpt-from').value;
  const to   = document.getElementById('rpt-to').value;

  let camps = DATA.filter(c => (c.seller || c.adv) === sellerName);
  if (brand) camps = camps.filter(c => c.content === brand);
  // 기간 필터 (입력된 경우)
  if (from || to) {
    camps = camps.filter(c => {
      const d = (c.date || '').slice(0, 10);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return true;
    });
  }
  camps.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  campSel.innerHTML = '<option value="">전체</option>' +
    camps.map(c => `<option value="${c.id}">[${(c.date || '').slice(0, 10)}] ${_escHtml(_cName(c))}</option>`).join('');
  campSel.disabled = camps.length === 0;
}

// ── 리포트 생성 ────────────────────────────
function generateReport() {
  const sellerName  = document.getElementById('rpt-seller').value;
  if (!sellerName) { toast('⚠ 광고주/대행사를 선택해주세요', 'warn'); return; }

  const brand      = document.getElementById('rpt-brand').value;
  const from       = document.getElementById('rpt-from').value;
  const to         = document.getElementById('rpt-to').value;
  const campaignId = document.getElementById('rpt-campaign').value;

  const campaigns = _rptFilterCampaigns(sellerName, brand, from, to, campaignId);

  if (campaigns.length === 0) {
    toast('⚠ 조건에 맞는 캠페인이 없습니다', 'warn');
    return;
  }

  const kpi = _rptCalcKPI(campaigns);

  // 비교 기간 계산 (단건 선택 시 제외)
  let momData = null;
  if (!campaignId && from && to) {
    let prevFrom, prevTo, compLabel;

    if (from.slice(0, 7) === to.slice(0, 7)) {
      // 단일 월 → 직전 달 (정확한 달력 기준)
      const [y, mm] = from.slice(0, 7).split('-').map(Number);
      prevFrom   = _dateKey(new Date(y, mm - 2, 1));
      prevTo     = _dateKey(new Date(y, mm - 1, 0));
      const prevMm = mm === 1 ? 12 : mm - 1;
      compLabel  = `전월(${prevMm}월) 대비`;
    } else {
      // 복수 기간 → 직전 동일 일수
      const fromDate = new Date(from);
      const toDate   = new Date(to);
      const days     = Math.round((toDate - fromDate) / 86400000) + 1;
      const prevToDate   = new Date(fromDate);
      prevToDate.setDate(prevToDate.getDate() - 1);
      const prevFromDate = new Date(prevToDate);
      prevFromDate.setDate(prevFromDate.getDate() - days + 1);
      prevFrom  = _dateKey(prevFromDate);
      prevTo    = _dateKey(prevToDate);
      compLabel = `직전 ${days}일(${prevFrom} ~ ${prevTo}) 대비`;
    }

    const prevCamps = _rptFilterCampaigns(sellerName, brand, prevFrom, prevTo, '');
    momData = {
      prev:  prevCamps.length > 0 ? _rptCalcKPI(prevCamps) : null,
      label: compLabel,
    };
  }

  _rptRenderHeader(sellerName, brand, from, to, campaignId, campaigns);
  _rptRenderKPI(kpi);
  _rptRenderMoM(kpi, momData);
  _rptRenderBenchmark(campaigns, from, to, campaignId);
  _rptRenderInsight(campaigns, kpi, momData, from, to, campaignId);
  _rptRenderTable(campaigns);
  _rptRenderCreatives(campaigns);

  document.getElementById('rpt-body').style.display  = '';
  document.getElementById('rpt-empty').style.display = 'none';

  rptToggleCost();
}

// ── 데이터 필터링 ───────────────────────────
function _rptFilterCampaigns(sellerName, brand, from, to, campaignId) {
  return DATA.filter(c => {
    if ((c.seller || c.adv) !== sellerName) return false;
    if (brand && c.content !== brand) return false;
    if (campaignId) return c.id === campaignId;
    const d = (c.date || '').slice(0, 10);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

// ── KPI 집계 ───────────────────────────────
function _rptCalcKPI(campaigns) {
  const count   = campaigns.length;
  const qty     = campaigns.reduce((s, c) => s + (c.qty    || 0), 0);
  const actual  = campaigns.reduce((s, c) => s + (c.actual || 0), 0);
  const clicks  = campaigns.reduce((s, c) => s + (c.clicks != null ? c.clicks : 0), 0);
  const hasClicks = campaigns.some(c => c.clicks != null);
  const db      = campaigns.reduce((s, c) => s + (c.db     || 0), 0);

  // 가중평균 CTR
  const base = actual || qty;
  const ctr  = (hasClicks && base > 0) ? (clicks / base * 100) : null;

  // 총 광고비 (sellUnit × qty - disc)
  const adCost = campaigns.reduce((s, c) => {
    return s + ((c.sellUnit || 0) * (c.qty || 0)) - (c.disc || 0);
  }, 0);

  // 파생 지표
  const cpm = (base > 0 && adCost > 0) ? (adCost / base * 1000) : null;
  const cpc = (hasClicks && clicks > 0 && adCost > 0) ? (adCost / clicks) : null;
  const cpa = (db > 0 && adCost > 0) ? (adCost / db) : null;

  const opsSet   = [...new Set(campaigns.map(c => c.ops).filter(Boolean))];

  return { count, qty, actual, clicks, hasClicks, ctr, db, adCost, cpm, cpc, cpa, opsSet };
}

// ── A. 헤더 렌더링 ──────────────────────────
function _rptRenderHeader(sellerName, brand, from, to, campaignId, campaigns) {
  let titlePeriod = '';
  if (campaignId) {
    const c = campaigns[0];
    titlePeriod = (c.date || '').slice(0, 10);
  } else if (from && to) {
    if (from.slice(0, 7) === to.slice(0, 7)) {
      const [y, m] = from.slice(0, 7).split('-');
      titlePeriod = `${y}년 ${parseInt(m)}월`;
    } else {
      titlePeriod = `${from} ~ ${to}`;
    }
  }

  const now = new Date();
  const genDate = _dateKey(now);
  const kpi = _rptCalcKPI(campaigns);
  const brandStr = brand ? ` · ${brand}` : '';

  document.getElementById('rpt-h-title').textContent   = `${sellerName}${brandStr}`;
  document.getElementById('rpt-h-period').textContent  = titlePeriod ? `${titlePeriod} 캠페인 성과 리포트` : '캠페인 성과 리포트';
  document.getElementById('rpt-h-gendate').textContent = `생성일: ${genDate}`;
  document.getElementById('rpt-h-ops').textContent     = kpi.opsSet.join(', ')   || '—';
}

// ── B. KPI 카드 렌더링 ──────────────────────
function _rptRenderKPI(kpi) {
  const fmt  = n => n != null ? n.toLocaleString() : '—';
  const fmtW = n => n != null ? Math.round(n / 10000).toLocaleString() + '만원' : '—';

  document.getElementById('rpt-kpi-count').textContent  = kpi.count + '건';
  document.getElementById('rpt-kpi-qty').textContent    = kpi.qty    ? fmt(kpi.qty) + '건'    : '—';
  document.getElementById('rpt-kpi-actual').textContent = kpi.actual  ? fmt(kpi.actual) + '건' : '—';
  document.getElementById('rpt-kpi-clicks').textContent = kpi.hasClicks ? fmt(kpi.clicks) + '건' : '—';
  document.getElementById('rpt-kpi-ctr').textContent    = kpi.ctr != null ? kpi.ctr.toFixed(2) + '%' : '—';
  document.getElementById('rpt-kpi-db').textContent     = kpi.db     ? fmt(kpi.db) + '건'     : '—';
  document.getElementById('rpt-kpi-adcost').textContent = kpi.adCost > 0 ? fmtW(kpi.adCost)    : '—';
  document.getElementById('rpt-kpi-cpm').textContent    = kpi.cpm != null ? Math.round(kpi.cpm).toLocaleString() + '원' : '—';
}

// ── C. 비교 기간 렌더링 ─────────────────────
function _rptRenderMoM(cur, momData) {
  const section = document.getElementById('rpt-mom-section');
  if (!section) return;
  if (!momData) { section.style.display = 'none'; return; }
  section.style.display = '';

  const { prev, label } = momData;
  document.getElementById('rpt-mom-label').textContent = label;

  function pct(c, p) {
    if (prev == null || p == null || p === 0) return null;
    return (c - p) / p * 100;
  }
  function badge(val) {
    if (val == null) return '<span style="color:var(--text3)">—</span>';
    const pos = val > 0;
    const col = pos ? 'var(--green)' : 'var(--red)';
    return `<span style="color:${col};font-weight:700;">${pos ? '▲' : '▼'} ${Math.abs(val).toFixed(1)}%</span>`;
  }

  document.getElementById('rpt-mom-actual').innerHTML  = badge(pct(cur.actual,  prev?.actual));
  document.getElementById('rpt-mom-clicks').innerHTML  = badge(pct(cur.clicks,  prev?.clicks));
  document.getElementById('rpt-mom-ctr').innerHTML     = badge(pct(cur.ctr,     prev?.ctr));
  document.getElementById('rpt-mom-adcost').innerHTML  = badge(pct(cur.adCost,  prev?.adCost));
  document.getElementById('rpt-mom-db').innerHTML      = badge(pct(cur.db,      prev?.db));
}

// ── G. 인사이트 & 다음 캠페인 제안 ──────────
function _rptRenderInsight(campaigns, kpi, momData, from, to, campaignId) {
  const section = document.getElementById('rpt-insight-section');
  if (!section) return;

  // ── 카테고리 CTR 분포 계산 ──
  const cats = [...new Set(campaigns.map(c => _getCat(c)).filter(Boolean))];
  let ctrPercentile = null, avgCtr = null;

  if (cats.length >= 1) {
    const cat = cats[0];
    const catAll = DATA.filter(c => {
      const d = (c.date || '').slice(0, 10);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return _getCat(c) === cat;
    });
    const ctrDist = catAll
      .filter(c => c.clicks != null && (c.actual || c.qty) > 0)
      .map(c => c.clicks / (c.actual || c.qty) * 100);
    if (ctrDist.length > 1 && kpi.ctr != null) {
      avgCtr = ctrDist.reduce((s, v) => s + v, 0) / ctrDist.length;
      const below = ctrDist.filter(v => v < kpi.ctr).length;
      ctrPercentile = 100 - Math.round((below / ctrDist.length) * 100);
    }
  }

  // ── 매체별 CTR 집계 ──
  const mediaMap = {};
  campaigns.filter(c => c.clicks != null && (c.actual || c.qty) > 0 && c.media).forEach(c => {
    if (!mediaMap[c.media]) mediaMap[c.media] = [];
    mediaMap[c.media].push(c.clicks / (c.actual || c.qty) * 100);
  });
  const mediaSorted = Object.entries(mediaMap)
    .map(([m, vals]) => ({ media: m, ctr: vals.reduce((s, v) => s + v, 0) / vals.length }))
    .sort((a, b) => b.ctr - a.ctr);

  // ── 전월 추이 ──
  let trendText = '';
  if (momData && momData.prev) {
    const ctrUp = kpi.ctr != null && momData.prev.ctr != null && kpi.ctr > momData.prev.ctr;
    const actUp = kpi.actual > (momData.prev.actual || 0);
    if      ( ctrUp &&  actUp) trendText = '효율과 발송량 모두 전월 대비 증가하고 있습니다.';
    else if ( ctrUp && !actUp) trendText = '효율은 개선 중이나 발송량이 감소했습니다.';
    else if (!ctrUp &&  actUp) trendText = '발송 규모는 확대됐으나 효율이 다소 하락했습니다.';
    else if (kpi.ctr != null && momData.prev.ctr != null)
                               trendText = '효율과 발송량 모두 전월 대비 감소했습니다.';
  }

  // ── 종합 평가 등급 ──
  let grade = '', gradeColor = '';
  if (ctrPercentile != null) {
    if      (ctrPercentile <= 25) { grade = '우수';      gradeColor = 'var(--green)'; }
    else if (ctrPercentile <= 55) { grade = '보통';      gradeColor = 'var(--yellow)'; }
    else                          { grade = '개선 필요';  gradeColor = 'var(--red)'; }
  }

  // ── 제안 목록 ──
  const recs = [];

  // CTR 기반
  if (kpi.ctr != null) {
    if (ctrPercentile != null) {
      if (ctrPercentile <= 25) {
        recs.push({ icon: '✅', text: `CTR이 카테고리 상위 ${ctrPercentile}%로 우수합니다. 현재 소재·타겟 전략을 유지하세요.` });
        recs.push({ icon: '📈', text: '효율이 검증된 만큼 다음 캠페인 발송량 10~20% 확대를 검토해볼 수 있습니다.' });
      } else if (ctrPercentile <= 55) {
        recs.push({ icon: '💡', text: '카테고리 평균 수준입니다. 발송 문구나 타겟 조건 일부 조정으로 효율 개선이 가능합니다.' });
      } else {
        recs.push({ icon: '⚠️', text: 'CTR이 카테고리 하위권입니다. 발송 소재와 타겟 전략 재검토를 권장합니다.' });
      }
    } else {
      recs.push({ icon: '💡', text: `이번 기간 CTR은 ${kpi.ctr.toFixed(2)}%입니다. 누적 데이터가 쌓이면 카테고리 대비 정밀 분석이 가능합니다.` });
    }
  } else {
    recs.push({ icon: '📋', text: '클릭수·실발송 데이터 입력 후 상세 인사이트 분석이 가능합니다.' });
  }

  // DB 전환
  if (kpi.clicks > 0 && kpi.db > 0) {
    const dbPerClick = kpi.db / kpi.clicks;
    if (dbPerClick < 0.01) {
      recs.push({ icon: '🔗', text: '클릭 대비 DB 등록 전환율이 낮습니다. 랜딩페이지 또는 CTA 문구 개선을 검토하세요.' });
    } else {
      recs.push({ icon: '🎯', text: `클릭 → DB 전환율 ${(dbPerClick * 100).toFixed(1)}%로 양호합니다.` });
    }
  }

  // 최고 매체
  if (mediaSorted.length > 1) {
    const best = mediaSorted[0];
    recs.push({ icon: '📡', text: `${best.media} 매체 CTR(${best.ctr.toFixed(2)}%)이 가장 높습니다. 다음 캠페인 해당 매체 비중 확대를 검토하세요.` });
  }

  // 추이
  if (trendText) {
    recs.push({ icon: '🔄', text: trendText });
  }

  // ── 렌더링 ──
  const gradeBadge = grade
    ? `<span class="rpt-insight-badge" style="background:${gradeColor}20;color:${gradeColor};border:1px solid ${gradeColor}50;">${grade}</span>`
    : '';
  const ctrLine = kpi.ctr != null
    ? `CTR <strong>${kpi.ctr.toFixed(2)}%</strong>${avgCtr != null ? ` · 카테고리 평균 ${avgCtr.toFixed(2)}%` : ''} ${gradeBadge}`
    : '';

  section.innerHTML = `
    <div class="rpt-insight-card">
      <div class="rpt-insight-header">
        <span class="rpt-insight-title">💬 인사이트 & 다음 캠페인 제안</span>
        ${ctrLine ? `<div class="rpt-insight-summary">${ctrLine}</div>` : ''}
      </div>
      <div class="rpt-insight-recs">
        ${recs.map(r => `
          <div class="rpt-insight-rec">
            <span class="rpt-insight-rec-icon">${r.icon}</span>
            <span class="rpt-insight-rec-text">${r.text}</span>
          </div>`).join('')}
      </div>
    </div>`;
  section.style.display = '';
}

// ── F. 카테고리 벤치마크 렌더링 ─────────────
function _rptRenderBenchmark(campaigns, from, to, campaignId) {
  const section = document.getElementById('rpt-benchmark-section');
  const list    = document.getElementById('rpt-benchmark-list');
  if (!section || !list) return;

  // 단건 캠페인이면 숨김
  if (campaignId) { section.style.display = 'none'; return; }

  // 현재 리포트 캠페인의 카테고리 목록
  const cats = [...new Set(campaigns.map(c => _getCat(c)).filter(Boolean))];
  if (cats.length === 0) { section.style.display = 'none'; return; }

  const html = cats.map(cat => {
    // 동일 기간 + 동일 카테고리 전체 캠페인
    const catAll = DATA.filter(c => {
      const d = (c.date || '').slice(0, 10);
      if (from && d < from) return false;
      if (to   && d > to)   return false;
      return _getCat(c) === cat;
    });
    if (catAll.length < 2) return '';

    // 내 캠페인 (해당 카테고리)
    const myCamps = campaigns.filter(c => _getCat(c) === cat);

    // CTR 분포 (clicks 있는 캠페인만)
    const ctrDist = catAll
      .filter(c => c.clicks != null && (c.actual || c.qty) > 0)
      .map(c => c.clicks / (c.actual || c.qty) * 100);
    const avgCtr = ctrDist.length > 0 ? ctrDist.reduce((s, v) => s + v, 0) / ctrDist.length : null;

    // DB등록률 분포
    const dbrDist = catAll
      .filter(c => c.db != null && c.db > 0 && (c.actual || c.qty) > 0)
      .map(c => c.db / (c.actual || c.qty) * 100);
    const avgDbr = dbrDist.length > 0 ? dbrDist.reduce((s, v) => s + v, 0) / dbrDist.length : null;

    // 내 성과 집계
    const myKpi   = _rptCalcKPI(myCamps);
    const myActual = myCamps.reduce((s, c) => s + (c.actual || c.qty || 0), 0);
    const myDb     = myCamps.reduce((s, c) => s + (c.db || 0), 0);
    const myDbr    = myActual > 0 && myDb > 0 ? myDb / myActual * 100 : null;

    // 퍼센타일 계산 (내 값보다 낮은 캠페인 비율 → 상위 몇%)
    function percentile(dist, myVal) {
      if (myVal == null || dist.length === 0) return null;
      const below = dist.filter(v => v < myVal).length;
      return 100 - Math.round((below / dist.length) * 100);
    }

    const ctrPct = percentile(ctrDist, myKpi.ctr);
    const dbrPct = percentile(dbrDist, myDbr);

    // 바 차트 렌더 (0~max 범위)
    function bar(myVal, avgVal, unit, digits) {
      if (myVal == null && avgVal == null) return '<span style="color:var(--text3);font-size:12px;">데이터 없음</span>';
      const max     = Math.max(myVal || 0, avgVal || 0) * 1.3 || 1;
      const myPct   = myVal  != null ? Math.round((myVal  / max) * 100) : 0;
      const avgPct  = avgVal != null ? Math.round((avgVal / max) * 100) : 0;
      const fmt     = v => v != null ? v.toFixed(digits) + unit : '—';
      const diff    = (myVal != null && avgVal != null) ? ((myVal - avgVal) / avgVal * 100) : null;
      const diffStr = diff != null
        ? `<span style="color:${diff >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700;font-size:12px;">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}%</span>`
        : '';
      return `
        <div class="rpt-bench-bar-wrap">
          <div class="rpt-bench-bar-row">
            <span class="rpt-bench-bar-lbl">내 성과</span>
            <div class="rpt-bench-bar-track">
              <div class="rpt-bench-bar-fill my" style="width:${myPct}%"></div>
            </div>
            <span class="rpt-bench-bar-val">${fmt(myVal)}</span>
            ${diffStr}
          </div>
          <div class="rpt-bench-bar-row">
            <span class="rpt-bench-bar-lbl">카테고리 평균</span>
            <div class="rpt-bench-bar-track">
              <div class="rpt-bench-bar-fill avg" style="width:${avgPct}%"></div>
            </div>
            <span class="rpt-bench-bar-val">${fmt(avgVal)}</span>
          </div>
        </div>`;
    }

    function pctBadge(pct) {
      if (pct == null) return '';
      const color = pct <= 30 ? 'var(--green)' : pct <= 50 ? 'var(--yellow)' : 'var(--text2)';
      return `<span style="font-size:11px;font-weight:700;color:${color};">상위 ${pct}%</span>`;
    }

    return `
      <div class="rpt-bench-card">
        <div class="rpt-bench-header">
          <span class="rpt-bench-cat">${_escHtml(cat)}</span>
          <span class="rpt-bench-meta">비교 대상 ${catAll.length}개 캠페인</span>
        </div>
        <div class="rpt-bench-grid">
          <div class="rpt-bench-item">
            <div class="rpt-bench-item-head">
              <span class="rpt-bench-item-label">클릭률 (CTR)</span>
              ${pctBadge(ctrPct)}
            </div>
            ${bar(myKpi.ctr, avgCtr, '%', 2)}
          </div>
          <div class="rpt-bench-item">
            <div class="rpt-bench-item-head">
              <span class="rpt-bench-item-label">DB 등록률</span>
              ${pctBadge(dbrPct)}
            </div>
            ${bar(myDbr, avgDbr, '%', 3)}
          </div>
        </div>
      </div>`;
  }).join('');

  if (!html.trim()) { section.style.display = 'none'; return; }

  list.innerHTML = html;
  // 체크박스 상태에 따라 display 적용
  rptToggleBenchmark();
}

// ── 벤치마크 공개 토글 ──────────────────────
function rptToggleBenchmark() {
  const show    = document.getElementById('rpt-show-benchmark')?.checked;
  const section = document.getElementById('rpt-benchmark-section');
  if (!section) return;
  // 체크 = 화면 표시 + PDF 포함 / 언체크 = 화면 숨김 + PDF 제외
  section.style.display = show ? '' : 'none';
}

// ── D. 캠페인 상세 테이블 렌더링 ────────────
function _rptRenderTable(campaigns) {
  const tbody = document.getElementById('rpt-table-body');
  if (!tbody) return;

  const sorted = [...campaigns].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  tbody.innerHTML = sorted.map(c => {
    const adCost = ((c.sellUnit || 0) * (c.qty || 0)) - (c.disc || 0);
    return `
      <tr onclick="openDetailFromReport('${c.id}')">
        <td class="td-dim">${(c.date || '').slice(0, 10)}</td>
        <td>${_escHtml(c.media || '—')}</td>
        <td>${_escHtml(c.product || '—')}</td>
        <td class="td-num td-r">${c.qty    ? c.qty.toLocaleString()    : '—'}</td>
        <td class="td-num td-r">${c.actual ? c.actual.toLocaleString() : '—'}</td>
        <td class="td-num td-r rpt-cost-col">${adCost > 0 ? Math.round(adCost / 10000).toLocaleString() + '만' : '—'}</td>
        <td class="td-num td-r">${c.clicks != null ? c.clicks.toLocaleString() : '—'}</td>
        <td class="td-num td-r">${c.ctr    != null ? c.ctr.toFixed(2) + '%'    : '—'}</td>
        <td class="td-num td-r">${c.db     != null ? c.db.toLocaleString()      : '—'}</td>
      </tr>`;
  }).join('');
}

// ── E. 소재 & 타겟 아코디언 렌더링 ──────────
function _rptRenderCreatives(campaigns) {
  const container = document.getElementById('rpt-creative-list');
  if (!container) return;

  const sorted = [...campaigns].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  container.innerHTML = sorted.map(c => {
    const tags = (c.target || '').split(/[\n,]/).map(t => t.trim()).filter(Boolean);
    const tagHtml = tags.length
      ? tags.map(t => `<span class="rpt-tag">${_escHtml(t)}</span>`).join('')
      : '<span style="color:var(--text3);font-size:12px;">—</span>';
    const hasMsg = c.msg && c.msg.trim();
    const noteHtml = c.note
      ? `<div class="rpt-creative-field">
           <span class="rpt-creative-label">특기사항</span>
           <div class="rpt-creative-msg">${_escHtml(c.note).replace(/\n/g, '<br>')}</div>
         </div>`
      : '';
    return `
      <div class="rpt-creative-item">
        <div class="rpt-creative-head">
          <div class="rpt-creative-head-top">
            <span class="rpt-creative-date">${(c.date || '').slice(0, 10)}</span>
            <span class="rpt-creative-name">${_escHtml(_cName(c))}</span>
            <span class="rpt-creative-media">${_escHtml(c.media || '')}</span>
            ${hasMsg
              ? `<button class="rpt-msg-toggle" onclick="rptToggleCreative(this)">발송문구 ▼</button>`
              : '<span style="font-size:11px;color:var(--text3);margin-left:auto;">문구없음</span>'}
          </div>
          <div class="rpt-creative-head-tags">${tagHtml}</div>
        </div>
        <div class="rpt-creative-body collapsed">
          <div class="rpt-creative-field">
            <span class="rpt-creative-label">발송 문구</span>
            <div class="rpt-creative-msg">${_linkify(c.msg)}</div>
          </div>
          ${noteHtml}
        </div>
      </div>`;
  }).join('');
}

// ── 발송문구 토글 ─────────────────────────
function rptToggleCreative(btn) {
  const item = btn.closest('.rpt-creative-item');
  if (!item) return;
  const body = item.querySelector('.rpt-creative-body');
  if (!body) return;
  const isCollapsed = body.classList.contains('collapsed');
  body.classList.toggle('collapsed', !isCollapsed);
  btn.textContent = isCollapsed ? '발송문구 ▲' : '발송문구 ▼';
}

function rptExpandAll() {
  document.querySelectorAll('.rpt-creative-body').forEach(el => el.classList.remove('collapsed'));
  document.querySelectorAll('.rpt-msg-toggle').forEach(btn => btn.textContent = '발송문구 ▲');
}

// ── 광고비 공개 토글 ─────────────────────
function rptToggleCost() {
  const show = document.getElementById('rpt-show-cost')?.checked;
  document.querySelectorAll('.rpt-cost-col, .rpt-cost-th').forEach(el => {
    el.style.display = show ? '' : 'none';
  });
}

// ── 초기화 버튼 ──────────────────────────
function rptReset() {
  document.getElementById('rpt-seller').value = '';
  const brandSel = document.getElementById('rpt-brand');
  brandSel.innerHTML = '<option value="">전체</option>';
  brandSel.disabled  = true;
  const campSel  = document.getElementById('rpt-campaign');
  campSel.innerHTML  = '<option value="">전체</option>';
  campSel.disabled   = true;

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  document.getElementById('rpt-from').value = _dateKey(new Date(y, m, 1));
  document.getElementById('rpt-to').value   = _dateKey(new Date(y, m + 1, 0));

  const chk = document.getElementById('rpt-show-cost');
  if (chk) chk.checked = false;

  document.getElementById('rpt-body').style.display  = 'none';
  document.getElementById('rpt-empty').style.display = '';
}

// ── PDF 출력 ─────────────────────────────
function rptPrint() {
  rptExpandAll();
  window.print();
}

// ── 테이블 행 클릭 → 캠페인 상세 ────────────
function openDetailFromReport(campaignId) {
  const idx = DATA.findIndex(c => c.id === campaignId);
  if (idx >= 0) openDetail(idx);
}

// ── 캠페인 상세 → 리포트 화면 이동 (방법 B) ──
function openReportForCampaign(campaignId) {
  if (!campaignId) return;
  const c = DATA.find(x => x.id === campaignId);
  if (!c) return;

  goScreen('adreport');

  // initAdReport() 실행 후 필터 세팅
  setTimeout(() => {
    const sellerName = c.seller || c.adv || '';
    const sellerEl   = document.getElementById('rpt-seller');
    if (sellerEl && sellerName) {
      sellerEl.value = sellerName;
      rptOnSellerChange();
    }
    setTimeout(() => {
      const campEl = document.getElementById('rpt-campaign');
      if (campEl) campEl.value = campaignId;
      generateReport();
    }, 50);
  }, 50);
}

// report.js가 script.js보다 늦게 로드될 경우:
// 이미 adreport 화면이 활성 상태라면 여기서 직접 초기화
(function () {
  if (document.getElementById('screen-adreport')?.classList.contains('active')) {
    initAdReport();
  }
})();
