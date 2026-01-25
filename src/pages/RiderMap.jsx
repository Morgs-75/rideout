import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Navigation,
  Layers,
  X,
  ChevronUp,
  Shield,
  Bell,
  Search
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../context/AuthContext';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { db } from '../config/firebase';

mapboxgl.accessToken = 'pk.eyJ1IjoidHJveW03IiwiYSI6ImNta3M3bGw1azFiamEza3BweDJpMGswa3kifQ.P8EVLVOr4ChTrpkyCIg36A';

// Alert types with expiration times
const ALERT_TYPES = {
  police: { color: '#FF4444', label: 'Police', emoji: '🚔', expiresIn: 60 * 60 * 1000 },
  meetup: { color: '#00D4FF', label: 'Meet Point', emoji: '📍', expiresIn: 60 * 60 * 1000 },
  karen: { color: '#FF00FF', label: 'Karen', emoji: '🙄', expiresIn: 2 * 60 * 60 * 1000 }
};

const INITIAL_ALERTS = [];

// Calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Generate circle polygon for map (radiusKm in kilometers)
const createCirclePolygon = (centerLng, centerLat, radiusKm, points = 64) => {
  const coords = [];
  const km = radiusKm;
  const distanceX = km / (111.32 * Math.cos(centerLat * Math.PI / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
};

// Shared audio context for iOS compatibility
let sharedAudioContext = null;
let audioUnlocked = false;

// Unlock audio on first user interaction (required for iOS)
const unlockAudio = () => {
  if (audioUnlocked) return;

  try {
    sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create and play a silent buffer to unlock
    const buffer = sharedAudioContext.createBuffer(1, 1, 22050);
    const source = sharedAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedAudioContext.destination);
    source.start(0);

    // Resume if suspended
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume();
    }

    audioUnlocked = true;
    console.log('Audio unlocked');
  } catch (error) {
    console.log('Audio unlock failed:', error);
  }
};

// Siren sound for police alerts
const playSirenSound = async () => {
  try {
    // Create context if not exists
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended (iOS requirement)
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }

    const oscillator = sharedAudioContext.createOscillator();
    const gainNode = sharedAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(sharedAudioContext.destination);

    oscillator.type = 'sine';
    gainNode.gain.value = 0.4;

    const startTime = sharedAudioContext.currentTime;
    const cycleLength = 1.0;
    const totalCycles = 5;
    const totalDuration = cycleLength * totalCycles;

    for (let i = 0; i < totalCycles; i++) {
      const cycleStart = startTime + (i * cycleLength);
      oscillator.frequency.setValueAtTime(600, cycleStart);
      oscillator.frequency.linearRampToValueAtTime(1200, cycleStart + 0.5);
      oscillator.frequency.linearRampToValueAtTime(600, cycleStart + 1.0);
    }

    gainNode.gain.setValueAtTime(0.4, startTime);
    gainNode.gain.setValueAtTime(0.4, startTime + totalDuration - 0.3);
    gainNode.gain.linearRampToValueAtTime(0, startTime + totalDuration);

    oscillator.start(startTime);
    oscillator.stop(startTime + totalDuration);
  } catch (error) {
    console.log('Audio play failed:', error);
  }
};

const RiderMap = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState('snap');
  const [userLocation, setUserLocation] = useState(null);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [riders, setRiders] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [activeTab, setActiveTab] = useState('alerts');
  const [showPanel, setShowPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const seenAlertIds = useRef(new Set());

  const MAP_STYLES = {
    snap: 'mapbox://styles/mapbox/standard',
    light: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12'
  };

  // Fetch user's last known location from Firebase
  const fetchMyLastLocation = async () => {
    if (!user?.uid) return null;
    try {
      const userDoc = await getDocs(query(collection(db, 'users')));
      const myDoc = userDoc.docs.find(d => d.id === user.uid);
      if (myDoc?.data()?.lastLocation) {
        const loc = myDoc.data().lastLocation;
        return [loc.lng, loc.lat];
      }
    } catch (error) {
      console.error('Error fetching last location:', error);
    }
    return null;
  };

  // Fetch all riders with location data
  const fetchRiders = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);

      // Store all users for search
      const allUsersData = snapshot.docs
        .filter(d => d.id !== user?.uid)
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            streetName: data.streetName || 'Rider',
            bike: data.bike || 'Electric Rider',
            avatar: data.avatar,
            lastLocation: data.lastLocation
          };
        });
      setAllUsers(allUsersData);

      // Filter to only those with location for map display
      const ridersData = snapshot.docs
        .filter(d => d.id !== user?.uid && d.data().lastLocation)
        .map(d => {
          const data = d.data();
          const lastSeen = data.lastLocationTime?.toDate?.() || new Date(0);
          const isOnline = (Date.now() - lastSeen.getTime()) < 15 * 60 * 1000;
          return {
            id: d.id,
            streetName: data.streetName || 'Rider',
            lat: data.lastLocation.lat,
            lng: data.lastLocation.lng,
            bike: data.bike || 'Electric Rider',
            avatar: data.avatar || null,
            online: isOnline
          };
        });
      setRiders(ridersData);
    } catch (error) {
      console.error('Error fetching riders:', error);
    }
  };

  // Update current user's location in Firebase
  const updateMyLocation = async (lat, lng) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastLocation: { lat, lng },
        lastLocationTime: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    const initMap = async (center) => {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: center,
        zoom: 14
      });

      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

      map.current.on('load', () => {
        setMapReady(true);
      });
    };

    const initLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const center = [pos.coords.longitude, pos.coords.latitude];
            setUserLocation([pos.coords.latitude, pos.coords.longitude]);
            initMap(center);
            updateMyLocation(pos.coords.latitude, pos.coords.longitude);
          },
          async () => {
            const lastLoc = await fetchMyLastLocation();
            initMap(lastLoc || [-0.1278, 51.5074]);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        const lastLoc = await fetchMyLastLocation();
        initMap(lastLoc || [-0.1278, 51.5074]);
      }
    };

    initLocation();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style
  useEffect(() => {
    if (map.current && mapReady) {
      map.current.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle, mapReady]);

  // Unlock audio on any user interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
    };

    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('click', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  // Watch position for continuous updates
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        updateMyLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  // Fetch riders periodically
  useEffect(() => {
    fetchRiders();
    const interval = setInterval(fetchRiders, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !mapReady || !userLocation) return;

    // Remove existing user marker
    if (markersRef.current.user) {
      markersRef.current.user.remove();
    }

    // Create user marker element
    const el = document.createElement('div');
    el.className = 'user-marker';
    el.innerHTML = `
      <div style="position: relative;">
        <div style="width: 24px; height: 24px; background: #00D4FF; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,212,255,0.5);"></div>
        <div style="position: absolute; inset: 0; width: 24px; height: 24px; background: rgba(0,212,255,0.3); border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      </div>
    `;

    markersRef.current.user = new mapboxgl.Marker(el)
      .setLngLat([userLocation[1], userLocation[0]])
      .addTo(map.current);
  }, [userLocation, mapReady]);

  // Update rider markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove old rider markers
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('rider-')) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });

    // Add new rider markers
    riders.forEach(rider => {
      const el = document.createElement('div');
      const isOnline = rider.online;
      const avatarContent = rider.avatar
        ? `<img src="${rider.avatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
        : `<span style="font-size: 20px;">⚡🏍️</span>`;
      el.innerHTML = `
        <div style="position: relative; cursor: pointer;">
          <div style="width: 50px; height: 50px; background: ${isOnline ? 'linear-gradient(135deg, #00D4FF, #39FF14)' : '#666'}; border-radius: 50%; padding: 2px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            <div style="width: 100%; height: 100%; background: #1a1a1a; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${avatarContent}
            </div>
          </div>
          <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); background: ${isOnline ? '#00D4FF' : '#666'}; color: #000; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 8px; white-space: nowrap; max-width: 70px; overflow: hidden; text-overflow: ellipsis;">
            ${rider.streetName}
          </div>
          ${isOnline ? '<div style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #39FF14; border-radius: 50%; border: 2px solid #1a1a1a;"></div>' : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong>${rider.streetName}</strong>
          <p style="margin: 4px 0; font-size: 14px;">${rider.bike}</p>
          <p style="margin: 0; font-size: 14px;">${rider.online ? '🟢 Online' : '⚫ Offline'}</p>
        </div>
      `);

      markersRef.current[`rider-${rider.id}`] = new mapboxgl.Marker(el)
        .setLngLat([rider.lng, rider.lat])
        .setPopup(popup)
        .addTo(map.current);
    });
  }, [riders, mapReady]);

  // Update alert markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove old alert markers and circle layers
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('alert-')) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });

    // Remove old police radius circles
    alerts.forEach(alert => {
      const sourceId = `police-radius-${alert.id}`;
      const layerId = `police-radius-fill-${alert.id}`;
      const outlineId = `police-radius-outline-${alert.id}`;

      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getLayer(outlineId)) {
        map.current.removeLayer(outlineId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Add new alert markers
    alerts.forEach(alert => {
      const alertType = ALERT_TYPES[alert.type];

      // Add 3km radius circle for police alerts
      if (alert.type === 'police') {
        const sourceId = `police-radius-${alert.id}`;
        const circleGeoJSON = createCirclePolygon(alert.lng, alert.lat, 3);

        // Add source if it doesn't exist
        if (!map.current.getSource(sourceId)) {
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: circleGeoJSON
          });

          // Add fill layer (light blue with transparency)
          map.current.addLayer({
            id: `police-radius-fill-${alert.id}`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#00D4FF',
              'fill-opacity': 0.15
            }
          });

          // Add outline layer
          map.current.addLayer({
            id: `police-radius-outline-${alert.id}`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#00D4FF',
              'line-width': 2,
              'line-opacity': 0.5
            }
          });
        }
      }

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="width: 40px; height: 40px; background: ${alertType.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px ${alertType.color}; cursor: pointer;">
          ${alertType.emoji}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong>${alertType.label}</strong>
          <p style="margin: 4px 0; font-size: 14px;">by ${alert.reporter}</p>
          <p style="margin: 0; font-size: 14px;">${alert.confirmations} confirmed</p>
        </div>
      `);

      markersRef.current[`alert-${alert.id}`] = new mapboxgl.Marker(el)
        .setLngLat([alert.lng, alert.lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    // Cleanup function to remove circles when alerts change
    return () => {
      alerts.forEach(alert => {
        if (alert.type === 'police' && map.current) {
          const sourceId = `police-radius-${alert.id}`;
          const layerId = `police-radius-fill-${alert.id}`;
          const outlineId = `police-radius-outline-${alert.id}`;

          try {
            if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
            if (map.current.getLayer(outlineId)) map.current.removeLayer(outlineId);
            if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      });
    };
  }, [alerts, mapReady]);

  // Subscribe to alerts from Firebase
  useEffect(() => {
    const alertsRef = collection(db, 'alerts');

    const unsubscribe = onSnapshot(alertsRef, (snapshot) => {
      const now = Date.now();
      const alertsData = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const alertTime = data.time?.toDate?.()?.getTime() || data.time || 0;
        const expiresIn = ALERT_TYPES[data.type]?.expiresIn || 60 * 60 * 1000;

        // Only include non-expired alerts
        if ((now - alertTime) < expiresIn) {
          alertsData.push({
            id: doc.id,
            ...data,
            time: alertTime
          });
        }
      });

      setAlerts(alertsData);
    });

    return () => unsubscribe();
  }, []);

  // Play siren for new police alerts within 5km
  useEffect(() => {
    if (!userLocation) return;

    alerts.forEach(alert => {
      if (!seenAlertIds.current.has(alert.id)) {
        seenAlertIds.current.add(alert.id);

        if (alert.type === 'police') {
          const distance = calculateDistance(userLocation[0], userLocation[1], alert.lat, alert.lng);

          if (distance <= 3) {
            const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
            if (soundEnabled) {
              playSirenSound();
            }
            setNotificationMessage(`🚔 POLICE ALERT! ${distance.toFixed(1)}km away`);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
        }
      }
    });
  }, [alerts, userLocation]);

  const createAlert = async (type) => {
    // Unlock audio on user interaction
    unlockAudio();

    if (!userLocation) {
      setNotificationMessage('Enable location to report');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    try {
      await addDoc(collection(db, 'alerts'), {
        type,
        lat: userLocation[0],
        lng: userLocation[1],
        reporter: userProfile?.streetName || 'VoltRider',
        reporterId: user?.uid,
        time: serverTimestamp(),
        confirmations: 1
      });

      setNotificationMessage(`${ALERT_TYPES[type].emoji} Alert sent to nearby riders!`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
    } catch (error) {
      console.error('Error creating alert:', error);
      setNotificationMessage('Failed to send alert');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const confirmAlert = async (id) => {
    try {
      const alertRef = doc(db, 'alerts', id);
      const alert = alerts.find(a => a.id === id);
      if (alert) {
        await updateDoc(alertRef, {
          confirmations: (alert.confirmations || 1) + 1
        });
      }
    } catch (error) {
      console.error('Error confirming alert:', error);
    }
  };

  const dismissAlert = async (id) => {
    try {
      await deleteDoc(doc(db, 'alerts', id));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const timeAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  const cycleMapStyle = () => {
    setMapStyle(s => s === 'snap' ? 'light' : s === 'light' ? 'satellite' : 'snap');
  };

  const flyToUser = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: [userLocation[1], userLocation[0]],
        zoom: 14,
        duration: 1000
      });
    }
  };

  const flyToRider = (rider) => {
    if (rider.lastLocation && map.current) {
      map.current.flyTo({
        center: [rider.lastLocation.lng, rider.lastLocation.lat],
        zoom: 16,
        duration: 1000
      });
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  // Filter users based on search
  const searchResults = searchQuery.trim()
    ? allUsers.filter(u => u.streetName.toLowerCase().includes(searchQuery.toLowerCase()))
    : allUsers;

  return (
    <div className="h-screen w-full bg-dark-bg flex flex-col relative overflow-hidden">
      {/* Map Container */}
      <div ref={mapContainer} className="flex-1" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 bg-dark-bg flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading map...</p>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div
        className="fixed top-0 left-0 right-0 pt-12 pb-4 px-4"
        style={{ zIndex: 10, pointerEvents: 'none' }}
      >
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={() => navigate('/feed')}
            className="p-3 bg-dark-card/95 backdrop-blur rounded-full shadow-xl border border-white/10"
            style={{ pointerEvents: 'auto' }}
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          {/* Search Bar */}
          <div
            className="flex-1 mx-3 relative"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center bg-dark-card/95 backdrop-blur rounded-full shadow-xl border border-white/10 px-4 py-2">
              <Search size={18} className="text-gray-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(true);
                }}
                onFocus={() => setShowSearch(true)}
                placeholder="Find riders..."
                className="bg-transparent text-white text-sm placeholder-gray-500 outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowSearch(false); }}>
                  <X size={16} className="text-gray-400" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearch && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-dark-card/95 backdrop-blur rounded-2xl shadow-xl border border-white/10 max-h-64 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No riders found</div>
                ) : (
                  searchResults.slice(0, 10).map(rider => (
                    <button
                      key={rider.id}
                      onClick={() => flyToRider(rider)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-dark-surface transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center text-lg">
                        🏍️
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-white font-medium text-sm">{rider.streetName}</p>
                        <p className="text-gray-500 text-xs">{rider.bike}</p>
                      </div>
                      {rider.lastLocation ? (
                        <span className="text-xs text-neon-blue">📍 On map</span>
                      ) : (
                        <span className="text-xs text-gray-500">No location</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={flyToUser}
            className="p-3 bg-dark-card/95 backdrop-blur rounded-full shadow-xl border border-white/10"
            style={{ pointerEvents: 'auto' }}
          >
            <Navigation size={20} className="text-neon-blue" />
          </button>
        </div>

        {/* Quick Alert Buttons */}
        <div className="flex justify-center gap-2">
          {Object.entries(ALERT_TYPES).map(([key, { color, label, emoji }]) => (
            <button
              key={key}
              onClick={() => createAlert(key)}
              className="flex items-center justify-center gap-2 w-28 py-2 rounded-full shadow-xl"
              style={{ backgroundColor: color, pointerEvents: 'auto' }}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-white text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Click outside to close search */}
      {showSearch && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setShowSearch(false)}
        />
      )}

      {/* Map style toggle */}
      <div className="fixed right-4 top-40" style={{ zIndex: 10 }}>
        <button
          onClick={cycleMapStyle}
          className="p-3 bg-dark-card/95 backdrop-blur rounded-xl shadow-xl border border-white/10"
        >
          <Layers size={20} className="text-white" />
        </button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-36 left-4 right-4 bg-neon-blue text-dark-bg px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 font-medium"
            style={{ zIndex: 20 }}
          >
            <Bell size={20} />
            {notificationMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Panel */}
      {showPanel && (
        <div className="bg-dark-card border-t border-dark-border rounded-t-3xl z-10">
          <div className="w-12 h-1 bg-dark-border rounded-full mx-auto my-3 cursor-pointer" onClick={() => setShowPanel(false)} />

          <div className="flex border-b border-dark-border px-4">
            {['alerts', 'riders'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab === tab ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="max-h-48 overflow-y-auto p-4 space-y-3">
            {activeTab === 'alerts' && (
              alerts.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Shield size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No alerts nearby</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-3 p-3 bg-dark-surface rounded-xl">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: ALERT_TYPES[alert.type].color + '30' }}>
                      {ALERT_TYPES[alert.type].emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{ALERT_TYPES[alert.type].label}</p>
                      <p className="text-xs text-gray-400">{alert.reporter} • {timeAgo(alert.time)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => confirmAlert(alert.id)} className="p-2 bg-green-500/20 text-green-400 rounded-lg text-xs">
                        +1
                      </button>
                      <button onClick={() => dismissAlert(alert.id)} className="p-2 bg-gray-500/20 text-gray-400 rounded-lg">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'riders' && (
              riders.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No riders nearby</p>
                  <p className="text-xs mt-1">Riders will appear when they share their location</p>
                </div>
              ) : (
                riders.map(rider => {
                  const distance = userLocation
                    ? calculateDistance(userLocation[0], userLocation[1], rider.lat, rider.lng)
                    : 0;
                  return (
                    <div key={rider.id} className="flex items-center gap-3 p-3 bg-dark-surface rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center text-white font-bold">
                        {rider.streetName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{rider.streetName}</p>
                        <p className="text-xs text-gray-400">{rider.bike}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neon-blue">{distance.toFixed(1)} km</p>
                        <p className="text-xs text-gray-500">{rider.online ? '🟢' : '⚫'}</p>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}

      {!showPanel && (
        <button onClick={() => setShowPanel(true)} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-6 py-3 bg-dark-card/90 backdrop-blur rounded-full shadow-lg flex items-center gap-2">
          <ChevronUp size={20} className="text-neon-blue" />
          <span className="text-white font-medium">Show panel</span>
        </button>
      )}

      {/* CSS for ping animation */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default RiderMap;
