import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { commonStyles as styles, colors, formatDate, getStatusColor } from './styles';

// Project Summary Report - comprehensive overview for clients
export default function ProjectReport({ project, tasks, milestones, activity, approvals, settings }) {
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate stats
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === 'completed' || t.status === 'done').length || 0;
  const overdueTasks = tasks?.filter((t) => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < new Date();
  }).length || 0;

  const totalMilestones = milestones?.length || 0;
  const completedMilestones = milestones?.filter((m) => m.status === 'completed').length || 0;

  const pendingApprovals = approvals?.filter((a) => a.status === 'pending').length || 0;
  const approvedItems = approvals?.filter((a) => a.status === 'approved').length || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{project?.name || 'Project Report'}</Text>
          <Text style={styles.subtitle}>
            Generated on {reportDate} | {settings?.portal_name || 'Client Portal'}
          </Text>
        </View>

        {/* Project Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Overview</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.spaceBetween, styles.mb10]}>
              <View>
                <Text style={styles.textBold}>Status</Text>
                <Text style={[styles.text, { color: getStatusColor(project?.status) }]}>
                  {project?.status?.replace('_', ' ') || 'Active'}
                </Text>
              </View>
              <View>
                <Text style={styles.textBold}>Progress</Text>
                <Text style={styles.text}>{project?.progress || 0}%</Text>
              </View>
              <View>
                <Text style={styles.textBold}>Due Date</Text>
                <Text style={styles.text}>{formatDate(project?.due_date)}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${project?.progress || 0}%`,
                    backgroundColor: settings?.primary_color || colors.primary,
                  },
                ]}
              />
            </View>

            {project?.description && (
              <View style={styles.mt10}>
                <Text style={styles.textBold}>Description</Text>
                <Text style={styles.text}>{project.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalTasks}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.success }]}>{completedTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.danger }]}>{overdueTasks}</Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.purple }]}>{completedMilestones}/{totalMilestones}</Text>
              <Text style={styles.statLabel}>Milestones</Text>
            </View>
          </View>
        </View>

        {/* Milestones */}
        {milestones?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, styles.flex3]}>Milestone</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Status</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Due Date</Text>
              </View>
              {milestones.slice(0, 10).map((milestone, idx) => (
                <View key={idx} style={idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                  <Text style={[styles.tableCell, styles.flex3]}>{milestone.title || milestone.name}</Text>
                  <Text style={[styles.tableCell, styles.flex1, { color: getStatusColor(milestone.status) }]}>
                    {milestone.status?.replace('_', ' ') || 'Pending'}
                  </Text>
                  <Text style={[styles.tableCell, styles.flex1]}>{formatDate(milestone.due_date)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Approvals */}
        {approvals?.filter((a) => a.status === 'pending').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Approvals ({pendingApprovals})</Text>
            {approvals
              .filter((a) => a.status === 'pending')
              .slice(0, 5)
              .map((approval, idx) => (
                <View key={idx} style={styles.card}>
                  <Text style={styles.textBold}>{approval.title}</Text>
                  <Text style={styles.text}>{approval.description}</Text>
                  <Text style={styles.textSmall}>Requested: {formatDate(approval.created_at)}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {settings?.portal_name || 'Client Portal'} | Confidential
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* Tasks Page */}
      {tasks?.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Task Breakdown</Text>
            <Text style={styles.subtitle}>{project?.name}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Tasks ({totalTasks})</Text>
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, styles.flex3]}>Task</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Status</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Priority</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Due Date</Text>
              </View>
              {tasks.map((task, idx) => (
                <View key={idx} style={idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                  <Text style={[styles.tableCell, styles.flex3]}>{task.title || task.name}</Text>
                  <Text style={[styles.tableCell, styles.flex1, { color: getStatusColor(task.status) }]}>
                    {task.status?.replace('_', ' ') || 'Pending'}
                  </Text>
                  <Text style={[styles.tableCell, styles.flex1]}>
                    {task.priority || 'Normal'}
                  </Text>
                  <Text style={[styles.tableCell, styles.flex1]}>{formatDate(task.due_date)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Task Summary by Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Summary</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {tasks.filter((t) => t.status === 'completed' || t.status === 'done').length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#cffafe' }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {tasks.filter((t) => t.status === 'in_progress').length}
                </Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {tasks.filter((t) => t.status === 'pending' || t.status === 'todo').length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              {settings?.portal_name || 'Client Portal'} | Confidential
            </Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* Activity Page */}
      {activity?.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Recent Activity</Text>
            <Text style={styles.subtitle}>{project?.name}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Timeline</Text>
            {activity.slice(0, 20).map((item, idx) => (
              <View key={idx} style={[styles.card, styles.mb5]}>
                <View style={[styles.row, styles.spaceBetween]}>
                  <Text style={styles.textBold}>{item.action_type?.replace('_', ' ')}</Text>
                  <Text style={styles.textSmall}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={styles.text}>{item.description}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              {settings?.portal_name || 'Client Portal'} | Confidential
            </Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}

      {/* Approvals History Page */}
      {approvals?.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Approval History</Text>
            <Text style={styles.subtitle}>{project?.name}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              All Approvals ({approvedItems} Approved / {pendingApprovals} Pending)
            </Text>
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCellHeader, styles.flex3]}>Item</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Type</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Status</Text>
                <Text style={[styles.tableCellHeader, styles.flex1]}>Date</Text>
              </View>
              {approvals.map((approval, idx) => (
                <View key={idx} style={idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
                  <Text style={[styles.tableCell, styles.flex3]}>{approval.title}</Text>
                  <Text style={[styles.tableCell, styles.flex1]}>
                    {approval.approval_type?.replace('_', ' ') || 'General'}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.flex1,
                      {
                        color:
                          approval.status === 'approved'
                            ? colors.success
                            : approval.status === 'rejected'
                            ? colors.danger
                            : colors.warning,
                      },
                    ]}
                  >
                    {approval.status}
                  </Text>
                  <Text style={[styles.tableCell, styles.flex1]}>
                    {formatDate(approval.decided_at || approval.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              {settings?.portal_name || 'Client Portal'} | Confidential
            </Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            />
          </View>
        </Page>
      )}
    </Document>
  );
}
