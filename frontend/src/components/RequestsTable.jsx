import { Check, X } from 'lucide-react';

const money = (amount) => `BDT ${Number(amount || 0).toLocaleString('en-BD')}`;

export default function RequestsTable({ requests, role, onReview }) {
  const canReview = (request) => request.status === 'pending' && (
    role === 'admin'
    || (request.requester === 'nadiya' && role === 'mahfuz')
    || (request.requester === 'mahfuz' && role === 'nadiya')
  );

  return (
    <article className="table-card requests-table">
      <div className="section-title"><div><h2>Money requests</h2><p>Nadiya and Mahfuz cross-approve each other.</p></div></div>
      <div className="table-wrap"><table>
        <thead><tr><th>Requester</th><th>Purpose</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>{requests.length ? requests.map((request) => (
          <tr key={request.id}>
            <td className="capitalize" data-label="Requester">{request.requester}</td><td data-label="Purpose">{request.purpose || '—'}</td>
            <td data-label="Amount">{money(request.amount)}</td><td data-label="Status"><span className={`status ${request.status}`}>{request.status}</span></td>
            <td data-label="Review">{canReview(request) && <div className="review">
              <button title="Approve" onClick={() => onReview(request.id, 'approved')}><Check /></button>
              <button title="Reject" onClick={() => onReview(request.id, 'rejected')}><X /></button>
            </div>}</td>
          </tr>
        )) : <tr><td colSpan="5" className="empty">No requests yet.</td></tr>}</tbody>
      </table></div>
    </article>
  );
}
