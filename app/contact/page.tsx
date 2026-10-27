import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/landing/contact-form';
import { OUR_REQUEST_FORM } from '@/lib/site/our-links';

export const metadata: Metadata = { title: 'Contact · TrackLin.es', description: 'Questions about TrackLin.es, billing, privacy or deleting your data.' };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Questions about TrackLin.es, billing, privacy, or getting a copy of or deleting your data? Send us a message and we&apos;ll get back to you.
        For product ideas and bugs, our <Link href={OUR_REQUEST_FORM} className="underline">request form</Link> goes straight to the team&apos;s board.
      </p>
      <ContactForm sourcePath="/contact" />
    </main>
  );
}
