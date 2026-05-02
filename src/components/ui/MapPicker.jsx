import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Check, X, Map as MapIcon } from 'lucide-react';
import { Modal, Button } from './';

// Fix for default Leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const LocationMarker = ({ position, onPositionChange }) => {
  const map = useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const MapController = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

export const MapPicker = ({ lat, lng, onChange, color = 'blue' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempPosition, setTempPosition] = useState(lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null);
  const [initialCenter] = useState(lat && lng ? [parseFloat(lat), parseFloat(lng)] : [-16.5000, -68.1500]);

  const handleConfirm = () => {
    if (tempPosition) {
      onChange(tempPosition.lat.toFixed(8), tempPosition.lng.toFixed(8));
      setIsOpen(false);
    }
  };

  const handleMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setTempPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    } else {
      alert("Geolocalización no disponible en este navegador.");
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all w-full justify-center font-black text-[10px] uppercase tracking-widest ${
          lat && lng 
            ? `bg-${color}-50 border-${color}-200 text-${color}-600 hover:bg-${color}-100` 
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300'
        }`}
      >
        <MapIcon className="h-4 w-4" />
        {lat && lng ? 'Ubicación Marcada (Ver/Cambiar)' : 'Seleccionar Ubicación en Mapa'}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Seleccionar Ubicación Exacta"
        width="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="relative h-[450px] w-full rounded-2xl overflow-hidden border-2 border-slate-100 shadow-2xl">
            <MapContainer 
              center={initialCenter} 
              zoom={15} 
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={tempPosition} onPositionChange={setTempPosition} />
              <MapController position={tempPosition} />
            </MapContainer>

            {/* Floating Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleMyLocation}
                className="h-10 w-10 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                title="Mi ubicación actual"
              >
                <Navigation className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl border border-white/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Coordenadas Seleccionadas</p>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {tempPosition ? `${tempPosition.lat.toFixed(6)}, ${tempPosition.lng.toFixed(6)}` : 'Haz clic en el mapa...'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-500 max-w-[60%] italic">
              Navega por el mapa y haz clic en el punto exacto donde se llevará a cabo el evento. Puedes usar el botón de brújula para centrar en tu posición actual.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleConfirm}
                disabled={!tempPosition}
                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                <Check className="h-4 w-4" /> Guardar Ubicación
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
