import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Code, Guide, H2, Items, P, Steps } from '@/components/docs/prose';
import { WEBHOOK_EVENTS } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Webhooks · TrackLin.es docs',
  description: 'Send TrackLin.es events to your own tools: the events, the payload, signatures and retries.',
};

// what each event is for (the payload's data is the thing as the API returns it)
export const EVENT_NOTES: Record<(typeof WEBHOOK_EVENTS)[number], string> = {
  'ticket.created': 'a ticket was made, on a board or in the backlog',
  'ticket.updated': 'its title, description, type, priority, labels, estimate, timebox or due date changed',
  'ticket.moved': 'it moved column or board, or went to the backlog (from_column_id, to_column_id)',
  'ticket.assigned': 'it was assigned, claimed or unassigned',
  'ticket.done': 'it reached Done, or was closed as done or won’t do',
  'ticket.deleted': 'it went to the bin',
  'comment.created': 'someone commented on a ticket',
  'sprint.started': 'a board’s sprint started',
  'sprint.closed': 'a sprint closed, by hand or automatically',
  'roadmap.update_published': 'a roadmap update (health and note) was posted',
};

export const VERIFY_NODE = `import { createHmac, timingSafeEqual } from 'node:crypto';

// req.rawBody: the request body exactly as received (not re-serialised JSON)
export function verify(header, rawBody, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSeconds) return false; // too old: a replay
  const expected = createHmac('sha256', secret).update(\`\${parts.t}.\${rawBody}\`).digest('hex');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 ?? ''));
}`;

export const VERIFY_GO = `func verify(header string, body []byte, secret string) bool {
	var t, v1 string
	for _, p := range strings.Split(header, ",") {
		k, v, _ := strings.Cut(p, "=")
		switch k {
		case "t":
			t = v
		case "v1":
			v1 = v
		}
	}
	ts, err := strconv.ParseInt(t, 10, 64)
	if err != nil || math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		return false // too old: a replay
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(t + "." + string(body)))
	return hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(v1))
}`;

// Webhooks (TL-636): what's sent, when, how to check it's really from us, and what happens on failure.
export default function WebhooksDocs() {
  return (
    <Guide
      title="Webhooks"
      intro={<>Webhooks send what happens in TrackLin.es to your own tools as it happens: a ticket moving, a comment, a sprint starting. Organization admins set them up in <Link href="/settings/webhooks" className="underline">Settings → Webhooks</Link>, on the Pro and Enterprise plans.</>}
    >
      <H2>Set one up</H2>
      <Steps>
        <li>In <B>Settings → Webhooks</B>, enter your endpoint’s address. It must be <code>https</code>, and reachable from the internet.</li>
        <li>Pick the events to send.</li>
        <li>Copy the <B>signing secret</B>. It’s shown once; <B>New secret</B> makes another (the old one stops working).</li>
        <li><B>Send a test</B> posts a <code>ping</code> event, and <B>Deliveries</B> shows what was sent and what your endpoint answered.</li>
      </Steps>
      <P>An organization can have up to 10 webhooks.</P>

      <H2>Events</H2>
      <Items>
        {WEBHOOK_EVENTS.map((e) => <li key={e}><code>{e}</code>: {EVENT_NOTES[e]}.</li>)}
      </Items>

      <H2>What’s sent</H2>
      <P>A <code>POST</code> with a JSON body:</P>
      <Code>{`{
  "id": "delivery id",
  "event": "ticket.moved",
  "created_at": "2026-10-25T14:02:00Z",
  "data": { "ticket": { "key": "TL-123", "title": "…", … }, "from_column_id": "…", "to_column_id": "…" }
}`}</Code>
      <P>A ticket is sent as the <Link href="/docs/api" className="underline">API</Link> returns it. Headers: <code>TrackLines-Event</code>, <code>TrackLines-Delivery</code> (the id, the same on a retry) and <code>TrackLines-Signature</code>. Answer with any <code>2xx</code> within 10 seconds; do slow work after answering.</P>

      <H2>Check the signature</H2>
      <P><code>TrackLines-Signature: t=&lt;unix time&gt;,v1=&lt;signature&gt;</code>. The signature is the hex HMAC-SHA256 of <code>&lt;t&gt;.&lt;the raw body&gt;</code>, keyed with your signing secret. Recompute it, compare in constant time, and refuse old timestamps so a captured request can’t be replayed.</P>
      <Code>{VERIFY_NODE}</Code>
      <Code>{VERIFY_GO}</Code>

      <H2>Retries</H2>
      <Items>
        <li>Anything but a <code>2xx</code> (or no answer in 10 seconds) is retried after 1 minute, 5 minutes, 30 minutes, 2 hours and 12 hours.</li>
        <li>The same delivery id is sent each time, so you can ignore one you’ve already handled.</li>
        <li>After 5 failures in a row the webhook is turned off and your organization’s admins are told. Turn it back on once the endpoint is fixed; <B>Send again</B> resends any delivery.</li>
        <li>Deliveries are kept for 30 days.</li>
      </Items>
    </Guide>
  );
}
