import { BrandBuilderProject } from '@/api/entities';

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

const DEFAULT_WIZARD_STATE = {
  current_screen: 'brand-dna',
  completed_screens: [],
  entry_path: 'scratch',
};

export const brandProjectService = {
  async create({ companyId, userId, name = 'Untitled Brand' }) {
    return BrandBuilderProject.create({
      company_id: companyId,
      created_by: userId,
      name,
      status: 'draft',
      current_stage: 1,
      wizard_state: DEFAULT_WIZARD_STATE,
    });
  },

  async get(id) {
    return BrandBuilderProject.get(id);
  },

  async listForCompany(companyId) {
    return BrandBuilderProject.filter(
      { company_id: companyId },
      { order: { column: 'updated_at', ascending: false } }
    );
  },

  async updateStageData(id, stageNumber, data) {
    const column = STAGE_COLUMN_MAP[stageNumber];
    if (!column) throw new Error(`Invalid stage: ${stageNumber}`);
    return BrandBuilderProject.update(id, { [column]: data });
  },

  async updateWizardState(id, wizardState) {
    return BrandBuilderProject.update(id, { wizard_state: wizardState });
  },

  async updateName(id, name) {
    return BrandBuilderProject.update(id, { name });
  },

  async advanceStage(id, newStage) {
    return BrandBuilderProject.update(id, { current_stage: newStage });
  },

  async delete(id) {
    return BrandBuilderProject.delete(id);
  },
};
