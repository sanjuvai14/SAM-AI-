export default function Home() {
  return (
    <main className="shell">
      <section className="card">
        <div className="badge">SAM • PRIVATE AI</div>
        <h1>SAM</h1>
        <p className="lead">Your private AI assistant workspace is online.</p>
        <div className="status">
          <span className="dot" aria-hidden="true" />
          <span>Production build ready</span>
        </div>
        <p className="note">
          AI provider configuration is kept server-side. Connect the remaining external
          services only when their credentials are available.
        </p>
      </section>
    </main>
  );
}
