import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Modal from './Modal';

const LABELS = { sale: 'Sale', stock: 'Stock', expense: 'Expense', loan: 'Loan', loan_payment: 'Loan payment' };
const money = (amount) => `BDT ${Number(amount || 0).toLocaleString('en-BD')}`;

export default function TransactionsTable({ transactions, role, onEdit, onDelete }) {
  const [editing, setEditing] = useState(null);
  if (role !== 'admin') return null;

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const saved = await onEdit(editing.id, {
      amount: values.get('amount'), quantity: values.get('quantity'), note: values.get('note'),
    });
    if (saved) setEditing(null);
  }

  return <>
    <article className="table-card transactions-table">
      <div className="section-title"><div><h2>Finance records</h2><p>Admin can edit or delete the records behind the dashboard totals.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Type</th><th>Amount</th><th>Quantity</th><th>Note</th><th>Recorded</th><th /></tr></thead>
        <tbody>{transactions.length ? transactions.map((transaction) => <tr key={transaction.id}>
          <td data-label="Type">{LABELS[transaction.type] || transaction.type}</td>
          <td data-label="Amount">{money(transaction.amount)}</td>
          <td data-label="Quantity">{transaction.quantity || 0}</td>
          <td data-label="Note">{transaction.note || '—'}</td>
          <td data-label="Recorded">{new Date(transaction.created_at).toLocaleString('en-BD')}</td>
          <td data-label="Actions"><div className="manage-actions"><button type="button" className="edit-action" title="Edit finance record" onClick={() => setEditing(transaction)}><Pencil /></button><button type="button" className="delete-action" title="Delete finance record" onClick={() => { if (window.confirm('Delete this finance record?')) onDelete(transaction); }}><Trash2 /></button></div></td>
        </tr>) : <tr><td colSpan="6" className="empty">No finance records yet.</td></tr>}</tbody></table></div>
    </article>
    {editing && <Modal title={`Edit ${LABELS[editing.type] || 'finance record'}`} onClose={() => setEditing(null)} onSubmit={submit}>
      <label>Amount (BDT)<input name="amount" type="number" min="0" step="0.01" defaultValue={editing.amount} required /></label>
      <label>Quantity<input name="quantity" type="number" min="0" step="1" defaultValue={editing.quantity || 0} required /></label>
      <label>Note<textarea name="note" maxLength="300" defaultValue={editing.note || ''} /></label>
    </Modal>}
  </>;
}
