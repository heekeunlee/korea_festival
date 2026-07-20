import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Festival, Status } from './types';
import { statusOf } from './types';

function pinIcon(status: Status) {
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin ${status}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

// 선택된 축제로 지도를 이동시키는 헬퍼 컴포넌트
function FlyTo({ festival }: { festival: Festival | null }) {
  const map = useMap();
  useEffect(() => {
    if (festival?.lat && festival?.lng) {
      map.flyTo([festival.lat, festival.lng], 11, { duration: 0.6 });
    }
  }, [festival, map]);
  return null;
}

interface Props {
  festivals: Festival[];
  today: string;
  selected: Festival | null;
  onSelect: (f: Festival) => void;
}

export default function FestivalMap({ festivals, today, selected, onSelect }: Props) {
  const withCoords = festivals.filter((f) => f.lat != null && f.lng != null);
  return (
    <MapContainer center={[36.3, 127.8]} zoom={7} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo festival={selected} />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
        {withCoords.map((f) => {
          const status = statusOf(f, today);
          return (
            <Marker
              key={f.id}
              position={[f.lat!, f.lng!]}
              icon={pinIcon(status)}
              eventHandlers={{ click: () => onSelect(f) }}
            >
              <Popup>
                <div className="popup-title">{f.title}</div>
                <div className="popup-meta">
                  {f.sido} {f.sigungu ?? ''}
                  <br />
                  {f.startDate} ~ {f.endDate}
                  {f.tel ? (
                    <>
                      <br />
                      {f.tel}
                    </>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
