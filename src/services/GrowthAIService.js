/**
 * Growth AI Service
 * Executes AI research columns against prospect data using Together.ai
 */

import { supabase } from '@/api/supabaseClient';

// Model configurations
export const AI_MODELS = {
  'kimi-k2': {
    id: 'moonshotai/Kimi-K2-Instruct',
    name: 'Kimi K2',
    description: 'Best for complex analysis',
    maxTokens: 4096,
    contextWindow: 128000,
    costPer1kTokens: 0.001,
    recommended: true,
  },
  'llama-3.3-70b': {
    id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    name: 'Llama 3.3 70B',
    description: 'Fast and reliable',
    maxTokens: 4096,
    contextWindow: 128000,
    costPer1kTokens: 0.0008,
  },
  'qwen-2.5-72b': {
    id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    name: 'Qwen 2.5 72B',
    description: 'Great for research',
    maxTokens: 4096,
    contextWindow: 32768,
    costPer1kTokens: 0.0012,
  },
  'deepseek-v3': {
    id: 'deepseek-ai/DeepSeek-V3',
    name: 'DeepSeek V3',
    description: 'Strong reasoning',
    maxTokens: 8192,
    contextWindow: 64000,
    costPer1kTokens: 0.0009,
  },
};

// Standard variables available for substitution
export const STANDARD_VARIABLES = [
  { key: 'company', label: 'Company Name', description: 'The prospect company name' },
  { key: 'website', label: 'Website', description: 'Company website URL' },
  { key: 'industry', label: 'Industry', description: 'Company industry' },
  { key: 'location', label: 'Location', description: 'Company headquarters location' },
  { key: 'employee_count', label: 'Employee Count', description: 'Number of employees' },
  { key: 'description', label: 'Description', description: 'Company description' },
  { key: 'all_data', label: 'All Data (JSON)', description: 'Complete row data as JSON' },
];

/**
 * Simple rate limiter to prevent API throttling
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async wait() {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Wait until the oldest request is outside the window
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 10;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.wait(); // Recursively check again
    }

    this.requests.push(now);
  }
}

/**
 * Cache for AI results to avoid duplicate API calls
 */
class ResultCache {
  constructor(maxSize = 1000, ttlMs = 3600000) { // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  generateKey(prompt, rowData) {
    const dataStr = JSON.stringify(rowData);
    return `${prompt}::${dataStr}`;
  }

  get(prompt, rowData) {
    const key = this.generateKey(prompt, rowData);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(prompt, rowData, value) {
    const key = this.generateKey(prompt, rowData);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Main Growth AI Service class
 */
export class GrowthAIService {
  constructor(supabaseClient = supabase) {
    this.supabase = supabaseClient;
    this.rateLimiter = new RateLimiter(10, 1000); // 10 requests per second
    this.cache = new ResultCache();
    this.abortController = null;
  }

  /**
   * Substitute variables in a prompt with actual row data
   */
  substituteVariables(prompt, rowData, allColumns) {
    let processedPrompt = prompt;

    // Standard variables
    const standardMappings = {
      company: rowData.company || rowData.company_name || '',
      website: rowData.website || rowData.domain || '',
      industry: rowData.industry || '',
      location: rowData.location || rowData.headquarters || '',
      employee_count: rowData.employee_count || rowData.employees || '',
      description: rowData.description || rowData.company_description || '',
      all_data: JSON.stringify(rowData, null, 2),
    };

    // Replace standard variables
    for (const [key, value] of Object.entries(standardMappings)) {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      processedPrompt = processedPrompt.replace(regex, String(value || ''));
    }

    // Replace column-based variables
    if (allColumns && rowData.cells) {
      for (const column of allColumns) {
        const columnKey = column.key || column.name.toLowerCase().replace(/\s+/g, '_');
        const cellValue = rowData.cells?.[column.id]?.value || '';
        const regex = new RegExp(`\\{${columnKey}\\}`, 'gi');
        processedPrompt = processedPrompt.replace(regex, String(cellValue));

        // Also try with exact column name
        const nameRegex = new RegExp(`\\{${column.name}\\}`, 'gi');
        processedPrompt = processedPrompt.replace(nameRegex, String(cellValue));
      }
    }

    // Clean up any remaining unmatched variables
    processedPrompt = processedPrompt.replace(/\{[^}]+\}/g, '[unknown]');

    return processedPrompt;
  }

  /**
   * Extract variables from a prompt
   */
  extractVariables(prompt) {
    const matches = prompt.match(/\{([^}]+)\}/g) || [];
    return matches.map(m => m.slice(1, -1));
  }

  /**
   * Execute AI prompt for a single row
   */
  async executeForRow(columnConfig, rowData, allColumns, retryCount = 0) {
    const maxRetries = 3;

    try {
      // Check cache first
      const cachedResult = this.cache.get(columnConfig.prompt, rowData);
      if (cachedResult) {
        return {
          rowId: rowData.id,
          success: true,
          result: cachedResult.result,
          cached: true,
          tokensUsed: 0,
        };
      }

      // Substitute variables
      const processedPrompt = this.substituteVariables(
        columnConfig.prompt,
        rowData,
        allColumns
      );

      // Get model config
      const modelKey = columnConfig.model || 'kimi-k2';
      const modelConfig = AI_MODELS[modelKey] || AI_MODELS['kimi-k2'];

      // Call edge function
      const { data, error } = await this.supabase.functions.invoke('growth-ai-execute', {
        body: {
          prompt: processedPrompt,
          model: modelConfig.id,
          systemPrompt: columnConfig.systemPrompt || 'You are a data enrichment tool. Your ONLY job is to return the requested data point or value. Rules: Return ONLY the answer — no explanations, no introductions, no conversational filler. Do NOT say "Sure!", "Here is...", "Based on..." or similar phrases. If the answer is unknown, return "N/A". Be factual and precise.',
          maxTokens: columnConfig.maxTokens || 500,
          temperature: columnConfig.temperature || 0.7,
        },
      });

      if (error) throw error;

      // Cache successful result
      this.cache.set(columnConfig.prompt, rowData, { result: data.result });

      return {
        rowId: rowData.id,
        success: true,
        result: data.result,
        tokensUsed: data.tokens_used || 0,
        model: modelKey,
      };
    } catch (error) {
      console.error(`Error executing AI for row ${rowData.id}:`, error);

      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.executeForRow(columnConfig, rowData, allColumns, retryCount + 1);
      }

      return {
        rowId: rowData.id,
        success: false,
        error: error.message || 'Failed to execute AI analysis',
        retries: retryCount,
      };
    }
  }

  /**
   * Execute AI prompt for multiple rows with progress callback
   */
  async executeForRows(columnConfig, rows, allColumns, onProgress, options = {}) {
    const { batchSize = 5, saveResults = true } = options;
    const results = [];
    let totalTokensUsed = 0;

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      for (let i = 0; i < rows.length; i += batchSize) {
        // Check for cancellation
        if (this.abortController.signal.aborted) {
          break;
        }

        const batch = rows.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(row => this.executeForRow(columnConfig, row, allColumns))
        );

        results.push(...batchResults);

        // Calculate tokens used
        const batchTokens = batchResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);
        totalTokensUsed += batchTokens;

        // Save intermediate results to database
        if (saveResults) {
          await this.saveCellValues(columnConfig.columnId, batchResults);
        }

        // Report progress
        const completed = Math.min(i + batchSize, rows.length);
        onProgress?.({
          completed,
          total: rows.length,
          percentage: Math.round((completed / rows.length) * 100),
          latestResults: batchResults,
          tokensUsed: totalTokensUsed,
          estimatedCost: this.estimateCost(totalTokensUsed, columnConfig.model),
        });

        // Rate limit between batches (skip for last batch)
        if (i + batchSize < rows.length) {
          await this.rateLimiter.wait();
        }
      }

      return {
        success: true,
        results,
        totalRows: rows.length,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length,
        tokensUsed: totalTokensUsed,
        estimatedCost: this.estimateCost(totalTokensUsed, columnConfig.model),
      };
    } catch (error) {
      console.error('Error in batch execution:', error);
      return {
        success: false,
        results,
        error: error.message,
        tokensUsed: totalTokensUsed,
      };
    }
  }

  /**
   * Cancel ongoing execution
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Save cell values to database
   */
  async saveCellValues(columnId, results) {
    const successfulResults = results.filter(r => r.success);

    if (successfulResults.length === 0) return;

    try {
      // Upsert cells
      const cells = successfulResults.map(r => ({
        row_id: r.rowId,
        column_id: columnId,
        value: r.result,
        status: 'complete',
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('enrich_cells')
        .upsert(cells, {
          onConflict: 'row_id,column_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving cell values:', error);
    }
  }

  /**
   * Update cell status (loading, error, etc.)
   */
  async updateCellStatus(columnId, rowIds, status, error = null) {
    try {
      const updates = rowIds.map(rowId => ({
        row_id: rowId,
        column_id: columnId,
        status,
        error: error,
        updated_at: new Date().toISOString(),
      }));

      await this.supabase
        .from('enrich_cells')
        .upsert(updates, { onConflict: 'row_id,column_id' });
    } catch (err) {
      console.error('Error updating cell status:', err);
    }
  }

  /**
   * Estimate cost based on tokens and model
   */
  estimateCost(tokens, modelKey = 'kimi-k2') {
    const model = AI_MODELS[modelKey] || AI_MODELS['kimi-k2'];
    return (tokens / 1000) * model.costPer1kTokens;
  }

  /**
   * Calculate fit score for a prospect
   */
  calculateFitScore(rowData, campaign, aiResults = {}) {
    let score = 0;
    const breakdown = {};

    // 1. Industry Match (30 points)
    const industries = campaign?.target_industries || campaign?.role_context?.industries || [];
    const rowIndustry = rowData.industry || rowData.cells?.industry?.value || '';

    if (industries.length > 0 && rowIndustry) {
      const industryMatch = industries.some(ind =>
        rowIndustry.toLowerCase().includes(ind.toLowerCase()) ||
        ind.toLowerCase().includes(rowIndustry.toLowerCase())
      );
      if (industryMatch) {
        score += 30;
        breakdown.industry = 30;
      }
    } else if (industries.length === 0) {
      // No industry filter, give partial credit
      score += 15;
      breakdown.industry = 15;
    }

    // 2. Company Size Match (20 points)
    const employeeCount = parseInt(rowData.employee_count || rowData.cells?.employee_count?.value || 0);
    const targetSize = campaign?.target_company_size || campaign?.role_context?.company_size || [];

    if (targetSize.length > 0 && employeeCount > 0) {
      if (this.sizeInRange(employeeCount, targetSize)) {
        score += 20;
        breakdown.companySize = 20;
      }
    } else if (targetSize.length === 0) {
      score += 10;
      breakdown.companySize = 10;
    }

    // 3. AI Sentiment Analysis (30 points)
    const sentiment = this.analyzeAISentiment(aiResults);
    const sentimentScore = Math.round(sentiment * 30);
    score += sentimentScore;
    breakdown.aiSentiment = sentimentScore;

    // 4. Data Completeness (20 points)
    const completeness = this.calculateCompleteness(rowData);
    const completenessScore = Math.round(completeness * 20);
    score += completenessScore;
    breakdown.dataCompleteness = completenessScore;

    return {
      score: Math.min(100, Math.round(score)),
      breakdown,
      level: score >= 80 ? 'hot' : score >= 50 ? 'warm' : 'cold',
    };
  }

  /**
   * Check if employee count is in target range
   */
  sizeInRange(count, targetRanges) {
    const ranges = {
      '1-10': [1, 10],
      '11-50': [11, 50],
      '51-200': [51, 200],
      '201-500': [201, 500],
      '501-1000': [501, 1000],
      '1001-5000': [1001, 5000],
      '5000+': [5000, Infinity],
    };

    for (const range of targetRanges) {
      const [min, max] = ranges[range] || [0, 0];
      if (count >= min && count <= max) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze AI results for positive/negative sentiment
   */
  analyzeAISentiment(aiResults) {
    const positiveSignals = [
      'good fit', 'strong match', 'would benefit', 'ideal', 'recommend',
      'perfect', 'excellent', 'highly relevant', 'great opportunity',
      'strong candidate', 'well-suited', 'high potential'
    ];

    const negativeSignals = [
      'not a fit', 'poor match', 'unlikely', 'not recommended',
      'mismatch', 'not suitable', 'low potential', 'does not align',
      'wrong size', 'different market', 'no indication'
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    const allText = Object.values(aiResults)
      .filter(v => typeof v === 'string')
      .join(' ')
      .toLowerCase();

    positiveSignals.forEach(signal => {
      if (allText.includes(signal)) positiveCount++;
    });

    negativeSignals.forEach(signal => {
      if (allText.includes(signal)) negativeCount++;
    });

    const total = positiveCount + negativeCount;
    return total > 0 ? positiveCount / total : 0.5; // Default to neutral
  }

  /**
   * Calculate data completeness for a row
   */
  calculateCompleteness(rowData) {
    const importantFields = [
      'company', 'company_name',
      'website', 'domain',
      'industry',
      'location', 'headquarters',
      'employee_count', 'employees',
      'description', 'company_description',
    ];

    let filledCount = 0;
    let totalChecked = 0;

    for (const field of importantFields) {
      if (rowData[field] !== undefined) {
        totalChecked++;
        if (rowData[field] && String(rowData[field]).trim() !== '') {
          filledCount++;
        }
      }
    }

    // Also check cells if available
    if (rowData.cells) {
      const cellValues = Object.values(rowData.cells);
      totalChecked += cellValues.length;
      filledCount += cellValues.filter(c => c?.value && String(c.value).trim() !== '').length;
    }

    return totalChecked > 0 ? filledCount / totalChecked : 0;
  }

  /**
   * Calculate fit scores for all rows in a workspace
   */
  async calculateAllFitScores(workspaceId, campaign, onProgress) {
    try {
      // Load all rows
      const { data: rows, error: rowsError } = await this.supabase
        .from('enrich_rows')
        .select(`*, enrich_cells(*)`)
        .eq('workspace_id', workspaceId);

      if (rowsError) throw rowsError;

      // Transform rows
      const transformedRows = rows.map(row => ({
        ...row,
        cells: (row.enrich_cells || []).reduce((acc, cell) => {
          acc[cell.column_id] = cell;
          return acc;
        }, {}),
      }));

      // Load AI columns for sentiment analysis
      const { data: aiColumns } = await this.supabase
        .from('enrich_columns')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('type', 'ai');

      const aiColumnIds = new Set((aiColumns || []).map(c => c.id));

      // Calculate scores
      const results = [];

      for (let i = 0; i < transformedRows.length; i++) {
        const row = transformedRows[i];

        // Gather AI results for this row
        const aiResults = {};
        for (const [columnId, cell] of Object.entries(row.cells || {})) {
          if (aiColumnIds.has(columnId) && cell?.value) {
            aiResults[columnId] = cell.value;
          }
        }

        const scoreResult = this.calculateFitScore(row, campaign, aiResults);
        results.push({
          rowId: row.id,
          ...scoreResult,
        });

        onProgress?.({
          completed: i + 1,
          total: transformedRows.length,
          percentage: Math.round(((i + 1) / transformedRows.length) * 100),
        });
      }

      // Find or create fit score column
      let { data: fitColumn } = await this.supabase
        .from('enrich_columns')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('type', 'fit_score')
        .single();

      if (!fitColumn) {
        const { data: newColumn } = await this.supabase
          .from('enrich_columns')
          .insert({
            workspace_id: workspaceId,
            name: 'Fit Score',
            type: 'fit_score',
            order_index: 999,
          })
          .select()
          .single();

        fitColumn = newColumn;
      }

      // Save scores to cells
      if (fitColumn) {
        const cells = results.map(r => ({
          row_id: r.rowId,
          column_id: fitColumn.id,
          value: r.score,
          status: 'complete',
          metadata: { breakdown: r.breakdown, level: r.level },
        }));

        await this.supabase
          .from('enrich_cells')
          .upsert(cells, { onConflict: 'row_id,column_id' });
      }

      return {
        success: true,
        results,
        columnId: fitColumn?.id,
        summary: {
          total: results.length,
          hot: results.filter(r => r.level === 'hot').length,
          warm: results.filter(r => r.level === 'warm').length,
          cold: results.filter(r => r.level === 'cold').length,
          avgScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
        },
      };
    } catch (error) {
      console.error('Error calculating fit scores:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear the result cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const growthAIService = new GrowthAIService();

export default GrowthAIService;
