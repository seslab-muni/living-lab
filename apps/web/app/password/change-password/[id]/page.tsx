import * as React from 'react';
import ChangePasswordClient from '../../../components/ChangePassword';

export default async function ChangePasswordPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <ChangePasswordClient id={id} />;
}
