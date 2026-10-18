import { projectsStore, teamMembersStore, usersStore, repoDataStore, snapshotsStore } from '../models/store.js';

export const createProject = async (req, res) => {
  try {
    const { title, description, department, academicYear, semester, deadline, facultySupervisorId } = req.body;

    if (!title || !department) {
      return res.status(400).json({
        success: false,
        message: 'Project title and department are required.'
      });
    }

    const cleanTitle = title.trim();
    const cleanYear = (academicYear || '2025-2026').trim();
    const cleanDept = department.trim();

    // REQ-2.8: Prevent duplicate project registrations (case-insensitive title in same department and year)
    const existing = projectsStore.find().find(p => 
      p.title && p.title.trim().toLowerCase() === cleanTitle.toLowerCase() &&
      p.department && p.department.trim().toLowerCase() === cleanDept.toLowerCase() &&
      p.academicYear && p.academicYear.trim() === cleanYear
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A project with the title "${cleanTitle}" is already registered in ${cleanDept} for ${cleanYear}. Duplicate registrations are prevented.`
      });
    }

    // Resolve supervisor if provided
    let supervisor = null;
    if (facultySupervisorId) {
      supervisor = usersStore.findById(facultySupervisorId);
    }
    // If no supervisor specified, pick a faculty in the department
    if (!supervisor) {
      supervisor = usersStore.findOne({ role: 'faculty', department: cleanDept }) ||
                   usersStore.findOne({ role: 'faculty' });
    }

    const leader = usersStore.findById(req.user.id);

    const project = projectsStore.create({
      title: cleanTitle,
      description: description ? description.trim() : '',
      department: cleanDept,
      academicYear: cleanYear,
      semester: semester || 'Winter',
      deadline: deadline ? new Date(deadline).toISOString() : null,
      leaderId: req.user.id,
      leaderName: leader ? leader.name : req.user.name,
      facultySupervisorId: supervisor ? supervisor._id : null,
      supervisorName: supervisor ? supervisor.name : 'Unassigned',
      status: 'active'
    });

    // Add creator as Team Leader
    teamMembersStore.create({
      projectId: project._id,
      userId: req.user.id,
      name: leader ? leader.name : req.user.name,
      email: req.user.email,
      roleInTeam: 'Leader',
      githubUsername: req.user.githubUsername || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const { role, id, department } = req.user;
    let projects = [];

    if (role === 'admin') {
      // Admins see all projects
      projects = projectsStore.find();
    } else if (role === 'faculty') {
      // Faculty see projects they supervise or projects in their department
      projects = projectsStore.find().filter(p => 
        p.facultySupervisorId === id || p.department === department
      );
    } else {
      // Students see projects they belong to
      const myMemberships = teamMembersStore.find({ userId: id });
      const myProjectIds = myMemberships.map(m => m.projectId);
      projects = projectsStore.find().filter(p => 
        p.leaderId === id || myProjectIds.includes(p._id)
      );
    }

    // Enrich with repo info and latest snapshot
    const enriched = projects.map(p => {
      const repo = repoDataStore.findOne({ projectId: p._id });
      const snapshots = snapshotsStore.find({ projectId: p._id });
      const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const members = teamMembersStore.find({ projectId: p._id });

      return {
        ...p,
        hasRepository: !!(repo && repo.isConnected),
        repositoryUrl: repo ? repo.repoUrl : null,
        repoOwner: repo ? repo.repoOwner : null,
        repoName: repo ? repo.repoName : null,
        totalCommits: repo ? repo.totalCommits : 0,
        readinessScore: latestSnapshot ? latestSnapshot.readinessScore : null,
        riskLevel: latestSnapshot ? latestSnapshot.riskLevel : null,
        teamCount: members.length
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      projects: enriched
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = projectsStore.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Verify access
    const isLeader = project.leaderId === req.user.id;
    const isMember = teamMembersStore.findOne({ projectId: project._id, userId: req.user.id });
    const isSupervisor = project.facultySupervisorId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isLeader && !isMember && !isSupervisor && !isAdmin && req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to view this project.'
      });
    }

    const members = teamMembersStore.find({ projectId: project._id });
    const repo = repoDataStore.findOne({ projectId: project._id });
    const snapshots = snapshotsStore.find({ projectId: project._id });
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    return res.status(200).json({
      success: true,
      project: {
        ...project,
        members,
        repository: repo || null,
        latestSnapshot: latestSnapshot || null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = projectsStore.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // REQ-2.9: Ensure only authorized team members or supervisor/admin can modify
    const isLeader = project.leaderId === req.user.id;
    const isSupervisor = project.facultySupervisorId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isLeader && !isSupervisor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the project leader, assigned supervisor, or administrator may edit project details.'
      });
    }

    const { title, description, deadline, status, facultySupervisorId } = req.body;
    const updates = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline).toISOString() : null;
    if (status) updates.status = status;
    if (facultySupervisorId) {
      const sup = usersStore.findById(facultySupervisorId);
      if (sup) {
        updates.facultySupervisorId = sup._id;
        updates.supervisorName = sup.name;
      }
    }

    const updated = projectsStore.findByIdAndUpdate(project._id, updates);

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = projectsStore.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const isLeader = project.leaderId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isLeader && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the project leader or administrator can delete a project.'
      });
    }

    projectsStore.findByIdAndDelete(project._id);

    // Clean up members, repo, snapshots
    const members = teamMembersStore.find({ projectId: project._id });
    members.forEach(m => teamMembersStore.findByIdAndDelete(m._id));

    const repo = repoDataStore.findOne({ projectId: project._id });
    if (repo) repoDataStore.findByIdAndDelete(repo._id);

    const snapshots = snapshotsStore.find({ projectId: project._id });
    snapshots.forEach(s => snapshotsStore.findByIdAndDelete(s._id));

    return res.status(200).json({
      success: true,
      message: 'Project and associated data deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const { githubUsername, roleInTeam } = req.body;
    const targetEmail = (req.body.studentEmail || req.body.email || '').trim().toLowerCase();
    const project = projectsStore.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Verify leader or admin
    if (project.leaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the project leader can add members to the team.'
      });
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Student email is required.' });
    }

    const studentUser = usersStore.findOne({ email: targetEmail });
    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: `No registered student found with email: ${targetEmail}. Student must register an account first.`
      });
    }

    // Check if already in this project team
    const alreadyMember = teamMembersStore.findOne({
      projectId: project._id,
      userId: studentUser._id
    });

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'This student is already a member of this project team.'
      });
    }

    const newMember = teamMembersStore.create({
      projectId: project._id,
      userId: studentUser._id,
      name: studentUser.name,
      email: studentUser.email,
      roleInTeam: roleInTeam || 'Contributor',
      githubUsername: githubUsername ? githubUsername.trim() : (studentUser.githubUsername || '')
    });

    return res.status(201).json({
      success: true,
      message: `${studentUser.name} added to the project team successfully.`,
      member: newMember
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const removeTeamMember = async (req, res) => {
  try {
    const project = projectsStore.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (project.leaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the project leader or admin can remove team members.'
      });
    }

    const member = teamMembersStore.findOne({
      projectId: project._id,
      userId: req.params.userId
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found in project.' });
    }

    if (member.roleInTeam === 'Leader' && member.userId === project.leaderId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project team leader.'
      });
    }

    teamMembersStore.findByIdAndDelete(member._id);

    return res.status(200).json({
      success: true,
      message: 'Team member removed successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
