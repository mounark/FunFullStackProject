/** Placeholder shaped like the results, so the page doesn't jump when the data arrives. */
export function LoadingSkeleton({ symbol }: { symbol: string }) {
  return (
    <div role="status">
      <span className="visually-hidden">Loading {symbol}…</span>
      <div aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="tiles">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-tile" />
          ))}
        </div>
        <div className="skeleton skeleton-chart" />
      </div>
    </div>
  );
}
