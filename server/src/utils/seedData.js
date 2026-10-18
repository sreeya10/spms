import bcrypt from 'bcryptjs';
import {
  usersStore,
  projectsStore,
  teamMembersStore,
  announcementsStore,
  notificationsStore
} from '../models/store.js';

export const seedInitialData = async () => {
  const existingUsers = usersStore.countDocuments();
  if (existingUsers > 0) return; // Already seeded

  console.log('[Seed] Populating initial accounts and default projects...');

  const salt = await bcrypt.genSalt(12);
  const defaultPasswordHash = await bcrypt.hash('Password123', salt);

  // 1. Admin / HOD
  const admin = usersStore.create({
    name: 'Dr. K. Ramanathan (HOD)',
    email: 'admin@vit.ac.in',
    passwordHash: defaultPasswordHash,
    role: 'admin',
    department: 'Computer Science & Engineering',
    designation: 'Professor & Head of Department',
    registrationNumber: 'FAC-CSE-001',
    githubUsername: 'ramanathan-vit',
    isActive: true
  });

  // 2. Faculty Supervisor
  const faculty = usersStore.create({
    name: 'Dr. Priya Sundaram',
    email: 'faculty@vit.ac.in',
    passwordHash: defaultPasswordHash,
    role: 'faculty',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    registrationNumber: 'FAC-CSE-104',
    githubUsername: 'priya-vit',
    isActive: true
  });

  // 3. Student Leader
  const studentLeader = usersStore.create({
    name: 'K. Anantha Naga Sreeya',
    email: 'student@vit.ac.in',
    passwordHash: defaultPasswordHash,
    role: 'student',
    department: 'Computer Science & Engineering',
    designation: 'Undergraduate Researcher',
    registrationNumber: '22BCE1024',
    githubUsername: 'anantha-sreeya',
    isActive: true
  });

  // 4. Student Peer Teammate
  const studentPeer = usersStore.create({
    name: 'Rahul Varma',
    email: 'rahul@vit.ac.in',
    passwordHash: defaultPasswordHash,
    role: 'student',
    department: 'Computer Science & Engineering',
    designation: 'Undergraduate Researcher',
    registrationNumber: '22BCE1055',
    githubUsername: 'rahul-varma',
    isActive: true
  });

  // 5. Initial Sample Project
  const project = projectsStore.create({
    title: 'Smart Health Monitoring and Triage System',
    description: 'An IoT-enabled and Machine Learning-powered automated triage and patient vital sign telemetry monitoring system.',
    department: 'Computer Science & Engineering',
    academicYear: '2025-2026',
    semester: 'Winter',
    deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
    leaderId: studentLeader._id,
    leaderName: studentLeader.name,
    facultySupervisorId: faculty._id,
    supervisorName: faculty.name,
    status: 'active'
  });

  // Team members
  teamMembersStore.create({
    projectId: project._id,
    userId: studentLeader._id,
    name: studentLeader.name,
    email: studentLeader.email,
    roleInTeam: 'Leader',
    githubUsername: studentLeader.githubUsername
  });

  teamMembersStore.create({
    projectId: project._id,
    userId: studentPeer._id,
    name: studentPeer.name,
    email: studentPeer.email,
    roleInTeam: 'Contributor',
    githubUsername: studentPeer.githubUsername
  });

  // 6. Initial Official Announcements
  const announcement = announcementsStore.create({
    authorId: faculty._id,
    authorName: faculty.name,
    authorRole: 'faculty',
    title: 'Interim Software Review Schedule & GitHub Verification Notice',
    content: 'All project teams must ensure that their primary Git repositories are connected to SPMS by this Friday. Initial code review will assess commit distribution equity, branching hygiene, and test coverage.',
    targetScope: 'department',
    targetDepartment: 'Computer Science & Engineering',
    targetRole: 'student',
    type: 'review',
    publishedAt: new Date().toISOString()
  });

  // In-app notifications
  notificationsStore.create({
    recipientId: studentLeader._id,
    recipientEmail: studentLeader.email,
    announcementId: announcement._id,
    title: announcement.title,
    message: announcement.content,
    type: announcement.type,
    isRead: false
  });

  notificationsStore.create({
    recipientId: studentPeer._id,
    recipientEmail: studentPeer.email,
    announcementId: announcement._id,
    title: announcement.title,
    message: announcement.content,
    type: announcement.type,
    isRead: false
  });

  console.log('[Seed] Demo accounts initialized:');
  console.log('   - Student: student@vit.ac.in / Password123');
  console.log('   - Faculty: faculty@vit.ac.in / Password123');
  console.log('   - Admin:   admin@vit.ac.in   / Password123');
};
