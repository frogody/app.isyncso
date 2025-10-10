
import React, { useState, useEffect } from "react";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User as UserIcon, Building2, MapPin } from "lucide-react";
import SyncAvatar from "../ui/SyncAvatar"; // Added import

export default function CandidateSelectionModal({ open, onClose, onSelectCandidate }) {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCandidates();
    }
  }, [open]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCandidates(candidates);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = candidates.filter(c => 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.company_name?.toLowerCase().includes(query) ||
        c.job_title?.toLowerCase().includes(query)
      );
      setFilteredCandidates(filtered);
    }
  }, [searchQuery, candidates]);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      let candidateData = [];
      
      if (user?.organization_id) {
        const orgCandidates = await Candidate.filter({ organization_id: user.organization_id }, "-created_date", 100);
        const unassignedCandidates = await Candidate.list("-created_date", 100);
        const unassignedOnly = unassignedCandidates.filter(c => 
          !c.organization_id && !orgCandidates.some(oc => oc.id === c.id)
        );
        candidateData = [...orgCandidates, ...unassignedOnly];
      } else {
        candidateData = await Candidate.list("-created_date", 100);
      }
      
      setCandidates(candidateData);
    } catch (error) {
      console.error("Error loading candidates:", error);
      setCandidates([]);
    }
    setIsLoading(false);
  };

  const handleSelect = (candidate) => {
    onSelectCandidate(candidate);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] border-0 p-0 gap-0 overflow-hidden" // clip any rings/glows
        style={{
          background: 'rgba(12,16,20,0.98)', // more opaque, no bleed-through
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          borderRadius: '16px'
        }}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold" style={{color: 'var(--txt)'}}>
            Select Candidate
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color: 'var(--muted)'}} />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border focus-visible:ring-0 focus-visible:ring-offset-0 outline-none transition-colors"
              style={{
                color: 'var(--txt)', 
                borderColor: 'rgba(255,255,255,.14)',
                backgroundColor: 'rgba(255,255,255,.04)'
              }}
            />
          </div>

          {/* Candidates List */}
          <ScrollArea className="h-96 pr-2 overflow-x-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <SyncAvatar size={48} />
                <span style={{color: 'var(--muted)'}}>Loading candidates...</span>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="w-8 h-8 mx-auto mb-3" style={{color: 'var(--muted)'}} />
                <p style={{color: 'var(--muted)'}}>
                  {searchQuery ? 'No matching candidates found' : 'No candidates found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    role="button"
                    onClick={() => handleSelect(candidate)}
                    className="group p-4 rounded-xl cursor-pointer transition-all duration-150"
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)'
                    }}
                    // Removed blur and JS hover mutations to avoid ghost lines
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(candidate); }}
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{backgroundColor: 'rgba(255,255,255,.08)'}}
                      >
                        <UserIcon className="w-5 h-5" style={{color: 'var(--muted)'}} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate mb-1 text-base" style={{color: 'var(--txt)'}}>
                          {candidate.first_name} {candidate.last_name}
                        </h4>
                        {(candidate.job_title || candidate.company_name) && (
                          <div className="flex items-center gap-2 text-sm mb-1" style={{color: 'var(--muted)'}}>
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {[candidate.job_title, candidate.company_name].filter(Boolean).join(' • ')}
                            </span>
                          </div>
                        )}
                        {candidate.person_home_location && (
                          <div className="flex items-center gap-2 text-xs" style={{color: 'var(--muted)'}}>
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{candidate.person_home_location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t px-0" style={{borderColor: 'rgba(255,255,255,.06)'}}>
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="bg-transparent hover:bg-white/5"
              style={{
                color: 'var(--muted)', 
                borderColor: 'rgba(255,255,255,.12)'
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
