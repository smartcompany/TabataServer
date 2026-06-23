export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>Tabata Profile API</h1>
      <p>Public endpoints:</p>
      <ul>
        <li>
          <code>GET /api/profiles</code> — profile list
        </li>
        <li>
          <code>GET /api/profiles/:id</code> — profile JSON
        </li>
      </ul>
      <p>
        <a href="/dashboard">관리자 대시보드 (/dashboard)</a>
      </p>
    </main>
  );
}
