import { useCallback, useEffect, useRef, useState } from 'react';

/** Messaggio inviato dal service worker quando ha scaricato tutto (vedi pwa/sw-template.js). */
export interface PrecachedInfo {
  type: 'EULERO_PRECACHED';
  version: string;
  /** Prima installazione (non un aggiornamento). */
  first: boolean;
  /** Livelli scaricati ora (nuovi o cambiati). */
  added: number;
  /** Livelli complessivamente disponibili offline. */
  levels: number;
}

const CHECK_EVERY_MS = 30 * 60 * 1000;

const isInfo = (d: unknown): d is PrecachedInfo =>
  typeof d === 'object' && d !== null && (d as { type?: string }).type === 'EULERO_PRECACHED';

/**
 * Registra il service worker e lo tiene aggiornato: controlla all'apertura, quando l'app torna in
 * primo piano, quando torna la rete e ogni 30 minuti. Quando una nuova versione (con livelli nuovi)
 * è scaricata e attiva chiama `onReady`.
 */
export function startPwa(onReady: (info: PrecachedInfo) => void): () => void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return () => {};

  let registration: ServiceWorkerRegistration | undefined;

  // Il worker invia questo messaggio quando ha scaricato tutto E ha preso il controllo della
  // pagina: da qui in poi la cache è completa e aggiornata.
  const onMessage = (e: MessageEvent) => {
    if (!isInfo(e.data)) return;
    onReady(e.data);
    // chiede al browser di non cancellare i livelli offline quando manca spazio
    void navigator.storage?.persist?.().catch(() => undefined);
  };
  navigator.serviceWorker.addEventListener('message', onMessage);

  const check = () => void registration?.update().catch(() => undefined);
  const onVisible = () => document.visibilityState === 'visible' && check();

  const register = () =>
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        registration = reg;
      })
      .catch(() => {
        // offline non disponibile: il gioco funziona comunque online
      });

  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', check);
  const timer = window.setInterval(check, CHECK_EVERY_MS);

  return () => {
    navigator.serviceWorker.removeEventListener('message', onMessage);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', check);
    window.removeEventListener('load', register);
    window.clearInterval(timer);
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Stato di rete e installazione (pulsante "Installa", suggerimento per iOS). */
export function usePwa() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [canPrompt, setCanPrompt] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const before = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const done = () => {
      deferred.current = null;
      setCanPrompt(false);
      setInstalled(true);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('appinstalled', done);
    };
  }, []);

  const install = useCallback(async () => {
    const e = deferred.current;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => undefined);
    deferred.current = null;
    setCanPrompt(false);
  }, []);

  return { online, installed, canPrompt, install, iosHint: isIos() && !installed };
}
