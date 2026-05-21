import { useCallback, useEffect, useState } from 'react';

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return (
    document.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

async function requestFullscreen(element: HTMLElement): Promise<void> {
  const el = element as FullscreenElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
}

async function exitFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  if (document.exitFullscreen) return document.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  if (doc.msExitFullscreen) return doc.msExitFullscreen();
}

export function usePresentationMode() {
  const [isActive, setIsActive] = useState(false);

  const activate = useCallback(async () => {
    setIsActive(true);
    try {
      await requestFullscreen(document.documentElement);
    } catch {
      // navegador pode bloquear; fica em fullscreen-soft mesmo
    }
  }, []);

  const deactivate = useCallback(async () => {
    setIsActive(false);
    try {
      if (getFullscreenElement()) {
        await exitFullscreen();
      }
    } catch {
      // ignora
    }
  }, []);

  const toggle = useCallback(() => {
    if (isActive) {
      void deactivate();
    } else {
      void activate();
    }
  }, [isActive, activate, deactivate]);

  useEffect(() => {
    if (!isActive) {
      document.documentElement.classList.remove('presentation-active');
      return;
    }
    document.documentElement.classList.add('presentation-active');

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void deactivate();
      }
    };
    const handleFsChange = () => {
      if (!getFullscreenElement()) {
        setIsActive(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('msfullscreenchange', handleFsChange);

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('msfullscreenchange', handleFsChange);
      document.documentElement.classList.remove('presentation-active');
    };
  }, [isActive, deactivate]);

  return { isActive, toggle, activate, deactivate };
}
