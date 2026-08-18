import Modal from './Modal';

const TRANSACTION_TYPES = ['sale', 'stock', 'expense', 'loan', 'loan_payment'];
const field = (form, name) => new FormData(form).get(name);

export default function FinanceModals({ modal, onClose, onSend }) {
  if (modal === 'investment') return <Modal title="Add investment" onClose={onClose} onSubmit={(event) => {
    event.preventDefault(); onSend('/investments', { amount: field(event.currentTarget, 'amount'), note: field(event.currentTarget, 'note') });
  }}><label>Amount (BDT)<input name="amount" type="number" min="1" required /></label><label>Note<input name="note" placeholder="Optional details" /></label></Modal>;

  if (modal === 'request') return <Modal title="Request company money" onClose={onClose} onSubmit={(event) => {
    event.preventDefault(); onSend('/requests', { amount: field(event.currentTarget, 'amount'), purpose: field(event.currentTarget, 'purpose') });
  }}><label>Amount (BDT)<input name="amount" type="number" min="1" required /></label><label>Purpose<textarea name="purpose" required /></label></Modal>;

  if (TRANSACTION_TYPES.includes(modal)) {
    const needsQuantity = ['sale', 'stock'].includes(modal);
    return <Modal title={modal.replace('_', ' ')} onClose={onClose} onSubmit={(event) => {
      event.preventDefault(); onSend('/transactions', { type: modal, amount: field(event.currentTarget, 'amount'), quantity: needsQuantity ? field(event.currentTarget, 'quantity') : 0, note: field(event.currentTarget, 'note') });
    }}><label>Amount (BDT)<input name="amount" type="number" min="0" required /></label>{needsQuantity && <label>Quantity<input name="quantity" type="number" min="1" required /></label>}<label>Note<input name="note" /></label></Modal>;
  }

  return null;
}
