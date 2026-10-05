import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { buttonVariants } from '@/components/ui/button';
import styles from './page.module.css';

export default async function Dashboard() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/dashboard');

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Your boards and roadmaps are ready.</p>
        <Link href="/roadmaps" className={buttonVariants()}>
          Go to roadmaps
        </Link>
      </div>
    </div>
  );
}
