import * as React from 'react';
import VerifyEmailClient from '../../../components/VerifyEmailClient';

export default async function VerifyEmailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <VerifyEmailClient id={id} />;
}
