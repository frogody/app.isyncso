import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate personalized lesson content using AI
async function generateLessonContent(
  lessonTitle: string,
  lessonDescription: string,
  moduleTitle: string,
  courseTitle: string,
  userProfile: { full_name: string; job_title?: string; industry?: string; experience_level?: string },
  groqApiKey: string
): Promise<string> {
  const userName = userProfile.full_name || 'Professional';
  const jobTitle = userProfile.job_title || 'Business Professional';
  const industry = userProfile.industry || 'Business';
  const experienceLevel = userProfile.experience_level || 'intermediate';

  const prompt = `You are an expert course content creator. Generate comprehensive, engaging lesson content for the following:

**Course:** ${courseTitle}
**Module:** ${moduleTitle}
**Lesson:** ${lessonTitle}
**Description:** ${lessonDescription}

**Student Profile:**
- Name: ${userName}
- Role: ${jobTitle}
- Industry: ${industry}
- Experience Level: ${experienceLevel}

Generate rich markdown content that includes:

1. **Introduction** (2-3 paragraphs) - Hook the reader and explain why this matters for their role as a ${jobTitle} in ${industry}

2. **Key Concepts** - Explain 3-5 core concepts with examples relevant to ${industry}

3. **Practical Application** - Show how a ${jobTitle} would use this in their daily work

4. **Step-by-Step Guide** - Provide actionable steps with code examples or templates where relevant

5. **Visual Diagram** - Include a mermaid diagram showing the concept flow:
\`\`\`mermaid
flowchart TD
    A[Start] --> B[Step 1]
    B --> C[Step 2]
    C --> D[Result]
\`\`\`

6. **Industry-Specific Examples** - Provide 2-3 examples specific to ${industry}

7. **Pro Tips** - Include tips formatted as:
\`\`\`tip
Your tip here for ${jobTitle}s
\`\`\`

8. **Try It Yourself** - An exercise formatted as:
\`\`\`exercise
Hands-on exercise description
\`\`\`

9. **Key Takeaways** - Summarize in a callout:
\`\`\`key
The most important thing to remember...
\`\`\`

Make the content comprehensive (800-1200 words), professional, and highly relevant to someone working as a ${jobTitle} in ${industry}. Use second person ("you") to address the reader directly.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator who creates engaging, personalized learning experiences. Always include mermaid diagrams, practical examples, and interactive elements.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateLessonContent] API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || lessonDescription;
  } catch (error) {
    console.error('[generateLessonContent] Error:', error);
    // Return a fallback content if AI fails
    return `# ${lessonTitle}

${lessonDescription}

*This content is being generated. Please check back soon.*`;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    console.log('[personalizeCourse] Starting - URL exists:', !!supabaseUrl, 'Key exists:', !!supabaseServiceKey, 'GROQ exists:', !!groqApiKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[personalizeCourse] Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!groqApiKey) {
      console.error('[personalizeCourse] Missing GROQ_API_KEY');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ success: false, error: `Invalid authentication: ${authError?.message || 'No user found'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { templateCourseId } = body;
    if (!templateCourseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'templateCourseId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[personalizeCourse] User ${user.id} personalizing course ${templateCourseId}`);

    // Get user profile for personalization
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('credits, company_id, full_name, job_title, industry, experience_level')
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

    // Verify organization_id exists
    let validOrganizationId = null;
    if (userProfile?.company_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', userProfile.company_id)
        .single();
      if (org) {
        validOrganizationId = org.id;
      }
    }

    // Get the template course
    const { data: templateCourse, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', templateCourseId)
      .single();

    if (courseError || !templateCourse) {
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

    // Create personalized course
    const userName = userProfile?.full_name?.split(' ')[0] || 'Your';
    const personalizedCourse = {
      title: `${templateCourse.title} - ${userName}'s Edition`,
      description: `Personalized for ${userProfile?.full_name || 'you'} based on your role as ${userProfile?.job_title || 'a professional'} in ${userProfile?.industry || 'your industry'}.`,
      category: templateCourse.category,
      difficulty: templateCourse.difficulty,
      duration_minutes: templateCourse.duration_minutes,
      duration_hours: templateCourse.duration_hours,
      thumbnail_url: templateCourse.thumbnail_url,
      is_template: false,
      is_published: true,
      settings: {
        ...(templateCourse.settings || {}),
        personalized_from: templateCourseId,
        personalized_for: user.id,
        personalized_at: new Date().toISOString(),
        user_profile: {
          job_title: userProfile?.job_title,
          industry: userProfile?.industry,
          experience_level: userProfile?.experience_level,
        },
      },
      created_by: user.id,
      organization_id: validOrganizationId,
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

    console.log(`[personalizeCourse] Created course ${newCourse.id}, now generating AI content...`);

    // Create module mapping
    const moduleIdMap = new Map();
    const moduleNameMap = new Map();

    if (templateModules && templateModules.length > 0) {
      for (const module of templateModules) {
        const { data: createdModule } = await supabase
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: module.title,
            description: module.description,
            order_index: module.order_index,
          })
          .select()
          .single();

        if (createdModule) {
          moduleIdMap.set(module.id, createdModule.id);
          moduleNameMap.set(module.id, module.title);
        }
      }
    }

    // Generate personalized lesson content using AI
    if (templateLessons && templateLessons.length > 0) {
      console.log(`[personalizeCourse] Generating content for ${templateLessons.length} lessons...`);

      for (const lesson of templateLessons) {
        const moduleTitle = moduleNameMap.get(lesson.module_id) || 'General';

        // Generate AI content
        console.log(`[personalizeCourse] Generating content for: ${lesson.title}`);
        const aiContent = await generateLessonContent(
          lesson.title,
          lesson.description || lesson.title,
          moduleTitle,
          templateCourse.title,
          {
            full_name: userProfile?.full_name || 'Professional',
            job_title: userProfile?.job_title,
            industry: userProfile?.industry,
            experience_level: userProfile?.experience_level,
          },
          groqApiKey
        );

        const newLesson = {
          course_id: newCourse.id,
          module_id: lesson.module_id ? moduleIdMap.get(lesson.module_id) : null,
          title: lesson.title,
          description: lesson.description,
          content: aiContent, // Store as plain markdown string
          order_index: lesson.order_index,
          duration_minutes: lesson.duration_minutes || 15,
          content_type: 'markdown',
        };

        const { error: lessonError } = await supabase.from('lessons').insert(newLesson);
        if (lessonError) {
          console.error('[personalizeCourse] Failed to create lesson:', lessonError);
        }
      }
    }

    // Deduct credits
    const newCredits = credits - 200;
    await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id);

    // Create user progress record
    await supabase.from('user_progress').insert({
      user_id: user.id,
      course_id: newCourse.id,
      status: 'not_started',
      completion_percentage: 0,
    });

    console.log(`[personalizeCourse] Success! Course ${newCourse.id} created with AI-generated content`);

    return new Response(
      JSON.stringify({
        success: true,
        course_id: newCourse.id,
        credits_remaining: newCredits,
        message: 'Course personalized with AI-generated content',
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
