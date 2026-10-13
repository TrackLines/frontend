import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProjectRepo } from '@/lib/api';
import { RepositoriesView } from './repositories';

const shop: ProjectRepo = { provider: 'github', full_name: 'acme/shop', default_branch: 'trunk' };
const view = (props: Partial<Parameters<typeof RepositoriesView>[0]>) => renderToStaticMarkup(
  <RepositoriesView linked={[]} admin connected={['github']} provider={null} choices={null} busy={false} error=""
    onProvider={() => {}} onLink={() => {}} onUnlink={() => {}} {...props} />,
);

test('linked repos; admins unlink, members only see them', () => {
  const html = view({ linked: [shop] });
  expect(html).toContain('acme/shop');
  expect(html).toContain('trunk');
  expect(html).toContain('Unlink');
  const member = view({ linked: [shop], admin: false });
  expect(member).toContain('acme/shop');
  expect(member).not.toContain('Unlink');
  expect(member).not.toContain('Link from');
});

test('nothing connected: admins are pointed at Settings → Integrations', () => {
  const html = view({ connected: [] });
  expect(html).toContain('No repositories linked yet');
  expect(html).toContain('href="/settings/integrations"');
});

test('picking a provider offers repos not already linked', () => {
  expect(view({})).toContain('Link from GitHub');
  expect(view({ provider: 'github', choices: null })).toContain('Loading repositories');
  expect(view({ provider: 'github', choices: [{ full_name: 'acme/shop', default_branch: 'trunk', private: true }], linked: [shop] })).toContain('No other repositories to link');
  expect(view({ provider: 'github', choices: [{ full_name: 'acme/docs', default_branch: 'main', private: false }] })).toContain('Choose a repository');
});

test('the connect hint names only the git providers that are switched on', () => {
  expect(view({ connected: [] })).toContain('Connect GitHub in');
  expect(view({ connected: [], bitbucket: true })).toContain('Connect GitHub or Bitbucket in');
});
