const CLASS_COLORS = {
  GTP: 'var(--murder-fuchsia)',
  LMP2: 'var(--murder-violet)',
  GT1: 'var(--murder-pink)',
  GT2: 'var(--murder-cyan)',
  GT3: 'var(--murder-yellow)',
  GT4: '#5DCAA5',
  'Porsche Cup': '#F0997B',
  TCR: '#639922',
  'BMW M2': '#888780',
};

const FALLBACK_COLOR = '#888780';

export function classColor(carClass) {
  return CLASS_COLORS[carClass] ?? FALLBACK_COLOR;
}
