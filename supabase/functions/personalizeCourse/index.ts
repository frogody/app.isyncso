import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { templateCourseId } = await req.json();

    if (!templateCourseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'templateCourseId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[personalizeCourse] User ${user.id} personalizing course ${templateCourseId}`);

    // Get user profile for credits and company_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('credits, company_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[personalizeCourse] Failed to get user profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check credits
    const credits = userProfile?.credits || 0;
    if (credits < 200) {
      return new Response(
        JSON.stringify({ success: false, error: `Insufficient credits. You have ${credits} but need 200.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the template course
    const { data: templateCourse, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', templateCourseId)
      .single();

    if (courseError || !templateCourse) {
      console.error('[personalizeCourse] Course not found:', courseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Template course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get modules and lessons from template course
    const { data: templateModules } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', templateCourseId)
      .order('order_index');

    const { data: templateLessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', templateCourseId)
      .order('order_index');

    // Create personalized course copy
    const personalizedCourse = {
      title: `${templateCourse.title} (Personalized)`,
      description: templateCourse.description,
      category: templateCourse.category,
      difficulty: templateCourse.difficulty,
      duration_minutes: templateCourse.duration_minutes,
      duration_hours: templateCourse.duration_hours,
      thumbnail_url: templateCourse.thumbnail_url,
      is_template: false,
      is_published: true,
      settings: {
        ...templateCourse.settings,
        personalized_from: templateCourseId,
        personalized_for: user.id,
        personalized_at: new Date().toISOString(),
      },
      created_by: user.id,
      organization_id: userProfile?.company_id,
    };

    const { data: newCourse, error: createError } = await supabase
      .from('courses')
      .insert(personalizedCourse)
      .select()
      .single();

    if (createError) {
      console.error('[personalizeCourse] Failed to create course:', createError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create personalized course' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[personalizeCourse] Created personalized course ${newCourse.id}`);

    // Copy modules if they exist
    if (templateModules && templateModules.length > 0) {
      const moduleIdMap = new Map();

      for (const module of templateModules) {
        const newModule = {
          course_id: newCourse.id,
          title: module.title,
          description: module.description,
          order_index: module.order_index,
          settings: module.settings,
        };

        const { data: createdModule, error: moduleError } = await supabase
          .from('modules')
          .insert(newModule)
          .select()
          .single();

        if (!moduleError && createdModule) {
          moduleIdMap.set(module.id, createdModule.id);
        }
      }

      // Copy lessons if they exist
      if (templateLessons && templateLessons.length > 0) {
        for (const lesson of templateLessons) {
          const newLesson = {
            course_id: newCourse.id,
            module_id: lesson.module_id ? moduleIdMap.get(lesson.module_id) : null,
            title: lesson.title,
            description: lesson.description,
            content: lesson.content,
            order_index: lesson.order_index,
            duration_minutes: lesson.duration_minutes,
            lesson_type: lesson.lesson_type,
            settings: lesson.settings,
          };

          await supabase.from('lessons').insert(newLesson);
        }
      }
    }

    // Deduct credits from user
    const newCredits = credits - 200;
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (creditError) {
      console.error('[personalizeCourse] Failed to deduct credits:', creditError);
      // Don't fail the request, course is already created
    }

    // Create user progress record for the new course
    await supabase.from('user_progress').insert({
      user_id: user.id,
      course_id: newCourse.id,
      status: 'not_started',
      completion_percentage: 0,
    });

    console.log(`[personalizeCourse] Success! Course ${newCourse.id} created, ${newCredits} credits remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        course_id: newCourse.id,
        credits_remaining: newCredits,
        message: 'Course personalized successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[personalizeCourse] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
