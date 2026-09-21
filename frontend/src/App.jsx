import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, AudioLines, Bell, CheckCircle2, ChevronDown, Clock3, Download, FileAudio, FileUp, Heart, LogIn, LogOut, Mic2, Pencil, Plus, RotateCcw, Search, ShieldCheck, Trash2, UserRound, UserPlus, Volume2 } from 'lucide-react';
import { ApiError, deleteHistory, downloadAudio, extractDocument, generateSpeech, getApiBaseUrl, getFavorites, getHealth, getHistory, getVoices, loginAccount, registerAccount, renameHistory, setFavorite, updateProfile, uploadAvatar } from './api/client';

const MAX_CHARACTERS = 5000;

const voices = [
  { id: 'en-female', name: 'Samantha', language: 'en-US', gender: 'Female', style: 'Clear and warm' },
  { id: 'en-male', name: 'Fred', language: 'en-US', gender: 'Male', style: 'Calm and steady' },
  { id: 'hi-female', name: 'Lekha', language: 'hi-IN', gender: 'Female', style: 'Natural and expressive' },
  { id: 'es-female', name: 'Eddy', language: 'es-ES', gender: 'Female', style: 'Bright and conversational' },
];

const languages = [
  { id: 'en-US', name: 'English' },
  { id: 'hi-IN', name: 'Hindi' },
  { id: 'es-ES', name: 'Spanish' },
];

function voicesForLanguage(language) {
  return voices.filter((item) => item.language === language);
}

function App() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [voice, setVoice] = useState('en-female');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioReady, setAudioReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasAttemptedGenerate, setHasAttemptedGenerate] = useState(false);
  const [providerVoices, setProviderVoices] = useState(voices);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [view, setView] = useState('create');
  const [token, setToken] = useState(() => localStorage.getItem('tts-token') || '');
  const [accountEmail, setAccountEmail] = useState(() => localStorage.getItem('tts-token') ? localStorage.getItem('tts-email') || '' : '');
  const [accountName, setAccountName] = useState(() => localStorage.getItem('tts-token') ? localStorage.getItem('tts-name') || '' : '');
  const [accountMobile, setAccountMobile] = useState(() => localStorage.getItem('tts-token') ? localStorage.getItem('tts-mobile') || '' : '');
  const [profileImageUrl, setProfileImageUrl] = useState(() => localStorage.getItem('tts-token') ? localStorage.getItem('tts-avatar') || '' : '');
  const [profileImageVersion, setProfileImageVersion] = useState(() => Date.now());
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authMobileNumber, setAuthMobileNumber] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', mobileNumber: '' });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const audioRef = useRef(null);
  const [authError, setAuthError] = useState('');
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [libraryMessage, setLibraryMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [speakingRate, setSpeakingRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [volumeGainDb, setVolumeGainDb] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const availableVoices = useMemo(
    () => providerVoices.filter((item) => item.language === language),
    [language, providerVoices],
  );
  const selectedVoice = providerVoices.find((item) => item.id === voice);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredVoices = providerVoices.filter((item) => `${item.name} ${item.language} ${item.gender} ${item.style}`.toLowerCase().includes(normalizedSearch));
  const filteredHistory = history.filter((item) => `${item.text} ${item.language} ${item.voice}`.toLowerCase().includes(normalizedSearch));
  const visibleHistory = filteredHistory.filter((item) => historyFilter === 'all' || (historyFilter === 'favorites' && item.is_favorite));
  const totalCharacters = history.reduce((total, item) => total + item.text.length, 0);
  const estimatedMinutes = Math.max(0, Math.round(totalCharacters / 900));
  const profileImageSrc = profileImageUrl
    ? `${new URL(profileImageUrl, `${getApiBaseUrl()}/`).href}?v=${profileImageVersion}`
    : '';
  const visibleProfileImageSrc = pendingAvatarPreview || profileImageSrc;
  const hasVisibleProfileImage = Boolean(visibleProfileImageSrc) && !profileImageFailed;

  useEffect(() => () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
  }, [pendingAvatarPreview]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speakingRate;
    audio.volume = Math.min(1, Math.max(0, 10 ** (volumeGainDb / 20)));
    audio.preservesPitch = false;
    audio.mozPreservesPitch = false;
    audio.webkitPreservesPitch = false;
    audio.playbackRate = speakingRate * (2 ** (pitch / 12));
  }, [speakingRate, pitch, volumeGainDb, audioUrl]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const textError = !text.trim()
    ? 'Text is required.'
    : isOverLimit
      ? `Text must be ${MAX_CHARACTERS.toLocaleString()} characters or fewer.`
      : '';

  useEffect(() => {
    let isCurrent = true;

    async function loadBackendData() {
      const [healthResult, voicesResult] = await Promise.allSettled([getHealth(), getVoices()]);
      if (!isCurrent) return;

      if (healthResult.status === 'fulfilled' && healthResult.value?.status === 'ok') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }

      if (voicesResult.status === 'fulfilled') {
        const payload = voicesResult.value;
        const providerList = Array.isArray(payload) ? payload : payload?.voices;
        if (Array.isArray(providerList) && providerList.length) {
          setProviderVoices(providerList);
          const firstCompatibleVoice = providerList.find((item) => item.language === language);
          if (firstCompatibleVoice) setVoice(firstCompatibleVoice.id);
        }
      }
    }

    loadBackendData();
    return () => { isCurrent = false; };
  }, [language]);

  useEffect(() => {
    if (!token) {
      setHistory([]);
      setFavorites([]);
      setAccountEmail('');
      setAccountName('');
      setAccountMobile('');
      setProfileImageUrl('');
      return;
    }
    Promise.all([getHistory(token), getFavorites(token)]).then(([historyResult, favoritesResult]) => {
      setHistory(historyResult);
      setFavorites(favoritesResult);
    }).catch(() => {
      setToken('');
      localStorage.removeItem('tts-token');
      localStorage.removeItem('tts-email');
    });
  }, [token]);

  useEffect(() => {
    function handleOutsideInteraction(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfile(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideInteraction);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideInteraction);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    const nextVoices = voicesForLanguage(nextLanguage);
    setLanguage(nextLanguage);
    setVoice(nextVoices[0]?.id || '');
    setError('');
  }

  async function handleGenerate(event) {
    event.preventDefault();
    setHasAttemptedGenerate(true);
    if (textError) {
      setError(textError === 'Text is required.' ? 'Enter some text before generating speech.' : textError);
      return;
    }
    if (!voice) {
      setError('Choose a voice before generating speech.');
      return;
    }

    setError('');
    setIsGenerating(true);
    try {
      const result = await generateSpeech({ text: text.trim(), language, voice, speakingRate, pitch, volumeGainDb, token });
      if (!result?.audio_url) throw new ApiError('The backend returned no audio URL.');
      setAudioReady(false);
      setAudioUrl(result.audio_url.startsWith('http') ? result.audio_url : `${getApiBaseUrl()}${result.audio_url}`);
    } catch (requestError) {
      setAudioUrl('');
      if (requestError instanceof ApiError && requestError.status === 401) {
        signOut();
        setError('Your session expired. Please sign in again.');
      } else {
        setError(requestError instanceof ApiError ? requestError.message : 'Speech generation failed.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError('');
    try {
      const authenticate = authMode === 'login' ? loginAccount : registerAccount;
      const result = await authenticate({ email: authEmail, password: authPassword, fullName: authFullName, mobileNumber: authMobileNumber });
      localStorage.setItem('tts-token', result.token);
      localStorage.setItem('tts-email', result.email);
      localStorage.setItem('tts-name', result.full_name || '');
      localStorage.setItem('tts-mobile', result.mobile_number || '');
      localStorage.setItem('tts-avatar', result.profile_image_url || '');
      setToken(result.token);
      setAccountEmail(result.email);
      setAccountName(result.full_name || '');
      setAccountMobile(result.mobile_number || '');
      setProfileImageUrl(result.profile_image_url || '');
      setAuthPassword('');
      setView('create');
    } catch (requestError) {
      setAuthError(requestError instanceof ApiError ? requestError.message : 'Account request failed.');
    }
  }

  function signOut() {
    setToken('');
    setAccountEmail('');
    setAccountName('');
    setAccountMobile('');
    setProfileImageUrl('');
    localStorage.removeItem('tts-token');
    localStorage.removeItem('tts-email');
    localStorage.removeItem('tts-name');
    localStorage.removeItem('tts-mobile');
    localStorage.removeItem('tts-avatar');
    setView('create');
  }

  function openProfile() {
    if (accountEmail) {
      setView('profile');
      setShowProfile(false);
    } else {
      setView('auth');
      setShowProfile(false);
    }
  }

  async function toggleFavorite(item) {
    if (!token) {
      setView('auth');
      return;
    }
    try {
      const nextFavorite = !item.is_favorite;
      await setFavorite(token, item.id, nextFavorite);
      setHistory((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_favorite: nextFavorite } : entry));
      setFavorites((current) => nextFavorite
        ? [...current, { ...item, is_favorite: true }]
        : current.filter((entry) => entry.id !== item.id));
      setLibraryMessage(nextFavorite ? 'Added to favorites.' : 'Removed from favorites.');
    } catch (requestError) {
      handleLibraryError(requestError);
    }
  }

  async function refreshLibrary() {
    if (!token) return;
    const [nextHistory, nextFavorites] = await Promise.all([getHistory(token), getFavorites(token)]);
    setHistory(nextHistory);
    setFavorites(nextFavorites);
  }

  async function handleRename(item) {
    const title = window.prompt('Rename audio', item.title);
    if (!title || title.trim() === item.title) return;
    try {
      await renameHistory(token, item.id, title.trim());
      setHistory((current) => current.map((entry) => entry.id === item.id ? { ...entry, title: title.trim() } : entry));
      setLibraryMessage('Audio renamed successfully.');
    } catch (requestError) {
      handleLibraryError(requestError);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteHistory(token, item.id);
      setHistory((current) => current.filter((entry) => entry.id !== item.id));
      setFavorites((current) => current.filter((entry) => entry.id !== item.id));
      setLibraryMessage('Audio deleted.');
    } catch (requestError) {
      handleLibraryError(requestError);
    }
  }

  async function handleLibraryDownload(item) {
    try {
      await downloadAudio(`${getApiBaseUrl()}${item.audio_url}`);
      setLibraryMessage('Download started.');
    } catch (requestError) {
      handleLibraryError(requestError);
    }
  }

  function handleLibraryError(requestError) {
    if (requestError instanceof ApiError && requestError.status === 401) {
      signOut();
      setLibraryMessage('Your session expired. Please sign in again.');
    } else {
      setLibraryMessage(requestError instanceof ApiError ? requestError.message : 'That audio action could not be completed.');
    }
  }

  function reuseHistory(item) {
    setText(item.text);
    setLanguage(item.language);
    setVoice(item.voice);
    setView('create');
  }

  function beginProfileEdit() {
    setProfileForm({ fullName: accountName, email: accountEmail, mobileNumber: accountMobile });
    setPendingAvatarFile(null);
    setPendingAvatarPreview('');
    setProfileError('');
    setProfileMessage('');
    setIsEditingProfile(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setIsProfileSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const result = await updateProfile(token, profileForm);
      if (pendingAvatarFile) {
        const avatarResult = await uploadAvatar(token, pendingAvatarFile);
        setProfileImageUrl(avatarResult.profile_image_url);
        setProfileImageVersion(Date.now());
        setProfileImageFailed(false);
        localStorage.setItem('tts-avatar', avatarResult.profile_image_url);
      }
      setAccountName(result.full_name);
      setAccountEmail(result.email);
      setAccountMobile(result.mobile_number);
      localStorage.setItem('tts-name', result.full_name);
      localStorage.setItem('tts-email', result.email);
      localStorage.setItem('tts-mobile', result.mobile_number);
      setIsEditingProfile(false);
      setPendingAvatarFile(null);
      setPendingAvatarPreview('');
      setProfileMessage('Profile updated successfully.');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        signOut();
        setProfileError('Your session expired. Please sign in again before saving profile changes.');
      } else {
        setProfileError(requestError instanceof ApiError ? requestError.message : 'Profile could not be updated.');
      }
    } finally {
      setIsProfileSaving(false);
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileError('Use a JPG, PNG, or WEBP profile image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Profile images must be 5 MB or smaller.');
      return;
    }
    setProfileError('');
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
  }

  async function handleDownload() {
    if (!audioUrl || isDownloading) return;
    setError('');
    setIsDownloading(true);
    try {
      await downloadAudio(audioUrl);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The generated audio could not be downloaded.');
    } finally {
      setIsDownloading(false);
    }
  }

  function handleClear() {
    setText('');
    setAudioUrl('');
    setAudioReady(false);
    setError('');
    setHasAttemptedGenerate(false);
  }

  async function handleDocumentUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setIsUploading(true);
    try {
      const result = await extractDocument(file);
      setText(result.text);
      setAudioUrl('');
      setAudioReady(false);
      setHasAttemptedGenerate(false);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The document could not be imported.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-mark" aria-hidden="true">TS</div>
          <div>
            <p className="eyebrow">Audio workspace</p>
            <h1>Text to Speech</h1>
          </div>
        </div>
        <nav className="top-nav" aria-label="Primary navigation">
          <button className={view === 'create' ? 'active' : ''} onClick={() => setView('create')}>Workspace</button>
          <button className={view === 'voices' ? 'active' : ''} onClick={() => setView('voices')}>Voices</button>
          <button className={view === 'output' ? 'active' : ''} onClick={() => setView('output')}>Output</button>
        </nav>
        <div className="header-search">
          <Search size={16} aria-hidden="true" />
          <input aria-label="Search voices and audio" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search voices, audio..." />
          <kbd>Cmd K</kbd>
        </div>
        <div className="header-actions">
          {backendStatus === 'offline' && <span className="status-chip offline"><span className="status-dot" />Speech service unavailable</span>}
          <div className="popover-wrap" ref={notificationRef}>
            <button className="icon-button header-icon" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications" title="Notifications"><Bell size={17} /><span className="notification-dot" /></button>
            {showNotifications && <div className="popover notification-popover"><strong>Notifications</strong><p>{audioUrl ? 'Your latest speech is ready to play.' : 'No new notifications.'}</p></div>}
          </div>
          <div className="popover-wrap" ref={profileRef}>
            <button className="profile-button" onClick={() => setShowProfile(!showProfile)} aria-label="Open profile menu"><span className="profile-avatar">{hasVisibleProfileImage ? <img src={visibleProfileImageSrc} alt="" onError={() => setProfileImageFailed(true)} onLoad={() => setProfileImageFailed(false)} /> : <UserRound size={15} />}</span><span className="profile-name">{accountEmail ? accountEmail.split('@')[0] : 'Guest'}</span><ChevronDown size={14} /></button>
            {showProfile && <div className="popover profile-popover">{accountEmail ? <><strong>{accountEmail}</strong><button onClick={openProfile}><UserRound size={14} /> View profile</button><button onClick={signOut}><LogOut size={14} /> Sign out</button></> : <><strong>Guest workspace</strong><p>Sign in to save your audio.</p><button onClick={openProfile}><LogIn size={14} /> Sign in</button></>}</div>}
          </div>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar" aria-label="Workspace sections">
          <div className="sidebar-group">
            <p className="sidebar-label">Workspace</p>
            <button className={`sidebar-link ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}><span className="sidebar-icon"><Plus size={17} /></span>Create speech</button>
            <button className={`sidebar-link ${view === 'voices' ? 'active' : ''}`} onClick={() => setView('voices')}><span className="sidebar-icon"><Mic2 size={17} /></span>Voice library</button>
            <button className={`sidebar-link ${view === 'output' ? 'active' : ''}`} onClick={() => setView('output')}><span className="sidebar-icon"><FileAudio size={17} /></span>Audio output</button>
          </div>
          <div className="sidebar-note">
            <span className="note-status">{hasVisibleProfileImage ? <img className="sidebar-avatar" src={visibleProfileImageSrc} alt="" onError={() => setProfileImageFailed(true)} onLoad={() => setProfileImageFailed(false)} /> : <UserRound size={15} />}{accountEmail ? (accountName || accountEmail) : 'Guest workspace'}</span>
            <p>{accountEmail ? 'Your personal audio library' : 'Save your audio and favorites'}</p>
            {!accountEmail && <button className="sidebar-account-action" onClick={() => setView('auth')}>Sign in</button>}
          </div>
        </aside>

        <main className="workspace">
          {view === 'create' && <section className="intro" id="create" aria-labelledby="workspace-title">
            <div className="intro-heading">
              <div>
                <p className="eyebrow">Create a clear listening version</p>
                <h2 id="workspace-title">Turn your words into sound.</h2>
                <p className="intro-copy">Write or paste text, choose a voice, and generate an audio preview when the backend is connected.</p>
              </div>
              <div className="workspace-summary" aria-label="Workspace summary">
                <strong>5,000</strong>
                <span>character limit</span>
              </div>
            </div>
          </section>}

          {view === 'create' && token && <section className="stats-grid" aria-label="Workspace statistics">
            <article className="stat-card"><span>Total speeches</span><strong>{history.length}</strong><small>Saved to your library</small></article>
            <article className="stat-card"><span>Audio generated</span><strong>{estimatedMinutes} min</strong><small>Estimated listening time</small></article>
            <article className="stat-card"><span>Characters used</span><strong>{totalCharacters.toLocaleString()}</strong><small>Across saved speeches</small></article>
            <article className="stat-card"><span>Favorites</span><strong>{favorites.length}</strong><small>Your preferred sounds</small></article>
          </section>}

          {view === 'voices' && <section className="library-view" aria-labelledby="voices-title">
            <p className="eyebrow">Voice library</p>
            <h2 id="voices-title">Find the right sound.</h2>
            <p className="intro-copy">Browse every voice currently available from the connected speech provider.</p>
            <div className="voice-cards">{filteredVoices.map((item) => <article className="voice-card" key={item.id}><div className="voice-card-icon"><Volume2 size={18} /></div><div><h3>{item.name}</h3><p>{item.language} · {item.gender}</p><span>{item.style}</span></div><button className="text-button" onClick={() => { setLanguage(item.language); setVoice(item.id); setView('create'); }}>Use voice</button></article>)}</div>
          </section>}

          {view === 'output' && <section className="library-view" aria-labelledby="output-title">
            <p className="eyebrow">Audio output</p>
            <h2 id="output-title">Your listening library.</h2>
            {!token ? <div className="empty-library"><Clock3 size={22} /><p>Sign in to keep generated audio in your history.</p><button className="primary-button compact-button" onClick={() => setView('auth')}>Sign in to continue <LogIn size={17} /></button></div> : <><div className="library-toolbar"><div className="library-count"><strong>{history.length}</strong> saved {history.length === 1 ? 'speech' : 'speeches'}</div><select aria-label="Filter audio history" value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)}><option value="all">All audio</option><option value="favorites">Favorites only</option></select></div>{libraryMessage && <p className="library-message" role="status">{libraryMessage}</p>}<div className="history-list">{visibleHistory.length ? visibleHistory.map((item) => <article className="history-item" key={item.id}><div className="history-copy"><strong>{item.title}</strong><span>{item.language} · {item.voice} · {new Date(item.created_at).toLocaleDateString()}</span></div><div className="history-actions"><audio controls preload="none" src={`${getApiBaseUrl()}${item.audio_url}`} /><button className="icon-button" onClick={() => reuseHistory(item)} title="Reuse text"><RotateCcw size={16} /></button><button className="icon-button" onClick={() => handleRename(item)} title="Rename audio"><Pencil size={16} /></button><button className="icon-button" onClick={() => toggleFavorite(item)} title={item.is_favorite ? 'Remove favorite' : 'Add favorite'}><Heart size={17} fill={item.is_favorite ? 'currentColor' : 'none'} /></button><button className="icon-button danger-button" onClick={() => handleDelete(item)} title="Delete audio"><Trash2 size={16} /></button><button className="icon-button" onClick={() => handleLibraryDownload(item)} title="Download audio"><Download size={16} /></button></div></article>) : <div className="empty-library"><AudioLines size={22} /><p>{searchQuery || historyFilter === 'favorites' ? 'No matching audio found.' : 'Your generated speeches will appear here.'}</p></div>}</div></>}
          </section>}

          {view === 'auth' && <section className="auth-page" aria-labelledby="auth-title">
            <div className="auth-story">
              <p className="eyebrow">Secure access</p>
              <h2 id="auth-title">{authMode === 'login' ? 'Welcome back to your audio workspace.' : 'Create your personal audio workspace.'}</h2>
              <p>{authMode === 'login' ? 'Sign in to continue creating, organizing, and replaying your generated speech.' : 'Save your generated speeches, favorite voices, and build a personal listening library.'}</p>
              <span className="auth-session-pill"><span className="status-dot" />Private workspace</span>
              <div className="auth-benefits"><div><CheckCircle2 size={16} /><span><strong>Saved history</strong>Keep every generated speech close.</span></div><div><ShieldCheck size={16} /><span><strong>Protected access</strong>Your library stays tied to your account.</span></div><div><AudioLines size={16} /><span><strong>Ready anywhere</strong>Return to your audio from the output view.</span></div></div>
            </div>
            <div className="auth-card">
              <div className="auth-card-icon">{authMode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}</div>
              <span className="auth-card-kicker">Account access</span>
              <h3>{authMode === 'login' ? 'Sign in to your account' : 'Create your account'}</h3>
              <p>{authMode === 'login' ? 'Use your email and password to open your workspace.' : 'Register with your details and start building your library.'}</p>
              <form className="auth-form" onSubmit={handleAuth}>{authMode === 'register' && <><label htmlFor="auth-full-name">Full name</label><input id="auth-full-name" type="text" placeholder="Your full name" value={authFullName} onChange={(event) => setAuthFullName(event.target.value)} autoComplete="name" required /><label htmlFor="auth-mobile">Mobile number</label><input id="auth-mobile" type="tel" placeholder="+1 555 123 4567" value={authMobileNumber} onChange={(event) => setAuthMobileNumber(event.target.value)} autoComplete="tel" required /></>}<label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" placeholder="you@example.com" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" required /><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" placeholder="At least 8 characters" minLength="8" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required />{authError && <p className="error-message">{authError}</p>}<button className="primary-button" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form>
              <button className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
            </div>
          </section>}

          {view === 'profile' && accountEmail && <section className="profile-page" aria-labelledby="profile-title">
            <div className="profile-heading"><div><p className="eyebrow">Account settings</p><h2 id="profile-title">Your profile.</h2><p className="intro-copy">Manage your account identity and personal audio workspace.</p></div><button className="secondary-button" onClick={signOut}><LogOut size={15} /> Sign out</button></div>
            <div className="profile-grid"><article className="profile-card profile-identity"><label className={`avatar-upload ${isEditingProfile ? '' : 'avatar-readonly'}`}><span className="large-avatar">{visibleProfileImageSrc ? <img src={visibleProfileImageSrc} alt="Profile" /> : <UserRound size={28} />}</span><span>{isEditingProfile ? (pendingAvatarFile ? 'Photo selected' : 'Choose photo') : 'Profile photo'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} disabled={!isEditingProfile} /></label><h3>{accountName || accountEmail.split('@')[0]}</h3><p>{accountEmail}</p><p className="profile-mobile">{accountMobile || 'Mobile number not provided'}</p><span className="member-pill"><CheckCircle2 size={13} /> Active member</span></article><article className="profile-card profile-details-card">{isEditingProfile ? <form className="profile-edit-form" onSubmit={saveProfile}><p className="section-kicker">Edit profile</p><label htmlFor="profile-name">Full name</label><input id="profile-name" value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} required /><label htmlFor="profile-email">Email address</label><input id="profile-email" type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} required /><label htmlFor="profile-mobile">Mobile number</label><input id="profile-mobile" type="tel" value={profileForm.mobileNumber} onChange={(event) => setProfileForm({ ...profileForm, mobileNumber: event.target.value })} required /><div className="profile-form-actions"><button className="secondary-button" type="button" onClick={() => { setIsEditingProfile(false); setPendingAvatarFile(null); setPendingAvatarPreview(''); }}>Cancel</button><button className="primary-button" type="submit" disabled={isProfileSaving}>{isProfileSaving ? 'Saving...' : 'Save changes'} <CheckCircle2 size={15} /></button></div></form> : <><div className="profile-card-heading"><div><p className="section-kicker">Personal details</p><h3>{accountName || 'Your profile'}</h3><p>Keep your contact details up to date.</p></div><button className="secondary-button" onClick={beginProfileEdit}><Pencil size={15} /> Edit profile</button></div><div className="profile-detail-list"><div><span>Full name</span><strong>{accountName || 'Not provided'}</strong></div><div><span>Email address</span><strong>{accountEmail}</strong></div><div><span>Mobile number</span><strong>{accountMobile || 'Not provided'}</strong></div></div>{profileMessage && <p className="profile-success">{profileMessage}</p>}{profileError && <p className="error-message">{profileError}</p>}</>}</article><article className="profile-card"><p className="section-kicker">Workspace overview</p><div className="profile-stat-row"><div><strong>{history.length}</strong><span>Saved speeches</span></div><div><strong>{favorites.length}</strong><span>Favorites</span></div><div><strong>{totalCharacters.toLocaleString()}</strong><span>Characters</span></div></div></article><article className="profile-card profile-security"><div className="profile-card-title"><ShieldCheck size={19} /><div><h3>Account security</h3><p>Password protected account</p></div></div><button className="secondary-button" onClick={() => setView('output')}>Open audio library <ArrowRight size={15} /></button></article></div>
          </section>}

          {view === 'create' && <form className="speech-form" onSubmit={handleGenerate} noValidate>
            <section className="panel text-panel" aria-labelledby="text-label">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">01 / Script</p>
                <h3 id="text-label">What should be spoken?</h3>
              </div>
              <div className="editor-actions"><label className="upload-button" title="Import TXT, PDF, or DOCX"><FileUp size={15} />{isUploading ? 'Reading...' : 'Import'}<input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" onChange={handleDocumentUpload} disabled={isUploading} /></label><button className="text-button" type="button" onClick={handleClear} disabled={!text && !audioUrl}>Clear</button></div>
            </div>
            <label className="sr-only" htmlFor="speech-text">Text to convert into speech</label>
            <textarea
              id="speech-text"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError('');
              }}
              placeholder="Paste or write your text here..."
              maxLength={MAX_CHARACTERS + 500}
              aria-describedby="text-meta text-validation-error"
              aria-invalid={Boolean(textError && hasAttemptedGenerate)}
            />
            <div className="text-meta" id="text-meta">
              <span>{wordCount} words</span>
              <span className={isOverLimit ? 'count-warning' : ''}>{characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters</span>
            </div>
            {hasAttemptedGenerate && textError && <p className="field-error" id="text-validation-error">{textError}</p>}
          </section>

            <section className="panel settings-panel" id="voice-settings" aria-labelledby="settings-title">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">02 / Voice settings</p>
                <h3 id="settings-title">Choose the sound</h3>
              </div>
            </div>
            <div className="settings-grid">
              <div className="field">
                <label htmlFor="language">Language</label>
                <select id="language" value={language} onChange={handleLanguageChange} aria-describedby="language-hint">
                  {languages.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
                <span className="field-hint" id="language-hint">{availableVoices.length} {availableVoices.length === 1 ? 'voice' : 'voices'} available</span>
              </div>
              <div className="field">
                <label htmlFor="voice">Voice</label>
                <select id="voice" value={voice} onChange={(event) => setVoice(event.target.value)} disabled={!availableVoices.length} aria-describedby="voice-hint">
                  {!availableVoices.length && <option value="">No voices available</option>}
                  {availableVoices.map((item) => <option value={item.id} key={item.id}>{item.name} - {item.gender}</option>)}
                </select>
                <span className="field-hint" id="voice-hint">{selectedVoice ? `${selectedVoice.style} voice` : 'Choose a supported voice'}</span>
              </div>
              <div className="field range-field">
                <label htmlFor="speaking-rate">Speaking rate <output>{speakingRate.toFixed(1)}x</output></label>
                <input id="speaking-rate" type="range" min="0.5" max="2" step="0.1" value={speakingRate} onChange={(event) => setSpeakingRate(Number(event.target.value))} />
                <span className="field-hint">Half speed to double speed</span>
              </div>
              <div className="field range-field">
                <label htmlFor="pitch">Pitch <output>{pitch > 0 ? '+' : ''}{pitch} st</output></label>
                <input id="pitch" type="range" min="-20" max="20" step="1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} />
                <span className="field-hint">Natural voice pitch adjustment</span>
              </div>
              <div className="field range-field">
                <label htmlFor="volume-gain">Volume <output>{volumeGainDb > 0 ? '+' : ''}{volumeGainDb} dB</output></label>
                <input id="volume-gain" type="range" min="-10" max="10" step="1" value={volumeGainDb} onChange={(event) => setVolumeGainDb(Number(event.target.value))} />
                <span className="field-hint">Provider output level</span>
              </div>
            </div>
            <button className="primary-button" type="submit" disabled={isGenerating}>
              {isGenerating ? 'Preparing audio...' : 'Generate Speech'}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </section>

            <div className="feedback-region" aria-live="polite">
              {error && <p className="error-message" role="alert">{error}</p>}
            </div>
          </form>}

          {view === 'create' && <section className={`panel result-panel ${audioUrl ? 'has-audio' : ''}`} id="result" aria-labelledby="result-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">03 / Result</p>
              <h3 id="result-title">Generated audio</h3>
            </div>
            <span className="result-state">{audioUrl ? (audioReady ? 'Ready to play' : 'Loading audio') : 'Waiting for a script'}</span>
          </div>
          {audioUrl ? (
            <div className="audio-player">
              <audio
                ref={audioRef}
                controls
                preload="metadata"
                src={audioUrl}
                onLoadedMetadata={(event) => {
                  event.currentTarget.volume = Math.min(1, Math.max(0, 10 ** (volumeGainDb / 20)));
                  event.currentTarget.preservesPitch = false;
                  event.currentTarget.mozPreservesPitch = false;
                  event.currentTarget.webkitPreservesPitch = false;
                  event.currentTarget.playbackRate = speakingRate * (2 ** (pitch / 12));
                }}
                onCanPlay={() => setAudioReady(true)}
                onError={() => {
                  setAudioReady(false);
                  setError('The generated audio could not be loaded.');
                }}
                aria-label="Generated speech audio"
              >
                Your browser does not support audio playback.
              </audio>
              <button className="download-button" type="button" onClick={handleDownload} disabled={!audioReady || isDownloading}>
                {isDownloading ? 'Preparing download...' : 'Download Audio'}
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          ) : <div className="empty-result"><span className="waveform" aria-hidden="true">||||||||||||||||||||</span><p>Your generated audio will appear here.</p></div>}
          </section>}
        </main>
      </div>

    </div>
  );
}

export default App;
