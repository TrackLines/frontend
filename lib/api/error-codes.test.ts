import { expect, test } from 'bun:test';
import { errorFrom } from './.';

const res = (body: string, type: string, status = 409) => new Response(body, { status, headers: { 'content-type': type } });

test('a coded error reads in the page language; others keep the backend text (TL-558)', async () => {
  const coded = await errorFrom(res('{"code":"done_parent","error":"a done ticket can\'t take sub-tickets"}', 'application/json'), 'nl');
  expect(coded.code).toBe('done_parent');
  expect(coded.status).toBe(409);
  expect(coded.message).not.toContain('done ticket'); // Dutch now
  expect((await errorFrom(res('{"code":"done_parent","error":"x"}', 'application/json'), 'en')).message).toBe('a done ticket can’t get new sub-tickets; move it out of Done first'.replace('’', "'")); // the catalogue's English
  const unknown = await errorFrom(res('{"code":"brand_new","error":"something new"}', 'application/json'));
  expect([unknown.code, unknown.message]).toEqual(['brand_new', 'something new']);
  const plain = await errorFrom(res('not found', 'text/plain; charset=utf-8', 404));
  expect([plain.code, plain.message]).toEqual([undefined, 'not found']);
});
