import { redirect } from 'next/navigation';

/**
 * middleware 가 `/` → `/applink` 처리.
 * middleware 미적용 환경 폴백.
 */
export default function HomePage() {
  redirect('/applink');
}
