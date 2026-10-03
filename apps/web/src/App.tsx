/** Segnaposto: il gioco arriva nello step 4. Serve a verificare build e deploy. */
export function App() {
  return (
    <main className="splash">
      <svg className="splash__logo" viewBox="0 0 32 32" aria-hidden>
        <circle cx="12" cy="13" r="9" fill="#ff5c93" fillOpacity=".85" />
        <circle cx="20" cy="13" r="9" fill="#4cc9f0" fillOpacity=".85" />
        <circle cx="16" cy="21" r="9" fill="#9b7bff" fillOpacity=".85" />
      </svg>
      <h1>
        Tutti<span>Alcuni</span>
      </h1>
      <p>Il puzzle di ogni giorno sugli insiemi. In arrivo.</p>
    </main>
  );
}
