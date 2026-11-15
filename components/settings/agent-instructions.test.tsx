import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import type { AgentInstructions } from '@/lib/api';
import { AgentInstructionsForm } from './agent-instructions';

const saved = (instructions = ''): AgentInstructions => ({
  instructions, max_length: 4000, global: 'Work tickets like a teammate.', global_version: 3,
  heading: 'Additional instructions from this organization:', effective: 'Work tickets like a teammate.',
});
const textarea = (html: string) => html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)![1];

// TL-901: empty by default; the example is offered to copy, never filled in
test('nothing saved: an empty editor, the limit, what it costs, and the example only as something to copy', () => {
  const html = render(<AgentInstructionsForm saved={saved()} draft="" onChange={() => {}} />);
  expect(textarea(html)).toBe('');
  expect(html).toContain('0 of 4,000 characters');
  expect(html).toContain('added after TrackLin.es’ standard instructions');
  expect(html).toContain('this organization only');
  expect(html).toContain('more tokens');
  expect(html).toContain('may need to reconnect');
  expect(html).toContain('Follow the Boy Scout rule');
  expect(html).toContain('Copy example');
  expect(html).toContain('never added for you');
  // the preview: the standard instructions with their version, and nothing of the organization's
  expect(html).toContain('Standard instructions (version 3), for every organization');
  expect(html).toContain('Work tickets like a teammate.');
  expect(html).toContain('Nothing: agents get the standard instructions only.');
  expect(html).not.toContain('Unsaved draft');
  expect(html).not.toContain('Additional instructions from this organization:');
});

test('saved instructions: in the editor and in the preview under the heading agents see, marked as saved', () => {
  const html = render(<AgentInstructionsForm saved={saved('Run the linter.')} draft="Run the linter." onChange={() => {}} />);
  expect(textarea(html)).toBe('Run the linter.');
  expect(html).toContain('15 of 4,000 characters');
  expect(html).toContain('Additional instructions from this organization:\nRun the linter.');
  expect(html).not.toContain('Unsaved draft');
  expect(html).not.toContain('until you save this draft');
});

test('a draft: previewed as it would be saved, and told apart from what agents get now', () => {
  const html = render(<AgentInstructionsForm saved={saved('Run the linter.')} draft="  Run the tests too.  " onChange={() => {}} />);
  expect(html).toContain('Unsaved draft');
  expect(html).toContain('Additional instructions from this organization:\nRun the tests too.');
  expect(html).toContain('Agents keep getting the saved instructions until you save this draft.');
  // emptied: saving it would clear them
  const emptied = render(<AgentInstructionsForm saved={saved('Run the linter.')} draft="   " onChange={() => {}} />);
  expect(emptied).toContain('Unsaved draft');
  expect(emptied).toContain('Nothing: agents get the standard instructions only.');
});

test('over the limit: said, with the editor marked invalid', () => {
  const html = render(<AgentInstructionsForm saved={saved()} draft={'x'.repeat(4001)} onChange={() => {}} />);
  expect(html).toContain('4,001 of 4,000 characters');
  expect(html).toContain('role="alert"');
  expect(html).toContain('can be up to 4,000 characters');
  expect(html).toContain('aria-invalid="true"');
  expect(render(<AgentInstructionsForm saved={saved()} draft={'x'.repeat(4000)} onChange={() => {}} />)).not.toContain('role="alert"');
});

test('where it is: an admin-only Settings card and page; another organization starts the editor again (source)', async () => {
  const settings = await Bun.file(new URL('../../app/settings/page.tsx', import.meta.url)).text();
  expect(settings).toContain('{admin && <SettingsCard icon={BotIcon} title={t`Additional agent instructions`} href="/settings/agent-instructions"');
  const page = await Bun.file(new URL('../../app/settings/agent-instructions/page.tsx', import.meta.url)).text();
  expect(page).toContain('<OrgAgentInstructions key={orgId ?? \'\'} token={token} />'); // keyed by organization: state can't carry over
  expect(page).toContain('}, [signedIn, orgId]);'); // and admin is asked again
  expect(page).toContain('Only organization admins can see or change');
  const editor = await Bun.file(new URL('./agent-instructions.tsx', import.meta.url)).text();
  expect(editor).toContain("useState('')"); // the draft starts empty, then takes what's saved: never the example
  expect(editor).toContain('setDraft(v.instructions)');
  expect(editor).toContain("disabled={state === 'saving' || !d.changed || d.tooLong}"); // nothing over the limit is sent
  expect(editor).toContain("onClick={() => void save('')}"); // Clear saves empty text
});
