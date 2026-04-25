export default function Loading() {
  return (
    <main className="page-wrap">
      <section className="verify-card" aria-busy="true" aria-live="polite">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-message" />
        <div className="fields-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="data-field" key={index}>
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-value" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
