# Tabata Server

운동 프로필(Routine JSON) API와 관리자 대시보드입니다.

## 구조

```
server/                 # API (Next.js) — Vercel 프로젝트 1
  app/api/profiles/     # 공개 API (앱에서 다운로드)
  app/api/dashboard/    # 관리자 API (JWT 쿠키)
  data/profiles/        # 기본 프로필 JSON (읽기 전용 시드)

server/dashboard/       # 관리자 UI (Next.js) — Vercel 프로젝트 2
```

## 로컬 실행

### 1. API 서버

```bash
cd server
cp .env.example .env.local
# DASHBOARD_USERNAME, DASHBOARD_PASSWORD, DASHBOARD_SECRET 설정
npm install
npm run dev
```

API: http://localhost:3000

### 2. 대시보드

```bash
cd server/dashboard
npm install
npm run dev
```

대시보드: http://localhost:3001  
API URL은 `dashboard/lib/api-config.ts`에 고정되어 있습니다 (`https://tabata-server.vercel.app`). 로컬 API를 쓰려면 해당 파일만 바꾸면 됩니다.

## Vercel 배포

### API (`server/`)

1. Vercel에서 새 프로젝트 → Root Directory: `server`
2. 환경 변수:
   - `DASHBOARD_USERNAME`
   - `DASHBOARD_PASSWORD`
   - `DASHBOARD_SECRET` (긴 랜덤 문자열)
   - `DASHBOARD_ORIGIN` (대시보드 URL, CORS용)
   - `BLOB_READ_WRITE_TOKEN` (관리자 저장/삭제에 **필수**)

### Dashboard (`server/dashboard/`)

1. 별도 Vercel 프로젝트 → Root Directory: `server/dashboard`
2. 별도 env 없음 — API URL은 `lib/api-config.ts`에 하드코딩

API의 `DASHBOARD_ORIGIN`을 대시보드 URL과 맞춰 주세요.

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

```bash
flutter run
# 로컬 API 테스트 시:
# flutter run --dart-define=PROFILE_API_BASE_URL=http://localhost:3000
```

iOS 시뮬레이터 로컬: `http://localhost:3000`  
프로덕션 API: `https://tabata-server.vercel.app`
Android 에뮬레이터 로컬: `http://10.0.2.2:3000`

기본 프로필 JSON은 앱에 포함하지 않고 서버에서 매 실행 시 다운로드합니다. 사용자가 만든 루틴만 기기에 로컬 저장됩니다.
