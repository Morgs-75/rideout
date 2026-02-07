// Spotify API Service for fetching trending music
// To enable: Add VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET to your .env file

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = 0;

// Get access token using Client Credentials flow
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.log('Spotify credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
    return accessToken;
  } catch (error) {
    console.error('Failed to get Spotify token:', error);
    return null;
  }
}

// Fetch tracks from a playlist
export async function getPlaylistTracks(playlistId) {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=20`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();

    return data.items
      .filter(item => item.track && item.track.preview_url)
      .map(item => ({
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        cover: item.track.album.images[0]?.url,
        url: item.track.preview_url,
        duration: item.track.duration_ms
      }));
  } catch (error) {
    console.error('Failed to fetch playlist:', error);
    return null;
  }
}

// Fetch trending/viral tracks
export async function getTrendingTracks() {
  // Spotify's "Today's Top Hits" playlist
  return getPlaylistTracks('37i9dQZF1DXcBWIGoYBM5M');
}

// Fetch viral tracks
export async function getViralTracks() {
  // Spotify's "Viral 50 - Global" playlist
  return getPlaylistTracks('37i9dQZEVXbLiRSasKsNU9');
}

// Search for tracks
export async function searchTracks(query) {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();

    return data.tracks.items
      .filter(track => track.preview_url)
      .map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        cover: track.album.images[0]?.url,
        url: track.preview_url,
        duration: track.duration_ms
      }));
  } catch (error) {
    console.error('Failed to search tracks:', error);
    return null;
  }
}

// Check if Spotify is configured
export function isSpotifyConfigured() {
  return !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);
}
