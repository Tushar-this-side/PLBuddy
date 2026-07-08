const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const initialState = {
  profile: {
    displayName: 'Astra Vale',
    email: 'astra@plbuddy.app',
    phone: '+1 555 0148',
    avatar: '/uploads/default-avatar.svg',
    authProviders: {
      email: true,
      phone: false,
      google: true,
      github: false
    }
  },
  theme: {
    mode: 'dark',
    accent: 'cyberpunk',
    glass: true
  },
  playlists: [
    {
      id: 'spotify-1',
      title: 'Studio Flow',
      platform: 'Spotify',
      icon: '🎧',
      connected: true,
      totalTracks: 24,
      lastSynced: '2m ago',
      backupMode: 'local',
      songs: [
        { title: 'Midnight Pulse', artist: 'Ava', platform: 'Spotify', playCount: 42, trackId: 'sp-101', syncedAt: ['Mon', 'Wed'] },
        { title: 'Neon Skyline', artist: 'Niko', platform: 'Spotify', playCount: 29, trackId: 'sp-102', syncedAt: ['Tue', 'Thu'] }
      ]
    },
    {
      id: 'ytm-2',
      title: 'Producer Nights',
      platform: 'YouTube Music',
      icon: '🎼',
      connected: true,
      totalTracks: 15,
      lastSynced: '10m ago',
      backupMode: 'cloud',
      songs: [
        { title: 'Afterglow', artist: 'Lena', platform: 'YouTube Music', playCount: 18, trackId: 'yt-201', syncedAt: ['Fri'] },
        { title: 'Velvet Static', artist: 'Dex', platform: 'YouTube Music', playCount: 33, trackId: 'yt-202', syncedAt: ['Sat'] }
      ]
    },
    {
      id: 'local-3',
      title: 'Local Vault Mix',
      platform: 'Local Storage',
      icon: '💾',
      connected: true,
      totalTracks: 8,
      lastSynced: '1h ago',
      backupMode: 'local',
      songs: [
        { title: 'Cloud Drift', artist: 'Mara', platform: 'Local Storage', playCount: 12, trackId: 'loc-301', syncedAt: ['Sun'] },
        { title: 'Deep Static', artist: 'Jules', platform: 'Local Storage', playCount: 21, trackId: 'loc-302', syncedAt: ['Mon'] }
      ]
    }
  ],
  vault: [
    { id: 'asset-1', name: 'Midnight Bass', bpm: 128, key: 'Am', locked: true, tags: ['bass', 'night'], shareMode: 'local-only', previewActive: false },
    { id: 'asset-2', name: 'Neon Synth', bpm: 96, key: 'C', locked: false, tags: ['synth', 'lead'], shareMode: 'shareable', previewActive: true },
    { id: 'asset-3', name: 'Velvet Drums', bpm: 140, key: 'F#m', locked: true, tags: ['drums'], shareMode: 'local-only', previewActive: false }
  ],
  insights: {
    topTracks: [
      { title: 'Midnight Pulse', loops: 42, metricId: 'metric-1' },
      { title: 'Velvet Static', loops: 33, metricId: 'metric-2' },
      { title: 'Deep Static', loops: 21, metricId: 'metric-3' },
      { title: 'Afterglow', loops: 18, metricId: 'metric-4' },
      { title: 'Cloud Drift', loops: 12, metricId: 'metric-5' }
    ],
    totalLoopsThisWeek: 142,
    wrappedSummary: 'You looped your favorite tracks 142 times this week, and Studio Flow stayed on repeat the longest.',
    fatigueWarning: 15,
    timeSeries: {
      'metric-1': [6, 7, 8, 10, 5, 4, 2],
      'metric-2': [4, 3, 4, 8, 6, 5, 3],
      'metric-3': [2, 3, 2, 4, 4, 5, 2]
    }
  },
  player: {
    title: 'Midnight Pulse',
    artist: 'Ava',
    progress: 42,
    volume: 72,
    repeatCount: 14
  },
  vaultSecurity: {
    mode: 'passphrase',
    passphrase: 'ProStudio90!',
    biometricEnabled: false
  },
  ui: {
    activeRootView: 'playlist',
    settingsView: 'root',
    playlistView: 'root',
    selectedPlaylistId: 'spotify-1',
    vaultView: 'root',
    selectedVaultId: 'asset-1',
    insightsView: 'root',
    selectedMetricId: 'metric-1',
    selectedSongIndex: 0,
    songDrawerOpen: false,
    selectedSong: null
  }
};

const appState = JSON.parse(JSON.stringify(initialState));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({ secret: 'plbuddy-secret', resave: false, saveUninitialized: true }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PLBuddy' });
});

app.get('/api/dashboard', (_req, res) => {
  res.json(appState);
});

app.post('/api/profile', (req, res) => {
  const { displayName, email, phone } = req.body;
  if (displayName) appState.profile.displayName = displayName;
  if (email) appState.profile.email = email;
  if (phone !== undefined) appState.profile.phone = phone;
  res.json({ success: true, profile: appState.profile });
});

app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No avatar uploaded.' });
  }
  appState.profile.avatar = `/uploads/${req.file.filename}`;
  return res.json({ success: true, profile: appState.profile });
});

app.post('/api/theme', (req, res) => {
  const { mode, accent, glass } = req.body;
  if (mode) appState.theme.mode = mode;
  if (accent) appState.theme.accent = accent;
  if (glass !== undefined) appState.theme.glass = Boolean(glass);
  res.json({ success: true, theme: appState.theme });
});

app.post('/api/vault-security', (req, res) => {
  const { mode, passphrase, biometricEnabled } = req.body;
  if (mode && ['passphrase', 'biometric'].includes(mode)) {
    appState.vaultSecurity.mode = mode;
  }
  if (passphrase !== undefined && typeof passphrase === 'string' && passphrase.trim().length) {
    appState.vaultSecurity.passphrase = passphrase.trim();
  }
  if (biometricEnabled !== undefined) {
    appState.vaultSecurity.biometricEnabled = Boolean(biometricEnabled);
  }
  res.json({ success: true, vaultSecurity: appState.vaultSecurity });
});

app.post('/api/verify-vault', (req, res) => {
  const { passphrase, biometric } = req.body;
  if (biometric) {
    if (appState.vaultSecurity.mode === 'biometric') {
      return res.json({ success: true, message: 'Biometric authentication simulated successfully.' });
    }
    return res.status(403).json({ success: false, message: 'Biometric authentication is not enabled.' });
  }
  if (!passphrase || typeof passphrase !== 'string') {
    return res.status(400).json({ success: false, message: 'Passphrase is required.' });
  }
  if (appState.vaultSecurity.mode !== 'passphrase') {
    return res.status(403).json({ success: false, message: 'Passphrase mode is not active.' });
  }
  if (passphrase.trim() !== appState.vaultSecurity.passphrase) {
    return res.status(401).json({ success: false, message: 'Invalid passphrase.' });
  }
  return res.json({ success: true, message: 'Vault unlocked.' });
});

app.post('/api/toggle-auth-provider', (req, res) => {
  const { provider } = req.body;
  if (provider && appState.profile.authProviders[provider] !== undefined) {
    appState.profile.authProviders[provider] = !appState.profile.authProviders[provider];
  }
  res.json({ success: true, profile: appState.profile });
});

app.post('/api/select-playlist', (req, res) => {
  const { playlistId, view, songIndex } = req.body;
  appState.ui.selectedPlaylistId = playlistId;
  appState.ui.playlistView = view || 'detail';
  appState.ui.selectedSongIndex = songIndex ?? 0;
  appState.ui.selectedSong = appState.playlists.find((playlist) => playlist.id === playlistId)?.songs[songIndex ?? 0] || null;
  res.json({ success: true, ui: appState.ui });
});

app.post('/api/select-song', (req, res) => {
  const { playlistId, songIndex } = req.body;
  const playlist = appState.playlists.find((item) => item.id === playlistId);
  if (!playlist || !playlist.songs[songIndex]) {
    return res.status(404).json({ success: false, message: 'Song not found' });
  }
  appState.ui.selectedPlaylistId = playlistId;
  appState.ui.selectedSongIndex = songIndex;
  appState.ui.selectedSong = playlist.songs[songIndex];
  appState.ui.songDrawerOpen = true;
  return res.json({ success: true, ui: appState.ui, song: appState.ui.selectedSong });
});

app.post('/api/close-song-drawer', (_req, res) => {
  appState.ui.songDrawerOpen = false;
  res.json({ success: true, ui: appState.ui });
});

app.post('/api/sync-playlists', (_req, res) => {
  appState.playlists = appState.playlists.map((playlist) => ({ ...playlist, lastSynced: 'just now' }));
  res.json({ success: true, playlists: appState.playlists });
});

app.post('/api/backup-playlists', (req, res) => {
  const { mode } = req.body;
  appState.playlists = appState.playlists.map((playlist) => ({ ...playlist, backupMode: mode || playlist.backupMode }));
  res.json({ success: true, message: 'Playlists backed up and mirrored to your selected destination.' });
});

app.post('/api/import-asset', (req, res) => {
  const name = req.body.name || 'New Asset';
  appState.vault.push({
    id: `asset-${Date.now()}`,
    name,
    bpm: 120,
    key: 'D',
    locked: true,
    tags: ['new'],
    shareMode: 'local-only',
    previewActive: false
  });
  res.json({ success: true, vault: appState.vault });
});

app.post('/api/select-vault', (req, res) => {
  const { assetId } = req.body;
  appState.ui.selectedVaultId = assetId;
  appState.ui.vaultView = 'detail';
  res.json({ success: true, ui: appState.ui });
});

app.post('/api/unlock-asset', (req, res) => {
  const { assetId, passphrase } = req.body;
  const asset = appState.vault.find((item) => item.id === assetId);
  if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
  if (!passphrase || passphrase.length < 4) return res.status(400).json({ success: false, message: 'Passphrase is required.' });
  asset.locked = false;
  asset.previewActive = true;
  res.json({ success: true, asset, message: 'Vault unlocked successfully.' });
});

app.post('/api/update-asset', (req, res) => {
  const { assetId, bpm, key, tags, shareMode } = req.body;
  const asset = appState.vault.find((item) => item.id === assetId);
  if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
  if (bpm !== undefined) asset.bpm = Number(bpm);
  if (key) asset.key = key;
  if (tags) asset.tags = tags;
  if (shareMode) asset.shareMode = shareMode;
  res.json({ success: true, asset });
});

app.post('/api/select-insight', (req, res) => {
  const { metricId } = req.body;
  appState.ui.selectedMetricId = metricId;
  appState.ui.insightsView = 'detail';
  res.json({ success: true, ui: appState.ui });
});

app.post('/api/set-fatigue-warning', (req, res) => {
  const { value } = req.body;
  appState.insights.fatigueWarning = Number(value);
  res.json({ success: true, insights: appState.insights });
});

app.post('/api/increment-play-count', (req, res) => {
  const { playlistId, songIndex } = req.body;
  const playlist = appState.playlists.find((item) => item.id === playlistId);
  if (!playlist || !playlist.songs[songIndex]) return res.status(404).json({ success: false, message: 'Song not found' });
  playlist.songs[songIndex].playCount += 1;
  return res.json({ success: true, playlist });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    req.session.user = { email };
    return res.json({ success: true, message: 'Signed in', profile: appState.profile });
  }
  return res.status(400).json({ success: false, message: 'Missing credentials' });
});

app.post('/api/social-login', (req, res) => {
  const { provider } = req.body;
  if (!provider) {
    return res.status(400).json({ success: false, message: 'Provider required' });
  }

  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  appState.profile.email = `${provider}@plbuddy.app`;
  appState.profile.displayName = `${providerName} User`;
  appState.profile.authProviders[provider] = true;

  req.session.user = { provider, email: appState.profile.email };
  return res.json({ success: true, profile: appState.profile, message: `Logged in with ${providerName}` });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.listen(PORT, () => console.log(`PLBuddy app running at http://localhost:${PORT}`));
