import { Segmented } from '@/components/ui/Segmented';
import { RANGE_OPTIONS } from './ranges';

const options = RANGE_OPTIONS.map((days) => ({ value: days as number, label: `Last ${days} days` }));

export function RangePicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return <Segmented label="Date range" value={value} onChange={onChange} options={options} />;
}
