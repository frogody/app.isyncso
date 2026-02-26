import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const STAGES = [
  { id: 1, key: 'brand-dna', label: 'Brand DNA', icon: 'Dna' },
  { id: 2, key: 'colors', label: 'Color System', icon: 'Palette' },
  { id: 3, key: 'typography', label: 'Typography', icon: 'Type' },
  { id: 4, key: 'logo', label: 'Logo System', icon: 'Hexagon' },
  { id: 5, key: 'verbal', label: 'Verbal Identity', icon: 'MessageSquare' },
  { id: 6, key: 'visual', label: 'Visual Language', icon: 'Eye' },
  { id: 7, key: 'applications', label: 'Applications', icon: 'Layout' },
  { id: 8, key: 'brand-book', label: 'Brand Book', icon: 'BookOpen' },
];

const STAGE_KEY_TO_ID = Object.fromEntries(STAGES.map(s => [s.key, s.id]));

export function useWizardNavigation(project) {
  const navigate = useNavigate();
  const { projectId, screen } = useParams();

  const currentStage = useMemo(() => {
    if (screen && STAGE_KEY_TO_ID[screen]) {
      return STAGE_KEY_TO_ID[screen];
    }
    return project?.current_stage || 1;
  }, [screen, project]);

  const currentStageData = useMemo(() => {
    return STAGES.find(s => s.id === currentStage) || STAGES[0];
  }, [currentStage]);

  const goToStage = useCallback((stageId) => {
    const stage = STAGES.find(s => s.id === stageId);
    if (stage) {
      navigate(`/create/brand-builder/${projectId}/${stage.key}`, { replace: true });
    }
  }, [navigate, projectId]);

  const goNext = useCallback(() => {
    if (currentStage < 8) goToStage(currentStage + 1);
  }, [currentStage, goToStage]);

  const goBack = useCallback(() => {
    if (currentStage > 1) goToStage(currentStage - 1);
  }, [currentStage, goToStage]);

  return {
    currentStage,
    currentStageData,
    stages: STAGES,
    goToStage,
    goNext,
    goBack,
    projectId,
  };
}
