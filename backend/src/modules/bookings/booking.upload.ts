import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

// Phase 1 stub: local disk under backend/uploads/, served back out as a
// static file by app.ts. Swapping this for object storage (S3-compatible)
// later only touches this file — booking.controller.ts just calls
// bookingService.addAttachment() with whatever fileUrl this produces.
export const UPLOAD_ROOT = path.join(__dirname, "..", "..", "..", "uploads", "booking-attachments");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const companyId = req.user?.companyId ?? "unknown-company";
    const bookingId = req.params.id;
    const dir = path.join(UPLOAD_ROOT, companyId, bookingId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const bookingAttachmentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — a phone photo, not a video
});
