import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';
import { CHAT_KINDS } from '@/lib/google-chat';
import { serverI18n } from '@/lib/server-i18n';

export const metadata: Metadata = {
  title: 'Google Chat for your organization · TrackLin.es docs',
  description: 'Post your team’s TrackLin.es activity into a Google Chat space, and let people get personal notifications in Chat.',
};

// Google Chat, for an organization admin: team spaces (webhooks) and allowing the Chat app.
export default async function GoogleChatOrgDocs() {
  const i18n = await serverI18n();
  return (
    <Guide
      title="Google Chat for your organization"
      intro={<>TrackLin.es can post your team’s activity into a Google Chat space (“Ava created TL-12 on Backend”), for the whole organization or for one project. Separately, each person can get their own notifications from the TrackLin.es Chat app (<Link href="/docs/google-chat" className="underline">Google Chat for you</Link>). You need to be an organization admin in TrackLin.es to set up spaces.</>}
    >
      <H2>1. Allow webhooks in Google Workspace</H2>
      <P>
        Once, as a Google Workspace admin: in admin.google.com, open <B>Apps → Google Workspace → Google Chat</B>, then the
        Chat apps settings, and check <B>Allow users to add and use incoming webhooks</B> is on. It’s on for most
        organizations; if you can’t see Webhooks in the next step, this is why.
      </P>

      <H2>2. Add a webhook to a space</H2>
      <Steps>
        <li>In Google Chat, open (or create) the space the posts should go to. Webhooks work in spaces, not direct messages.</li>
        <li>Click the space’s name → <B>Apps &amp; integrations</B> → <B>Webhooks</B> → <B>Add webhook</B>.</li>
        <li>Name it <B>TrackLin.es</B>. For the avatar, paste the <B>Avatar URL</B> shown in TrackLin.es’s Google Chat settings (it has a Copy button), so posts show our logo.</li>
        <li>Save, and copy the webhook URL (it starts <code>https://chat.googleapis.com/</code>). Treat it like a password: anyone with it can post into the space.</li>
      </Steps>

      <H2>3. Connect it in TrackLin.es</H2>
      <Items>
        <li><B>For every project:</B> Organization settings → <B>Integrations</B> → <B>Google Chat</B>.</li>
        <li><B>For one project:</B> the project’s <B>Edit project</B> page → <B>Google Chat</B>. Its events go to that space, so each team can have its own.</li>
      </Items>
      <P>
        Paste the webhook URL, choose what to post, and click <B>Save</B>, then <B>Send test message</B> to check it arrives.
        The URL is stored encrypted and never shown again; paste a new one to replace it, or <B>Remove</B> to stop posting.
        Only Google Chat webhook URLs are accepted.
      </P>

      <H2>What can be posted</H2>
      <Items>
        {CHAT_KINDS.map((k) => <li key={k.kind}>{i18n._(k.label)}</li>)}
      </Items>
      <P>
        Each post has an <B>Open</B> button to the ticket. Space posts come through a webhook, so that’s their only button; the
        Chat app’s personal messages also have buttons to act (<Link href="/docs/google-chat" className="underline">Google Chat for you</Link>). Mentions are never posted to a space, since they’re personal: people
        get those from the Chat app, in their inbox, or as push notifications.
      </P>

      <H2>Personal messages: the TrackLin.es Chat app</H2>
      <P>
        Nothing to set up in TrackLin.es: each person adds the app and links their own account
        (<Link href="/docs/google-chat" className="underline">how</Link>). In your Google Workspace you may need to allow it:
      </P>
      <Items>
        <li>In admin.google.com, check <B>Apps → Google Workspace → Google Chat</B> lets people install Chat apps, and that the Google Workspace Marketplace settings allow TrackLin.es.</li>
        <li>Or install it for everyone from the Marketplace, so people only have to message it and click the link.</li>
      </Items>
      <P>The app only sends messages. It stores each person’s Google user ID and the ID of their chat with it, never message content, and forgets both when they unlink or remove it.</P>
    </Guide>
  );
}
