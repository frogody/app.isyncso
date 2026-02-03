/**
 * useGrowthAI Hook
 * React hook for executing AI research columns and calculating fit scores
 */

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { GrowthAIService, AI_MODELS, STANDARD_VARIABLES } from '@/services/GrowthAIService';

/**
 * Hook for Growth AI operations
 */
export function useGrowthAI() {
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  // Create service instance
  const service = useMemo(() => new GrowthAIService(supabase), []);

  /**
   * Execute AI analysis for a specific column on selected rows
   */
  const executeAIColumn = useCallback(async (columnId, rows, options = {}) => {
    setExecuting(true);
    setProgress({ completed: 0, total: rows.length, percentage: 0 });
    setError(null);

    try {
      // Load column config
      const { data: column, error: columnError } = await supabase
        .from('enrich_columns')
        .select('*')
        .eq('id', columnId)
        .single();

      if (columnError) throw columnError;
      if (!column) throw new Error('Column not found');
      if (column.type !== 'ai') throw new Error('Not an AI column');

      // Load all columns for variable substitution
      const { data: allColumns, error: columnsError } = await supabase
        .from('enrich_columns')
        .select('*')
        .eq('workspace_id', column.workspace_id);

      if (columnsError) throw columnsError;

      // Prepare column config
      const columnConfig = {
        columnId: column.id,
        prompt: column.config?.prompt || '',
        model: column.config?.model || 'kimi-k2',
        systemPrompt: column.config?.systemPrompt,
        maxTokens: column.config?.maxTokens || 500,
        temperature: column.config?.temperature || 0.7,
      };

      // Execute
      const result = await service.executeForRows(
        columnConfig,
        rows,
        allColumns,
        (progressUpdate) => {
          setProgress(progressUpdate);
          options.onProgress?.(progressUpdate);
        },
        {
          batchSize: options.batchSize || 5,
          saveResults: options.saveResults !== false,
        }
      );

      return result;
    } catch (err) {
      console.error('Error executing AI column:', err);
      setError(err.message);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, [service]);

  /**
   * Execute AI for all rows in a column
   */
  const executeAIColumnForAll = useCallback(async (columnId, workspaceId, options = {}) => {
    setExecuting(true);
    setError(null);

    try {
      // Load all rows for the workspace
      const { data: rows, error: rowsError } = await supabase
        .from('enrich_rows')
        .select(`*, enrich_cells(*)`)
        .eq('workspace_id', workspaceId)
        .order('order_index');

      if (rowsError) throw rowsError;

      // Transform rows to include cells as a map
      const transformedRows = (rows || []).map(row => ({
        ...row,
        cells: (row.enrich_cells || []).reduce((acc, cell) => {
          acc[cell.column_id] = cell;
          return acc;
        }, {}),
      }));

      // Filter out rows that already have results if specified
      let targetRows = transformedRows;
      if (options.skipCompleted) {
        const { data: column } = await supabase
          .from('enrich_columns')
          .select('id')
          .eq('id', columnId)
          .single();

        targetRows = transformedRows.filter(row => {
          const cell = row.cells?.[column?.id];
          return !cell?.value || cell?.status === 'error';
        });
      }

      if (targetRows.length === 0) {
        return {
          success: true,
          message: 'No rows to process',
          results: [],
        };
      }

      return await executeAIColumn(columnId, targetRows, options);
    } catch (err) {
      console.error('Error executing AI column for all:', err);
      setError(err.message);
      throw err;
    }
  }, [executeAIColumn]);

  /**
   * Execute AI for a single row
   */
  const executeAIForRow = useCallback(async (columnId, row) => {
    setError(null);

    try {
      // Load column config
      const { data: column, error: columnError } = await supabase
        .from('enrich_columns')
        .select('*')
        .eq('id', columnId)
        .single();

      if (columnError) throw columnError;

      // Load all columns
      const { data: allColumns } = await supabase
        .from('enrich_columns')
        .select('*')
        .eq('workspace_id', column.workspace_id);

      const columnConfig = {
        columnId: column.id,
        prompt: column.config?.prompt || '',
        model: column.config?.model || 'kimi-k2',
        systemPrompt: column.config?.systemPrompt,
        maxTokens: column.config?.maxTokens || 500,
        temperature: column.config?.temperature || 0.7,
      };

      // Mark cell as loading
      await service.updateCellStatus(columnId, [row.id], 'loading');

      // Execute
      const result = await service.executeForRow(columnConfig, row, allColumns);

      // Save result
      if (result.success) {
        await service.saveCellValues(columnId, [result]);
      } else {
        await service.updateCellStatus(columnId, [row.id], 'error', result.error);
      }

      return result;
    } catch (err) {
      console.error('Error executing AI for row:', err);
      setError(err.message);
      throw err;
    }
  }, [service]);

  /**
   * Calculate fit scores for all rows in a workspace
   */
  const calculateFitScores = useCallback(async (workspaceId, campaignId, options = {}) => {
    setExecuting(true);
    setProgress({ completed: 0, total: 0, percentage: 0 });
    setError(null);

    try {
      // Load campaign if campaignId provided
      let campaign = null;
      if (campaignId) {
        const { data: campaignData } = await supabase
          .from('growth_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        campaign = campaignData;
      }

      const result = await service.calculateAllFitScores(
        workspaceId,
        campaign,
        (progressUpdate) => {
          setProgress(progressUpdate);
          options.onProgress?.(progressUpdate);
        }
      );

      return result;
    } catch (err) {
      console.error('Error calculating fit scores:', err);
      setError(err.message);
      throw err;
    } finally {
      setExecuting(false);
    }
  }, [service]);

  /**
   * Cancel ongoing execution
   */
  const cancelExecution = useCallback(() => {
    service.cancel();
    setExecuting(false);
  }, [service]);

  /**
   * Preview prompt with variable substitution
   */
  const previewPrompt = useCallback((prompt, rowData, allColumns = []) => {
    return service.substituteVariables(prompt, rowData, allColumns);
  }, [service]);

  /**
   * Get available variables for a workspace
   */
  const getAvailableVariables = useCallback(async (workspaceId) => {
    try {
      const { data: columns } = await supabase
        .from('enrich_columns')
        .select('id, name, key, type')
        .eq('workspace_id', workspaceId)
        .eq('type', 'field');

      const columnVariables = (columns || []).map(col => ({
        key: col.key || col.name.toLowerCase().replace(/\s+/g, '_'),
        label: col.name,
        description: `Value from ${col.name} column`,
        type: 'column',
      }));

      return [...STANDARD_VARIABLES, ...columnVariables];
    } catch (err) {
      console.error('Error getting variables:', err);
      return STANDARD_VARIABLES;
    }
  }, []);

  /**
   * Estimate cost for executing AI on rows
   */
  const estimateCost = useCallback((rowCount, model = 'kimi-k2', avgTokensPerRow = 500) => {
    const totalTokens = rowCount * avgTokensPerRow;
    return service.estimateCost(totalTokens, model);
  }, [service]);

  /**
   * Clear the result cache
   */
  const clearCache = useCallback(() => {
    service.clearCache();
  }, [service]);

  return {
    // State
    executing,
    progress,
    error,

    // Actions
    executeAIColumn,
    executeAIColumnForAll,
    executeAIForRow,
    calculateFitScores,
    cancelExecution,
    previewPrompt,
    getAvailableVariables,
    estimateCost,
    clearCache,

    // Constants
    models: AI_MODELS,
    standardVariables: STANDARD_VARIABLES,
  };
}

export default useGrowthAI;
