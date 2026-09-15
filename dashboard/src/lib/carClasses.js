const CLASS_COLORS = {
  GTP: 'var(--theme-fuchsia)',
  LMP2: 'var(--theme-violet)',
  GT1: 'var(--theme-pink)',
  GT2: 'var(--theme-cyan)',
  GT3: 'var(--theme-yellow)',
  GT4: '#5DCAA5',
  'Porsche Cup': '#F0997B',
  TCR: '#639922',
  'BMW M2': '#888780',
};

const FALLBACK_COLOR = '#888780';

export function classColor(carClass) {
  return CLASS_COLORS[carClass] ?? FALLBACK_COLOR;
}
