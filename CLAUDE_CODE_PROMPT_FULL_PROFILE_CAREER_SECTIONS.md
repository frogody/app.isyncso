# Add Work History, Education, Certifications & Interests to Full Profile Page

## Context
The LinkedIn Skills & Career sections were added to the candidate drawer (CandidateDetailDrawer.jsx) and are working perfectly. However, the full profile page (TalentCandidateProfile.jsx) only shows the Skills section. We need to add Work History, Education, Certifications, and Interests sections to match the drawer functionality.

## Task
Add Work History, Education, Certifications, and Interests sections to `/src/pages/TalentCandidateProfile.jsx` in the Overview tab, directly after the existing Skills section.

## Current Location
The Skills section is at lines 979-994. Add the new sections AFTER line 993 (the closing div of Skills) and BEFORE line 995 (the closing div of the main content area).

## Code to Add

After the Skills section closing `</div>` and `)}`, add these sections:

```jsx
{/* Work History */}
{candidate.work_history && candidate.work_history.length > 0 && (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
      <Briefcase className="w-5 h-5 text-red-400" />
      Work History ({candidate.work_history.length})
    </h3>
    <div className="space-y-3">
      {candidate.work_history.map((job, idx) => {
        // Handle nested object structures from Explorium API
        const jobTitle = typeof job.title === 'object' ? job.title?.name : (job.title || job.job_title);
        const companyName = typeof job.company === 'object' ? job.company?.name : (job.company || job.company_name);
        const description = job.summary || job.description;

        return (
          <div key={idx} className="flex gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
              <Briefcase className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{jobTitle || 'Unknown Position'}</p>
              <p className="text-sm text-white/60">{companyName || 'Unknown Company'}</p>
              {(job.start_date || job.end_date) && (
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {job.start_date} - {job.end_date || 'Present'}
                </p>
              )}
              {description && (
                <p className="text-sm text-white/50 mt-2 line-clamp-2">{description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* Education */}
{candidate.education && candidate.education.length > 0 && (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
      <GraduationCap className="w-5 h-5 text-purple-400" />
      Education ({candidate.education.length})
    </h3>
    <div className="space-y-3">
      {candidate.education.map((edu, idx) => {
        // Handle nested object structures from Explorium API
        const schoolName = typeof edu.school === 'object' ? edu.school?.name : (edu.school || edu.institution);
        const degreeName = Array.isArray(edu.degrees) ? edu.degrees.join(', ') : (edu.degree || edu.field_of_study || edu.field);
        const majorName = Array.isArray(edu.majors) ? edu.majors.join(', ') : edu.major;
        const displayDegree = degreeName || majorName || 'Degree';

        return (
          <div key={idx} className="flex gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white">{displayDegree}</p>
              <p className="text-sm text-white/60">{schoolName || 'Unknown Institution'}</p>
              {(edu.year || edu.end_date || edu.graduation_year) && (
                <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {edu.year || edu.end_date || edu.graduation_year}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* Certifications */}
{candidate.certifications && candidate.certifications.length > 0 && (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
      <BadgeCheck className="w-5 h-5 text-green-400" />
      Certifications ({candidate.certifications.length})
    </h3>
    <div className="space-y-2">
      {candidate.certifications.map((cert, idx) => {
        // Handle both string and object formats
        const certName = typeof cert === 'object' ? (cert?.name || cert?.title || JSON.stringify(cert)) : String(cert);
        const certIssuer = typeof cert === 'object' ? cert?.issuer : null;
        const certDate = typeof cert === 'object' ? (cert?.date || cert?.issued_date) : null;

        return (
          <div key={idx} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
            <BadgeCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{certName}</p>
              {certIssuer && <p className="text-xs text-white/50">{certIssuer}</p>}
              {certDate && <p className="text-xs text-white/40">{certDate}</p>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* Interests */}
{candidate.interests && candidate.interests.length > 0 && (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
      <Heart className="w-5 h-5 text-pink-400" />
      Interests ({candidate.interests.length})
    </h3>
    <div className="flex flex-wrap gap-2">
      {candidate.interests.map((interest, idx) => {
        // Handle both string and object formats
        const interestName = typeof interest === 'object' ? (interest?.name || interest?.interest || JSON.stringify(interest)) : String(interest);
        return (
          <Badge key={idx} className="bg-pink-500/10 border-pink-500/20 text-pink-400 px-3 py-1.5">
            {interestName}
          </Badge>
        );
      })}
    </div>
  </div>
)}
```

## Required Icon Imports

Make sure these icons are imported at the top of the file (add any that are missing):

```jsx
import {
  // ... existing imports ...
  Briefcase,
  GraduationCap,
  BadgeCheck,
  Heart,
  Calendar
} from "lucide-react";
```

Check the existing imports and only add the ones that are missing.

## Verification Steps
After implementation:
1. Navigate to `/talentcandidateprofile?id=d6bb5e33-afe2-45a9-892d-bd120fa8b78f` (Arie Droogendijk)
2. Scroll down in the Overview tab
3. Verify you see: Skills, Work History (1), Education (3), and any other populated sections
4. The styling should match the existing Skills section

## Important Notes
- The sections should only render if data exists (conditional rendering is already in the code)
- Handle nested object structures from Explorium API (job.title could be string or {name: string})
- Match the existing styling conventions used in the file (bg-white/[0.03], rounded-2xl, etc.)
- The data is already being saved by enrichContact() - we just need to display it
