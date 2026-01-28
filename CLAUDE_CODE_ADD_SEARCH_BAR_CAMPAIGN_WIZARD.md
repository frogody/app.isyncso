# Add Search Bar to Campaign Wizard - Project Selection

## Feature Request
Add a search bar to the New Campaign wizard (Step 1: Select Project) so users can easily find projects when they have many projects to choose from.

## File to Modify
`src/components/talent/CampaignWizard.jsx`

---

## Prompt for Claude Code

```
Add a search bar to the Campaign Wizard in src/components/talent/CampaignWizard.jsx

**Location:** Step 1 "Select Project" - add search bar above the project list

**Requirements:**

1. Add state for the search query:
   const [projectSearch, setProjectSearch] = useState("");

2. Filter projects based on search:
   const filteredProjects = projects.filter(project =>
     project.name?.toLowerCase().includes(projectSearch.toLowerCase())
   );

3. Add a search input field at the top of the project selection step:
   - Placeholder text: "Search projects..."
   - Search icon (magnifying glass) on the left
   - Clear button (X) when there's text
   - Styled consistently with the rest of the wizard UI

4. Render filteredProjects instead of projects in the list

5. Show a "No projects found" message if search returns empty results

6. Clear search when wizard closes or moves to next step

**Example Implementation:**
{/* Search Bar */}
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
  <input
    type="text"
    placeholder="Search projects..."
    value={projectSearch}
    onChange={(e) => setProjectSearch(e.target.value)}
    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
  {projectSearch && (
    <button
      onClick={() => setProjectSearch("")}
      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      <X className="h-4 w-4" />
    </button>
  )}
</div>

{/* Project List */}
{filteredProjects.length === 0 ? (
  <p className="text-gray-500 text-center py-4">No projects found matching "{projectSearch}"</p>
) : (
  filteredProjects.map((project) => (
    // ... existing project card rendering
  ))
)}

**Import (if not already present):**
import { Search, X } from "lucide-react";

**Test:**
1. Open /talentcampaigns
2. Click "New Campaign"
3. Search bar should appear above project list
4. Typing should filter projects in real-time
5. Clear button should reset the search
```
