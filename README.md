# Tabata Server

운동 프로필(Routine JSON) API + 관리자 대시보드 (단일 Next.js 앱)

## 구조

```
server/
  app/api/profiles/     # 공개 API (앱에서 다운로드)
  app/api/dashboard/    # 관리자 API (JWT 쿠키)
  app/dashboard/        # 관리자 UI → /dashboard
  data/profiles/        # 기본 프로필 JSON (읽기 전용 시드)
```

## 로컬 실행

```bash
cd server
cp .env.example .env.local
# DASHBOARD_USERNAME, DASHBOARD_PASSWORD_HASH, DASHBOARD_SECRET 설정
npm install
npm run hash-dashboard-password -- 'your-password'   # 해시 생성
npm run dev
```

- API: http://localhost:3000/api/profiles
- 대시보드: http://localhost:3000/dashboard

## Vercel 배포

Root Directory: `server`

환경 변수:

- `DASHBOARD_USERNAME`
- `DASHBOARD_PASSWORD_HASH` (`npm run hash-dashboard-password -- 'your-password'` → `salt.digest` hex, `$` 없음)
- `DASHBOARD_SECRET` (긴 랜덤 문자열)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (향후 클라이언트 연동용, 서버 API는 미사용)
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase에 `supabase/schema.sql` 실행 후, `data/profiles/` 시드 JSON을 테이블에 넣으면 됩니다.

프로덕션:

- API: https://tabata-server.vercel.app/api/profiles
- 대시보드: https://tabata-server.vercel.app/dashboard

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/profiles` | 프로필 목록 (요약) |
| GET | `/api/profiles/:id` | 프로필 JSON 전체 |
| POST | `/api/dashboard/login` | 관리자 로그인 (`token` 반환) |
| POST | `/api/dashboard/profiles/upsert` | 관리자: upsert (Bearer 토큰) |
| GET | `/api/dashboard/profiles` | 관리자: 전체 목록 |
| PUT | `/api/dashboard/profiles/:id` | 관리자: 저장 |
| POST | `/api/dashboard/profiles/create` | 관리자: 생성 |
| DELETE | `/api/dashboard/profiles/:id` | 관리자: 삭제 |

## 저장소 (Supabase)

공식 카탈로그 루틴은 **Postgres 테이블 `tabata_routine_profiles`** 에 저장합니다.

| 컬럼 | 설명 |
|------|------|
| `id` | 고유 ID (`data.id`와 동일, 갱신/삭제 키) |
| `data` | 루틴 JSON 전체 (title, description 등 포함) |
| `owner_id` | 소유자 (`admin` = 관리자 카탈로그) |
| `updated_at` | 수정 시각 |

- `owner_id = 'admin'` → 공식 카탈로그 (앱 다운로드 대상)
- `owner_id` = 사용자 ID → 향후 사용자 공유 루틴

스키마: `server/supabase/schema.sql`

## Flutter 앱

기본 API URL: `https://tabata-server.vercel.app` (`client/lib/config/api_config.dart`)

```bash
flutter run
```

기본 프로필은 서버에서 다운로드합니다. 사용자가 만든 루틴만 기기에 로컬 저장됩니다.
