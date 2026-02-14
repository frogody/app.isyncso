import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Filter, Edit, Archive, Send,
  Eye, Clock, CheckCircle, AlertTriangle, BookOpen,
  LayoutGrid, X, ChevronDown, Save, Globe, Users,
  FileCheck, ShieldCheck, AlertCircle, Sparkles,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import {
  SentinelCard,
  SentinelCardSkeleton,
  SentinelButton,
  SentinelBadge,
  SentinelPageTransition,
  StatCard,
  SentinelInput,
} from '@/components/sentinel/ui';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Policy Templates
// ---------------------------------------------------------------------------

const POLICY_TEMPLATES = [
  {
    id: 'info-security',
    title: 'Information Security Policy',
    category: 'security',
    description: 'Overarching information security objectives and principles',
    content: `# Information Security Policy

## 1. Purpose

The purpose of this policy is to establish the overarching information security objectives, principles, and responsibilities for [Company Name]. This policy protects the confidentiality, integrity, and availability of all information assets owned, controlled, or processed by the organization.

## 2. Scope

This policy applies to all employees, contractors, consultants, temporary staff, and other workers at [Company Name], including all personnel affiliated with third parties who access the organization's information systems. It covers all information assets regardless of format — digital, physical, or verbal.

## 3. Policy Statement

[Company Name] is committed to preserving the security of its information assets. All information shall be classified according to its sensitivity and protected with appropriate controls. Access to information shall be granted on a need-to-know basis and in accordance with the principle of least privilege. Security incidents shall be reported immediately through the established incident reporting channels. All employees are responsible for safeguarding information in their custody. Regular risk assessments shall be conducted to identify and mitigate threats. Compliance with applicable laws, regulations, and contractual obligations shall be maintained at all times.

## 4. Roles & Responsibilities

**Chief Information Security Officer (CISO):** Owns this policy, ensures its implementation, and reports on the state of information security to executive leadership.

**IT Security Team:** Implements technical controls, monitors for threats, conducts vulnerability assessments, and manages security tooling.

**Department Managers:** Ensure their teams understand and comply with this policy. Identify department-specific information assets and ensure they are appropriately protected.

**All Employees:** Follow security procedures, complete mandatory security training, report incidents and suspicious activity, and protect credentials and access tokens.

**Human Resources:** Ensure security awareness is part of onboarding and offboarding. Coordinate with IT on access provisioning and de-provisioning.

## 5. Compliance

Violations of this policy may result in disciplinary action, up to and including termination of employment and legal proceedings. Compliance will be monitored through regular audits, automated scanning, and periodic reviews. All exceptions to this policy must be documented, risk-assessed, and approved by the CISO.

## 6. Review

This policy shall be reviewed at least annually or whenever significant changes occur to the organization's threat landscape, business operations, or regulatory environment. The CISO is responsible for initiating the review process and ensuring updates are approved by executive leadership.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: CISO | Version: 1.0*`,
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use Policy',
    category: 'security',
    description: 'Rules for acceptable use of company systems and data',
    content: `# Acceptable Use Policy

## 1. Purpose

This policy defines acceptable and unacceptable use of [Company Name]'s information technology resources. It exists to protect the organization, its employees, and its partners from the consequences of illegal or damaging actions by individuals, whether knowingly or unknowingly.

## 2. Scope

This policy applies to all employees, contractors, consultants, and temporary workers at [Company Name] who have access to company-owned or managed IT resources, including but not limited to computers, networks, email systems, cloud services, mobile devices, and software applications.

## 3. Policy Statement

All IT resources provided by [Company Name] are the property of the organization and are to be used primarily for business purposes. Limited personal use is permitted provided it does not interfere with work duties, consume excessive resources, or violate any other company policy. Users shall not install unauthorized software, disable security controls, or attempt to bypass access restrictions. All data created, transmitted, or stored on company systems is subject to monitoring and auditing. Users must not access, download, or distribute illegal, offensive, or inappropriate content. Sharing of credentials, accounts, or authentication tokens with others is strictly prohibited. Users must lock workstations when unattended and log off at the end of each workday.

## 4. Roles & Responsibilities

**IT Department:** Provides and maintains IT resources, monitors for policy violations, and enforces technical controls that support acceptable use.

**Managers:** Ensure their direct reports are aware of and comply with this policy. Address any suspected violations within their teams.

**All Users:** Use company IT resources responsibly, report any misuse or security concerns, and comply with all related policies and procedures.

**Legal/Compliance Team:** Advises on regulatory requirements affecting acceptable use and assists with investigations of policy violations.

## 5. Compliance

Non-compliance with this policy may result in disciplinary action, including written warnings, suspension of access, termination, and where applicable, civil or criminal prosecution. The IT Security team will monitor compliance through network monitoring tools, endpoint detection, and periodic audits.

## 6. Review

This policy will be reviewed annually by the IT Security team in conjunction with the Legal/Compliance team. Updates will be communicated to all employees and incorporated into onboarding materials.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: IT Security | Version: 1.0*`,
  },
  {
    id: 'access-control',
    title: 'Access Control Policy',
    category: 'security',
    description: 'Logical and physical access management procedures',
    content: `# Access Control Policy

## 1. Purpose

This policy establishes the requirements for controlling logical and physical access to [Company Name]'s information systems, applications, and facilities. Effective access control is essential to protecting sensitive data and ensuring compliance with regulatory requirements.

## 2. Scope

This policy applies to all information systems, applications, databases, network resources, and physical facilities owned or operated by [Company Name]. It covers all users including employees, contractors, and third-party vendors who require access to company resources.

## 3. Policy Statement

Access to all information systems shall follow the principle of least privilege — users receive only the minimum access necessary to perform their job functions. All access must be formally requested, approved by the appropriate manager, and documented. Multi-factor authentication (MFA) shall be enforced for all remote access, privileged accounts, and systems containing sensitive data. User access rights shall be reviewed quarterly by system owners and adjusted as needed. Privileged access (administrator, root, superuser) shall be strictly limited, individually assigned, and subject to enhanced monitoring. Service accounts must be documented, have strong credentials, and be reviewed semi-annually. Access shall be revoked immediately upon termination and adjusted within 24 hours of role changes.

## 4. Roles & Responsibilities

**System Owners:** Approve and review access to their systems. Ensure access control lists are current and appropriate.

**IT Operations:** Provision and de-provision access based on approved requests. Maintain access management tooling and audit trails.

**HR Department:** Notify IT promptly of all new hires, role changes, transfers, and terminations to ensure timely access provisioning and revocation.

**All Users:** Request only necessary access, protect their credentials, and report any unauthorized access attempts or suspicious activity.

**Internal Audit:** Conduct periodic access reviews and report findings to management.

## 5. Compliance

Access control violations, including unauthorized access attempts, credential sharing, and failure to revoke access, will result in disciplinary action. Automated access logging and periodic audits will be used to verify compliance. All exceptions must be documented and approved by the CISO.

## 6. Review

This policy shall be reviewed annually. Access reviews shall be conducted quarterly for critical systems and semi-annually for all others.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: IT Security | Version: 1.0*`,
  },
  {
    id: 'data-classification',
    title: 'Data Classification Policy',
    category: 'data',
    description: 'Classification levels and handling requirements for data',
    content: `# Data Classification Policy

## 1. Purpose

This policy establishes a framework for classifying [Company Name]'s data based on its sensitivity and the impact of unauthorized disclosure. Proper classification ensures that data is protected with controls commensurate with its value and risk.

## 2. Scope

This policy applies to all data created, collected, processed, stored, or transmitted by [Company Name], regardless of format or storage medium. It covers data in all states: at rest, in transit, and in use. All employees, contractors, and third parties who handle company data must comply with this policy.

## 3. Policy Statement

All data at [Company Name] shall be classified into one of four levels: **Public** — Information approved for unrestricted distribution (e.g., marketing materials, press releases). **Internal** — Information intended for internal use that would cause minimal harm if disclosed (e.g., internal memos, org charts). **Confidential** — Sensitive business information whose disclosure could cause significant harm (e.g., financial records, contracts, employee PII). **Restricted** — Highly sensitive data subject to legal or regulatory protection whose disclosure could cause severe damage (e.g., trade secrets, health records, payment card data). Data owners are responsible for classifying their data and ensuring appropriate labeling. Handling requirements for each classification level shall be documented in accompanying data handling procedures. Unclassified data shall be treated as Internal by default until formally classified.

## 4. Roles & Responsibilities

**Data Owners:** Classify data under their ownership, ensure proper labeling, and review classifications annually.

**Data Custodians (IT):** Implement and maintain technical controls appropriate to each classification level. Ensure storage and transmission comply with handling requirements.

**All Employees:** Handle data according to its classification, apply proper labeling, and report any suspected data mishandling.

**Privacy Officer:** Ensure classifications align with privacy regulations (GDPR, CCPA, etc.) and advise on classification for personal data.

## 5. Compliance

Failure to properly classify or handle data may result in disciplinary action, regulatory penalties, and reputational damage. Data handling audits will be conducted semi-annually. Incidents of data mishandling must be reported immediately.

## 6. Review

This policy and its associated data handling procedures shall be reviewed annually or upon significant changes to the regulatory environment or business operations.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: CISO / Privacy Officer | Version: 1.0*`,
  },
  {
    id: 'incident-response',
    title: 'Incident Response Plan',
    category: 'security',
    description: 'Procedures for detecting, responding to, and recovering from incidents',
    content: `# Incident Response Plan

## 1. Purpose

This plan establishes the procedures for detecting, responding to, containing, and recovering from information security incidents at [Company Name]. A well-defined incident response capability minimizes business disruption, reduces damage, and improves recovery time.

## 2. Scope

This plan covers all security incidents affecting [Company Name]'s information systems, networks, applications, and data. It applies to incidents originating from both internal and external sources, including but not limited to malware infections, unauthorized access, data breaches, denial-of-service attacks, social engineering, and insider threats.

## 3. Policy Statement

All security incidents shall be reported immediately upon detection through the designated reporting channels (security hotline, email, or ticketing system). The incident response process follows six phases: **Preparation** — Maintain readiness through training, tools, and procedures. **Identification** — Detect and confirm the occurrence of a security incident. **Containment** — Limit the scope and impact of the incident through short-term and long-term containment measures. **Eradication** — Remove the root cause and all artifacts of the incident from affected systems. **Recovery** — Restore affected systems and services to normal operation with validation. **Lessons Learned** — Conduct a post-incident review to identify improvements. All incidents shall be classified by severity (Critical, High, Medium, Low) to determine response priority and escalation requirements. Evidence shall be preserved following forensic best practices for potential legal proceedings.

## 4. Roles & Responsibilities

**Incident Response Team (IRT):** Coordinates and executes the response. Includes representatives from IT Security, IT Operations, Legal, and Communications.

**CISO / Security Manager:** Leads the IRT, makes escalation decisions, and communicates with executive leadership.

**IT Operations:** Provides technical support for containment, eradication, and recovery activities.

**Legal & Compliance:** Advises on regulatory notification requirements and evidence preservation.

**All Employees:** Report suspected incidents immediately. Preserve evidence — do not attempt to remediate independently.

## 5. Compliance

Failure to report security incidents promptly may result in disciplinary action. Regulatory notification requirements (e.g., GDPR 72-hour rule) must be met. Incident response tabletop exercises shall be conducted at least twice per year.

## 6. Review

This plan shall be reviewed after every significant incident and at least annually. Lessons learned shall be incorporated into updated procedures.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: CISO | Version: 1.0*`,
  },
  {
    id: 'business-continuity',
    title: 'Business Continuity Plan',
    category: 'resilience',
    description: 'Procedures for maintaining operations during disruptions',
    content: `# Business Continuity Plan

## 1. Purpose

This plan provides a framework for [Company Name] to prepare for, respond to, and recover from events that disrupt normal business operations. The goal is to ensure the continuity of critical business functions and minimize the impact of disruptions on customers, employees, and stakeholders.

## 2. Scope

This plan covers all critical business functions, supporting technology systems, facilities, and personnel at [Company Name]. It addresses a range of disruptive events including natural disasters, technology failures, cyber attacks, pandemics, supply chain disruptions, and loss of key personnel.

## 3. Policy Statement

[Company Name] shall maintain a comprehensive business continuity capability that includes: Identification and prioritization of critical business functions through a Business Impact Analysis (BIA). Defined Recovery Time Objectives (RTOs) and Recovery Point Objectives (RPOs) for each critical function. Documented recovery procedures for each critical function, including alternative work arrangements, manual workarounds, and technology recovery steps. Redundancy for critical infrastructure, including data backups, failover systems, and alternative communication channels. An emergency communication plan to notify employees, customers, partners, and regulators during a disruption. Mutual aid agreements and vendor contracts that support recovery needs. Regular testing of continuity plans through tabletop exercises, walkthroughs, and full-scale simulations.

## 4. Roles & Responsibilities

**Business Continuity Manager:** Maintains the BCP, coordinates testing, and oversees recovery activities during an event.

**Executive Leadership:** Approves the BCP, provides resources for continuity activities, and makes strategic decisions during disruptions.

**Department Heads:** Develop and maintain department-specific recovery procedures. Participate in BIA and testing activities.

**IT Department:** Maintains technology recovery capabilities, including backup systems, disaster recovery sites, and failover procedures.

**All Employees:** Familiarize themselves with their role in the BCP and participate in training and testing exercises.

## 5. Compliance

This plan shall comply with applicable regulatory requirements and industry standards (e.g., ISO 22301). Non-participation in BCP testing may result in corrective action. Post-event reviews shall assess plan effectiveness and identify improvements.

## 6. Review

The BCP shall be reviewed annually and updated after any significant organizational change, test exercise, or actual disruption event.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: Business Continuity Manager | Version: 1.0*`,
  },
  {
    id: 'data-retention',
    title: 'Data Retention Policy',
    category: 'privacy',
    description: 'Retention periods and disposal procedures for different data types',
    content: `# Data Retention Policy

## 1. Purpose

This policy defines the retention periods, storage requirements, and disposal procedures for different types of data at [Company Name]. Proper data retention ensures compliance with legal and regulatory requirements while minimizing the risks and costs associated with retaining data beyond its useful life.

## 2. Scope

This policy applies to all data created, received, maintained, or transmitted by [Company Name] in any format, including electronic files, emails, databases, paper documents, and backups. It covers data held by the organization directly and by third-party service providers on behalf of the organization.

## 3. Policy Statement

Data shall be retained only for as long as necessary to fulfill the purpose for which it was collected, or as required by applicable law, regulation, or contract. The following minimum retention periods apply: **Financial records** — 7 years from the end of the fiscal year. **Employee records** — Duration of employment plus 7 years. **Customer/prospect data** — Duration of the business relationship plus 3 years, subject to data subject requests. **Contracts and legal documents** — Duration of the contract plus 7 years. **Audit logs and security logs** — Minimum 1 year, maximum 3 years. **Marketing and communications data** — 3 years from last interaction. **Email correspondence** — 3 years unless subject to legal hold. When the retention period expires, data shall be securely disposed of using approved methods: degaussing, shredding, cryptographic erasure, or certified destruction. Legal holds override all retention schedules — data subject to litigation or regulatory investigation must be preserved until the hold is released.

## 4. Roles & Responsibilities

**Data Protection Officer (DPO):** Oversees this policy, approves retention schedules, and coordinates with Legal on holds.

**Data Owners:** Ensure data within their domain complies with retention schedules. Initiate disposal when retention periods expire.

**IT Department:** Implements automated retention controls, manages backup lifecycles, and performs secure data destruction.

**Legal Team:** Communicates litigation holds and advises on regulatory retention requirements.

## 5. Compliance

Failure to comply with retention schedules — whether retaining data too long or destroying it prematurely — may result in regulatory penalties and legal liability. Regular audits shall verify compliance with this policy.

## 6. Review

This policy shall be reviewed annually and updated to reflect changes in legal requirements, business operations, or data processing activities.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: DPO | Version: 1.0*`,
  },
  {
    id: 'vendor-management',
    title: 'Vendor Management Policy',
    category: 'security',
    description: 'Third-party risk assessment and ongoing management procedures',
    content: `# Vendor Management Policy

## 1. Purpose

This policy establishes the procedures for assessing, selecting, and managing third-party vendors who have access to [Company Name]'s data, systems, or facilities. Effective vendor management reduces supply chain risk and ensures that third parties meet the organization's security and compliance standards.

## 2. Scope

This policy applies to all third-party relationships where the vendor accesses, processes, stores, or transmits [Company Name]'s data, or where the vendor provides services critical to business operations. This includes cloud service providers, SaaS vendors, contractors, outsourced services, and managed service providers.

## 3. Policy Statement

All new vendor engagements involving access to company data or critical services must undergo a risk assessment prior to contract execution. Vendors shall be classified by risk tier: **Critical** — Access to Restricted or Confidential data, or providing essential business services. Full due diligence, SOC 2 / ISO 27001 review, annual reassessment. **Standard** — Access to Internal data or providing non-essential services. Questionnaire-based assessment, biennial reassessment. **Low** — No data access, minimal operational dependency. Basic review, reassessment upon contract renewal. All vendor contracts must include security requirements, data protection obligations, incident notification clauses, right-to-audit provisions, and termination/data return procedures. Vendor security posture shall be monitored continuously where possible (security ratings, breach notifications). Sub-processor chains must be documented and approved.

## 4. Roles & Responsibilities

**Procurement / Vendor Management Office:** Coordinates vendor assessments, maintains the vendor inventory, and tracks contract terms.

**IT Security:** Conducts technical security assessments, reviews vendor security documentation, and monitors vendor risk.

**Legal:** Reviews and negotiates contract terms including data protection addenda and SLAs.

**Business Owners:** Identify vendor needs, participate in risk assessments, and manage the day-to-day vendor relationship.

## 5. Compliance

Engaging vendors without completing the required risk assessment is a policy violation. Vendor compliance shall be verified through periodic reviews and audits. Non-compliant vendors will be placed on a remediation plan or terminated.

## 6. Review

This policy and the vendor inventory shall be reviewed annually. Critical vendor assessments shall be conducted annually.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: CISO / Procurement | Version: 1.0*`,
  },
  {
    id: 'change-management',
    title: 'Change Management Policy',
    category: 'security',
    description: 'Procedures for managing changes to systems and infrastructure',
    content: `# Change Management Policy

## 1. Purpose

This policy defines the procedures for requesting, evaluating, approving, and implementing changes to [Company Name]'s IT systems, infrastructure, applications, and configurations. Effective change management reduces the risk of service disruptions, security vulnerabilities, and unintended consequences from system modifications.

## 2. Scope

This policy applies to all changes to production IT environments, including but not limited to hardware installations, software deployments, configuration changes, network modifications, database schema changes, security policy updates, and cloud infrastructure changes. Emergency changes and standard pre-approved changes are addressed through expedited and streamlined processes respectively.

## 3. Policy Statement

All changes to production environments must follow the change management process. Changes shall be categorized as: **Standard** — Pre-approved, low-risk, routine changes with documented procedures (e.g., patch deployment, user provisioning). **Normal** — Changes that require review and approval by the Change Advisory Board (CAB). **Emergency** — Changes required to resolve critical incidents or security vulnerabilities. May be implemented with expedited approval and documented retroactively. Each change request must include: description, justification, risk assessment, rollback plan, testing evidence, and implementation schedule. Changes shall be tested in a non-production environment before deployment. Implementation windows shall be scheduled during low-impact periods unless urgency dictates otherwise. Post-implementation reviews shall verify that the change achieved its objectives without adverse effects.

## 4. Roles & Responsibilities

**Change Advisory Board (CAB):** Reviews and approves Normal change requests. Composed of IT, Security, and business stakeholders.

**Change Manager:** Oversees the change management process, maintains the change calendar, and ensures compliance with this policy.

**Change Requestor:** Submits the change request with all required documentation and performs or coordinates the implementation.

**IT Operations:** Implements approved changes, performs testing, and executes rollback procedures if necessary.

## 5. Compliance

Unauthorized changes — those implemented without following this process — are a serious policy violation and may result in disciplinary action. All changes are logged and auditable. Change management metrics shall be reported monthly.

## 6. Review

This policy shall be reviewed annually. The change management process effectiveness shall be evaluated quarterly using metrics such as change success rate, incident correlation, and emergency change frequency.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: Change Manager / IT Director | Version: 1.0*`,
  },
  {
    id: 'encryption',
    title: 'Encryption Policy',
    category: 'security',
    description: 'Encryption standards for data at rest and in transit',
    content: `# Encryption Policy

## 1. Purpose

This policy establishes the encryption standards and requirements for protecting [Company Name]'s data at rest, in transit, and in use. Encryption is a critical control for maintaining the confidentiality and integrity of sensitive information.

## 2. Scope

This policy applies to all data classified as Confidential or Restricted, and to all systems, applications, and communication channels used to store, process, or transmit such data. It covers data on company-managed devices, cloud services, databases, backups, email, and file transfers.

## 3. Policy Statement

**Data in Transit:** All data transmitted over public or untrusted networks must be encrypted using TLS 1.2 or higher. VPN connections shall use AES-256 or equivalent encryption. Email containing Confidential or Restricted data must use S/MIME or PGP encryption, or be transmitted via encrypted channels. API communications shall use HTTPS with certificate validation.

**Data at Rest:** Confidential and Restricted data stored in databases must use column-level or transparent data encryption (TDE). Full-disk encryption (FDE) must be enabled on all laptops, mobile devices, and removable media (BitLocker, FileVault, or equivalent). Cloud storage containing sensitive data must use server-side encryption with customer-managed keys where available. Backup media shall be encrypted to the same standard as the source data.

**Key Management:** Encryption keys shall be generated using cryptographically secure random number generators. Keys must be stored separately from the data they protect. Key rotation shall occur annually for data encryption keys and more frequently for session keys. Access to encryption keys shall be restricted to authorized personnel and systems. Compromised keys must be revoked and replaced immediately.

## 4. Roles & Responsibilities

**IT Security:** Defines encryption standards, manages key management systems, and audits encryption compliance.

**IT Operations / DevOps:** Implements encryption controls in infrastructure, applications, and cloud environments.

**Developers:** Integrate encryption into applications following approved standards. Never implement custom cryptographic algorithms.

**All Users:** Use encrypted channels for sensitive communications. Do not disable or bypass encryption controls.

## 5. Compliance

Use of deprecated or weak encryption algorithms (e.g., MD5, SHA-1, DES, SSLv3, TLS 1.0/1.1) is prohibited. Compliance shall be verified through automated scanning and periodic audits. Non-compliance may result in system isolation and disciplinary action.

## 6. Review

This policy shall be reviewed annually and updated when new encryption standards are published or vulnerabilities are discovered in current algorithms.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: CISO / IT Security | Version: 1.0*`,
  },
  {
    id: 'password',
    title: 'Password Policy',
    category: 'security',
    description: 'Password complexity, rotation, and management requirements',
    content: `# Password Policy

## 1. Purpose

This policy defines the requirements for creating, managing, and protecting passwords used to access [Company Name]'s information systems. Strong password practices are fundamental to preventing unauthorized access.

## 2. Scope

This policy applies to all accounts on all systems that are owned or managed by [Company Name], including user accounts, service accounts, administrator accounts, and accounts on third-party systems used for business purposes. It applies to all employees, contractors, and third parties with system access.

## 3. Policy Statement

**Password Complexity:** Passwords must be at least 14 characters in length. Passwords must include characters from at least three of the following: uppercase letters, lowercase letters, numbers, and special characters. Passwords must not contain the user's name, email address, or other personally identifiable information. Common passwords, dictionary words, and previously breached passwords (as checked against known breach databases) are prohibited.

**Password Management:** Passwords must not be reused across different systems or accounts. Password managers approved by IT Security shall be used to generate and store unique passwords. Passwords must never be shared, written down, stored in plaintext, or transmitted via unencrypted channels. Default passwords on all systems and devices must be changed before deployment.

**Multi-Factor Authentication (MFA):** MFA is required for all remote access, privileged accounts, email access, cloud services, and systems containing Confidential or Restricted data. MFA methods must use approved authenticator apps, hardware tokens, or biometrics. SMS-based MFA should be avoided where possible due to SIM-swapping risks.

**Service Accounts:** Service accounts must use strong, unique passwords or certificate-based authentication. Service account passwords must be rotated every 90 days. Service accounts must be documented in the service account inventory.

## 4. Roles & Responsibilities

**IT Security:** Enforces password complexity requirements through technical controls. Manages the approved password manager solution. Monitors for compromised credentials.

**IT Operations:** Configures password policies in directory services and applications. Manages service account credentials.

**All Users:** Create strong, unique passwords. Use the approved password manager. Enable MFA on all accounts that support it. Report suspected credential compromise immediately.

## 5. Compliance

Violations, including password sharing, use of weak passwords, or disabling MFA, may result in account suspension and disciplinary action. Automated password policy enforcement shall be implemented wherever technically feasible.

## 6. Review

This policy shall be reviewed annually and updated to align with current NIST guidelines and industry best practices.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: IT Security | Version: 1.0*`,
  },
  {
    id: 'remote-work',
    title: 'Remote Work Security Policy',
    category: 'security',
    description: 'Security requirements for remote and mobile workers',
    content: `# Remote Work Security Policy

## 1. Purpose

This policy defines the security requirements for [Company Name] employees who work remotely or use mobile devices to access company resources. Remote work introduces unique security risks that must be addressed through appropriate controls and user awareness.

## 2. Scope

This policy applies to all employees, contractors, and third parties who access [Company Name]'s information systems from locations outside of company-controlled facilities. It covers work-from-home arrangements, travel, co-working spaces, public locations, and any use of personal or company-issued mobile devices for business purposes.

## 3. Policy Statement

**Network Security:** Remote workers must use the company-provided VPN when accessing internal systems or Confidential data. Public Wi-Fi networks shall not be used for business activities unless the VPN is active. Home network routers should use WPA3 or WPA2 encryption with strong passwords.

**Device Security:** Only company-managed devices or approved personal devices enrolled in the Mobile Device Management (MDM) system may access company resources. All devices must have full-disk encryption enabled, current antivirus/endpoint protection software, automatic screen lock (maximum 5 minutes of inactivity), and the latest operating system and application updates installed.

**Physical Security:** Sensitive documents must not be printed at home unless absolutely necessary and must be shredded after use. Screens must be positioned to prevent shoulder surfing in public spaces. Devices must never be left unattended in vehicles, public spaces, or hotel rooms. Privacy screens are recommended for work in shared spaces.

**Data Handling:** Confidential and Restricted data must not be stored on personal devices or personal cloud storage services. Company-approved collaboration and file-sharing tools must be used for all business communications. Video calls discussing sensitive topics should be conducted in private settings.

## 4. Roles & Responsibilities

**IT Security:** Manages VPN infrastructure, MDM policies, and endpoint security. Provides security guidance for remote work setups.

**Managers:** Ensure remote workers are aware of and comply with this policy. Verify that remote work arrangements meet security requirements.

**Remote Workers:** Configure and maintain their work environment according to this policy. Report security incidents immediately. Complete remote work security training annually.

## 5. Compliance

Remote access may be suspended for users found in violation of this policy. Regular compliance checks will be performed through MDM reporting and endpoint security dashboards. Repeated violations may result in revocation of remote work privileges.

## 6. Review

This policy shall be reviewed annually and updated to reflect changes in remote work practices, threat landscape, and technology capabilities.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: IT Security / HR | Version: 1.0*`,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    category: 'privacy',
    description: 'How the organization collects, uses, and protects personal data',
    content: `# Privacy Policy

## 1. Purpose

This policy describes how [Company Name] collects, uses, stores, shares, and protects personal data. It demonstrates the organization's commitment to privacy and compliance with applicable data protection laws including the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other relevant legislation.

## 2. Scope

This policy applies to all personal data processed by [Company Name], whether relating to customers, prospects, employees, contractors, website visitors, or any other individuals. It covers personal data in all formats and across all processing activities, including collection, storage, use, transfer, and deletion.

## 3. Policy Statement

**Lawful Basis:** Personal data shall only be collected and processed when a valid lawful basis exists (consent, contract performance, legal obligation, vital interests, public interest, or legitimate interest). The lawful basis shall be documented for each processing activity.

**Data Minimization:** Only personal data that is necessary for the specified purpose shall be collected. Data shall not be retained longer than necessary for the stated purpose.

**Transparency:** Data subjects shall be informed about how their personal data is collected and used through clear, accessible privacy notices provided at the point of collection.

**Data Subject Rights:** [Company Name] shall facilitate the exercise of data subject rights, including the right to access, rectification, erasure, restriction of processing, data portability, and objection. Requests shall be responded to within 30 days.

**International Transfers:** Personal data shall not be transferred to countries outside of the European Economic Area (EEA) without appropriate safeguards such as Standard Contractual Clauses (SCCs), adequacy decisions, or Binding Corporate Rules.

**Breach Notification:** Personal data breaches shall be reported to the relevant supervisory authority within 72 hours where required. Affected data subjects shall be notified without undue delay when the breach is likely to result in high risk to their rights.

## 4. Roles & Responsibilities

**Data Protection Officer (DPO):** Oversees privacy compliance, serves as the point of contact for supervisory authorities, and advises the organization on data protection obligations.

**Data Controllers:** Determine the purposes and means of processing. Ensure processing activities comply with this policy.

**All Employees:** Handle personal data in accordance with this policy and report any privacy concerns or breaches to the DPO.

## 5. Compliance

Violations of this policy may result in disciplinary action, regulatory fines, and reputational damage. Data Protection Impact Assessments (DPIAs) shall be conducted for high-risk processing activities. Regular privacy audits shall verify compliance.

## 6. Review

This policy shall be reviewed annually and updated to reflect regulatory changes, new processing activities, and organizational developments.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: DPO | Version: 1.0*`,
  },
  {
    id: 'ai-governance',
    title: 'AI Governance Policy',
    category: 'ai-governance',
    description: 'Principles and procedures for responsible AI development and use',
    content: `# AI Governance Policy

## 1. Purpose

This policy establishes the principles, governance structures, and procedures for the responsible development, deployment, and use of artificial intelligence (AI) systems at [Company Name]. As AI becomes integral to business operations, robust governance ensures ethical use, regulatory compliance, and stakeholder trust.

## 2. Scope

This policy applies to all AI systems developed, procured, or used by [Company Name], including machine learning models, natural language processing systems, computer vision systems, recommendation engines, automated decision-making systems, and generative AI tools. It covers AI used internally and AI embedded in products or services delivered to customers.

## 3. Policy Statement

**Risk Classification:** All AI systems shall be classified by risk level (Prohibited, High-Risk, Limited-Risk, Minimal-Risk) in accordance with the EU AI Act and internal risk assessment criteria. High-risk systems require enhanced documentation, testing, and oversight.

**Transparency & Explainability:** AI systems that interact with humans shall disclose that interaction is with an AI. High-risk AI decisions shall be explainable — users and affected parties have the right to understand the basis for AI-driven decisions. Model documentation shall include purpose, training data sources, known limitations, and performance metrics.

**Fairness & Non-Discrimination:** AI systems shall be tested for bias across protected characteristics before deployment. Training data shall be assessed for representativeness and fairness. Ongoing monitoring shall detect and mitigate emergent bias.

**Human Oversight:** High-risk AI systems shall maintain meaningful human oversight. Critical decisions shall not be fully automated without human review. Override mechanisms shall be available for all automated decisions.

**Data Governance:** Training data shall comply with the Data Classification and Privacy policies. Synthetic data and data augmentation techniques shall be documented. Data provenance and lineage shall be maintained.

## 4. Roles & Responsibilities

**AI Governance Committee:** Approves high-risk AI deployments, sets organizational AI strategy, and resolves ethical concerns.

**AI System Owners:** Conduct risk assessments, maintain documentation, ensure compliance monitoring, and manage the AI lifecycle.

**Data Science / Engineering Teams:** Develop AI systems following governance requirements, conduct bias testing, and maintain model documentation.

**Legal & Compliance:** Advise on regulatory requirements (EU AI Act, GDPR), review AI-related contracts, and manage regulatory filings.

## 5. Compliance

AI systems deployed without proper risk assessment and approval are in violation of this policy. Non-compliant systems may be suspended from production. Compliance shall be monitored through the AI System Registry and periodic audits.

## 6. Review

This policy shall be reviewed annually and whenever significant regulatory changes occur (e.g., new EU AI Act implementing acts). The AI System Registry shall be updated continuously.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: AI Governance Committee / CISO | Version: 1.0*`,
  },
  {
    id: 'dpia',
    title: 'Data Protection Impact Assessment Template',
    category: 'privacy',
    description: 'Template for conducting DPIAs on high-risk processing activities',
    content: `# Data Protection Impact Assessment (DPIA) Template

## 1. Purpose

This template provides a structured approach for conducting Data Protection Impact Assessments (DPIAs) at [Company Name] as required by Article 35 of the GDPR. DPIAs help identify and minimize data protection risks associated with high-risk processing activities before they are implemented.

## 2. Scope

A DPIA is required when processing is likely to result in a high risk to the rights and freedoms of data subjects. This includes: systematic and extensive profiling with significant effects; large-scale processing of special category data; systematic monitoring of publicly accessible areas; use of new technologies for processing personal data; automated decision-making with legal or similarly significant effects; and large-scale processing of children's data.

## 3. Policy Statement

**Step 1 — Describe the Processing:** Document the nature, scope, context, and purpose of the processing. Identify the categories of personal data, data subjects, recipients, and retention periods. Describe the data flows from collection to deletion.

**Step 2 — Assess Necessity & Proportionality:** Confirm the lawful basis for processing. Evaluate whether the processing is necessary and proportionate to the stated purpose. Consider whether the purpose could be achieved with less data or less intrusive means.

**Step 3 — Identify and Assess Risks:** Catalog potential risks to data subjects including unauthorized access, data loss, inaccurate decisions, discrimination, and loss of control over personal data. Assess the likelihood and severity of each risk. Consider both the impact on individuals and on the organization.

**Step 4 — Identify Mitigation Measures:** For each identified risk, document the technical and organizational measures that will reduce the risk to an acceptable level. Examples include encryption, access controls, pseudonymization, data minimization, consent mechanisms, and audit logging.

**Step 5 — Sign-off and Record:** Document the DPO's advice and whether it was followed. Record the decision to proceed, modify, or abandon the processing activity. Maintain the DPIA as a living document throughout the processing lifecycle.

## 4. Roles & Responsibilities

**Data Protection Officer (DPO):** Advises on whether a DPIA is required, provides guidance during the assessment, and reviews the completed DPIA.

**Project / System Owner:** Initiates the DPIA, provides processing details, implements mitigation measures, and maintains the DPIA document.

**IT Security:** Assesses technical risks, recommends technical controls, and validates implementation of mitigation measures.

**Legal:** Advises on lawful basis, regulatory requirements, and consultation obligations with supervisory authorities.

## 5. Compliance

Processing activities requiring a DPIA must not proceed until the assessment is completed and approved. Where residual risks remain high after mitigation, consultation with the relevant supervisory authority is required. All DPIAs shall be retained for the duration of the processing activity.

## 6. Review

Each DPIA shall be reviewed whenever there is a significant change to the processing activity, when new risks are identified, or at least every two years. This template shall be reviewed annually for alignment with regulatory guidance.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: DPO | Version: 1.0*`,
  },
  {
    id: 'vulnerability-management',
    title: 'Vulnerability Management Policy',
    category: 'security',
    description: 'Procedures for identifying, assessing, and remediating vulnerabilities',
    content: `# Vulnerability Management Policy

## 1. Purpose

This policy establishes the procedures for identifying, assessing, prioritizing, and remediating security vulnerabilities in [Company Name]'s information systems. A proactive vulnerability management program reduces the attack surface and minimizes the window of exposure to known threats.

## 2. Scope

This policy applies to all information systems, applications, network devices, cloud resources, and infrastructure components owned or managed by [Company Name]. It covers both internally developed applications and third-party software, including operating systems, libraries, and dependencies.

## 3. Policy Statement

**Scanning:** Automated vulnerability scans shall be conducted at least weekly for all external-facing systems and monthly for internal systems. New systems must be scanned before deployment to production. Web application scanning shall be performed monthly, with dynamic application security testing (DAST) and static application security testing (SAST) integrated into the SDLC.

**Prioritization:** Vulnerabilities shall be prioritized using the Common Vulnerability Scoring System (CVSS) and contextual risk factors including asset criticality, exploitability, and exposure. Remediation timelines: **Critical (CVSS 9.0-10.0)** — 24 hours. **High (CVSS 7.0-8.9)** — 7 days. **Medium (CVSS 4.0-6.9)** — 30 days. **Low (CVSS 0.1-3.9)** — 90 days or next maintenance window.

**Remediation:** Patches shall be tested in a staging environment before production deployment. Where patching is not immediately possible, compensating controls (WAF rules, network segmentation, access restrictions) must be implemented. Vulnerability exceptions must be documented, risk-accepted by system owners, and reviewed quarterly.

**Threat Intelligence:** The security team shall monitor threat intelligence feeds, vendor advisories, and CVE databases for newly disclosed vulnerabilities. Zero-day vulnerabilities shall trigger an emergency response process.

## 4. Roles & Responsibilities

**IT Security:** Manages scanning tools, analyzes results, prioritizes vulnerabilities, and tracks remediation progress.

**IT Operations / DevOps:** Applies patches and remediations within the defined timelines. Validates that remediation is successful.

**System Owners:** Accept risk for exceptions, participate in prioritization decisions, and ensure their systems are included in scanning scope.

**Development Teams:** Remediate application-level vulnerabilities. Integrate security testing into CI/CD pipelines.

## 5. Compliance

Failure to remediate Critical and High vulnerabilities within defined timelines will be escalated to executive leadership. Vulnerability management metrics shall be reported monthly. Compliance will be verified through internal audits and penetration testing.

## 6. Review

This policy shall be reviewed annually. Remediation timelines and scanning frequency shall be adjusted based on the evolving threat landscape.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: IT Security | Version: 1.0*`,
  },
  {
    id: 'network-security',
    title: 'Network Security Policy',
    category: 'security',
    description: 'Network architecture, segmentation, and monitoring requirements',
    content: `# Network Security Policy

## 1. Purpose

This policy defines the requirements for securing [Company Name]'s network infrastructure. A properly secured network is the foundation for protecting information assets against unauthorized access, data exfiltration, and service disruption.

## 2. Scope

This policy applies to all network infrastructure owned or managed by [Company Name], including local area networks (LANs), wide area networks (WANs), wireless networks, virtual private networks (VPNs), cloud virtual networks, software-defined networks (SDNs), and all interconnected devices and services.

## 3. Policy Statement

**Network Architecture:** The network shall be designed with defense-in-depth principles. Network segmentation shall isolate critical systems, sensitive data environments, development/test environments, guest/visitor networks, and IoT devices into separate network zones. A demilitarized zone (DMZ) shall separate internet-facing services from internal networks.

**Perimeter Security:** Next-generation firewalls shall be deployed at all network boundaries. Intrusion Detection and Prevention Systems (IDS/IPS) shall monitor network traffic for malicious activity. Web Application Firewalls (WAFs) shall protect all internet-facing web applications. All inbound and outbound traffic shall be logged and monitored.

**Wireless Security:** Enterprise wireless networks shall use WPA3 or WPA2-Enterprise with 802.1X authentication. Guest wireless networks shall be isolated from internal networks. Rogue access point detection shall be enabled. Wireless network configurations shall be reviewed quarterly.

**Monitoring & Logging:** Network traffic shall be monitored continuously using a Security Information and Event Management (SIEM) system. Network flow data shall be collected and retained for a minimum of 90 days. Anomaly detection shall be employed to identify unusual traffic patterns. Alert thresholds and escalation procedures shall be documented and tested.

## 4. Roles & Responsibilities

**Network Engineering:** Designs, implements, and maintains network infrastructure in accordance with this policy.

**IT Security:** Defines security requirements, monitors network security controls, and investigates security events.

**IT Operations:** Manages day-to-day network operations, applies firmware updates, and maintains network device configurations.

**All Users:** Connect only authorized devices to the network. Report network performance issues or suspicious activity.

## 5. Compliance

Unauthorized network devices or modifications to network infrastructure are prohibited. Network security audits and penetration tests shall be conducted at least annually. Non-compliance may result in device isolation and disciplinary action.

## 6. Review

This policy shall be reviewed annually and updated to reflect changes in network architecture, threat landscape, or business requirements.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: Network Engineering / IT Security | Version: 1.0*`,
  },
  {
    id: 'physical-security',
    title: 'Physical Security Policy',
    category: 'security',
    description: 'Physical access controls and environmental protections',
    content: `# Physical Security Policy

## 1. Purpose

This policy establishes the physical security requirements for [Company Name]'s facilities, equipment, and information assets. Physical security controls protect against unauthorized access, theft, damage, and environmental hazards that could compromise the confidentiality, integrity, and availability of information.

## 2. Scope

This policy applies to all [Company Name] facilities including offices, data centers, server rooms, storage facilities, and co-located equipment. It also covers equipment taken off-site and applies to all employees, contractors, visitors, and third parties who access company facilities.

## 3. Policy Statement

**Facility Access:** All facilities shall implement layered access controls proportionate to the sensitivity of the area. Access control systems (badge readers, biometric scanners) shall be deployed at all entry points. Visitors must sign in, be issued a temporary badge, and be escorted at all times in restricted areas. Access badges must not be shared or transferred. Lost or stolen badges must be reported immediately for deactivation. Access privileges shall be reviewed quarterly and revoked upon role change or termination.

**Restricted Areas:** Server rooms, data centers, network closets, and areas containing sensitive equipment shall have enhanced access controls. Access shall be limited to authorized personnel with a documented business need. Entry and exit shall be logged with timestamp and identity. Environmental controls (HVAC, fire suppression, water detection) shall be monitored continuously.

**Equipment Security:** All computing equipment shall be secured against theft (cable locks, locked cabinets). Decommissioned equipment must have all data securely wiped before disposal or repurposing. Media containing sensitive data shall be stored in locked containers when not in use. Equipment removal from facilities must be authorized and logged.

**Environmental Controls:** Facilities shall be equipped with fire detection and suppression systems. Uninterruptible Power Supply (UPS) and backup generators shall protect critical infrastructure. Temperature and humidity monitoring shall ensure optimal conditions for equipment. Water detection systems shall be installed in areas with water risk.

## 4. Roles & Responsibilities

**Facilities Management:** Manages physical access systems, maintains environmental controls, and coordinates with security personnel.

**IT Security:** Defines physical security requirements for IT infrastructure, reviews access logs, and investigates security incidents.

**Reception / Security Guard Staff:** Manages visitor sign-in, monitors CCTV, and responds to physical security alerts.

**All Employees:** Wear badges visibly, challenge unescorted visitors, secure sensitive materials, and report physical security concerns.

## 5. Compliance

Tailgating, propping doors open, or sharing access credentials are policy violations subject to disciplinary action. Physical security audits shall be conducted annually. CCTV footage shall be retained for a minimum of 30 days.

## 6. Review

This policy shall be reviewed annually and updated to reflect facility changes, security incidents, or evolving threats.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: Facilities / IT Security | Version: 1.0*`,
  },
  {
    id: 'risk-management',
    title: 'Risk Management Framework',
    category: 'security',
    description: 'Procedures for identifying, assessing, and treating information security risks',
    content: `# Risk Management Framework

## 1. Purpose

This framework establishes the methodology for identifying, assessing, treating, and monitoring information security risks at [Company Name]. Systematic risk management ensures that security investments are prioritized based on actual threats and business impact, and that residual risks are understood and accepted by appropriate stakeholders.

## 2. Scope

This framework applies to all information assets, business processes, technology systems, and third-party relationships within [Company Name]. It covers risks arising from internal and external threats, including cyber attacks, insider threats, regulatory changes, technology failures, natural disasters, and human error.

## 3. Policy Statement

**Risk Identification:** Risks shall be identified through multiple channels including threat intelligence, vulnerability assessments, audit findings, incident analysis, business impact assessments, and stakeholder input. A comprehensive risk register shall be maintained and updated continuously.

**Risk Assessment:** Each identified risk shall be assessed for likelihood (Rare, Unlikely, Possible, Likely, Almost Certain) and impact (Negligible, Minor, Moderate, Major, Catastrophic). Risk scores shall be calculated as Likelihood times Impact and plotted on a risk heat map. Qualitative and quantitative assessment methods shall be used as appropriate.

**Risk Treatment:** Risks shall be treated through one or more strategies: **Mitigate** — implement controls to reduce likelihood or impact. **Transfer** — shift risk through insurance or contractual arrangements. **Accept** — formally acknowledge and document residual risk. **Avoid** — eliminate the risk by ceasing the associated activity. Treatment decisions shall be documented with justification, responsible owner, and implementation timeline.

**Risk Monitoring:** The risk register shall be reviewed monthly by the security team and quarterly by the Risk Committee. Key Risk Indicators (KRIs) shall be defined and monitored for each high-priority risk. Risk assessments shall be refreshed annually or upon significant change.

## 4. Roles & Responsibilities

**Risk Committee:** Provides governance and oversight. Reviews the risk register quarterly. Approves risk acceptance decisions for high and critical risks.

**CISO / Risk Manager:** Maintains the risk management framework, facilitates risk assessments, and reports risk posture to leadership.

**Risk Owners:** Accept responsibility for managing specific risks. Implement and monitor treatment plans. Report status to the Risk Manager.

**All Departments:** Participate in risk identification and assessment activities. Implement controls relevant to their operations.

## 5. Compliance

All high and critical risks must have documented treatment plans. Risk acceptance decisions for critical risks require executive-level sign-off. The risk register and treatment plans are subject to internal and external audit. Non-compliance with agreed treatment plans will be escalated.

## 6. Review

This framework shall be reviewed annually. The risk register shall be reviewed continuously with a formal quarterly review cycle.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: CISO / Risk Manager | Version: 1.0*`,
  },
  {
    id: 'sdlc',
    title: 'Secure Development Lifecycle Policy',
    category: 'security',
    description: 'Security practices integrated into the software development process',
    content: `# Secure Development Lifecycle (SDLC) Policy

## 1. Purpose

This policy integrates security practices into every phase of [Company Name]'s software development lifecycle. By embedding security from design through deployment and maintenance, the organization reduces vulnerabilities, lowers remediation costs, and delivers more secure products and services.

## 2. Scope

This policy applies to all software developed internally at [Company Name], including web applications, mobile applications, APIs, microservices, infrastructure-as-code, automation scripts, and integrations. It also applies to significant modifications of existing applications and the selection of third-party software components and libraries.

## 3. Policy Statement

**Planning & Requirements:** Security requirements shall be defined alongside functional requirements. Threat modeling shall be performed during the design phase for all new applications and major features. Data classification and privacy impact assessment shall inform security requirements. Compliance requirements (GDPR, PCI-DSS, SOC 2, etc.) shall be identified early.

**Secure Coding:** Developers shall follow secure coding guidelines (OWASP Top 10, SANS Top 25). Input validation, output encoding, parameterized queries, and proper error handling are mandatory. Secrets (API keys, passwords, tokens) shall never be committed to source code repositories. Code review is required before merging to main branches, with security as an explicit review criterion.

**Testing:** Static Application Security Testing (SAST) shall be integrated into the CI/CD pipeline. Dynamic Application Security Testing (DAST) shall be performed on staging environments before production releases. Software Composition Analysis (SCA) shall identify vulnerabilities in open-source dependencies. Penetration testing shall be conducted for major releases and annually for critical applications.

**Deployment & Operations:** Production deployments shall follow the Change Management Policy. Security headers, HTTPS enforcement, and logging shall be verified before release. Container images shall be scanned for vulnerabilities before deployment. Runtime application self-protection (RASP) or web application firewalls (WAF) shall be deployed for internet-facing applications.

**Dependency Management:** Open-source components shall be approved through a software supply chain review. Dependency versions shall be tracked and updated when security patches are available. License compliance shall be verified for all third-party components.

## 4. Roles & Responsibilities

**Development Teams:** Follow secure coding practices, address security findings in code reviews, remediate vulnerabilities found in testing.

**Security Champions:** Embedded in development teams to provide day-to-day security guidance and serve as the liaison to the security team.

**IT Security / AppSec Team:** Maintains security testing tools, conducts penetration tests, reviews threat models, and provides training.

**Engineering Management:** Ensures development teams have time and resources allocated for security activities. Tracks remediation of security findings.

## 5. Compliance

Applications with unresolved Critical or High security findings shall not be deployed to production. Security testing results and remediation actions shall be documented and auditable. Developers shall complete secure coding training annually.

## 6. Review

This policy shall be reviewed annually. Secure coding guidelines and testing tools shall be updated to reflect emerging threats and new technologies.

---

*Last reviewed: [Date] | Next review: [Date] | Owner: Engineering / IT Security | Version: 1.0*`,
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLICY_STATUSES = ['draft', 'review', 'approved', 'published', 'archived'];
const POLICY_CATEGORIES = ['security', 'privacy', 'data', 'resilience', 'ai-governance'];
const FRAMEWORK_OPTIONS = [
  'ISO 27001', 'SOC 2', 'GDPR', 'NIST CSF', 'EU AI Act',
  'PCI-DSS', 'HIPAA', 'CCPA', 'ISO 22301', 'CIS Controls',
];

const STATUS_BADGE_VARIANT = {
  draft: 'neutral',
  review: 'warning',
  approved: 'primary',
  published: 'success',
  archived: 'neutral',
};

const STATUS_LABELS = {
  draft: 'Draft',
  review: 'In Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

const CATEGORY_LABELS = {
  security: 'Security',
  privacy: 'Privacy',
  data: 'Data',
  resilience: 'Resilience',
  'ai-governance': 'AI Governance',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function renderMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-6 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^---$/gim, '<hr class="border-zinc-700 my-4" />')
    .replace(/\n{2,}/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />');
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CompliancePolicies() {
  const { user } = useUser();
  const { st } = useTheme();

  // Data state
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  // Editor form
  const [editorForm, setEditorForm] = useState({
    title: '',
    content: '',
    category: 'security',
    status: 'draft',
    framework_link: '',
    version: 1,
  });
  const [editorTab, setEditorTab] = useState('edit'); // 'edit' | 'preview'
  const [saving, setSaving] = useState(false);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const fetchPolicies = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('compliance_policies')
        .select('*')
        .eq('company_id', user.company_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPolicies(data || []);
    } catch (err) {
      console.error('Failed to load policies:', err);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = policies.length;
    const published = policies.filter(p => p.status === 'published').length;
    const pendingReview = policies.filter(p => p.status === 'review').length;
    const overdueCount = policies.filter(p => p.next_review_date && isOverdue(p.next_review_date) && p.status !== 'archived').length;
    return { total, published, pendingReview, overdueCount };
  }, [policies]);

  // -----------------------------------------------------------------------
  // Filtering
  // -----------------------------------------------------------------------

  const filteredPolicies = useMemo(() => {
    let result = [...policies];
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.owner_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [policies, statusFilter, categoryFilter, searchQuery]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const openEditor = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setEditorForm({
        title: policy.title || '',
        content: policy.content || '',
        category: policy.category || 'security',
        status: policy.status || 'draft',
        framework_link: policy.framework_link || '',
        version: policy.version || 1,
      });
    } else {
      setEditingPolicy(null);
      setEditorForm({
        title: '',
        content: '',
        category: 'security',
        status: 'draft',
        framework_link: '',
        version: 1,
      });
    }
    setEditorTab('edit');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingPolicy(null);
  };

  const savePolicy = async (publishNow = false) => {
    if (!editorForm.title.trim()) {
      toast.error('Policy title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: editorForm.title.trim(),
        content: editorForm.content,
        category: editorForm.category,
        status: publishNow ? 'published' : editorForm.status,
        framework_link: editorForm.framework_link || null,
        version: editorForm.version,
        company_id: user.company_id,
        owner_id: user.id,
        owner_name: user.full_name || user.email || 'Unknown',
        updated_at: new Date().toISOString(),
      };

      if (publishNow) {
        payload.published_at = new Date().toISOString();
        // Set next review to 1 year from now
        const nextReview = new Date();
        nextReview.setFullYear(nextReview.getFullYear() + 1);
        payload.next_review_date = nextReview.toISOString();
      }

      if (editingPolicy) {
        const { error } = await supabase
          .from('compliance_policies')
          .update(payload)
          .eq('id', editingPolicy.id);
        if (error) throw error;
        toast.success(publishNow ? 'Policy published' : 'Policy updated');
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('compliance_policies')
          .insert(payload);
        if (error) throw error;
        toast.success(publishNow ? 'Policy created & published' : 'Policy created');
      }

      closeEditor();
      fetchPolicies();
    } catch (err) {
      console.error('Failed to save policy:', err);
      toast.error('Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const publishPolicy = async (policy) => {
    try {
      const nextReview = new Date();
      nextReview.setFullYear(nextReview.getFullYear() + 1);
      const { error } = await supabase
        .from('compliance_policies')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          next_review_date: nextReview.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', policy.id);
      if (error) throw error;
      toast.success(`"${policy.title}" published`);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to publish policy:', err);
      toast.error('Failed to publish policy');
    }
  };

  const archivePolicy = async (policy) => {
    try {
      const { error } = await supabase
        .from('compliance_policies')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', policy.id);
      if (error) throw error;
      toast.success(`"${policy.title}" archived`);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to archive policy:', err);
      toast.error('Failed to archive policy');
    }
  };

  const createFromTemplate = (template) => {
    setTemplateGalleryOpen(false);
    setEditingPolicy(null);
    setEditorForm({
      title: template.title,
      content: template.content,
      category: template.category,
      status: 'draft',
      framework_link: '',
      version: 1,
    });
    setEditorTab('edit');
    setEditorOpen(true);
  };

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className={cn('min-h-screen p-4', st('bg-slate-50', 'bg-black'))}>
        <div className="max-w-7xl mx-auto space-y-4">
          <SentinelCardSkeleton className="h-20" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <SentinelCardSkeleton key={i} className="h-28" />)}
          </div>
          <SentinelCardSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <SentinelPageTransition className={cn('min-h-screen', st('bg-slate-50', 'bg-black'))}>
      <div className="w-full px-4 lg:px-6 py-4 space-y-4">

        {/* ---- Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-[20px] flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <FileText className={cn('w-5 h-5', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h1 className={cn('text-xl font-semibold', st('text-slate-900', 'text-white'))}>Policies</h1>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                Define and manage compliance & security policies
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SentinelButton
              variant="secondary"
              size="sm"
              icon={<BookOpen className="w-4 h-4" />}
              onClick={() => setTemplateGalleryOpen(true)}
            >
              Generate from Template
            </SentinelButton>
            <SentinelButton
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => openEditor()}
            >
              Create Policy
            </SentinelButton>
          </div>
        </div>

        {/* ---- Stats ---- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Policies"
            value={stats.total}
            icon={FileText}
            accentColor="emerald"
            delay={0}
          />
          <StatCard
            label="Published"
            value={stats.published}
            icon={CheckCircle}
            accentColor="green"
            delay={0.05}
          />
          <StatCard
            label="Pending Review"
            value={stats.pendingReview}
            icon={Clock}
            accentColor="yellow"
            delay={0.1}
          />
          <StatCard
            label="Overdue for Review"
            value={stats.overdueCount}
            icon={AlertTriangle}
            accentColor="red"
            delay={0.15}
          />
        </div>

        {/* ---- Filter bar ---- */}
        <SentinelCard padding="sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <SentinelInput
                variant="search"
                placeholder="Search policies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={cn(
                    'h-11 rounded-xl px-3 pr-8 text-sm border appearance-none cursor-pointer',
                    st(
                      'bg-white text-slate-700 border-slate-300 focus:border-emerald-500/50',
                      'bg-zinc-900/40 text-white border-zinc-800/60 focus:border-emerald-400/50',
                    ),
                    'focus:outline-none focus:ring-2',
                    st('focus:ring-emerald-500/20', 'focus:ring-emerald-400/20'),
                    'transition-all duration-200'
                  )}
                >
                  <option value="all">All Statuses</option>
                  {POLICY_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <ChevronDown className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
              </div>
              {/* Category filter */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className={cn(
                    'h-11 rounded-xl px-3 pr-8 text-sm border appearance-none cursor-pointer',
                    st(
                      'bg-white text-slate-700 border-slate-300 focus:border-emerald-500/50',
                      'bg-zinc-900/40 text-white border-zinc-800/60 focus:border-emerald-400/50',
                    ),
                    'focus:outline-none focus:ring-2',
                    st('focus:ring-emerald-500/20', 'focus:ring-emerald-400/20'),
                    'transition-all duration-200'
                  )}
                >
                  <option value="all">All Categories</option>
                  {POLICY_CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <ChevronDown className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
              </div>
            </div>
          </div>
        </SentinelCard>

        {/* ---- Policy List ---- */}
        {filteredPolicies.length === 0 ? (
          <SentinelCard>
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className={cn('w-14 h-14 rounded-[20px] flex items-center justify-center', st('bg-slate-100', 'bg-zinc-800/60'))}>
                <FileText className={cn('w-7 h-7', st('text-slate-400', 'text-zinc-500'))} />
              </div>
              <p className={cn('text-sm font-medium', st('text-slate-600', 'text-zinc-400'))}>
                {policies.length === 0 ? 'No policies yet' : 'No policies match your filters'}
              </p>
              <p className={cn('text-xs max-w-xs text-center', st('text-slate-400', 'text-zinc-500'))}>
                {policies.length === 0
                  ? 'Create your first policy or generate one from a template to get started.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {policies.length === 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <SentinelButton
                    variant="secondary"
                    size="sm"
                    icon={<BookOpen className="w-4 h-4" />}
                    onClick={() => setTemplateGalleryOpen(true)}
                  >
                    Browse Templates
                  </SentinelButton>
                  <SentinelButton size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => openEditor()}>
                    Create Policy
                  </SentinelButton>
                </div>
              )}
            </div>
          </SentinelCard>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredPolicies.map((policy, idx) => (
                <PolicyRow
                  key={policy.id}
                  policy={policy}
                  index={idx}
                  st={st}
                  onEdit={() => openEditor(policy)}
                  onPublish={() => publishPolicy(policy)}
                  onArchive={() => archivePolicy(policy)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ---- Editor Modal ---- */}
      <AnimatePresence>
        {editorOpen && (
          <PolicyEditorModal
            st={st}
            form={editorForm}
            setForm={setEditorForm}
            tab={editorTab}
            setTab={setEditorTab}
            saving={saving}
            isEditing={!!editingPolicy}
            onSave={() => savePolicy(false)}
            onPublish={() => savePolicy(true)}
            onClose={closeEditor}
          />
        )}
      </AnimatePresence>

      {/* ---- Template Gallery Modal ---- */}
      <AnimatePresence>
        {templateGalleryOpen && (
          <TemplateGalleryModal
            st={st}
            onSelect={createFromTemplate}
            onClose={() => setTemplateGalleryOpen(false)}
          />
        )}
      </AnimatePresence>
    </SentinelPageTransition>
  );
}

// ---------------------------------------------------------------------------
// Policy Row
// ---------------------------------------------------------------------------

function PolicyRow({ policy, index, st, onEdit, onPublish, onArchive }) {
  const overdue = isOverdue(policy.next_review_date) && policy.status !== 'archived';
  const ackProgress = policy.acknowledged_count != null && policy.total_acknowledgements != null
    ? `${policy.acknowledged_count}/${policy.total_acknowledgements}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <SentinelCard padding="none" variant="interactive" onClick={onEdit}>
        <div className="p-4 sm:p-5">
          {/* Top row: title + badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className={cn('text-sm font-semibold truncate', st('text-slate-900', 'text-white'))}>
                {policy.title}
              </h3>
              <SentinelBadge variant="neutral" size="sm">
                v{policy.version || 1}
              </SentinelBadge>
              <SentinelBadge variant={STATUS_BADGE_VARIANT[policy.status] || 'neutral'} size="sm">
                {STATUS_LABELS[policy.status] || policy.status}
              </SentinelBadge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              <SentinelButton variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </SentinelButton>
              {policy.status !== 'published' && policy.status !== 'archived' && (
                <SentinelButton variant="ghost" size="sm" onClick={onPublish}>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Publish</span>
                </SentinelButton>
              )}
              {policy.status !== 'archived' && (
                <SentinelButton variant="ghost" size="sm" onClick={onArchive}>
                  <Archive className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Archive</span>
                </SentinelButton>
              )}
            </div>
          </div>

          {/* Bottom row: metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {/* Category */}
            <span className={cn('text-xs', st('text-slate-500', 'text-zinc-400'))}>
              {CATEGORY_LABELS[policy.category] || policy.category}
            </span>
            {/* Owner */}
            {policy.owner_name && (
              <span className={cn('text-xs flex items-center gap-1', st('text-slate-500', 'text-zinc-400'))}>
                <Users className="w-3 h-3" />
                {policy.owner_name}
              </span>
            )}
            {/* Last updated */}
            <span className={cn('text-xs flex items-center gap-1', st('text-slate-400', 'text-zinc-500'))}>
              <Clock className="w-3 h-3" />
              Updated {formatDate(policy.updated_at)}
            </span>
            {/* Next review */}
            {policy.next_review_date && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                overdue
                  ? 'text-red-400 font-medium'
                  : st('text-slate-400', 'text-zinc-500')
              )}>
                {overdue && <AlertCircle className="w-3 h-3" />}
                Review {formatDate(policy.next_review_date)}
                {overdue && ' (overdue)'}
              </span>
            )}
            {/* Framework */}
            {policy.framework_link && (
              <span className={cn('text-xs flex items-center gap-1', st('text-slate-400', 'text-zinc-500'))}>
                <Globe className="w-3 h-3" />
                {policy.framework_link}
              </span>
            )}
            {/* Acknowledgement progress */}
            {ackProgress && (
              <span className={cn('text-xs flex items-center gap-1', st('text-emerald-600', 'text-emerald-400'))}>
                <FileCheck className="w-3 h-3" />
                {ackProgress} acknowledged
              </span>
            )}
          </div>
        </div>
      </SentinelCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Policy Editor Modal
// ---------------------------------------------------------------------------

function PolicyEditorModal({ st, form, setForm, tab, setTab, saving, isEditing, onSave, onPublish, onClose }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        className={cn(
          'relative w-full max-w-5xl max-h-[90vh] rounded-[20px] border overflow-hidden flex flex-col',
          st('bg-white border-slate-200 shadow-xl', 'bg-zinc-900 border-zinc-800/60 shadow-2xl'),
        )}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b shrink-0',
          st('border-slate-200', 'border-zinc-800/60'),
        )}>
          <h2 className={cn('text-lg font-semibold', st('text-slate-900', 'text-white'))}>
            {isEditing ? 'Edit Policy' : 'Create Policy'}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-xl transition-colors',
              st('hover:bg-slate-100 text-slate-500', 'hover:bg-zinc-800 text-zinc-400'),
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <SentinelInput
            label="Policy Title"
            placeholder="e.g., Information Security Policy"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />

          {/* Meta row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                Category
              </label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className={cn(
                    'w-full h-11 rounded-xl px-4 pr-8 text-sm border appearance-none cursor-pointer',
                    st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
                    'focus:outline-none focus:ring-2 transition-all duration-200',
                    st('focus:border-emerald-500/50 focus:ring-emerald-500/20', 'focus:border-emerald-400/50 focus:ring-emerald-400/20'),
                  )}
                >
                  {POLICY_CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <ChevronDown className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
              </div>
            </div>

            {/* Framework Link */}
            <div>
              <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                Framework
              </label>
              <div className="relative">
                <select
                  value={form.framework_link}
                  onChange={e => setForm({ ...form, framework_link: e.target.value })}
                  className={cn(
                    'w-full h-11 rounded-xl px-4 pr-8 text-sm border appearance-none cursor-pointer',
                    st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
                    'focus:outline-none focus:ring-2 transition-all duration-200',
                    st('focus:border-emerald-500/50 focus:ring-emerald-500/20', 'focus:border-emerald-400/50 focus:ring-emerald-400/20'),
                  )}
                >
                  <option value="">None</option>
                  {FRAMEWORK_OPTIONS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <ChevronDown className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                Status
              </label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className={cn(
                    'w-full h-11 rounded-xl px-4 pr-8 text-sm border appearance-none cursor-pointer',
                    st('bg-white text-slate-900 border-slate-300', 'bg-zinc-900/40 text-white border-zinc-800/60'),
                    'focus:outline-none focus:ring-2 transition-all duration-200',
                    st('focus:border-emerald-500/50 focus:ring-emerald-500/20', 'focus:border-emerald-400/50 focus:ring-emerald-400/20'),
                  )}
                >
                  {POLICY_STATUSES.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <ChevronDown className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
              </div>
            </div>

            {/* Version */}
            <div>
              <label className={cn('block text-xs font-medium uppercase tracking-wider mb-1.5', st('text-slate-500', 'text-zinc-400'))}>
                Version
              </label>
              <SentinelInput
                type="number"
                min={1}
                value={form.version}
                onChange={e => setForm({ ...form, version: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Content editor / preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={cn('block text-xs font-medium uppercase tracking-wider', st('text-slate-500', 'text-zinc-400'))}>
                Policy Content (Markdown)
              </label>
              <div className={cn('flex rounded-full p-0.5 border', st('bg-slate-100 border-slate-200', 'bg-zinc-800/60 border-zinc-700/40'))}>
                <button
                  onClick={() => setTab('edit')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    tab === 'edit'
                      ? st('bg-white text-slate-900 shadow-sm', 'bg-zinc-700 text-white')
                      : st('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200'),
                  )}
                >
                  <Edit className="w-3 h-3 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setTab('preview')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    tab === 'preview'
                      ? st('bg-white text-slate-900 shadow-sm', 'bg-zinc-700 text-white')
                      : st('text-slate-500 hover:text-slate-700', 'text-zinc-400 hover:text-zinc-200'),
                  )}
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  Preview
                </button>
              </div>
            </div>

            {tab === 'edit' ? (
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={20}
                placeholder="Write your policy content in Markdown..."
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm border font-mono resize-y min-h-[300px]',
                  st('bg-white text-slate-900 border-slate-300 placeholder:text-slate-400', 'bg-zinc-900/40 text-white border-zinc-800/60 placeholder:text-zinc-500'),
                  'focus:outline-none focus:ring-2 transition-all duration-200',
                  st('focus:border-emerald-500/50 focus:ring-emerald-500/20', 'focus:border-emerald-400/50 focus:ring-emerald-400/20'),
                )}
              />
            ) : (
              <div
                className={cn(
                  'rounded-xl border px-6 py-4 min-h-[300px] max-h-[500px] overflow-y-auto prose prose-sm max-w-none',
                  st(
                    'bg-white border-slate-200 text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900',
                    'bg-zinc-900/40 border-zinc-800/60 text-zinc-300 prose-headings:text-white prose-strong:text-white prose-hr:border-zinc-700',
                  ),
                )}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) || '<p class="text-zinc-500 italic">Nothing to preview yet.</p>' }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={cn(
          'flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0',
          st('border-slate-200', 'border-zinc-800/60'),
        )}>
          <SentinelButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </SentinelButton>
          <SentinelButton
            variant="secondary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            onClick={onSave}
            loading={saving}
          >
            Save as {STATUS_LABELS[form.status]}
          </SentinelButton>
          <SentinelButton
            size="sm"
            icon={<Send className="w-4 h-4" />}
            onClick={onPublish}
            loading={saving}
          >
            Publish
          </SentinelButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Template Gallery Modal
// ---------------------------------------------------------------------------

function TemplateGalleryModal({ st, onSelect, onClose }) {
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('all');

  const filteredTemplates = useMemo(() => {
    let result = [...POLICY_TEMPLATES];
    if (templateCategory !== 'all') {
      result = result.filter(t => t.category === templateCategory);
    }
    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [templateSearch, templateCategory]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        className={cn(
          'relative w-full max-w-4xl max-h-[85vh] rounded-[20px] border overflow-hidden flex flex-col',
          st('bg-white border-slate-200 shadow-xl', 'bg-zinc-900 border-zinc-800/60 shadow-2xl'),
        )}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b shrink-0',
          st('border-slate-200', 'border-zinc-800/60'),
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', st('bg-emerald-100', 'bg-emerald-400/10'))}>
              <Sparkles className={cn('w-4 h-4', st('text-emerald-500', 'text-emerald-400'))} />
            </div>
            <div>
              <h2 className={cn('text-lg font-semibold', st('text-slate-900', 'text-white'))}>Policy Templates</h2>
              <p className={cn('text-xs', st('text-slate-400', 'text-zinc-500'))}>
                {POLICY_TEMPLATES.length} templates available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-xl transition-colors',
              st('hover:bg-slate-100 text-slate-500', 'hover:bg-zinc-800 text-zinc-400'),
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter */}
        <div className={cn('px-6 py-3 border-b shrink-0', st('border-slate-100', 'border-zinc-800/40'))}>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SentinelInput
                variant="search"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                value={templateCategory}
                onChange={e => setTemplateCategory(e.target.value)}
                className={cn(
                  'h-11 rounded-xl px-3 pr-8 text-sm border appearance-none cursor-pointer',
                  st(
                    'bg-white text-slate-700 border-slate-300 focus:border-emerald-500/50',
                    'bg-zinc-900/40 text-white border-zinc-800/60 focus:border-emerald-400/50',
                  ),
                  'focus:outline-none focus:ring-2',
                  st('focus:ring-emerald-500/20', 'focus:ring-emerald-400/20'),
                  'transition-all duration-200'
                )}
              >
                <option value="all">All Categories</option>
                {POLICY_CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <ChevronDown className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none', st('text-slate-400', 'text-zinc-500'))} />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <SentinelCard
                  variant="interactive"
                  padding="sm"
                  onClick={() => onSelect(template)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn('text-sm font-semibold leading-tight', st('text-slate-900', 'text-white'))}>
                        {template.title}
                      </h3>
                      <SentinelBadge variant="neutral" size="sm">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </SentinelBadge>
                    </div>
                    <p className={cn('text-xs leading-relaxed line-clamp-2', st('text-slate-500', 'text-zinc-400'))}>
                      {template.description}
                    </p>
                    <div className="flex items-center gap-1 pt-1">
                      <Plus className={cn('w-3 h-3', st('text-emerald-500', 'text-emerald-400'))} />
                      <span className={cn('text-xs font-medium', st('text-emerald-600', 'text-emerald-400'))}>
                        Use Template
                      </span>
                    </div>
                  </div>
                </SentinelCard>
              </motion.div>
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className={cn('w-8 h-8', st('text-slate-300', 'text-zinc-600'))} />
              <p className={cn('text-sm', st('text-slate-500', 'text-zinc-400'))}>No templates match your search</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
