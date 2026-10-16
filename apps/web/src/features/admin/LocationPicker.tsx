/**
 * Selector de ubicación con OpenStreetMap (sin API key). El marcador define
 * latitud/longitud que la API guarda en la sede y Android muestra al ciudadano.
 */
import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, X } from 'lucide-react';
import { InputField } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';

export interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

const CHIAPAS_CENTER: [number, number] = [16.7508, -93.1162];
const pinIcon = L.divIcon({
  className: 'location-pin',
  html: '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="#149381" stroke="#ffffff" stroke-width="1.4" d="M12 2a7.4 7.4 0 0 0-7.4 7.4c0 5.3 6.6 11.9 6.9 12.2a.7.7 0 0 0 1 0c.3-.3 6.9-6.9 6.9-12.2A7.4 7.4 0 0 0 12 2Zm0 10.2a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z"/></svg>',
  iconSize: [34, 34],
  iconAnchor: [17, 32],
});

function parseCoordinate(value: string) {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed;
}

export function LocationPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Coordinates;
  onChange: (next: Coordinates) => void;
  disabled?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const hasPoint = value.latitude !== null && value.longitude !== null;

  useEffect(() => {
    if (!container.current || map.current) return;
    const instance = L.map(container.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(hasPoint ? [value.latitude!, value.longitude!] : CHIAPAS_CENTER, hasPoint ? 15 : 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© colaboradores de OpenStreetMap',
    }).addTo(instance);
    instance.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    });
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
      marker.current = null;
    };
    // El mapa se crea una sola vez; el marcador se sincroniza en el efecto siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (hasPoint) {
      const point: [number, number] = [value.latitude!, value.longitude!];
      if (!marker.current) {
        marker.current = L.marker(point, { icon: pinIcon, draggable: !disabled }).addTo(instance);
        marker.current.on('dragend', () => {
          const position = marker.current!.getLatLng();
          onChangeRef.current({
            latitude: Number(position.lat.toFixed(6)),
            longitude: Number(position.lng.toFixed(6)),
          });
        });
      } else marker.current.setLatLng(point);
      if (instance.getZoom() < 13) instance.setView(point, 15);
      else instance.panTo(point);
    } else if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
  }, [hasPoint, value.latitude, value.longitude, disabled]);

  const search = async () => {
    const text = query.trim();
    if (!text || searching) return;
    setSearching(true);
    setSearchError('');
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'mx');
      url.searchParams.set('accept-language', 'es');
      url.searchParams.set('q', text);
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const results = (await response.json()) as { lat: string; lon: string }[];
      const first = results[0];
      if (!first) {
        setSearchError(
          'No se encontró esa dirección. Ajusta el texto o marca el punto en el mapa.',
        );
        return;
      }
      onChange({
        latitude: Number(Number(first.lat).toFixed(6)),
        longitude: Number(Number(first.lon).toFixed(6)),
      });
    } catch {
      setSearchError('No se pudo buscar la dirección. Marca el punto directamente en el mapa.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="location-picker">
      <div className="location-search">
        <InputField
          label="Buscar dirección"
          placeholder="Ej. Calle Central 45, Arriaga, Chiapas"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void search();
            }
          }}
          disabled={disabled}
          hint="Búsqueda en OpenStreetMap; el marcador guarda latitud y longitud."
        />
        <Button
          type="button"
          variant="secondary"
          icon={Search}
          disabled={disabled || searching || !query.trim()}
          onClick={() => void search()}
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
      {searchError && (
        <p className="alert alert-info" role="status">
          {searchError}
        </p>
      )}
      <p className="muted text-xs">
        <MapPin size={13} aria-hidden="true" /> Toca el mapa o arrastra el marcador para fijar la
        ubicación de la sede.
      </p>
      <div
        className="location-map"
        ref={container}
        role="application"
        aria-label="Mapa para elegir la ubicación de la sede"
      />
      <div className="form-grid">
        <InputField
          label="Latitud"
          type="number"
          step="0.000001"
          min="-90"
          max="90"
          value={value.latitude ?? ''}
          onChange={(event) =>
            onChange({ latitude: parseCoordinate(event.target.value), longitude: value.longitude })
          }
          disabled={disabled}
        />
        <InputField
          label="Longitud"
          type="number"
          step="0.000001"
          min="-180"
          max="180"
          value={value.longitude ?? ''}
          onChange={(event) =>
            onChange({ latitude: value.latitude, longitude: parseCoordinate(event.target.value) })
          }
          disabled={disabled}
        />
      </div>
      {hasPoint && !disabled && (
        <Button
          type="button"
          variant="ghost"
          icon={X}
          onClick={() => onChange({ latitude: null, longitude: null })}
        >
          Quitar ubicación
        </Button>
      )}
    </div>
  );
}
