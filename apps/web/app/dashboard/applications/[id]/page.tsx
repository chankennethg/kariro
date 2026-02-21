import React from 'react';
import { ApplicationDetailPage } from '@/components/applications/application-detail-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationDetailPage applicationId={id} />;
}
