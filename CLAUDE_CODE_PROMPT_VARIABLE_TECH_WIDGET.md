# Claude Code Prompt: Variable/Smart Tech Stack Widget

## Context
The TechStackWidget in the Summary tab of the candidate drawer currently shows "No data available" even though the Company tab shows 177+ technologies organized by category. This is because:

1. **Wrong data path**: Widget looks at `companyIntel.tech_stack` but data is at `companyIntel.technographics.tech_stack`
2. **Missing smart filtering**: Widget should show tech RELEVANT to the candidate's job role, not all 177 technologies

## Task
Fix the TechStackWidget to:
1. Access the correct data path
2. Intelligently filter tech based on the candidate's job role
3. Prioritize role-relevant tech categories

## Data Structure (from CompanyIntelligenceReport.jsx)
```javascript
candidate.company_intelligence = {
  technographics: {
    tech_stack: [
      { category: "TESTING AND QA", technologies: ["Bugzilla", "JUnit", "Selenium", ...] },
      { category: "COMMUNICATIONS", technologies: ["Gmail", "Slack", "Twilio", ...] },
      { category: "FINANCE AND ACCOUNTING", technologies: ["Fiserv", "NetSuite", "Oracle FLEXCUBE", ...] },
      { category: "HR", technologies: ["Workday", "Oracle HCM", ...] },
      { category: "SALES", technologies: ["Salesforce CRM", "SAP Digital CRM", ...] },
      { category: "PRODUCT AND DESIGN", technologies: ["Adobe Illustrator", "Jira Core", ...] },
      // ... more categories
    ]
  }
}
```

## Implementation Requirements

### 1. Fix Data Path
Update the widget to access:
```javascript
const techStack = companyIntel?.technographics?.tech_stack || [];
```

### 2. Create Role-to-Category Mapping
Create a mapping that associates job keywords with relevant tech categories:

```javascript
const ROLE_CATEGORY_MAP = {
  // Finance/Accounting roles
  'auditor|accountant|finance|cfo|controller|bookkeeper|tax|treasury': [
    'FINANCE AND ACCOUNTING', 'ACCOUNTING', 'FINANCIAL', 'ERP'
  ],

  // Engineering/Tech roles
  'engineer|developer|programmer|software|devops|sre|architect|tech lead': [
    'TESTING AND QA', 'DEVELOPMENT', 'DEVOPS', 'CLOUD', 'INFRASTRUCTURE', 'ENGINEERING'
  ],

  // Sales roles
  'sales|account executive|bdm|business development|revenue': [
    'SALES', 'CRM', 'SALES ENABLEMENT'
  ],

  // Marketing roles
  'marketing|growth|seo|content|brand|demand gen|digital marketing': [
    'MARKETING', 'ANALYTICS', 'ADVERTISING', 'MARKETING AUTOMATION'
  ],

  // HR/People roles
  'hr|recruiter|people|talent|human resources|hris': [
    'HR', 'HUMAN RESOURCES', 'HRIS', 'RECRUITING'
  ],

  // Product/Design roles
  'product|designer|ux|ui|creative': [
    'PRODUCT AND DESIGN', 'DESIGN', 'UX', 'PROTOTYPING'
  ],

  // Operations roles
  'operations|ops|supply chain|logistics|procurement': [
    'OPERATIONS', 'SUPPLY CHAIN', 'LOGISTICS', 'ERP'
  ],

  // Data roles
  'data|analyst|analytics|bi|scientist': [
    'ANALYTICS', 'BUSINESS INTELLIGENCE', 'DATA', 'REPORTING'
  ],

  // IT/Support roles
  'it|support|helpdesk|system admin|infrastructure': [
    'IT', 'INFRASTRUCTURE', 'SUPPORT', 'SECURITY'
  ],

  // Legal roles
  'legal|lawyer|counsel|compliance|paralegal': [
    'LEGAL', 'COMPLIANCE', 'CONTRACT MANAGEMENT'
  ]
};
```

### 3. Determine Candidate's Role
Extract role from candidate data:
```javascript
const getCandidateRole = (candidate) => {
  return (
    candidate.job_title ||
    candidate.current_position ||
    candidate.title ||
    // Also check skills for role context
    candidate.skills?.join(' ') ||
    ''
  ).toLowerCase();
};
```

### 4. Filter and Prioritize Tech
```javascript
const getRelevantTechCategories = (roleText) => {
  const matchedCategories = [];

  for (const [pattern, categories] of Object.entries(ROLE_CATEGORY_MAP)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(roleText)) {
      matchedCategories.push(...categories);
    }
  }

  // Remove duplicates
  return [...new Set(matchedCategories)];
};

const filterTechByRole = (techStack, relevantCategories) => {
  // First, collect tech from relevant categories
  const relevantTech = [];
  const otherTech = [];

  techStack.forEach(category => {
    const categoryName = category.category?.toUpperCase() || '';
    const isRelevant = relevantCategories.some(rc =>
      categoryName.includes(rc.toUpperCase())
    );

    const techs = category.technologies || category.techs || [];

    if (isRelevant) {
      relevantTech.push({
        category: category.category,
        technologies: techs,
        isRelevant: true
      });
    } else {
      otherTech.push({
        category: category.category,
        technologies: techs,
        isRelevant: false
      });
    }
  });

  return { relevantTech, otherTech };
};
```

### 5. Updated Widget UI
- Show relevant tech categories first with a subtle highlight
- Show category labels (optional, can be collapsed)
- "Show More" expands to all company tech
- Display tech count: "Relevant Tech (12)" or "Tech Stack (12 relevant / 177 total)"

### Example Output for Bouke Verburg (Senior Manager Audit)
**Detected Role**: "Senior Manager Audit" → matches "auditor|accountant|finance"
**Relevant Categories**: FINANCE AND ACCOUNTING, ACCOUNTING, FINANCIAL, ERP

**Widget Display**:
```
📦 Tech Stack (15 relevant)

FINANCE AND ACCOUNTING
[Fiserv] [NetSuite] [Oracle FLEXCUBE] [QuickBooks] [Oracle Fusion Financial Management] [Oracle Hyperion Enterprise] [MicroStrategy] [Zuora]

▼ Show 162 more technologies
```

### Example Output for a Software Engineer
**Detected Role**: "Senior Software Engineer" → matches "engineer|developer|software"
**Relevant Categories**: TESTING AND QA, DEVELOPMENT, DEVOPS, CLOUD

**Widget Display**:
```
📦 Tech Stack (22 relevant)

TESTING AND QA
[Bugzilla] [JUnit] [Katalon] [Selenium] [Zephyr]

DEVOPS
[Jenkins] [Docker] [Kubernetes] [GitHub Actions]

▼ Show 155 more technologies
```

## File to Modify
`/src/components/talent/summary-widgets/TechStackWidget.jsx`

## Additional Considerations
1. **Fallback**: If no role match, show all tech (paginated)
2. **Empty state**: If technographics.tech_stack is empty, show "No tech data available for {company name}"
3. **Category display**: Optional - can show category headers or just flat list of relevant tech
4. **Performance**: Memoize the filtering logic with useMemo

## Testing
After implementation, test with:
1. **Bouke Verburg** (Senior Manager Audit at KPMG) - should show FINANCE AND ACCOUNTING tech
2. A candidate with engineering role - should show TESTING/DEV tech
3. A candidate with HR role - should show HR tech
4. A candidate with no clear role - should show all tech (paginated)
