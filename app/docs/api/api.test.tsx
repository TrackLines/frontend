import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiReference, groups, SPEC_URL, typeOf, type Spec } from './page';
import TuiDocs, { keys, TUI_REPO } from '../tui/page';

const spec: Spec = {
  info: { description: 'API keys are **bearer** tokens.' },
  tags: [{ name: 'Tickets', description: 'Work items.' }, { name: 'Boards' }, { name: 'Unused' }],
  paths: {
    '/tickets/{id}': {
      parameters: [{ $ref: '#/components/parameters/ID' }],
      get: { tags: ['Tickets'], summary: 'Get a ticket', responses: { '200': { description: 'The ticket.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } }, '404': { $ref: '#/components/responses/NotFound' } } },
      patch: { tags: ['Tickets'], summary: 'Edit a ticket', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } }, responses: {} },
    },
    '/boards': { get: { tags: ['Boards'], summary: 'List boards', responses: { '200': { description: 'Boards.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Board' } } } } } } } },
    '/openapi.yaml': { get: { summary: 'This description', security: [], responses: {} } },
  },
  components: {
    parameters: { ID: { name: 'id', in: 'path', required: true, description: 'Its key or UUID.', schema: { type: 'string' } } },
    responses: { NotFound: { description: 'No such ticket.' } },
    schemas: { Ticket: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, priority: { type: 'string', enum: ['low', 'high'] } } }, Board: { type: 'object' } },
  },
};

test('endpoints are grouped by area in the spec’s order, untagged ones last, empty areas left out', () => {
  const g = groups(spec);
  expect(g.map((a) => a.name)).toEqual(['Tickets', 'Boards', 'Other']);
  expect(g[0].ops.map((o) => o.method)).toEqual(['get', 'patch']);
});

test('types read in a few words', () => {
  expect(typeOf({ $ref: '#/components/schemas/Ticket' })).toBe('Ticket');
  expect(typeOf({ type: 'array', items: { $ref: '#/components/schemas/Board' } })).toBe('Board[]');
  expect(typeOf({ type: 'string', enum: ['low', 'high'] })).toBe('string (low | high)');
  expect(typeOf({ oneOf: [{ type: 'string' }, { type: 'integer' }] })).toBe('string | integer');
});

test('the reference: how to authenticate, every endpoint with shared and $ref parts resolved, and the schemas', () => {
  const html = renderToStaticMarkup(<ApiReference spec={spec} />);
  expect(html).toContain('Authorization: Bearer tl_');
  expect(html).toContain('read-only');
  expect(html).toContain(`href="${SPEC_URL}"`);
  expect(html).toContain('<strong>bearer</strong>'); // the spec's own description, as Markdown
  expect(html).toContain('Get a ticket');
  expect(html).toContain('Its key or UUID.'); // a path-level $ref parameter
  expect(html).toContain('No such ticket.'); // a $ref response
  expect(html).toContain('href="#schema-Ticket"');
  expect(html).toContain('href="#schema-Board"'); // an array of a schema links to it
  expect(html).toContain('id="schema-Ticket"');
  expect(html).toContain('string (low | high)');
  expect(html).toContain('(public)');
  expect(html).toContain('href="#tickets"');
  expect(html).not.toContain('Unused');
});

test('the terminal app guide: install from releases, the key, its keys and config', () => {
  const html = renderToStaticMarkup(<TuiDocs />);
  expect(html).toContain(`${TUI_REPO}/releases`);
  for (const build of ['tracklines-linux-amd64', 'tracklines-linux-arm64', 'tracklines-darwin-arm64', 'tracklines-darwin-amd64']) expect(html).toContain(build);
  expect(html).toContain('tl_p_');
  expect(html).toContain('href="/account/api-keys"');
  for (const k of keys) expect(html).toContain(k.where);
  for (const setting of ['keys = vim', 'backlog_sort', 'update_check', 'reports = on']) expect(html).toContain(setting);
});
