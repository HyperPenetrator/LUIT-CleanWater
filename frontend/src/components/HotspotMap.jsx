import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function HotspotMap({ hotspots = [], userLocation = null }) {
  const mapRef = useRef(null)

  // Calculate center of map based on hotspots or user location
  const getMapCenter = () => {
    if (hotspots.length > 0) {
      const avgLat = hotspots.reduce((sum, h) => sum + h.latitude, 0) / hotspots.length
      const avgLon = hotspots.reduce((sum, h) => sum + h.longitude, 0) / hotspots.length
      return [avgLat, avgLon]
    }
    return userLocation ? [userLocation.latitude, userLocation.longitude] : [26.1445, 91.7362] // Default to Assam
  }

  // Create custom icon for contaminated areas
  const createContaminatedIcon = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background-color: #dc2626;
          border: 3px solid #991b1b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);
          cursor: pointer;
        ">
          ⚠️
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    })
  }

  // Create custom icon for clean areas
  const createCleanIcon = () => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background-color: #16a34a;
          border: 3px solid #15803d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 0 10px rgba(22, 163, 74, 0.6);
          cursor: pointer;
        ">
          ✓
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    })
  }

  // Create user location icon
  const createUserIcon = () => {
    return L.divIcon({
      className: 'custom-marker-user',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background-color: #3b82f6;
          border: 3px solid #1e40af;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);
        ">
          📍
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    })
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg border border-gray-200">
      {hotspots.length > 0 || userLocation ? (
        <MapContainer
          center={getMapCenter()}
          zoom={11}
          style={{ height: '500px', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={createUserIcon()}
            >
              <Popup className="bg-blue-50">
                <div className="text-sm">
                  <p className="font-bold text-blue-600">📍 Your Location</p>
                  <p>Lat: {userLocation.latitude.toFixed(4)}</p>
                  <p>Lon: {userLocation.longitude.toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Hotspot Markers */}
          {hotspots.map((hotspot, index) => (
            <Marker
              key={`${hotspot.id}-${index}`}
              position={[hotspot.latitude, hotspot.longitude]}
              icon={hotspot.isActive ? createContaminatedIcon() : createCleanIcon()}
            >
              <Popup className={hotspot.isActive ? 'bg-red-50' : 'bg-green-50'}>
                <div className="text-sm min-w-48">
                  <p className={`font-bold ${hotspot.isActive ? 'text-red-600' : 'text-green-600'}`}>
                    {hotspot.areaName || 'Unknown Area'}
                  </p>
                  <hr className="my-2" />
                  <p className="text-gray-700">
                    <span className="font-semibold">Status:</span>{' '}
                    <span className={hotspot.isActive ? 'text-red-600' : 'text-green-600'}>
                      {hotspot.isActive ? '🔴 Contaminated' : '🟢 Clean'}
                    </span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Severity:</span> {hotspot.severity || 'N/A'}
                  </p>
                  <p className="text-gray-600 text-xs mt-2">
                    📍 {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                  </p>
                  <p className="text-gray-600 text-xs">
                    Status: {hotspot.status || 'unknown'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
        <div className="h-96 flex items-center justify-center bg-gray-100">
          <p className="text-gray-600 text-lg">No hotspot data available</p>
        </div>
      )}
    </div>
  )
}
