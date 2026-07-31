# Firestore DB Schema

총 **19개** 컬렉션 (기존 문서 14개 + 사용현황 추적 5개)

> **보정 이력 (2026-07-31)**
> - 필드 의미 오류 5건 수정: `content` `promo` `adpromo` `target` `dtarget`
> - 누락 컬렉션 5개 추가: `screenVisits` `screenStatsDaily` `filterStatsDaily` `errorStatsDaily` `actionStatsDaily`
> - `settings` 하위 문서 4종으로 정정 (기존 문서엔 1종만 기재)
> - `pipeline` 및 `settings/pipeline_targets` 폐기 표기
> - `campaigns.dept`의 실제 역할(폴백) 정정, `contract`(레거시 필드) 추가

---

## 1. `users` — 사용자

문서 ID: `u.id`

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 로그인 ID |
| pw | string | 비밀번호 |
| name | string | 이름 — **캠페인 `ops`와 매칭되는 키** |
| bonbu | string | 본부 (`1본부` \| `2본부` \| `3본부`) |
| dept | string | 팀 (`1팀` \| `2팀` \| `3팀`) |
| rank | string | 직급 (`일반` \| `팀장` \| `실장` \| `본부장` \| `이사` \| `대표이사`) |
| isAdmin | boolean | 관리자 여부 |
| perms | object | 권한 (`{ ops: true }`) — 실사용 권한은 `ops` 하나 |

> 조직 구조는 코드 상수 `ORG_STRUCTURE`에 정의: 1본부(1·2·3팀) / 2본부(1팀) / 3본부(1팀)
> 직급 서열은 `RANK_LEVEL` 상수 (1=대표이사 ~ 6=일반)

---

## 2. `loginHistory` — 로그인 기록

문서 ID: 자동생성 (add)

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | string | 사용자 ID |
| name | string | 사용자 이름 |
| dept | string | 본부+팀 (예: `1본부 1팀`) |
| loginAt | Timestamp | 로그인 일시 (serverTimestamp) |

---

## 3. `history` — 캠페인 수정 이력

문서 ID: `entry.id` (`timestamp_random`)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 이력 고유 ID |
| campaignId | string | 연결된 캠페인 ID |
| who | string | 변경자 이름 |
| when | string | 변경 일시 (`YYYY-MM-DD HH:mm`) |
| type | string | 이벤트 유형 (`register` \| `field` \| `check` \| `perf`) |
| field | string\|null | 변경된 필드 키 |
| before | string\|null | 변경 전 값 |
| after | string\|null | 변경 후 값 |

> ⚠ 이 컬렉션명은 **캠페인 수정 이력**으로 이미 사용 중이다. 신규 기능에서 `history`를 재사용하지 말 것.

---

## 4. `campaigns` — 캠페인

문서 ID: `c.id` (`C-YYYY-N`)

### 기본 정보

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 캠페인 ID |
| regDate | string | 등록일 (`YYYY-MM-DD`) |
| **promo** | string | **광고목적** (예: 여름할인이벤트, 신규회원모집) — 폼 id는 `r_adpromo`/`e_adpromo`이나 저장 필드는 `promo` |
| **cat** | string | **업종 카테고리** — 브랜드 선택 시 `sellers.brands[].cat`에서 **자동 상속** |
| date | string | 시작일 (집행일) |
| dateEnd | string | 종료일 (DA 전용) |
| media | string | 매체사명 — **단일값** |
| product | string | 상품 (`PRODUCT_LIST` 10종 중 1) |
| seller | string | 매출처 (광고주/대행사/랩사) |
| contract | string | 계약주체 — ⚠ 레거시. 상세보기에서 표시만 하고 등록/수정 폼에 입력 UI 없음(신규 값 채워지지 않음) |
| **adv** | string | 광고주 — ⚠ **등록 시 `seller`와 동일값으로 저장** (`adv: r_seller.value`). 실질적으로 미분리 |
| **content** | string | **브랜드명** — `sellers.brands[].name`에서 선택, 목록에 없는 값 자유입력도 가능 (`FIELD_LABELS.content = '브랜드'`) |
| dept | string | 등록 시 담당자(`ops`) 소속으로 저장되지만, 조회·집계의 주 기준은 아님 (아래 주석 참조) |
| ops | string | 담당자 이름 — **조직 귀속의 실제 기준** |
| regUser | string | 등록자 ID |
| status | string | 상태 (4단계, 아래 참조) |
| testOk | boolean | 테스트 완료 여부 |
| sent | boolean | 성과입력대기 체크 여부 |

> **조직 귀속 방식**: 조회·집계는 `USERS.find(u => u.name === c.ops)`로 담당자를 찾아
> 그 사용자의 현재 `bonbu`/`dept`를 우선 사용한다. `campaigns.dept`는 담당자가 `USERS`에서
> 매칭되지 않을 때(예: 계정 삭제 등)의 **폴백**으로만 쓰인다 (script.js 캘린더/캠페인목록
> 팀 필터, 정산화면 부서 표시 등 3곳). 신규 기능도 `ops`→`USERS` 조인을 기본으로 하고,
> `dept`는 폴백 용도로만 참조해야 기존 집계와 숫자가 일치한다.

> **캠페인명은 저장되지 않는다.** 표시 시 `_cName()`이 `브랜드_매체` 형식으로 매번 생성한다.

> ❌ **`adpromo` 필드는 존재하지 않는다.** DOM id(`r_adpromo`/`e_adpromo`)일 뿐이며 저장은 `promo`로 이루어진다.

### 상태 (4단계)

```javascript
const steps = ['부킹확정', '테스트완료', '성과입력대기', '성과입력완료'];
```

**등록 시 초기 상태가 상품별로 다르다:**

| 상품 | 초기 상태 |
|---|---|
| 문자류 (MMS·LMS·실시간 발송·PUSH·카톡MSG) | `부킹확정` |
| DA·IPTV | `성과입력대기` |
| CPA | `성과입력대기` |
| 퍼미션콜 | `성과입력완료` |
| CPS | `성과입력완료` |

### 타겟팅·소재

| 필드 | 타입 | 설명 |
|------|------|------|
| **target** | string | **타겟조건** (⚠ 목표가 아님, `FIELD_LABELS.target='타겟조건'`) |
| **dtarget** | string | **디타겟조건** (제외 조건) |
| msg | string | 발송문구 |
| msgFinal | string | 검수완료문구 |
| note | string | 비고 |

> ⚠ **KPI 목표를 저장하는 필드는 campaigns에 존재하지 않는다.**
> `target`/`dtarget`은 발송 타겟팅 조건이며, `openEditTarget()`에서 발송문구와 함께 편집된다.

### 성과 지표

| 필드 | 타입 | 설명 |
|------|------|------|
| actual | number | 실발송수량 |
| clicks | number | 클릭수 |
| ctr | number | CTR (%) |
| db | number | DB등록수 — ⚠ 광고주마다 의미가 다름 (체험단 신청 / 상담DB / 가입신청 등) |
| dbr | number | DB등록률 (%) |

### 정산 (공통)

| 필드 | 타입 | 설명 |
|------|------|------|
| sellUnit | number | 매출단가 |
| **disc** | number | **할인단가 (원/건)** — ⚠ 차감 금액이 아니라 **매출단가를 대체하는 단가**. `eu = disc > 0 ? disc : sellUnit` |
| qty | number | 발송예약수량(정산예정수량) — CPA·CPS는 0으로 저장 |
| svc | number | 서비스 수량 — CPA·CPS는 0으로 저장 |
| billBase | string | 청구기준 (레거시) |
| sellBillBase | string | 매출정산기준 (`actual` \| `sched`) — DA·PC·CPA·CPS는 `''` |
| buyBillBase | string | 매입정산기준 (`actual` \| `sched`) — DA·PC·CPA·CPS는 `''` |
| svcApplyAdv | boolean | 서비스수량 적용(광고주) |
| svcApplyMedia | boolean | 서비스수량 적용(매체) |
| comm | number | 수수료율 (%) |
| buyUnit | number | 매입단가 |
| agrate | number | 대행사 수수료율 (%) |
| adcostFixed | number\|null | 광고비(확정, 수동입력) — DA·PC·CPS는 `null` |
| amtFixed | number\|null | 실청구액(확정, 수동입력) — DA·PC·CPA·CPS는 `null` |
| buyAmtFixed | number\|null | 매입액(확정, 수동입력) |
| revFixed | number | 매출수익(확정, 수동입력) |
| profitFixed | number | 이익(확정) — CPS에서는 브레인큐브 수익 고정값으로도 사용 |

### 상품별 전용 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| daAdcost | number | DA 광고비 |
| daBillBase | number | DA 청구기준 |
| daFeeYn | boolean | DA 수수료 여부 |
| daImage | string | DA 이미지 URL |
| daImp | number | DA 노출수 |
| daClick | number | DA 클릭수 |
| daConv | number | DA 전환수 |
| daRev | number | DA 매출 |
| cpaFeeYn | boolean | CPA 수수료 여부 |
| pcAdvUnit | number | 퍼미션콜 광고주 단가 |
| pcOhcCost | number | 퍼미션콜 OHC 비용 |
| pcDnuUnit | number | 퍼미션콜 DNU 단가 |
| pcInflow | number | 퍼미션콜 유입수 |
| pcAgree | number | 퍼미션콜 동의수 |
| cpsFinalSales | number | CPS 최종정산매출 (거래액) |
| cpsTotalComm | number | CPS 총수수료 (**= 광고비 기준값**) |
| cpsMediaComm | number | CPS 매체수수료 |
| stlMonth | string | CPS 정산월 (`YYYY-MM`) |

### 정산 처리 상태

| 필드 | 타입 | 설명 |
|------|------|------|
| invoiceOut | boolean | 매출계산서발행 여부 |
| payIn | boolean | 입금 완료 여부 |
| invoiceIn | boolean | 매입계산서발행 여부 |
| payOut | boolean | 지급 완료 여부 |
| confirmAdv | boolean | 담당자확인(광고주) |
| confirmMedia | boolean | 담당자확인(매체) |
| taxAdvReq | boolean | 광고주 세금계산서 발행 요청 여부 |
| taxMediaReq | boolean | 매체사 세금계산서 발행 요청 여부 |

### 💡 금액 계산은 반드시 `_stlAmt()` / `_stlHas()` / `_campAdcost()` 사용

상품 5갈래 분기 + 확정값 우선순위 + 청구기준 + 서비스수량 차감 규칙이 얽혀 있으므로
**직접 계산하지 말 것.**

```javascript
_stlHas(c)     // 정산 가능 여부 (상품별 필수값 존재 확인)
_stlAmt(c)     // { actual, qty, eu, adc, amt, adcVat, buyAmt, buyVat, stlRate, agFee, prf, prfRate }
_campAdcost(c) // 조회·집계 화면 공용 광고비 (_stlAmt 재사용 + adcostFixed 단독입력 케이스 보정)
```

| 상품 | `adc` | `amt` |
|---|---|---|
| 문자류 | `adcostFixed ?? 정산수량 × sellUnit` | `amtFixed ?? 정산수량 × eu` |
| DA·IPTV | `daAdcost` | = adc |
| 퍼미션콜 | `pcAgree × pcAdvUnit` | = adc |
| CPA | `adcostFixed \|\| (db\|\|qty) × sellUnit` | = adc |
| **CPS** | `cpsFinalSales` (거래액) | `cpsTotalComm` (총수수료) |

- **정산 화면 기준값** = `amt ?? adc` (할인단가 반영)
- **조회·집계 화면 기준값** = `_campAdcost(c)` (CPS만 `amt`, 나머지 `adc`)
- `_stlHas()`는 `qty`/`sellUnit`(또는 CPA의 `db`/`qty`) 존재 여부만 보므로, 그 기준 필드가 0인데
  `adcostFixed`만 수동입력해둔 캠페인을 놓친다 — `_campAdcost()`는 이 경우를 우회 보정한다.

---

## 5. `deleted_campaigns` — 삭제된 캠페인

문서 ID: `del_{c.id}_{timestamp}`

campaigns 컬렉션과 동일한 필드 + 아래 추가:

| 필드 | 타입 | 설명 |
|------|------|------|
| deletedAt | string | 삭제 일시 (ISO 8601) |
| deletedBy | string | 삭제자 이름 |

---

## 6. `sellers` — 매출처 (광고주/대행사/랩사)

문서 ID: `s.company` (슬래시 → 언더스코어)

| 필드 | 타입 | 설명 |
|------|------|------|
| type | string | `광고주` \| `대행사` \| `랩사` |
| company | string | 업체명 |
| agrate | number | 수수료율 (대행사/랩사 전용) |
| brands | array | 브랜드 목록 `[{ name, cat }]` — **`campaigns.content`의 소스** |

> 브랜드 선택 시 `cat`(업종)이 캠페인에 자동 상속된다.

---

## 7. `media` — 매체사

문서 ID: `m.company` (슬래시 → 언더스코어)

| 필드 | 타입 | 설명 |
|------|------|------|
| company | string | 매체사명 |
| type | string | `매체사` |
| active | boolean | 활성 여부 |
| invoiceTo | string | 청구처 (법인명/상호명) |
| unit | number | 단가 |
| c1Base / c1Req / c1Adj / c1Reason | number/string | 수수료1 기준·요청·조정·사유 |
| note1 | string | 메모1 |
| c2Base / c2Req / c2Adj / c2Reason | number/string | 수수료2 기준·요청·조정·사유 |
| note2 | string | 메모2 |
| excTarget | string | 예외 대상 |
| excAdj | number | 예외 조정 |
| cpsRate | number | CPS 수수료율 (쿠팡용, %) |
| naverCpsRate | number | CPS 수수료율 (네이버용, %) |
| contact | string | 담당자 |
| tel | string | 연락처 |
| bankHolder / bankName / bankAccount | string | 예금주·은행·계좌 |
| createdAt | string | 등록일 |

---

## 8. `mediaLogs` — 매체사 수정 이력

문서 ID: 자동생성 (add)

| 필드 | 타입 | 설명 |
|------|------|------|
| company | string | 매체사명 |
| changedBy | string | 변경자 이름 |
| changedAt | string | 변경 일시 (ISO 8601) |
| changes | array | 변경 항목 `[{ field, label, before, after }]` |

---

## 9. ~~`pipeline` — 영업 파이프라인~~ 🚫 폐기

> **사용하지 않는 컬렉션.** 영업 파이프라인 메뉴는 폐기 확정되어 UI가 주석 처리되었다(2026-07-10).
> **코드는 삭제하지 않고 그대로 남겨두기로 결정함** — `PIPELINE_DATA`가 캠페인 등록 로직
> (`submitReg()`의 `_pendingPipelineConvertId`/`convertedCampaignId`, 파이프라인→캠페인 전환 기능)과
> 얽혀있어 단순 삭제가 어렵기 때문. 신규 개발 시 이 컬렉션 및 관련 코드(`renderPipeline`
> `savePipelineCard` `convertToCampaign` 등)를 참조하지 말 것. **실수로 삭제하지도 말 것** —
> 캠페인 등록 로직이 함께 깨진다.

<details>
<summary>레거시 필드 (참고용)</summary>

문서 ID: `p.id` (`P-YYYY-N`)
`id` `bonbu` `dept` `stage`(MAKEUP\|POTENTIAL\|COMMITMENT\|ACTUAL) `month` `cat` `seller` `brand` `media` `product` `estQty` `estAmt` `memo` `tags` `linkedCampaignId` `archived` `convertedCampaignId` `createdAt`

</details>

---

## 10. `settings` — 설정

문서 ID가 고정된 **4종의 문서**로 구성된다.

### 10-1. `settings/kpi_targets_{year}` — KPI 목표 (연도별)

KPI 메뉴에서 사용. 본부·팀 단위 **매출(이익) 목표**를 월별로 관리.

```
{
  year: '2026',
  bonbus: [
    {
      name: '1본부',
      teams: [
        {
          name: '1팀',
          category: '',
          months: [
            { month: '01', target: 0, prevYear: 0, salesTarget: 0 },
            ... 12개월
          ]
        }
      ]
    }
  ]
}
```

- 실적은 저장하지 않고 `_kpiCalcActual()`이 `DATA`에서 `_stlAmt(c).prf` 합계로 산출
- 편집 권한: `isAdmin` 또는 `대표이사`·`이사`·`본부장`

### 10-2. `settings/bep_scenario` — BEP 시나리오

```
{ asis: { ... } }
```

### 10-3. `settings/bep_monthly_{year}` — BEP 월별 (연도별)

```
{ year: '2026', months: { '01': { sga: 0 }, ... } }
```

### 10-4. ~~`settings/pipeline_targets`~~ 🚫 폐기

영업 파이프라인 목표. 메뉴 폐기와 함께 미사용.

<details>
<summary>레거시 구조 (참고용)</summary>

```
{
  depts: [ { name, rows: [{ stage, months: [{ t, a }], total }], sub: [...] } ],
  grand: { name: '광고본부', rows, total }
}
```

</details>

---

## 11. `taxInvoices` — 세금계산서

문서 ID: `String(t.id)` (숫자 ID를 문자열로)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 세금계산서 ID |
| groupId | number\|null | 그룹 ID (묶음 발행 시). 없는 구버전 항목은 `id`를 groupId로 취급 |
| correctionOf | number\|null | 수정발행 시 원본 groupId 참조. 있으면 원본은 대체(취소)된 것으로 간주 |
| taxType | string | `adv` (광고주) \| `media` (매체사) |
| company | string | 업체명 (= 매체사명 or 매출처명) |
| bizName | string | 상호명/법인명 (invoiceTo) |
| createdBy | string | 최초 등록자 이름 (수정발행 시에도 원본 등록자 유지) |
| manager | string | 담당자 이름 |
| month | string | 집행월 (`YYYY년M월`) |
| reqDate | string | 요청일 |
| issueDate | string | 발행일 |
| taxStatus | string | 발행 상태 (`''` 미완료 \| `완료`) |
| payDue | string | 입금 기한 |
| paid | string\|null | 입금 완료 여부 (`완료` \| `null`) |
| payInDate | string\|null | 입금 완료일 |
| unpaid | number\|null | 미입금액 (레거시, 입금완료 처리 시 0으로 리셋) |
| content | string | 품목 |
| supplyAmt | number | 공급가액 |
| vatAmt | number | 부가세 포함 합계액 (`supplyAmt * 1.1` 반올림) |
| contactEmail | string | 담당자 이름/이메일 |
| memo | string | 메모 |
| isRef | boolean | 캠페인 연결로 자동생성된 참조 항목 여부 |
| campaignId | string\|null | 연결된 캠페인 ID |

> `createdAt` 필드는 저장하지 않음 (등록/발행 시각은 `reqDate`/`issueDate`로 관리).
> 수정발행 시 원본 문서는 그대로 둔 채 `correctionOf`로 새 groupId 문서를 추가 저장 — 원본은 `taxDeleteLog`에 사유 `수정`으로 기록 후 삭제.

---

## 12. `taxDeleteLog` — 세금계산서 삭제 이력

문서 ID: 자동생성 (add)

| 필드 | 타입 | 설명 |
|------|------|------|
| deletedAt | string | 삭제 일시 (ISO 8601) |
| deletedBy | string | 삭제자 이름 |
| taxId | number | 원본 세금계산서 ID |
| groupId | string\|null | 그룹 ID |
| taxType | string | `adv` \| `media` |
| company | string | 업체명 |
| bizName | string | 상호명/법인명 |
| month | string | 집행월 |
| content | string | 품목 |
| supplyAmt | number | 공급가액 |
| isRef | boolean | 참조 항목 여부 (항상 false, isRef=true는 저장 안 함) |
| campaignId | string\|null | 연결된 캠페인 ID |

---

## 13. `invoiceImages` — 계산서 이미지

문서 ID: `campaignId`

| 필드 | 타입 | 설명 |
|------|------|------|
| images | array | Base64 이미지 문자열 배열 |
| updatedAt | string | 수정 일시 (ISO 8601) |

> 구버전 호환: `{ data: '...' }` 단일 필드 형태도 읽기 가능 (배열로 변환)
> 클라이언트에서 canvas 리사이즈 + JPEG 압축 후 Base64로 저장한다.
> Firestore 문서 1MB 제한이 있으므로 이미지 수·해상도에 주의.

---

## 14. `notifications` — 알림

문서 ID: `notif_{timestamp}_{random}`

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 알림 ID |
| toUserId | string | 수신자 사용자 ID |
| type | string | 알림 유형 |
| body | string | 알림 내용 텍스트 |
| createdAt | string | 생성 일시 (ISO 8601) |
| read | boolean | 읽음 여부 |

**현재 사용 중인 type:**
`tax_issue` `tax_issue_cancel` `tax_payment` `tax_payment_cancel` `tax_new`

**저장 함수:** `_fbSaveNotification(toUserId, type, body)`

---

## 15. `screenVisits` — 화면 방문 기록 🆕

문서 ID: 자동생성 (add)

| 필드 | 타입 | 설명 |
|------|------|------|
| screen | string | 화면 키 (`dashboard` `campaigns` 등) |
| userId | string | 사용자 ID |
| enterAt | Date | 진입 시각 |
| durationSec | number | 체류 시간(초) |
| date | string | 날짜 (`YYYY-MM-DD`) |

> 관리자(`isAdmin`) 사용 기록은 집계에서 제외된다.
> 30초 주기로 flush.

---

## 16. `screenStatsDaily` — 일자별 화면 통계 🆕

문서 ID: 날짜 (`YYYY-MM-DD`)

```
{
  [screen]: {
    visitCount: number,        // 방문 횟수
    totalDurationSec: number,  // 총 체류시간(초)
    totalLoadMs: number,       // 총 로딩시간(ms)
    loadSampleCount: number    // 로딩시간 샘플 수
  }
}
```

> `FieldValue.increment` + `merge: true` 로 누적 갱신.

---

## 17. `filterStatsDaily` — 일자별 필터 사용 통계 🆕

문서 ID: 날짜 (`YYYY-MM-DD`)

```
{
  [screen]: {
    searchTextUsedCount: number,          // 텍스트 검색 사용 횟수
    filters: { [field]: { [value]: number } }  // 필터 항목·값별 선택 횟수
  }
}
```

---

## 18. `errorStatsDaily` — 일자별 에러 통계 🆕

문서 ID: 날짜 (`YYYY-MM-DD`)

```
{ [screen]: { [errorLabel]: number } }
```

> 에러 집계 자체의 실패는 조용히 무시된다 (무한루프 방지).

---

## 19. `actionStatsDaily` — 일자별 액션 통계 🆕

문서 ID: 날짜 (`YYYY-MM-DD`)

```
{ [actionLabel]: number }
```

> 액션 라벨은 코드 상수 `USAGE_ACTION_LABELS`에 정의.
> 기록 함수: `_usageLogAction(label)`

---

## 컬렉션 요약

| # | 컬렉션 | 용도 | 실시간 구독 | 비고 |
|---|--------|------|:-----------:|------|
| 1 | `users` | 사용자 계정 | ✓ | |
| 2 | `loginHistory` | 로그인 기록 | — | |
| 3 | `history` | 캠페인 수정 이력 | — | 이름 선점됨 |
| 4 | `campaigns` | 캠페인 데이터 | ✓ | 전역 `DATA[]` |
| 5 | `deleted_campaigns` | 삭제 캠페인 보관 | — | |
| 6 | `sellers` | 매출처(광고주/대행사/랩사) | ✓ | 전역 `SELLER_DATA[]` |
| 7 | `media` | 매체사 | ✓ | 전역 `MEDIA_DATA[]` |
| 8 | `mediaLogs` | 매체사 수정 이력 | — | |
| 9 | `pipeline` | 영업 파이프라인 | — | 🚫 **폐기** (코드는 등록로직과 얽혀있어 유지) |
| 10 | `settings` | KPI 목표·BEP (문서 4종) | ✓ | |
| 11 | `taxInvoices` | 세금계산서 | ✓ | |
| 12 | `taxDeleteLog` | 세금계산서 삭제이력 | — | |
| 13 | `invoiceImages` | 계산서 첨부 이미지 | — | Base64 |
| 14 | `notifications` | 사용자 알림 | ✓ (per user) | |
| 15 | `screenVisits` | 화면 방문 기록 | — | 🆕 |
| 16 | `screenStatsDaily` | 일자별 화면 통계 | — | 🆕 |
| 17 | `filterStatsDaily` | 일자별 필터 통계 | — | 🆕 |
| 18 | `errorStatsDaily` | 일자별 에러 통계 | — | 🆕 |
| 19 | `actionStatsDaily` | 일자별 액션 통계 | — | 🆕 |

---

## 신규 개발 시 주의사항

1. **컬렉션명 `history`는 사용 불가** — 캠페인 수정 이력이 선점
2. **금액 계산은 `_stlAmt()` / `_stlHas()` / `_campAdcost()` 재사용** — 직접 계산 금지
3. **조직 귀속은 `ops` → `USERS` 조인이 기본** — `campaigns.dept`는 매칭 실패 시 폴백일 뿐
4. **브랜드는 `campaigns.content`** — 신규 필드 생성 금지
5. **캠페인 상태는 4단계**, 상품별 초기값 상이
6. **`target`/`dtarget`은 타겟팅 조건** — KPI 목표 아님
7. **`disc`는 대체 단가** — 차감 금액 아님
8. **`pipeline` 관련 일체 참조·삭제 금지** — 폐기 확정이지만 코드는 캠페인 등록 로직과 얽혀있어 그대로 유지
9. **신규 화면 추가 시 3곳 등록 필요** — `goScreen()`의 `navIds` / `labels` / 상수 `USAGE_SCREEN_LABELS`
