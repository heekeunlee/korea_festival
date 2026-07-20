import type { Festival } from './types';

interface Props {
  festivals: Festival[];
  today: string;
}

// 향후 12개월간 시작하는 축제 수를 월별 막대로 보여준다. 현재 달은 강조색.
export default function MonthChart({ festivals, today }: Props) {
  const now = new Date(today + 'T00:00:00');
  const months: { key: string; label: string; current: boolean }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: `${d.getMonth() + 1}월`, current: i === 0 });
  }
  const counts = months.map((m) => festivals.filter((f) => f.startDate.slice(0, 7) === m.key).length);
  const max = Math.max(1, ...counts);

  return (
    <div className="chart">
      <div className="bars" role="img" aria-label="월별 축제 시작 수">
        {months.map((m, i) => (
          <div className={`bar-col ${m.current ? 'current' : ''}`} key={m.key} title={`${m.label} ${counts[i]}건`}>
            <span className="cnt">{counts[i] || ''}</span>
            <div className="bar" style={{ height: `${(counts[i] / max) * 100}%` }} />
            <span className="lbl">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
