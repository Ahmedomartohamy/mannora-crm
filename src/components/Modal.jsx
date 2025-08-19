
export default function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="header">
          <h3>{title}</h3>
          <button className="btn secondary" onClick={onClose}>إغلاق</button>
        </div>
        {children}
      </div>
    </div>
  )
}
