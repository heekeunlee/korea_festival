# 🎪 전국 축제 대시보드

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

> 광주 등 TourAPI 공백 지역은 추후 전국문화축제표준데이터
> (`tn_pubr_public_cltur_fstvl_api`) 어댑터를 추가해 보강 예정.

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
