import { afterEach, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '@lingui/react';
import { ProjectCard } from '@/components/project/project-card';
import { i18nFor } from '@/lib/i18n';
import type { Project } from '@/lib/api';
import { advanceTour, CHAPTERS, GUIDE_ACTION, guideCovered, listenForGuideActions, startTour, tourStep, waitForGuideTarget, type GuideAction } from './guide-tour';

const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const windows: Window[] = [];
function browser(html = '') {
  const window = new Window({ url: 'https://tracklin.es/dashboard' });
  windows.push(window);
  window.document.body.innerHTML = html;
  return { window, doc: window.document as unknown as Document };
}
afterEach(async () => { for (const w of windows.splice(0)) await w.happyDOM.close(); });

test('project tour follows the real name dialog and waits for successful creation', () => {
  let tour = startTour('project', null);
  expect(tourStep(tour)).toEqual({ path: '/dashboard', target: '[data-guide="new-project"]', action: true });
  expect(advanceTour(tour, { type: 'next' })).toBe(tour); // Next cannot bypass the real button
  tour = advanceTour(tour, { type: 'new-project' });
  expect(tourStep(tour)?.target).toBe('[data-guide="project-name"]');
  tour = advanceTour(tour, { type: 'next' });
  expect(tourStep(tour)?.target).toBe('[data-guide="project-submit"]');
  expect(advanceTour(tour, { type: 'next' })).toBe(tour); // submit/validation alone is not success
  tour = advanceTour(tour, { type: 'project-created', projectId });
  expect(tour.stage).toBe('done');
  expect(tour.projectId).toBe(projectId);
  expect(tour.completed).toEqual(['project']);
  expect(guideCovered(tour.completed)).toBe(false);
});

test('a member tour skips unavailable chapters and completes only its permitted scope', () => {
  const allowed = ['ticket', 'tui', 'mcp'] as const;
  let tour = startTour('all', projectId, [], allowed);
  expect(tour.chapters).toEqual([...allowed]);
  expect(tour.stage).toBe('ticket-project');
  tour = advanceTour(tour, { type:'project-opened', projectId });
  tour = advanceTour(tour, { type:'backlog-tab' });
  tour = advanceTour(tour, { type:'add-backlog' });
  tour = advanceTour(tour, { type:'ticket-created' });
  expect(tour.stage).toBe('tui');
  tour = advanceTour(tour, { type:'next' });
  tour = advanceTour(tour, { type:'next' });
  expect(tour.stage).toBe('done');
  expect(guideCovered(tour.completed, allowed)).toBe(true);
  expect(guideCovered(tour.completed)).toBe(false);
  expect(startTour('github', projectId, [], allowed).chapters).toEqual([]);
  expect(startTour('ticket', null, [], allowed).chapters).toEqual([]);
  expect(guideCovered([], [])).toBe(false);
});

test('real project-card click leads through Backlog and the real Add to backlog form', async () => {
  const project = { id: projectId, name: 'Website', description: '', key_prefix: 'WEB' } as Project;
  const html = renderToStaticMarkup(createElement(I18nProvider, { i18n: i18nFor('en') }, createElement(ProjectCard, { project })));
  const { window, doc } = browser(html);
  let tour = startTour('ticket', projectId);
  const off = listenForGuideActions(doc, (action) => { tour = advanceTour(tour, action); });
  const selected = await waitForGuideTarget(doc, tourStep(tour)!.target, new AbortController().signal);
  expect(selected.getAttribute('href')).toBe(`/projects/${projectId}`);
  selected.querySelector('span')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event);
  expect(tourStep(tour)?.path).toBe(`/projects/${projectId}`);
  expect(tour.stage).toBe('ticket-backlog');
  // Next.js loads a different page, while the guide and delegated listener stay mounted.
  doc.body.innerHTML = '<button data-guide="backlog-tab">Backlog</button><button data-guide="add-backlog">Add to backlog</button>';
  doc.querySelector('[data-guide="backlog-tab"]')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event);
  expect(tourStep(tour)?.target).toBe('[data-guide="add-backlog"]');
  doc.querySelector('[data-guide="add-backlog"]')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event);
  expect(tour.stage).toBe('ticket-title');
  doc.body.innerHTML += '<div role="dialog"><form><input data-guide="backlog-title"><button data-guide="backlog-submit" type="submit">Add to backlog</button></form></div>';
  expect((await waitForGuideTarget(doc, tourStep(tour)!.target, new AbortController().signal)).closest('[role="dialog"]')).not.toBeNull();
  tour = advanceTour(tour, { type: 'next' });
  doc.querySelector('form')!.addEventListener('submit', (e) => e.preventDefault());
  doc.querySelector('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }) as unknown as Event);
  expect(tour.stage).toBe('ticket-submit'); // failed request/validation does not emit success
  window.dispatchEvent(new window.CustomEvent(GUIDE_ACTION, { detail: { type: 'ticket-created' } }));
  expect(tour.stage).toBe('done');
  expect(tour.completed).toEqual(['ticket']);
  off();
});

test('full guide opens real feature pages, and only all completed chapters cover the guide', () => {
  let tour = startTour('all', projectId);
  tour = advanceTour(tour, { type: 'use-existing' });
  expect(tour.stage).toBe('ticket-project');
  tour = advanceTour(tour, { type: 'project-opened', projectId });
  tour = advanceTour(tour, { type: 'backlog-tab' });
  tour = advanceTour(tour, { type: 'add-backlog' });
  tour = advanceTour(tour, { type: 'ticket-created' });
  expect(tourStep(tour)).toEqual({ path: '/settings/integrations', target: '[data-guide="github-integration"]', action: false });
  tour = advanceTour(tour, { type: 'next' });
  expect(tourStep(tour)?.path).toBe('/docs/tui');
  expect(tourStep(tour)?.target).toBe('[data-guide="tui-install"]');
  tour = advanceTour(tour, { type: 'next' });
  expect(tourStep(tour)?.path).toBe('/docs/mcp');
  expect(guideCovered(tour.completed)).toBe(false);
  tour = advanceTour(tour, { type: 'next' });
  expect(tour.stage).toBe('done');
  expect(tour.completed).toEqual([...CHAPTERS]);
  expect(guideCovered(tour.completed)).toBe(true);
});

test('an empty organization learns project creation before adding its first ticket', () => {
  let tour = startTour('ticket', null);
  expect(tour.chapters).toEqual(['project', 'ticket']);
  expect(tour.stage).toBe('project-new');
  tour = advanceTour(tour, { type: 'project-created', projectId });
  expect(tourStep(tour)?.path).toBe(`/projects/${projectId}`);
  expect(tour.stage).toBe('ticket-backlog'); // project creation already opens the project
});

test('closing either dialog returns to its opener without completing the chapter', () => {
  let project = advanceTour(startTour('project', null), { type: 'new-project' });
  project = advanceTour(project, { type: 'project-dialog-closed' });
  expect(project.stage).toBe('project-new');
  expect(project.completed).toEqual([]);
  let ticket = advanceTour(startTour('ticket', projectId), { type: 'project-opened', projectId });
  ticket = advanceTour(ticket, { type: 'backlog-tab' });
  ticket = advanceTour(ticket, { type: 'add-backlog' });
  ticket = advanceTour(ticket, { type: 'ticket-dialog-closed' });
  expect(ticket.stage).toBe('ticket-add');
  expect(ticket.completed).toEqual([]);
});

test('unrelated clicks, disabled controls, malformed IDs and stale success events cannot advance a tour', () => {
  const { window, doc } = browser('<button data-guide="new-project" disabled>New</button><a data-guide="project-card" data-project-id="../escape"><span>Bad project</span></a><button>Unrelated</button>');
  const actions: GuideAction[] = [];
  const off = listenForGuideActions(doc, (a) => actions.push(a));
  for (const el of doc.querySelectorAll('button,span')) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event);
  window.dispatchEvent(new window.CustomEvent(GUIDE_ACTION, { detail: { type: 'project-created', projectId: '../escape' } }));
  expect(actions).toEqual([]);
  const tour = startTour('github', projectId);
  expect(advanceTour(tour, { type: 'ticket-created' })).toBe(tour);
  expect(startTour('ticket', '../escape').projectId).toBeNull();
  off();
  doc.body.innerHTML = '<button data-guide="new-project">New</button>';
  doc.querySelector('button')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event);
  expect(actions).toEqual([]);
});

test('waits for asynchronously mounted visible controls, including disabled submit guidance', async () => {
  const { doc } = browser('<section hidden><button data-guide="add-backlog">Hidden</button></section>');
  const promise = waitForGuideTarget(doc, '[data-guide="add-backlog"]', new AbortController().signal, 1000);
  setTimeout(() => doc.querySelector('section')!.removeAttribute('hidden'), 5);
  const target = await promise;
  expect(target.textContent).toBe('Hidden');
  doc.body.innerHTML = '<button data-guide="backlog-submit" disabled>Save</button>';
  expect(await waitForGuideTarget(doc, '[data-guide="backlog-submit"]', new AbortController().signal)).toBe(doc.querySelector('button')!);
});

test('navigation cancellation and missing controls reject instead of silently skipping a step', async () => {
  const { doc } = browser();
  const controller = new AbortController();
  const waiting = waitForGuideTarget(doc, '[data-guide="backlog-title"]', controller.signal, 1000);
  controller.abort();
  await expect(waiting).rejects.toThrow('aborted');
  await expect(waitForGuideTarget(doc, '[data-guide="missing"]', new AbortController().signal, 5)).rejects.toThrow('target unavailable');
});
