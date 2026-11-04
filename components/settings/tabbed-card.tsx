import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SettingsCard } from '@/components/settings/settings-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type CardTab = { id: string; label: string; hint?: ReactNode; content: ReactNode };

// TabbedCard: a wide SettingsCard grouping related settings, one tab each, the first open (TL-803).
// A single tab shows as its content alone.
export function TabbedCard({ icon, title, description, tabs }: { icon: LucideIcon; title: string; description: ReactNode; tabs: CardTab[] }) {
  const body = (tab: CardTab) => <>{tab.hint && <p className="text-sm text-muted-foreground">{tab.hint}</p>}{tab.content}</>;
  return (
    <SettingsCard wide icon={icon} title={title} description={description}>
      {tabs.length === 1 ? body(tabs[0]) : (
        <Tabs defaultValue={tabs[0]?.id}>
          <TabsList className="h-auto flex-wrap">{tabs.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>)}</TabsList>
          {tabs.map((tab) => <TabsContent key={tab.id} value={tab.id} className="grid gap-3 pt-3">{body(tab)}</TabsContent>)}
        </Tabs>
      )}
    </SettingsCard>
  );
}
