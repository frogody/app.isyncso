import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@/components/context/UserContext';
import { brandProjectService } from './services/brand-project-service';
import { useBrandProject } from './hooks/useBrandProject';
import { useWizardNavigation, STAGES } from './hooks/useWizardNavigation';
import { useAutoSave } from './hooks/useAutoSave';
import WizardShell from './components/WizardShell';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandBuilderWizard() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user, company, isLoading: userLoading } = useUser();
  const [creating, setCreating] = useState(false);

  // Create new project if projectId is 'new'
  useEffect(() => {
    if (projectId !== 'new') return;
    if (creating) return;
    if (userLoading) return; // Wait for user context to finish loading
    if (!user?.id || !company?.id) return;

    setCreating(true);
    brandProjectService
      .create({ companyId: company.id, userId: user.id, name: 'Untitled Brand' })
      .then((project) => {
        navigate(`/create/brand-builder/${project.id}/brand-dna`, { replace: true });
      })
      .catch((err) => {
        console.error('[BrandBuilderWizard] Failed to create project:', err);
        toast.error('Failed to create brand project');
        navigate('/CreateBranding', { replace: true });
      });
  }, [projectId, user?.id, company?.id, userLoading, creating, navigate]);

  // Load existing project
  const { project, loading, error, updateStageData, updateWizardState, updateName } =
    useBrandProject(projectId);

  // Navigation
  const { currentStage, stages, goToStage, goNext, goBack } = useWizardNavigation(project);

  // Auto-save wizard position
  const wizardState = useMemo(
    () => ({ lastStage: currentStage, lastVisited: new Date().toISOString() }),
    [currentStage]
  );

  const saveFn = useCallback(
    (data) => updateWizardState(data),
    [updateWizardState]
  );

  const { saveStatus } = useAutoSave(saveFn, wizardState, 1000);

  // Completed stages — stages that have saved data
  const completedStages = useMemo(() => {
    if (!project) return [];
    const STAGE_COLUMNS = {
      1: 'brand_dna', 2: 'color_system', 3: 'typography_system', 4: 'logo_system',
      5: 'verbal_identity', 6: 'visual_language', 7: 'applications', 8: 'brand_book',
    };
    return Object.entries(STAGE_COLUMNS)
      .filter(([, col]) => project[col] && Object.keys(project[col]).length > 0)
      .map(([id]) => Number(id));
  }, [project]);

  // Reset creating flag once projectId changes from 'new' to a real ID
  useEffect(() => {
    if (projectId !== 'new' && creating) {
      setCreating(false);
    }
  }, [projectId, creating]);

  // Loading state — creating new project
  if (projectId === 'new') {
    // If user context finished loading but no user/company, redirect
    if (!userLoading && (!user?.id || !company?.id) && !creating) {
      return (
        <div className="flex items-center justify-center h-screen bg-black">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-red-400">Please log in to create a brand project</p>
            <button
              onClick={() => navigate('/CreateBranding', { replace: true })}
              className="text-sm text-zinc-400 hover:text-white underline"
            >
              Back to Branding
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          <p className="text-sm text-zinc-400">Creating your brand project...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-red-400">Failed to load project</p>
          <button
            onClick={() => navigate('/CreateBranding', { replace: true })}
            className="text-sm text-zinc-400 hover:text-white underline"
          >
            Back to Branding
          </button>
        </div>
      </div>
    );
  }

  return (
    <WizardShell
      project={project}
      currentStage={currentStage}
      stages={stages}
      completedStages={completedStages}
      saveStatus={saveStatus}
      onStageClick={goToStage}
      onNext={goNext}
      onBack={goBack}
      onNameChange={updateName}
      updateStageData={updateStageData}
    />
  );
}
