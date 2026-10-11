import type { Reading } from '../types';

/** Renders a device reading honestly: the value if it was really read, otherwise why it is missing. */
export function ReadingValue<T>({
  reading,
  format = String,
  mono = true,
}: {
  reading: Reading<T> | undefined | null;
  format?: (v: T) => string;
  mono?: boolean;
}) {
  if (!reading) {
    return <span className="text-zinc-600">—</span>;
  }
  if (reading.status === 'ok') {
    return <span className={mono ? 'font-mono text-zinc-100' : 'text-zinc-100'}>{format(reading.value)}</span>;
  }
  return (
    <span className="italic text-zinc-500" title={reading.reason}>
      {reading.status === 'not_supported' ? 'Not supported' : 'Unavailable'}
    </span>
  );
}
