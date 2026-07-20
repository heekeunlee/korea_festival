export interface Festival {
  id: string;
  title: string;
  sido: string;
  sigungu: string | null;
  addr: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  lat: number | null;
  lng: number | null;
  image: string | null;
  thumb: string | null;
  tel: string | null;
}

export interface FestivalData {
  updatedAt: string;
  source: string;
  count: number;
  festivals: Festival[];
}

export type Status = 'ongoing' | 'upcoming' | 'ended';

export function statusOf(f: Festival, today: string): Status {
  if (f.endDate < today) return 'ended';
  if (f.startDate > today) return 'upcoming';
  return 'ongoing';
}

export function dday(f: Festival, today: string): number {
  const a = new Date(today + 'T00:00:00');
  const b = new Date(f.startDate + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
