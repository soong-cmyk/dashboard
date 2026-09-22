#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════
// check-refs.js — 참조 무결성 점검기 (테스트 없는 프로젝트를 위한 최소 안전망)
//
// 이 프로젝트는 빌드 시스템도, 자동화 테스트도 없이 script.js/projectlog.js/
// report.js + index.html 안의 onclick="함수명()" 문자열 + getElementById('id')
// 문자열로 전부 연결돼 있다. 그래서 함수를 지우거나 id를 바꿀 때, "이거 다른 데서도
// 쓰나?"를 사람이 매번 손으로 grep해서 확인하는 게 유일한 안전망이었다
// (2026-09-16 old 일지 탭 삭제 때 _plRerenderByCtx/_plExpandAll 기본값 등을
// 놓칠 뻔한 사고가 실제 계기, 2026-09-22).
//
// 이 스크립트는 그 grep 작업을 자동화한다 — 진짜 테스트(동작 검증)는 아니고,
// "이름이 끊기지 않았는지"만 정적으로 확인하는 heuristic 도구다. 의존성 없이
// Node 내장 모듈만 쓴다(빌드 시스템 없는 프로젝트 성격에 맞춰서).
//
// 사용법: node check-refs.js
// ══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const JS_FILES = ['script.js', 'projectlog.js', 'report.js'].filter(f => fs.existsSync(path.join(ROOT, f)));
const HTML_FILES = ['index.html'].filter(f => fs.existsSync(path.join(ROOT, f)));

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const jsSources = JS_FILES.map(f => ({ file: f, text: read(f) }));
const htmlSources = HTML_FILES.map(f => ({ file: f, text: read(f) }));
const allSources = [...jsSources, ...htmlSources];
const allText = allSources.map(s => s.text).join('\n');

// ── 전역으로 취급하지 않을 자바스크립트/브라우저 내장 식별자 (오탐 줄이기용) ──
const BUILTIN_SKIP = new Set([
  'if','for','while','switch','catch','function','return','new','typeof','instanceof','in','of','delete','void',
  'var','let','const','else','case','break','continue','do','class','extends','super','yield','await','static',
  'throw','finally','try','default','with',
  'JSON','Math','Array','Object','Number','String','Boolean','Date','RegExp','Map','Set','Promise','Symbol','Error',
  'console','window','document','event','this','self','globalThis',
  'preventDefault','stopPropagation','stopImmediatePropagation','target','currentTarget',
  'confirm','alert','prompt','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent',
  'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame',
  'firebase','navigator','location','history','localStorage','sessionStorage','fetch',
  'querySelector','querySelectorAll','getElementById','getElementsByClassName','createElement','addEventListener',
  'removeEventListener','classList','dataset','style','value','checked','focus','blur','select','click','remove',
  'closest','matches','includes','forEach','map','filter','find','findIndex','reduce','sort','slice','splice',
  'join','split','trim','replace','replaceAll','padStart','padEnd','toFixed','toLocaleString','toString',
  'assign','keys','values','entries','from','isArray','now','stringify','parse',
]);

// ══════════════════════════════════════════════════════════════════════════
// 1) JS 함수 선언 수집: function NAME(...) / const NAME = function(...) / const NAME = (...) =>
// ══════════════════════════════════════════════════════════════════════════
const declared = new Map(); // name -> [{file, line}]
function recordDecl(name, file, idx, text) {
  if (!declared.has(name)) declared.set(name, []);
  const line = text.slice(0, idx).split('\n').length;
  declared.get(name).push({ file, line });
}
const declPatterns = [
  /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*function\s*\(/g,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>/g,
  // window.NAME = function(...) / window.NAME = async function(...) / window.NAME = (...)=>  / window.NAME = window.OTHER (별칭)
  /window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\(/g,
  /window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  /window\.([A-Za-z_$][\w$]*)\s*=\s*window\.[A-Za-z_$][\w$]*\s*;/g,
];
for (const { file, text } of jsSources) {
  for (const re of declPatterns) {
    let m;
    while ((m = re.exec(text))) recordDecl(m[1], file, m.index, text);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 2) "호출처럼 보이는" 사용처 카운트 — 전체 소스(JS+HTML)에서 NAME( 패턴 전부 카운트
// ══════════════════════════════════════════════════════════════════════════
function countCallLike(name) {
  const re = new RegExp(`(?<![\\w$.])${name.replace(/[$]/g, '\\$')}\\s*\\(`, 'g');
  const matches = allText.match(re);
  return matches ? matches.length : 0;
}

// ══════════════════════════════════════════════════════════════════════════
// 3) HTML의 on*="..." 인라인 핸들러 안에서 호출되는 함수명 수집 (index.html + JS 템플릿 문자열 안 둘 다)
// ══════════════════════════════════════════════════════════════════════════
const calledFromHandlers = new Map(); // name -> [{file, line}]
const handlerAttrRe = /\bon[a-z]+\s*=\s*"([^"]*)"/gi;
for (const { file, text } of allSources) {
  let m;
  while ((m = handlerAttrRe.exec(text))) {
    const body = m[1];
    const callRe = /(?<!\.)\b([A-Za-z_$][\w$]*)\s*\(/g;
    let cm;
    while ((cm = callRe.exec(body))) {
      const name = cm[1];
      if (BUILTIN_SKIP.has(name)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      if (!calledFromHandlers.has(name)) calledFromHandlers.set(name, []);
      calledFromHandlers.get(name).push({ file, line });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 4) getElementById('id') 문자열 수집 + id="..." 정의 수집(리터럴만, 템플릿 보간 제외)
// ══════════════════════════════════════════════════════════════════════════
const usedIds = new Map(); // id -> [{file, line}]
const getByIdRe = /getElementById\(\s*(['"`])([^'"`]+)\1\s*\)/g;
for (const { file, text } of jsSources) {
  let m;
  while ((m = getByIdRe.exec(text))) {
    const id = m[2];
    if (id.includes('${')) continue; // 템플릿 보간 — 정적으로 확정 불가, 제외
    const line = text.slice(0, m.index).split('\n').length;
    if (!usedIds.has(id)) usedIds.set(id, []);
    usedIds.get(id).push({ file, line });
  }
}
const definedIds = new Set();
const idDefRe = /\bid=(["'])([^"']*)\1/g;
// element.id = '리터럴' — createElement로 만들고 나서 id를 속성 대입으로 붙이는 패턴(예: projectlog.js의 모달 셸)
const idAssignRe = /\.id\s*=\s*(['"])([^'"]+)\1/g;
for (const { text } of allSources) {
  let m;
  while ((m = idDefRe.exec(text))) {
    const id = m[2];
    if (id.includes('${')) continue; // 템플릿 보간 — 정적으로 확정 불가, 제외
    definedIds.add(id);
  }
  while ((m = idAssignRe.exec(text))) {
    definedIds.add(m[2]);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 결과 출력
// ══════════════════════════════════════════════════════════════════════════
function printSection(title, desc) {
  console.log(`\n${'═'.repeat(70)}\n${title}\n${desc}\n${'─'.repeat(70)}`);
}

// (A) HTML/템플릿에서 부르는데 정의가 안 보이는 함수 — 가장 심각한 유형(오늘 사고 유형)
printSection(
  'A) 핸들러에서 호출되지만 정의를 못 찾은 함수',
  '이게 제일 위험한 유형 — onclick 등으로 부르는데 함수 선언이 안 보임(삭제 때 놓쳤을 가능성).'
);
let foundA = 0;
for (const [name, sites] of calledFromHandlers) {
  if (!declared.has(name)) {
    foundA++;
    console.log(`  ✗ ${name}()  ←  ${sites.map(s => `${s.file}:${s.line}`).join(', ')}`);
  }
}
if (!foundA) console.log('  (없음)');

// (B) JS가 찾는데 HTML 어디에도 없는 id
printSection(
  'B) getElementById로 찾는데 어디에도 id="..."가 없는 것',
  '오탈자, 삭제된 엘리먼트, 혹은 아직 안 만든 엘리먼트일 수 있음.'
);
let foundB = 0;
for (const [id, sites] of usedIds) {
  if (!definedIds.has(id)) {
    foundB++;
    console.log(`  ✗ #${id}  ←  ${sites.map(s => `${s.file}:${s.line}`).join(', ')}`);
  }
}
if (!foundB) console.log('  (없음)');

// (C) 정의는 됐는데 전체 소스 어디서도 안 불리는 함수 — 죽은 코드 후보(참고용, 오탐 많음)
printSection(
  'C) 정의됐지만 아무 데서도 호출되지 않는 함수 (죽은 코드 후보)',
  '주의: onclick 핸들러 등록(addEventListener)이나 동적 문자열 조합으로 불리는 경우 오탐일 수 있음 — 참고용으로만.'
);
let foundC = 0;
for (const [name, sites] of declared) {
  const total = countCallLike(name);
  const declCount = sites.length;
  if (total <= declCount) {
    foundC++;
    console.log(`  ? ${name}  (선언: ${sites.map(s => `${s.file}:${s.line}`).join(', ')})`);
  }
}
if (!foundC) console.log('  (없음)');

console.log(`\n${'═'.repeat(70)}`);
console.log(`요약: A(끊긴 핸들러) ${foundA}건 · B(끊긴 id) ${foundB}건 · C(죽은 코드 후보) ${foundC}건`);
console.log('A/B는 실제로 확인해볼 가치가 높고, C는 오탐이 잦으니 참고만 하세요.\n');
