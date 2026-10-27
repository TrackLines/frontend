import type { Metadata } from 'next';
import Link from 'next/link';
import { Markdown } from '@/components/common/markdown';
import { B, Guide, H2, Items, P } from '@/components/docs/prose';

export const metadata: Metadata = {
  title: 'API · TrackLin.es docs',
  description: 'The TrackLin.es HTTP API: authentication with API keys, and every endpoint.',
};

// SPEC_URL: the API's own description, served by the API so it always matches what's running (TL-484).
export const SPEC_URL = 'https://api.tracklin.es/api/openapi.yaml';

type Ref = { $ref?: string };
type Schema = Ref & { type?: string | string[]; description?: string; properties?: Record<string, Schema>; required?: string[]; items?: Schema; enum?: unknown[]; oneOf?: Schema[]; anyOf?: Schema[]; allOf?: Schema[] };
type Param = Ref & { name?: string; in?: string; required?: boolean; description?: string; schema?: Schema };
type Content = Record<string, { schema?: Schema }>;
type Operation = { tags?: string[]; summary?: string; description?: string; security?: unknown[]; parameters?: Param[]; requestBody?: Ref & { content?: Content }; responses?: Record<string, Ref & { description?: string; content?: Content }> };
export type Spec = {
  info?: { description?: string };
  tags?: { name: string; description?: string }[];
  paths?: Record<string, Record<string, Operation | Param[]>>;
  components?: { schemas?: Record<string, Schema>; parameters?: Record<string, Param>; responses?: Record<string, { description?: string; content?: Content }> };
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// deref follows a local $ref (#/components/…) to what it names.
function deref<T extends Ref>(spec: Spec, v: T): T {
  if (!v?.$ref?.startsWith('#/')) return v;
  let at: unknown = spec;
  for (const part of v.$ref.slice(2).split('/')) at = (at as Record<string, unknown>)?.[part];
  return (at ?? v) as T;
}

const refName = (ref: string) => ref.split('/').pop() ?? ref;

// typeOf is a schema in a few words: "Ticket", "Ticket[]", "string (todo | done)".
export function typeOf(s?: Schema): string {
  if (!s) return '';
  if (s.$ref) return refName(s.$ref);
  if (s.items) return `${typeOf(s.items)}[]`;
  const alt = s.oneOf ?? s.anyOf ?? s.allOf;
  if (alt) return alt.map(typeOf).join(s.allOf ? ' & ' : ' | ');
  const t = Array.isArray(s.type) ? s.type.join(' | ') : (s.type ?? 'object');
  return s.enum ? `${t} (${s.enum.join(' | ')})` : t;
}

function TypeLink({ schema }: { schema?: Schema }) {
  const target = schema?.$ref ?? schema?.items?.$ref;
  const text = typeOf(schema);
  return target ? <a href={`#schema-${refName(target)}`} className="font-mono text-xs underline">{text}</a> : <span className="font-mono text-xs">{text}</span>;
}

const bodySchema = (c?: Content) => (c ? Object.values(c)[0]?.schema : undefined);

// groups is each tag (in the spec's order, then any others) with its operations.
export function groups(spec: Spec) {
  const byTag = new Map<string, { method: string; path: string; op: Operation; shared: Param[] }[]>();
  for (const t of spec.tags ?? []) byTag.set(t.name, []);
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const shared = (item.parameters as Param[] | undefined) ?? [];
    for (const method of METHODS) {
      const op = item[method] as Operation | undefined;
      if (!op) continue;
      const tag = op.tags?.[0] ?? 'Other';
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push({ method, path, op, shared });
    }
  }
  return [...byTag].filter(([, ops]) => ops.length).map(([name, ops]) => ({ name, description: spec.tags?.find((t) => t.name === name)?.description, ops }));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// ApiReference renders the spec: how to authenticate, then every endpoint by area, then the schemas.
export function ApiReference({ spec }: { spec: Spec }) {
  const areas = groups(spec);
  const schemas = Object.entries(spec.components?.schemas ?? {});
  return (
    <>
      <H2>Authentication</H2>
      <P>Send an API key as a bearer token: <code>Authorization: Bearer tl_…</code>. Personal and agent keys are yours: make them in <Link href="/account/api-keys" className="underline">Your settings → API keys</Link>. Service keys belong to the organization, and its admins make them in the organization’s settings.</P>
      <Items>
        <li><B>Personal keys</B> (<code>tl_p_…</code>) are you: you see and change what you can in the web app, and what they change is recorded as you.</li>
        <li><B>Agent keys</B> (<code>tl_ai_…</code>) are your AI agent, working alongside you: they can be assigned tickets, and their work is recorded as the agent. Others see it with your name (<B>Claude (you)</B>).</li>
        <li><B>Service keys</B> (<code>tl_s_…</code>) belong to the organization, for scripts and integrations such as Bugfixes, and their writes carry the key’s name. Everyone in the organization sees each one’s name, the first few characters of the key, when it was last used and when it expires; the key itself is shown once, when it’s made.</li>
        <li>A <B>read-only</B> key gets <code>403</code> for anything but <code>GET</code>. Keys expire; their expiry shows next to them.</li>
        <li>Each key has a per-minute limit, in every response’s <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Remaining</code>. Over it: <code>429</code> with <code>Retry-After</code>.</li>
        <li>Times are UTC. Send <code>Tracklines-Timezone: Europe/London</code> (any IANA zone) for day-based rules, such as a sprint’s last day, to use your day.</li>
      </Items>
      <P>The API’s description, for code generators and API clients: <a href={SPEC_URL} className="underline">openapi.yaml</a> (also <a href={SPEC_URL.replace('.yaml', '.json')} className="underline">as JSON</a>). Base URL: <code>https://api.tracklin.es/api</code>.</P>

      {spec.info?.description && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">The details, from the API’s description</summary>
          <div className="mt-2"><Markdown>{spec.info.description}</Markdown></div>
        </details>
      )}

      <H2>Endpoints</H2>
      <nav aria-label="Areas" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {areas.map((a) => <a key={a.name} href={`#${slug(a.name)}`} className="underline">{a.name}</a>)}
        {schemas.length > 0 && <a href="#schemas" className="underline">Schemas</a>}
      </nav>
      {areas.map((a) => (
        <section key={a.name} id={slug(a.name)} className="mt-8 scroll-mt-20">
          <h3 className="text-lg font-semibold">{a.name}</h3>
          {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
          <div className="mt-2 grid gap-1">
            {a.ops.map(({ method, path, op, shared }) => {
              const params = [...shared, ...(op.parameters ?? [])].map((p) => deref(spec, p));
              const body = op.requestBody && deref(spec, op.requestBody);
              return (
                <details key={method + path} className="rounded-md border px-3 py-2 text-sm">
                  <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2">
                    <span className="w-14 font-mono text-xs font-semibold uppercase">{method}</span>
                    <code className="break-all">{path}</code>
                    <span className="text-muted-foreground">{op.summary}</span>
                    {op.security?.length === 0 && <span className="text-xs text-muted-foreground">(public)</span>}
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {op.description && <Markdown>{op.description}</Markdown>}
                    {params.length > 0 && (
                      <div>
                        <div className="font-medium">Parameters</div>
                        <ul className="mt-1 grid gap-1">
                          {params.map((p) => (
                            <li key={`${p.in}-${p.name}`}><code>{p.name}</code> <span className="text-xs text-muted-foreground">{p.in}{p.required ? ', required' : ''}</span> <TypeLink schema={p.schema} />{p.description && <span className="text-muted-foreground"> · {p.description}</span>}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {body && <div><span className="font-medium">Body</span> <TypeLink schema={bodySchema(body.content)} /></div>}
                    <div>
                      <div className="font-medium">Responses</div>
                      <ul className="mt-1 grid gap-1">
                        {Object.entries(op.responses ?? {}).map(([code, r]) => {
                          const res = deref(spec, r);
                          const schema = bodySchema(res.content);
                          return <li key={code}><code>{code}</code> <span className="text-muted-foreground">{res.description}</span> {schema && <TypeLink schema={schema} />}</li>;
                        })}
                      </ul>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}

      {schemas.length > 0 && (
        <section id="schemas" className="mt-10 scroll-mt-20">
          <H2>Schemas</H2>
          <div className="mt-2 grid gap-1">
            {schemas.map(([name, s]) => (
              <details key={name} id={`schema-${name}`} className="scroll-mt-20 rounded-md border px-3 py-2 text-sm">
                <summary className="cursor-pointer font-mono">{name}</summary>
                {s.description && <p className="mt-1 text-muted-foreground">{s.description}</p>}
                <ul className="mt-2 grid gap-1">
                  {Object.entries(s.properties ?? {}).map(([prop, ps]) => (
                    <li key={prop}><code>{prop}</code>{s.required?.includes(prop) ? <span className="text-xs text-muted-foreground"> required</span> : null} <TypeLink schema={ps} />{ps.description && <span className="text-muted-foreground"> · {ps.description}</span>}</li>
                  ))}
                  {!s.properties && <li><TypeLink schema={s} /></li>}
                </ul>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// loadSpec reads the description from the API, refreshed hourly; null when the API can't be reached.
async function loadSpec(): Promise<Spec | null> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL ?? 'http://localhost:8080'}/api/openapi.json`, { next: { revalidate: 3600 } });
    return res.ok ? ((await res.json()) as Spec) : null;
  } catch {
    return null;
  }
}

// The API reference: public, generated from the API's own description (TL-484).
export default async function ApiDocs() {
  const spec = await loadSpec();
  return (
    <Guide title="API" intro={<>Everything the web app does goes through this HTTP API, so you can script it too: create and move tickets, read boards and sprints, run reports. It’s the API the <Link href="/docs/tui" className="underline">terminal app</Link> and <Link href="/docs/mcp" className="underline">AI agents</Link> use.</>}>
      {spec ? <ApiReference spec={spec} /> : <P>The reference couldn’t be loaded just now. The API’s description is at <a href={SPEC_URL} className="underline">{SPEC_URL}</a>.</P>}
    </Guide>
  );
}
