
// ─────────────────────────────────────────────────────────────────────────────
// TODO Task 1: Drag-and-drop
//   - add onDragOver / onDragLeave / onDrop handlers to the drop zone
//   - call e.preventDefault() in onDragOver AND onDrop
//   - read the dropped file from e.dataTransfer.files[0]
//   - toggle an `isDragging` state to apply the "dragging" class
//
// TODO Task 2: Client-side validation
//   - before uploading, check file.type is an allowed image type
//   - and file.size <= 5 * 1024 * 1024 (5MB)
//   - show an error and stop if invalid
//
// TODO Task 3: Local preview
//   - const url = URL.createObjectURL(file); use it as <img src>
//   - revoke it with URL.revokeObjectURL in a useEffect cleanup
//
// TODO Task 4: Axios upload with progress
//   - build FormData, append the file under the name "avatar"
//   - apiClient.post("/api/upload", formData, { onUploadProgress: ... })
//   - percent = Math.round((event.loaded * 100) / event.total)
//   - DO NOT set a Content-Type header
// ─────────────────────────────────────────────────────────────────────────────


import { useState, useRef, useEffect } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef(null);

  // Task 3: Preview URL cleanup
  useEffect(() => {
    if (!preview) return;

    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Task 2: Validate the file before uploading
  function handleFile(selectedFile) {
    if (!selectedFile) return;

    // Debug information for checking the file type
    console.log("File type:", selectedFile.type);
    console.log("File name:", selectedFile.name);
    console.log("File size:", selectedFile.size);

    setError("");
    setUploadedUrl("");
    setProgress(0);

    if (!ALLOWED.includes(selectedFile.type)) {
      setFile(null);
      setPreview("");
      setError(
        `Invalid file type: ${
          selectedFile.type || "unknown"
        }. Choose JPEG, PNG, WEBP, or GIF.`
      );
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setPreview("");
      setError("File size must be 5MB or less.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  // Task 1: Drag-and-drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }

  // Click-to-select handler
  function handleChange(e) {
    handleFile(e.target.files[0]);

    // Allow choosing the same file again
    e.target.value = "";
  }

  // Task 4: Axios upload with progress
  async function upload() {
    if (!file || uploading) return;

    setError("");
    setProgress(0);
    setUploadedUrl("");
    setUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post(
        "/api/upload",
        formData,
        {
          onUploadProgress: (event) => {
            if (event.total) {
              const percent = Math.round(
                (event.loaded * 100) / event.total
              );

              setProgress(percent);
            }
          },
        }
      );

      setProgress(100);

      // Read the URL returned by the server
      const data = response.data;
      const url =
        typeof data === "string"
          ? data
          : data.url ?? data.avatarUrl ?? data.file?.url;

      if (url) {
        setUploadedUrl(url);
      } else {
        setError(
          "Upload completed, but no URL was found in the server response."
        );
        console.log("Upload response:", data);
      }
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err.response?.data?.message ||
          "Upload failed. Please check that the server is running."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`drop-zone ${isDragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>
          {isDragging
            ? "Drop your image here"
            : "Drag an image here, or click to choose"}
        </p>

        <p>JPEG, PNG, WEBP, or GIF — maximum 5MB</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handleChange}
        />
      </div>

      {preview && (
        <div className="preview">
          <img
            src={preview}
            alt="Selected avatar preview"
            style={{
              maxWidth: "200px",
              maxHeight: "200px",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        type="button"
        onClick={upload}
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {(uploading || progress > 0) && (
        <div>
          <div
            style={{
              width: "100%",
              height: "12px",
              backgroundColor: "#ddd",
              borderRadius: "6px",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="fill"
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "green",
                transition: "width 0.2s",
              }}
            />
          </div>

          <p>{progress}%</p>
        </div>
      )}

      {uploadedUrl && (
        <p>
          Upload successful!{" "}
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noreferrer"
          >
            View uploaded image
          </a>
        </p>
      )}
    </div>
  );
}
