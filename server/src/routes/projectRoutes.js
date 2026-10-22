import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  removeProjectByFaculty,
  addTeamMember,
  removeTeamMember
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { logActivity } from '../middleware/audit.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('student', 'admin'), logActivity('CREATE_PROJECT', 'Project'), createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', logActivity('UPDATE_PROJECT', 'Project'), updateProject);
router.delete('/:id/faculty-remove', authorize('faculty', 'admin'), logActivity('FACULTY_REMOVE_PROJECT', 'Project'), removeProjectByFaculty);
router.delete('/:id', logActivity('DELETE_PROJECT', 'Project'), deleteProject);

router.post('/:id/members', logActivity('ADD_TEAM_MEMBER', 'TeamMember'), addTeamMember);
router.delete('/:id/members/:userId', logActivity('REMOVE_TEAM_MEMBER', 'TeamMember'), removeTeamMember);

export default router;
