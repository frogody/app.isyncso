import { useState, useEffect, useCallback } from 'react';
import { brandProjectService } from '../services/brand-project-service';
import { toast } from 'sonner';

const STAGE_COLUMN_MAP = {
  1: 'brand_dna',
  2: 'color_system',
  3: 'typography_system',
  4: 'logo_system',
  5: 'verbal_identity',
  6: 'visual_language',
  7: 'applications',
  8: 'brand_book',
};

export function useBrandProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProject = useCallback(async () => {
    if (!projectId || projectId === 'new') {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await brandProjectService.get(projectId);
      setProject(data);
      setError(null);
    } catch (err) {
      setError(err);
      toast.error('Failed to load brand project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const updateStageData = useCallback(async (stage, data) => {
    if (!projectId) return;
    const column = STAGE_COLUMN_MAP[stage];
    setProject(prev => prev ? { ...prev, [column]: data } : prev);
    try {
      await brandProjectService.updateStageData(projectId, stage, data);
    } catch (err) {
      toast.error('Failed to save stage data');
    }
  }, [projectId]);

  const updateWizardState = useCallback(async (wizardState) => {
    if (!projectId) return;
    setProject(prev => prev ? { ...prev, wizard_state: wizardState } : prev);
    try {
      await brandProjectService.updateWizardState(projectId, wizardState);
    } catch (err) {
      console.error('[useBrandProject] Failed to save wizard state:', err);
    }
  }, [projectId]);

  const updateName = useCallback(async (name) => {
    if (!projectId) return;
    setProject(prev => prev ? { ...prev, name } : prev);
    try {
      await brandProjectService.updateName(projectId, name);
    } catch (err) {
      toast.error('Failed to rename project');
    }
  }, [projectId]);

  return {
    project,
    loading,
    error,
    reload: loadProject,
    updateStageData,
    updateWizardState,
    updateName,
  };
}
