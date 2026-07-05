import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useScriptStore } from '../stores/scriptStore';
import { useUIStore } from '../stores/uiStore';
import { pushUndo } from '../utils/undoHistory';
import type React from 'react';
import {
  getStoredModel,
  setStoredModel,
  getStoredApiKey,
  setStoredApiKey,
  getStoredBaseUrl,
  setStoredBaseUrl,
} from '../services/db';

const inputStyle: React.CSSProperties = {
  height: 40, borderRadius: 8, border: '0.5px solid var(--color-border)',
  paddingLeft: 10, fontSize: 13, outline: 'none', flexShrink: 0,
  margin: 0, background: 'transparent', fontWeight: 500, width: '100%',
  boxSizing: 'border-box', color: 'var(--color-text)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, color: 'var(--color-text-inverted)',
  marginBottom: 6, display: 'block',
};

export function SettingsModal() {
  const { getActiveScript, updateScript } = useScriptStore();
  const {
    settingsModalOpen, setSettingsModalOpen, addToast,
    mainFontSize, mainLineHeight,
    setMainFontSize, setMainLineHeight,
  } = useUIStore();

  const script = getActiveScript();
  const [model, setModel] = useState(getStoredModel());
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(getStoredBaseUrl());

  useEffect(() => {
    if (settingsModalOpen) {
      setModel(getStoredModel());
      setBaseUrl(getStoredBaseUrl());
      const stored = getStoredApiKey();
      setApiKey(stored ?? '');
    }
  }, [settingsModalOpen]);

  useEffect(() => {
    if (!settingsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settingsModalOpen, setSettingsModalOpen]);

  const handleModelChange = (value: string) => {
    setModel(value);
    setStoredModel(value);
  };

  const handleBaseUrlChange = (value: string) => {
    setBaseUrl(value);
    setStoredBaseUrl(value);
  };

  const handleApiKeySave = () => {
    const trimmed = apiKey.trim();
    setStoredApiKey(trimmed || null);
    addToast({ type: 'success', message: trimmed ? 'API key saved' : 'API key removed' });
  };

  const handlePaceChange = (value: string) => {
    if (!script) return;
    const pace = parseFloat(value);
    if (!isNaN(pace) && pace > 0) {
      const oldPace = script.paceWordsPerSec;
      updateScript(script.id, { paceWordsPerSec: pace });
      pushUndo({ label: `Change pace to ${pace}`, undo: () => updateScript(script.id, { paceWordsPerSec: oldPace }) });
    }
  };

  if (!settingsModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setSettingsModalOpen(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        style={{
          position: 'fixed',
          left: 200, top: '50%',
          width: 314,
          borderRadius: 16,
          border: '0.5px solid var(--color-border)',
          background: 'var(--color-card-bg)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          animation: 'ref-dialog-in 0.25s cubic-bezier(0.2, 0, 0, 1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
          <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-headline)', fontSize: 18, textTransform: 'uppercase' }}>Settings</span>
          </div>

          {/* Base URL */}
          <div>
            <span style={labelStyle}>API Base URL</span>
            <input
              type="text"
              value={baseUrl}
              onChange={e => handleBaseUrlChange(e.target.value)}
              placeholder="https://api.openai.com/v1 or a compatible endpoint"
              style={inputStyle}
            />
          </div>

          {/* API Key */}
          <div>
            <span style={labelStyle}>API Key</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onBlur={handleApiKeySave}
                placeholder="sk-..."
                style={{ ...inputStyle, paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-inverted)', padding: 4,
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <span style={labelStyle}>Model</span>
            <input
              type="text"
              value={model}
              onChange={e => handleModelChange(e.target.value)}
              placeholder="gpt-4.1"
              style={inputStyle}
            />
          </div>

          {/* Pace */}
          {script && (
            <div>
              <span style={labelStyle}>Pace (words/sec)</span>
              <input
                type="number"
                value={script.paceWordsPerSec}
                onChange={e => handlePaceChange(e.target.value)}
                step="0.1"
                min="0.5"
                max="5"
                style={inputStyle}
              />
            </div>
          )}

          {/* Typography */}
          <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 16 }}>
            <span style={{ ...labelStyle, marginBottom: 12, display: 'block' }}>Typography</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...labelStyle, marginBottom: 0, width: 100, flexShrink: 0 }}>Font size (px)</span>
                <input
                  type="number"
                  value={mainFontSize}
                  onChange={e => setMainFontSize(Number(e.target.value))}
                  min={10} max={20} step={0.5}
                  style={{ ...inputStyle, width: 'auto', flex: 1, flexShrink: 1, minWidth: 0 }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...labelStyle, marginBottom: 0, width: 100, flexShrink: 0 }}>Line height</span>
                <input
                  type="number"
                  value={mainLineHeight}
                  onChange={e => setMainLineHeight(Number(e.target.value))}
                  min={1} max={2.5} step={0.05}
                  style={{ ...inputStyle, width: 'auto', flex: 1, flexShrink: 1, minWidth: 0 }}
                />
              </div>
            </div>
          </div>

          {/* Button group */}
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            <button
              onClick={() => setSettingsModalOpen(false)}
              style={{
                flex: 1, height: 40, borderRadius: 8,
                border: '0.5px solid var(--color-border)', background: 'transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--color-text-inverted)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setSettingsModalOpen(false)}
              style={{
                flex: 1, height: 40, borderRadius: 8,
                background: 'var(--color-accent)', color: 'var(--color-black)',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              Done
            </button>
          </div>
      </div>
    </div>
  );
}
