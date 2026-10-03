import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LANGS } from '@eulero/core';
import type { Lang } from '@eulero/core';
import { DICTS } from './dict';
import type { Dict } from './dict';

const KEY = 'eulero:lang';

/** Lingua iniziale: scelta salvata, altrimenti quella del browser (italiano se "it", sennò inglese). */
export function detectLang(
  stored: string | null,
  browser: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Lang {
  if ((LANGS as readonly string[]).includes(stored ?? '')) return stored as Lang;
  for (const l of browser) {
    const code = l.toLowerCase().slice(0, 2);
    if ((LANGS as readonly string[]).includes(code)) return code as Lang;
  }
  return 'en';
}

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang(readStored()));

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // storage bloccato: la scelta vale solo per questa sessione
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = DICTS[lang].appTitle;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: DICTS[lang] }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n fuori da I18nProvider');
  return ctx;
}

/** Testo con **grassetto**. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text
        .split('**')
        .map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>))}
    </>
  );
}
