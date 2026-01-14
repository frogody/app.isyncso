// Script to populate all 30 template courses with modules and lessons
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sfxpmzicgpaxfntqleig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Course content definitions - each course has 4 modules with 3 lessons each
const courseContent = {
  "Introduction to Artificial Intelligence": {
    modules: [
      { title: "What is AI?", lessons: ["History of AI", "Types of AI Systems", "AI vs Machine Learning vs Deep Learning"] },
      { title: "AI Applications Today", lessons: ["AI in Healthcare", "AI in Finance", "AI in Daily Life"] },
      { title: "How AI Works", lessons: ["Neural Networks Explained", "Training AI Models", "Data and AI"] },
      { title: "Getting Started with AI", lessons: ["AI Tools for Beginners", "Your First AI Project", "Building an AI Mindset"] }
    ]
  },
  "Prompt Engineering Masterclass": {
    modules: [
      { title: "Fundamentals of Prompting", lessons: ["What Makes a Good Prompt", "Prompt Structure and Syntax", "Common Prompting Mistakes"] },
      { title: "Advanced Techniques", lessons: ["Chain of Thought Prompting", "Few-Shot Learning", "Role-Based Prompting"] },
      { title: "Domain-Specific Prompts", lessons: ["Prompts for Writing", "Prompts for Coding", "Prompts for Analysis"] },
      { title: "Prompt Optimization", lessons: ["Testing and Iterating", "Prompt Templates Library", "Measuring Prompt Quality"] }
    ]
  },
  "ChatGPT for Business Professionals": {
    modules: [
      { title: "ChatGPT Fundamentals", lessons: ["Understanding ChatGPT Capabilities", "Setting Up Your Workspace", "Best Practices for Business Use"] },
      { title: "Communication & Writing", lessons: ["Professional Email Writing", "Report Generation", "Meeting Summaries and Notes"] },
      { title: "Analysis & Research", lessons: ["Market Research with ChatGPT", "Data Analysis Assistance", "Competitive Intelligence"] },
      { title: "Productivity & Automation", lessons: ["Workflow Automation Ideas", "Template Creation", "Integration with Business Tools"] }
    ]
  },
  "Machine Learning Fundamentals": {
    modules: [
      { title: "ML Concepts", lessons: ["Supervised vs Unsupervised Learning", "Classification and Regression", "Model Evaluation Basics"] },
      { title: "Data Preparation", lessons: ["Data Collection Strategies", "Data Cleaning Techniques", "Feature Engineering"] },
      { title: "Popular Algorithms", lessons: ["Decision Trees and Random Forests", "Linear and Logistic Regression", "Clustering Algorithms"] },
      { title: "Practical ML", lessons: ["Choosing the Right Algorithm", "Model Training Pipeline", "Deploying ML Models"] }
    ]
  },
  "AI Ethics and Responsible AI": {
    modules: [
      { title: "Ethical Foundations", lessons: ["AI Bias and Fairness", "Transparency and Explainability", "Privacy Considerations"] },
      { title: "Governance Frameworks", lessons: ["EU AI Act Overview", "Industry Standards", "Building AI Policies"] },
      { title: "Risk Assessment", lessons: ["Identifying AI Risks", "Impact Assessment Methods", "Mitigation Strategies"] },
      { title: "Responsible Implementation", lessons: ["Ethical AI Design", "Monitoring and Auditing", "Stakeholder Communication"] }
    ]
  },
  "Midjourney & AI Image Generation": {
    modules: [
      { title: "Getting Started", lessons: ["Setting Up Midjourney", "Understanding Parameters", "Your First Image"] },
      { title: "Prompt Crafting", lessons: ["Descriptive Prompting", "Style and Mood Keywords", "Artistic References"] },
      { title: "Advanced Techniques", lessons: ["Image-to-Image Generation", "Variations and Upscaling", "Consistent Characters"] },
      { title: "Professional Applications", lessons: ["Marketing Visuals", "Product Mockups", "Brand Imagery"] }
    ]
  },
  "AI for Sales and Marketing": {
    modules: [
      { title: "AI-Powered Lead Generation", lessons: ["Identifying High-Value Leads", "AI Lead Scoring", "Automated Outreach"] },
      { title: "Content Marketing with AI", lessons: ["Blog Post Generation", "Social Media Content", "Email Campaigns"] },
      { title: "Customer Insights", lessons: ["Sentiment Analysis", "Customer Segmentation", "Predictive Analytics"] },
      { title: "Sales Automation", lessons: ["AI Sales Assistants", "CRM Enhancement", "Closing Deals with AI"] }
    ]
  },
  "Building AI-Powered Applications": {
    modules: [
      { title: "API Fundamentals", lessons: ["Understanding AI APIs", "Authentication and Security", "Rate Limits and Costs"] },
      { title: "Integration Patterns", lessons: ["REST API Integration", "Streaming Responses", "Error Handling"] },
      { title: "Building Features", lessons: ["Chat Interfaces", "Document Processing", "Image Analysis"] },
      { title: "Production Deployment", lessons: ["Scaling Considerations", "Monitoring and Logging", "Cost Optimization"] }
    ]
  },
  "Natural Language Processing Basics": {
    modules: [
      { title: "NLP Fundamentals", lessons: ["What is NLP?", "Text Preprocessing", "Tokenization and Embeddings"] },
      { title: "Core Techniques", lessons: ["Named Entity Recognition", "Part-of-Speech Tagging", "Dependency Parsing"] },
      { title: "Applications", lessons: ["Sentiment Analysis", "Text Classification", "Question Answering"] },
      { title: "Modern NLP", lessons: ["Transformers Architecture", "Pre-trained Models", "Fine-tuning for Tasks"] }
    ]
  },
  "AI Automation with No-Code Tools": {
    modules: [
      { title: "No-Code AI Platforms", lessons: ["Overview of Tools", "Zapier AI Features", "Make.com Automation"] },
      { title: "Building Workflows", lessons: ["Trigger-Action Patterns", "Data Transformation", "Multi-Step Automations"] },
      { title: "AI Integrations", lessons: ["ChatGPT in Workflows", "Image Generation Automation", "Document Processing"] },
      { title: "Advanced Patterns", lessons: ["Error Handling", "Conditional Logic", "Scaling Automations"] }
    ]
  },
  "Data Analysis with AI": {
    modules: [
      { title: "AI-Assisted Analysis", lessons: ["Data Exploration with AI", "Pattern Recognition", "Anomaly Detection"] },
      { title: "Visualization", lessons: ["AI-Generated Charts", "Dashboard Creation", "Storytelling with Data"] },
      { title: "Statistical Analysis", lessons: ["Hypothesis Testing", "Regression Analysis", "Forecasting"] },
      { title: "Tools and Platforms", lessons: ["Code Interpreter", "Tableau AI", "Power BI Integration"] }
    ]
  },
  "AI-Powered Content Creation": {
    modules: [
      { title: "Writing with AI", lessons: ["Blog and Article Writing", "Copywriting Techniques", "Editing and Refinement"] },
      { title: "Visual Content", lessons: ["Image Generation", "Video Script Writing", "Infographic Ideas"] },
      { title: "Audio Content", lessons: ["Podcast Scripts", "Voice Synthesis", "Music and Sound Effects"] },
      { title: "Content Strategy", lessons: ["Content Planning", "SEO Optimization", "Multi-Platform Publishing"] }
    ]
  },
  "Computer Vision Essentials": {
    modules: [
      { title: "CV Fundamentals", lessons: ["How Computers See", "Image Processing Basics", "Feature Detection"] },
      { title: "Object Detection", lessons: ["YOLO and Detection Models", "Bounding Boxes", "Real-time Detection"] },
      { title: "Image Classification", lessons: ["CNN Architecture", "Transfer Learning", "Multi-class Classification"] },
      { title: "Applications", lessons: ["Face Recognition", "OCR and Document Scanning", "Video Analysis"] }
    ]
  },
  "AI for Customer Service": {
    modules: [
      { title: "Chatbot Fundamentals", lessons: ["Types of Chatbots", "Conversation Design", "Building User Flows"] },
      { title: "Implementation", lessons: ["Platform Selection", "Integration with CRM", "Training Your Bot"] },
      { title: "Advanced Features", lessons: ["Sentiment Detection", "Escalation to Humans", "Multi-language Support"] },
      { title: "Optimization", lessons: ["Measuring Success", "Continuous Improvement", "Customer Feedback Analysis"] }
    ]
  },
  "Claude AI Deep Dive": {
    modules: [
      { title: "Understanding Claude", lessons: ["Claude's Capabilities", "Claude vs Other Models", "Best Use Cases"] },
      { title: "Effective Prompting", lessons: ["Claude-Specific Techniques", "System Prompts", "Handling Long Context"] },
      { title: "Advanced Features", lessons: ["Tool Use and Function Calling", "Document Analysis", "Code Generation"] },
      { title: "Enterprise Use", lessons: ["API Integration", "Security and Privacy", "Team Collaboration"] }
    ]
  },
  "AI for HR and Recruitment": {
    modules: [
      { title: "Resume Screening", lessons: ["AI Resume Parsing", "Candidate Matching", "Bias Mitigation"] },
      { title: "Interview Process", lessons: ["AI Interview Assistants", "Question Generation", "Assessment Analysis"] },
      { title: "Employee Experience", lessons: ["Onboarding Automation", "Training Personalization", "Engagement Analysis"] },
      { title: "Workforce Planning", lessons: ["Predictive Analytics", "Skill Gap Analysis", "Succession Planning"] }
    ]
  },
  "Generative AI for Developers": {
    modules: [
      { title: "Code Generation", lessons: ["AI Pair Programming", "Code Completion Tools", "Bug Detection"] },
      { title: "Development Workflows", lessons: ["Documentation Generation", "Test Case Writing", "Code Review Assistance"] },
      { title: "API Development", lessons: ["Building AI Features", "Prompt Engineering for Code", "Handling AI Responses"] },
      { title: "Best Practices", lessons: ["Security Considerations", "Performance Optimization", "Maintaining AI Code"] }
    ]
  },
  "AI Video Creation and Editing": {
    modules: [
      { title: "AI Video Tools", lessons: ["Platform Overview", "Text-to-Video", "Script to Video"] },
      { title: "Editing with AI", lessons: ["Automated Editing", "Color Correction", "Audio Enhancement"] },
      { title: "Creative Applications", lessons: ["Marketing Videos", "Training Content", "Social Media Clips"] },
      { title: "Advanced Techniques", lessons: ["Deepfakes and Ethics", "Virtual Presenters", "Video Analytics"] }
    ]
  },
  "AI for Financial Analysis": {
    modules: [
      { title: "Financial AI Applications", lessons: ["Market Analysis", "Risk Assessment", "Fraud Detection"] },
      { title: "Forecasting", lessons: ["Revenue Prediction", "Cash Flow Analysis", "Scenario Modeling"] },
      { title: "Investment Analysis", lessons: ["Portfolio Optimization", "Stock Analysis", "Alternative Data"] },
      { title: "Automation", lessons: ["Report Generation", "Compliance Monitoring", "Audit Assistance"] }
    ]
  },
  "Introduction to Large Language Models": {
    modules: [
      { title: "LLM Fundamentals", lessons: ["How LLMs Work", "Training Process", "Model Architecture"] },
      { title: "Major Models", lessons: ["GPT Family", "Claude and Anthropic", "Open Source Models"] },
      { title: "Capabilities", lessons: ["Text Generation", "Reasoning and Analysis", "Multi-modal Features"] },
      { title: "Practical Use", lessons: ["Choosing a Model", "Cost Considerations", "Deployment Options"] }
    ]
  },
  "AI Project Management": {
    modules: [
      { title: "Planning AI Projects", lessons: ["Defining AI Objectives", "Resource Estimation", "Risk Assessment"] },
      { title: "Team Management", lessons: ["AI Team Roles", "Skill Requirements", "Collaboration Tools"] },
      { title: "Execution", lessons: ["Agile for AI", "Milestone Tracking", "Quality Assurance"] },
      { title: "Delivery", lessons: ["Deployment Strategies", "Change Management", "Measuring Success"] }
    ]
  },
  "Voice AI and Speech Recognition": {
    modules: [
      { title: "Speech Technology", lessons: ["How Speech Recognition Works", "Major Platforms", "Accuracy Considerations"] },
      { title: "Voice Assistants", lessons: ["Building Voice Apps", "Conversation Design", "Multi-turn Dialogs"] },
      { title: "Transcription", lessons: ["Audio-to-Text", "Meeting Transcription", "Subtitle Generation"] },
      { title: "Text-to-Speech", lessons: ["Voice Synthesis", "Voice Cloning", "Emotional Speech"] }
    ]
  },
  "AI for Legal Professionals": {
    modules: [
      { title: "Legal AI Applications", lessons: ["Document Review", "Contract Analysis", "Legal Research"] },
      { title: "Due Diligence", lessons: ["M&A Document Review", "Risk Identification", "Report Generation"] },
      { title: "Contract Management", lessons: ["Contract Drafting", "Clause Analysis", "Obligation Tracking"] },
      { title: "Compliance", lessons: ["Regulatory Monitoring", "Policy Analysis", "Audit Preparation"] }
    ]
  },
  "Retrieval Augmented Generation (RAG)": {
    modules: [
      { title: "RAG Fundamentals", lessons: ["What is RAG?", "Why RAG Matters", "RAG vs Fine-tuning"] },
      { title: "Building RAG Systems", lessons: ["Document Processing", "Vector Databases", "Retrieval Strategies"] },
      { title: "Implementation", lessons: ["Chunking Strategies", "Embedding Models", "Query Optimization"] },
      { title: "Advanced RAG", lessons: ["Hybrid Search", "Re-ranking", "Evaluation Metrics"] }
    ]
  },
  "AI Strategy for Executives": {
    modules: [
      { title: "AI Landscape", lessons: ["Current AI Capabilities", "Industry Trends", "Competitive Analysis"] },
      { title: "Strategic Planning", lessons: ["Identifying Opportunities", "ROI Assessment", "Roadmap Development"] },
      { title: "Implementation", lessons: ["Build vs Buy Decisions", "Vendor Selection", "Change Management"] },
      { title: "Governance", lessons: ["AI Policies", "Risk Management", "Ethics and Compliance"] }
    ]
  },
  "AI Agents and Autonomous Systems": {
    modules: [
      { title: "Agent Fundamentals", lessons: ["What are AI Agents?", "Agent Architecture", "Tool Use and Actions"] },
      { title: "Building Agents", lessons: ["Agent Frameworks", "Planning and Reasoning", "Memory Systems"] },
      { title: "Multi-Agent Systems", lessons: ["Agent Collaboration", "Orchestration Patterns", "Communication Protocols"] },
      { title: "Deployment", lessons: ["Safety Considerations", "Monitoring and Control", "Scaling Agents"] }
    ]
  },
  "AI-Powered Research Methods": {
    modules: [
      { title: "Research with AI", lessons: ["Literature Review", "Data Collection", "Analysis Assistance"] },
      { title: "Writing Support", lessons: ["Outline Generation", "Draft Writing", "Citation Management"] },
      { title: "Synthesis", lessons: ["Summarization", "Pattern Identification", "Insight Generation"] },
      { title: "Quality Assurance", lessons: ["Fact Checking", "Plagiarism Detection", "Peer Review Prep"] }
    ]
  },
  "Fine-tuning Large Language Models": {
    modules: [
      { title: "Fine-tuning Basics", lessons: ["When to Fine-tune", "Data Requirements", "Cost Considerations"] },
      { title: "Data Preparation", lessons: ["Dataset Creation", "Data Formatting", "Quality Control"] },
      { title: "Training Process", lessons: ["Platform Selection", "Hyperparameters", "Monitoring Training"] },
      { title: "Deployment", lessons: ["Model Evaluation", "A/B Testing", "Production Deployment"] }
    ]
  },
  "AI Security and Privacy": {
    modules: [
      { title: "Security Fundamentals", lessons: ["AI Attack Vectors", "Prompt Injection", "Data Poisoning"] },
      { title: "Privacy Concerns", lessons: ["Data Leakage Risks", "Model Memorization", "PII Protection"] },
      { title: "Defense Strategies", lessons: ["Input Validation", "Output Filtering", "Access Controls"] },
      { title: "Compliance", lessons: ["GDPR Considerations", "Industry Standards", "Audit Preparation"] }
    ]
  },
  "Multimodal AI Applications": {
    modules: [
      { title: "Multimodal Basics", lessons: ["What is Multimodal AI?", "Vision-Language Models", "Audio-Visual AI"] },
      { title: "Image Understanding", lessons: ["Image Analysis", "Chart Reading", "Document Processing"] },
      { title: "Video Understanding", lessons: ["Video Summarization", "Scene Detection", "Action Recognition"] },
      { title: "Building Applications", lessons: ["API Integration", "Use Case Selection", "Performance Optimization"] }
    ]
  }
};

async function main() {
  console.log('Starting course content population...\n');

  // Get all template courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_template', true);

  if (coursesError) {
    console.error('Failed to fetch courses:', coursesError);
    return;
  }

  console.log(`Found ${courses.length} template courses\n`);

  for (const course of courses) {
    const content = courseContent[course.title];

    if (!content) {
      console.log(`[SKIP] No content defined for: ${course.title}`);
      continue;
    }

    // Check if course already has modules
    const { data: existingModules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', course.id);

    if (existingModules && existingModules.length > 0) {
      console.log(`[SKIP] Already has content: ${course.title}`);
      continue;
    }

    console.log(`[ADD] Creating content for: ${course.title}`);

    let lessonOrderIndex = 0;

    for (let moduleIndex = 0; moduleIndex < content.modules.length; moduleIndex++) {
      const moduleData = content.modules[moduleIndex];

      // Create module
      const { data: newModule, error: moduleError } = await supabase
        .from('modules')
        .insert({
          course_id: course.id,
          title: moduleData.title,
          description: `Module ${moduleIndex + 1}: ${moduleData.title}`,
          order_index: moduleIndex
        })
        .select()
        .single();

      if (moduleError) {
        console.error(`  Failed to create module: ${moduleData.title}`, moduleError);
        continue;
      }

      // Create lessons for this module
      for (let lessonIndex = 0; lessonIndex < moduleData.lessons.length; lessonIndex++) {
        const lessonTitle = moduleData.lessons[lessonIndex];

        const { error: lessonError } = await supabase
          .from('lessons')
          .insert({
            course_id: course.id,
            module_id: newModule.id,
            title: lessonTitle,
            description: `Learn about ${lessonTitle.toLowerCase()} in the context of ${course.title.toLowerCase()}.`,
            order_index: lessonOrderIndex,
            duration_minutes: 15,
            content_type: 'markdown'
          });

        if (lessonError) {
          console.error(`    Failed to create lesson: ${lessonTitle}`, lessonError);
        }

        lessonOrderIndex++;
      }
    }

    console.log(`  Created ${content.modules.length} modules with ${lessonOrderIndex} lessons`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
