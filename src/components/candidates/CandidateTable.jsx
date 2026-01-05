
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";
import { useTranslation } from "@/components/utils/translations";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, CheckSquare, User as UserIcon, Trash2, CheckCircle2, X } from "lucide-react";
import CandidateDetails from "./CandidateDetails";
import CandidateListMobile from "./CandidateListMobile";
import { getUsersByIds } from "@/api/functions";
import LinkedInIcon from "../ui/LinkedInIcon";
import { haptics } from "@/components/utils/haptics";

// A simple IconWrapper component based on the outline's usage
const IconWrapper = ({ icon: Icon, size = 16, variant, className = "", style = {} }) => {
  let defaultStyle = {};
  if (variant === "accent") {
    defaultStyle = { color: '#22C55E' };
  }
  return (
    <span className={`flex items-center justify-center ${className}`} style={{ ...defaultStyle, ...style }}>
      <Icon size={size} />
    </span>
  );
};

export default React.memo(function CandidateTable({ candidates }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const [users, setUsers] = useState({});
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [localCandidates, setLocalCandidates] = useState([]);
  const [_user, setUser] = useState(null);
  // Introduce a state for the current language to ensure a stable value for useTranslation
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Use the currentLanguage state for the translation hook
  const { t } = useTranslation(currentLanguage);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
        // Update currentLanguage once user data is successfully loaded
        if (userData?.language) {
          setCurrentLanguage(userData.language);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        // If user loading fails, currentLanguage will remain 'en' as default
      }
    };
    loadUser();
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    setLocalCandidates(candidates);
  }, [candidates]);

  const userIds = useMemo(() => {
    return [...new Set(candidates.map(c => c.assigned_to).filter(Boolean))];
  }, [candidates]);

  const loadUsers = useCallback(async () => {
    if (userIds.length === 0) {
      setUsers({});
      return;
    }

    try {
      const response = await getUsersByIds({ userIds });
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers({});
    }
  }, [userIds]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleExpanded = useCallback((candidateId) => {
    haptics.light();
    const wasExpanded = expandedRow === candidateId;
    setExpandedRow(wasExpanded ? null : candidateId);
    
    if (!wasExpanded) {
      setTimeout(() => {
        const expandedElement = document.querySelector(`[data-candidate-id="${candidateId}"]`);
        if (expandedElement) {
          expandedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [expandedRow]);

  const toggleCandidateSelection = useCallback((candidateId) => {
    haptics.selection();
    setSelectedCandidates(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(candidateId)) {
        newSelected.delete(candidateId);
      } else {
        newSelected.add(candidateId);
      }
      return newSelected;
    });
  }, []);

  const selectAllCandidates = useCallback(() => {
    haptics.medium();
    setSelectedCandidates(prev => {
      if (prev.size === localCandidates.length && localCandidates.length > 0) {
        return new Set();
      } else {
        return new Set(localCandidates.map(c => c.id));
      }
    });
  }, [localCandidates]);

  const markSelectedAsContacted = useCallback(async () => {
    haptics.medium();
    try {
      const selectedIds = Array.from(selectedCandidates);
      const promises = selectedIds.map(id => {
        const candidateToUpdate = localCandidates.find(c => c.id === id);
        if (candidateToUpdate) {
          return Candidate.update(id, { ...candidateToUpdate, contacted: true });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);

      setLocalCandidates(prevCandidates =>
        prevCandidates.map(c =>
          selectedIds.includes(c.id) ? { ...c, contacted: true } : c
        )
      );
      setSelectedCandidates(new Set());
      haptics.success();
    } catch (error) {
      console.error('Error marking candidates as contacted:', error);
      haptics.error();
    }
  }, [selectedCandidates, localCandidates]);

  const deleteSelectedCandidates = useCallback(async () => {
    if (!confirm(t('confirm_delete_candidates', { count: selectedCandidates.size }))) {
      return;
    }
    
    haptics.heavy();
    
    try {
      const selectedIds = Array.from(selectedCandidates);
      const promises = selectedIds.map(id => Candidate.delete(id));
      await Promise.all(promises);

      setLocalCandidates(prevCandidates =>
        prevCandidates.filter(c => !selectedIds.includes(c.id))
      );
      setSelectedCandidates(new Set());
      setExpandedRow(null);
      haptics.success();
    } catch (error) {
      console.error('Error deleting candidates:', error);
      haptics.error();
    }
  }, [selectedCandidates, t]);

  const renderOwnerCell = (candidate) => {
    if (!candidate.assigned_to) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <span className="text-xs" style={{color: 'var(--muted)'}}>-</span>
        </div>
      );
    }

    const assignedUser = users[candidate.assigned_to];
    
    if (!assignedUser) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <UserIcon className="w-4 h-4" style={{color: 'var(--muted)'}} />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
        {assignedUser.profile_picture ? (
          <img 
            src={assignedUser.profile_picture} 
            alt={assignedUser.full_name}
            className="w-full h-full object-cover"
            title={assignedUser.full_name}
          />
        ) : (
          <span className="text-xs font-medium" style={{color: 'var(--txt)'}} title={assignedUser.full_name}>
            {assignedUser.full_name?.charAt(0) || assignedUser.email?.charAt(0) || '?'}
          </span>
        )}
      </div>
    );
  };

  const handleCandidateUpdate = useCallback((updatedCandidate) => {
    setLocalCandidates(prev => 
      prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c)
    );
  }, []);

  return (
    <>
      <style>{`
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .table-row-hover:hover {
          background: rgba(255,255,255,.04) !important;
          transition: all 0.2s ease;
        }
      `}</style>

      {selectedCandidates.size > 0 && (
        <div 
          className="glass-card p-4 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, .08), rgba(20, 150, 100, .06))',
            borderColor: 'rgba(16, 185, 129, .2)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <IconWrapper icon={CheckSquare} size={20} variant="accent" />
              <span className="text-sm font-semibold" style={{color: 'var(--txt)'}}>
                {selectedCandidates.size} {t('candidates_selected')}
              </span>
              <Button
                onClick={() => setSelectedCandidates(new Set())}
                variant="ghost"
                size="sm"
                className="text-xs hover:bg-white/10"
                style={{color: 'var(--muted)'}}
              >
                <X className="w-3 h-3 mr-1" />
                {t('deselect_all')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={markSelectedAsContacted}
                size="sm"
                style={{
                  background: 'rgba(34,197,94,.15)',
                  border: '1px solid rgba(34,197,94,.3)',
                  color: '#86EFAC'
                }}
                className="hover:bg-green-600/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('mark_as_contacted')}
              </Button>
              <Button
                onClick={deleteSelectedCandidates}
                size="sm"
                style={{
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: '#FCA5A5'
                }}
                className="hover:bg-white/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete_selected')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto hidden md:block">
        <Table>
          <TableHeader
            className="sticky top-0 z-20"
            style={{
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.06))',
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px 12px 0 0'
            }}
          >
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="w-12" style={{color: 'var(--txt)'}}>
                <Checkbox
                  checked={selectedCandidates.size === localCandidates.length && localCandidates.length > 0}
                  onCheckedChange={selectAllCandidates}
                  className="w-4 h-4 border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-md"
                  style={{borderColor: 'rgba(255,255,255,.3)'}}
                />
              </TableHead>
              <TableHead style={{color: 'var(--txt)', fontWeight: 600}}>{t('column_candidate')}</TableHead>
              <TableHead style={{color: 'var(--txt)', fontWeight: 600}}>{t('column_current_role')}</TableHead>
              <TableHead style={{color: 'var(--txt)', fontWeight: 600}}>{t('column_location')}</TableHead>
              <TableHead style={{color: 'var(--txt)', fontWeight: 600}}>{t('column_owner')}</TableHead>
              <TableHead style={{color: 'var(--txt)', fontWeight: 600}}>{t('column_actions')}</TableHead>
              <TableHead className="w-12" style={{color: 'var(--txt)'}}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localCandidates.map((candidate) => (
              <React.Fragment key={candidate.id}>
                <TableRow 
                  className="table-row-hover cursor-pointer border-b" 
                  style={{borderColor: 'rgba(255,255,255,.04)'}}
                  data-candidate-id={candidate.id}
                  onClick={() => toggleExpanded(candidate.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedCandidates.has(candidate.id)}
                      onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                      className="w-4 h-4 border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-md"
                      style={{borderColor: 'rgba(255,255,255,.3)'}}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {/* Profile Picture */}
                      {candidate.profile_picture ? (
                        <img
                          src={candidate.profile_picture}
                          alt={`${candidate.first_name} ${candidate.last_name}`}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          style={{ border: '1px solid rgba(255,255,255,.1)' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.querySelector('.fallback-icon').style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 flex-shrink-0 fallback-icon" 
                           style={{ 
                             border: '1px solid rgba(255,255,255,.1)',
                             display: candidate.profile_picture ? 'none' : 'flex'
                           }}>
                        <UserIcon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                      </div>
                      
                      {/* Name */}
                      <div className="font-semibold" style={{color: 'var(--txt)'}}>
                        {candidate.first_name} {candidate.last_name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium" style={{color: 'var(--txt)'}}>{candidate.job_title}</div>
                      <div className="text-sm" style={{color: 'var(--muted)'}}>{candidate.company_name}</div>
                    </div>
                  </TableCell>
                  <TableCell style={{color: 'var(--txt)'}}>{candidate.person_home_location}</TableCell>
                  <TableCell>
                    {renderOwnerCell(candidate)}
                  </TableCell>
                  <TableCell>
                    {candidate.linkedin_profile && (
                      <Button
                        size="sm" 
                        variant="ghost" 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(candidate.linkedin_profile, '_blank');
                        }}
                        className="h-8 w-8 p-0 rounded-lg hover:bg-blue-900/20"
                        style={{
                          background: 'rgba(10,102,194,.08)',
                          border: '1px solid rgba(10,102,194,.2)'
                        }}
                      >
                        <LinkedInIcon size={14} />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(candidate.id);
                      }}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-white/5"
                    >
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform ${expandedRow === candidate.id ? 'rotate-180' : ''}`}
                        style={{color: 'var(--muted)'}}
                      />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedRow === candidate.id && (
                  <TableRow style={{borderColor: 'rgba(255,255,255,.04)', background: 'rgba(255,255,255,.02)'}}>
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-4">
                        <CandidateDetails 
                          candidate={candidate} 
                          withCardWrapper 
                          onUpdate={handleCandidateUpdate}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        <CandidateListMobile candidates={localCandidates} />
      </div>
    </>
  );
});
