import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { GuideSettingsView } from './guide';

test('guide reset is a personal settings action with saving, success and failure feedback', () => {
  const view = (busy=false, error='', reset=false) => render(<GuideSettingsView busy={busy} error={error} reset={reset} onReset={() => {}} />);
  expect(view()).toContain('Reset guide');
  expect(view()).toContain('this organization');
  expect(view(true)).toContain('disabled');
  expect(view(true)).toContain('Resetting');
  expect(view(false,'Try again')).toContain('role="alert"');
  expect(view(false,'Try again')).not.toContain('Guide progress reset');
  expect(view(false,'',true)).toContain('role="status"');
  expect(view(false,'',true)).toContain('Guide progress reset');
});
