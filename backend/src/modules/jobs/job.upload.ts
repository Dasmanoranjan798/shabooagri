import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

// Same Phase 1 local-disk stub as booking.upload.ts (see that file's
// comment) — kept as two separate small config files rather than one
// "shared" uploader, since the only two things they'd share (diskStorage
// wiring) are three lines each and premature sharing would couple two
// otherwise-independent modules for no real benefit yet.
export const UPLOAD_ROOT = path.join(__dirname, "..", "..", "..", "uploads", "job-photos");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const companyId = req.user?.companyId ?? "unknown-company";
    const jobId = req.params.id;
    const dir = path.join(UPLOAD_ROOT, companyId, jobId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const jobPhotoUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});
