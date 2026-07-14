import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Prospect } from "../api";
import { StatusBadge } from "../components/shared/StatusBadge";

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Status → marker colour (using Leaflet's built-in colourisation via SVG DivIcon)
const STATUS_COLOURS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#f59e0b",
  qualified: "#8b5cf6",
  converted: "#22c55e",
  unqualified: "#a1a1aa",
};

function colourIcon(status: string) {
  const colour = STATUS_COLOURS[status] ?? "#3b82f6";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24S24 21 24 12C24 5.4 18.6 0 12 0z" fill="${colour}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

// Re-fit bounds when prospects change
function BoundsUpdater({ prospects }: { prospects: Prospect[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = prospects.filter((p) => p.location?.coordinates);
    if (pts.length === 0) return;
    const bounds = L.latLngBounds(
      pts.map((p) => [p.location!.coordinates[1], p.location!.coordinates[0]])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [prospects, map]);
  return null;
}

interface Props {
  prospects: Prospect[];
  onSelect: (p: Prospect) => void;
}

export default function ProspectsMap({ prospects, onSelect }: Props) {
  const mapped = prospects.filter((p) => p.location?.coordinates?.length === 2);

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm" style={{ height: 520 }}>
      {mapped.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-3 bg-zinc-50">
          <p className="text-sm text-zinc-400">No prospects with location data.</p>
          <p className="text-xs text-zinc-300">Set address coordinates when creating or editing a prospect to see them here.</p>
        </div>
      ) : (
        <MapContainer
          center={[48.8566, 2.3522]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsUpdater prospects={mapped} />
          {mapped.map((p) => (
            <Marker
              key={p._id}
              position={[p.location!.coordinates[1], p.location!.coordinates[0]]}
              icon={colourIcon(p.status)}
              eventHandlers={{ click: () => onSelect(p) }}
            >
              <Popup>
                <div className="min-w-[180px] space-y-1.5 py-1">
                  <p className="font-semibold text-zinc-900 text-sm leading-snug">
                    {p.firstName} {p.lastName}
                  </p>
                  {p.jobTitle && (
                    <p className="text-xs text-zinc-500">
                      {p.jobTitle}{p.company ? ` · ${p.company}` : ""}
                    </p>
                  )}
                  {p.email && <p className="text-xs text-zinc-400">{p.email}</p>}
                  <div className="pt-1">
                    <StatusBadge status={p.status} />
                  </div>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {p.tags.map((t) => (
                        <span key={t} className="text-[10px] bg-zinc-100 text-zinc-500 rounded-full px-1.5 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onSelect(p)}
                    className="mt-2 w-full text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors text-left"
                  >
                    View profile →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
