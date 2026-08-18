import { X } from 'lucide-react';

export default function Modal({ title, onClose, onSubmit, children }) {
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close modal"><X /></button>
        </div>
        {children}
        <button className="primary">Save</button>
      </form>
    </div>
  );
}
