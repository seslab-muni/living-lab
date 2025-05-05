import * as React from 'react';
import ChangePasswordClient from '../../../../components/ChangePassword';

export default async function ChangePassword({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <ChangePasswordClient id={id} />;
}
