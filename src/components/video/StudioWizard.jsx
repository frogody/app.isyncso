import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Play,
  Download,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  Film,
  Clock,
  RotateCcw,
  Monitor,
  Clapperboard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/components/context/UserContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const STYLES = [
  { value: "cinematic", label: "Cinematic" },
  { value: "documentary", label: "Documentary" },
  { value: "social_media", label: "Social Media" },
  { value: "product_showcase", label: "Product Showcase" },
  { value: "corporate", label: "Corporate" },
  { value: "creative", label: "Creative" },
];

const DURATIONS = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "45", label: "45s" },
  { value: "60", label: "60s" },
];

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 Landscape" },
  { value: "9:16", label: "9:16 Portrait" },
  { value: "1:1", label: "1:1 Square" },
];

const MODELS = [
  { value: "kling", label: "Kling (Best humans)" },
  { value: "minimax", label: "Minimax (Natural motion)" },
  { value: "luma", label: "Luma (Cinematic)" },
  { value: "wan", label: "Wan (Fast/cheap)" },
];

const STEP_LABELS = ["Brief", "Storyboard", "Generation", "Review & Export"];

async function edgeFn(fnName, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Edge function ${fnName} failed`);
  }
  return res.json();
}

// Submit a shot to fal.ai then poll until done (avoids edge function timeout)
async function generateOneShot({ projectId, description, model, duration_seconds, camera_direction, aspect_ratio }) {
  // Step 1: Submit — returns immediately with request_id + poll URLs
  const submitData = await edgeFn("generate-shot", {
    action: "submit",
    project_id: projectId,
    description,
    model: model || "kling",
    duration_seconds: duration_seconds || 5,
    camera_direction,
    aspect_ratio,
  });

  const { request_id, status_url, response_url } = submitData;
  if (!request_id) throw new Error("No request_id from submit");

  // Step 2: Poll every 8s until completed/failed (max 8 min for kling v2.1)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    const pollData = await edgeFn("generate-shot", {
      action: "poll",
      request_id,
      status_url,
      response_url,
      project_id: projectId,
    });

    if (pollData.status === "COMPLETED") {
      return { video_url: pollData.video_url };
    }
    if (pollData.status === "FAILED") {
      throw new Error(pollData.error || "Shot generation failed");
    }
    // Otherwise keep polling (IN_QUEUE, IN_PROGRESS, etc.)
  }
  throw new Error("Shot generation timed out after 8 minutes");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 ${done ? "bg-cyan-500" : "bg-zinc-700"}`}
              />
            )}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
                  : done
                    ? "bg-cyan-500/10 text-cyan-500"
                    : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : null}
              <span>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-zinc-700/60 bg-zinc-800/50 backdrop-blur-md p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function MoodBadge({ mood }) {
  if (!mood) return null;
  return (
    <span className="inline-block rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300 ring-1 ring-purple-500/30">
      {mood}
    </span>
  );
}

function TransitionBadge({ transition }) {
  if (!transition) return null;
  return (
    <span className="inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300 ring-1 ring-amber-500/30">
      {transition}
    </span>
  );
}

function StatusIcon({ status }) {
  switch (status) {
    case "completed":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20 text-green-400">
          <Check className="h-4 w-4" />
        </div>
      );
    case "generating":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    case "failed":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          <X className="h-4 w-4" />
        </div>
      );
    default:
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 text-zinc-500">
          <Clock className="h-4 w-4" />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Main Wizard
// ---------------------------------------------------------------------------

export default function StudioWizard({
  products = [],
  brandAssets = {},
  onProjectCreated,
}) {
  const { user } = useUser();
  // Wizard step
  const [step, setStep] = useState(1);

  // Step 1 state
  const [brief, setBrief] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("30");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // Step 2 state
  const [storyboard, setStoryboard] = useState([]);

  // Step 3 state
  const [shots, setShots] = useState([]);
  const [projectId, setProjectId] = useState(null);

  // Step 4 state
  const [assembledVideoUrl, setAssembledVideoUrl] = useState(null);
  const [projectStatus, setProjectStatus] = useState(null);

  // Loading states
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [generatingShots, setGeneratingShots] = useState(false);
  const [assembling, setAssembling] = useState(false);

  // Polling ref
  const pollingRef = useRef(null);

  // ------ Step 1 -> 2: Generate storyboard ------

  const handleGenerateStoryboard = useCallback(async () => {
    if (!brief.trim()) {
      toast.error("Please enter a video concept or brief.");
      return;
    }
    setGeneratingStoryboard(true);
    try {
      // Find the product object for context
      const productObj = products.find((p) => p.id === selectedProduct || p.name === selectedProduct);
      const productContext = productObj
        ? {
            name: productObj.name,
            description: productObj.description || productObj.short_description,
            tagline: productObj.tagline,
            features: productObj.features,
          }
        : undefined;

      // Create project in DB first
      const { data: project, error: projErr } = await supabase
        .from("video_projects")
        .insert({
          company_id: user?.company_id || undefined,
          created_by: user?.id || undefined,
          brief,
          status: "storyboarding",
          settings: {
            style,
            aspect_ratio: aspectRatio,
            duration_target: Number(duration),
          },
          product_id: productObj?.id || undefined,
          brand_context: brandAssets || undefined,
        })
        .select()
        .single();

      if (projErr) throw new Error(`Failed to create project: ${projErr.message}`);

      const pid = project.id;
      setProjectId(pid);

      const data = await edgeFn("generate-storyboard", {
        project_id: pid,
        brief,
        product_context: productContext,
        brand_context: brandAssets || undefined,
        target_duration: Number(duration),
        style,
        aspect_ratio: aspectRatio,
      });

      // The edge function returns { storyboard: { shots: [...], ... } }
      const rawShots =
        data.storyboard?.shots || data.storyboard || data.shots || [];

      const board = rawShots.map((s, i) => ({
        id: crypto.randomUUID(),
        shot_number: i + 1,
        scene_title: s.scene || s.scene_title || s.title || `Shot ${i + 1}`,
        description: s.description || "",
        camera_direction: s.camera || s.camera_direction || "",
        duration: s.duration_seconds || s.duration || 5,
        mood: s.mood || "",
        transition: s.transition_to_next || s.transition || "cut",
        text_overlay: s.text_overlay || null,
        model: "kling",
      }));

      setStoryboard(board);
      setStep(2);
      toast.success("Storyboard generated!");
    } catch (err) {
      console.error("Storyboard generation error:", err);
      toast.error(err.message || "Failed to generate storyboard");
    } finally {
      setGeneratingStoryboard(false);
    }
  }, [brief, selectedProduct, style, duration, aspectRatio, brandAssets, products]);

  // ------ Storyboard editing helpers ------

  const updateShot = useCallback((id, patch) => {
    setStoryboard((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }, []);

  const addShot = useCallback(() => {
    setStoryboard((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        shot_number: prev.length + 1,
        scene_title: `Shot ${prev.length + 1}`,
        description: "",
        camera_direction: "",
        duration: 5,
        mood: "",
        transition: "cut",
        model: "kling",
      },
    ]);
  }, []);

  const removeShot = useCallback((id) => {
    setStoryboard((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.map((s, i) => ({ ...s, shot_number: i + 1 }));
    });
  }, []);

  const duplicateShot = useCallback((id) => {
    setStoryboard((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const clone = {
        ...prev[idx],
        id: crypto.randomUUID(),
        shot_number: prev.length + 1,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next.map((s, i) => ({ ...s, shot_number: i + 1 }));
    });
  }, []);

  const totalDuration = storyboard.reduce(
    (sum, s) => sum + (Number(s.duration) || 0),
    0
  );

  // ------ Step 2 -> 3: Generate all shots ------

  const handleGenerateShots = useCallback(async () => {
    setGeneratingShots(true);

    // Init shot statuses
    const initial = storyboard.map((s) => ({
      ...s,
      status: "pending",
      thumbnail: null,
      error: null,
    }));
    setShots(initial);
    setStep(3);

    try {
      // Fire all shots in parallel
      const promises = storyboard.map(async (shot, idx) => {
        setShots((prev) =>
          prev.map((s, i) => (i === idx ? { ...s, status: "generating" } : s))
        );
        try {
          const data = await generateOneShot({
            projectId,
            description: shot.description,
            model: shot.model || "kling",
            duration_seconds: shot.duration_seconds || 5,
            camera_direction: shot.camera,
            aspect_ratio: aspectRatio,
          });
          setShots((prev) =>
            prev.map((s, i) =>
              i === idx
                ? {
                    ...s,
                    status: "completed",
                    thumbnail: data.video_url || null,
                    video_url: data.video_url || null,
                    shot_id: data.shot_id || data.id || null,
                  }
                : s
            )
          );
        } catch (err) {
          setShots((prev) =>
            prev.map((s, i) =>
              i === idx
                ? { ...s, status: "failed", error: err.message }
                : s
            )
          );
        }
      });

      await Promise.allSettled(promises);
    } finally {
      setGeneratingShots(false);
    }
  }, [storyboard, projectId, style, aspectRatio]);

  // Retry a single failed shot
  const retryShot = useCallback(
    async (idx) => {
      const shot = shots[idx];
      if (!shot) return;

      setShots((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...s, status: "generating", error: null } : s
        )
      );

      try {
        const data = await generateOneShot({
          projectId,
          description: shot.description,
          model: shot.model || "kling",
          duration_seconds: shot.duration_seconds || 5,
          camera_direction: shot.camera,
          aspect_ratio: aspectRatio,
        });
        setShots((prev) =>
          prev.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  status: "completed",
                  thumbnail: data.video_url || null,
                  video_url: data.video_url || null,
                }
              : s
          )
        );
        toast.success(`Shot ${idx + 1} regenerated`);
      } catch (err) {
        setShots((prev) =>
          prev.map((s, i) =>
            i === idx ? { ...s, status: "failed", error: err.message } : s
          )
        );
        toast.error(`Shot ${idx + 1} failed again`);
      }
    },
    [shots, projectId, style, aspectRatio]
  );

  const completedCount = shots.filter((s) => s.status === "completed").length;
  const allCompleted =
    shots.length > 0 && shots.every((s) => s.status === "completed");
  const progressPct =
    shots.length > 0 ? Math.round((completedCount / shots.length) * 100) : 0;

  // ------ Step 3 -> 4: Assemble video ------

  const handleAssemble = useCallback(async () => {
    setAssembling(true);
    try {
      const data = await edgeFn("assemble-video", {
        project_id: projectId,
        shots: shots.map((s) => ({
          shot_id: s.shot_id,
          video_url: s.video_url,
          transition: s.transition,
          duration: s.duration,
        })),
      });
      setAssembledVideoUrl(data.video_url || null);
      setProjectStatus(data.status || "completed");
      if (onProjectCreated) onProjectCreated(data);
      setStep(4);
      toast.success("Video assembled successfully");
    } catch (err) {
      toast.error(err.message || "Failed to assemble video");
    } finally {
      setAssembling(false);
    }
  }, [projectId, shots, onProjectCreated]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ------ Render ------

  const fadeVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-white">
      <StepIndicator step={step} />

      <AnimatePresence mode="wait">
        {/* ===== STEP 1: BRIEF ===== */}
        {step === 1 && (
          <motion.div
            key="step1"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <GlassCard>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Clapperboard className="h-5 w-5 text-cyan-400" />
                Video Brief
              </h2>

              <div className="space-y-5">
                {/* Brief textarea */}
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">
                    Concept / Brief
                  </Label>
                  <Textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Describe your video concept, key messages, and desired outcome..."
                    rows={5}
                    className="resize-none border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:ring-cyan-500"
                  />
                </div>

                {/* Product selector */}
                {products.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Product</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                        <SelectValue placeholder="Select a product (optional)" />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                        {products.map((p) => (
                          <SelectItem key={p.id || p.value || p} value={String(p.id || p.value || p)}>
                            {p.name || p.label || p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Row: Style, Duration, Aspect Ratio */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                        {STYLES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                        {DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-900 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                        {ASPECT_RATIOS.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleGenerateStoryboard}
                    disabled={generatingStoryboard || !brief.trim()}
                    className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                  >
                    {generatingStoryboard ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate Storyboard
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* ===== STEP 2: STORYBOARD ===== */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Brief
              </button>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  {totalDuration}s total
                </span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                  {storyboard.length} shot{storyboard.length !== 1 && "s"}
                </span>
              </div>
            </div>

            {/* Shot cards */}
            <div className="space-y-3">
              {storyboard.map((shot, idx) => (
                <GlassCard key={shot.id} className="relative">
                  <div className="flex items-start gap-4">
                    {/* Shot number pill */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
                      {shot.shot_number}
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* Title row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <input
                          value={shot.scene_title}
                          onChange={(e) =>
                            updateShot(shot.id, {
                              scene_title: e.target.value,
                            })
                          }
                          className="bg-transparent text-base font-medium text-white outline-none placeholder:text-zinc-500 flex-1 min-w-[120px]"
                          placeholder="Scene title"
                        />
                        <MoodBadge mood={shot.mood} />
                        <TransitionBadge transition={shot.transition} />
                      </div>

                      {/* Description */}
                      <Textarea
                        value={shot.description}
                        onChange={(e) =>
                          updateShot(shot.id, {
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Shot description..."
                        className="resize-none border-zinc-700 bg-zinc-900 text-sm text-white placeholder:text-zinc-500 focus:ring-cyan-500"
                      />

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="space-y-1">
                          <span className="text-xs text-zinc-500">Camera</span>
                          <input
                            value={shot.camera_direction}
                            onChange={(e) =>
                              updateShot(shot.id, {
                                camera_direction: e.target.value,
                              })
                            }
                            className="block w-36 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="e.g. dolly in"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-zinc-500">Duration (s)</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={shot.duration}
                            onChange={(e) =>
                              updateShot(shot.id, {
                                duration: Number(e.target.value),
                              })
                            }
                            className="block w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-zinc-500">Model</span>
                          <Select
                            value={shot.model}
                            onValueChange={(v) =>
                              updateShot(shot.id, { model: v })
                            }
                          >
                            <SelectTrigger className="h-7 w-52 border-zinc-700 bg-zinc-900 text-xs text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                              {MODELS.map((m) => (
                                <SelectItem
                                  key={m.value}
                                  value={m.value}
                                  className="text-xs"
                                >
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => duplicateShot(shot.id)}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                        title="Duplicate shot"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeShot(shot.id)}
                        disabled={storyboard.length <= 1}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-30"
                        title="Remove shot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={addShot}
                className="gap-1 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              >
                <Plus className="h-4 w-4" /> Add Shot
              </Button>

              <Button
                onClick={handleGenerateShots}
                disabled={generatingShots || storyboard.length === 0}
                className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
              >
                {generatingShots ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                Generate All Shots
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== STEP 3: GENERATION PROGRESS ===== */}
        {step === 3 && (
          <motion.div
            key="step3"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Progress bar */}
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {completedCount} / {shots.length} shots completed
                </span>
                <span className="font-medium text-cyan-400">{progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </GlassCard>

            {/* Shot grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shots.map((shot, idx) => (
                <GlassCard key={shot.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Shot {shot.shot_number}
                    </span>
                    <StatusIcon status={shot.status} />
                  </div>

                  {/* Thumbnail / placeholder */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900">
                    {shot.status === "completed" && shot.thumbnail ? (
                      <img
                        src={shot.thumbnail}
                        alt={`Shot ${shot.shot_number}`}
                        className="h-full w-full object-cover"
                      />
                    ) : shot.status === "generating" ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                      </div>
                    ) : shot.status === "failed" ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <X className="h-6 w-6 text-red-400" />
                        <span className="text-xs text-red-400">
                          {shot.error || "Generation failed"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Monitor className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  <p className="line-clamp-2 text-xs text-zinc-400">
                    {shot.scene_title}
                  </p>

                  {shot.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryShot(idx)}
                      className="w-full gap-1 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retry
                    </Button>
                  )}
                </GlassCard>
              ))}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Storyboard
              </button>
              <Button
                onClick={handleAssemble}
                disabled={!allCompleted || assembling}
                className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
              >
                {assembling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Assemble Video
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== STEP 4: REVIEW & EXPORT ===== */}
        {step === 4 && (
          <motion.div
            key="step4"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Film className="h-5 w-5 text-cyan-400" />
                  Final Video
                </h2>
                {projectStatus && (
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/30">
                    {projectStatus}
                  </span>
                )}
              </div>

              {/* Video player */}
              {assembledVideoUrl ? (
                <div className="overflow-hidden rounded-lg bg-black">
                  <video
                    src={assembledVideoUrl}
                    controls
                    className="mx-auto max-h-[480px] w-full"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-zinc-900">
                  <p className="text-sm text-zinc-500">
                    No video URL available yet.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to Storyboard
                </button>

                <div className="flex gap-2">
                  {assembledVideoUrl && (
                    <Button
                      asChild
                      className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      <a
                        href={assembledVideoUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
