export default function FAQComp({ children, title = "What does this mean?" }) {
  return (
    <details open={false}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}
