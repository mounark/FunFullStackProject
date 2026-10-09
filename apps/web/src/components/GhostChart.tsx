/** A faded, made-up chart that previews what results look like. Decorative; carries no data. */
export function GhostChart() {
  return (
    <svg className="ghost" viewBox="0 0 720 200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ghost-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="area-stop-top" />
          <stop offset="1" className="area-stop-bottom" />
        </linearGradient>
      </defs>
      <path className="ghost-area" d="M0,110 C70,80 110,130 170,92 S270,34 330,70 S430,140 490,84 S610,26 720,52 L720,200 L0,200 Z" />
      <path className="ghost-line series-high" d="M0,110 C70,80 110,130 170,92 S270,34 330,70 S430,140 490,84 S610,26 720,52" />
      <path className="ghost-line series-low" d="M0,150 C70,125 110,168 170,136 S270,84 330,114 S430,172 490,128 S610,76 720,98" />
    </svg>
  );
}
