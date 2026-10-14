import { UsersIcon } from 'lucide-react';
import { SettingsCard } from './settings-card';

// OrganizationCard: admins manage the organization; everyone else views who's in it (pure, for tests).
export function OrganizationCard({ admin }: { admin: boolean }) {
  return admin
    ? <SettingsCard icon={UsersIcon} title="Manage organization" href="/settings/organization"
        description="Invite people, and manage members, teams, project access and leadership." />
    : <SettingsCard icon={UsersIcon} title="View organization" href="/settings/organization"
        description="See who’s in your organization, its teams and who leads them." />;
}
