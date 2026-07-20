import { useEffect, useMemo, useState } from 'react';
import type { Festival, FestivalData, Status } from './types';
import { statusOf, dday } from './types';
import FestivalMap from './FestivalMap';
import MonthChart from './MonthChart';

const SIDO_ORDER = [
  '서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종',
  '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주',
];

const STATUS_LABEL: Record<Status, string> = { ongoing: '진행 중', upcoming: '예정', ended: '종료' };

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const isDark = theme
    ? theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDark, toggle: () => setTheme(isDark ? 'light' : 'dark') };
}

export default function App() {
  const [data, setData] = useState<FestivalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sido, setSido] = useState('전체');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState<Festival | null>(null);
  const { isDark, toggle } = useTheme();

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}festivals.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('데이터를 불러오지 못했습니다'))))
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.festivals.filter((f) => {
      if (sido !== '전체' && f.sido !== sido) return false;
      if (statusFilter !== 'all' && statusOf(f, today) !== statusFilter) return false;
      if (q && !(`${f.title} ${f.sido} ${f.sigungu ?? ''} ${f.addr}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, query, sido, statusFilter, today]);

  const kpi = useMemo(() => {
    const all = data?.festivals ?? [];
    const thisMonth = today.slice(0, 7);
    return {
      total: all.length,
      ongoing: all.filter((f) => statusOf(f, today) === 'ongoing').length,
      thisMonth: all.filter((f) => f.startDate.slice(0, 7) === thisMonth || (f.startDate <= today && f.endDate >= today)).length,
      regions: new Set(all.map((f) => f.sido)).size,
    };
  }, [data, today]);

  const regions = useMemo(() => {
    const present = new Set((data?.festivals ?? []).map((f) => f.sido));
    return SIDO_ORDER.filter((s) => present.has(s));
  }, [data]);

  if (error) return <div className="app"><div className="empty">⚠️ {error}</div></div>;
  if (!data) return <div className="app"><div className="empty">불러오는 중…</div></div>;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🎪 전국 축제 대시보드</h1>
          <div className="sub">
            휴가철 지역 축제·행사를 지도와 캘린더로 한눈에 · 총 {data.count.toLocaleString()}건
          </div>
        </div>
        <button className="theme-toggle" onClick={toggle}>
          {isDark ? '☀️ 라이트' : '🌙 다크'}
        </button>
      </header>

      <section className="kpi-row">
        <div className="kpi accent">
          <div className="label">지금 진행 중</div>
          <div className="value">{kpi.ongoing}<span className="unit">건</span></div>
        </div>
        <div className="kpi accent2">
          <div className="label">이번 달</div>
          <div className="value">{kpi.thisMonth}<span className="unit">건</span></div>
        </div>
        <div className="kpi">
          <div className="label">전체 등록</div>
          <div className="value">{kpi.total.toLocaleString()}<span className="unit">건</span></div>
        </div>
        <div className="kpi">
          <div className="label">커버 지역</div>
          <div className="value">{kpi.regions}<span className="unit">개 시·도</span></div>
        </div>
      </section>

      <div className="filters">
        <input
          type="search"
          placeholder="축제명·지역 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="region-select" value={sido} onChange={(e) => setSido(e.target.value)}>
          <option value="전체">전체 지역</option>
          {regions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(['all', 'ongoing', 'upcoming', 'ended'] as const).map((s) => (
          <button
            key={s}
            className={`chip ${s !== 'all' ? `status-${s}` : ''}`}
            aria-pressed={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="main-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>지도</h2>
            <span className="hint">{filtered.filter((f) => f.lat != null).length}개 표시 · 핀 클릭 시 목록 강조</span>
          </div>
          <FestivalMap festivals={filtered} today={today} selected={selected} onSelect={setSelected} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>목록</h2>
            <span className="hint">{filtered.length}건</span>
          </div>
          <div className="list">
            {filtered.length === 0 ? (
              <div className="empty">조건에 맞는 축제가 없습니다.</div>
            ) : (
              filtered.slice(0, 300).map((f) => {
                const status = statusOf(f, today);
                const d = dday(f, today);
                return (
                  <div
                    key={f.id}
                    className={`card ${selected?.id === f.id ? 'selected' : ''}`}
                    onClick={() => setSelected(f)}
                  >
                    {f.thumb || f.image ? (
                      <img className="thumb" src={f.thumb ?? f.image ?? ''} alt="" loading="lazy" />
                    ) : (
                      <div className="thumb placeholder">🎪</div>
                    )}
                    <div className="body">
                      <div className="title">{f.title}</div>
                      <div className="meta">
                        {f.sido} {f.sigungu ?? ''} · {f.startDate.slice(5)} ~ {f.endDate.slice(5)}
                      </div>
                      <div className="badges">
                        <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>
                        {status === 'upcoming' && d >= 0 ? (
                          <span className="dday">D{d === 0 ? '-DAY' : `-${d}`}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="panel-head">
          <h2>월별 분포</h2>
          <span className="hint">향후 12개월 · 현재 필터 기준 {filtered.length}건</span>
        </div>
        <MonthChart festivals={filtered} today={today} />
      </div>

      <div className="footer">
        데이터 출처: {data.source}<br />
        최종 갱신: {new Date(data.updatedAt).toLocaleString('ko-KR')} · 매일 자동 수집 ·{' '}
        <a href="https://github.com/heekeunlee/korea_festival">GitHub</a>
      </div>
    </div>
  );
}
