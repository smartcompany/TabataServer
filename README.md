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
- `BLOB_READ_WRITE_TOKEN` (관리자 저장/삭제에 **필수**)

프로덕션:

- API: https://tabata-server.vercel.app/api/profiles
- 대시보드: https://tabata-server.vercel.app/dashboard

## API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/profiles` | 프로필 목록 (요약) |
| GET | `/api/profiles/:id` | 프로필 JSON 전체 |
| POST | `/api/dashboard/login` | 관리자 로그인 |
| GET | `/api/dashboard/profiles` | 관리자: 전체 목록 |
| PUT | `/api/dashboard/profiles/:id` | 관리자: 저장 |
| POST | `/api/dashboard/profiles/create` | 관리자: 생성 |
| DELETE | `/api/dashboard/profiles/:id` | 관리자: 삭제 |

## Flutter 앱

기본 API URL: `https://tabata-server.vercel.app` (`client/lib/config/api_config.dart`)

```bash
flutter run
```

기본 프로필은 서버에서 다운로드합니다. 사용자가 만든 루틴만 기기에 로컬 저장됩니다.
