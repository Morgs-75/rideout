import { useState, useEffect, useRef, useCallback } from 'react';
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
  Search,
  Radio,
  Eye,
  Clock,
  MapPin,
  UserCheck,
  Tag
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../context/AuthContext';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// LiveRide imports
import LiveRidePanel from '../components/LiveRidePanel';
import ViewerSelector from '../components/ViewerSelector';
import LiveRideCard from '../components/LiveRideCard';
import {
  startLiveRide,
  updateLiveRidePosition,
  pauseLiveRide,
  resumeLiveRide,
  endLiveRide,
  setViewers,
  setRidePublic,
  subscribeToMyActiveRide,
  subscribeToViewableLiveRides
} from '../services/liveRideService';
import { notifyLiveRideViewers } from '../utils/notifications';

// Tracking imports
import TrackRequestModal from '../components/TrackRequestModal';
import TrackedRidersOverlay from '../components/TrackedRidersOverlay';
import {
  subscribeToTracksAsTracker,
  subscribeToTrackedLocations,
  updateTrackerLocation,
  getActiveTracksAsTracked
} from '../services/trackService';

mapboxgl.accessToken = 'pk.eyJ1IjoidHJveW03IiwiYSI6ImNta3M3bGw1azFiamEza3BweDJpMGswa3kifQ.P8EVLVOr4ChTrpkyCIg36A';

// Alert types with expiration times
const ALERT_TYPES = {
  alert: { color: '#FF4444', label: 'Alert', emoji: '🚨', expiresIn: 30 * 60 * 1000 }, // 30 minutes
  meetup: { color: '#00D4FF', label: 'Meet Point', emoji: '📍', expiresIn: 30 * 60 * 1000 }, // 30 mins after meeting time
  karen: { color: '#FF00FF', label: 'Karen', emoji: '🙄', expiresIn: 30 * 60 * 1000 } // 30 minutes
};

const INITIAL_ALERTS = [];

// Rider icon colors and helper
const RIDER_COLORS = ['Blue', 'Green', 'Orange', 'Pink', 'Purple'];

// Get a consistent random color for a user based on their UID
const getRiderColor = (uid) => {
  if (!uid) return RIDER_COLORS[0];
  // Simple hash function to get consistent color from UID
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return RIDER_COLORS[Math.abs(hash) % RIDER_COLORS.length];
};

// Get rider icon URL
const getRiderIconUrl = (uid, isMoving = false) => {
  const color = getRiderColor(uid);
  const pose = isMoving ? 'Wheelie' : 'Resting';
  return `/rider-icons/${color}_${pose}.png`;
};

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

// Siren sound for alerts
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
    const totalCycles = 10; // Doubled from 5 to 10 for longer siren
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
  const [zoomLevel, setZoomLevel] = useState(14);
  const seenAlertIds = useRef(new Set());
  const pulseIntervalRef = useRef(null);

  // LiveRide state
  const [liveRideActive, setLiveRideActive] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [viewableLiveRides, setViewableLiveRides] = useState([]);
  const [showViewerSelector, setShowViewerSelector] = useState(false);
  const [showStartRideModal, setShowStartRideModal] = useState(false);
  const [liveRidePanelMinimized, setLiveRidePanelMinimized] = useState(false);
  const [viewingRideId, setViewingRideId] = useState(null);
  const [showLiveRidesPanel, setShowLiveRidesPanel] = useState(false);
  const [showMeetPointModal, setShowMeetPointModal] = useState(false);
  const [meetPointTime, setMeetPointTime] = useState('');
  const [meetPointVisibility, setMeetPointVisibility] = useState('followers'); // 'followers' or 'selected'
  const [showMeetPointViewerSelector, setShowMeetPointViewerSelector] = useState(false);
  const [meetPointViewers, setMeetPointViewers] = useState([]);
  const [isPlacingMeetPoint, setIsPlacingMeetPoint] = useState(false);
  const [meetPointLocation, setMeetPointLocation] = useState(null); // {lat, lng}
  const [editingMeetPointId, setEditingMeetPointId] = useState(null);
  const [postToFeed, setPostToFeed] = useState(true); // Option to also post alerts to feed
  const [showRiderNames, setShowRiderNames] = useState(true); // Toggle rider name bubbles
  const [showPostRideModal, setShowPostRideModal] = useState(false);
  const [completedRideData, setCompletedRideData] = useState(null);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const videoCanvasRef = useRef(null);
  const meetPointMarkerRef = useRef(null);
  const liveRideMarkersRef = useRef(new Map());
  const liveRideWatchIdRef = useRef(null);
  const lastPositionUpdateRef = useRef(0);

  // Tracking state
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [activeTracks, setActiveTracks] = useState([]); // Riders I'm tracking
  const [trackedLocations, setTrackedLocations] = useState([]); // Their locations
  const [beingTrackedBy, setBeingTrackedBy] = useState([]); // Who is tracking me
  const trackedMarkersRef = useRef(new Map());

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
        // Add LiveRide path source and layers (check if they exist first)
        if (!map.current.getSource('liveride-paths')) {
          map.current.addSource('liveride-paths', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          // Fire trail - outermost red glow (ambient)
          map.current.addLayer({
            id: 'liveride-path-fire-ambient',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF0000',
              'line-width': 28,
              'line-opacity': 0.3,
              'line-blur': 12
            }
          });

          // Fire trail - outer dark red glow
          map.current.addLayer({
            id: 'liveride-path-fire-outer',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF2200',
              'line-width': 20,
              'line-opacity': 0.5,
              'line-blur': 8
            }
          });

          // Fire trail - middle orange glow
          map.current.addLayer({
            id: 'liveride-path-glow',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF6600',
              'line-width': 14,
              'line-opacity': 0.7,
              'line-blur': 4
            }
          });

          // Fire trail - inner bright orange
          map.current.addLayer({
            id: 'liveride-path-fire-inner',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF9900',
              'line-width': 8,
              'line-opacity': 0.9,
              'line-blur': 2
            }
          });

          // Fire trail - core yellow/white hot
          map.current.addLayer({
            id: 'liveride-path-line',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FFFF00',
              'line-width': 3,
              'line-opacity': 1
            }
          });
        }

        setMapReady(true);
      });

      // Listen to zoom changes to resize markers
      map.current.on('zoom', () => {
        setZoomLevel(map.current.getZoom());
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

      // Re-add LiveRide layers after style change
      map.current.once('style.load', () => {
        if (!map.current.getSource('liveride-paths')) {
          map.current.addSource('liveride-paths', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          // Fire trail - outermost red glow (ambient)
          map.current.addLayer({
            id: 'liveride-path-fire-ambient',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF0000',
              'line-width': 28,
              'line-opacity': 0.3,
              'line-blur': 12
            }
          });

          // Fire trail - outer dark red glow
          map.current.addLayer({
            id: 'liveride-path-fire-outer',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF2200',
              'line-width': 20,
              'line-opacity': 0.5,
              'line-blur': 8
            }
          });

          // Fire trail - middle orange glow
          map.current.addLayer({
            id: 'liveride-path-glow',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF6600',
              'line-width': 14,
              'line-opacity': 0.7,
              'line-blur': 4
            }
          });

          // Fire trail - inner bright orange
          map.current.addLayer({
            id: 'liveride-path-fire-inner',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FF9900',
              'line-width': 8,
              'line-opacity': 0.9,
              'line-blur': 2
            }
          });

          // Fire trail - core yellow/white hot
          map.current.addLayer({
            id: 'liveride-path-line',
            type: 'line',
            source: 'liveride-paths',
            paint: {
              'line-color': '#FFFF00',
              'line-width': 3,
              'line-opacity': 1
            }
          });
        }
      });
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

  // Subscribe to riders in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      // Store all users for search
      const allUsersData = snapshot.docs
        .filter(d => d.id !== user.uid)
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
        .filter(d => d.id !== user.uid && d.data().lastLocation)
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
    }, (error) => {
      console.error('Error subscribing to riders:', error);
    });

    return () => unsubscribe();
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

    // Show animated rider icon when on LiveRide, otherwise show blue dot
    if (liveRideActive && user?.uid) {
      const riderColor = getRiderColor(user.uid);
      const restingUrl = `/rider-icons/${riderColor}_Resting.png`;
      const wheelieUrl = `/rider-icons/${riderColor}_Wheelie.png`;

      // Add CSS animation for alternating images
      const styleId = 'rider-anim-user';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes riderAnimUser {
            0%, 45% { opacity: 1; }
            50%, 95% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes riderAnimUserAlt {
            0%, 45% { opacity: 0; }
            50%, 95% { opacity: 1; }
            100% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      el.innerHTML = `
        <div style="position: relative; width: 75px; height: 75px;">
          <img
            src="${restingUrl}"
            style="position: absolute; width: 75px; height: auto; filter: drop-shadow(0 0 10px rgba(0,212,255,0.7)); animation: riderAnimUser 0.8s ease-in-out infinite;"
          />
          <img
            src="${wheelieUrl}"
            style="position: absolute; width: 75px; height: auto; filter: drop-shadow(0 0 10px rgba(0,212,255,0.7)); animation: riderAnimUserAlt 0.8s ease-in-out infinite;"
          />
          <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: #EF4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 8px; white-space: nowrap;">
            LIVE
          </div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div style="position: relative;">
          <div style="width: 24px; height: 24px; background: #00D4FF; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,212,255,0.5);"></div>
          <div style="position: absolute; inset: 0; width: 24px; height: 24px; background: rgba(0,212,255,0.3); border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
      `;
    }

    markersRef.current.user = new mapboxgl.Marker(el)
      .setLngLat([userLocation[1], userLocation[0]])
      .addTo(map.current);
  }, [userLocation, mapReady, liveRideActive, user?.uid]);

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

    // Calculate marker size based on zoom level
    const zoom = map.current.getZoom();
    const iconSize = Math.max(50, Math.min(80, 35 + zoom * 3.5)); // Scale from 50px to 80px
    const fontSize = Math.max(8, Math.min(12, 6 + zoom * 0.5));
    const labelWidth = Math.max(50, Math.min(80, 40 + zoom * 2));

    // Add new rider markers

    riders.forEach(rider => {
      const el = document.createElement('div');
      el.className = 'rider-marker';
      const isOnline = rider.online;
      const riderIconUrl = getRiderIconUrl(rider.id, false);
      el.innerHTML = `
        <div style="position: relative; cursor: pointer;">
          ${showRiderNames ? `
          <div style="position: absolute; top: -38px; left: 50%; transform: translateX(-50%); background: ${isOnline ? '#1a1a1a' : '#333'}; color: ${isOnline ? '#00D4FF' : '#888'}; font-size: ${fontSize}px; font-weight: bold; padding: 4px 10px; border-radius: 12px; white-space: nowrap; border: 2px solid ${isOnline ? '#00D4FF' : '#666'}; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
            ${rider.streetName}
          </div>
          <div style="position: absolute; top: -16px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: ${isOnline ? '#1a1a1a' : '#333'}; border-radius: 50%; border: 2px solid ${isOnline ? '#00D4FF' : '#666'};"></div>
          <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; background: ${isOnline ? '#1a1a1a' : '#333'}; border-radius: 50%; border: 1px solid ${isOnline ? '#00D4FF' : '#666'};"></div>
          ` : ''}
          <img
            src="${riderIconUrl}"
            style="width: ${iconSize}px; height: auto; ${isOnline ? 'filter: brightness(1.2) saturate(1.3) drop-shadow(0 0 8px rgba(0,212,255,0.8));' : 'filter: grayscale(70%) opacity(0.7);'}"
          />
          ${isOnline ? `<div style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #39FF14; border-radius: 50%; border: 2px solid #1a1a1a;"></div>` : ''}
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
  }, [riders, mapReady, zoomLevel, showRiderNames]);

  // Update alert markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove old alert markers and alert circle markers
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('alert-') || key.startsWith('alert-circle-')) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });

    // Remove old alert and meetup radius layers
    alerts.forEach(alert => {
      // Alert radius cleanup
      const sourceId = `alert-radius-${alert.id}`;
      const fillId = `alert-radius-fill-${alert.id}`;
      const outlineId = `alert-radius-outline-${alert.id}`;
      const pulseId = `alert-radius-pulse-${alert.id}`;

      try {
        if (map.current.getLayer(fillId)) map.current.removeLayer(fillId);
        if (map.current.getLayer(outlineId)) map.current.removeLayer(outlineId);
        if (map.current.getLayer(pulseId)) map.current.removeLayer(pulseId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
      } catch (e) {}

      // Meetup radius cleanup
      const meetupSourceId = `meetup-radius-${alert.id}`;
      const meetupFillId = `meetup-radius-fill-${alert.id}`;
      const meetupOutlineId = `meetup-radius-outline-${alert.id}`;

      try {
        if (map.current.getLayer(meetupFillId)) map.current.removeLayer(meetupFillId);
        if (map.current.getLayer(meetupOutlineId)) map.current.removeLayer(meetupOutlineId);
        if (map.current.getSource(meetupSourceId)) map.current.removeSource(meetupSourceId);
      } catch (e) {}
    });

    // Add new alert markers
    alerts.forEach(alert => {
      // Skip rendering the marker being edited (draggable marker will show instead)
      if (editingMeetPointId === alert.id) return;

      const alertType = ALERT_TYPES[alert.type];

      // For danger alerts, create 1.5km radius circle (red to match button)
      if (alert.type === 'alert') {
        const sourceId = `alert-radius-${alert.id}`;
        const circleGeoJSON = createCirclePolygon(alert.lng, alert.lat, 1.5);

        // Add source
        if (!map.current.getSource(sourceId)) {
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: circleGeoJSON
          });

          // Add pulsing fill layer (red)
          map.current.addLayer({
            id: `alert-radius-fill-${alert.id}`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#FF4444',
              'fill-opacity': 0.25
            }
          });

          // Add outline layer
          map.current.addLayer({
            id: `alert-radius-outline-${alert.id}`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#FF4444',
              'line-width': 2,
              'line-opacity': 0.8
            }
          });
        }
      }

      // For meetup alerts, show 3km radius circle 30 mins before meeting time
      if (alert.type === 'meetup' && alert.meetupTime) {
        const now = Date.now();
        const meetupTime = alert.meetupTime;
        const thirtyMinsBefore = meetupTime - (30 * 60 * 1000);

        // Only show circle if we're within 30 mins of meetup time (and meetup hasn't passed by 30 mins)
        if (now >= thirtyMinsBefore && now <= meetupTime + (15 * 60 * 1000)) {
          const sourceId = `meetup-radius-${alert.id}`;
          const circleGeoJSON = createCirclePolygon(alert.lng, alert.lat, 1);

          // Add source if not exists
          if (!map.current.getSource(sourceId)) {
            map.current.addSource(sourceId, {
              type: 'geojson',
              data: circleGeoJSON
            });

            // Add pulsing fill layer (blue to match button)
            map.current.addLayer({
              id: `meetup-radius-fill-${alert.id}`,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': '#00D4FF',
                'fill-opacity': 0.2
              }
            });

            // Add outline layer
            map.current.addLayer({
              id: `meetup-radius-outline-${alert.id}`,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#00D4FF',
                'line-width': 1.5,
                'line-opacity': 0.8
              }
            });
          }
        }
      }

      const el = document.createElement('div');
      const isOwnMeetup = alert.type === 'meetup' && alert.reporterId === user?.uid;

      // For meetup, show time if available
      let timeDisplay = '';
      if (alert.type === 'meetup' && alert.meetupTime) {
        const meetDate = new Date(alert.meetupTime);
        timeDisplay = meetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Different marker style for meetup vs other alerts
      if (alert.type === 'meetup') {
        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="background: #1a1a1a; color: #00D4FF; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 8px; white-space: nowrap; margin-bottom: 2px; border: 1px solid #00D4FF; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
              ${alert.reporter}
            </div>
            ${timeDisplay ? `<div style="background: ${alertType.color}; color: white; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 10px; white-space: nowrap; margin-bottom: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); ${isOwnMeetup ? 'border: 2px solid #39FF14;' : ''}">${timeDisplay}</div>` : ''}
            <div style="font-size: 36px; filter: drop-shadow(0 2px 6px ${alertType.color}); cursor: pointer; line-height: 1;">📍</div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div style="position: relative;">
            <div style="width: 40px; height: 40px; background: ${alertType.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px ${alertType.color}; cursor: pointer; z-index: 10;">
              ${alertType.emoji}
            </div>
          </div>
        `;
      }

      // Add click handler for editing own meetups
      if (isOwnMeetup) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          // Set up edit mode
          setEditingMeetPointId(alert.id);
          setMeetPointLocation({ lat: alert.lat, lng: alert.lng });
          if (alert.meetupTime) {
            const meetDate = new Date(alert.meetupTime);
            const timeStr = meetDate.toTimeString().slice(0, 5);
            setMeetPointTime(timeStr);
          }
          setMeetPointVisibility(alert.visibility || 'followers');
          setMeetPointViewers(alert.allowedViewers || []);
          setIsPlacingMeetPoint(true);
        });
      }

      const popupContent = alert.type === 'meetup' && alert.meetupTime
        ? `<div style="padding: 8px;">
            <strong>${alertType.label}</strong>
            <p style="margin: 4px 0; font-size: 14px;">by ${alert.reporter}</p>
            <p style="margin: 0; font-size: 14px;">🕐 ${timeDisplay}</p>
            ${isOwnMeetup ? '<p style="margin: 4px 0; font-size: 12px; color: #39FF14;">Tap to edit</p>' : ''}
          </div>`
        : `<div style="padding: 8px;">
            <strong>${alertType.label}</strong>
            <p style="margin: 4px 0; font-size: 14px;">by ${alert.reporter}</p>
            <p style="margin: 0; font-size: 14px;">${alert.confirmations} confirmed</p>
          </div>`;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

      // Use bottom anchor for meetup pins so the point is at exact location
      const markerOptions = alert.type === 'meetup'
        ? { element: el, anchor: 'bottom' }
        : { element: el };

      markersRef.current[`alert-${alert.id}`] = new mapboxgl.Marker(markerOptions)
        .setLngLat([alert.lng, alert.lat])
        .setPopup(popup)
        .addTo(map.current);
    });

  }, [alerts, mapReady, zoomLevel, editingMeetPointId]);

  // Pulsating animation for alert circles
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const dangerAlerts = alerts.filter(a => a.type === 'alert');
    const meetupAlerts = alerts.filter(a => {
      if (a.type !== 'meetup' || !a.meetupTime) return false;
      const now = Date.now();
      const thirtyMinsBefore = a.meetupTime - (30 * 60 * 1000);
      return now >= thirtyMinsBefore && now <= a.meetupTime + (15 * 60 * 1000);
    });

    // Clear existing interval
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }

    if (dangerAlerts.length === 0 && meetupAlerts.length === 0) return;

    let opacity = 0.25;
    let increasing = true;

    pulseIntervalRef.current = setInterval(() => {
      if (!map.current) return;

      // Pulse between 0.15 and 0.4 opacity
      if (increasing) {
        opacity += 0.015;
        if (opacity >= 0.4) increasing = false;
      } else {
        opacity -= 0.015;
        if (opacity <= 0.15) increasing = true;
      }

      // Pulse danger alerts (blue)
      dangerAlerts.forEach(alert => {
        const fillLayerId = `alert-radius-fill-${alert.id}`;
        const outlineLayerId = `alert-radius-outline-${alert.id}`;

        try {
          if (map.current.getLayer(fillLayerId)) {
            map.current.setPaintProperty(fillLayerId, 'fill-opacity', opacity);
          }
          if (map.current.getLayer(outlineLayerId)) {
            map.current.setPaintProperty(outlineLayerId, 'line-opacity', 0.5 + opacity);
          }
        } catch (e) {
          // Ignore errors
        }
      });

      // Pulse meetup alerts (red) - more intense pulsation
      meetupAlerts.forEach(alert => {
        const fillLayerId = `meetup-radius-fill-${alert.id}`;
        const outlineLayerId = `meetup-radius-outline-${alert.id}`;

        // More dramatic opacity range for meetups (0.1 to 0.5)
        const meetupOpacity = 0.1 + (opacity * 1.5);

        try {
          if (map.current.getLayer(fillLayerId)) {
            map.current.setPaintProperty(fillLayerId, 'fill-opacity', meetupOpacity);
          }
          if (map.current.getLayer(outlineLayerId)) {
            map.current.setPaintProperty(outlineLayerId, 'line-opacity', 0.6 + (opacity * 1.5));
            map.current.setPaintProperty(outlineLayerId, 'line-width', 1 + (opacity * 2));
          }
        } catch (e) {
          // Ignore errors
        }
      });
    }, 50);

    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
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

  // Play siren for new alerts within 5km
  useEffect(() => {
    if (!userLocation) return;

    alerts.forEach(alert => {
      if (!seenAlertIds.current.has(alert.id)) {
        seenAlertIds.current.add(alert.id);

        if (alert.type === 'alert') {
          const distance = calculateDistance(userLocation[0], userLocation[1], alert.lat, alert.lng);

          if (distance <= 3) {
            const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
            if (soundEnabled) {
              playSirenSound();
            }
            setNotificationMessage(`🚨 ALERT! ${distance.toFixed(1)}km away`);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
        }
      }
    });
  }, [alerts, userLocation]);

  // ============= LIVERIDE FUNCTIONALITY =============

  // Subscribe to user's own active ride
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToMyActiveRide(user.uid, (ride) => {
      setCurrentRide(ride);
      setLiveRideActive(!!ride);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to viewable live rides
  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe = () => {};

    // First fetch who the user follows, then subscribe
    const setupSubscription = async () => {
      try {
        // Get users this user follows
        const followingQuery = query(
          collection(db, 'follows'),
          where('followerId', '==', user.uid)
        );
        const followingSnap = await getDocs(followingQuery);
        const followingIds = followingSnap.docs.map(d => d.data().followingId);

        unsubscribe = subscribeToViewableLiveRides(user.uid, (rides) => {
          // Filter out our own ride
          const othersRides = rides.filter(r => r.uid !== user.uid);
          setViewableLiveRides(othersRides);
        }, followingIds);
      } catch (error) {
        console.error('Error setting up live rides subscription:', error);
      }
    };

    setupSubscription();

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to tracking relationships
  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to people I'm tracking
    const unsubTracks = subscribeToTracksAsTracker(user.uid, (tracks) => {
      setActiveTracks(tracks);
    });

    // Also fetch who is tracking me (for location updates)
    const fetchTrackers = async () => {
      try {
        const trackers = await getActiveTracksAsTracked(user.uid);
        setBeingTrackedBy(trackers);
      } catch (error) {
        console.error('Error fetching trackers:', error);
      }
    };
    fetchTrackers();

    return () => unsubTracks();
  }, [user?.uid]);

  // Subscribe to tracked rider locations
  useEffect(() => {
    if (activeTracks.length === 0) {
      setTrackedLocations([]);
      return;
    }

    const trackedIds = activeTracks.map(t => t.trackedId);
    const unsubLocations = subscribeToTrackedLocations(trackedIds, (locations) => {
      setTrackedLocations(locations);
    });

    return () => unsubLocations();
  }, [activeTracks]);

  // Update my location for trackers (piggyback on existing location updates)
  useEffect(() => {
    if (!user?.uid || !userProfile || beingTrackedBy.length === 0) return;
    if (!userLocation) return;

    // Update tracker location when being tracked
    updateTrackerLocation(
      user.uid,
      userProfile.streetName,
      userProfile.avatar,
      userLocation.lat,
      userLocation.lng
    ).catch(err => console.error('Error updating tracker location:', err));
  }, [userLocation, user?.uid, userProfile, beingTrackedBy.length]);

  // Add/update tracked rider markers on map
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove markers for riders no longer tracked
    const currentTrackedIds = new Set(trackedLocations.map(l => l.userId));
    trackedMarkersRef.current.forEach((marker, id) => {
      if (!currentTrackedIds.has(id)) {
        marker.remove();
        trackedMarkersRef.current.delete(id);
      }
    });

    // Add/update markers for tracked riders
    trackedLocations.forEach(loc => {
      if (!loc.location) return;

      const lat = loc.location.latitude;
      const lng = loc.location.longitude;
      const existingMarker = trackedMarkersRef.current.get(loc.userId);

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat([lng, lat]);
      } else {
        // Create new marker with green styling
        const el = document.createElement('div');
        el.className = 'tracked-rider-marker';
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00D4FF, #00FF88);
            border: 3px solid #00FF88;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
            overflow: hidden;
          ">
            ${loc.avatarUrl
              ? `<img src="${loc.avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : `<span style="font-weight: bold; color: #0a0a0a;">${loc.streetName?.[0]?.toUpperCase() || '?'}</span>`
            }
          </div>
          <div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #00FF88;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="3">
              <path d="M12 2L12 22M12 2L5 9M12 2L19 9"/>
            </svg>
          </div>
        `;
        el.style.position = 'relative';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current);

        trackedMarkersRef.current.set(loc.userId, marker);
      }
    });
  }, [trackedLocations, mapReady]);

  // Manage draggable meet point marker
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove existing marker if any
    if (meetPointMarkerRef.current) {
      meetPointMarkerRef.current.remove();
      meetPointMarkerRef.current = null;
    }

    if (isPlacingMeetPoint && meetPointLocation) {
      // Create draggable marker
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="background: #00D4FF; color: #0A0A0A; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
            Drag to move
          </div>
          <div style="font-size: 40px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); line-height: 1;">📍</div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: el,
        draggable: true,
        anchor: 'bottom'
      })
        .setLngLat([meetPointLocation.lng, meetPointLocation.lat])
        .addTo(map.current);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setMeetPointLocation({ lat: lngLat.lat, lng: lngLat.lng });
      });

      meetPointMarkerRef.current = marker;

      // Center map on the marker
      map.current.flyTo({
        center: [meetPointLocation.lng, meetPointLocation.lat],
        zoom: 15,
        duration: 500
      });
    }

    return () => {
      if (meetPointMarkerRef.current) {
        meetPointMarkerRef.current.remove();
        meetPointMarkerRef.current = null;
      }
    };
  }, [isPlacingMeetPoint, meetPointLocation, mapReady]);

  // Update LiveRide path on map
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const features = [];

    // Add current user's ride path
    if (currentRide && currentRide.pathPoints?.length > 1) {
      // Sort path points by time to ensure correct order
      const sortedPoints = [...currentRide.pathPoints].sort((a, b) => a.time - b.time);
      features.push({
        type: 'Feature',
        properties: { rideId: currentRide.id, isOwn: true },
        geometry: {
          type: 'LineString',
          coordinates: sortedPoints.map(p => [p.lng, p.lat])
        }
      });
    }

    // Add viewable rides paths
    viewableLiveRides.forEach(ride => {
      if (ride.pathPoints?.length > 1) {
        // Sort path points by time to ensure correct order
        const sortedPoints = [...ride.pathPoints].sort((a, b) => a.time - b.time);
        features.push({
          type: 'Feature',
          properties: { rideId: ride.id, isOwn: false },
          geometry: {
            type: 'LineString',
            coordinates: sortedPoints.map(p => [p.lng, p.lat])
          }
        });
      }
    });

    // Update the source
    const source = map.current.getSource('liveride-paths');
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [currentRide, viewableLiveRides, mapReady]);

  // Update LiveRide markers (start point + live position)
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear old LiveRide markers
    liveRideMarkersRef.current.forEach((marker) => marker.remove());
    liveRideMarkersRef.current.clear();

    const addLiveRideMarkers = (ride, isOwn) => {
      // Start point marker (green flag)
      const startEl = document.createElement('div');
      startEl.innerHTML = `
        <div style="position: relative;">
          <div style="width: 32px; height: 32px; background: #39FF14; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 10px rgba(57,255,20,0.5); border: 2px solid white;">
            🏁
          </div>
        </div>
      `;
      const startMarker = new mapboxgl.Marker(startEl)
        .setLngLat([ride.startLng, ride.startLat])
        .addTo(map.current);
      liveRideMarkersRef.current.set(`start-${ride.id}`, startMarker);

      // Current position marker with animated rider icon
      if (!isOwn) {
        const liveEl = document.createElement('div');
        const isPaused = ride.status === 'paused';
        const riderColor = getRiderColor(ride.uid);
        const restingUrl = `/rider-icons/${riderColor}_Resting.png`;
        const wheelieUrl = `/rider-icons/${riderColor}_Wheelie.png`;

        // Add CSS animation for alternating images
        const styleId = `rider-anim-${ride.id}`;
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes riderAnim-${ride.id} {
              0%, 45% { opacity: 1; }
              50%, 95% { opacity: 0; }
              100% { opacity: 1; }
            }
            @keyframes riderAnimAlt-${ride.id} {
              0%, 45% { opacity: 0; }
              50%, 95% { opacity: 1; }
              100% { opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }

        liveEl.innerHTML = `
          <div style="position: relative; width: 75px; height: 75px;">
            <img
              src="${restingUrl}"
              style="position: absolute; width: 75px; height: auto; filter: drop-shadow(0 0 10px rgba(0,212,255,0.7)); ${!isPaused ? `animation: riderAnim-${ride.id} 0.8s ease-in-out infinite;` : ''}"
            />
            ${!isPaused ? `<img
              src="${wheelieUrl}"
              style="position: absolute; width: 75px; height: auto; filter: drop-shadow(0 0 10px rgba(0,212,255,0.7)); animation: riderAnimAlt-${ride.id} 0.8s ease-in-out infinite;"
            />` : ''}
            <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); background: ${isPaused ? '#EAB308' : '#EF4444'}; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 8px; white-space: nowrap;">
              ${isPaused ? 'PAUSED' : 'LIVE'}
            </div>
            <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: #1a1a1a; color: #00D4FF; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 8px; white-space: nowrap; border: 1px solid #00D4FF;">
              ${ride.streetName}
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong>${ride.streetName}</strong>
            <p style="margin: 4px 0; font-size: 14px;">LiveRide in progress</p>
          </div>
        `);

        const liveMarker = new mapboxgl.Marker(liveEl)
          .setLngLat([ride.currentLng, ride.currentLat])
          .setPopup(popup)
          .addTo(map.current);
        liveRideMarkersRef.current.set(`live-${ride.id}`, liveMarker);
      }
    };

    // Add markers for viewable rides
    viewableLiveRides.forEach(ride => addLiveRideMarkers(ride, false));

    // Add start marker for own ride (but not live position - user marker handles that)
    if (currentRide) {
      const startEl = document.createElement('div');
      startEl.innerHTML = `
        <div style="position: relative;">
          <div style="width: 32px; height: 32px; background: #39FF14; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 10px rgba(57,255,20,0.5); border: 2px solid white;">
            🏁
          </div>
        </div>
      `;
      const startMarker = new mapboxgl.Marker(startEl)
        .setLngLat([currentRide.startLng, currentRide.startLat])
        .addTo(map.current);
      liveRideMarkersRef.current.set(`start-${currentRide.id}`, startMarker);
    }
  }, [currentRide, viewableLiveRides, mapReady]);

  // GPS tracking for active LiveRide
  useEffect(() => {
    if (!liveRideActive || !currentRide || currentRide.status === 'paused') {
      // Clear watch if ride is paused or ended
      if (liveRideWatchIdRef.current) {
        navigator.geolocation.clearWatch(liveRideWatchIdRef.current);
        liveRideWatchIdRef.current = null;
      }
      return;
    }

    // High accuracy GPS tracking for LiveRide
    liveRideWatchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        // Throttle updates to every 10 seconds
        if (now - lastPositionUpdateRef.current < 10000) return;
        lastPositionUpdateRef.current = now;

        try {
          await updateLiveRidePosition(
            currentRide.id,
            pos.coords.latitude,
            pos.coords.longitude
          );
        } catch (error) {
          console.error('Error updating LiveRide position:', error);
        }
      },
      (error) => {
        console.error('LiveRide GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );

    return () => {
      if (liveRideWatchIdRef.current) {
        navigator.geolocation.clearWatch(liveRideWatchIdRef.current);
        liveRideWatchIdRef.current = null;
      }
    };
  }, [liveRideActive, currentRide?.id, currentRide?.status]);

  // LiveRide handlers
  const handleStartLiveRide = async (selectedViewers, isPublic = false, followersOnly = false) => {
    if (!userLocation || !user?.uid || !userProfile) {
      setNotificationMessage('Enable location to start LiveRide');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    try {
      const ride = await startLiveRide(
        user.uid,
        userProfile,
        userLocation[0],
        userLocation[1],
        selectedViewers,
        isPublic,
        followersOnly
      );
      setCurrentRide(ride);
      setLiveRideActive(true);
      setShowStartRideModal(false);

      // Send notifications to selected viewers
      if (selectedViewers.length > 0) {
        await notifyLiveRideViewers(selectedViewers, {
          uid: user.uid,
          streetName: userProfile.streetName,
          avatar: userProfile.avatar
        }, ride.id);
      }

      const msg = isPublic
        ? 'Public LiveRide started! Anyone can watch.'
        : followersOnly
        ? 'LiveRide started! Your followers can watch.'
        : 'LiveRide started! Your route is being tracked.';
      setNotificationMessage(msg);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error starting LiveRide:', error);
      setNotificationMessage('Failed to start LiveRide');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  const handlePauseLiveRide = async () => {
    if (!currentRide) return;
    try {
      await pauseLiveRide(currentRide.id);
    } catch (error) {
      console.error('Error pausing LiveRide:', error);
    }
  };

  const handleResumeLiveRide = async () => {
    if (!currentRide) return;
    try {
      await resumeLiveRide(currentRide.id);
    } catch (error) {
      console.error('Error resuming LiveRide:', error);
    }
  };

  const handleEndLiveRide = async () => {
    if (!currentRide) return;
    try {
      // Save ride data before ending for potential video post
      const rideData = { ...currentRide };
      await endLiveRide(currentRide.id);

      // Store completed ride data and show post modal
      setCompletedRideData(rideData);
      setCurrentRide(null);
      setLiveRideActive(false);
      setShowPostRideModal(true);
    } catch (error) {
      console.error('Error ending LiveRide:', error);
    }
  };

  // Generate animated ride video
  const generateRideVideo = async (rideData) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      const pathPoints = rideData.pathPoints || [];
      if (pathPoints.length < 2) {
        reject(new Error('Not enough path points'));
        return;
      }

      // Sort by time
      const sortedPoints = [...pathPoints].sort((a, b) => a.time - b.time);

      // Calculate bounds
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      sortedPoints.forEach(p => {
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
      });

      // Add padding
      const latPad = (maxLat - minLat) * 0.15 || 0.01;
      const lngPad = (maxLng - minLng) * 0.15 || 0.01;
      minLat -= latPad; maxLat += latPad;
      minLng -= lngPad; maxLng += lngPad;

      // Convert lat/lng to canvas coords
      const toCanvas = (lat, lng) => ({
        x: ((lng - minLng) / (maxLng - minLng)) * 560 + 20,
        y: 580 - ((lat - minLat) / (maxLat - minLat)) * 560
      });

      // Animation settings
      const fps = 30;
      const duration = 15; // seconds
      const totalFrames = fps * duration;
      let currentFrame = 0;

      // MediaRecorder setup
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      mediaRecorder.onerror = reject;

      mediaRecorder.start();

      const drawFrame = () => {
        // Dark background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 600, 600);

        // Calculate how much of the path to show
        const progress = currentFrame / totalFrames;
        const pointsToShow = Math.floor(progress * sortedPoints.length);

        if (pointsToShow >= 2) {
          // Draw fire trail glow
          ctx.beginPath();
          const start = toCanvas(sortedPoints[0].lat, sortedPoints[0].lng);
          ctx.moveTo(start.x, start.y);
          for (let i = 1; i < pointsToShow; i++) {
            const p = toCanvas(sortedPoints[i].lat, sortedPoints[i].lng);
            ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
          ctx.lineWidth = 20;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Draw orange trail
          ctx.strokeStyle = 'rgba(255, 150, 0, 0.6)';
          ctx.lineWidth = 10;
          ctx.stroke();

          // Draw yellow core
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        // Draw start point (green)
        const startPt = toCanvas(sortedPoints[0].lat, sortedPoints[0].lng);
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#39FF14';
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw current position (pulsing blue)
        if (pointsToShow >= 1) {
          const currPt = toCanvas(sortedPoints[Math.min(pointsToShow, sortedPoints.length - 1)].lat,
                                   sortedPoints[Math.min(pointsToShow, sortedPoints.length - 1)].lng);
          const pulse = 1 + Math.sin(currentFrame * 0.3) * 0.2;
          ctx.beginPath();
          ctx.arc(currPt.x, currPt.y, 10 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = '#00D4FF';
          ctx.fill();
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Draw stats overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 180, 70);
        ctx.fillStyle = '#00D4FF';
        ctx.font = 'bold 16px system-ui';
        ctx.fillText('LIVERIDE', 20, 35);
        ctx.fillStyle = '#fff';
        ctx.font = '14px system-ui';
        const distKm = rideData.totalDistanceKm?.toFixed(1) || '0.0';
        const mins = rideData.durationMinutes || 0;
        ctx.fillText(`${distKm} km · ${mins} min`, 20, 58);

        currentFrame++;

        if (currentFrame <= totalFrames) {
          requestAnimationFrame(drawFrame);
        } else {
          mediaRecorder.stop();
        }
      };

      drawFrame();
    });
  };

  // Handle posting the ride video
  const handlePostRideVideo = async () => {
    if (!completedRideData || !user) return;

    setGeneratingVideo(true);
    try {
      // Generate the video
      const videoBlob = await generateRideVideo(completedRideData);

      // Upload to Firebase Storage
      const videoRef = ref(storage, `liverides/${user.uid}/${Date.now()}.webm`);
      await uploadBytes(videoRef, videoBlob);
      const videoUrl = await getDownloadURL(videoRef);

      // Create the post
      const distKm = completedRideData.totalDistanceKm?.toFixed(1) || '0.0';
      const mins = completedRideData.durationMinutes || 0;
      const postData = {
        userId: user.uid,
        streetName: userProfile?.streetName || 'Rider',
        userAvatar: userProfile?.avatar || '',
        mediaType: 'video',
        mediaUrl: videoUrl,
        caption: `Just finished a LiveRide! ${distKm} km in ${mins} minutes 🔥 #liveride #rideout`,
        hashtags: ['liveride', 'rideout'],
        likes: 0,
        likedBy: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
        location: completedRideData.pathPoints?.[0] ? {
          lat: completedRideData.pathPoints[0].lat,
          lng: completedRideData.pathPoints[0].lng
        } : null
      };

      await addDoc(collection(db, 'posts'), postData);

      setShowPostRideModal(false);
      setCompletedRideData(null);
      setNotificationMessage('Ride posted to feed! 🔥');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error('Error posting ride:', error);
      setNotificationMessage('Failed to post ride');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleSkipPostRide = () => {
    setShowPostRideModal(false);
    setCompletedRideData(null);
    setNotificationMessage('LiveRide ended!');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleUpdateViewers = async (viewers) => {
    if (!currentRide || !user?.uid || !userProfile) return;
    try {
      // Find newly added viewers to notify them
      const previousViewers = currentRide.allowedViewers || [];
      const newViewers = viewers.filter(v => !previousViewers.includes(v));

      await setViewers(currentRide.id, viewers);

      // Notify newly added viewers
      if (newViewers.length > 0) {
        await notifyLiveRideViewers(newViewers, {
          uid: user.uid,
          streetName: userProfile.streetName,
          avatar: userProfile.avatar
        }, currentRide.id);
      }
    } catch (error) {
      console.error('Error updating viewers:', error);
    }
  };

  const handleTogglePublic = async () => {
    if (!currentRide) return;
    try {
      const newPublicState = !currentRide.isPublic;
      await setRidePublic(currentRide.id, newPublicState);
      setNotificationMessage(newPublicState ? 'Ride is now public!' : 'Ride is now private');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } catch (error) {
      console.error('Error toggling public:', error);
    }
  };

  const handleViewRideOnMap = (ride) => {
    setViewingRideId(ride.id);
    if (map.current) {
      map.current.flyTo({
        center: [ride.currentLng, ride.currentLat],
        zoom: 15,
        duration: 1000
      });
    }
    setShowLiveRidesPanel(false);
  };

  const handleStopWatchingRide = () => {
    setViewingRideId(null);
  };

  // ============= END LIVERIDE FUNCTIONALITY =============

  const createAlert = async (type, meetupOptions = null) => {
    // Unlock audio on user interaction
    unlockAudio();

    // For meetups, use the selected location on map
    // For alerts/karen, require fresh GPS position from physical location
    if (type === 'meetup') {
      if (!meetPointLocation) {
        setNotificationMessage('Select a location on the map');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        return;
      }
    } else {
      // Get fresh GPS position for physical alerts
      setNotificationMessage('Getting your location...');
      setShowNotification(true);

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0 // Force fresh position, no cache
          });
        });

        // Update userLocation with fresh position
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setShowNotification(false);

        // Play siren immediately when alert button is pressed
        if (type === 'alert') {
          const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
          if (soundEnabled) {
            playSirenSound();
          }
        }

        try {
          const alertData = {
            type,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            reporter: userProfile?.streetName || 'VoltRider',
            reporterId: user?.uid,
            time: serverTimestamp(),
            confirmations: 1
          };

          await addDoc(collection(db, 'alerts'), alertData);

          // Also post to feed if enabled
          if (postToFeed) {
            const alertEmoji = ALERT_TYPES[type].emoji;
            const alertLabel = ALERT_TYPES[type].label;
            const postData = {
              userId: user.uid,
              streetName: userProfile?.streetName || 'Unknown',
              userAvatar: userProfile?.avatar || '',
              mediaType: 'none',
              mediaUrl: '',
              caption: `${alertEmoji} ${alertLabel} reported nearby! Stay alert riders. #${type} #rideout`,
              hashtags: [type, 'rideout'],
              likes: 0,
              likedBy: [],
              commentCount: 0,
              createdAt: serverTimestamp(),
              location: { lat: position.coords.latitude, lng: position.coords.longitude }
            };
            await addDoc(collection(db, 'posts'), postData);
          }

          setNotificationMessage(`${ALERT_TYPES[type].emoji} Alert sent${postToFeed ? ' & posted to feed' : ''}!`);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 4000);
        } catch (error) {
          console.error('Error creating alert:', error);
          setNotificationMessage('Failed to send alert');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
        }
        return;
      } catch (error) {
        console.error('GPS error:', error);
        setNotificationMessage('Could not get your location. Please enable GPS.');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 4000);
        return;
      }
    }

    // Meetup flow continues here
    try {
      const alertLat = meetPointLocation.lat;
      const alertLng = meetPointLocation.lng;

      const alertData = {
        type,
        lat: alertLat,
        lng: alertLng,
        reporter: userProfile?.streetName || 'VoltRider',
        reporterId: user?.uid,
        time: serverTimestamp(),
        confirmations: 1
      };

      // Add meetup-specific data
      if (type === 'meetup' && meetupOptions) {
        alertData.meetupTime = meetupOptions.meetupTime; // The actual meeting time
        alertData.visibility = meetupOptions.visibility; // 'followers' or 'selected'
        alertData.allowedViewers = meetupOptions.viewers || []; // Selected viewer UIDs
      }

      // Clear meet point state after creating
      if (type === 'meetup') {
        setIsPlacingMeetPoint(false);
        setMeetPointLocation(null);
      }

      await addDoc(collection(db, 'alerts'), alertData);

      // Also post to feed if enabled (for meetups)
      if (postToFeed && type === 'meetup' && meetupOptions) {
        const meetTime = new Date(meetupOptions.meetupTime);
        const timeStr = meetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const postData = {
          userId: user.uid,
          streetName: userProfile?.streetName || 'Unknown',
          userAvatar: userProfile?.avatar || '',
          mediaType: 'none',
          mediaUrl: '',
          caption: `📍 Meet Point set for ${timeStr}! Come join the ride. #meetup #rideout`,
          hashtags: ['meetup', 'rideout'],
          likes: 0,
          likedBy: [],
          commentCount: 0,
          createdAt: serverTimestamp(),
          location: { lat: alertLat, lng: alertLng }
        };
        await addDoc(collection(db, 'posts'), postData);
      }

      setNotificationMessage(`${ALERT_TYPES[type].emoji} ${postToFeed ? 'Posted & ' : ''}Sent to nearby riders!`);
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

      {/* Centered Pin Overlay - shows when placing new meet point */}
      {isPlacingMeetPoint && !meetPointLocation && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 15 }}
        >
          <div className="flex flex-col items-center" style={{ marginBottom: '40px' }}>
            <div className="bg-neon-blue text-dark-bg px-3 py-1 rounded-lg text-sm font-bold mb-2 shadow-lg">
              Drop here
            </div>
            <div style={{ fontSize: '48px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>📍</div>
          </div>
        </div>
      )}

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

        {/* Meet Point Placement UI */}
        {isPlacingMeetPoint && (
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="bg-dark-card/95 backdrop-blur px-4 py-2 rounded-full border border-neon-blue">
              <p className="text-white text-sm font-medium">
                {meetPointLocation ? '📍 Drag pin to adjust location' : '📍 Pan map to position the pin'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPlacingMeetPoint(false);
                  setMeetPointLocation(null);
                  setEditingMeetPointId(null);
                }}
                className="px-6 py-3 bg-dark-card border border-dark-border rounded-xl text-gray-400 font-medium"
                style={{ pointerEvents: 'auto' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // If no location set yet, get map center
                  if (!meetPointLocation && map.current) {
                    const center = map.current.getCenter();
                    setMeetPointLocation({ lat: center.lat, lng: center.lng });
                  }
                  setShowMeetPointModal(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-green rounded-xl text-dark-bg font-bold"
                style={{ pointerEvents: 'auto' }}
              >
                Confirm Location
              </button>
            </div>
          </div>
        )}

        {/* Quick Alert Buttons */}
        {!isPlacingMeetPoint && (
        <div className="flex justify-center gap-2">
          {Object.entries(ALERT_TYPES).map(([key, { color, label, emoji }]) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'meetup') {
                  // Enter placing mode - pan map to position, pin stays centered
                  setMeetPointLocation(null); // No location yet - user will pan to position
                  setIsPlacingMeetPoint(true);
                  setEditingMeetPointId(null);
                  // Set default time to 30 mins from now
                  const now = new Date();
                  now.setMinutes(now.getMinutes() + 30);
                  const timeStr = now.toTimeString().slice(0, 5);
                  setMeetPointTime(timeStr);
                  setMeetPointVisibility('followers');
                  setMeetPointViewers([]);
                } else {
                  createAlert(key);
                }
              }}
              className="flex items-center justify-center gap-0.5 w-28 py-2 rounded-full shadow-xl"
              style={{ backgroundColor: color, pointerEvents: 'auto' }}
            >
              <span className="text-lg leading-none">{emoji}</span>
              <span className="text-white text-xs font-medium leading-none">{label}</span>
            </button>
          ))}
        </div>
        )}
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

      {/* Toggle rider names */}
      <div className="fixed right-4 top-52" style={{ zIndex: 10 }}>
        <button
          onClick={() => setShowRiderNames(!showRiderNames)}
          className={`p-3 backdrop-blur rounded-xl shadow-xl border ${showRiderNames ? 'bg-neon-blue/20 border-neon-blue' : 'bg-dark-card/95 border-white/10'}`}
        >
          <Tag size={20} className={showRiderNames ? 'text-neon-blue' : 'text-white'} />
        </button>
      </div>

      {/* LiveRide Button - show when not in active ride */}
      {!liveRideActive && (
        <div className="fixed right-4 top-64" style={{ zIndex: 10 }}>
          <button
            onClick={() => setShowStartRideModal(true)}
            className="p-3 bg-gradient-to-r from-neon-blue to-neon-green rounded-xl shadow-xl flex items-center gap-2"
          >
            <Radio size={20} className="text-dark-bg" />
          </button>
        </div>
      )}

      {/* Live Rides Viewer Button - show count of viewable rides */}
      {viewableLiveRides.length > 0 && !liveRideActive && (
        <div className="fixed right-4 top-80" style={{ zIndex: 10 }}>
          <button
            onClick={() => setShowLiveRidesPanel(true)}
            className="p-3 bg-red-500/90 backdrop-blur rounded-xl shadow-xl relative"
          >
            <Eye size={20} className="text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-blue text-dark-bg text-xs font-bold rounded-full flex items-center justify-center">
              {viewableLiveRides.length}
            </span>
          </button>
        </div>
      )}

      {/* Track Riders Button */}
      <div className="fixed right-4 top-96" style={{ zIndex: 10 }}>
        <button
          onClick={() => setShowTrackModal(true)}
          className={`p-3 backdrop-blur rounded-xl shadow-xl relative ${
            activeTracks.length > 0
              ? 'bg-neon-green/90 border border-neon-green'
              : 'bg-dark-card/95 border border-white/10'
          }`}
        >
          <Navigation size={20} className={activeTracks.length > 0 ? 'text-dark-bg' : 'text-white'} />
          {activeTracks.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-dark-bg text-neon-green text-xs font-bold rounded-full flex items-center justify-center border border-neon-green">
              {activeTracks.length}
            </span>
          )}
        </button>
      </div>

      {/* Tracked Riders Overlay */}
      <AnimatePresence>
        {activeTracks.length > 0 && (
          <TrackedRidersOverlay
            trackedRiders={activeTracks.map(track => ({
              track,
              location: trackedLocations.find(l => l.userId === track.trackedId)
            }))}
            userLocation={userLocation}
            onCenterOnRider={(location) => {
              if (map.current && location?.location) {
                map.current.flyTo({
                  center: [location.location.longitude, location.location.latitude],
                  zoom: 15
                });
              }
            }}
            onStopTracking={(track) => {
              setActiveTracks(prev => prev.filter(t => t.id !== track.id));
            }}
            currentUser={{ uid: user?.uid, streetName: userProfile?.streetName, avatar: userProfile?.avatar }}
          />
        )}
      </AnimatePresence>

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
      {showPanel && !liveRideActive && (
        <div className="bg-dark-card border-t border-dark-border rounded-t-3xl z-10">
          <div className="w-12 h-1 bg-dark-border rounded-full mx-auto my-3 cursor-pointer" onClick={() => setShowPanel(false)} />

          <div className="flex border-b border-dark-border px-4">
            {['alerts', 'riders', 'live'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize flex items-center justify-center gap-1 ${activeTab === tab ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500'}`}
              >
                {tab}
                {tab === 'live' && viewableLiveRides.length > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {viewableLiveRides.length}
                  </span>
                )}
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

            {activeTab === 'live' && (
              viewableLiveRides.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Radio size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No live rides</p>
                  <p className="text-xs mt-1">When friends share rides, they'll appear here</p>
                </div>
              ) : (
                viewableLiveRides.map(ride => (
                  <LiveRideCard
                    key={ride.id}
                    ride={ride}
                    onViewOnMap={() => handleViewRideOnMap(ride)}
                    onStopWatching={handleStopWatchingRide}
                    isViewing={viewingRideId === ride.id}
                  />
                ))
              )
            )}
          </div>
        </div>
      )}

      {!showPanel && !liveRideActive && (
        <button onClick={() => setShowPanel(true)} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-6 py-3 bg-dark-card/90 backdrop-blur rounded-full shadow-lg flex items-center gap-2">
          <ChevronUp size={20} className="text-neon-blue" />
          <span className="text-white font-medium">Show panel</span>
        </button>
      )}

      {/* LiveRide Panel - show when ride is active */}
      {liveRideActive && currentRide && (
        <LiveRidePanel
          ride={currentRide}
          onPause={handlePauseLiveRide}
          onResume={handleResumeLiveRide}
          onEnd={handleEndLiveRide}
          onAddViewers={() => setShowViewerSelector(true)}
          onTogglePublic={handleTogglePublic}
          isMinimized={liveRidePanelMinimized}
          onToggleMinimize={() => setLiveRidePanelMinimized(!liveRidePanelMinimized)}
        />
      )}

      {/* Viewer Selector Modal - for managing viewers during an active ride */}
      {liveRideActive && (
        <ViewerSelector
          isOpen={showViewerSelector}
          onClose={() => setShowViewerSelector(false)}
          onConfirm={handleUpdateViewers}
          selectedViewers={currentRide?.allowedViewers || []}
          title="Manage Viewers"
        />
      )}

      {/* Viewer Selector for Starting Ride - when not in active ride */}
      {!liveRideActive && (
        <ViewerSelector
          isOpen={showViewerSelector}
          onClose={() => setShowViewerSelector(false)}
          onConfirm={(viewers) => {
            handleStartLiveRide(viewers);
            setShowViewerSelector(false);
          }}
          selectedViewers={[]}
          title="Who Can Watch Your Ride?"
        />
      )}

      {/* Start LiveRide Modal */}
      <AnimatePresence>
        {showStartRideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStartRideModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center mx-auto mb-4">
                  <Radio size={32} className="text-dark-bg" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Start LiveRide</h3>
                <p className="text-gray-400">
                  Share your journey in real-time. Choose who can watch your ride.
                </p>
              </div>

              <div className="space-y-3">
                {/* Public Ride Option */}
                <button
                  onClick={() => handleStartLiveRide([], true)}
                  className="w-full py-4 bg-gradient-to-r from-hot-orange to-hot-magenta text-white font-bold rounded-xl text-lg flex items-center justify-center gap-2"
                >
                  <Eye size={20} />
                  Public Ride
                </button>
                <p className="text-center text-gray-500 text-xs -mt-1 mb-2">Anyone can watch</p>

                {/* Followers Only Option */}
                <button
                  onClick={() => handleStartLiveRide([], false, true)}
                  className="w-full py-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl text-lg flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  Followers Only
                </button>
                <p className="text-center text-gray-500 text-xs -mt-1 mb-2">Your followers can watch</p>

                {/* Select Specific Viewers */}
                <button
                  onClick={() => {
                    setShowStartRideModal(false);
                    setShowViewerSelector(true);
                  }}
                  className="w-full py-4 bg-dark-surface text-white rounded-xl font-bold text-lg"
                >
                  Select Specific Viewers
                </button>

                {/* Private without Viewers */}
                <button
                  onClick={() => handleStartLiveRide([], false)}
                  className="w-full py-4 bg-dark-surface text-gray-400 rounded-xl font-bold text-lg"
                >
                  Private (Just Me)
                </button>

                <button
                  onClick={() => setShowStartRideModal(false)}
                  className="w-full py-4 text-gray-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Ride Modal */}
      <AnimatePresence>
        {showPostRideModal && completedRideData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-hot-orange to-yellow-500 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔥</span>
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Ride Complete!</h3>
                <div className="flex justify-center gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-neon-blue">{completedRideData.totalDistanceKm?.toFixed(1) || '0.0'}</p>
                    <p className="text-xs text-gray-400">km</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-neon-green">{completedRideData.durationMinutes || 0}</p>
                    <p className="text-xs text-gray-400">min</p>
                  </div>
                </div>
                <p className="text-gray-400">
                  Share your ride as an animated video?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePostRideVideo}
                  disabled={generatingVideo}
                  className="w-full py-4 bg-gradient-to-r from-hot-orange to-yellow-500 text-dark-bg font-bold rounded-xl text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generatingVideo ? (
                    <>
                      <div className="w-5 h-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Radio size={20} />
                      Post to Feed
                    </>
                  )}
                </button>

                <button
                  onClick={handleSkipPostRide}
                  disabled={generatingVideo}
                  className="w-full py-4 text-gray-500 disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meet Point Modal */}
      <AnimatePresence>
        {showMeetPointModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMeetPointModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-card rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-neon-blue flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-dark-bg" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">
                  {editingMeetPointId ? 'Edit Meet Point' : 'Set Meet Point'}
                </h3>
                <p className="text-gray-400">
                  {editingMeetPointId
                    ? 'Update the time or drag the pin to change location'
                    : 'Choose a time and who can see the meeting location'}
                </p>
              </div>

              {/* Time Picker */}
              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
                  <Clock size={16} />
                  Meeting Time
                </label>
                <input
                  type="time"
                  value={meetPointTime}
                  onChange={(e) => setMeetPointTime(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-xl text-white text-lg focus:border-neon-blue transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Point expires 30 mins after this time</p>
              </div>

              {/* Visibility Options */}
              <div className="mb-6">
                <label className="text-gray-400 text-sm mb-3 block flex items-center gap-2">
                  <Users size={16} />
                  Who can see this?
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setMeetPointVisibility('followers')}
                    className={`w-full py-3 px-4 rounded-xl font-medium flex items-center gap-3 transition-all ${
                      meetPointVisibility === 'followers'
                        ? 'bg-neon-blue/20 border border-neon-blue text-white'
                        : 'bg-dark-surface border border-dark-border text-gray-400'
                    }`}
                  >
                    <Users size={20} />
                    <div className="text-left">
                      <p className="font-medium">All Followers</p>
                      <p className="text-xs opacity-70">Everyone who follows you</p>
                    </div>
                    {meetPointVisibility === 'followers' && (
                      <UserCheck size={20} className="ml-auto text-neon-blue" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setMeetPointVisibility('selected');
                      setShowMeetPointModal(false);
                      setShowMeetPointViewerSelector(true);
                    }}
                    className={`w-full py-3 px-4 rounded-xl font-medium flex items-center gap-3 transition-all ${
                      meetPointVisibility === 'selected'
                        ? 'bg-neon-blue/20 border border-neon-blue text-white'
                        : 'bg-dark-surface border border-dark-border text-gray-400'
                    }`}
                  >
                    <UserCheck size={20} />
                    <div className="text-left">
                      <p className="font-medium">Select Viewers</p>
                      <p className="text-xs opacity-70">
                        {meetPointViewers.length > 0
                          ? `${meetPointViewers.length} selected`
                          : 'Choose specific people'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    // Calculate meetup timestamp
                    const [hours, minutes] = meetPointTime.split(':').map(Number);
                    const meetupDate = new Date();
                    meetupDate.setHours(hours, minutes, 0, 0);
                    // If time is earlier than now, assume tomorrow
                    if (meetupDate < new Date()) {
                      meetupDate.setDate(meetupDate.getDate() + 1);
                    }

                    if (editingMeetPointId) {
                      // Update existing meetup
                      try {
                        const alertRef = doc(db, 'alerts', editingMeetPointId);
                        await updateDoc(alertRef, {
                          lat: meetPointLocation.lat,
                          lng: meetPointLocation.lng,
                          meetupTime: meetupDate.getTime(),
                          visibility: meetPointVisibility,
                          allowedViewers: meetPointViewers
                        });
                        setNotificationMessage('📍 Meet point updated!');
                        setShowNotification(true);
                        setTimeout(() => setShowNotification(false), 3000);
                      } catch (error) {
                        console.error('Error updating meetup:', error);
                      }
                      setEditingMeetPointId(null);
                      setIsPlacingMeetPoint(false);
                      setMeetPointLocation(null);
                    } else {
                      // Create new meetup
                      createAlert('meetup', {
                        meetupTime: meetupDate.getTime(),
                        visibility: meetPointVisibility,
                        viewers: meetPointViewers
                      });
                    }
                    setShowMeetPointModal(false);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-neon-blue to-neon-green text-dark-bg font-bold rounded-xl text-lg"
                >
                  {editingMeetPointId ? 'Update Meet Point' : 'Drop Meet Point'}
                </button>
                <button
                  onClick={() => setShowMeetPointModal(false)}
                  className="w-full py-4 text-gray-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meet Point Viewer Selector */}
      <ViewerSelector
        isOpen={showMeetPointViewerSelector}
        onClose={() => {
          setShowMeetPointViewerSelector(false);
          setShowMeetPointModal(true);
        }}
        onConfirm={(viewers) => {
          setMeetPointViewers(viewers);
          setMeetPointVisibility('selected');
          setShowMeetPointViewerSelector(false);
          setShowMeetPointModal(true);
        }}
        selectedViewers={meetPointViewers}
        title="Select Who Can See"
      />

      {/* Live Rides Panel - shows rides from others */}
      <AnimatePresence>
        {showLiveRidesPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowLiveRidesPanel(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-dark-card rounded-t-3xl max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Radio size={20} className="text-red-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Live Rides</h2>
                    <p className="text-gray-400 text-sm">
                      {viewableLiveRides.length} friend{viewableLiveRides.length !== 1 ? 's' : ''} riding now
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLiveRidesPanel(false)}
                  className="p-2 rounded-full hover:bg-dark-surface transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              {/* Rides List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {viewableLiveRides.map(ride => (
                  <LiveRideCard
                    key={ride.id}
                    ride={ride}
                    onViewOnMap={() => handleViewRideOnMap(ride)}
                    onStopWatching={handleStopWatchingRide}
                    isViewing={viewingRideId === ride.id}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewing Ride Card - minimal fire indicator when watching someone's ride */}
      <AnimatePresence>
        {viewingRideId && !showLiveRidesPanel && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-10"
          >
            {(() => {
              const viewedRide = viewableLiveRides.find(r => r.id === viewingRideId);
              if (!viewedRide) return null;
              return (
                <LiveRideCard
                  ride={viewedRide}
                  onViewOnMap={() => handleViewRideOnMap(viewedRide)}
                  onStopWatching={handleStopWatchingRide}
                  isViewing={true}
                  minimal={true}
                />
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track Request Modal */}
      <TrackRequestModal
        isOpen={showTrackModal}
        onClose={() => setShowTrackModal(false)}
        onRequestSent={(targetUser) => {
          setNotificationMessage(`Tracking request sent to ${targetUser.streetName}`);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
        }}
      />

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
