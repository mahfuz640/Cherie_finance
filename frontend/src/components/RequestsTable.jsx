import { Check, Pencil, Trash2, X } from 'lucide-react';

const money = (amount) => `BDT ${Number(amount || 0).toLocaleString('en-BD')}`;

export default function RequestsTable({ requests, role, onReview, onEdit, onDelete }) {
  const canReview = (request) => request.status === 'pending' && (
    role === 'admin'
    || (request.requester === 'nadiya' && role === 'mahfuz')
    || (request.requester === 'mahfuz' && role === 'nadiya')
  );
  const canManage = (request) => role === 'admin' || (request.requester === role && request.status !== 'approved');

  return (
    <article className="table-card requests-table">
      <div className="section-title"><div><h2>Money requests</h2><p>Nadiya and Mahfuz cross-approve each other.</p></div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Requester</th><th>Purpose</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>{requests.length ? requests.map((request) => (
          <tr key={request.id}>
            <td className="capitalize" data-label="Requester">{request.requester}</td>
            <td data-label="Purpose">{request.purpose || '—'}</td>
            <td data-label="Amount">{money(request.amount)}</td>
            <td data-label="Status"><span className={`status ${request.status}`}>{request.status}</span></td>
            <td data-label="Actions"><div className="manage-actions">
              {canReview(request) && <div className="review">
                <button type="button" title="Approve" onClick={() => onReview(request.id, 'approved')}><Check /></button>
                <button type="button" title="Reject" onClick={() => onReview(request.id, 'rejected')}><X /></button>
              </div>}
              {canManage(request) && <>
                <button type="button" className="edit-action" title="Edit request" onClick={() => onEdit(request)}><Pencil /></button>
                <button type="button" className="delete-action" title="Delete request" onClick={() => onDelete(request)}><Trash2 /></button>
              </>}
            </div></td>
          </tr>
        )) : <tr><td colSpan="5" className="empty">No requests yet.</td></tr>}</tbody>
      </table></div>
    </article>
  );
}
