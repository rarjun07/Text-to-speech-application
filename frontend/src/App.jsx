import { useEffect, useMemo, useState } from 'react';
import { ApiError, downloadAudio, generateSpeech, getApiBaseUrl, getHealth, getVoices } from './api/client';

const MAX_CHARACTERS = 5000;

const voices = [
  { id: 'en-female', name: 'Ava', language: 'en-US', gender: 'Female', style: 'Clear and warm' },
  { id: 'en-male', name: 'Liam', language: 'en-US', gender: 'Male', style: 'Calm and steady' },
  { id: 'hi-female', name: 'Ananya', language: 'hi-IN', gender: 'Female', style: 'Natural and expressive' },
  { id: 'es-female', name: 'Sofia', language: 'es-ES', gender: 'Female', style: 'Bright and conversational' },
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

  const availableVoices = useMemo(
    () => providerVoices.filter((item) => item.language === language),
    [language, providerVoices],
  );
  const selectedVoice = providerVoices.find((item) => item.id === voice);

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
      const result = await generateSpeech({ text: text.trim(), language, voice });
      if (!result?.audio_url) throw new ApiError('The backend returned no audio URL.');
      setAudioReady(false);
      setAudioUrl(result.audio_url.startsWith('http') ? result.audio_url : `${getApiBaseUrl()}${result.audio_url}`);
    } catch (requestError) {
      setAudioUrl('');
      setError(requestError instanceof ApiError ? requestError.message : 'Speech generation failed.');
    } finally {
      setIsGenerating(false);
    }
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">TS</div>
        <div>
          <p className="eyebrow">Audio workspace</p>
          <h1>Text to Speech</h1>
        </div>
        <span className={`status-chip ${backendStatus}`}><span className="status-dot" />{backendStatus === 'checking' ? 'Checking backend' : backendStatus === 'online' ? 'Backend online' : 'Backend offline'}</span>
      </header>

      <main className="workspace">
        <section className="intro" aria-labelledby="workspace-title">
          <p className="eyebrow">Create a clear listening version</p>
          <h2 id="workspace-title">Turn your words into sound.</h2>
          <p className="intro-copy">Write or paste text, choose a voice, and generate an audio preview when the backend is connected.</p>
        </section>

        <form className="speech-form" onSubmit={handleGenerate} noValidate>
          <section className="panel text-panel" aria-labelledby="text-label">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">01 / Script</p>
                <h3 id="text-label">What should be spoken?</h3>
              </div>
              <button className="text-button" type="button" onClick={handleClear} disabled={!text && !audioUrl}>Clear</button>
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

          <section className="panel settings-panel" aria-labelledby="settings-title">
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
            </div>
            <button className="primary-button" type="submit" disabled={isGenerating}>
              {isGenerating ? 'Preparing audio...' : 'Generate Speech'}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </section>

          <div className="feedback-region" aria-live="polite">
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
        </form>

        <section className={`panel result-panel ${audioUrl ? 'has-audio' : ''}`} aria-labelledby="result-title">
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
                controls
                preload="metadata"
                src={audioUrl}
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
        </section>
      </main>

      <footer className="app-footer">API endpoint: {getApiBaseUrl()}</footer>
    </div>
  );
}

export default App;
