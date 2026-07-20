# 🏖️ 방구석 탈출 지도

전국 지자체의 축제·행사를 지도와 캘린더로 한눈에 보는 휴가 계획용 탐색 도구.

**🔗 배포:** https://heekeunlee.github.io/korea_festival/

## 기능

- **지도** — 전국 축제를 클러스터 마커로 표시 (진행 중/예정/종료 색상 구분)
- **KPI** — 지금 진행 중, 이번 달, 전체 등록, 커버 지역 수
- **필터** — 축제명·지역 검색, 시·도 선택, 진행 상태
- **목록** — 포스터 썸네일 · D-day · 상태 배지
- **월별 분포 차트** — 향후 12개월 축제 시작 분포
- 라이트/다크 모드, 반응형

## 데이터

- 출처: **[한국관광공사 TourAPI](https://www.data.go.kr/data/15101578/openapi.do)** (`searchFestival2`), data.go.kr
- 이미지·위경도·법정동코드 포함, 약 900건
- `scripts/collect.mjs` 가 수집·정규화하여 `data/festivals.json` 생성
- GitHub Actions 가 **매일 06:00 KST** 자동 갱신 후 재배포
- 지역 분류: TourAPI가 전남·광주를 `전남광주통합특별시`로 통합 표기하므로,
  시군구 접미어(자치'구'=광주 / 시·군=전남)로 분기한다.

### 수동 보강 (`data/supplement.json`)

TourAPI에 없는 소지역·소규모 축제는 이 파일에 추가하면 매일 자동 수집 시에도
보존·병합된다(자동 수집이 덮어쓰지 않음). 항목 형식:

```json
{
  "title": "2026 OO축제", "sido": "충북", "sigungu": "영동군",
  "addr": "…", "startDate": "2026-08-27", "endDate": "2026-08-30",
  "lat": null, "lng": null,
  "link": "https://place.map.kakao.com/…", "source": "manual"
}
```

- **개최일자를 반드시 검증**한 항목만 등록(대시보드가 날짜 기반).
- 같은 `제목+시작월`이 TourAPI에 이미 있으면 자동으로 중복 제거된다.
- 좌표는 네이버 지역검색으로 확인된 경우만 채우고, 미확인은 `null` + `link`로 대체.

## 로컬 개발

```bash
npm install
DATA_GO_KR_KEY=<발급키> npm run collect   # 데이터 갱신 (선택)
npm run dev                                # 개발 서버
npm run build && npm run preview           # 프로덕션 빌드 확인
```

## 배포 설정

1. **Settings → Secrets and variables → Actions** 에 `DATA_GO_KR_KEY` 등록
   (data.go.kr 일반 인증키 Decoding 값)
2. **Settings → Pages → Source** 를 **GitHub Actions** 로 설정
3. `main` 브랜치 push 또는 매일 크론에 배포됨

## 기술 스택

React · TypeScript · Vite · Leaflet (OpenStreetMap) · GitHub Actions / Pages
