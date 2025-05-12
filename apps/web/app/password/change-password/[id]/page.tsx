import ChangePasswordClient from '../../../components/ChangePassword';

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChangePasswordClient id={id} />;
}
