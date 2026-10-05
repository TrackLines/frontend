import { redirect } from 'next/navigation';

// Boards live inside projects now; the projects list is the signed-in home.
export default function BoardsIndex() {
  redirect('/dashboard');
}
