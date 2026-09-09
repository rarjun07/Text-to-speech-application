import { useMemo, useState } from 'react';

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
  const [hasAttemptedGenerate, setHasAttemptedGenerate] = useState(false);

  const availableVoices = useMemo(() => voicesForLanguage(language), [language]);
  const selectedVoice = voices.find((item) => item.id === voice);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const textError = !text.trim()
    ? 'Text is required.'
    : isOverLimit
      ? `Text must be ${MAX_CHARACTERS.toLocaleString()} characters or fewer.`
      : '';

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    const nextVoices = voicesForLanguage(nextLanguage);
    setLanguage(nextLanguage);
    setVoice(nextVoices[0]?.id || '');
    setError('');
  }

  function handleGenerate(event) {
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
    window.setTimeout(() => setIsGenerating(false), 650);
  }

  function handleClear() {
    setText('');
    setAudioUrl('');
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
        <span className="status-chip"><span className="status-dot" />Ready</span>
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
            <span className="result-state">{audioUrl ? 'Ready to play' : 'Waiting for a script'}</span>
          </div>
          {audioUrl ? <audio controls src={audioUrl}>Your browser does not support audio playback.</audio> : <div className="empty-result"><span className="waveform" aria-hidden="true">||||||||||||||||||||</span><p>Your generated audio will appear here.</p></div>}
        </section>
      </main>

      <footer className="app-footer">FastAPI connection will be added in the next integration stages.</footer>
    </div>
  );
}

export default App;
