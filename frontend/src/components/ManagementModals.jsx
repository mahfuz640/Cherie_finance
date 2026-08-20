import Modal from './Modal';

export default function ManagementModals({ request, investment, onClose, onSend }) {
  if (request) return <Modal title="Edit money request" onClose={onClose} onSubmit={async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (await onSend(`/requests/${request.id}/details`, { amount: values.get('amount'), purpose: values.get('purpose') }, 'PATCH')) onClose();
  }}>
    <label>Amount (BDT)<input name="amount" type="number" min="1" defaultValue={request.amount} required /></label>
    <label>Purpose<textarea name="purpose" maxLength="500" defaultValue={request.purpose} required /></label>
    {request.status === 'rejected' && <p className="modal-note">Editing this rejected request will send it back for approval.</p>}
  </Modal>;

  if (investment) return <Modal title="Edit investment" onClose={onClose} onSubmit={async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (await onSend(`/investments/${investment.id}`, { amount: values.get('amount'), note: values.get('note') }, 'PATCH')) onClose();
  }}>
    <label>Amount (BDT)<input name="amount" type="number" min="1" defaultValue={investment.amount} required /></label>
    <label>Note<input name="note" maxLength="300" defaultValue={investment.note || ''} /></label>
  </Modal>;

  return null;
}
