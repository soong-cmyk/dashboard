# BRAINCUBE — 광고 운영 대시보드

광고 캠페인의 영업·등록·운영·정산을 한 곳에서 관리하는 사내 웹 대시보드입니다.

---

## 실행 방법

별도 설치 없이 `index.html`을 브라우저에서 엽니다.

```
index.html 더블클릭 → 브라우저에서 열기
```

> 백엔드 없이 순수 HTML + JS + CSS로 동작하는 클라이언트 전용 SPA입니다.
> 모든 데이터는 Firebase Firestore에 저장됩니다 (파일 프로토콜에서 직접 접근).

---

## 파일 구조

```
dashboard/
├── index.html   # 전체 화면 마크업 (로그인, 사이드바, 각 화면, 모달)
├── script.js    # 데이터 초기값 및 모든 기능 로직
├── style.css    # 전체 스타일
├── report.js    # 광고주 리포트 전용 로직
├── report.css   # 광고주 리포트 전용 스타일
└── README.md
```

### index.html 구성
- `<head>`: Firebase SDK(compat v10.12.0) 로드 + 인라인 초기화 스크립트로 `window._db` 설정
- `#screen-login`: 로그인 화면
- `#topbar`: 상단 메뉴바 (Firebase 동기화 버튼, 관리자 전용)
- `#sidebar`: 좌측 네비게이션 (`nav-*` 클래스 항목)
- `#screen-{name}`: 각 화면 컨테이너 (dashboard / calendar / campaigns / detail / edit / monthly / settlement / media / sellers / users / pipeline / **adreport**)
- 모달 (`modal*`): 화면 내 팝업 레이어

### script.js 구성 (블록 순서)
1. `DATA` — 캠페인 초기 샘플 데이터
2. `PIPELINE_DATA` — 파이프라인 초기 샘플 데이터
3. `SELLER_DATA` — 매출처(광고주/대행사) 초기 데이터
4. `MEDIA_DATA` — 매체사 초기 데이터
5. `PIPELINE_BUDGET_DATA` — 파이프라인 본부/팀별 월 목표 데이터
6. `USERS` — 사용자 계정 초기 데이터
7. 인증·사용자 관리 함수
8. 수정 이력(`_log`, `_fbSaveHistory`, `_fbLoadHistory`, `openHistory`)
9. 화면 이동(`goScreen`), 캠페인 목록, 상세, 수정, 등록 함수
10. 캘린더 함수
11. 대시보드 함수
12. 엑셀 다운로드 함수
13. 월별 발송량 함수
14. 매체 관리 함수
15. 매출처 관리 함수
16. 정산 함수
17. 파이프라인 함수
18. Firebase CRUD 함수 (`_fb*`)
19. 시작 시 Firebase 로드 호출

### report.js 구성 (광고주 리포트 전용)
- `initAdReport()` — 화면 초기화, 광고주 콤보 populate, 기간 기본값(이번 달), 체크박스 기본값
- `_rptPopulateSeller()` — SELLER_DATA 전체를 광고주 드롭다운에 반영 (Firebase 로드 후 재호출)
- `rptOnSellerChange()` / `rptOnBrandChange()` / `rptOnDateChange()` — 필터 연동 콤보 갱신
- `generateReport()` — 선택된 필터로 리포트 렌더링 오케스트레이션
- `_rptFilterCampaigns()` — seller + brand + 기간으로 캠페인 필터 (매체 무관)
- `_rptCalcKPI()` — 발송건수·수량·클릭수·CTR(가중평균)·DB·광고비·CPM 계산
- `_rptRenderHeader()` / `_rptRenderKPI()` / `_rptRenderMoM()` — 헤더·KPI카드·전월대비 렌더
- `_rptRenderBenchmark()` — 카테고리별 CTR 퍼센타일 벤치마크
- `_rptRenderInsight()` — CTR 등급·매체별 분석·규칙 기반 제안 생성
- `_rptRenderTable()` — 캠페인 목록 테이블
- `_rptRenderCreatives()` — 소재·타겟 아코디언 (날짜·태그 상시 표시, 발송문구 토글)
- `rptToggleCost()` / `rptToggleBenchmark()` — 광고비·벤치마크 공개 여부 토글
- `openReportForCampaign(campaignId)` — 캠페인 상세에서 리포트 화면으로 바로 이동

---

## 로그인 계정

| 아이디 | 이름 | 본부 | 팀 | 관리자 |
|--------|------|------|----|--------|
| `admin` | 관리자 | — | — | ✅ |
| `younghyun` | 김영현 | 1본부 | 1팀 | — |
| `seungmi` | 이승미 | 1본부 | 2팀 | — |
| `yoonhee` | 이윤희 | 1본부 | 3팀 | — |
| `minho` | 박민호 | 2본부 | 1팀 | — |

> 초기 비밀번호: 모든 계정 `1234`
> 세션은 `sessionStorage`의 `cu` 키에 `{id}` 형태로 저장됩니다.

---

## 조직 구조 (`ORG_STRUCTURE`)

```
광고본부
├── 1본부
│   ├── 1팀 (김영현)
│   ├── 2팀 (이승미)
│   └── 3팀 (이윤희)
├── 2본부
│   └── 1팀 (박민호)
└── 3본부
    └── 1팀
```

---

## Firebase 구조

| 컬렉션 | 문서 키 | 설명 |
|--------|---------|------|
| `campaigns` | `c.id` (예: `C-2026-0047`) | 캠페인 전체 데이터 |
| `pipeline` | `p.id` (예: `P-2026-0001`) | 영업 파이프라인 딜 |
| `history` | `entry.id` (타임스탬프 기반) | 캠페인 수정 이력 |
| `sellers` | `s.company` (슬래시→언더스코어) | 매출처(광고주/대행사) |
| `media` | `m.company` (슬래시→언더스코어) | 매체사 |
| `users` | `u.id` (로그인 아이디) | 사용자 계정 |
| `settings/pipeline_targets` | 단일 문서 | 파이프라인 월별 목표 |

### 시작 시 로드 순서 (script.js 하단)
```
_fbLoadCampaigns()   → DATA[]
_fbLoadPipeline()    → PIPELINE_DATA[]
_fbLoadPipelineTargets() → PIPELINE_BUDGET_DATA
_fbLoadSellers()     → SELLER_DATA[]
_fbLoadMedia()       → MEDIA_DATA[]
_fbLoadUsers()       → USERS[]
```
> 각 컬렉션이 비어있으면 코드 내 초기 데이터를 Firestore에 업로드합니다.

---

## 데이터 모델

### 캠페인 (`DATA` → `campaigns`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | `C-YYYY-NNNN` 형식 |
| `promo` | string | 광고목적/프로모션 테마 |
| `regDate` | string | 등록일시 (`YYYY-MM-DD HH:mm`) |
| `cat` | string | 카테고리 (분양/교육/뷰티/수송/금융/병의원/기타) |
| `date` | string | 발송 예약일시 |
| `media` | string | 매체사명 |
| `product` | string | SMS / MMS / LMS |
| `qty` | number | 발송 예약 수량 |
| `svc` | number | 서비스 수량 |
| `actual` | number | 실발송 수량 |
| `clicks` | number | 클릭수 |
| `ctr` | number | 클릭률(%) |
| `db` | number | DB등록수 |
| `dbr` | number | DB등록률(%) |
| `status` | string | 부킹확정 / 테스트완료 / 성과입력대기 / 성과입력완료 |
| `testOk` | boolean | 테스트 수신 확인 여부 |
| `sent` | boolean | 실발송 확인 여부 |
| `sales` | string | 영업 담당자 이름 |
| `ops` | string | 운영 담당자 이름 |
| `dept` | string | 담당 부서 (`1본부 1팀` 형식) |
| `seller` | string | 매출처 회사명 |
| `content` | string | 브랜드명 |
| `adv` | string | 광고주명 |
| `agency` | string | 대행사명 |
| `contract` | string | 광고주 / 대행사 |
| `sellUnit` | number | 매출 단가 (원/건) |
| `buyUnit` | number | 매입 단가 (원/건) |
| `disc` | number | 할인 금액 (원) |
| `comm` | number | 수수료율(%) |
| `agrate` | number | 대행수수료율(%) |
| `target` | string | 타겟 조건 (자유 텍스트) |
| `msg` | string | 발송 문구 |
| `note` | string | 특기사항 |
| `invoiceOut` | string | 매출 세금계산서 번호 |
| `invoiceIn` | string | 매입 세금계산서 번호 |
| `payIn` | boolean | 입금 완료 여부 |
| `payOut` | boolean | 지급 완료 여부 |
| `regUser` | string | 등록한 사용자 id |

> 캠페인명은 저장 필드 없이 `_cName(c)` 함수로 실시간 계산: **브랜드_매체** 형식

### 파이프라인 (`PIPELINE_DATA` → `pipeline`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | `P-YYYY-NNNN` 형식 |
| `stage` | string | MAKEUP / POTENTIAL / COMMITMENT / ACTUAL |
| `bonbu` | string | 본부 |
| `dept` | string | 팀 |
| `month` | string | 해당 월 (`YYYY-MM`) |
| `cat` | string | 카테고리 |
| `seller` | string | 매출처 회사명 |
| `brand` | string | 브랜드명 |
| `media` | string | 예상 매체 |
| `product` | string | SMS / MMS / LMS |
| `estQty` | number | 예상 수량 |
| `estAmt` | number | 예상 금액 (직접 입력 시; 없으면 qty×단가 자동 계산) |
| `memo` | string | 메모 |
| `tags` | string[] | 태그 목록 (업셀링/신규/재계약 등) |
| `linkedCampaignId` | string | 업셀링 연결 캠페인 ID |
| `archived` | boolean | 아카이브 여부 |
| `convertedCampaignId` | string | 전환된 캠페인 ID |
| `createdAt` | string | 생성일시 |

### 매출처 (`SELLER_DATA` → `sellers`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `company` | string | 회사명 (문서 키) |
| `type` | string | 광고주 / 대행사 |
| `brands` | object[] | `[{name, cat}]` — 하위 브랜드 목록 |

### 매체사 (`MEDIA_DATA` → `media`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `company` | string | 매체사명 (문서 키) |
| `unit` | number | 기본 단가 (원/건) |
| `comm` | number | 수수료율(%) |
| `contact` | string | 담당자 |
| `phone` | string | 연락처 |
| `email` | string | 이메일 |

### 사용자 (`USERS` → `users`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 로그인 아이디 (문서 키) |
| `pw` | string | 비밀번호 |
| `name` | string | 이름 |
| `bonbu` | string | 본부 |
| `dept` | string | 팀 |
| `isAdmin` | boolean | 관리자 여부 |
| `perms` | object | `{sales: bool, ops: bool}` |

### 수정 이력 (`history`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 타임스탬프 기반 고유 ID |
| `campaignId` | string | 연결된 캠페인 ID |
| `when` | string | 수정일시 (`YYYY-MM-DD HH:mm`) |
| `who` | string | 수정자 이름 |
| `type` | string | `edit` / `test` / `send` / `2nd` / `del` |
| `field` | string | 변경된 필드명 |
| `before` | string | 변경 전 값 |
| `after` | string | 변경 후 값 |

---

## 캠페인 진행 단계

```
부킹확정 → 테스트완료 → 성과입력대기 → 성과입력완료
```

| 단계 | 설명 | 관련 함수 |
|------|------|-----------|
| 부킹확정 | 캠페인 등록, 수량/금액 입력 | `submitReg()` |
| 테스트완료 | 테스트 수신 확인 | `confirmTest()`, `detailClickTest()` |
| 성과입력대기 | 실발송 수량 입력, 발송 확인 | `confirmSend()`, `detailClickSend()` |
| 성과입력완료 | 클릭수·클릭률·DB등록수 집계 | `submit2nd()` |

---

## 영업 파이프라인 단계

```
MAKEUP → POTENTIAL → COMMITMENT → ACTUAL
```

| 단계 | 설명 |
|------|------|
| MAKEUP | 초기 접촉·제안 |
| POTENTIAL | 가능성 있는 딜 |
| COMMITMENT | 확정 예정 |
| ACTUAL | 실제 확정 → 캠페인 전환 가능 |

> ACTUAL 단계에서 `convertToCampaign(id)` 호출 시 캠페인 등록 폼이 자동 채워집니다.
> 전환 완료 후 파이프라인 카드는 `archived=true`, `convertedCampaignId` 기록됩니다.

---

## 화면별 기능

### 대시보드 (`renderDashboard`)
- 올해 진행 캠페인 수 / 이번 달 예정 캠페인 수 / 실발송 합계 통계 카드
- 파이프라인 총 건수 / 예상 파이프라인 매출 / 확정예정(COMMITMENT+ACTUAL) 건수
- 나의 캠페인 / 브레인큐브 전체 단계별 현황 (`renderDashboard`)

### 캘린더 (`renderCalendar`)
- 월 / 주 / 일 뷰 전환 (`setCalView`)
- 카테고리·매체사·광고주·담당자 필터 (`_populateCalFilters`)
- 일정 클릭 시 캠페인 기본정보 팝업 (`openCalPreview`)

### 캠페인 목록 (`renderTable`)
- 카테고리·상품·매체사·담당자·조회기간 등 다중 필터 (`applyFilter`)
- 기본 조회기간: 현재 월 1일~말일
- 엑셀 다운로드 (`downloadCampaignsExcel`, SheetJS 사용)
- 캠페인 신규 등록 모달 (`openRegModal`, `submitReg`)

### 캠페인 상세 (`openDetail`)
- 기본정보 / 수량·금액 / 성과 조회 (2열 레이아웃)
- 타겟 조건·발송 문구·특기사항 수정 (`openEditTarget`, `openEditNote`)
- 테스트 수신 확인 / 발송 최종 확인 (`detailClickTest`, `detailClickSend`)
- 성과 입력/수정 (`open2ndModal`, `submit2nd`)
  - 정산수량 = 실발송수량 − 서비스수량
  - 클릭률 = 클릭수 ÷ 실발송수량 × 100
  - DB등록률 = DB등록수 ÷ 실발송수량 × 100
- 수정 이력 조회 (`openHistory`) — Firebase에서 로드, 날짜→시간+담당자 2단계 그룹핑
- 캠페인 삭제 (`confirmDel`)
- **[📄 리포트] 버튼** — `openReportForCampaign(id)` 호출, 광고주 리포트 화면으로 바로 이동
- detail-top 영역: 스크롤 시 상단 고정 (sticky)

### 광고주 리포트 (`initAdReport`, `generateReport`)
- 광고주·브랜드·기간 필터로 복수 캠페인 묶음 또는 단건 리포트 생성
- **A. 헤더**: 광고주명·기간·생성일시
- **B. KPI 카드**: 총 발송건수·발송수량·클릭수·CTR·DB수·광고비·CPM
- **C. 전월 대비**: 단일 월→달력 직전 달, 복수 기간→직전 동일 일수 자동 비교
- **D. 캠페인 목록**: 매체·수량·클릭수·CTR·DB·광고비 컬럼 테이블
- **E. 소재 & 타겟**: 날짜·캠페인명·매체·타겟태그 상시 표시 / 발송문구 토글(기본 접힘)
- **F. 카테고리 벤치마크**: 동일 카테고리 캠페인 대비 CTR 퍼센타일 위치
- **G. 인사이트 & 제안**: CTR 등급·매체별 효율 분석·다음 캠페인 제안 자동 생성
- 공개 여부 체크박스 2개 (화면+PDF 동시 제어)
  - **광고비 공개** (기본 체크): 언체크 시 광고비·CPM 컬럼 숨김
  - **카테고리 벤치마크 공개** (기본 체크): 언체크 시 벤치마크 섹션 전체 숨김
- **PDF 출력**: `window.print()` + `@media print` — 사이드바·필터·액션바 자동 숨김

### 캠페인 수정 (`openEdit`, `submitEdit`)
- 모든 필드 수정 가능 (관리자 또는 담당자)
- 변경된 필드만 이력 기록 (`_log`)
- 수정 중 topbar 숨김, detail-top 상단 고정

### 영업 파이프라인 (`renderPipeline`, `renderPipelineStats`)
- **칸반 탭**: 4단계 컬럼, 카드별 예상금액·태그 표시
  - 예상금액: `estAmt` 직접 입력 우선, 없으면 `estQty × 매체 기본단가`
  - 아카이브 토글 (`togglePipelineArchive`)
  - 카드 등록/수정/아카이브 (`openPipelineModal`, `savePipelineCard`, `archivePipelineCard`)
  - ACTUAL 카드: [캠페인 전환] 버튼 (`convertToCampaign`)
- **통계 탭**: 본부/팀별 월별 목표·현황·달성률 표
  - 목표 셀 수정: 관리자만 가능, blur/Enter 시 자동 저장 (`editPipelineCell`)
  - 현황 집계: `_pipelineEstAmt()` 기준

### 월별 발송량 (`renderMonthly`)
- 매체사별 / 광고주별 / 대행사별 / 캠페인별 탭
- 연도·월·카테고리·매체사 필터
- 총 매출액·매입액·매출이익 집계
- 엑셀 다운로드

### 정산 (`renderSettlement`)
- 캠페인·매체·광고주·대행사별 뷰 전환
- 매출액 / 매입액 / 대행수수료 / 매출이익 자동 계산 (`_stlAmt`)
- 입금·지급 상태 토글 (`toggleSettlePay`)
- 세금계산서 번호 입력 (`openInvoiceModal`, `saveInvoice`)

### 매체 관리 (`renderMediaList`)
- 매체사 목록 조회·검색
- 단가·수수료·담당자 정보 등록 및 수정 (`saveMedia`)
- Firebase 실시간 저장 (`_fbSaveMedia`)

### 매출처 관리 (`renderSellerList`)
- 광고주 / 대행사 구분 등록
- 브랜드(하위 상품) 카테고리별 관리 (`saveSeller`)
- Firebase 실시간 저장 (`_fbSaveSeller`)

### 사용자 관리 (`_renderUserMgmtList`)
- 사용자 목록 및 권한(영업·운영) 설정 (`togglePerm`)
- 본부/팀 소속 수정 (`saveUserEdit`)
- 비밀번호 초기화 (`confirmResetPw`)
- 신규 사용자 등록 (`submitUserReg`)
- 모든 변경사항 Firebase 자동 저장 (`_fbSaveUser`)

---

## 주요 계산 함수

| 함수 | 설명 |
|------|------|
| `_cName(c)` | 캠페인명 생성: `브랜드_매체` |
| `_stlAmt(c)` | 정산 금액 계산 (실발송수량 기준) |
| `_pipelineEstAmt(p)` | 파이프라인 예상금액 (`estAmt` 우선, 없으면 `estQty × 단가`) |
| `calcReg()` / `calcEdit()` | 등록/수정 폼 금액 자동 계산 |
| `calcCTR()` | 클릭률 = 클릭수 ÷ 실발송수량 × 100 |
| `calcDBR()` | DB등록률 = DB등록수 ÷ 실발송수량 × 100 |
| `_calcPipeAmt()` | 파이프라인 모달 예상금액 자동 계산 |

---

## Firebase CRUD 함수 목록

| 함수 | 동작 |
|------|------|
| `_fbLoadCampaigns()` | campaigns 컬렉션 로드 → `DATA[]` |
| `_fbSaveCampaign(c)` | 캠페인 1건 저장 |
| `_fbDeleteCampaign(id)` | 캠페인 삭제 |
| `_fbLoadPipeline()` | pipeline 컬렉션 로드 → `PIPELINE_DATA[]` |
| `_fbSavePipeline(p)` | 파이프라인 카드 저장 |
| `_fbDeletePipeline(id)` | 파이프라인 카드 삭제 |
| `_fbLoadPipelineTargets()` | settings/pipeline_targets 로드 |
| `_fbSavePipelineTargets()` | settings/pipeline_targets 저장 |
| `_fbLoadSellers()` | sellers 컬렉션 로드 → `SELLER_DATA[]` |
| `_fbSaveSeller(s)` | 매출처 저장 |
| `_fbDeleteSeller(company)` | 매출처 삭제 |
| `_fbLoadMedia()` | media 컬렉션 로드 → `MEDIA_DATA[]` |
| `_fbSaveMedia(m)` | 매체사 저장 |
| `_fbDeleteMedia(company)` | 매체사 삭제 |
| `_fbLoadUsers()` | users 컬렉션 로드 → `USERS[]` |
| `_fbSaveUser(u)` | 사용자 저장 |
| `_fbSaveHistory(entry)` | 수정 이력 저장 |
| `_fbLoadHistory(campaignId)` | 특정 캠페인 이력 로드 |
| `fbSyncAll()` | 전체 수동 동기화 (관리자 전용) |

---

## 카테고리 색상 (`CAT_COLOR`)

| 카테고리 | 색상 |
|----------|------|
| 분양 | `#8fd3a0` |
| 교육 | `#91c7f5` |
| 뷰티 | `#fcc2d7` |
| 수송 | `#ffc078` |
| 금융 | `#a9e4ef` |
| 병의원 | `#ff8787` |
| 기타 | `#d4c5f9` |

---

## 향후 개발 예정

- [ ] 서버 인증 (현재 클라이언트 sessionStorage 방식)
- [ ] 권한별 메뉴 노출 제어
- [ ] 세금계산서 번호 입력 기능 확장
- [ ] 매체별·대행사별 단가 데이터 정비 (LMS/MMS 수수료 구분)
- [ ] 타겟 태그 정형화 → 타겟별 효율 통계 분석

---

*BRAINCUBE Ad Operation Dashboard — v1.3*
