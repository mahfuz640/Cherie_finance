import { ArrowUpRight } from 'lucide-react';

const ACTIONS = [['sale', 'Record sale'], ['stock', 'Add stock'], ['expense', 'Add expense'], ['loan', 'Add loan'], ['loan_payment', 'Loan payment']];

export default function QuickEntry({ writable, onSelect }) {
  return (
    <article className="quick">
      <h2>Quick entry</h2><p>Record operational finance activity.</p>
      {writable ? ACTIONS.map(([type, label]) => (
        <button onClick={() => onSelect(type)} key={type}>{label}<ArrowUpRight /></button>
      )) : <div className="readonly">This account has read-only access.</div>}
    </article>
  );
}
