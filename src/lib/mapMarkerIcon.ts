import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import {
  Coffee,
  Cross,
  MapPin,
  PawPrint,
  Scissors,
  Store,
  Trees,
} from "lucide-react";

const getMarkerSymbol = (type: string) => {
  switch (type) {
    case "Vet Clinic":
      return Cross;
    case "Pet Shop":
      return Store;
    case "Park":
      return Trees;
    case "Grooming Salon":
      return Scissors;
    case "Pet Friendly Cafe":
      return Coffee;
    case "Pet Sitter":
    case "Pet Walker":
      return PawPrint;
    default:
      return MapPin;
  }
};

export const createMapMarkerIcon = (type: string, active = false) => {
  const Icon = getMarkerSymbol(type);
  const iconMarkup = renderToStaticMarkup(
    createElement(Icon, {
      size: active ? 20 : 18,
      strokeWidth: active ? 2.5 : 2.25,
    })
  );

  const size = active ? 44 : 38;
  const innerSize = active ? 24 : 22;
  const ring = active
    ? "border:2px solid hsl(var(--primary));box-shadow:0 8px 18px hsl(var(--foreground) / 0.22);"
    : "border:1px solid hsl(var(--border));box-shadow:0 4px 12px hsl(var(--foreground) / 0.16);";

  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:999px;background:hsl(var(--card));color:hsl(var(--foreground));${ring}"><div style="display:flex;align-items:center;justify-content:center;width:${innerSize}px;height:${innerSize}px;">${iconMarkup}</div></div>`,
    className: "map-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};
