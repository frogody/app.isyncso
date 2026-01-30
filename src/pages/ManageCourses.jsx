import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Course } from "@/api/entities";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  MoreVertical,
  Copy,
  Users,
  Clock,
  Target,
  FolderOpen,
  AlertTriangle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const difficultyConfig = {
  beginner: {
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    gradient: "from-emerald-500 to-emerald-400",
  },
  intermediate: {
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    gradient: "from-amber-500 to-amber-400",
  },
  advanced: {
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    gradient: "from-rose-500 to-rose-400",
  },
};

const categories = [
  { value: "fundamentals", label: "AI Fundamentals" },
  { value: "machine_learning", label: "Machine Learning" },
  { value: "deep_learning", label: "Deep Learning" },
  { value: "nlp", label: "Natural Language Processing" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "ethics", label: "AI Ethics" },
  { value: "applications", label: "Applications" },
];

function CourseManageCard({ course, onEdit, onDuplicate, onTogglePublish, onDelete }) {
  const diff = difficultyConfig[course.difficulty] || difficultyConfig.beginner;

  return (
    <motion.div variants={itemVariants}>
      <GlassCard
        className="overflow-hidden hover:border-teal-500/30 transition-all !p-0"
        hover={false}
        animated={false}
      >
        <div className={`h-1 bg-gradient-to-r ${diff.gradient}`} />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{course.title}</h3>
              <div className="flex gap-1.5 mt-1">
                <Badge
                  className={
                    course.is_published
                      ? "bg-teal-500/20 text-teal-400 border-teal-500/30 text-[10px]"
                      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[10px]"
                  }
                >
                  {course.is_published ? "Published" : "Draft"}
                </Badge>
                <Badge className={`${diff.badge} text-[10px]`}>
                  {course.difficulty}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-xs text-zinc-400 line-clamp-2">{course.description}</p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {course.duration_hours}h
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" /> {course.category?.replace(/_/g, " ")}
            </span>
            {course.instructor && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {course.instructor}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(course)}
              className="text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 h-8 text-xs"
            >
              <Edit className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem onClick={() => onDuplicate(course)}>
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTogglePublish(course)}>
                  {course.is_published ? (
                    <><EyeOff className="w-4 h-4 mr-2" /> Unpublish</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-2" /> Publish</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => onDelete(course)}
                  className="text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

const defaultForm = {
  title: "",
  description: "",
  difficulty: "beginner",
  duration_hours: 1,
  category: "fundamentals",
  prerequisites: [],
  learning_outcomes: [],
  instructor: "",
  cover_image: "",
  is_published: false,
};

export default function ManageCourses() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ ...defaultForm });

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const loadCourses = useCallback(async () => {
    try {
      const coursesData = await Course.list();
      setCourses(coursesData);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filterCourses = useCallback(() => {
    let filtered = [...courses];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.title || "").toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter === "published") {
      filtered = filtered.filter((c) => c.is_published);
    } else if (statusFilter === "draft") {
      filtered = filtered.filter((c) => !c.is_published);
    }
    if (difficultyFilter !== "all") {
      filtered = filtered.filter((c) => c.difficulty === difficultyFilter);
    }
    setFilteredCourses(filtered);
  }, [courses, searchTerm, statusFilter, difficultyFilter]);

  useEffect(() => { loadCourses(); }, [loadCourses]);
  useEffect(() => { filterCourses(); }, [filterCourses]);

  const resetForm = () => {
    setCourseForm({ ...defaultForm });
    setEditingCourse(null);
    setDialogOpen(false);
  };

  const handleEdit = (course) => {
    setCourseForm({ ...course });
    setEditingCourse(course);
    setDialogOpen(true);
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        if (editingCourse) {
          await Course.update(editingCourse.id, courseForm);
          toast.success(`"${courseForm.title}" has been updated.`);
        } else {
          await Course.create(courseForm);
          toast.success(
            `"${courseForm.title}" has been created${courseForm.is_published ? " and published" : " as a draft"}.`
          );
        }
        resetForm();
        loadCourses();
      } catch (error) {
        console.error("Error saving course:", error);
        toast.error("Failed to save course. Please try again.");
      }
    },
    [editingCourse, courseForm, loadCourses]
  );

  const handleDeleteClick = useCallback((course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!courseToDelete) return;
    try {
      await Course.delete(courseToDelete.id);
      toast.success(`"${courseToDelete.title}" has been deleted.`);
      loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course. Please try again.");
    } finally {
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  }, [courseToDelete, loadCourses]);

  const togglePublished = useCallback(
    async (course) => {
      try {
        const newStatus = !course.is_published;
        await Course.update(course.id, { ...course, is_published: newStatus });
        toast.success(
          `"${course.title}" is now ${newStatus ? "visible to learners" : "a draft"}.`
        );
        loadCourses();
      } catch (error) {
        console.error("Error updating course status:", error);
        toast.error("Failed to update course status.");
      }
    },
    [loadCourses]
  );

  const duplicateCourse = useCallback(
    async (course) => {
      try {
        const dup = { ...course, title: `${course.title} (Copy)`, is_published: false };
        delete dup.id;
        delete dup.created_date;
        delete dup.updated_date;
        delete dup.created_by;
        await Course.create(dup);
        toast.success(`Created a copy of "${course.title}" as a draft.`);
        loadCourses();
      } catch (error) {
        console.error("Error duplicating course:", error);
        toast.error("Failed to duplicate course.");
      }
    },
    [loadCourses]
  );

  // Stats
  const totalCourses = courses.length;
  const publishedCount = courses.filter((c) => c.is_published).length;
  const draftCount = courses.filter((c) => !c.is_published).length;
  const categoryCount = new Set(courses.map((c) => c.category).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="w-full px-4 lg:px-6 py-4 space-y-6">
          <div className="h-10 w-48 bg-zinc-800/50 animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-20 bg-zinc-800/50 animate-pulse rounded-xl" />
              ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-52 bg-zinc-800/50 animate-pulse rounded-xl" />
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-6">
        {/* Header */}
        <PageHeader
          title="Manage Courses"
          subtitle="Create, edit, and manage your course catalog"
          color="teal"
          actions={
            <Button
              onClick={() => {
                setCourseForm({ ...defaultForm });
                setEditingCourse(null);
                setDialogOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-500 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Course
            </Button>
          }
        />

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: BookOpen, value: totalCourses, label: "Total Courses" },
            { icon: Eye, value: publishedCount, label: "Published" },
            { icon: EyeOff, value: draftCount, label: "Drafts" },
            { icon: FolderOpen, value: categoryCount, label: "Categories" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={itemVariants}>
              <GlassCard className="p-3" hover={false} animated={false}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-zinc-500">{stat.label}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all">All Difficulty</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">{filteredCourses.length} courses</p>
        </div>

        {/* Course grid or empty state */}
        {filteredCourses.length === 0 ? (
          <GlassCard className="py-12 text-center" hover={false} animated={false}>
            <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">No courses found</h3>
            <p className="text-xs text-zinc-500 mb-4">
              {searchTerm || statusFilter !== "all" || difficultyFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first course"}
            </p>
            {!searchTerm && statusFilter === "all" && difficultyFilter === "all" && (
              <Button
                onClick={() => {
                  setCourseForm({ ...defaultForm });
                  setEditingCourse(null);
                  setDialogOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Create First Course
              </Button>
            )}
          </GlassCard>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredCourses.map((course) => (
              <CourseManageCard
                key={course.id}
                course={course}
                onEdit={handleEdit}
                onDuplicate={duplicateCourse}
                onTogglePublish={togglePublished}
                onDelete={handleDeleteClick}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCourse ? "Edit Course" : "Create New Course"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Course Title *</label>
                <Input
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Instructor</label>
                <Input
                  value={courseForm.instructor}
                  onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Difficulty</label>
                <Select
                  value={courseForm.difficulty}
                  onValueChange={(v) => setCourseForm({ ...courseForm, difficulty: v })}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Duration (hours)</label>
                <Input
                  type="number"
                  min="1"
                  value={courseForm.duration_hours}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, duration_hours: parseInt(e.target.value) || 1 })
                  }
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Category</label>
                <Select
                  value={courseForm.category}
                  onValueChange={(v) => setCourseForm({ ...courseForm, category: v })}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Cover Image URL</label>
                <Input
                  value={courseForm.cover_image}
                  onChange={(e) => setCourseForm({ ...courseForm, cover_image: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Description *</label>
              <Textarea
                required
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500 h-20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Prerequisites (one per line)</label>
                <Textarea
                  value={(courseForm.prerequisites || []).join("\n")}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      prerequisites: e.target.value.split("\n").filter((p) => p.trim()),
                    })
                  }
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500 h-16"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Learning Outcomes (one per line)</label>
                <Textarea
                  value={(courseForm.learning_outcomes || []).join("\n")}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      learning_outcomes: e.target.value.split("\n").filter((o) => o.trim()),
                    })
                  }
                  className="bg-zinc-800/50 border-zinc-700 text-white focus:border-teal-500 h-16"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={courseForm.is_published}
                onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="published" className="text-xs text-zinc-400">
                Publish course immediately
              </label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white">
                <Save className="w-4 h-4 mr-1.5" />
                {editingCourse ? "Update Course" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setCourseToDelete(null);
        }}
        title="Delete Course"
        description={
          courseToDelete
            ? `Are you sure you want to delete "${courseToDelete.title}"? This action cannot be undone and will remove all associated modules and lessons.`
            : ""
        }
        confirmLabel="Delete Course"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
}
