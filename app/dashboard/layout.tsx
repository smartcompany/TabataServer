import type { Metadata } from 'next';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Tabata 프로필 관리',
  description: '기본 운동 프로필 JSON 편집',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
