import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, X, Search, Check } from 'lucide-react';

const LocationPicker = ({ onSelect, onClose, initialLocation = null }) => {
  const [location, setLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef(null);

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get place name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          setLocation({
            lat: latitude,
            lng: longitude,
            name: data.address?.suburb || data.address?.city || data.address?.town || 'Current Location',
            fullAddress: data.display_name
          });
        } catch (err) {
          setLocation({
            lat: latitude,
            lng: longitude,
            name: 'Current Location',
            fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          });
        }
        setLoading(false);
      },
      (err) => {
        setError('Unable to get your location. Please enable location services.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search for locations
  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      setSearchResults(data.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        name: item.name || item.display_name.split(',')[0],
        fullAddress: item.display_name
      })));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc) => {
    setLocation(loc);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleConfirm = () => {
    if (location) {
      onSelect(location);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        <h3 className="font-semibold">Add Location</h3>
        <button
          onClick={handleConfirm}
          disabled={!location}
          className={`p-2 rounded-full ${location ? 'text-neon-blue' : 'text-gray-600'}`}
        >
          <Check size={24} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a location..."
            className="w-full pl-12 pr-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:border-neon-blue transition-all"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation(result)}
                className="w-full p-4 text-left hover:bg-dark-surface transition-all border-b border-dark-border last:border-0"
              >
                <p className="font-medium text-white">{result.name}</p>
                <p className="text-sm text-gray-500 truncate">{result.fullAddress}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Preview */}
      <div className="flex-1 relative bg-dark-surface mx-4 rounded-2xl overflow-hidden">
        {location ? (
          <>
            {/* Static map using OpenStreetMap tiles */}
            <img
              src={`https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${location.lng},${location.lat}&z=14&l=map&size=650,450&pt=${location.lng},${location.lat},pm2rdm`}
              alt="Map"
              className="w-full h-full object-cover opacity-60"
              onError={(e) => {
                // Fallback to a placeholder if map fails
                e.target.style.display = 'none';
              }}
            />
            {/* Location marker overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-neon-blue/30 animate-ping absolute"></div>
                <div className="w-12 h-12 rounded-full bg-neon-blue/50 flex items-center justify-center relative">
                  <MapPin size={24} className="text-white" fill="currentColor" />
                </div>
              </div>
            </div>
            {/* Location info */}
            <div className="absolute bottom-4 left-4 right-4 bg-dark-card/90 backdrop-blur-sm rounded-xl p-4 border border-dark-border">
              <p className="font-semibold text-white">{location.name}</p>
              <p className="text-sm text-gray-400 truncate">{location.fullAddress}</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <MapPin size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-500 text-center px-8">
              Search for a location or use your current position
            </p>
          </div>
        )}
      </div>

      {/* Current Location Button */}
      <div className="p-4">
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="w-full py-4 bg-dark-card border border-dark-border rounded-xl text-white font-medium flex items-center justify-center gap-3 hover:bg-dark-surface transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
              Getting location...
            </>
          ) : (
            <>
              <Navigation size={20} className="text-neon-blue" />
              Use Current Location
            </>
          )}
        </button>
        
        {error && (
          <p className="mt-2 text-center text-red-400 text-sm">{error}</p>
        )}

        {location && (
          <button
            onClick={() => setLocation(null)}
            className="w-full mt-2 py-3 text-gray-400 text-sm hover:text-white transition-all"
          >
            Remove location
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default LocationPicker;
