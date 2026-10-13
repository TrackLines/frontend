import Link from 'next/link';

// OrganizationCard: admins manage the organization; everyone else views who's in it (pure, for tests).
export function OrganizationCard({ admin }: { admin: boolean }) {
  return admin ? <>
    <p className="mt-2 text-sm text-muted-foreground">Invite people, and manage members, teams, project access and leadership.</p>
    <Link href="/settings/organization" className="mt-3 inline-block text-sm font-medium hover:underline">Manage organization →</Link>
  </> : <>
    <p className="mt-2 text-sm text-muted-foreground">See who’s in your organization, its teams and who leads them.</p>
    <Link href="/settings/organization" className="mt-3 inline-block text-sm font-medium hover:underline">View organization →</Link>
  </>;
}
