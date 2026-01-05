import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Sparkles, Paperclip, Image as ImageIcon, Monitor, StopCircle, Mic, MicOff, Volume2, VolumeX, Video as VideoIcon, Camera, Radio, Plug } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMCP } from "@/components/context/MCPContext";
import { InvokeLLM } from "@/api/integrations";

// Re-using the high-quality build logic from Onboarding
const buildHighQualityCourse = async (userProfile, topic, onProgress) => {
  onProgress({ stage: "Designing Course Blueprint", detail: "Defining learning objectives and narrative flow...", percent: 5 });

  const blueprintPrompt = `You are a world-class instructional designer. Create a comprehensive, high-quality course BLUEPRINT on "${topic}" for a user with this profile:
${JSON.stringify(userProfile, null, 2)}
Return a JSON object for the entire course blueprint. Include a course-level title, description, and 3 modules. Each module should have 3-4 lessons. For each lesson, define: title, detailed learning_outjectives (3-5 points), key_concepts_to_cover, and a brief content_summary. Each module and lesson should have an 'order_index' starting from 1.`;

  const courseBlueprint = await InvokeLLM({
    prompt: blueprintPrompt,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        duration_hours: { type: "number" },
        modules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              order_index: { type: "number" },
              lessons: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    order_index: { type: "number" },
                    learning_objectives: { type: "array", items: { type: "string" } },
                    key_concepts_to_cover: { type: "array", items: { type: "string" } },
                    content_summary: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      required: ["title", "description", "difficulty", "duration_hours", "modules"]
    }
  });

  onProgress({ stage: "Drafting Lessons", detail: `Blueprint complete for "${courseBlueprint.title}"`, percent: 20 });

  const lessonDrafts = [];
  const totalLessons = courseBlueprint.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  let lessonsDrafted = 0;

  for (const module of courseBlueprint.modules) {
    for (const lesson of module.lessons) {
      const draftPrompt = `Write the full lesson content for "${lesson.title}".
Course Blueprint: ${JSON.stringify(courseBlueprint, null, 2)}
This lesson's objectives: ${lesson.learning_objectives.join(", ")}.
Return JSON with: title, content (markdown), lesson_type: "interactive", interactive_config, duration_minutes.`;
      // eslint-disable-next-line no-await-in-loop
      const draft = await InvokeLLM({
        prompt: draftPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            lesson_type: { type: "string" },
            interactive_config: { type: "object" },
            duration_minutes: { type: "number" }
          },
          required: ["title", "content", "lesson_type", "duration_minutes"]
        }
      });
      lessonDrafts.push({ ...draft, module_order_index: module.order_index, lesson_order_index: lesson.order_index, lesson_id: `${module.order_index}-${lesson.order_index}` });
      lessonsDrafted++;
      onProgress({ stage: `Drafting Lessons (${lessonsDrafted}/${totalLessons})`, detail: `Writing: ${lesson.title}`, percent: 20 + Math.round((lessonsDrafted / totalLessons) * 40) });
    }
  }

  onProgress({ stage: "Auditing Content", detail: "Reviewing all lessons for quality and cohesion...", percent: 60 });

  const auditPrompt = `You are a meticulous quality assurance editor. Review this DRAFT course content against its BLUEPRINT.
Blueprint: ${JSON.stringify(courseBlueprint, null, 2)}
Draft Content: ${JSON.stringify(lessonDrafts.map(({ content, ...rest }) => rest), null, 2)} // Send summary, not full content to save tokens
Return a JSON object containing an array of feedback objects: { feedback: [{ lesson_id, requires_revision (boolean), feedback (string) }] }.`;

  const auditResult = await InvokeLLM({
    prompt: auditPrompt,
    response_json_schema: {
      type: "object",
      properties: {
        feedback: {
          type: "array",
          items: {
            type: "object",
            properties: {
              lesson_id: { type: "string" },
              requires_revision: { type: "boolean" },
              feedback: { type: "string" }
            }
          }
        }
      },
      required: ["feedback"]
    }
  });

  onProgress({ stage: "Refining Content", detail: "Implementing improvements based on audit...", percent: 80 });

  const finalLessons = [];
  const lessonsToRevise = auditResult.feedback.filter(f => f.requires_revision);
  let lessonsRevised = 0;

  for (const draft of lessonDrafts) {
    const feedbackItem = auditResult.feedback.find(f => f.lesson_id === draft.lesson_id);
    if (feedbackItem && feedbackItem.requires_revision) {
      const revisionPrompt = `Revise this lesson DRAFT based on the EDITOR'S FEEDBACK.
Editor's Feedback: "${feedbackItem.feedback}"
Original Draft: ${JSON.stringify(draft, null, 2)}
Return the complete, improved lesson as JSON: { title, content, lesson_type, interactive_config, duration_minutes }`;
      // eslint-disable-next-line no-await-in-loop
      const revisedLesson = await InvokeLLM({
        prompt: revisionPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            lesson_type: { type: "string" },
            interactive_config: { type: "object" },
            duration_minutes: { type: "number" }
          },
          required: ["title", "content", "lesson_type", "duration_minutes"]
        }
      });
      finalLessons.push({ ...revisedLesson, module_order_index: draft.module_order_index, lesson_order_index: draft.lesson_order_index });
      lessonsRevised++;
      onProgress({ stage: `Refining Content (${lessonsRevised}/${lessonsToRevise.length})`, detail: `Improving: ${draft.title}`, percent: 80 + Math.round((lessonsRevised / (lessonsToRevise.length || 1)) * 15) });
    } else {
      finalLessons.push({ ...draft });
    }
  }

  onProgress({ stage: "Finalizing", detail: "Saving your high-quality course...", percent: 95 });
  return { blueprint: courseBlueprint, lessons: finalLessons };
};


export default function AgentWidget() {
  const [open, setOpen] = React.useState(false);
  const [me, setMe] = React.useState(null);
  const [memory, setMemory] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [text, setText] = React.useState("");
  const [thinking, setThinking] = React.useState(false);

  // Attachments for outgoing message
  const [attachments, setAttachments] = React.useState([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Activity awareness
  const [lastActivity, setLastActivity] = React.useState(null);

  // Screen sharing + voice for live coaching
  const [sharing, setSharing] = React.useState(false);
  const [screenStream, setScreenStream] = React.useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const autoSnapIdRef = React.useRef(null);
  const [autoCoach, setAutoCoach] = React.useState(false);
  const [autoSnapMs, setAutoSnapMs] = React.useState(12000);

  const [ttsEnabled, setTtsEnabled] = React.useState(false);
  const [voiceListening, setVoiceListening] = React.useState(false);
  const recognitionRef = React.useRef(null);

  // Pleasant TTS settings and voice
  const [ttsVoice, setTtsVoice] = React.useState(null);
  const [ttsRate, setTtsRate] = React.useState(1.08);    // slightly brisk (FIX: useState instead of React.Callbacks)
  const [ttsPitch, setTtsPitch] = React.useState(1.1);    // a bit brighter
  const [ttsVolume, setTtsVolume] = React.useState(0.95); // comfortable

  const storageKey = React.useMemo(() => `isyncso_agent_chat_${me?.id || "anon"}`, [me?.id]);

  React.useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setMe(u);
        setMemory(u.agent_memory || null);
      } catch {
        // ignore (public page)
      }
    })();
  }, []);

  // Load chat from localStorage
  React.useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    } else {
      setMessages([{
        id: Date.now(),
        role: "assistant",
        content: "Hey! I’m your AI copilot. Need a hand? I can route you around the app, and even build a course (1/day).",
        ts: new Date().toISOString(),
        attachments: [],
        actions: [
          { type: "navigate", label: "Browse Courses", page: "Courses" },
          { type: "navigate", label: "My Progress", page: "Progress" }
        ]
      }]);
    }
  }, [storageKey]);

  // Pick a natural-sounding voice when TTS is enabled
  const pickPleasantVoice = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const prefs = [
      "Google US English",
      "Google UK English Female",
      "Microsoft Aria", // Edge
      "Microsoft Jenny",
      "Samantha",       // macOS
      "Victoria",
      "Alex",
    ];
    let found = voices.find(v => prefs.some(p => (v.name || "").includes(p)));
    if (!found) {
      // fallback to any English voice, otherwise first
      found = voices.find(v => /en[-_]/i.test(v.lang || "")) || voices[0] || null;
    }
    return found || null;
  }, []);

  React.useEffect(() => {
    if (!ttsEnabled) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const load = () => {
      const voice = pickPleasantVoice();
      if (voice) setTtsVoice(voice);
    };

    // Voices can load asynchronously
    load();
    const handler = () => load();
    window.speechSynthesis.onvoiceschanged = handler;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === handler) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [ttsEnabled, pickPleasantVoice]);

  // Centralized, pleasant TTS
  const speak = React.useCallback((text) => {
    if (!ttsEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    try { synth.cancel(); } catch (e) {
      // Sometimes cancel might throw if there's no speech in progress. Safe to ignore.
      console.warn("Speech synthesis cancel failed:", e);
    }

    const clean = (text || "")
      .replace(/\*+/g, "")      // strip markdown bullets
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 900); // Limit to 900 chars to avoid very long utterances and potential API limits/issues.

    // Speak short sentence chunks for natural breathing
    // Split by sentence-ending punctuation followed by whitespace.
    const chunks = clean.split(/(?<=[.!?])\s+/);
    const maxChunks = 6; // Limit to first few chunks for conciseness
    let currentDelay = 0;

    for (let i = 0; i < Math.min(chunks.length, maxChunks); i++) {
      const chunk = chunks[i].trim();
      if (!chunk) continue; // Skip empty chunks

      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = ttsRate;
      u.pitch = ttsPitch;
      u.volume = ttsVolume;
      u.lang = "en-US";
      if (ttsVoice) u.voice = ttsVoice;

      // Small stagger to avoid clipping and allow browser to process
      const estimatedChunkDuration = chunk.length * 40; // Roughly 40ms per character
      const staggerDelay = 70; // Additional stagger per chunk
      setTimeout(() => synth.speak(u), currentDelay);
      currentDelay += estimatedChunkDuration + staggerDelay; // Accumulate delay
    }
  }, [ttsEnabled, ttsVoice, ttsRate, ttsPitch, ttsVolume]);

  const persist = (msgs) => {
    setMessages(msgs);
    localStorage.setItem(storageKey, JSON.stringify(msgs));
  };

  // Listen to navigation events
  React.useEffect(() => {
    const onNav = (e) => {
      setLastActivity({ type: "navigation", ...e.detail });
      // Optional: lightly refresh memory with activity context
    };
    window.addEventListener("isyncso:navigation", onNav);
    return () => window.removeEventListener("isyncso:navigation", onNav);
  }, []);

  // Screen share handlers
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 10, width: { ideal: 1600 }, height: { ideal: 900 } },
        audio: false
      });
      setScreenStream(stream);
      setSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          stopScreenShare();
        });
      }
      addBotMessage("Screen sharing started. I can analyze snapshots of your screen and suggest next steps. Turn on Auto to coach continuously.");
    } catch (e) {
      addBotMessage("Screen share was blocked or failed. Please allow access and try again.");
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    setScreenStream(null);
    setSharing(false);
    stopAutoCoach(); // Also stop auto-coaching if sharing stops
  };

  const takeSnapshot = async () => {
    if (!videoRef.current) {
      console.warn("Video element not available for snapshot.");
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    const w = video.videoWidth || 1280; // Default width if video metadata isn't ready
    const h = video.videoHeight || 720; // Default height if video metadata isn't ready
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get 2D context for canvas.");
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.75));
    if (!blob) {
      console.error("Failed to create blob from canvas.");
      return;
    }
    const file = new File([blob], "screen.jpg", { type: "image/jpeg" });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await analyzeScreen([file_url]);
    } catch (error) {
      console.error("Error uploading snapshot:", error);
      addBotMessage("Failed to upload screen snapshot. Please try again.");
    }
  };

  const analyzeScreen = async (fileUrls) => {
    const profile = {
      full_name: me?.full_name,
      job_title: me?.job_title,
      industry: me?.industry,
      experience_level: me?.experience_level
    };

    const prompt = `You are the ISYNCSO AI Copilot in Live Coach mode.
You receive a screenshot of the user's current screen. In 3–5 concise bullets:
- Identify what they are working on (tool/app if recognizable).
- Point out the most likely next action they want.
- Give step-by-step guidance (short) to complete it.
- Warn about obvious mistakes (credentials, mis-clicks, unsaved changes).
Keep it pragmatic. If uncertain, say "I might be wrong, but it looks like…".
User profile (for tailoring): ${JSON.stringify(profile)}
Recent activity: ${lastActivity ? JSON.stringify(lastActivity) : "none"}`;

    try {
      const reply = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls
      });

      const botText = typeof reply === "string" ? reply : String(reply);
      addBotMessage(botText);
      speak(botText); // pleasant TTS
    } catch (error) {
      console.error("Error analyzing screen with LLM:", error);
      addBotMessage("I had trouble analyzing your screen. The AI might be unavailable.");
    }
  };

  const startAutoCoach = () => {
    if (!sharing || autoSnapIdRef.current) return;
    autoSnapIdRef.current = setInterval(() => {
      takeSnapshot();
    }, Math.max(6000, autoSnapMs)); // Ensure minimum 6 seconds
    setAutoCoach(true);
    addBotMessage(`Auto coaching enabled. I’ll check your screen every ~${autoSnapMs / 1000}s and chime in when helpful.`);
  };

  const stopAutoCoach = () => {
    if (autoSnapIdRef.current) {
      clearInterval(autoSnapIdRef.current);
      autoSnapIdRef.current = null;
    }
    if (autoCoach) addBotMessage("Auto coaching paused.");
    setAutoCoach(false);
  };

  const toggleAutoCoach = () => {
    if (autoCoach) stopAutoCoach();
    else startAutoCoach();
  };

  // Voice: recognition (talk to the copilot)
  const startVoice = () => {
    // eslint-disable-next-line no-undef
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addBotMessage("Voice recognition is not supported in this browser.");
      return;
    }
    if (voiceListening) return; // Already listening

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false; // Stop after first utterance
    rec.interimResults = false; // Only return final results
    rec.maxAlternatives = 1; // Get the most likely transcription

    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      if (transcript?.trim()) {
        setText(transcript);
        send(transcript);
      }
    };

    rec.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setVoiceListening(false);
      recognitionRef.current = null;
      if (e.error === "not-allowed") {
        addBotMessage("Microphone access denied. Please allow access in your browser settings.");
      } else if (e.error === "no-speech") {
        // No speech detected, do nothing, just let it end.
      } else {
        addBotMessage("Voice input failed. Please try again.");
      }
    };

    rec.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setVoiceListening(true);
    rec.start();
  };

  const stopVoice = () => {
    const rec = recognitionRef.current;
    if (rec) {
      rec.stop();
      setVoiceListening(false);
    }
  };

  // Helpers
  const todayStr = () => new Date().toISOString().slice(0, 10);

  const checkCourseQuota = (user) => {
    const last = user?.agent_course_last_date || "";
    const count = user?.agent_course_requests_today || 0;
    if (last === todayStr() && count >= 1) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: last === todayStr() ? 1 - count : 1 };
  };

  const updateCourseQuota = async () => {
    const u = await base44.auth.me();
    const last = u.agent_course_last_date || "";
    const count = u.agent_course_requests_today || 0;
    const isSameDay = last === todayStr();
    await base44.auth.updateMe({
      agent_course_last_date: todayStr(),
      agent_course_requests_today: isSameDay ? Math.min(count + 1, 99) : 1
    });
  };

  const quickAsk = (q) => {
    setText(q);
    send(q);
  };

  // MCP Integrations hook
  const { connectedIntegrations, getIntegrationContext } = useMCP();

  // Intent detection: navigate / create_course / integrations
  const detectIntent = (content) => {
    const lc = (content || "").toLowerCase();

    // Navigation intents
    const navMap = [
      { keywords: ["dashboard", "home"], page: "Dashboard" },
      { keywords: ["course", "courses", "catalog"], page: "Courses" },
      { keywords: ["progress", "my progress"], page: "Progress" },
      { keywords: ["profile", "settings", "account"], page: "Profile" },
      { keywords: ["certificates", "certificate"], page: "Certificates" },
      { keywords: ["assistant", "ai assistant"], page: "AIAssistant" },
      { keywords: ["admin"], page: "AdminDashboard" },
      { keywords: ["integrations", "connect apps", "mcp", "connected tools"], page: "MCPIntegrations" },
    ];
    for (const item of navMap) {
      if (item.keywords.some(k => lc.includes(k))) {
        return { type: "navigate", page: item.page };
      }
    }

    // Create course intent
    const createPatterns = [
      "create a course", "build a course", "make a course",
      "generate a course", "new course", "/createcourse"
    ];
    if (createPatterns.some(p => lc.includes(p))) {
      // Try to extract topic after "about" or "on"
      const topicMatch = lc.match(/(?:about|on)\s+(.+)/i);
      const topic = topicMatch ? topicMatch[1].trim() : "";
      return { type: "create_course", topic };
    }

    // Screen share intent
    const screenSharePatterns = [
      "start screen share", "share my screen", "screen share"
    ];
    if (screenSharePatterns.some(p => lc.includes(p))) {
      return { type: "start_screen_share" };
    }

    // Integrations status intent
    const integrationPatterns = [
      "what tools are connected", "my integrations", "connected apps",
      "list integrations", "show integrations", "what can you access"
    ];
    if (integrationPatterns.some(p => lc.includes(p))) {
      return { type: "show_integrations" };
    }

    return { type: "none" };
  };

  const addBotMessage = (content, actions = []) => {
    const msg = {
      id: Date.now(),
      role: "assistant",
      content,
      ts: new Date().toISOString(),
      attachments: [],
      actions
    };
    const next = [...messages, msg];
    persist(next);
    // No auto-speak here to avoid double-speaking; speak is called at reply points.
  };

  const requestCourseConfirmation = async (topic) => {
    const user = await base44.auth.me();
    const quota = checkCourseQuota(user);
    if (!quota.allowed) {
      addBotMessage(
        "You’ve reached today’s limit (1 new course/day). Try again tomorrow.",
        [
          { type: "navigate", label: "Browse Courses", page: "Courses" },
          { type: "navigate", label: "My Progress", page: "Progress" }
        ]
      );
      return;
    }

    addBotMessage(
      `You can create 1 new course per day. Build${topic ? ` “${topic}”` : ""} now?`,
      [
        { type: "confirm_create_course", label: "Yes — create course", topic: topic || "" },
        { type: "navigate", label: "Cancel", page: "Dashboard" }
      ]
    );
  };

  const buildCourse = async (topic) => {
    setThinking(true);
    const meNow = await base44.auth.me();
    const job = await base44.entities.CourseBuild.create({
      user_id: meNow.id,
      requested_topic: topic || "role-specific AI workflows",
      status: "building",
      progress_percentage: 0,
      logs: [`[0%] Starting build for "${topic || "AI Workflows"}"`],
      started_at: new Date().toISOString()
    });

    const updateJob = async (patch) => {
      // eslint-disable-next-line no-await-in-loop
      await base44.entities.CourseBuild.update(job.id, patch);
    };

    const pushLog = async (msg, percent) => {
      const logMsg = `[${percent}%] ${msg}`;
      const newLogs = [...(job.logs || []), logMsg];
      job.logs = newLogs; // Update local job object for subsequent pushes
      await updateJob({ logs: newLogs, progress_percentage: percent });
    };

    try {
      const { blueprint, lessons: finalLessons } = await buildHighQualityCourse(meNow, topic || "AI Workflows for my role", ({ stage, detail, percent }) => {
        pushLog(`${stage}: ${detail}`, percent);
      });

      // Ensure blueprint has necessary fields or provide defaults
      const course = await base44.entities.Course.create({
        title: blueprint.title || `AI Course: ${topic || "Workflows"}`,
        description: blueprint.description || "A practical course focused on implementing AI in your day-to-day work.",
        difficulty: blueprint.difficulty || (meNow?.experience_level || "beginner"),
        category: 'applications', // Default category
        duration_hours: Number(blueprint.duration_hours || 4),
        prerequisites: [],
        learning_outcomes: [],
        instructor: "AI Copilot",
        cover_image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&crop=center",
        is_published: true
      });

      for (const moduleData of blueprint.modules) {
        // eslint-disable-next-line no-await-in-loop
        const module = await base44.entities.Module.create({
          course_id: course.id,
          title: moduleData.title,
          order_index: moduleData.order_index
        });

        const moduleLessons = finalLessons
          .filter(l => l.module_order_index === moduleData.order_index)
          .sort((a, b) => a.lesson_order_index - b.lesson_order_index);

        for (const lessonData of moduleLessons) {
          // eslint-disable-next-line no-await-in-loop
          await base44.entities.Lesson.create({
            module_id: module.id,
            title: lessonData.title,
            content: lessonData.content,
            order_index: lessonData.lesson_order_index,
            duration_minutes: lessonData.duration_minutes || 20,
            lesson_type: lessonData.lesson_type || "interactive",
            interactive_config: lessonData.interactive_config || {}
          });
        }
      }

      await updateJob({ status: "completed", finished_at: new Date().toISOString(), progress_percentage: 100, course_id: course.id, logs: [...job.logs, "[100%] Build complete!"] });
      await updateCourseQuota();
      
      // Update memory for user profile
      await base44.auth.updateMe({
        courses_created: (meNow?.courses_created || 0) + 1,
        agent_memory: {
          ...(memory || {}),
          workflows_of_interest: Array.isArray(memory?.workflows_of_interest)
            ? Array.from(new Set([...(memory.workflows_of_interest || []), "course_creation"]))
            : ["course_creation"],
          last_updated: new Date().toISOString()
        }
      });

      addBotMessage(
        "All set! Your new course is ready. I've added it to your personalized list.",
        [{ type: "navigate", label: "Go to Course", page: `CourseDetail?id=${course.id}` }]
      );

    } catch (err) {
      console.error("Course build failed:", err);
      await updateJob({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: String(err?.message || err),
        logs: [...(job.logs || []), `[FAILED] ${String(err?.message || err)}`]
      });
      addBotMessage("I hit an issue building that course. Want to try again?", [{ type: "confirm_create_course", label: "Retry Build", topic: topic || "" }]);
    } finally {
      setThinking(false);
    }
  };
  
  // Attachment handlers
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f =>
      /^image\/(png|jpe?g|gif|webp)$/i.test(f.type)
    ).slice(0, 5); // Limit to 5 images
    if (files.length === 0) return;

    const temp = files.map((f, i) => ({
      id: `${Date.now()}_${i}`,
      url: "",
      name: f.name,
      uploading: true
    }));
    setAttachments(prev => [...prev, ...temp]);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      // eslint-disable-next-line no-await-in-loop
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        setAttachments(prev =>
          prev.map(a => (a.name === f.name && a.uploading) ? { ...a, url: file_url, uploading: false } : a)
        );
      } catch (error) {
        console.error("Error uploading file:", error);
        setAttachments(prev => prev.filter(a => !(a.name === f.name && a.uploading))); // Remove failed upload
        addBotMessage(`Failed to upload ${f.name}.`);
      }
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    await handleFiles(e.dataTransfer.files);
  };

  // Route actions (buttons in messages)
  const handleAction = async (action) => {
    if (action.type === "navigate") {
      const target = action.page || "Dashboard";
      window.location.href = createPageUrl(target);
      return;
    }
    if (action.type === "confirm_create_course") {
      await buildCourse(action.topic || "");
      return;
    }
  };

  // LLM memory updater
  const updateMemory = async (msgs) => {
    const summarizerPrompt = `Summarize new learnings about the user from this chat (short).
Return JSON: {summary, workflows_of_interest, tools_preferred, pain_points, last_updated}

Recent chat:
${msgs.slice(-20).map(m => `${m.role}: ${m.content}`).join("\n")}

Recent activity:
${lastActivity ? JSON.stringify(lastActivity) : "none"}

Existing memory:
${JSON.stringify(memory || {}, null, 2)}`;
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: summarizerPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            workflows_of_interest: { type: "array", items: { type: "string" } },
            tools_preferred: { type: "array", items: { type: "string" } },
            pain_points: { type: "array", items: { type: "string" } },
            last_updated: { type: "string" }
          }
        }
      });
      setMemory(result);
      await base44.auth.updateMe({
        agent_memory: {
          summary: result.summary || "",
          workflows_of_interest: Array.isArray(result.workflows_of_interest) ? result.workflows_of_interest : [],
          tools_preferred: Array.isArray(result.tools_preferred) ? result.tools_preferred : [],
          pain_points: Array.isArray(result.pain_points) ? result.pain_points : [],
          last_updated: new Date().toISOString()
        },
        agent_interactions: (me?.agent_interactions || 0) + 1
      });
    } catch (error) {
      console.error("Failed to update memory:", error);
      // Don't block chat if memory update fails
    }
  };

  // Send flow
  const send = async (presetText) => {
    const content = (presetText ?? text).trim();
    const readyAttachments = attachments.filter(a => a.url && !a.uploading);
    if (!content && readyAttachments.length === 0) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: content || "(sent attachments)",
      ts: new Date().toISOString(),
      attachments: readyAttachments
    };
    const next = [...messages, userMsg];
    persist(next);
    setText("");
    setThinking(true);

    // Intent handling before LLM
    const intent = detectIntent(content);
    if (intent.type === "navigate") {
      addBotMessage("Got it — opening that section.", [
        { type: "navigate", label: "Go now", page: intent.page }
      ]);
      setThinking(false);
      setAttachments([]);
      await updateMemory([...next, { role: "assistant", content: "Navigated user", ts: new Date().toISOString() }]);
      return;
    }
    if (intent.type === "create_course") {
      await requestCourseConfirmation(intent.topic);
      setThinking(false);
      setAttachments([]);
      await updateMemory([...next, { role: "assistant", content: "Proposed course creation", ts: new Date().toISOString() }]);
      return;
    }
    if (intent.type === "show_integrations") {
      const ctx = getIntegrationContext();
      if (ctx && ctx.count > 0) {
        const toolsList = ctx.integrations.map(i => `• **${i.name}** (${i.status})`).join('\n');
        addBotMessage(
          `You have ${ctx.count} connected integration${ctx.count > 1 ? 's' : ''}:\n\n${toolsList}\n\nI can help you use these tools to access your data and automate tasks.`,
          [{ type: "navigate", label: "Manage Integrations", page: "MCPIntegrations" }]
        );
      } else {
        addBotMessage(
          "You don't have any connected integrations yet. Connect your business tools like HubSpot, Gmail, Slack, or Notion to unlock AI-powered workflows.",
          [{ type: "navigate", label: "Connect Apps", page: "MCPIntegrations" }]
        );
      }
      setThinking(false);
      setAttachments([]);
      await updateMemory([...next, { role: "assistant", content: "Listed integrations", ts: new Date().toISOString() }]);
      return;
    }
    if (intent.type === "start_screen_share") {
      await startScreenShare();
      setThinking(false);
      setAttachments([]);
      await updateMemory([...next, { role: "assistant", content: "Initiated screen sharing", ts: new Date().toISOString() }]);
      return;
    }

    // Build LLM prompt with attachments and activity context
    const profile = {
      full_name: me?.full_name,
      email: me?.email,
      job_title: me?.job_title,
      industry: me?.industry,
      experience_level: me?.experience_level,
      goals: me?.goals,
      time_commitment: me?.time_commitment,
      skills: me?.skills
    };
    const convo = next.slice(-20).map(m => {
      const att = m.attachments?.length ? ` [attachments: ${m.attachments.map(a => a.url).join(", ")}]` : "";
      return `${m.role}: ${m.content}${att}`;
    }).join("\n");
    const attachmentsInfo = readyAttachments.length
      ? `User attached ${readyAttachments.length} image(s): ${readyAttachments.map(a => a.url).join(", ")}`
      : "No new attachments.";

    const prompt = `You are the ISYNCSO AI Copilot.
Style: conversational, crisp, helpful. Max ~6 sentences unless user asks for depth. Use 3–5 short bullets for steps. Avoid fluff.
Mission: help apply AI in user's daily work with real tools; tailor to their role.
User Profile: ${JSON.stringify(profile)}
Recent activity: ${lastActivity ? JSON.stringify(lastActivity) : "none"}
Conversation:\n${convo}
Turn context: ${attachmentsInfo}
Reply now (concise).`;

    const fileUrls = readyAttachments.map(a => a.url);
    try {
      const reply = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length ? fileUrls : undefined
      });

      const botMsgContent = typeof reply === "string" ? reply : String(reply);
      const botMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: botMsgContent,
        ts: new Date().toISOString(),
        attachments: [],
        actions: []
      };
      const finalMsgs = [...next, botMsg];
      persist(finalMsgs);
      setThinking(false);
      setAttachments([]);

      speak(botMsgContent); // pleasant TTS

      await updateMemory(finalMsgs);
    } catch (error) {
      console.error("LLM invocation failed:", error);
      addBotMessage("I'm sorry, I couldn't process that request at the moment. Please try again.");
      setThinking(false);
      setAttachments([]);
    }
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 btn-primary w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          aria-label="Open AI Copilot"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-4 right-4 z-50 w-[92vw] max-w-md"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <Card className="glass-card border-0 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500/40 to-emerald-400/40 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold leading-tight">AI Copilot</div>
                  <div className="text-xs text-gray-400 -mt-0.5">Workflows, setup, and quick guidance</div>
                </div>
              </div>

              {/* Header now only has Close */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="btn-outline h-9 px-3 text-sm gap-2"
                      onClick={() => setOpen(false)}
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Close</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close Copilot</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                <div className="px-4 py-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 text-sm">
                  Drop screenshots here to attach
                </div>
              </div>
            )}

            {/* Live screen preview */}
            {sharing && (
              <div className="p-3 border-b border-gray-800">
                <div className="rounded-lg overflow-hidden border border-white/10 relative">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-32 object-contain bg-black" />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600/60 text-white text-xs rounded-full">Live</div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button className="btn-primary px-3 py-1 text-xs h-8" onClick={takeSnapshot}>
                    <Camera className="w-4 h-4 mr-2" />
                    Snapshot
                  </Button>
                  <div className="text-xs text-gray-400">
                    {autoCoach ? `Auto coaching is ON (~${autoSnapMs / 1000}s)` : "Manual snapshots"}
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="h-96 p-3">
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-100"
                        : "bg-white/5 border border-white/10 text-gray-100"
                    }`}>
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {Array.isArray(m.actions) && m.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.actions.map((a, idx) => (
                            <Button key={idx} className="btn-outline text-xs" onClick={() => handleAction(a)}>
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      )}

                      {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {m.attachments.map((a) => (
                            <a key={a.id || a.url} href={a.url} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={a.url || ""}
                                alt={a.name || "attachment"}
                                className="w-full h-20 object-cover rounded-lg border border-white/10"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {thinking && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-gray-300 text-sm">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="p-3 border-t border-gray-800">
              {/* Actions toolbar moved to bottom */}
              <TooltipProvider>
                <div className="flex flex-wrap items-center gap-2 justify-start mb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`btn-outline h-8 px-2 sm:px-3 text-xs gap-1 ${sharing ? "border-emerald-400 text-emerald-300" : ""}`}
                        onClick={sharing ? stopScreenShare : startScreenShare}
                        aria-pressed={sharing}
                      >
                        {sharing ? <StopCircle className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                        <span className="hidden sm:inline">{sharing ? "Stop" : "Share"}</span>
                        <span className="sr-only">Toggle screen share</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share your screen</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`btn-outline h-8 px-2 sm:px-3 text-xs gap-1 ${autoCoach ? "border-emerald-400 text-emerald-300" : ""}`}
                        onClick={toggleAutoCoach}
                        disabled={!sharing}
                        aria-pressed={autoCoach}
                      >
                        <Radio className="w-4 h-4" />
                        <span className="hidden sm:inline">Auto</span>
                        <span className="sr-only">Toggle auto coaching</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Periodic snapshot analysis</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`btn-outline h-8 px-2 sm:px-3 text-xs gap-1 ${ttsEnabled ? "border-emerald-400 text-emerald-300" : ""}`}
                        onClick={() => setTtsEnabled(!ttsEnabled)}
                        aria-pressed={ttsEnabled}
                      >
                        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span className="hidden sm:inline">Voice</span>
                        <span className="sr-only">Toggle voice replies</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Speak replies</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`btn-outline h-8 px-2 sm:px-3 text-xs gap-1 ${voiceListening ? "border-emerald-400 text-emerald-300" : ""}`}
                        onClick={voiceListening ? stopVoice : startVoice}
                        aria-pressed={voiceListening}
                      >
                        {voiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        <span className="hidden sm:inline">{voiceListening ? "Stop" : "Talk"}</span>
                        <span className="sr-only">Start or stop voice input</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Talk to the copilot</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {/* Selected attachments */}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div key={a.id || a.name} className="relative">
                      <img
                        src={a.url || ""}
                        alt={a.name}
                        className={`w-16 h-16 object-cover rounded-lg border ${a.uploading ? "border-emerald-300/30 opacity-60" : "border-white/10"}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Input row with smaller attach and send */}
              <div className="flex items-end gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="btn-outline h-9 w-9 p-0"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach images"
                        aria-label="Attach"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach images</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />

                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder='Ask or say "start screen share"…'
                  className="flex-1 bg-transparent border border-white/10 text-white placeholder-gray-400"
                  disabled={thinking}
                />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => send()}
                        disabled={thinking || (!text.trim() && attachments.filter(a => a.url && !a.uploading).length === 0)}
                        className="btn-primary h-9 w-9 p-0 rounded-full"
                        aria-label="Send"
                        title="Send"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Quick prompts */}
              {messages.length <= 2 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="btn-outline text-xs" onClick={() => quickAsk("Start screen share and guide me step by step")}>
                    Share screen
                  </Button>
                  <Button className="btn-outline text-xs" onClick={() => quickAsk("Create a course about prompt engineering")}>
                    Create course
                  </Button>
                  <Button className="btn-outline text-xs" onClick={() => quickAsk("Show my progress")}>
                    Progress
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}