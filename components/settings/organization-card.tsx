import { useLingui } from '@lingui/react/macro';
import { UsersIcon } from 'lucide-react';
import { SettingsCard } from './settings-card';

// OrganizationCard: admins manage the organization; everyone else views who's in it (pure, for tests).
export function OrganizationCard({ admin }: { admin: boolean }) {
  const { t } = useLingui();
  return admin
    ? <SettingsCard icon={UsersIcon} title={t`Manage organization`} href="/settings/organization"
        description={t`Invite people, and manage members, teams, project access and leadership.`} />
    : <SettingsCard icon={UsersIcon} title={t`View organization`} href="/settings/organization"
        description={t`See who’s in your organization, its teams and who leads them.`} />;
}
