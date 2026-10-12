import { safeRedirect } from '@/lib/safe-redirect';
import { SignIn } from '@clerk/nextjs';

export const metadata = { title: 'Sign in | Tracklines' };

type PageProps = { searchParams: Promise<{ redirect_url?: string | string[] }> };

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirect_url);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <SignIn
        path="/sign-in"
        routing="path"
        forceRedirectUrl={redirectTo}
        signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(redirectTo)}`}
      />
    </main>
  );
}

