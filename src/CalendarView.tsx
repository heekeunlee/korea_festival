import type { Festival } from './types';

interface Props {
  festivals: Festival[]; // 지역·검색만 적용된 목록(날짜 필터는 캘린더가 담당)
  month: string; // 'YYYY-MM'
  onMonth: (m: string) => void;
  onPick: (date: string) => void;
  today: string;
  from: string;
  to: string;
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView({ festivals, month, onMonth, onPick, today, from, to }: Props) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = new Date(y, m - 1, 1).getDay();

  const ds = (d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const onDay = (s: string) => festivals.filter((f) => f.startDate <= s && f.endDate >= s);

  const shift = (delta: number) => {
    const nm = new Date(y, m - 1 + delta, 1);
    onMonth(`${nm.getFullYear()}-${String(nm.getMonth() + 1).padStart(2, '0')}`);
  };

  const counts = Array.from({ length: daysInMonth }, (_, i) => onDay(ds(i + 1)).length);
  const maxCount = Math.max(1, ...counts);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => shift(-1)} aria-label="이전 달">‹</button>
        <strong>{y}년 {m}월</strong>
        <button className="cal-nav" onClick={() => shift(1)} aria-label="다음 달">›</button>
      </div>
      <div className="cal-grid cal-wd">
        {WD.map((w, i) => (
          <div key={w} className={`cal-wdc ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>{w}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} className="cal-cell empty" />;
          const s = ds(d);
          const items = onDay(s);
          const inRange = !!from && !!to && s >= from && s <= to;
          const isToday = s === today;
          const intensity = items.length / maxCount;
          return (
            <button
              key={s}
              className={`cal-cell ${isToday ? 'today' : ''} ${inRange ? 'inrange' : ''}`}
              style={{ ['--i' as string]: intensity }}
              onClick={() => onPick(s)}
              title={`${m}/${d} · ${items.length}건`}
            >
              <span className="cal-date">{d}</span>
              {items.length > 0 && <span className="cal-count">{items.length}</span>}
              <span className="cal-titles">
                {items.slice(0, 2).map((f) => (
                  <span key={f.id} className="cal-ev">{f.title}</span>
                ))}
                {items.length > 2 && <span className="cal-more">+{items.length - 2}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
