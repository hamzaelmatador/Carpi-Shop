import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, icon = <AlertTriangle size={48} color="#D4A017" /> }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
        <span className="modal-icon">{icon}</span>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-text">{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary modal-btn" onClick={onCancel}>Cancel</button>
          <button className="btn-primary modal-btn" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
