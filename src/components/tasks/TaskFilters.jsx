import React, { useState, useRef } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "./TaskCard";

export default function TaskFilters({
  filters,
  onFiltersChange,
  projects = [],
  teamMembers = [],
}) {
  const searchRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.assigned_to,
    filters.project_id,
  ].filter(Boolean).length;

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value === "all" ? undefined : value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: filters.search, // Keep search
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <Input
          ref={searchRef}
          placeholder="Search tasks... (/)"
          value={filters.search || ""}
          onChange={(e) => updateFilter("search", e.target.value || undefined)}
          className="pl-10 rounded-[14px] bg-zinc-900/40 backdrop-blur-sm border-zinc-800/60 focus:border-cyan-500/30 h-10"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter("search", undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-2">
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => updateFilter("status", v)}
        >
          <SelectTrigger className={`w-[130px] rounded-[14px] bg-zinc-900/40 backdrop-blur-sm h-10 text-sm ${filters.status ? "border-cyan-500/20" : "border-zinc-800/60"}`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || "all"}
          onValueChange={(v) => updateFilter("priority", v)}
        >
          <SelectTrigger className={`w-[130px] rounded-[14px] bg-zinc-900/40 backdrop-blur-sm h-10 text-sm ${filters.priority ? "border-cyan-500/20" : "border-zinc-800/60"}`}>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Priority</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {projects.length > 0 && (
          <Select
            value={filters.project_id || "all"}
            onValueChange={(v) => updateFilter("project_id", v)}
          >
            <SelectTrigger className={`w-[140px] rounded-[14px] bg-zinc-900/40 backdrop-blur-sm h-10 text-sm ${filters.project_id ? "border-cyan-500/20" : "border-zinc-800/60"}`}>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title || p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="rounded-full text-zinc-500 hover:text-cyan-400 h-10 px-2"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}
