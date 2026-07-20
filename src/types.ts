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
  link?: string | null;   // 공식/지정 링크(수동 보강분). 없으면 검색 링크를 생성한다.
  source?: string;        // 'tourapi' | 'manual' 등 출처
}

// 카드 '바로가기' 링크: 지정 링크가 있으면 그대로, 없으면 네이버 통합검색으로.
export function infoLink(f: Festival): string {
  if (f.link) return f.link;
  const q = encodeURIComponent(`${f.title} ${f.sido} ${f.sigungu ?? ''}`.trim());
  return `https://search.naver.com/search.naver?query=${q}`;
}

// 지도 링크: 좌표가 있으면 카카오맵 위치로, 없으면 장소명 검색으로.
export function mapLink(f: Festival): string {
  if (f.lat != null && f.lng != null) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(f.title)},${f.lat},${f.lng}`;
  }
  return `https://map.kakao.com/link/search/${encodeURIComponent(`${f.sido} ${f.title}`)}`;
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
