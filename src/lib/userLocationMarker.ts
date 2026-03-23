import L from "leaflet";

const USER_LOCATION_ICON = L.divIcon({
  html: `<div style="position:relative;width:24px;height:24px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:hsl(217,90%,60%);opacity:0.25;animation:pulse-ring 2s ease-out infinite;"></div>
    <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:hsl(217,90%,55%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>
  <style>
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.25; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  </style>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

let userMarker: L.Marker | null = null;

export const setUserLocationOnMap = (
  map: L.Map,
  lat: number,
  lng: number,
  animate = true
) => {
  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    userMarker = L.marker([lat, lng], {
      icon: USER_LOCATION_ICON,
      zIndexOffset: 1000,
      interactive: false,
    }).addTo(map);
  }

  map.flyTo([lat, lng], 16, {
    animate,
    duration: 1,
  });
};

export const removeUserLocationMarker = () => {
  if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }
};
