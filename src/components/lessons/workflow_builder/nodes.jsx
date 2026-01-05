export const DEFAULT_NODE_ORDER = [
  "Input",
  "AI",
  "Decision",
  "Output",
  "Transform",
  "Filter",
  "Loop"
];

export const NODE_TYPES = {
  Input: {
    id: "Input",
    label: "Input Node",
    description: "Define input parameters",
    color: "#3b82f6"
  },
  AI: {
    id: "AI",
    label: "AI Node",
    description: "AI processing step",
    color: "#10b981"
  },
  Decision: {
    id: "Decision",
    label: "Decision Node",
    description: "Conditional branching",
    color: "#f59e0b"
  },
  Output: {
    id: "Output",
    label: "Output Node",
    description: "Final output",
    color: "#8b5cf6"
  },
  Transform: {
    id: "Transform",
    label: "Transform Node",
    description: "Data transformation",
    color: "#06b6d4"
  },
  Filter: {
    id: "Filter",
    label: "Filter Node",
    description: "Filter data",
    color: "#ec4899"
  },
  Loop: {
    id: "Loop",
    label: "Loop Node",
    description: "Iterate over data",
    color: "#14b8a6"
  }
};