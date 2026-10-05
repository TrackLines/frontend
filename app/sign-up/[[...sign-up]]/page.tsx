import { SignUp } from '@clerk/nextjs';

export const metadata = { title: 'Create account | Tracklines' };

type PageProps = { searchParams: Promise<{ redirect_url?: string | string[] }> };

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirect_url);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <SignUp
        path="/sign-up"
        routing="path"
        forceRedirectUrl={redirectTo}
        signInUrl={`/sign-in?redirect_url=${encodeURIComponent(redirectTo)}`}
      />
    </main>
  );
}

function safeRedirect(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}
