export default function ProjectLoadingOverlay({ show, text }) {
  if (!show) return null;

  return (
    <div className="project-loading-overlay">
      <div className="project-loading-box">
        <div className="project-loading-title">Opening VXplore Project</div>
        <div className="project-loading-text">{text || "Loading..."}</div>

        <div className="project-loading-bar">
          <div />
        </div>
      </div>
    </div>
  );
}