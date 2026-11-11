export interface SupportedLanguage {
  code: string;
  nativeLabel: string;
  englishLabel: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', nativeLabel: 'English', englishLabel: 'English', flag: '🇬🇧' },
  { code: 'ta', nativeLabel: 'தமிழ்', englishLabel: 'Tamil', flag: '🇮🇳' },
];

export const SUPPORTED_LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export function pickLocalizedName(
  product: { name: string; nameTranslations?: Record<string, string> | null | undefined },
  lang: string | undefined,
): string {
  if (!lang) return product.name;
  const t = product.nameTranslations?.[lang];
  if (t && t.trim().length > 0) return t.trim();
  return product.name;
}

export interface AutoTranslateResult {
  ok: boolean;
  text: string;
  provider?: 'google' | 'libre' | 'mymemory';
  error?: string;
}

interface Provider {
  name: 'google' | 'libre' | 'mymemory';
  call(text: string, target: string, source: string, signal: AbortSignal): Promise<string>;
}

const googleProvider: Provider = {
  name: 'google',
  async call(text, target, source, signal) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error(`google ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0]
        .map((chunk: any[]) => (Array.isArray(chunk) ? String(chunk[0] || '') : ''))
        .join('')
        .trim();
    }
    return '';
  },
};

const libreProvider: Provider = {
  name: 'libre',
  async call(text, target, source, signal) {
    const r = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
      signal,
    });
    if (!r.ok) throw new Error(`libre ${r.status}`);
    const data = (await r.json()) as { translatedText?: string };
    return (data?.translatedText || '').trim();
  },
};

const myMemoryProvider: Provider = {
  name: 'mymemory',
  async call(text, target, source, signal) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${source}|${target}`)}`;
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error(`mymemory ${r.status}`);
    const data = (await r.json()) as { responseData?: { translatedText?: string } };
    return (data?.responseData?.translatedText || '').trim();
  },
};

const PROVIDERS: Provider[] = [googleProvider, libreProvider, myMemoryProvider];

export async function autoTranslate(
  text: string,
  targetLang: string,
  sourceLang = 'en',
): Promise<AutoTranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, text: '' };
  if (targetLang === sourceLang) return { ok: true, text: trimmed };

  let lastError: string | undefined;
  for (const provider of PROVIDERS) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    try {
      const out = await provider.call(trimmed, targetLang, sourceLang, ctrl.signal);
      clearTimeout(timeout);
      if (out && out.length > 0 && out !== trimmed) {
        return { ok: true, text: out, provider: provider.name };
      }
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = `${provider.name}: ${err?.message || String(err)}`;
    }
  }
  return { ok: false, text: trimmed, error: lastError || 'All translation providers failed' };
}
