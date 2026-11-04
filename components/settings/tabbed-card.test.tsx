import { expect, test } from 'bun:test';
import { SettingsIcon } from 'lucide-react';
import { render } from '@/test/i18n';
import { TabbedCard } from './tabbed-card';

test('a tab per setting, the first open (TL-803)', () => {
  const html = render(<ul><TabbedCard icon={SettingsIcon} title="General" description="d" tabs={[
    { id: 'name', label: 'Name', hint: 'What it is called.', content: <p>name field</p> },
    { id: 'keys', label: 'Ticket keys', content: <p>keys field</p> },
  ]} /></ul>);
  expect(html).toContain('General');
  expect(html.match(/role="tab"/g)).toHaveLength(2);
  expect(html).toContain('What it is called.');
  expect(html).toContain('name field');
});

test('one tab shows its content without a tab list', () => {
  const html = render(<ul><TabbedCard icon={SettingsIcon} title="Automation" description="d" tabs={[{ id: 'review', label: 'Agent review', content: <p>review field</p> }]} /></ul>);
  expect(html).not.toContain('role="tab"');
  expect(html).toContain('review field');
});
