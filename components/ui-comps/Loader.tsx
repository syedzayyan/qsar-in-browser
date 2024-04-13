export default function Loader({ loadingText = "Processsing..." }) {
  return (
    <div style={{ textAlign: "center"}}>
      <div>
        <div className="loader"></div>
        <span style={{ marginTop: "10px" }}>{loadingText}...</span>
      </div>
    </div>
  );
}
