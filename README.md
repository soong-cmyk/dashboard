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
├── index.html            # 전체 화면 마크업 (로그인, 사이드바, 각 화면, 모달)
├── script.js             # 데이터 초기값 및 모든 기능 로직
├── style.css             # 전체 스타일
├── report.js             # 광고주 리포트 전용 로직
├── report.css            # 광고주 리포트 전용 스타일
├── manual.html           # 실무자용 사용 설명서
├── manager_manual.html   # 관리자(대표·이사·본부장)용 사용 설명서
└── README.md
```

### index.html 구성
- `<head>`: Firebase SDK(compat v10.12.0) 로드 + 인라인 초기화 스크립트로 `window._db` 설정
- `#screen-login`: 로그인 화면
- `#topbar`: 상단 메뉴바
- `#sidebar`: 좌측 네비게이션 (`nav-*` 클래스 항목) + 사용자 정보 + 알림 벨 버튼
- `#screen-{name}`: 각 화면 컨테이너 (dashboard / calendar / campaigns / detail / edit / monthly / settlement / tax / media / sellers / users / pipeline / adreport)
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
17. 세금계산서 함수
18. 파이프라인 함수
19. 알림 함수 (`_notifBody`, `_fbSaveNotification`, `_fbWatchNotifications`, `openNotifModal`)
20. Firebase CRUD 함수 (`_fb*`)
21. 시작 시 Firebase 실시간 구독 호출

---

## 로그인 계정

| 아이디 | 이름 | 본부 | 팀 | 직급 | 관리자 |
|--------|------|------|----|------|--------|
| `admin` | 관리자 | — | — | — | ✅ |
| `wonjoon` | 최원준 | — | — | 대표이사 | ✅ |
| `younghyun` | 김영현 | 1본부 | 1팀 | 일반 | — |
| `seungmi` | 이승미 | 1본부 | 2팀 | 일반 | — |
| `yoonhee` | 이윤희 | 1본부 | 3팀 | 일반 | — |
| `minho` | 박민호 | 2본부 | 1팀 | 일반 | — |

> 초기 비밀번호: 모든 계정 `1234`
> 세션은 `localStorage`의 `cu` 키에 사용자 객체로 저장됩니다.

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
| `taxInvoices` | `t.id` (숫자) | 세금계산서 발행요청 |
| `notifications` | `notif_[timestamp]_[random]` | 사용자 알림 |
| `settings/pipeline_targets` | 단일 문서 | 파이프라인 월별 목표 |
| `invoiceImages` | `campaignId` | 매입계산서 첨부 이미지 |

### 시작 시 실시간 구독 순서 (script.js 하단)
```
_fbWatchCampaigns()         → DATA[]           (onSnapshot)
_fbWatchPipeline()          → PIPELINE_DATA[]  (onSnapshot)
_fbLoadPipelineTargets()    → PIPELINE_BUDGET_DATA
_fbWatchSellers()           → SELLER_DATA[]    (onSnapshot)
_fbWatchMedia()             → MEDIA_DATA[]     (onSnapshot)
_fbWatchUsers()             → USERS[]          (onSnapshot)
_fbWatchTax()               → TAX_DATA[]       (onSnapshot)
_fbWatchNotifications()     → NOTIFICATIONS[]  (onSnapshot, 로그인 사용자 본인 알림만)
```

---

## 데이터 모델

### 캠페인 (`DATA` → `campaigns`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | `C-YYYY-NNNN` 형식 |
| `promo` | string | 광고목적/프로모션 테마 |
| `regDate` | string | 등록일시 (`YYYY-MM-DD HH:mm`) |
| `cat` | string | 카테고리 |
| `date` | string | 발송 예약일시 |
| `media` | string | 매체사명 |
| `product` | string | SMS / MMS / LMS / DA / CPA / 퍼미션콜 |
| `qty` | number | 발송 예약 수량 |
| `svc` | number | 서비스 수량 |
| `actual` | number | 실발송 수량 |
| `clicks` | number | 클릭수 |
| `ctr` | number | 클릭률(%) |
| `db` | number | DB등록수 |
| `status` | string | 부킹확정 / 테스트완료 / 성과입력대기 / 성과입력완료 |
| `testOk` | boolean | 테스트 수신 확인 여부 |
| `sent` | boolean | 실발송 확인 여부 |
| `ops` | string | 운영 담당자 이름 |
| `dept` | string | 담당 부서 (`1본부 1팀` 형식) |
| `seller` | string | 매출처 회사명 |
| `content` | string | 브랜드명 |
| `adv` | string | 광고주명 |
| `sellUnit` | number | 매출 단가 (원/건) |
| `buyUnit` | number | 매입 단가 (원/건) |
| `disc` | number | 할인 금액 (원) |
| `comm` | number | 수수료율(%) |
| `agrate` | number | 대행수수료율(%) |
| `target` | string | 타겟 조건 |
| `msg` | string | 발송 문구 (검수전) |
| `msgFinal` | string | 발송 문구 (검수완료) |
| `note` | string | 특기사항 |
| `invoiceOut` | boolean | 매출 세금계산서 발행 여부 |
| `invoiceIn` | string | 매입 세금계산서 상태 |
| `payIn` | boolean | 입금 완료 여부 |
| `regUser` | string | 등록한 사용자 id |
| `daAdcost` | number | DA 광고비 |
| `pcAdvUnit` | number | 퍼미션콜 광고주 단가 |
| `pcOhcCost` | number | 퍼미션콜 OHC 비용 |
| `pcAgree` | number | 퍼미션콜 동의건수 |
| `pcInflow` | number | 퍼미션콜 유입수 |

> 캠페인명은 저장 필드 없이 `_cName(c)` 함수로 실시간 계산: **브랜드_매체** 형식

### 세금계산서 (`TAX_DATA` → `taxInvoices`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | number | 고유 ID |
| `groupId` | number | 같은 발행요청 묶음 ID (`T-XXX` 표시 기준) |
| `taxType` | string | `adv`(광고주) / `media`(매체) |
| `company` | string | 발행 대상 업체명 |
| `bizName` | string | 법인 상호명 |
| `campaignId` | string | 연결된 캠페인 ID |
| `month` | string | 발송월 (`YYYY년M월`) |
| `content` | string | 세금계산서 내용 |
| `supplyAmt` | number | 공급가액 |
| `vatAmt` | number | 부가세포함 금액 |
| `reqDate` | string | 발행요청일 (`YYYY-MM-DD`) |
| `issueDate` | string | 발행일 |
| `payDue` | string | 입금예정일 |
| `taxStatus` | string | `''`(미발행) / `완료`(발행완료) |
| `paid` | string | `''`(미처리) / `완료`(입금완료) |
| `unpaid` | number | 미수 금액 |
| `contactEmail` | string | 담당자 이름/이메일 |
| `memo` | string | 메모 |
| `createdBy` | string | 등록자 이름 |
| `manager` | string | 담당자 이름 |

> 그룹번호: `_taxGroupLabel(gid)` → `T-001` 형식으로 카드에 표시

### 알림 (`NOTIFICATIONS` → `notifications`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | `notif_[timestamp]_[random]` |
| `toUserId` | string | 수신자 user ID |
| `fromUserName` | string | 발생시킨 사람 이름 |
| `type` | string | `tax_issue` / `tax_issue_cancel` / `tax_payment` / `tax_payment_cancel` / `tax_new` |
| `body` | string | 알림 본문 텍스트 |
| `createdAt` | string | ISO 8601 생성일시 |
| `read` | boolean | 읽음 여부 |

**알림 발생 조건:**

| 타입 | 트리거 | 수신자 |
|------|--------|--------|
| `tax_issue` | 세금계산서 세발 완료 처리 | 요청 담당자 |
| `tax_issue_cancel` | 세발 완료 취소 | 요청 담당자 |
| `tax_payment` | 입금 완료 처리 | 요청 담당자 |
| `tax_payment_cancel` | 입금 완료 취소 | 요청 담당자 |
| `tax_new` | 세금계산서 신규 등록 | `wonjoon` 고정 |

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
| `product` | string | SMS / MMS / LMS 등 |
| `estQty` | number | 예상 수량 |
| `estAmt` | number | 예상 금액 (직접 입력 시) |
| `memo` | string | 메모 |
| `tags` | string[] | 태그 목록 |
| `archived` | boolean | 아카이브 여부 |
| `convertedCampaignId` | string | 전환된 캠페인 ID |
| `createdAt` | string | 생성일시 |

### 매출처 (`SELLER_DATA` → `sellers`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `company` | string | 회사명 (문서 키) |
| `type` | string | 광고주 / 대행사 / 랩사 |
| `agrate` | number | 대행료율% (대행사·랩사) |
| `brands` | object[] | `[{name, cat}]` — 하위 브랜드 목록 |

### 매체사 (`MEDIA_DATA` → `media`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `company` | string | 매체사명 (문서 키) |
| `unit` | number | 기본 단가 (원/건) |
| `active` | boolean | 활성 여부 |
| `contact` | string | 담당자 |
| `tel` | string | 연락처 |
| `payDay` | string | 지급일 (선입금 여부 포함) |

### 사용자 (`USERS` → `users`)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 로그인 아이디 (문서 키) |
| `pw` | string | 비밀번호 |
| `name` | string | 이름 |
| `bonbu` | string | 본부 |
| `dept` | string | 팀 |
| `rank` | string | 일반 / 본부장 / 이사 / 대표이사 |
| `isAdmin` | boolean | 관리자 여부 |
| `perms` | object | `{ops: bool}` |

---

## 캠페인 진행 단계

```
부킹확정 → 테스트완료 → 성과입력대기 → 성과입력완료
```

| 단계 | 설명 |
|------|------|
| 부킹확정 | 캠페인 등록, 수량/금액 입력 |
| 테스트완료 | 테스트 수신 확인 |
| 성과입력대기 | 발송 완료 후 성과 입력 대기 (DA·CPA) |
| 성과입력완료 | 성과 확정 → 정산 집계 대상 |

---

## 영업 파이프라인 단계

```
MAKEUP → POTENTIAL → COMMITMENT → ACTUAL
```

> ACTUAL 단계에서 `convertToCampaign(id)` 호출 시 캠페인 등록 폼이 자동 채워집니다.

---

## 화면별 기능

### 대시보드 (`renderDashboard`)
- 이번 달 캠페인 수 / 성과입력완료 수 / 총 매출액·이익 통계 카드 (월 필터)
- 나의 캠페인 / 전체 단계별 현황

### 캘린더 (`renderCalendar`)
- 월 / 주 / 일 뷰 전환, 카테고리·담당자 필터
- 날짜 클릭 시 해당 날짜로 캠페인 등록 폼 바로 열기

### 캠페인 목록 (`renderTable`)
- 다중 필터 (카테고리·상품·매체사·담당자·본부/팀·날짜범위·단계·검색어)
- 엑셀 다운로드 — 현재 필터 기준 (SheetJS)

### 캠페인 상세 (`openDetail`)
- 기본정보 / 수량·금액 / 성과 / 타겟&문구 / 특기사항
- 발송문구: 검수전 / 검수완료 탭 구분. DA·CPA·퍼미션콜은 미표시
- 성과 입력, 수정 이력 조회, 복사 등록

### 정산 (`renderSettlement`)
- 보기: 매출처별 / 매체사별 / 캠페인별 / 퍼미션콜
- 필터: 연/월, 성과입력완료만·전체, 상품·카테고리·매체사·매출처·담당자·본부/팀·검색어
- 엑셀 다운로드: 정산내역(ExcelJS) / 광고비 지급요청서(매체사별 시트, 퍼미션콜→디앤유+OHC 분리)

### 세금계산서 (`renderTaxList`)
- 그룹번호 `T-XXX` 표시 (groupId 기반)
- **불러오기**: 정산완료 캠페인 중 미발행 항목 2-step 모달로 등록
- **수동등록**: 직접 입력
- 세발(발행완료) / 입금 상태 토글 → 정산탭 동기화
- 수정·삭제: 관리자 또는 작성자 본인만 표시
- 세발 체크 권한: `wonjoon`, `yoonhee`, `admin`
- 입금 체크 권한: `wonjoon`, `admin`

### 알림 (`openNotifModal`)
- 사이드바 사용자 영역 🔔 벨 버튼 (읽지 않은 수 뱃지)
- 세금계산서 세발·입금 완료/취소 시 담당자 알림
- 세금계산서 신규 등록 시 `wonjoon`에게 알림
- Firestore `onSnapshot` 실시간 수신, 모달 열면 전체 읽음 처리

### 광고주 리포트 (`generateReport`)
- 광고주·브랜드·기간 필터, KPI카드·전월대비·벤치마크·인사이트·소재 분석
- PDF 출력 지원

### 사용 설명서
- `manual.html`: 실무자용 (캠페인 등록·성과입력·세금계산서 요청 등)
- `manager_manual.html`: 관리자용 (정산 확인·지급요청서·세금계산서 발행 처리 등)
- 로그인 직급(본부장·이사·대표이사)에 따라 자동으로 해당 설명서 오픈

---

## 주요 계산 함수

| 함수 | 설명 |
|------|------|
| `_cName(c)` | 캠페인명 생성: `브랜드_매체` |
| `_stlAmt(c)` | 정산 금액 계산 (상품별 분기) |
| `_taxGroupLabel(gid)` | 세금계산서 그룹번호: `T-001` 형식 |
| `_notifBody(type, company, content, count, gid)` | 알림 본문 텍스트 생성 |
| `calcReg()` / `calcEdit()` | 등록/수정 폼 금액 자동 계산 |

---

## Firebase CRUD 함수 목록

| 함수 | 동작 |
|------|------|
| `_fbWatchCampaigns()` | campaigns 실시간 구독 → `DATA[]` |
| `_fbSaveCampaign(c)` | 캠페인 저장 |
| `_fbDeleteCampaign(id)` | 캠페인 삭제 |
| `_fbWatchPipeline()` | pipeline 실시간 구독 → `PIPELINE_DATA[]` |
| `_fbSavePipeline(p)` | 파이프라인 카드 저장 |
| `_fbWatchSellers()` | sellers 실시간 구독 → `SELLER_DATA[]` |
| `_fbSaveSeller(s)` | 매출처 저장 |
| `_fbWatchMedia()` | media 실시간 구독 → `MEDIA_DATA[]` |
| `_fbSaveMedia(m)` | 매체사 저장 |
| `_fbWatchUsers()` | users 실시간 구독 → `USERS[]` |
| `_fbSaveUser(u)` | 사용자 저장 |
| `_fbWatchTax()` | taxInvoices 실시간 구독 → `TAX_DATA[]` |
| `_fbSaveTax(t)` | 세금계산서 저장 |
| `_fbDeleteTax(id)` | 세금계산서 삭제 |
| `_fbWatchNotifications()` | notifications 실시간 구독 → `NOTIFICATIONS[]` |
| `_fbSaveNotification(toUserId, type, body)` | 알림 저장 |
| `_fbSaveHistory(entry)` | 수정 이력 저장 |
| `_fbLoadHistory(campaignId)` | 특정 캠페인 이력 로드 |

---

*BRAINCUBE Ad Operation Dashboard — v2.0*
