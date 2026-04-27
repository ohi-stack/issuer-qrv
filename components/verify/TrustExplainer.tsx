const cards = [
  { title: 'Authenticity', body: 'Every status is anchored to immutable registry checks.' },
  { title: 'Registry Lookup', body: 'Live lookup resolves current state for each QRV record.' },
  { title: 'Issuer Validation', body: 'Public issuer metadata is shown for trust verification.' },
  { title: 'Audit Trail', body: 'Checked timestamps and proof references support audits.' },
];

export function TrustExplainer() {
  return (
    <section>
      <h2>Why organizations trust QR-V™ verification</h2>
      <div className="trust-grid">
        {cards.map((card) => (
          <article key={card.title} className="trust-card">
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
