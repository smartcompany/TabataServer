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
      <p>Admin dashboard runs from the <code>dashboard/</code> package.</p>
    </main>
  );
}
