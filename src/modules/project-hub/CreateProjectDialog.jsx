export default function CreateProjectDialog({
  open,
  onClose,
  projectName,
  setProjectName,
  file,
  setFile,
  createRole,
  setCreateRole,
  onSubmit,
  progress,
  isSubmitting,
  glbValidation,
  isValidatingGlb,
}) {
  if (!open) return null;

  return (
    <div className="vxhub-modal-backdrop">
      <div className="vxhub-modal">
        <div className="vxhub-modal-header">
          <h2>Create Project</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="vxhub-modal-body">
          <label>Project Name</label>

          <div className="vxhub-input-wrap">
            <input
              value={projectName}
              maxLength={16}
              placeholder="Type project name here"
              onChange={(e) => setProjectName(e.target.value)}
            />
            <span>{projectName.length}/16</span>
          </div>

          <label className="vxhub-upload-box">
            <div className="vxhub-upload-icon">▴</div>
            <div>
              {file ? (
                <>
                  <strong>{file.name}</strong>
                  <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <strong>Add your 3D files with glb format</strong>
              )}
            </div>

            <input
              type="file"
              accept=".glb"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {isValidatingGlb && (
              <div className="vxhub-glb-check">
                Checking GLB...
              </div>
            )}

            {glbValidation && (
              <div
                className={
                  glbValidation.valid
                    ? "vxhub-glb-check success"
                    : "vxhub-glb-check error"
                }
              >
                <strong>
                  {glbValidation.valid ? "GLB is compatible" : "GLB has issues"}
                </strong>

                {glbValidation.info && (
                  <p>
                    Meshes: {glbValidation.info.meshes} · Materials:{" "}
                    {glbValidation.info.materials} · Textures:{" "}
                    {glbValidation.info.textures} · Animations:{" "}
                    {glbValidation.info.animations}
                  </p>
                )}

                {glbValidation.warnings?.map((warning, index) => (
                  <p key={`warning-${index}`}>⚠ {warning}</p>
                ))}

                {glbValidation.errors?.map((error, index) => (
                  <p key={`error-${index}`}>✕ {error}</p>
                ))}
              </div>
            )}
          <div className="vxhub-access-field">
            <label>Access Mode</label>

            <div className="vxhub-access-options">
              <button
                type="button"
                className={createRole === "EDITOR" ? "active" : ""}
                onClick={() => setCreateRole("EDITOR")}
                disabled={isSubmitting}
              >
                ✎ Editor
              </button>

              <button
                type="button"
                className={createRole === "PLAYER" ? "active" : ""}
                onClick={() => setCreateRole("PLAYER")}
                disabled={isSubmitting}
              >
                ▶ Player
              </button>
            </div>
          </div>
          {isSubmitting && (
            <div className="vxhub-progress-wrap">
              <div className="vxhub-progress-text">
                Uploading GLB... {progress}%
              </div>
              <div className="vxhub-progress">
                <div style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="vxhub-modal-footer">
          <button className="cancel" onClick={onClose} disabled={isSubmitting}>
            CANCEL
          </button>
          <button className="submit" onClick={onSubmit} disabled={isSubmitting}>
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
}