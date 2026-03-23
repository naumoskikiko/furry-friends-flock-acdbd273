import L from "leaflet";

export const createUserLocationIcon = () =>
  L.divIcon({
    html: `<div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:-6px;border-radius:50%;background:hsl(217,90%,60%);opacity:0.2;animation:user-loc-pulse 2s ease-out infinite;"></div>
      <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:hsl(217,90%,55%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
    </div>`,
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
