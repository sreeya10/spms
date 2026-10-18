import PDFDocument from 'pdfkit';

export const generateProjectPDF = (project, repoData, snapshot, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="SPMS_Report_${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
  );

  doc.pipe(res);

  // 1. Header & Institutional Banner
  doc.rect(40, 40, 515, 60).fill('#1e293b');
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('VELLORE INSTITUTE OF TECHNOLOGY', 55, 52);
  doc.fontSize(11).font('Helvetica').text('Student Project Monitoring System (SPMS) — Official Project Audit Report', 55, 72);

  doc.moveDown(3);

  // 2. Project Metadata Section
  doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('1. Project Overview', 40, 115);
  doc.moveTo(40, 132).lineTo(555, 132).strokeColor('#cbd5e1').stroke();

  doc.fontSize(10).font('Helvetica');
  doc.text(`Title: ${project.title}`, 40, 142);
  doc.text(`Department: ${project.department || 'Computer Science & Engineering'}`, 40, 158);
  doc.text(`Academic Year: ${project.academicYear || '2025-2026'} | Semester: ${project.semester || 'Winter'}`, 40, 174);
  doc.text(`Status: ${(project.status || 'Active').toUpperCase()}`, 40, 190);

  doc.text(`Supervisor: ${project.supervisorName || 'Assigned Faculty'}`, 320, 142);
  doc.text(`Team Leader: ${project.leaderName || 'Student Leader'}`, 320, 158);
  doc.text(`Deadline: ${project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Not Set'}`, 320, 174);
  doc.text(`Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 320, 190);

  // 3. GitHub Repository Statistics
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('2. GitHub Repository Activity Metrics', 40, 215);
  doc.moveTo(40, 232).lineTo(555, 232).strokeColor('#cbd5e1').stroke();

  if (repoData && repoData.isConnected) {
    doc.fontSize(10).font('Helvetica');
    doc.text(`Repository: ${repoData.repoOwner}/${repoData.repoName} (${repoData.repoUrl})`, 40, 242);
    doc.text(`Default Branch: ${repoData.defaultBranch} | Total Branches: ${repoData.totalBranches}`, 40, 258);
    doc.text(`Total Commits: ${repoData.totalCommits}`, 40, 274);
    doc.text(`Pull Requests: ${repoData.totalPullRequests} (${repoData.mergedPullRequests} Merged, ${repoData.openPullRequests} Open)`, 40, 290);
    doc.text(`Issues Tracked: ${repoData.totalIssues} (${repoData.closedIssues} Closed, ${repoData.openIssues} Open)`, 320, 274);
    doc.text(`Days Since Last Commit: ${repoData.daysSinceLastCommit} days`, 320, 290);
  } else {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#dc2626').text('No authorized GitHub repository connected yet.', 40, 242);
  }

  // 4. Team Contributor Equity Table
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('3. Team Contributor Participation', 40, 315);
  doc.moveTo(40, 332).lineTo(555, 332).strokeColor('#cbd5e1').stroke();

  // Table header
  doc.rect(40, 342, 515, 20).fill('#f1f5f9');
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
  doc.text('Contributor', 50, 347);
  doc.text('GitHub Username', 180, 347);
  doc.text('Recorded Commits', 320, 347);
  doc.text('Contribution Equity', 440, 347);

  let tableY = 366;
  const contributors = (repoData && repoData.contributors && repoData.contributors.length > 0)
    ? repoData.contributors
    : [{ username: project.leaderName || 'Leader', commits: repoData ? repoData.totalCommits : 0, percentage: 100 }];

  contributors.forEach((c) => {
    doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
    doc.text(c.name || c.username, 50, tableY);
    doc.text(c.username || 'N/A', 180, tableY);
    doc.text(`${c.commits || 0}`, 320, tableY);
    doc.text(`${c.percentage || 0}%`, 440, tableY);
    doc.moveTo(40, tableY + 14).lineTo(555, tableY + 14).strokeColor('#f1f5f9').stroke();
    tableY += 18;
  });

  // 5. Machine Learning Readiness & Risk Assessment
  const mlY = tableY + 15;
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('4. Machine Learning Readiness & Risk Evaluation', 40, mlY);
  doc.moveTo(40, mlY + 17).lineTo(555, mlY + 17).strokeColor('#cbd5e1').stroke();

  const readiness = snapshot ? snapshot.readinessScore : 50;
  const risk = snapshot ? snapshot.riskLevel : 'Medium';

  // Box for score
  doc.rect(40, mlY + 25, 250, 65).fill('#f8fafc').strokeColor('#e2e8f0').stroke();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('PROJECT READINESS SCORE', 50, mlY + 33);
  doc.fontSize(24).font('Helvetica-Bold').fillColor(readiness >= 75 ? '#16a34a' : (readiness >= 50 ? '#ca8a04' : '#dc2626'))
    .text(`${readiness}%`, 50, mlY + 50);

  // Box for risk level
  doc.rect(305, mlY + 25, 250, 65).fill('#f8fafc').strokeColor('#e2e8f0').stroke();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('PROJECT RISK CLASSIFICATION', 315, mlY + 33);
  const riskColor = risk === 'Low' ? '#16a34a' : (risk === 'Medium' ? '#ca8a04' : '#dc2626');
  doc.fontSize(22).font('Helvetica-Bold').fillColor(riskColor).text(risk.toUpperCase(), 315, mlY + 50);

  // 6. AI Recommendations & Corrective Actions
  let aiY = mlY + 105;
  if (aiY > 650) {
    doc.addPage();
    aiY = 50;
  }

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('5. AI Advisory & Actionable Recommendations', 40, aiY);
  doc.moveTo(40, aiY + 17).lineTo(555, aiY + 17).strokeColor('#cbd5e1').stroke();

  const recs = (snapshot && snapshot.aiRecommendations && snapshot.aiRecommendations.length > 0)
    ? snapshot.aiRecommendations
    : [
        { priority: 'High', area: 'Version Control', action: 'Ensure regular commits before the evaluation deadline.' },
        { priority: 'Medium', area: 'Collaboration', action: 'Distribute workload evenly among team members.' }
      ];

  let recY = aiY + 25;
  recs.slice(0, 4).forEach((rec, idx) => {
    if (recY > 740) {
      doc.addPage();
      recY = 50;
    }
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(`${idx + 1}. [${rec.priority || 'Medium'} Priority - ${rec.area || 'General'}]`, 40, recY);
    doc.fontSize(9).font('Helvetica').fillColor('#334155').text(rec.action, 55, recY + 13, { width: 490 });
    recY += 34;
  });

  // Footer
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#94a3b8').text(
    'Confidential — For Internal Academic Evaluation at VIT only. Generated automatically by Student Project Monitoring System.',
    40,
    780,
    { align: 'center', width: 515 }
  );

  doc.end();
};
