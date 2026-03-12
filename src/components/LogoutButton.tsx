'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 transition hover:border-gray-400 hover:text-white"
    >
      Sign Out
    </button>
  );
}
