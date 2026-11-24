import * as React from "react";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";

/**
 * Captures a still frame from the device camera. The resulting JPEG is handed
 * back as a `File`, so it follows the same validation/upload path as a picked file.
 */
export function PatientPhotoCapture({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setReady(false);
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot access a camera. Choose a photo file instead.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
          void video.play().catch(() => undefined);
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const name = cause instanceof DOMException ? cause.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera permission was blocked. Allow it in the browser, or choose a photo file instead."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera was found on this device. Choose a photo file instead."
              : "The camera could not be started. Choose a photo file instead.",
        );
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("The photo could not be captured.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("The photo could not be captured.");
          return;
        }
        onCapture(
          new File([blob], `patient-photo-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
        onOpenChange(false);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Take patient photo"
      description="Ask the patient to face the camera, then capture."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={capture}
            disabled={!ready || Boolean(error)}
            leadingIcon={<Camera className="h-4 w-4" />}
          >
            Capture photo
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-small text-danger">
          {error}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setReady(true)}
            className="aspect-[4/3] w-full object-cover"
            aria-label="Camera preview"
          />
        </div>
      )}
    </Modal>
  );
}
