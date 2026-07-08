const navItems = [
  { id: 'playlist', label: 'Playlist Hub', icon: '🎶' },
  { id: 'vault', label: 'Producer Vault', icon: '🔒' },
  { id: 'insights', label: 'Insights', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

const appElements = {
  navRoot: document.getElementById('nav-links'),
  mainView: document.getElementById('main-view'),
  welcomeScreen: document.getElementById('welcome-screen'),
  appShell: document.getElementById('app-shell'),
  enterButton: document.getElementById('enter-dashboard'),
  demoLoginButton: document.getElementById('demo-login'),
  syncButton: document.getElementById('sync-playlists'),
  backupButton: document.getElementById('backup-playlists'),
  modalOverlay: document.getElementById('modal-overlay'),
  closeModalButton: document.getElementById('close-modal'),
  unlockAssetButton: document.getElementById('unlock-asset'),
  passphraseInput: document.getElementById('passphrase-input'),
  playlistModalOverlay: document.getElementById('playlist-modal-overlay'),
  mobileNavRoot: document.getElementById('mobile-bottom-nav'),
  playlistModalCloseButton: document.getElementById('playlist-modal-close'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  googleButton: document.getElementById('login-google'),
  twitterButton: document.getElementById('login-twitter'),
  appleButton: document.getElementById('login-apple'),
  authModeToggleButton: document.getElementById('auth-mode-toggle'),
  authToggleCopy: document.getElementById('auth-toggle-copy'),
  authStateLabel: document.getElementById('auth-state-label'),
  confirmPasswordInput: document.getElementById('manual-login-confirm-password'),
  authSubmitButton: document.getElementById('manual-login-submit'),
  audioElement: document.getElementById('audio-element'),
  playerPlayPause: document.getElementById('player-play-pause'),
  playerPrev: document.getElementById('player-prev'),
  playerNext: document.getElementById('player-next'),
  playerVolumeSlider: document.getElementById('player-volume-slider'),
  playerVolumeLabel: document.getElementById('player-volume'),
  vaultSecurityOverlay: document.getElementById('vault-security-overlay'),
  vaultSecurityCancel: document.getElementById('vault-security-cancel'),
  vaultPasswordForm: document.getElementById('vault-password-form'),
  vaultPasswordSubmit: document.getElementById('vault-password-submit'),
  vaultSetupPanel: document.getElementById('vault-setup-panel'),
  vaultEnterPanel: document.getElementById('vault-enter-panel'),
  vaultSetupPassInput: document.getElementById('vault-setup-pass'),
  vaultEnterPassInput: document.getElementById('vault-enter-pass'),
  vaultConfirmPassInput: document.getElementById('vault-confirm-pass'),
  vaultBiometricPanel: document.getElementById('vault-biometric-panel'),
  vaultBiometricAction: document.getElementById('vault-biometric-action'),
  vaultSecurityDescription: document.getElementById('vault-security-description'),
  vaultSecurityError: document.getElementById('vault-security-error')
};

const storageKeys = {
  securityConfig: 'plbuddy-security-config',
  themeConfig: 'plbuddy-theme-config',
  appRoute: 'plbuddy-current-route'
};

const VAULT_STORAGE_KEY = 'plb_vault_password';
const MOBILE_VAULT_PIN = '4826';
const defaultSecurityConfig = {
  mode: 'passphrase',
  passphrase: 'ProStudio90!',
  biometricEnabled: false,
  lastVerifiedAt: null
};

const state = {
  profile: null,
  theme: null,
  playlists: [],
  vault: [],
  insights: null,
  player: null,
  ui: {
    activeRootView: 'playlist',
    settingsView: 'root',
    selectedPlaylistId: null,
    selectedSongIndex: 0,
    isSyncing: false,
    isBackingUp: false,
    vaultAccessGranted: false,
    activeRoute: 'playlist',
    vaultPinInput: '',
    vaultRevealState: 'locked'
  },
  securityConfig: loadSecurityConfig()
};

const store = {
  listeners: [],
  subscribe(handler) {
    this.listeners.push(handler);
  },
  update(updates) {
    Object.assign(state, updates);
    this.listeners.forEach((listener) => listener(state));
  }
};

function loadSecurityConfig() {
  try {
    const raw = localStorage.getItem(storageKeys.securityConfig);
    if (raw) {
      return { ...defaultSecurityConfig, ...JSON.parse(raw) };
    }
  } catch (error) {
    console.warn('Unable to load security config', error);
  }
  return { ...defaultSecurityConfig };
}

function persistSecurityConfig() {
  localStorage.setItem(storageKeys.securityConfig, JSON.stringify(state.securityConfig));
}

function applyTheme(theme = state.theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.mode === 'light' ? 'light' : theme.accent || 'cyberpunk');
  document.body.setAttribute('data-glass', String(theme.glass));
}

function getCurrentTrack() {
  const playlist = state.playlists.find((item) => item.id === state.ui.selectedPlaylistId) || state.playlists[0];
  if (!playlist) return null;
  return playlist.songs[state.ui.selectedSongIndex] || playlist.songs[0] || null;
}

function getCurrentAudioSource() {
  // Use a lightweight sample audio source. For offline usage, fallback to a silent encoded WAV via data URI.
  return 'data:audio/wav;base64,UklGRpQAAABXQVZFZm10IBIAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=';
}

function loadAudioTrack() {
  const track = getCurrentTrack();
  if (!track) return;
  const audio = appElements.audioElement;
  audio.src = getCurrentAudioSource();
  audio.load();
  audio.volume = state.player.volume / 100;
  state.player.title = track.title;
  state.player.artist = track.artist;
  state.player.playlistId = state.ui.selectedPlaylistId;
  state.player.songIndex = state.ui.selectedSongIndex;
  state.player.progress = 0;
  state.player.playing = false;
  updatePlayerUi();
}

function recalculateInsights() {
  const allTracks = state.playlists.flatMap((playlist) => playlist.songs.map((song) => ({
    title: song.title,
    loops: song.playCount,
    metricId: `${playlist.id}-${song.trackId}`
  })));
  const sorted = allTracks.sort((a, b) => b.loops - a.loops);
  state.insights.topTracks = sorted.slice(0, 6);
  state.insights.totalLoopsThisWeek = sorted.reduce((sum, track) => sum + track.loops, 0);
}

function renderNav() {
  appElements.navRoot.innerHTML = navItems
    .map((item) => `
      <button data-view="${item.id}" class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${state.ui.activeRootView === item.id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'}">
        <span>${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `)
    .join('');

  document.querySelectorAll('[data-mobile-view]').forEach((button) => {
    if (button.getAttribute('data-mobile-view') === state.ui.activeRootView) {
      button.classList.add('bg-[var(--accent-soft)]', 'text-[var(--accent)]');
      button.classList.remove('text-[var(--muted)]');
    } else {
      button.classList.remove('bg-[var(--accent-soft)]', 'text-[var(--accent)]');
      button.classList.add('text-[var(--muted)]');
    }
  });
}

function renderPlaylistView() {
  const playlists = state.playlists;
  if (!playlists.length) return;
  const selectedPlaylist = playlists.find((playlist) => playlist.id === state.ui.selectedPlaylistId) || playlists[0];
  state.ui.selectedPlaylistId = selectedPlaylist.id;

  const playlistRows = selectedPlaylist.songs
    .map((song, index) => `
          <tr class="cursor-pointer border-t border-[var(--border)] bg-slate-800/50 hover:bg-slate-700/70" data-open-song="${selectedPlaylist.id}" data-song-index="${index}">
            <td class="px-4 py-3">${index + 1}</td>
            <td class="px-4 py-3">
              <div class="font-medium">${song.title}</div>
              <div class="text-xs text-[var(--muted)]">${song.artist}</div>
            </td>
            <td class="px-4 py-3">${song.platform}</td>
            <td class="px-4 py-3">${song.playCount}</td>
          </tr>
    `)
    .join('');

  appElements.mainView.innerHTML = `
    <section class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Playlist Hub</p>
          <h3 class="text-2xl font-semibold">Connected platforms</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Spotify Connected</span>
          <span class="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">YouTube Music Connected</span>
          <span class="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm text-violet-300">Local Storage Connected</span>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-3">
        ${playlists
          .map((playlist) => `
            <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-[var(--muted)]">${playlist.platform}</p>
                  <h4 class="text-lg font-semibold">${playlist.title}</h4>
                </div>
                <div class="rounded-2xl bg-white/10 px-3 py-2 text-xl">${playlist.icon}</div>
              </div>
              <p class="mt-4 text-sm text-[var(--muted)]">${playlist.totalTracks} tracks • synced ${playlist.lastSynced}</p>
              <div class="mt-4 flex gap-2">
                <button data-backup="${playlist.id}" class="rounded-full ${state.ui.isBackingUp ? 'bg-slate-700/80 text-[var(--text)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'} px-3 py-2 text-sm font-medium transition hover:opacity-90">
                  ${state.ui.isBackingUp ? 'Backing up...' : 'Backup'}
                </button>
                <button data-open-playlist-modal="${playlist.id}" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition hover:border-[var(--accent)]">View</button>
              </div>
            </div>
          `)
          .join('')}
      </div>

      <div class="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
        <div class="mb-4 flex items-center justify-between">
          <h4 class="text-lg font-semibold">${selectedPlaylist.title}</h4>
          <button data-toggle-backup class="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]">${selectedPlaylist.backupMode === 'cloud' ? 'Cloud Backup' : 'Local JSON Backup'}</button>
        </div>
        <div class="overflow-hidden rounded-2xl border border-[var(--border)]">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-slate-700/80 text-slate-300">
              <tr>
                <th class="px-4 py-3">#</th>
                <th class="px-4 py-3">Title</th>
                <th class="px-4 py-3">Artist</th>
                <th class="px-4 py-3">Platform</th>
                <th class="px-4 py-3">Play Count</th>
              </tr>
            </thead>
            <tbody>${playlistRows}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderVaultView() {
  const vaultItems = state.vault
    .map((asset) => `
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h4 class="text-lg font-semibold">${asset.name}</h4>
            <p class="text-sm text-[var(--muted)]">BPM ${asset.bpm} • Key ${asset.key}</p>
          </div>
          <button data-lock="${asset.id}" class="rounded-full ${asset.locked ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'} px-3 py-2 text-sm font-medium">
            ${asset.locked ? 'Locked' : 'Active Preview'}
          </button>
        </div>
        <div class="mt-4 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>${asset.locked ? 'Preview requires local vault access' : 'Preview ready to play'}</span>
          ${asset.locked ? `<button data-unlock-trigger="${asset.id}" class="text-[var(--accent)]">Unlock</button>` : ''}
        </div>
        ${!asset.locked ? `
          <div class="mt-4 rounded-2xl border border-[var(--border)] bg-slate-800/60 p-4">
            <div class="mb-3 h-20 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20"></div>
            <p class="text-sm text-[var(--muted)]">Preview waveform • ${asset.shareMode === 'shareable' ? 'Shareable secure link' : 'Encrypted local-only'}</p>
          </div>
        ` : ''}
      </div>
    `)
    .join('');

  appElements.mainView.innerHTML = `
    <section class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Producer Vault</p>
          <h3 class="text-2xl font-semibold">Secure audio assets</h3>
        </div>
        <button id="import-asset" class="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition hover:opacity-90">Import Audio Asset</button>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">${vaultItems}</div>
    </section>
  `;
}

function renderInsightsView() {
  const topTracks = state.insights.topTracks;
  appElements.mainView.innerHTML = `
    <section class="space-y-4">
      <div class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
        <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Insights</p>
        <h3 class="mt-2 text-2xl font-semibold">Most repeated tracks</h3>
        <div class="mt-5 space-y-3">
          ${topTracks
            .map((track) => `
              <button data-metric="${track.metricId}" class="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-left text-sm transition hover:bg-white/5">
                <div>
                  <p class="font-medium">${track.title}</p>
                  <p class="text-sm text-[var(--muted)]">Loop streak building</p>
                </div>
                <div class="rounded-2xl bg-[var(--accent-soft)] px-4 py-2 text-center text-[var(--accent)]">
                  <div class="text-2xl font-semibold">${track.loops}</div>
                  <div class="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">loops</div>
                </div>
              </button>
            `)
            .join('')}
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div class="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent)]/10 to-violet-500/10 p-5">
          <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Total loops this week</p>
          <div class="mt-3 text-5xl font-semibold text-[var(--accent)]">${state.insights.totalLoopsThisWeek}</div>
          <p class="mt-3 text-sm text-[var(--muted)]">Your most replayed songs are dominating your current release prep.</p>
        </div>
        <div class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5">
          <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Wrapped</p>
          <p class="mt-3 text-lg text-[var(--text)]">${state.insights.wrappedSummary}</p>
        </div>
      </div>
    </section>
  `;
}

function renderSettingsView() {
  const { settingsView } = state.ui;

  if (settingsView === 'account') {
    appElements.mainView.innerHTML = `
      <section class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
        <button data-settings-back class="mb-4 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]">← Back</button>
        <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Account Settings</p>
        <h3 class="mt-2 text-2xl font-semibold">Profile Setup & Auth</h3>
        <div class="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <h4 class="font-semibold">Profile Setup</h4>
            <form id="profile-form" class="mt-4 space-y-3">
              <input id="display-name" class="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" value="${state.profile.displayName}" />
              <input id="email-input" class="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" value="${state.profile.email}" />
              <input id="phone-input" class="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" value="${state.profile.phone}" />
              <input id="avatar-upload" type="file" class="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2" />
              <button type="submit" class="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)]">Save profile</button>
            </form>
          </div>
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <h4 class="font-semibold">Multi-Auth Integration</h4>
            <div class="mt-4 space-y-2">
              ${Object.entries(state.profile.authProviders)
                .map(
                  ([provider, enabled]) => `
                  <button data-auth-provider="${provider}" class="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] px-3 py-3 text-sm ${enabled ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text)]'}">
                    <span>${provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
                    <span>${enabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                `
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  if (settingsView === 'theme') {
    appElements.mainView.innerHTML = `
      <section class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
        <button data-settings-back class="mb-4 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]">← Back</button>
        <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Theme Customization Engine</p>
        <h3 class="mt-2 text-2xl font-semibold">Core theme triggers</h3>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <h4 class="font-semibold">Mode</h4>
            <div class="mt-3 flex gap-2">
              <button data-theme-mode="dark" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm">Dark Mode</button>
              <button data-theme-mode="light" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm">Light Mode</button>
            </div>
            <div class="mt-4">
              <label class="flex items-center gap-2 text-sm">
                <input id="glass-toggle" type="checkbox" ${state.theme.glass ? 'checked' : ''} />
                <span>Glassmorphism</span>
              </label>
            </div>
          </div>
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <h4 class="font-semibold">Accent Color</h4>
            <div class="mt-3 flex flex-wrap gap-2">
              <button data-theme-accent="cyberpunk" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm">Cyberpunk Purple</button>
              <button data-theme-accent="spotify" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm">Spotify Green</button>
              <button data-theme-accent="youtube" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm">YouTube Red</button>
              <button data-theme-accent="steel" class="rounded-full border border-[var(--border)] px-3 py-2 text-sm">Steel Blue</button>
            </div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  if (settingsView === 'vault-security') {
    appElements.mainView.innerHTML = `
      <section class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
        <button data-settings-back class="mb-4 rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]">← Back</button>
        <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Vault Security Configurations</p>
        <h3 class="mt-2 text-2xl font-semibold">Producer Vault Gate</h3>
        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <h4 class="font-semibold">Security Mode</h4>
            <div class="mt-4 space-y-3 text-sm">
              <label class="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                <input type="radio" name="vault-security-mode" value="passphrase" ${state.securityConfig.mode === 'passphrase' ? 'checked' : ''} />
                <span>Master Passphrase Mode</span>
              </label>
              <label class="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                <input type="radio" name="vault-security-mode" value="biometric" ${state.securityConfig.mode === 'biometric' ? 'checked' : ''} />
                <span>Biometric Authentication Mode</span>
              </label>
            </div>
          </div>
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <h4 class="font-semibold">Current Mode</h4>
            <p class="mt-3 text-sm text-[var(--muted)]">${state.securityConfig.mode === 'passphrase' ? 'Passphrase gate is active and used when opening the Producer Vault.' : 'Biometrics will simulate a native TouchID/FaceID flow for secure access.'}</p>
            <div class="mt-4 ${state.securityConfig.mode !== 'passphrase' ? 'opacity-60' : ''}">
              <label class="text-sm text-[var(--muted)]">Vault passphrase</label>
              <input id="vault-config-passphrase" type="password" value="${state.securityConfig.passphrase}" class="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)]" ${state.securityConfig.mode === 'passphrase' ? '' : 'disabled'} />
            </div>
            <button id="vault-config-save" class="mt-5 w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-medium text-[var(--accent-contrast)] transition hover:opacity-90">Save Vault Settings</button>
          </div>
        </div>
        <div class="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-sm text-[var(--muted)]">
          <p><span class="font-semibold">Current biometric simulation:</span> ${state.securityConfig.biometricEnabled ? 'Enabled' : 'Disabled'}</p>
          <p class="mt-2">When biometric mode is enabled, the Producer Vault intercept will present a simulated scan prompt.</p>
        </div>
      </section>
    `;
    return;
  }

  appElements.mainView.innerHTML = `
    <section class="rounded-3xl border border-[var(--border)] bg-[var(--panel)]/70 p-5 shadow-lg shadow-black/20">
      <p class="text-sm uppercase tracking-[0.3em] text-[var(--muted)]">Settings</p>
      <h3 class="mt-2 text-2xl font-semibold">Personalize your workspace</h3>
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <button data-settings-root="account" class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-left">
          <h4 class="font-semibold">Account Settings</h4>
          <p class="mt-2 text-sm text-[var(--muted)]">Manage profile data, avatar, and auth providers.</p>
        </button>
        <button data-settings-root="theme" class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-left">
          <h4 class="font-semibold">Theme Customization Engine</h4>
          <p class="mt-2 text-sm text-[var(--muted)]">Switch modes and swap accents instantly.</p>
        </button>
        <button data-settings-root="vault-security" class="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-left">
          <h4 class="font-semibold">Vault Security Configurations</h4>
          <p class="mt-2 text-sm text-[var(--muted)]">Choose master passphrase or biometric access for the Producer Vault.</p>
        </button>
      </div>
    </section>
  `;
}

function renderView() {
  renderNav();
  applyTheme();
  const destination = state.ui.activeRootView;
  if (destination === 'playlist') renderPlaylistView();
  else if (destination === 'vault') renderVaultView();
  else if (destination === 'insights') renderInsightsView();
  else renderSettingsView();
  updatePlayerUi();
  updateHeaderButtons();
}

function updatePlayerUi() {
  appElements.playerPlayPause.textContent = state.player.playing ? 'Pause' : 'Play';
  const progressBar = document.getElementById('player-progress');
  if (progressBar) progressBar.style.width = `${state.player.progress}%`;
  document.getElementById('player-title').textContent = state.player.title;
  document.getElementById('player-artist').textContent = state.player.artist;
  appElements.playerVolumeLabel.textContent = `Vol ${state.player.volume}%`;
  document.getElementById('repeat-count').textContent = state.player.repeatCount;
  document.getElementById('quick-loop').textContent = state.insights.topTracks[0]?.title || '—';
}

function updateHeaderButtons() {
  appElements.syncButton.textContent = state.ui.isSyncing ? 'Syncing...' : 'Sync Playlists';
  appElements.syncButton.disabled = state.ui.isSyncing;
  appElements.backupButton.textContent = state.ui.isBackingUp ? 'Backing up...' : 'Backup';
  appElements.backupButton.disabled = state.ui.isBackingUp;
}

function setRoute(view, options = {}) {
  if (view === 'vault' && !state.ui.vaultAccessGranted) {
    showVaultSecurityOverlay();
    state.ui.pendingVaultRoute = view;
    return;
  }

  state.ui.activeRootView = view;
  if (view === 'settings') {
    state.ui.settingsView = options.settingsView || 'root';
  }
  state.ui.activeRoute = view;
  window.history.pushState({ route: view }, '', `#${view}`);
  renderView();
  localStorage.setItem(storageKeys.appRoute, view);
}

function restoreRoute() {
  const saved = localStorage.getItem(storageKeys.appRoute);
  const hash = window.location.hash.replace('#', '');
  const route = hash || saved || 'playlist';
  if (route === 'vault' && !state.ui.vaultAccessGranted) {
    showVaultSecurityOverlay();
    return;
  }
  state.ui.activeRootView = route;
  renderView();
}

async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  const serverState = await response.json();
  Object.assign(state, {
    profile: serverState.profile,
    theme: serverState.theme,
    playlists: serverState.playlists,
    vault: serverState.vault,
    insights: serverState.insights,
    player: serverState.player,
    ui: { ...state.ui, ...serverState.ui }
  });

  applyTheme();
  if (!state.ui.selectedPlaylistId && state.playlists.length) {
    state.ui.selectedPlaylistId = state.playlists[0].id;
  }
  loadAudioTrack();
  restoreRoute();
}

async function performSyncPlaylists() {
  if (state.ui.isSyncing) return;
  state.ui.isSyncing = true;
  updateHeaderButtons();
  renderView();
  const response = await fetch('/api/sync-playlists', { method: 'POST' });
  const data = await response.json();
  if (data.success) {
    state.playlists = data.playlists;
  }
  state.ui.isSyncing = false;
  updateHeaderButtons();
  renderView();
}

async function performBackupPlaylists() {
  if (state.ui.isBackingUp) return;
  state.ui.isBackingUp = true;
  updateHeaderButtons();
  renderView();
  const response = await fetch('/api/backup-playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: state.playlists[0]?.backupMode === 'cloud' ? 'local' : 'cloud' }) });
  const data = await response.json();
  if (data.success) {
    state.playlists = state.playlists.map((playlist) => ({ ...playlist, backupMode: playlist.backupMode === 'cloud' ? 'local' : 'cloud' }));
  }
  state.ui.isBackingUp = false;
  updateHeaderButtons();
  renderView();
}

async function openPlaylistModal(playlistId) {
  const playlist = state.playlists.find((item) => item.id === playlistId);
  if (!playlist) return;
  state.ui.selectedPlaylistId = playlistId;
  state.ui.selectedSongIndex = 0;
  loadAudioTrack();
  document.getElementById('playlist-modal-title').textContent = playlist.title;
  document.getElementById('playlist-modal-platform').textContent = `${playlist.platform} • curated mix`;
  document.getElementById('playlist-modal-icon').textContent = playlist.icon;
  document.getElementById('playlist-modal-runtime').textContent = `${playlist.totalTracks} tracks • ${playlist.lastSynced}`;
  document.getElementById('playlist-modal-summary').textContent = `${playlist.totalTracks} tracks are ready for playback, backup, or download.`;
  document.getElementById('playlist-modal-tracks').innerHTML = playlist.songs
    .map(
      (song, index) => `
      <tr class="border-t border-white/10 bg-slate-950/20">
        <td class="px-4 py-3">${index + 1}</td>
        <td class="px-4 py-3">
          <div class="font-medium">${song.title}</div>
          <div class="text-xs text-slate-400">${song.artist}</div>
        </td>
        <td class="px-4 py-3">${playlist.platform}</td>
        <td class="px-4 py-3"><span class="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">${song.playCount} loops</span></td>
      </tr>
    `
    )
    .join('');
  appElements.playlistModalOverlay.classList.remove('hidden');
  appElements.playlistModalOverlay.classList.add('flex', 'playlist-modal-overlay');
}

function closePlaylistModal() {
  appElements.playlistModalOverlay.classList.add('hidden');
  appElements.playlistModalOverlay.classList.remove('flex', 'playlist-modal-overlay');
}

function showModal() {
  appElements.modalOverlay.classList.remove('hidden');
  appElements.modalOverlay.classList.add('flex');
}

function hideModal() {
  appElements.modalOverlay.classList.add('hidden');
  appElements.modalOverlay.classList.remove('flex');
  appElements.passphraseInput.value = '';
}

function showVaultSecurityOverlay() {
  state.ui.vaultAccessGranted = false;
  state.ui.vaultRevealState = 'locked';
  appElements.vaultSecurityError.classList.add('hidden');
  document.getElementById('vault-mobile-reveal').classList.add('hidden');
  appElements.vaultSecurityOverlay.classList.remove('hidden');
  appElements.vaultSecurityOverlay.classList.add('flex');

  const storedPassword = localStorage.getItem(VAULT_STORAGE_KEY);
  const isFirstTime = !storedPassword;
  const biometricMode = state.securityConfig.mode === 'biometric';

  if (isFirstTime) {
    appElements.vaultBiometricPanel.classList.add('hidden');
    appElements.vaultPasswordForm.classList.remove('hidden');
    appElements.vaultSetupPanel.classList.remove('hidden');
    appElements.vaultEnterPanel.classList.add('hidden');
    appElements.vaultSecurityDescription.textContent = 'Create your master secure passcode for the Producer Vault.';
    appElements.vaultSetupPassInput.value = '';
    appElements.vaultConfirmPassInput.value = '';
    appElements.vaultPasswordSubmit.textContent = 'Save & Secure Vault';
  } else if (biometricMode) {
    appElements.vaultBiometricPanel.classList.remove('hidden');
    appElements.vaultPasswordForm.classList.add('hidden');
    appElements.vaultSecurityDescription.textContent = 'Use biometric verification to unlock the Producer Vault.';
  } else {
    appElements.vaultBiometricPanel.classList.add('hidden');
    appElements.vaultPasswordForm.classList.remove('hidden');
    appElements.vaultSetupPanel.classList.add('hidden');
    appElements.vaultEnterPanel.classList.remove('hidden');
    appElements.vaultSecurityDescription.textContent = 'Enter your vault passcode to unlock the Producer Vault.';
    appElements.vaultEnterPassInput.value = '';
    appElements.vaultPasswordSubmit.textContent = 'Unlock Vault';
  }
}

function hideVaultSecurityOverlay() {
  appElements.vaultSecurityOverlay.classList.add('hidden');
  appElements.vaultSecurityOverlay.classList.remove('flex');
  appElements.vaultSecurityError.classList.add('hidden');
}

function handleVaultPasswordFormSubmit(event) {
  event.preventDefault();
  const storedPassword = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!storedPassword) {
    const masterPassword = appElements.vaultSetupPassInput.value.trim();
    const confirmPassword = appElements.vaultConfirmPassInput.value.trim();
    if (!masterPassword || !confirmPassword) {
      showVaultSecurityError('Both password fields are required.');
      return;
    }
    if (masterPassword !== confirmPassword) {
      showVaultSecurityError('Passwords must match.');
      triggerVaultShake();
      return;
    }
    localStorage.setItem(VAULT_STORAGE_KEY, masterPassword);
    state.ui.vaultAccessGranted = true;
    state.securityConfig.lastVerifiedAt = Date.now();
    persistSecurityConfig();
    appElements.vaultSetupPassInput.value = '';
    appElements.vaultConfirmPassInput.value = '';
    hideVaultSecurityOverlay();
    setRoute('vault');
    return;
  }

  const inputPassword = appElements.vaultEnterPassInput.value.trim();
  if (!inputPassword) {
    showVaultSecurityError('Please enter the vault passcode.');
    return;
  }
  if (inputPassword === storedPassword) {
    state.ui.vaultAccessGranted = true;
    state.securityConfig.lastVerifiedAt = Date.now();
    persistSecurityConfig();
    hideVaultSecurityOverlay();
    setRoute('vault');
    return;
  }
  showVaultSecurityError('Incorrect Password. Try Again.');
  triggerVaultShake();
  appElements.vaultEnterPassInput.value = '';
}

function showVaultSecurityError(message) {
  appElements.vaultSecurityError.textContent = message;
  appElements.vaultSecurityError.classList.remove('hidden');
}

function handleSocialLogin(provider) {
  console.log('Social login selected:', provider);
  state.ui.vaultAccessGranted = true;
  state.ui.activeRootView = 'playlist';
  state.ui.authenticated = true;
  appElements.welcomeScreen.classList.add('hidden');
  appElements.appShell.classList.remove('hidden');
  setRoute('playlist');
}

function triggerVaultShake() {
  const card = document.querySelector('.vault-lock-card');
  if (!card) return;
  card.classList.add('animate-shake');
  setTimeout(() => card.classList.remove('animate-shake'), 500);
}

function fadeOutVaultOverlay() {
  const card = document.querySelector('.vault-lock-card');
  if (!card) return;
  card.classList.add('opacity-0', 'translate-y-4');
  setTimeout(() => card.classList.remove('opacity-0', 'translate-y-4'), 400);
}

function updateVaultPinVisuals() {
  const digits = Array.from(document.querySelectorAll('.vault-pin-digit'));
  const chars = state.ui.vaultPinInput.padEnd(4, '•').split('');
  digits.forEach((digit, index) => {
    digit.textContent = chars[index];
  });
}

function appendVaultPin(key) {
  if (state.ui.vaultPinInput.length >= 4) return;
  if (key === '⌫') {
    state.ui.vaultPinInput = state.ui.vaultPinInput.slice(0, -1);
  } else if (/^[0-9]$/.test(key)) {
    state.ui.vaultPinInput += key;
  }
  updateVaultPinVisuals();
}

function clearVaultPin() {
  state.ui.vaultPinInput = '';
  updateVaultPinVisuals();
}

function unlockVaultWithPin() {
  if (state.ui.vaultPinInput.length !== 4) {
    showVaultSecurityError('Enter the 4-digit vault PIN to continue.');
    return;
  }
  if (state.ui.vaultPinInput === MOBILE_VAULT_PIN) {
    state.ui.vaultAccessGranted = true;
    state.ui.vaultRevealState = 'unlocked';
    state.securityConfig.lastVerifiedAt = Date.now();
    persistSecurityConfig();
    showVaultReveal();
    setTimeout(() => {
      hideVaultSecurityOverlay();
      setRoute('vault');
    }, 850);
    clearVaultPin();
    return;
  }
  showVaultSecurityError('Incorrect PIN. Try again.');
  clearVaultPin();
}

async function verifyBiometricScan() {
  const biometricStatus = document.getElementById('vault-security-state');
  biometricStatus.classList.add('animate-pulse');
  await new Promise((resolve) => setTimeout(resolve, 950));
  biometricStatus.classList.remove('animate-pulse');

  const response = await fetch('/api/verify-vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ biometric: true })
  });
  const result = await response.json();
  if (result.success) {
    state.ui.vaultAccessGranted = true;
    state.securityConfig.biometricEnabled = true;
    state.securityConfig.lastVerifiedAt = Date.now();
    state.ui.vaultRevealState = 'unlocked';
    persistSecurityConfig();
    showVaultReveal();
    setTimeout(() => {
      hideVaultSecurityOverlay();
      setRoute('vault');
    }, 850);
  } else {
    showVaultSecurityError(result.message || 'Biometric scan failed');
  }
}

function showVaultReveal() {
  document.getElementById('vault-mobile-reveal').classList.remove('hidden');
}

async function unlockAsset() {
  const assetId = state.ui.selectedVaultId;
  if (!assetId) return;
  const response = await fetch('/api/unlock-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, passphrase: appElements.passphraseInput.value })
  });
  const result = await response.json();
  if (result.success) {
    const asset = state.vault.find((item) => item.id === assetId);
    if (asset) {
      asset.locked = false;
      asset.previewActive = true;
    }
    hideModal();
    renderView();
  } else {
    alert(result.message || 'Unlock failed');
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const displayName = document.getElementById('display-name')?.value.trim();
  const email = document.getElementById('email-input')?.value.trim();
  const phone = document.getElementById('phone-input')?.value.trim();
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, email, phone })
  });
  const data = await response.json();
  if (data.success) {
    state.profile = data.profile;
    renderView();
  }
}

async function uploadAvatar() {
  const input = document.getElementById('avatar-upload');
  if (!input?.files?.length) return;
  const formData = new FormData();
  formData.append('avatar', input.files[0]);
  const response = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
  const data = await response.json();
  if (data.success) {
    state.profile = data.profile;
    renderView();
  }
}

async function changeTheme(mode) {
  const response = await fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  const data = await response.json();
  if (data.success) {
    state.theme = data.theme;
    applyTheme();
    renderView();
  }
}

async function changeAccent(accent) {
  const response = await fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accent })
  });
  const data = await response.json();
  if (data.success) {
    state.theme = data.theme;
    applyTheme();
    renderView();
  }
}

async function toggleGlass() {
  const response = await fetch('/api/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ glass: !state.theme.glass })
  });
  const data = await response.json();
  if (data.success) {
    state.theme = data.theme;
    applyTheme();
    renderView();
  }
}

async function toggleAuthProvider(provider) {
  const response = await fetch('/api/toggle-auth-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider })
  });
  const data = await response.json();
  if (data.success) {
    state.profile = data.profile;
    renderView();
  }
}

async function incrementPlayCount(playlistId, songIndex) {
  const response = await fetch('/api/increment-play-count', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistId, songIndex })
  });
  const data = await response.json();
  if (data.success) {
    const playlist = state.playlists.find((item) => item.id === playlistId);
    if (playlist && playlist.songs[songIndex] && data.playlist && data.playlist.songs) {
      playlist.songs[songIndex].playCount = data.playlist.songs[songIndex].playCount;
      recalculateInsights();
      renderView();
    }
  }
}

async function selectPlaylist(playlistId) {
  const response = await fetch('/api/select-playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistId, view: 'detail' })
  });
  const data = await response.json();
  if (data.success) {
    state.ui = { ...state.ui, ...data.ui };
    state.ui.selectedPlaylistId = playlistId;
    state.ui.selectedSongIndex = data.ui.selectedSongIndex || 0;
    loadAudioTrack();
    renderView();
  }
}

async function openSongDrawer(playlistId, songIndex) {
  const response = await fetch('/api/select-song', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistId, songIndex })
  });
  const data = await response.json();
  if (data.success) {
    state.ui = { ...state.ui, ...data.ui };
    state.ui.selectedPlaylistId = playlistId;
    state.ui.selectedSongIndex = songIndex;
    loadAudioTrack();
    renderView();
  }
}

async function openInsight(metricId) {
  const response = await fetch('/api/select-insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metricId })
  });
  const data = await response.json();
  if (data.success) {
    state.ui = { ...state.ui, ...data.ui };
    renderView();
  }
}

async function updateVaultSecurityConfig() {
  const mode = document.querySelector('input[name="vault-security-mode"]:checked')?.value;
  const passphraseInput = document.getElementById('vault-config-passphrase');
  const passphrase = passphraseInput?.value.trim();
  const payload = { mode, biometricEnabled: mode === 'biometric' };
  if (mode === 'passphrase') {
    payload.passphrase = passphrase || state.securityConfig.passphrase;
  }
  const response = await fetch('/api/vault-security', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (data.success) {
    state.securityConfig = { ...state.securityConfig, ...data.vaultSecurity };
    persistSecurityConfig();
    renderView();
  }
}

function handleAuthModeToggle() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  if (authMode === 'signup') {
    appElements.authStateLabel.textContent = 'Manual sign up';
    appElements.authSubmitButton.textContent = 'Create Account';
    appElements.confirmPasswordInput.classList.remove('hidden');
    appElements.authToggleCopy.textContent = 'Already have an account?';
    appElements.authModeToggleButton.textContent = 'Log In';
  } else {
    appElements.authStateLabel.textContent = 'Manual login';
    appElements.authSubmitButton.textContent = 'Login with email';
    appElements.confirmPasswordInput.classList.add('hidden');
    appElements.authToggleCopy.textContent = "Don't have an account?";
    appElements.authModeToggleButton.textContent = 'Sign Up';
  }
  appElements.loginError.classList.add('hidden');
}

async function handleManualLogin(event) {
  event.preventDefault();
  const email = document.getElementById('manual-login-email').value.trim();
  const password = document.getElementById('manual-login-password').value.trim();
  const confirmPassword = appElements.confirmPasswordInput.value.trim();
  if (!email || !password) {
    appElements.loginError.textContent = 'Please enter both email and password.';
    appElements.loginError.classList.remove('hidden');
    return;
  }
  if (authMode === 'signup') {
    if (!confirmPassword) {
      appElements.loginError.textContent = 'Please confirm your password.';
      appElements.loginError.classList.remove('hidden');
      return;
    }
    if (password !== confirmPassword) {
      appElements.loginError.textContent = 'Passwords do not match.';
      appElements.loginError.classList.remove('hidden');
      return;
    }
  }
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.success) {
    state.profile = data.profile;
    appElements.welcomeScreen.classList.add('hidden');
    appElements.appShell.classList.remove('hidden');
    await loadDashboard();
  } else {
    appElements.loginError.textContent = data.message || 'Login failed.';
    appElements.loginError.classList.remove('hidden');
  }
}

function setAuthMode(mode) {
  authMode = mode;
  if (mode === 'signup') {
    appElements.authStateLabel.textContent = 'Manual sign up';
    appElements.authSubmitButton.textContent = 'Create Account';
    appElements.confirmPasswordInput.classList.remove('hidden');
    appElements.authToggleCopy.textContent = 'Already have an account?';
    appElements.authModeToggleButton.textContent = 'Log In';
  } else {
    appElements.authStateLabel.textContent = 'Manual login';
    appElements.authSubmitButton.textContent = 'Login with email';
    appElements.confirmPasswordInput.classList.add('hidden');
    appElements.authToggleCopy.textContent = "Don't have an account?";
    appElements.authModeToggleButton.textContent = 'Sign Up';
  }
  appElements.loginError.classList.add('hidden');
}

function setupAudioListeners() {
  const audio = appElements.audioElement;
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration || Number.isNaN(audio.duration)) return;
    state.player.progress = Math.round((audio.currentTime / audio.duration) * 100);
    updatePlayerUi();
  });
  audio.addEventListener('ended', async () => {
    state.player.repeatCount += 1;
    updatePlayerUi();
    await incrementPlayCount(state.player.playlistId, state.player.songIndex);
    await handleNextTrack();
  });
}

async function handlePlayPause() {
  const audio = appElements.audioElement;
  if (state.player.playing) {
    audio.pause();
    state.player.playing = false;
  } else {
    audio.play();
    state.player.playing = true;
  }
  updatePlayerUi();
}

async function handleNextTrack() {
  const playlist = state.playlists.find((item) => item.id === state.ui.selectedPlaylistId) || state.playlists[0];
  if (!playlist) return;
  const nextIndex = (state.ui.selectedSongIndex + 1) % playlist.songs.length;
  state.ui.selectedSongIndex = nextIndex;
  loadAudioTrack();
  if (state.player.playing) {
    await appElements.audioElement.play();
  }
  renderView();
}

async function handlePrevTrack() {
  const playlist = state.playlists.find((item) => item.id === state.ui.selectedPlaylistId) || state.playlists[0];
  if (!playlist) return;
  const prevIndex = (state.ui.selectedSongIndex - 1 + playlist.songs.length) % playlist.songs.length;
  state.ui.selectedSongIndex = prevIndex;
  loadAudioTrack();
  if (state.player.playing) {
    await appElements.audioElement.play();
  }
  renderView();
}

function setVolume(value) {
  state.player.volume = Number(value);
  appElements.audioElement.volume = state.player.volume / 100;
  updatePlayerUi();
}

function initializeListeners() {
  appElements.enterButton.addEventListener('click', async () => {
    appElements.welcomeScreen.classList.add('hidden');
    appElements.appShell.classList.remove('hidden');
    await loadDashboard();
  });

  appElements.demoLoginButton.addEventListener('click', async () => {
    appElements.welcomeScreen.classList.add('hidden');
    appElements.appShell.classList.remove('hidden');
    await loadDashboard();
  });

  appElements.navRoot.addEventListener('click', (event) => {
    const target = event.target.closest('[data-view]');
    if (!target) return;
    const view = target.getAttribute('data-view');
    setRoute(view);
  });

  appElements.mobileNavRoot.addEventListener('click', (event) => {
    const target = event.target.closest('[data-mobile-view]');
    if (!target) return;
    const view = target.getAttribute('data-mobile-view');
    setRoute(view);
  });

  appElements.mainView.addEventListener('click', async (event) => {
    const backupButtonEl = event.target.closest('[data-backup]');
    if (backupButtonEl) {
      await performBackupPlaylists();
      return;
    }
    const playlistModalButton = event.target.closest('[data-open-playlist-modal]');
    if (playlistModalButton) {
      await openPlaylistModal(playlistModalButton.getAttribute('data-open-playlist-modal'));
      return;
    }
    const playlistButton = event.target.closest('[data-open-playlist]');
    if (playlistButton) {
      await selectPlaylist(playlistButton.getAttribute('data-open-playlist'));
      return;
    }
    const songRow = event.target.closest('[data-open-song]');
    if (songRow) {
      await openSongDrawer(songRow.getAttribute('data-open-song'), Number(songRow.getAttribute('data-song-index')));
      return;
    }
    const metricButton = event.target.closest('[data-metric]');
    if (metricButton) {
      await openInsight(metricButton.getAttribute('data-metric'));
      return;
    }
    const settingsRootButton = event.target.closest('[data-settings-root]');
    if (settingsRootButton) {
      state.ui.settingsView = settingsRootButton.getAttribute('data-settings-root');
      setRoute('settings', { settingsView: state.ui.settingsView });
      return;
    }
    const settingsBackButton = event.target.closest('[data-settings-back]');
    if (settingsBackButton) {
      state.ui.settingsView = 'root';
      setRoute('settings', { settingsView: 'root' });
      return;
    }
    const themeModeButton = event.target.closest('[data-theme-mode]');
    if (themeModeButton) {
      await changeTheme(themeModeButton.getAttribute('data-theme-mode'));
      return;
    }
    const themeAccentButton = event.target.closest('[data-theme-accent]');
    if (themeAccentButton) {
      await changeAccent(themeAccentButton.getAttribute('data-theme-accent'));
      return;
    }
    const authProviderButton = event.target.closest('[data-auth-provider]');
    if (authProviderButton) {
      await toggleAuthProvider(authProviderButton.getAttribute('data-auth-provider'));
      return;
    }
    const unlockTrigger = event.target.closest('[data-unlock-trigger]');
    if (unlockTrigger) {
      state.ui.selectedVaultId = unlockTrigger.getAttribute('data-unlock-trigger');
      showModal();
      return;
    }
    const lockButton = event.target.closest('[data-lock]');
    if (lockButton) {
      await toggleLock(lockButton.getAttribute('data-lock'));
      return;
    }
  });

  appElements.syncButton.addEventListener('click', performSyncPlaylists);
  appElements.backupButton.addEventListener('click', performBackupPlaylists);
  appElements.closeModalButton.addEventListener('click', hideModal);
  appElements.unlockAssetButton.addEventListener('click', unlockAsset);
  appElements.playlistModalCloseButton.addEventListener('click', closePlaylistModal);
  appElements.modalOverlay.addEventListener('click', (event) => {
    if (event.target === appElements.modalOverlay) hideModal();
  });
  appElements.playlistModalOverlay.addEventListener('click', (event) => {
    if (event.target === appElements.playlistModalOverlay) closePlaylistModal();
  });
  appElements.loginForm.addEventListener('submit', handleManualLogin);
  appElements.authModeToggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    handleAuthModeToggle();
  });
  appElements.googleButton.addEventListener('click', () => handleSocialLogin('google'));
  appElements.twitterButton.addEventListener('click', () => handleSocialLogin('x'));
  appElements.appleButton.addEventListener('click', () => handleSocialLogin('apple'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePlaylistModal();
      hideModal();
      hideVaultSecurityOverlay();
    }
  });

  document.addEventListener('submit', async (event) => {
    if (event.target.id === 'profile-form') {
      event.preventDefault();
      await saveProfile(event);
    }
  });

  document.addEventListener('change', async (event) => {
    if (event.target.id === 'avatar-upload') {
      await uploadAvatar();
    }
    if (event.target.id === 'glass-toggle') {
      await toggleGlass();
    }
  });

  appElements.vaultSecurityCancel.addEventListener('click', hideVaultSecurityOverlay);
  appElements.vaultPasswordForm.addEventListener('submit', handleVaultPasswordFormSubmit);
  appElements.vaultBiometricAction.addEventListener('click', verifyBiometricScan);
  appElements.playerPlayPause.addEventListener('click', handlePlayPause);
  document.body.addEventListener('click', (event) => {
    const pinButton = event.target.closest('[data-pin-button]');
    if (pinButton) {
      event.preventDefault();
      const key = pinButton.getAttribute('data-pin-button');
      if (key === '⌫') {
        appendVaultPin('⌫');
      } else {
        appendVaultPin(key);
      }
      return;
    }
    if (event.target.id === 'vault-pin-submit') {
      unlockVaultWithPin();
    }
  });
  appElements.playerNext.addEventListener('click', handleNextTrack);
  appElements.playerPrev.addEventListener('click', handlePrevTrack);
  appElements.playerVolumeSlider.addEventListener('input', (event) => setVolume(event.target.value));
  window.addEventListener('popstate', () => restoreRoute());
  document.body.addEventListener('click', async (event) => {
    const vaultSaveButton = event.target.closest('#vault-config-save');
    if (vaultSaveButton) {
      await updateVaultSecurityConfig();
    }
  });
}

async function toggleLock(id) {
  const response = await fetch('/api/toggle-lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  const data = await response.json();
  if (data.success) {
    const asset = state.vault.find((entry) => entry.id === id);
    if (asset) asset.locked = data.asset.locked;
    renderView();
  }
}

async function init() {
  setupAudioListeners();
  initializeListeners();
  applyTheme();
  const hash = window.location.hash.replace('#', '');
  if (hash) state.ui.activeRootView = hash;
}

let authMode = 'login';
init();
