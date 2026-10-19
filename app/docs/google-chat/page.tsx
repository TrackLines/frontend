import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';

export const metadata: Metadata = {
  title: 'Google Chat for you · TrackLin.es docs',
  description: 'Get your own TrackLin.es notifications as direct messages in Google Chat.',
};

// Google Chat, for one person: the TrackLin.es Chat app messages you directly (TL-289).
export default function GoogleChatDocs() {
  return (
    <Guide
      title="Google Chat for you"
      intro={<>The TrackLin.es app for Google Chat sends your own notifications to you as a direct message: when you’re assigned a ticket, mentioned, or something needs your review. Only you see them. For posts to a team space, see <Link href="/docs/google-chat-org" className="underline">Google Chat for your organization</Link>.</>}
    >
      <H2>Link your account</H2>
      <Steps>
        <li>In Google Chat, click <B>New chat</B> (or <B>+</B> next to Apps), search for <B>TrackLin.es</B>, and start a chat with it.</li>
        <li>Send it any message, e.g. “hi”. It replies with a <B>Link your TrackLin.es account</B> button.</li>
        <li>Click the button. It opens TrackLin.es; sign in if you need to, and you’ll see <B>You’re linked</B>. The app confirms in Chat too.</li>
      </Steps>
      <P>The link works once, for 30 minutes. If it has expired, send the app another message for a new one.</P>

      <H2>What you’ll get</H2>
      <Items>
        <li>The same notifications as your TrackLin.es inbox (assigned to you, mentions, reviews), each with an <B>Open</B> button that takes you to the ticket.</li>
        <li>Buttons to act without leaving Chat (they act as you, with your permissions):
          <Items>
            <li><B>Assigned to you:</B> Start (moves it to the board’s second column, usually In progress), Add comment, Make urgent.</li>
            <li><B>You were mentioned:</B> Reply, Make urgent.</li>
            <li><B>Needs your review:</B> Approve, or Send back with an optional reason.</li>
            <li><B>Sent back to you:</B> Add comment, Make urgent.</li>
          </Items>
          Add comment, Reply and Send back open a box in Chat to type into.
        </li>
        <li>Never your own actions: assigning yourself a ticket doesn’t message you.</li>
        <li>Your inbox and any push notifications carry on as before; Chat is an extra place to see them.</li>
      </Items>

      <H2>Check or stop it</H2>
      <Items>
        <li>Open <B>Your settings</B> from your account menu. The <B>Google Chat</B> card shows <B>Linked</B> or <B>Not linked</B>.</li>
        <li><B>Unlink</B> there stops the messages. Removing the app in Google Chat does the same.</li>
        <li>To link again later, message the app again.</li>
      </Items>

      <H2>Can’t find the app?</H2>
      <P>
        Your Google Workspace admin may not allow Chat apps yet. Ask them to allow TrackLin.es (see{' '}
        <Link href="/docs/google-chat-org" className="underline">Google Chat for your organization</Link>), or to install it for everyone.
      </P>
      <P>The app only sends you messages. It doesn’t read your chats, and it keeps nothing of what you write to it.</P>
    </Guide>
  );
}
