'use client';

import { useFlags } from '@flags-gg/react-library';
import { Trans, useLingui } from '@lingui/react/macro';
import { LanguagesIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { setLanguageCookie } from '@/components/layout/language-sync';
import { SettingsCard } from '@/components/settings/settings-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { me } from '@/lib/api';
import { LOCALES } from '@/lib/i18n';
import { LANGUAGE_NAMES, pickLocale } from '@/lib/i18n/locale';

const BROWSER = 'browser'; // the Select's value for "follow the browser" (saved as null)

// LanguageCard: the language TrackLin.es is in for you (TL-553), behind the translations flag. Saved to
// your account, so it follows you to other devices; "Browser default" goes by the browser's languages.
export function LanguageCard({ token }: { token: string }) {
  const { is } = useFlags();
  const router = useRouter();
  const { t } = useLingui();
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => { void me.language(token).then((r) => setSaved(r.language), () => setSaved(null)); }, []); // token refreshes must not refetch

  if (!is('translations').enabled() || saved === undefined) return null;
  async function choose(v: string) {
    const language = v === BROWSER ? null : v;
    setError('');
    try {
      await me.setLanguage(language, token);
      setSaved(language);
      setLanguageCookie(pickLocale(language, navigator.languages));
      router.refresh();
    } catch {
      setError(t`Couldn’t save your language. Please try again.`);
    }
  }
  const items = { [BROWSER]: t`Browser default`, ...LANGUAGE_NAMES };
  return (
    <SettingsCard icon={LanguagesIcon} title={t`Language`} description={t`The language TrackLin.es is in for you, on every device.`}>
      <Select items={items} value={saved ?? BROWSER} onValueChange={(v) => v && void choose(v)}>
        <SelectTrigger aria-label={t`Language`} className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={BROWSER}><Trans>Browser default</Trans></SelectItem>
          {LOCALES.map((l) => <SelectItem key={l} value={l} lang={l}>{LANGUAGE_NAMES[l]}</SelectItem>)}
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SettingsCard>
  );
}
