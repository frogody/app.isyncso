/**
 * Complete taxonomy for 100+ course templates
 * Each entry defines a template's basic structure
 */

export const COURSE_TAXONOMY = [
  // ===== EU AI ACT & COMPLIANCE (15) =====
  {
    id: "eu-ai-act-fundamentals",
    title: "EU AI Act Fundamentals",
    category: "compliance",
    subcategory: "foundation",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["eu-ai-act", "compliance", "regulatory"],
    skills: ["AI Compliance", "Regulatory Knowledge", "Risk Assessment"]
  },
  {
    id: "high-risk-ai-deep-dive",
    title: "High-Risk AI Systems Deep Dive",
    category: "compliance",
    subcategory: "risk-management",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["high-risk", "compliance", "documentation"],
    skills: ["Risk Classification", "Compliance Documentation", "AI Governance"]
  },
  {
    id: "gpai-foundation-models",
    title: "GPAI and Foundation Models",
    category: "compliance",
    subcategory: "gpai",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["gpai", "foundation-models", "chatgpt"],
    skills: ["GPAI Compliance", "Model Governance", "Third-party AI"]
  },
  {
    id: "ai-risk-management-article-9",
    title: "Risk Management for AI (Article 9)",
    category: "compliance",
    subcategory: "risk-management",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["risk-management", "article-9", "technical"],
    skills: ["Risk Management Systems", "Documentation", "Quality Assurance"]
  },
  {
    id: "ai-data-governance-article-10",
    title: "Data Governance for AI (Article 10)",
    category: "compliance",
    subcategory: "data-governance",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["data-governance", "article-10", "datasets"],
    skills: ["Data Quality", "Training Data Management", "Bias Detection"]
  },
  {
    id: "technical-documentation-guide",
    title: "Technical Documentation Guide",
    category: "compliance",
    subcategory: "documentation",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["documentation", "technical-files", "conformity"],
    skills: ["Technical Writing", "Compliance Documentation", "System Design"]
  },
  {
    id: "human-oversight-requirements",
    title: "Human Oversight Requirements",
    category: "compliance",
    subcategory: "oversight",
    difficulty: "intermediate",
    duration_hours: 2,
    tags: ["human-oversight", "article-14", "governance"],
    skills: ["Human-in-the-Loop", "AI Governance", "Oversight Systems"]
  },
  {
    id: "conformity-assessment-process",
    title: "Conformity Assessment Process",
    category: "compliance",
    subcategory: "assessment",
    difficulty: "advanced",
    duration_hours: 5,
    tags: ["conformity", "certification", "assessment"],
    skills: ["Conformity Assessment", "Certification Process", "Notified Bodies"]
  },
  {
    id: "transparency-requirements",
    title: "Transparency Requirements",
    category: "compliance",
    subcategory: "transparency",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["transparency", "disclosure", "user-information"],
    skills: ["Transparency Obligations", "User Communication", "AI Disclosure"]
  },
  {
    id: "ai-literacy-organizations",
    title: "AI Literacy for Organizations",
    category: "compliance",
    subcategory: "literacy",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["ai-literacy", "training", "awareness"],
    skills: ["AI Literacy", "Organizational Training", "Awareness Programs"]
  },
  {
    id: "provider-deployer-obligations",
    title: "Provider vs Deployer Obligations",
    category: "compliance",
    subcategory: "roles",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["provider", "deployer", "obligations"],
    skills: ["Role Definition", "Obligation Mapping", "Responsibility Matrix"]
  },
  {
    id: "healthcare-ai-compliance",
    title: "Healthcare AI Compliance",
    category: "compliance",
    subcategory: "sector-specific",
    difficulty: "advanced",
    duration_hours: 5,
    tags: ["healthcare", "medical-devices", "high-risk"],
    skills: ["Healthcare AI", "MDR/IVDR", "Clinical AI Governance"]
  },
  {
    id: "financial-ai-compliance",
    title: "Financial AI Compliance",
    category: "compliance",
    subcategory: "sector-specific",
    difficulty: "advanced",
    duration_hours: 5,
    tags: ["finance", "banking", "creditworthiness"],
    skills: ["Financial AI", "Credit Risk AI", "Regulatory Compliance"]
  },
  {
    id: "hr-employment-ai-compliance",
    title: "HR & Employment AI Compliance",
    category: "compliance",
    subcategory: "sector-specific",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["hr", "employment", "recruitment"],
    skills: ["HR AI Compliance", "Employment Law", "Fair Hiring"]
  },
  {
    id: "incident-reporting-monitoring",
    title: "Incident Reporting & Monitoring",
    category: "compliance",
    subcategory: "operations",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["incident-management", "monitoring", "article-62"],
    skills: ["Incident Management", "Post-Market Monitoring", "Reporting Systems"]
  },

  // ===== AI FUNDAMENTALS (15) =====
  {
    id: "what-is-ai-complete-beginner",
    title: "What is AI? (Complete Beginner)",
    category: "fundamentals",
    subcategory: "intro",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["intro", "basics", "non-technical"],
    skills: ["AI Basics", "Technology Literacy", "AI Concepts"]
  },
  {
    id: "machine-learning-basics",
    title: "Machine Learning Basics",
    category: "fundamentals",
    subcategory: "ml",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["machine-learning", "algorithms", "training"],
    skills: ["ML Fundamentals", "Supervised Learning", "Model Training"]
  },
  {
    id: "deep-learning-introduction",
    title: "Deep Learning Introduction",
    category: "fundamentals",
    subcategory: "deep-learning",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["deep-learning", "neural-networks", "ai-models"],
    skills: ["Neural Networks", "Deep Learning", "Model Architecture"]
  },
  {
    id: "natural-language-processing",
    title: "Natural Language Processing",
    category: "fundamentals",
    subcategory: "nlp",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["nlp", "text-analysis", "language"],
    skills: ["NLP Fundamentals", "Text Processing", "Language Models"]
  },
  {
    id: "computer-vision-basics",
    title: "Computer Vision Basics",
    category: "fundamentals",
    subcategory: "vision",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["computer-vision", "image-recognition", "visual-ai"],
    skills: ["Computer Vision", "Image Processing", "Object Detection"]
  },
  {
    id: "generative-ai-explained",
    title: "Generative AI Explained",
    category: "fundamentals",
    subcategory: "generative",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["generative-ai", "chatgpt", "content-generation"],
    skills: ["Generative AI", "Prompt Engineering", "AI Applications"]
  },
  {
    id: "how-llms-work",
    title: "How Large Language Models Work",
    category: "fundamentals",
    subcategory: "llm",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["llm", "transformers", "gpt"],
    skills: ["LLM Architecture", "Transformer Models", "AI Technology"]
  },
  {
    id: "ai-ethics-fundamentals",
    title: "AI Ethics Fundamentals",
    category: "fundamentals",
    subcategory: "ethics",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["ethics", "responsible-ai", "fairness"],
    skills: ["AI Ethics", "Responsible AI", "Ethical Decision Making"]
  },
  {
    id: "responsible-ai-development",
    title: "Responsible AI Development",
    category: "fundamentals",
    subcategory: "ethics",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["responsible-ai", "development", "best-practices"],
    skills: ["Responsible AI Practices", "AI Safety", "Ethical Development"]
  },
  {
    id: "ai-bias-and-fairness",
    title: "AI Bias and Fairness",
    category: "fundamentals",
    subcategory: "ethics",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["bias", "fairness", "discrimination"],
    skills: ["Bias Detection", "Fairness Metrics", "Debiasing Techniques"]
  },
  {
    id: "explainable-ai-xai",
    title: "Explainable AI (XAI)",
    category: "fundamentals",
    subcategory: "explainability",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["xai", "interpretability", "transparency"],
    skills: ["Model Explainability", "Interpretation Techniques", "Transparency"]
  },
  {
    id: "ai-safety-basics",
    title: "AI Safety Basics",
    category: "fundamentals",
    subcategory: "safety",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["safety", "security", "risk"],
    skills: ["AI Safety", "Risk Mitigation", "Security Fundamentals"]
  },
  {
    id: "ai-ml-deep-learning-differences",
    title: "AI vs ML vs Deep Learning",
    category: "fundamentals",
    subcategory: "intro",
    difficulty: "beginner",
    duration_hours: 1,
    tags: ["intro", "terminology", "concepts"],
    skills: ["AI Terminology", "Concept Clarity", "Technology Understanding"]
  },
  {
    id: "evaluating-ai-solutions",
    title: "Evaluating AI Solutions",
    category: "fundamentals",
    subcategory: "evaluation",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["evaluation", "vendor-selection", "assessment"],
    skills: ["Solution Evaluation", "Vendor Assessment", "Technical Evaluation"]
  },
  {
    id: "ai-limitations-and-risks",
    title: "AI Limitations and Risks",
    category: "fundamentals",
    subcategory: "risks",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["limitations", "risks", "awareness"],
    skills: ["Risk Awareness", "AI Limitations", "Critical Thinking"]
  },

  // ===== AI FOR ROLES (20) =====
  {
    id: "ai-for-executives",
    title: "AI for Executives",
    category: "role-specific",
    subcategory: "leadership",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["executive", "strategy", "leadership"],
    skills: ["AI Strategy", "Executive Decision Making", "Business Value"]
  },
  {
    id: "ai-for-hr-professionals",
    title: "AI for HR Professionals",
    category: "role-specific",
    subcategory: "hr",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["hr", "recruitment", "employee-experience"],
    skills: ["HR Technology", "AI Ethics in HR", "Talent Management"]
  },
  {
    id: "ai-for-marketing",
    title: "AI for Marketing Teams",
    category: "role-specific",
    subcategory: "marketing",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["marketing", "content", "analytics"],
    skills: ["Marketing AI", "Content Strategy", "Analytics"]
  },
  {
    id: "ai-for-sales",
    title: "AI for Sales Teams",
    category: "role-specific",
    subcategory: "sales",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["sales", "crm", "pipeline"],
    skills: ["Sales AI", "Lead Scoring", "Sales Automation"]
  },
  {
    id: "ai-for-legal-compliance",
    title: "AI for Legal & Compliance",
    category: "role-specific",
    subcategory: "legal",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["legal", "compliance", "risk"],
    skills: ["Legal AI", "Compliance Management", "Contract Analysis"]
  },
  {
    id: "ai-for-finance",
    title: "AI for Finance Teams",
    category: "role-specific",
    subcategory: "finance",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["finance", "forecasting", "analytics"],
    skills: ["Financial AI", "Predictive Analytics", "Risk Analysis"]
  },
  {
    id: "ai-for-operations",
    title: "AI for Operations",
    category: "role-specific",
    subcategory: "operations",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["operations", "efficiency", "automation"],
    skills: ["Operational AI", "Process Optimization", "Automation"]
  },
  {
    id: "ai-for-product-managers",
    title: "AI for Product Managers",
    category: "role-specific",
    subcategory: "product",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["product", "roadmap", "features"],
    skills: ["AI Product Management", "Feature Planning", "AI Integration"]
  },
  {
    id: "ai-for-developers-non-ml",
    title: "AI for Developers (Non-ML)",
    category: "role-specific",
    subcategory: "engineering",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["development", "apis", "integration"],
    skills: ["AI APIs", "Integration Patterns", "Development Best Practices"]
  },
  {
    id: "ai-for-data-analysts",
    title: "AI for Data Analysts",
    category: "role-specific",
    subcategory: "analytics",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["analytics", "insights", "visualization"],
    skills: ["AI-Powered Analytics", "Predictive Modeling", "Data Insights"]
  },
  {
    id: "ai-for-customer-service",
    title: "AI for Customer Service",
    category: "role-specific",
    subcategory: "support",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["customer-service", "chatbots", "support"],
    skills: ["Customer Service AI", "Chatbot Management", "Support Automation"]
  },
  {
    id: "ai-for-healthcare-professionals",
    title: "AI for Healthcare Professionals",
    category: "role-specific",
    subcategory: "healthcare",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["healthcare", "medical", "diagnosis"],
    skills: ["Healthcare AI", "Clinical Decision Support", "Medical AI Ethics"]
  },
  {
    id: "ai-for-educators",
    title: "AI for Educators",
    category: "role-specific",
    subcategory: "education",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["education", "teaching", "learning"],
    skills: ["Educational AI", "Personalized Learning", "Assessment Tools"]
  },
  {
    id: "ai-for-government",
    title: "AI for Government & Public Sector",
    category: "role-specific",
    subcategory: "government",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["government", "public-sector", "policy"],
    skills: ["Public Sector AI", "Policy Making", "Citizen Services"]
  },
  {
    id: "ai-for-small-business",
    title: "AI for Small Business Owners",
    category: "role-specific",
    subcategory: "business",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["small-business", "solopreneur", "efficiency"],
    skills: ["Business AI", "Cost-Effective AI", "Productivity Tools"]
  },
  {
    id: "ai-for-startups",
    title: "AI for Startups",
    category: "role-specific",
    subcategory: "startups",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["startups", "innovation", "growth"],
    skills: ["AI Strategy", "Product-Market Fit", "Growth Hacking"]
  },
  {
    id: "ai-for-enterprise-leaders",
    title: "AI for Enterprise Leaders",
    category: "role-specific",
    subcategory: "leadership",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["enterprise", "transformation", "strategy"],
    skills: ["Enterprise AI Strategy", "Digital Transformation", "Change Management"]
  },
  {
    id: "ai-for-board-members",
    title: "AI for Board Members",
    category: "role-specific",
    subcategory: "governance",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["board", "governance", "oversight"],
    skills: ["AI Governance", "Board Oversight", "Strategic AI Questions"]
  },
  {
    id: "ai-for-risk-managers",
    title: "AI for Risk Managers",
    category: "role-specific",
    subcategory: "risk",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["risk-management", "compliance", "controls"],
    skills: ["AI Risk Management", "Control Frameworks", "Risk Assessment"]
  },
  {
    id: "ai-for-procurement",
    title: "AI for Procurement",
    category: "role-specific",
    subcategory: "procurement",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["procurement", "vendor-selection", "contracts"],
    skills: ["AI Procurement", "Vendor Evaluation", "Contract Negotiation"]
  },

  // ===== AI TOOLS & PLATFORMS (15) =====
  {
    id: "chatgpt-for-business",
    title: "ChatGPT for Business",
    category: "tools",
    subcategory: "chatbots",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["chatgpt", "openai", "productivity"],
    skills: ["ChatGPT Mastery", "Prompt Engineering", "Business Applications"]
  },
  {
    id: "claude-for-professionals",
    title: "Claude for Professionals",
    category: "tools",
    subcategory: "chatbots",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["claude", "anthropic", "ai-assistant"],
    skills: ["Claude Usage", "AI Conversations", "Professional Applications"]
  },
  {
    id: "microsoft-copilot-mastery",
    title: "Microsoft Copilot Mastery",
    category: "tools",
    subcategory: "productivity",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["copilot", "microsoft", "office"],
    skills: ["Copilot Skills", "Office Automation", "Productivity Enhancement"]
  },
  {
    id: "ai-image-generation",
    title: "AI Image Generation Tools",
    category: "tools",
    subcategory: "creative",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["image-generation", "midjourney", "dalle"],
    skills: ["Image Generation", "Creative AI", "Visual Content"]
  },
  {
    id: "ai-writing-assistants",
    title: "AI Writing Assistants",
    category: "tools",
    subcategory: "writing",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["writing", "copywriting", "content"],
    skills: ["AI Writing", "Content Creation", "Editing Tools"]
  },
  {
    id: "ai-coding-assistants",
    title: "AI Coding Assistants",
    category: "tools",
    subcategory: "development",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["coding", "github-copilot", "development"],
    skills: ["AI-Assisted Coding", "Code Generation", "Developer Tools"]
  },
  {
    id: "ai-meeting-transcription",
    title: "AI Meeting & Transcription Tools",
    category: "tools",
    subcategory: "productivity",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["meetings", "transcription", "notes"],
    skills: ["Meeting AI", "Transcription Tools", "Note-Taking"]
  },
  {
    id: "ai-data-analysis",
    title: "AI Data Analysis Tools",
    category: "tools",
    subcategory: "analytics",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["analytics", "data-analysis", "insights"],
    skills: ["AI Analytics", "Data Visualization", "Insight Generation"]
  },
  {
    id: "no-code-ai-builders",
    title: "Building with No-Code AI",
    category: "tools",
    subcategory: "no-code",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["no-code", "builders", "automation"],
    skills: ["No-Code AI", "AI Builders", "Rapid Prototyping"]
  },
  {
    id: "ai-automation-zapier-make",
    title: "AI Automation (Zapier, Make)",
    category: "tools",
    subcategory: "automation",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["automation", "zapier", "workflows"],
    skills: ["Workflow Automation", "AI Integration", "Process Design"]
  },
  {
    id: "ai-customer-service-tools",
    title: "AI Customer Service Tools",
    category: "tools",
    subcategory: "support",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["customer-service", "zendesk", "intercom"],
    skills: ["Support AI", "Chatbot Setup", "Customer Experience"]
  },
  {
    id: "ai-for-spreadsheets",
    title: "AI for Spreadsheets",
    category: "tools",
    subcategory: "productivity",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["spreadsheets", "excel", "google-sheets"],
    skills: ["Spreadsheet AI", "Formula Generation", "Data Analysis"]
  },
  {
    id: "ai-for-presentations",
    title: "AI for Presentations",
    category: "tools",
    subcategory: "productivity",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["presentations", "slides", "design"],
    skills: ["Presentation AI", "Slide Generation", "Design Automation"]
  },
  {
    id: "ai-search-research-tools",
    title: "AI Search & Research Tools",
    category: "tools",
    subcategory: "research",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["search", "research", "perplexity"],
    skills: ["AI Search", "Research Efficiency", "Information Synthesis"]
  },
  {
    id: "evaluating-ai-vendors",
    title: "Evaluating AI Vendors",
    category: "tools",
    subcategory: "procurement",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["vendors", "procurement", "selection"],
    skills: ["Vendor Evaluation", "RFP Process", "Due Diligence"]
  },

  // ===== AI IMPLEMENTATION (15) =====
  {
    id: "ai-project-planning",
    title: "AI Project Planning",
    category: "implementation",
    subcategory: "planning",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["planning", "project-management", "roadmap"],
    skills: ["Project Planning", "Scope Definition", "Success Criteria"]
  },
  {
    id: "building-ai-roadmap",
    title: "Building an AI Roadmap",
    category: "implementation",
    subcategory: "strategy",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["roadmap", "strategy", "planning"],
    skills: ["Strategic Planning", "Roadmap Development", "Prioritization"]
  },
  {
    id: "ai-change-management",
    title: "AI Change Management",
    category: "implementation",
    subcategory: "change",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["change-management", "adoption", "culture"],
    skills: ["Change Management", "Stakeholder Engagement", "Cultural Transformation"]
  },
  {
    id: "training-teams-on-ai",
    title: "Training Teams on AI",
    category: "implementation",
    subcategory: "training",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["training", "upskilling", "literacy"],
    skills: ["Training Design", "AI Literacy Programs", "Team Development"]
  },
  {
    id: "measuring-ai-roi",
    title: "Measuring AI ROI",
    category: "implementation",
    subcategory: "measurement",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["roi", "metrics", "measurement"],
    skills: ["ROI Measurement", "Success Metrics", "Value Tracking"]
  },
  {
    id: "ai-governance-frameworks",
    title: "AI Governance Frameworks",
    category: "implementation",
    subcategory: "governance",
    difficulty: "advanced",
    duration_hours: 5,
    tags: ["governance", "frameworks", "policy"],
    skills: ["AI Governance", "Framework Design", "Policy Development"]
  },
  {
    id: "ai-policy-development",
    title: "AI Policy Development",
    category: "implementation",
    subcategory: "policy",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["policy", "guidelines", "standards"],
    skills: ["Policy Writing", "Guidelines Development", "Standards Setting"]
  },
  {
    id: "ai-vendor-selection",
    title: "AI Vendor Selection",
    category: "implementation",
    subcategory: "procurement",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["vendor", "selection", "evaluation"],
    skills: ["Vendor Selection", "Technical Evaluation", "Contract Negotiation"]
  },
  {
    id: "ai-proof-of-concept",
    title: "AI Proof of Concept Guide",
    category: "implementation",
    subcategory: "validation",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["poc", "pilot", "validation"],
    skills: ["POC Design", "Validation Methods", "Pilot Programs"]
  },
  {
    id: "scaling-ai-organizations",
    title: "Scaling AI in Organizations",
    category: "implementation",
    subcategory: "scaling",
    difficulty: "advanced",
    duration_hours: 5,
    tags: ["scaling", "enterprise", "growth"],
    skills: ["AI Scaling", "Enterprise Deployment", "Organizational Change"]
  },
  {
    id: "ai-data-readiness",
    title: "AI Data Readiness",
    category: "implementation",
    subcategory: "data",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["data", "preparation", "quality"],
    skills: ["Data Preparation", "Quality Assessment", "Data Strategy"]
  },
  {
    id: "ai-security-considerations",
    title: "AI Security Considerations",
    category: "implementation",
    subcategory: "security",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["security", "privacy", "protection"],
    skills: ["AI Security", "Data Protection", "Threat Mitigation"]
  },
  {
    id: "ai-workforce-planning",
    title: "AI and Workforce Planning",
    category: "implementation",
    subcategory: "workforce",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["workforce", "skills", "hiring"],
    skills: ["Workforce Planning", "Skills Development", "Hiring Strategy"]
  },
  {
    id: "ai-failure-case-studies",
    title: "AI Failure Case Studies",
    category: "implementation",
    subcategory: "learning",
    difficulty: "intermediate",
    duration_hours: 2,
    tags: ["failures", "lessons", "case-studies"],
    skills: ["Risk Awareness", "Failure Analysis", "Best Practices"]
  },
  {
    id: "when-not-to-use-ai",
    title: "When NOT to Use AI",
    category: "implementation",
    subcategory: "decision-making",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["decision-making", "alternatives", "critical-thinking"],
    skills: ["Critical Evaluation", "Alternative Solutions", "Strategic Thinking"]
  },

  // ===== INDUSTRY-SPECIFIC (20) =====
  {
    id: "ai-in-retail",
    title: "AI in Retail",
    category: "industry",
    subcategory: "retail",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["retail", "e-commerce", "personalization"],
    skills: ["Retail AI", "Customer Personalization", "Inventory Optimization"]
  },
  {
    id: "ai-in-manufacturing",
    title: "AI in Manufacturing",
    category: "industry",
    subcategory: "manufacturing",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["manufacturing", "industry-4.0", "automation"],
    skills: ["Manufacturing AI", "Predictive Maintenance", "Quality Control"]
  },
  {
    id: "ai-in-logistics",
    title: "AI in Logistics & Supply Chain",
    category: "industry",
    subcategory: "logistics",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["logistics", "supply-chain", "optimization"],
    skills: ["Supply Chain AI", "Route Optimization", "Demand Forecasting"]
  },
  {
    id: "ai-in-real-estate",
    title: "AI in Real Estate",
    category: "industry",
    subcategory: "real-estate",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["real-estate", "property", "valuation"],
    skills: ["Real Estate AI", "Property Valuation", "Market Analysis"]
  },
  {
    id: "ai-in-insurance",
    title: "AI in Insurance",
    category: "industry",
    subcategory: "insurance",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["insurance", "underwriting", "claims"],
    skills: ["Insurance AI", "Risk Assessment", "Claims Processing"]
  },
  {
    id: "ai-in-banking",
    title: "AI in Banking",
    category: "industry",
    subcategory: "banking",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["banking", "fintech", "fraud"],
    skills: ["Banking AI", "Fraud Detection", "Customer Service"]
  },
  {
    id: "ai-in-telecom",
    title: "AI in Telecom",
    category: "industry",
    subcategory: "telecom",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["telecom", "network", "customer-experience"],
    skills: ["Telecom AI", "Network Optimization", "Customer Analytics"]
  },
  {
    id: "ai-in-energy",
    title: "AI in Energy",
    category: "industry",
    subcategory: "energy",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["energy", "utilities", "grid"],
    skills: ["Energy AI", "Grid Management", "Demand Forecasting"]
  },
  {
    id: "ai-in-agriculture",
    title: "AI in Agriculture",
    category: "industry",
    subcategory: "agriculture",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["agriculture", "farming", "precision"],
    skills: ["Agricultural AI", "Precision Farming", "Crop Optimization"]
  },
  {
    id: "ai-in-media",
    title: "AI in Media & Entertainment",
    category: "industry",
    subcategory: "media",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["media", "entertainment", "content"],
    skills: ["Media AI", "Content Generation", "Recommendation Systems"]
  },
  {
    id: "ai-in-travel",
    title: "AI in Travel & Hospitality",
    category: "industry",
    subcategory: "travel",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["travel", "hospitality", "booking"],
    skills: ["Travel AI", "Personalization", "Revenue Optimization"]
  },
  {
    id: "ai-in-construction",
    title: "AI in Construction",
    category: "industry",
    subcategory: "construction",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["construction", "building", "planning"],
    skills: ["Construction AI", "Project Management", "Safety Monitoring"]
  },
  {
    id: "ai-in-automotive",
    title: "AI in Automotive",
    category: "industry",
    subcategory: "automotive",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["automotive", "autonomous", "manufacturing"],
    skills: ["Automotive AI", "Autonomous Systems", "Manufacturing AI"]
  },
  {
    id: "ai-in-pharma",
    title: "AI in Pharma & Life Sciences",
    category: "industry",
    subcategory: "pharma",
    difficulty: "advanced",
    duration_hours: 5,
    tags: ["pharma", "drug-discovery", "research"],
    skills: ["Pharma AI", "Drug Discovery", "Clinical Trials"]
  },
  {
    id: "ai-in-professional-services",
    title: "AI in Professional Services",
    category: "industry",
    subcategory: "services",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["consulting", "accounting", "legal"],
    skills: ["Services AI", "Client Delivery", "Knowledge Management"]
  },
  {
    id: "ai-in-legal-industry",
    title: "AI in Legal Industry",
    category: "industry",
    subcategory: "legal",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["legal", "law-firms", "contracts"],
    skills: ["Legal AI", "Contract Analysis", "Legal Research"]
  },
  {
    id: "ai-in-education-sector",
    title: "AI in Education Sector",
    category: "industry",
    subcategory: "education",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["education", "edtech", "learning"],
    skills: ["Education AI", "Personalized Learning", "Assessment Tools"]
  },
  {
    id: "ai-in-nonprofit",
    title: "AI in Nonprofit Organizations",
    category: "industry",
    subcategory: "nonprofit",
    difficulty: "beginner",
    duration_hours: 2,
    tags: ["nonprofit", "social-impact", "fundraising"],
    skills: ["Nonprofit AI", "Impact Measurement", "Fundraising Automation"]
  },
  {
    id: "ai-in-government-sector",
    title: "AI in Government",
    category: "industry",
    subcategory: "government",
    difficulty: "intermediate",
    duration_hours: 4,
    tags: ["government", "public-sector", "services"],
    skills: ["Government AI", "Public Services", "Policy Implementation"]
  },
  {
    id: "ai-in-startups-tech",
    title: "AI in Startups & Tech",
    category: "industry",
    subcategory: "tech",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["startups", "saas", "innovation"],
    skills: ["Startup AI", "Product Innovation", "Growth Strategy"]
  },

  // ===== ADDITIONAL SPECIALIZED (15+) =====
  {
    id: "prompt-engineering-mastery",
    title: "Prompt Engineering Mastery",
    category: "fundamentals",
    subcategory: "prompting",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["prompts", "chatgpt", "optimization"],
    skills: ["Prompt Engineering", "Optimization Techniques", "Advanced Prompting"]
  },
  {
    id: "ai-for-research-development",
    title: "AI for Research & Development",
    category: "role-specific",
    subcategory: "research",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["research", "innovation", "discovery"],
    skills: ["Research AI", "Scientific Discovery", "Innovation Acceleration"]
  },
  {
    id: "ai-content-moderation",
    title: "AI Content Moderation",
    category: "tools",
    subcategory: "moderation",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["moderation", "safety", "content"],
    skills: ["Content Moderation", "Safety Systems", "Policy Enforcement"]
  },
  {
    id: "ai-recommendation-systems",
    title: "AI Recommendation Systems",
    category: "fundamentals",
    subcategory: "algorithms",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["recommendations", "personalization", "algorithms"],
    skills: ["Recommendation Algorithms", "Personalization", "User Modeling"]
  },
  {
    id: "ai-for-creative-professionals",
    title: "AI for Creative Professionals",
    category: "role-specific",
    subcategory: "creative",
    difficulty: "beginner",
    duration_hours: 3,
    tags: ["creative", "design", "content"],
    skills: ["Creative AI", "Design Tools", "Content Generation"]
  },
  {
    id: "ai-conversational-interfaces",
    title: "AI Conversational Interfaces",
    category: "fundamentals",
    subcategory: "interfaces",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["chatbots", "voice", "conversation"],
    skills: ["Conversational AI", "Dialog Design", "User Experience"]
  },
  {
    id: "ai-predictive-analytics",
    title: "AI Predictive Analytics",
    category: "fundamentals",
    subcategory: "analytics",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["predictive", "forecasting", "analytics"],
    skills: ["Predictive Modeling", "Forecasting", "Statistical Analysis"]
  },
  {
    id: "ai-for-sustainability",
    title: "AI for Sustainability",
    category: "implementation",
    subcategory: "sustainability",
    difficulty: "intermediate",
    duration_hours: 3,
    tags: ["sustainability", "green-ai", "environment"],
    skills: ["Sustainable AI", "Environmental Impact", "Green Computing"]
  },
  {
    id: "ai-fraud-detection",
    title: "AI Fraud Detection",
    category: "implementation",
    subcategory: "security",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["fraud", "security", "detection"],
    skills: ["Fraud Detection", "Anomaly Detection", "Security Systems"]
  },
  {
    id: "ai-sentiment-analysis",
    title: "AI Sentiment Analysis",
    category: "fundamentals",
    subcategory: "nlp",
    difficulty: "intermediate",
    duration_hours: 2,
    tags: ["sentiment", "nlp", "text-analysis"],
    skills: ["Sentiment Analysis", "Text Mining", "Opinion Analysis"]
  },
  {
    id: "ai-video-analysis",
    title: "AI Video Analysis",
    category: "fundamentals",
    subcategory: "vision",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["video", "computer-vision", "surveillance"],
    skills: ["Video Analysis", "Action Recognition", "Object Tracking"]
  },
  {
    id: "ai-time-series-forecasting",
    title: "AI Time Series Forecasting",
    category: "fundamentals",
    subcategory: "forecasting",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["time-series", "forecasting", "prediction"],
    skills: ["Time Series Analysis", "Forecasting Models", "Trend Analysis"]
  },
  {
    id: "ai-for-accessibility",
    title: "AI for Accessibility",
    category: "implementation",
    subcategory: "accessibility",
    difficulty: "intermediate",
    duration_hours: 2,
    tags: ["accessibility", "inclusion", "assistive"],
    skills: ["Accessible AI", "Assistive Technology", "Inclusive Design"]
  },
  {
    id: "ai-api-integration",
    title: "AI API Integration",
    category: "tools",
    subcategory: "development",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["api", "integration", "development"],
    skills: ["API Integration", "SDK Usage", "Error Handling"]
  },
  {
    id: "ai-model-monitoring",
    title: "AI Model Monitoring",
    category: "implementation",
    subcategory: "mlops",
    difficulty: "advanced",
    duration_hours: 4,
    tags: ["monitoring", "mlops", "performance"],
    skills: ["Model Monitoring", "Performance Tracking", "Drift Detection"]
  }
];

export const CATEGORY_LABELS = {
  compliance: "EU AI Act & Compliance",
  fundamentals: "AI Fundamentals",
  "role-specific": "AI for Your Role",
  tools: "AI Tools & Platforms",
  implementation: "AI Implementation",
  industry: "Industry-Specific AI"
};

export const DIFFICULTY_LABELS = {
  beginner: "Beginner - No AI experience needed",
  intermediate: "Intermediate - Basic AI knowledge helpful",
  advanced: "Advanced - Requires technical background"
};