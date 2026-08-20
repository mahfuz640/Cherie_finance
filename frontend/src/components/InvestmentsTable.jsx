import { Pencil, Trash2 } from 'lucide-react';

const money = (amount) => `BDT ${Number(amount || 0).toLocaleString('en-BD')}`;

export default function InvestmentsTable({ investments, user, onEdit, onDelete }) {
  const canManage = (investment) => user.role === 'admin'
    || investment.created_by === user.role
    || investment.investor === user.name;

  return (
    <article className="table-card investments-table">
      <div className="section-title"><div><h2>Investments</h2><p>Owners can update their investments; Admin can manage every record.</p></div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Investor</th><th>Note</th><th>Amount</th><th>Added</th><th></th></tr></thead>
        <tbody>{investments.length ? investments.map((investment) => (
          <tr key={investment.id}>
            <td data-label="Investor">{investment.investor}</td>
            <td data-label="Note">{investment.note || '—'}</td>
            <td data-label="Amount">{money(investment.amount)}</td>
            <td data-label="Added">{new Date(investment.created_at).toLocaleString('en-BD')}</td>
            <td data-label="Actions">{canManage(investment) && <div className="manage-actions">
              <button type="button" className="edit-action" title="Edit investment" onClick={() => onEdit(investment)}><Pencil /></button>
              <button type="button" className="delete-action" title="Delete investment" onClick={() => onDelete(investment)}><Trash2 /></button>
            </div>}</td>
          </tr>
        )) : <tr><td colSpan="5" className="empty">No investments yet.</td></tr>}</tbody>
      </table></div>
    </article>
  );
}
