import React, { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import ProjectReport from '@/lib/pdf/ProjectReport';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook for generating project reports in various formats
 */
export function useReportGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);

  /**
   * Fetch all data needed for a comprehensive report
   */
  const fetchReportData = useCallback(async (projectId) => {
    setProgress('Fetching project data...');

    // Fetch project details
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Fetch tasks
    setProgress('Fetching tasks...');
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Fetch milestones
    setProgress('Fetching milestones...');
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });

    // Fetch activity
    setProgress('Fetching activity...');
    const { data: activity } = await supabase
      .from('portal_activity')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch approvals
    setProgress('Fetching approvals...');
    const { data: approvals } = await supabase
      .from('portal_approvals')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    return { project, tasks: tasks || [], milestones: milestones || [], activity: activity || [], approvals: approvals || [] };
  }, []);

  /**
   * Generate PDF report
   */
  const generatePDF = useCallback(async (projectId, settings = {}) => {
    setGenerating(true);
    setProgress('Starting PDF generation...');

    try {
      const data = await fetchReportData(projectId);

      setProgress('Rendering PDF...');
      const doc = <ProjectReport {...data} settings={settings} />;
      const blob = await pdf(doc).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.project?.name || 'project'}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(null);
      return { success: true };
    } catch (error) {
      console.error('Error generating PDF:', error);
      setProgress(null);
      return { success: false, error: error.message };
    } finally {
      setGenerating(false);
    }
  }, [fetchReportData]);

  /**
   * Generate CSV export for tasks
   */
  const generateTasksCSV = useCallback(async (projectId) => {
    setGenerating(true);
    setProgress('Exporting tasks to CSV...');

    try {
      const { tasks, project } = await fetchReportData(projectId);

      // CSV headers
      const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created At', 'Description'];

      // CSV rows
      const rows = tasks.map((task) => [
        task.title || task.name || '',
        task.status || 'pending',
        task.priority || 'normal',
        task.assignee_name || '',
        task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
        task.created_at ? new Date(task.created_at).toLocaleDateString() : '',
        (task.description || '').replace(/,/g, ';').replace(/\n/g, ' '),
      ]);

      // Build CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'project'}-tasks-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(null);
      return { success: true };
    } catch (error) {
      console.error('Error generating CSV:', error);
      setProgress(null);
      return { success: false, error: error.message };
    } finally {
      setGenerating(false);
    }
  }, [fetchReportData]);

  /**
   * Generate JSON export of full project data
   */
  const generateJSON = useCallback(async (projectId) => {
    setGenerating(true);
    setProgress('Exporting project data...');

    try {
      const data = await fetchReportData(projectId);

      // Structure export data
      const exportData = {
        exported_at: new Date().toISOString(),
        project: data.project,
        tasks: data.tasks,
        milestones: data.milestones,
        activity: data.activity,
        approvals: data.approvals,
        statistics: {
          total_tasks: data.tasks.length,
          completed_tasks: data.tasks.filter((t) => t.status === 'completed').length,
          total_milestones: data.milestones.length,
          completed_milestones: data.milestones.filter((m) => m.status === 'completed').length,
          pending_approvals: data.approvals.filter((a) => a.status === 'pending').length,
        },
      };

      // Download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.project?.name || 'project'}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(null);
      return { success: true };
    } catch (error) {
      console.error('Error generating JSON:', error);
      setProgress(null);
      return { success: false, error: error.message };
    } finally {
      setGenerating(false);
    }
  }, [fetchReportData]);

  /**
   * Generate activity log CSV
   */
  const generateActivityCSV = useCallback(async (projectId) => {
    setGenerating(true);
    setProgress('Exporting activity log...');

    try {
      const { activity, project } = await fetchReportData(projectId);

      const headers = ['Date', 'Time', 'Action', 'Description', 'Entity Type', 'Entity ID'];

      const rows = activity.map((item) => {
        const date = new Date(item.created_at);
        return [
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          item.action_type || '',
          (item.description || '').replace(/,/g, ';').replace(/\n/g, ' '),
          item.entity_type || '',
          item.entity_id || '',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name || 'project'}-activity-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(null);
      return { success: true };
    } catch (error) {
      console.error('Error generating activity CSV:', error);
      setProgress(null);
      return { success: false, error: error.message };
    } finally {
      setGenerating(false);
    }
  }, [fetchReportData]);

  return {
    generating,
    progress,
    generatePDF,
    generateTasksCSV,
    generateJSON,
    generateActivityCSV,
  };
}

export default useReportGenerator;
