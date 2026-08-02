import { useEffect, useRef, useState } from 'react';

export function ColorSwatch({ name, containerRef }) {
  const swatchRef = useRef(null);
  const [resolved, setResolved] = useState('');

  useEffect(() => {
    const el = swatchRef.current;
    const container = containerRef?.current;
    if (!el || !container) return;
    const containerStyle = getComputedStyle(container);
    const value = containerStyle.getPropertyValue(name).trim();
    el.style.backgroundColor = `var(${name})`;
    setResolved(getComputedStyle(el).backgroundColor || value);
  }, [name, containerRef]);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-2">
      <div
        ref={swatchRef}
        className="h-10 w-10 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: `var(${name})` }}
      />
      <div className="min-w-0">
        <div className="truncate font-mono text-xs font-medium text-foreground">{name}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{resolved}</div>
      </div>
    </div>
  );
}
