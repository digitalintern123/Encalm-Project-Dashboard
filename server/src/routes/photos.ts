import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db, uploadsDir } from '../db/database.js';
import { optionalAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { saveDatabaseSnapshot } from '../utils/backup.js';
import { fetchFullProject } from './projects.js';

export const projectPhotosRouter = Router({ mergeParams: true });
export const globalPhotosRouter = Router();

function getExtension(fileName?: string, dataUri?: string): string {
  if (dataUri) {
    const match = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
    if (match && match[1]) {
      const mime = match[1].toLowerCase();
      if (mime === 'jpeg' || mime === 'jpg') return 'jpg';
      if (mime === 'png') return 'png';
      if (mime === 'webp') return 'webp';
      if (mime === 'gif') return 'gif';
      if (mime === 'svg+xml') return 'svg';
    }
  }
  if (fileName) {
    const ext = path.extname(fileName).replace('.', '').toLowerCase();
    if (ext) return ext;
  }
  return 'jpg';
}

/**
 * Upload a new site photograph for a project.
 * AUTOMATIC CLEANUP: Deletes any previous photograph file(s) for this project
 * from disk and SQLite before saving the new photo.
 */
projectPhotosRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const project = db.prepare('SELECT id, name, code FROM projects WHERE id = ?').get(projectId) as any;
    if (!project) {
      return res.status(404).json({ error: `Project not found with id: ${projectId}` });
    }

    // Role check: HOD cannot upload
    if (req.user && req.user.role === 'hod') {
      return res.status(403).json({ error: 'Project HOD has view-only permissions.' });
    }

    const { fileData, fileName, url, caption, stage, category, takenDate } = req.body;

    if (!fileData && !url) {
      return res.status(400).json({ error: 'Please provide either an image file or an image URL.' });
    }

    // 1. AUTOMATIC OLD IMAGE PURGE: Find all previous photos for this project
    const previousPhotos = db.prepare('SELECT * FROM photos WHERE project_id = ?').all(projectId) as any[];
    for (const old of previousPhotos) {
      if (old.url && typeof old.url === 'string' && old.url.startsWith('/uploads/')) {
        const oldFile = path.basename(old.url);
        const oldPath = path.join(uploadsDir, oldFile);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
            console.log(`[Photo Cleanup] Deleted previous site photo file on disk: ${oldFile}`);
          } catch (unlinkErr) {
            console.warn(`[Photo Cleanup] Could not delete disk file ${oldFile}:`, unlinkErr);
          }
        }
      }
    }

    // Purge previous records from SQLite
    db.prepare('DELETE FROM photos WHERE project_id = ?').run(projectId);

    // 2. Save new photograph
    let finalUrl = '';
    let fileSize = 0;

    if (fileData) {
      const ext = getExtension(fileName, fileData);
      const cleanBase64 = fileData.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      fileSize = buffer.length;

      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newFileName = `${projectId.replace(/[^a-zA-Z0-9-_]/g, '')}_${Date.now()}_${randomSuffix}.${ext}`;
      const destinationPath = path.join(uploadsDir, newFileName);

      fs.writeFileSync(destinationPath, buffer);
      finalUrl = `/uploads/${newFileName}`;
      console.log(`[Photo Upload] Saved new site photo to: ${finalUrl} (${Math.round(fileSize / 1024)} KB)`);
    } else if (url) {
      finalUrl = url.trim();
    }

    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const uploaderName = req.user?.name || 'Project Team';
    const uploaderRole = req.user?.title || req.user?.role || 'Lead';
    const nowIso = new Date().toISOString();
    const effectiveTakenDate = takenDate || nowIso.split('T')[0];
    const effectiveCategory = category || 'Progress';
    const effectiveCaption = (caption || 'Site progress photograph').trim();

    db.prepare(`
      INSERT INTO photos (
        id, project_id, url, caption, stage, category, taken_date, uploaded_by, role, file_size, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      photoId,
      projectId,
      finalUrl,
      effectiveCaption,
      stage || null,
      effectiveCategory,
      effectiveTakenDate,
      uploaderName,
      uploaderRole,
      fileSize || null,
      nowIso
    );

    // Create system notification
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO notifications (id, type, title, message, project_id, link, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(
      notifId,
      'system',
      'Site Photograph Updated',
      `${uploaderName} uploaded a new site photograph for ${project.name}`,
      projectId,
      `/project/${projectId}`
    );

    // Save snapshot
    saveDatabaseSnapshot();

    const fullProject = fetchFullProject(projectId);
    const createdPhoto = {
      id: photoId,
      projectId,
      url: finalUrl,
      caption: effectiveCaption,
      stage: stage || null,
      category: effectiveCategory,
      takenDate: effectiveTakenDate,
      uploadedBy: uploaderName,
      role: uploaderRole,
      fileSize,
      createdAt: nowIso,
    };

    res.status(201).json({
      message: 'Site photograph uploaded successfully (previous photo purged)',
      photo: createdPhoto,
      project: fullProject,
    });
  } catch (err: any) {
    console.error('[Upload Photo Error]', err);
    res.status(500).json({ error: 'Failed to upload photograph', message: err.message });
  }
});

/**
 * Delete a specific site photograph
 */
projectPhotosRouter.delete('/:photoId', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.params.id as string;
    const photoId = req.params.photoId as string;

    if (req.user && req.user.role === 'hod') {
      return res.status(403).json({ error: 'Project HOD has view-only permissions.' });
    }

    const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND project_id = ?').get(photoId, projectId) as any;
    if (!photo) {
      return res.status(404).json({ error: 'Photograph not found' });
    }

    // Delete disk file if stored locally
    if (photo.url && typeof photo.url === 'string' && photo.url.startsWith('/uploads/')) {
      const fileName = path.basename(photo.url);
      const filePath = path.join(uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[Photo Delete] Deleted file: ${filePath}`);
        } catch (e) {
          console.warn(`[Photo Delete] Could not unlink ${filePath}:`, e);
        }
      }
    }

    db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);
    saveDatabaseSnapshot();

    const fullProject = fetchFullProject(projectId);
    res.json({ message: 'Photograph deleted successfully', project: fullProject });
  } catch (err: any) {
    console.error('[Delete Photo Error]', err);
    res.status(500).json({ error: 'Failed to delete photograph', message: err.message });
  }
});

/**
 * Get all photos for a project
 */
projectPhotosRouter.get('/', optionalAuth, (req, res) => {
  const projectId = req.params.id as string;
  const rows = db.prepare('SELECT * FROM photos WHERE project_id = ? ORDER BY taken_date DESC, created_at DESC').all(projectId);
  res.json({ photos: rows });
});

/**
 * Global portfolio photographs endpoint
 */
globalPhotosRouter.get('/', optionalAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        p.id,
        p.project_id as projectId,
        p.url,
        p.caption,
        p.stage,
        p.category,
        p.taken_date as takenDate,
        p.uploaded_by as uploadedBy,
        p.role,
        p.file_size as fileSize,
        p.created_at as createdAt,
        pr.name as projectName,
        pr.code as projectCode,
        pr.location as projectLocation,
        pr.category as projectCategory
      FROM photos p
      JOIN projects pr ON p.project_id = pr.id
      ORDER BY p.taken_date DESC, p.created_at DESC
    `).all();

    res.json({ photos: rows });
  } catch (err: any) {
    console.error('[Global Photos Error]', err);
    res.status(500).json({ error: 'Failed to fetch portfolio photographs', message: err.message });
  }
});
