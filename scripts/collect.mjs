// TourAPI(한국관광공사)에서 축제/행사 정보를 수집하고,
// data/supplement.json(수동 보강분)과 병합해 data/festivals.json 으로 정규화한다.
//
// 수동 보강분(크롬/네이버 MCP 등으로 수집)은 별도 파일로 두어
// 매일 도는 자동 수집에 덮어써지지 않고 항상 병합된다.
import { writeFile, readFile } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) {
  console.error('DATA_GO_KR_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const BASE = 'https://apis.data.go.kr/B551011/KorService2/searchFestival2';
const ROWS = 100;

// 주소 접두어 -> 표시 시도명. 긴 접두어를 먼저 두어 오매칭을 막는다.
// 주의: TourAPI 는 최근 행정통합을 반영해 전남·광주 주소를 모두
// "전남광주통합특별시 …"로 내려준다(법정동코드도 12로 통합). 이 경우
// 시군구 접미어로 광주(자치'구')와 전남(시·군)을 분기한다 → parseRegion.
const SIDO_ALIAS = [
  ['서울', '서울'], ['부산', '부산'], ['대구', '대구'], ['인천', '인천'],
  ['광주', '광주'], ['대전', '대전'], ['울산', '울산'], ['세종', '세종'],
  ['경기', '경기'], ['충청북도', '충북'], ['충북', '충북'],
  ['충청남도', '충남'], ['충남', '충남'], ['전라남도', '전남'], ['전남', '전남'],
  ['경상북도', '경북'], ['경북', '경북'], ['경상남도', '경남'], ['경남', '경남'],
  ['제주', '제주'], ['강원', '강원'], ['전라북도', '전북'], ['전북', '전북'],
];

function parseRegion(addr) {
  const a = (addr || '').trim();
  const rest = a.split(/\s+/).slice(1);
  const sigungu = rest.find((t) => /[시군구]$/.test(t)) || null;

  let sido = null;
  if (a.startsWith('전남광주통합특별시')) {
    // 자치구('구')는 광주, 그 외 시·군은 전남
    sido = sigungu && /구$/.test(sigungu) ? '광주' : '전남';
  } else {
    for (const [needle, name] of SIDO_ALIAS) {
      if (a.startsWith(needle)) { sido = name; break; }
    }
  }
  return { sido, sigungu };
}

const ymd = (s) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);

// 원본 날짜 오류 정제: 종료일이 시작일보다 앞서면(지자체 입력 오타)
// 종료일을 시작일로 맞춘다. 종료일이 없으면 시작일과 동일하게 둔다.
function cleanDates(startDate, endDate) {
  if (!endDate) return { startDate, endDate: startDate, fixed: false };
  if (endDate < startDate) return { startDate, endDate: startDate, fixed: true };
  return { startDate, endDate, fixed: false };
}

async function fetchPage(pageNo, eventStartDate) {
  const qs = new URLSearchParams({
    serviceKey: KEY, MobileOS: 'ETC', MobileApp: 'korea-festival',
    _type: 'json', arrange: 'A', eventStartDate,
    numOfRows: String(ROWS), pageNo: String(pageNo),
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}?${qs}`, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const header = json?.response?.header;
      if (header?.resultCode !== '0000') throw new Error(`API ${header?.resultCode}: ${header?.resultMsg}`);
      return json.response.body;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// 과거 1년 ~ 미래 전체를 훑기 위해 1년 전부터 시작한다.
const start = new Date();
start.setFullYear(start.getFullYear() - 1);
const eventStartDate = start.toISOString().slice(0, 10).replace(/-/g, '');

const raw = [];
let pageNo = 1;
let total = Infinity;
while (raw.length < total) {
  const body = await fetchPage(pageNo, eventStartDate);
  total = body.totalCount;
  const items = body.items?.item ?? [];
  if (!items.length) break;
  raw.push(...items);
  process.stderr.write(`\r수집 중: ${raw.length}/${total}`);
  pageNo += 1;
}
process.stderr.write('\n');

const seen = new Set();
const festivals = [];
let dateFixes = 0;
for (const it of raw) {
  if (seen.has(it.contentid)) continue;
  seen.add(it.contentid);
  const { sido, sigungu } = parseRegion(it.addr1);
  const startDate = ymd(it.eventstartdate);
  if (!startDate || !sido) continue; // 날짜나 지역 없으면 대시보드에서 쓸 수 없다
  const { endDate, fixed } = cleanDates(startDate, ymd(it.eventenddate));
  if (fixed) dateFixes += 1;
  festivals.push({
    id: it.contentid,
    title: (it.title || '').trim(),
    sido, sigungu,
    addr: [it.addr1, it.addr2].filter(Boolean).join(' ').trim(),
    startDate, endDate,
    lat: it.mapy ? Number(it.mapy) : null,
    lng: it.mapx ? Number(it.mapx) : null,
    image: it.firstimage || null,
    thumb: it.firstimage2 || null,
    tel: (it.tel || '').trim() || null,
    link: null,          // TourAPI 는 공식 홈페이지를 안 주므로 프론트에서 검색 링크 생성
    source: 'tourapi',
  });
}

// ---- 수동 보강분 병합 ----
let supCount = 0;
try {
  const supRaw = await readFile(new URL('../data/supplement.json', import.meta.url), 'utf8');
  const sup = JSON.parse(supRaw);
  const items = Array.isArray(sup) ? sup : sup.festivals ?? [];
  // 이미 있는 축제(같은 제목+시작월)는 건너뛰어 중복을 막는다.
  const key = (f) => `${f.title.replace(/\s+/g, '')}|${f.startDate.slice(0, 7)}`;
  const existing = new Set(festivals.map(key));
  for (const s of items) {
    const startDate = s.startDate;
    if (!startDate || !s.sido || !s.title) continue;
    const { endDate } = cleanDates(startDate, s.endDate);
    const f = {
      id: s.id || `sup-${supCount + 1}`,
      title: s.title.trim(),
      sido: s.sido, sigungu: s.sigungu ?? null,
      addr: s.addr ?? '',
      startDate, endDate,
      lat: s.lat ?? null, lng: s.lng ?? null,
      image: s.image ?? null, thumb: s.thumb ?? s.image ?? null,
      tel: s.tel ?? null,
      link: s.link ?? null,
      source: s.source ?? 'manual',
    };
    if (existing.has(key(f))) continue;
    existing.add(key(f));
    festivals.push(f);
    supCount += 1;
  }
} catch (err) {
  if (err.code !== 'ENOENT') console.warn('supplement 병합 경고:', err.message);
}

festivals.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));

const out = {
  updatedAt: new Date().toISOString(),
  source: 'TourAPI (한국관광공사) / data.go.kr + 수동 보강',
  count: festivals.length,
  festivals,
};
await writeFile(new URL('../data/festivals.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`완료: ${festivals.length}건 (TourAPI ${festivals.length - supCount} + 보강 ${supCount}, 날짜보정 ${dateFixes}건)`);
