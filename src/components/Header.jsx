
export default function Header({ title, actions }) {
  return (
    <div className="header">
      <h2>{title}</h2>
      <div>{actions}</div>
    </div>
  )
}
