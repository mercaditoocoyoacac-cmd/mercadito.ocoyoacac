import { redirect } from 'next/navigation';
import { getSession } from '@/server/session';
import { getUserRoles } from '@/server/requireUser';
import { prisma } from '@/server/prisma';
import InformesClient from '@/components/admin/InformesClient';

export const dynamic = 'force-dynamic';

export default async function InformesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/admin/login');
  const roles = getUserRoles(session);
  if (!roles.includes('ADMIN')) redirect('/admin/login');

  const stores = await prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  return <InformesClient stores={stores} />;
}
