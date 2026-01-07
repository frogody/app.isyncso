/**
 * Learn Tool Functions for SYNC
 *
 * Actions:
 * - list_courses
 * - get_learning_progress
 * - enroll_course
 * - recommend_courses
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ActionResult, ActionContext } from './types.ts';
import {
  formatDate,
  successResult,
  errorResult,
  formatList,
} from '../utils/helpers.ts';

// ============================================================================
// Learn Types
// ============================================================================

interface CourseFilters {
  category?: string;
  difficulty?: string;
  search?: string;
  limit?: number;
}

interface EnrollmentData {
  course_id?: string;
  course_name?: string;
}

// ============================================================================
// List Courses
// ============================================================================

export async function listCourses(
  ctx: ActionContext,
  filters: CourseFilters = {}
): Promise<ActionResult> {
  try {
    let query = ctx.supabase
      .from('courses')
      .select('id, title, description, category, difficulty')
      .order('title', { ascending: true })
      .limit(filters.limit || 20);

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data: courses, error } = await query;

    if (error) {
      return errorResult(`Failed to list courses: ${error.message}`, error.message);
    }

    if (!courses || courses.length === 0) {
      return successResult('No courses found matching your criteria.', []);
    }

    const list = formatList(courses, (c) => {
      return `- **${c.title}** | ${c.category || 'General'} | ${c.difficulty || 'All levels'}`;
    });

    return successResult(
      `Found ${courses.length} course(s):\n\n${list}`,
      courses,
      '/learn'
    );
  } catch (err) {
    return errorResult(`Exception listing courses: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Get Learning Progress
// ============================================================================

export async function getLearningProgress(
  ctx: ActionContext,
  data: { user_id?: string } = {}
): Promise<ActionResult> {
  try {
    const userId = data.user_id || ctx.userId;

    if (!userId) {
      return errorResult('User ID not available.', 'No user context');
    }

    // Get user's course progress
    const { data: progress, error } = await ctx.supabase
      .from('user_progress')
      .select(`
        id,
        course_id,
        progress_percent,
        status,
        started_at,
        completed_at,
        courses!inner(title, category)
      `)
      .eq('user_id', userId);

    if (error) {
      // Table might not exist or have different schema
      return successResult(
        'No learning progress found. Start a course to track your progress!',
        { enrolled: 0, completed: 0, in_progress: 0 },
        '/learn'
      );
    }

    if (!progress || progress.length === 0) {
      return successResult(
        'No learning progress found. Enroll in a course to get started!',
        { enrolled: 0, completed: 0, in_progress: 0 },
        '/learn'
      );
    }

    const completed = progress.filter(p => p.status === 'completed').length;
    const inProgress = progress.filter(p => p.status === 'in_progress').length;

    const list = formatList(progress, (p) => {
      const course = (p as any).courses;
      const status = p.status === 'completed' ? '✅' : `${p.progress_percent || 0}%`;
      return `- **${course?.title || 'Unknown'}** | ${status}`;
    });

    return successResult(
      `📚 Learning Progress\n\n- Enrolled: ${progress.length}\n- Completed: ${completed}\n- In Progress: ${inProgress}\n\n${list}`,
      {
        enrolled: progress.length,
        completed,
        in_progress: inProgress,
        courses: progress,
      },
      '/learn'
    );
  } catch (err) {
    return errorResult(`Exception getting learning progress: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Enroll in Course
// ============================================================================

export async function enrollCourse(
  ctx: ActionContext,
  data: EnrollmentData
): Promise<ActionResult> {
  try {
    const userId = ctx.userId;
    if (!userId) {
      return errorResult('User ID not available. Please log in.', 'No user context');
    }

    let courseId = data.course_id;
    let courseTitle: string | undefined;

    // Find course by name if ID not provided
    if (!courseId && data.course_name) {
      const { data: courses } = await ctx.supabase
        .from('courses')
        .select('id, title')
        .ilike('title', `%${data.course_name}%`)
        .eq('status', 'published')
        .limit(1);

      if (courses && courses.length > 0) {
        courseId = courses[0].id;
        courseTitle = courses[0].title;
      }
    }

    if (!courseId) {
      return errorResult('Course not found. Please provide a valid course ID or name.', 'Not found');
    }

    // Check if already enrolled
    const { data: existing } = await ctx.supabase
      .from('user_progress')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .limit(1);

    if (existing && existing.length > 0) {
      return errorResult(`You're already enrolled in this course (Status: ${existing[0].status}).`, 'Already enrolled');
    }

    // Enroll user
    const enrollmentRecord = {
      user_id: userId,
      course_id: courseId,
      progress_percent: 0,
      status: 'not_started',
      started_at: new Date().toISOString(),
    };

    const { data: enrollment, error } = await ctx.supabase
      .from('user_progress')
      .insert(enrollmentRecord)
      .select()
      .single();

    if (error) {
      return errorResult(`Failed to enroll: ${error.message}`, error.message);
    }

    return successResult(
      `✅ Enrolled successfully!\n\n**${courseTitle || 'Course'}**\nYou can now start learning!`,
      enrollment,
      '/learn'
    );
  } catch (err) {
    return errorResult(`Exception enrolling in course: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Recommend Courses
// ============================================================================

export async function recommendCourses(
  ctx: ActionContext,
  data: { interests?: string[]; skill_gaps?: string[]; limit?: number } = {}
): Promise<ActionResult> {
  try {
    // Get all published courses
    const { data: courses, error } = await ctx.supabase
      .from('courses')
      .select('id, title, description, category, difficulty')
      .limit(50);

    if (error) {
      return errorResult(`Failed to get courses: ${error.message}`, error.message);
    }

    if (!courses || courses.length === 0) {
      return successResult('No courses available for recommendations.', []);
    }

    // Simple recommendation: prioritize based on interests/skill_gaps if provided
    let recommendations = courses;

    if (data.interests && data.interests.length > 0) {
      // Score courses based on matching interests
      recommendations = courses.map(c => {
        const matchScore = data.interests!.filter(interest =>
          c.title?.toLowerCase().includes(interest.toLowerCase()) ||
          c.description?.toLowerCase().includes(interest.toLowerCase()) ||
          c.category?.toLowerCase().includes(interest.toLowerCase())
        ).length;
        return { ...c, score: matchScore };
      }).sort((a, b) => b.score - a.score);
    }

    const topRecommendations = recommendations.slice(0, data.limit || 5);

    const list = formatList(topRecommendations, (c) => {
      return `- **${c.title}** | ${c.category || 'General'} | ${c.difficulty || 'All levels'}`;
    });

    return successResult(
      `🎯 Recommended Courses for You\n\n${list}`,
      topRecommendations,
      '/learn'
    );
  } catch (err) {
    return errorResult(`Exception recommending courses: ${String(err)}`, String(err));
  }
}

// ============================================================================
// Learn Action Router
// ============================================================================

export async function executeLearnAction(
  ctx: ActionContext,
  action: string,
  data: any
): Promise<ActionResult> {
  switch (action) {
    case 'list_courses':
      return listCourses(ctx, data);
    case 'get_learning_progress':
      return getLearningProgress(ctx, data);
    case 'enroll_course':
      return enrollCourse(ctx, data);
    case 'recommend_courses':
      return recommendCourses(ctx, data);
    default:
      return errorResult(`Unknown learn action: ${action}`, 'Unknown action');
  }
}
