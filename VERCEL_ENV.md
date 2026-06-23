# Vercel 환경 변수 설정

`Dashboard login not configured` (503) = **프로덕션에 로그인 env가 없음**  
`.env.local`은 Git/Vercel에 올라가지 않습니다. 아래를 **Vercel 대시보드**에 직접 넣어야 합니다.

## 1. Vercel에서 설정

[tabata-server](https://vercel.com) → **Settings** → **Environment Variables**

| Name | Environment | 값 |
|------|-------------|-----|
| `DASHBOARD_USERNAME` | Production (Preview도 권장) | `gunnylove@gmail.com` |
| `DASHBOARD_PASSWORD_HASH` | Production | `.env.local`의 해시 한 줄 전체 |
| `DASHBOARD_SECRET` | Production | `.env.local`의 시크릿 |
| `BLOB_READ_WRITE_TOKEN` | Production | (프로필 저장 시) Vercel Storage → Blob |

로컬 값 확인:

```bash
cat server/.env.local
```

## 2. 재배포

Environment Variables 저장 후 **Deployments** → 최신 배포 **Redeploy** (또는 `main`에 push).

환경 변수는 **배포 이후** 적용되므로, 넣은 뒤 반드시 재배포하세요.

## 3. 확인

- https://tabata-server.vercel.app/dashboard
- 이메일 + 비밀번호 로그인
- 503이면 Vercel **Functions** 로그에서 `hasUsername` / `hasPasswordHash` 확인

## 주의

- `DASHBOARD_PASSWORD_HASH`는 `salt.digest` 형식 (hex + `.` 만, 따옴표 없이 붙여넣기)
- `DASHBOARD_SECRET`의 `+` 문자는 Vercel UI에 **그대로** 붙여넣기 (따옴표로 감싸지 않기)
