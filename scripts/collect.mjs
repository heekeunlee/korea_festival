// TourAPI(한국관광공사)에서 축제/행사 정보를 수집해 data/festivals.json 으로 정규화한다.
import { writeFile } from 'node:fs/promises';

const KEY = process.env.DATA_GO_KR_KEY;
if (!KEY) {
  console.error('DATA_GO_KR_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const BASE = 'https://apis.data.go.kr/B551011/KorService2/searchFestival2';
const ROWS = 100;

// 법정동 시도코드 -> 표시명
const SIDO = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주',
  '30': '대전', '31': '울산', '36': '세종', '41': '경기', '43': '충북',
  '44': '충남', '46': '전남', '47': '경북', '48': '경남', '50': '제주',
  '51': '강원', '52': '전북',
};

// 주소 앞부분에서 시도/시군구를 뽑는다. lDongRegnCd 가 비는 건이 있어 주소를 우선 신뢰한다.
const SIDO_ALIAS = [
  ['서울', '서울'], ['부산', '부산'], ['대구', '대구'], ['인천', '인천'],
  ['광주', '광주'], ['대전', '대전'], ['울산', '울산'], ['세종', '세종'],
  ['경기', '경기'], ['충청북도', '충북'], ['충북', '충북'],
  ['충청남도', '충남'], ['충남', '충남'], ['전라남도', '전남'], ['전남', '전남'],
  ['경상북도', '경북'], ['경북', '경북'], ['경상남도', '경남'], ['경남', '경남'],
  ['제주', '제주'], ['강원', '강원'], ['전라북도', '전북'], ['전북', '전북'],
];

function parseRegion(addr, regnCd) {
  const a = (addr || '').trim();
  let sido = null;
  for (const [needle, name] of SIDO_ALIAS) {
    if (a.startsWith(needle)) { sido = name; break; }
  }
  if (!sido && regnCd && SIDO[regnCd]) sido = SIDO[regnCd];
  // 시군구: 주소 토큰 중 시/군/구로 끝나는 첫 토큰 (시도 토큰 제외)
  const tokens = a.split(/\s+/).slice(1);
  const sigungu = tokens.find((t) => /[시군구]$/.test(t)) || null;
  return { sido, sigungu };
}

const ymd = (s) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);

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
for (const it of raw) {
  if (seen.has(it.contentid)) continue;
  seen.add(it.contentid);
  const { sido, sigungu } = parseRegion(it.addr1, it.lDongRegnCd);
  const startDate = ymd(it.eventstartdate);
  const endDate = ymd(it.eventenddate);
  if (!startDate || !sido) continue; // 날짜나 지역 없으면 대시보드에서 쓸 수 없다
  festivals.push({
    id: it.contentid,
    title: (it.title || '').trim(),
    sido, sigungu,
    addr: [it.addr1, it.addr2].filter(Boolean).join(' ').trim(),
    startDate, endDate: endDate || startDate,
    lat: it.mapy ? Number(it.mapy) : null,
    lng: it.mapx ? Number(it.mapx) : null,
    image: it.firstimage || null,
    thumb: it.firstimage2 || null,
    tel: (it.tel || '').trim() || null,
  });
}

festivals.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));

const out = {
  updatedAt: new Date().toISOString(),
  source: 'TourAPI (한국관광공사) / data.go.kr',
  count: festivals.length,
  festivals,
};
await writeFile(new URL('../data/festivals.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`완료: ${festivals.length}건 (원본 ${raw.length}건)`);
