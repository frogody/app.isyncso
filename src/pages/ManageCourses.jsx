import React, { useState, useEffect, useCallback } from "react";
import { Course, Module, Lesson } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Users,
  Clock,
  Target,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { InvokeLLM } from "@/api/integrations"; // Kept as it's for general LLM use, not strictly video

// Difficulty color configurations for consistent styling
const difficultyConfig = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
};

export default function ManageCourses() {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  // Form state
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    difficulty: "beginner",
    duration_hours: 1,
    category: "fundamentals",
    prerequisites: [],
    learning_outcomes: [],
    instructor: "",
    cover_image: "",
    is_published: false
  });

  const loadCourses = useCallback(async () => {
    try {
      const coursesData = await Course.list();
      setCourses(coursesData);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast({
        title: "Error Loading Courses",
        description: "Failed to load courses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterCourses = useCallback(() => {
    let filtered = [...courses];
    if (searchTerm) {
      filtered = filtered.filter(course =>
        (course.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.category || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter === "published") {
      filtered = filtered.filter(course => course.is_published);
    } else if (statusFilter === "draft") {
      filtered = filtered.filter(course => !course.is_published);
    }
    setFilteredCourses(filtered);
  }, [courses, searchTerm, statusFilter]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    filterCourses();
  }, [filterCourses]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      let savedCourse;

      if (editingCourse) {
        savedCourse = await Course.update(editingCourse.id, courseForm);
        toast({
          title: "Course Updated",
          description: `"${courseForm.title}" has been updated successfully.`
        });
      } else {
        // Create the course with the form's is_published setting
        savedCourse = await Course.create(courseForm);
        toast({
          title: "Course Created",
          description: `"${courseForm.title}" has been created${courseForm.is_published ? ' and published' : ' as a draft'}.`
        });
      }

      resetForm();
      loadCourses();
    } catch (error) {
      console.error("Error saving course:", error);
      toast({
        title: "Error Saving Course",
        description: "Failed to save course. Please try again.",
        variant: "destructive"
      });
    }
  }, [editingCourse, courseForm, loadCourses, toast]);

  const resetForm = () => {
    setCourseForm({
      title: "",
      description: "",
      difficulty: "beginner",
      duration_hours: 1,
      category: "fundamentals",
      prerequisites: [],
      learning_outcomes: [],
      instructor: "",
      cover_image: "",
      is_published: false
    });
    setEditingCourse(null);
    setShowCreateForm(false);
  };

  const handleEdit = (course) => {
    setCourseForm({ ...course });
    setEditingCourse(course);
    setShowCreateForm(true);
  };

  const handleDeleteClick = useCallback((course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!courseToDelete) return;

    try {
      await Course.delete(courseToDelete.id);
      toast({
        title: "Course Deleted",
        description: `"${courseToDelete.title}" has been deleted.`
      });
      loadCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error Deleting Course",
        description: "Failed to delete course. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  }, [courseToDelete, loadCourses, toast]);

  const togglePublished = useCallback(async (course) => {
    try {
      const newStatus = !course.is_published;
      await Course.update(course.id, {
        ...course,
        is_published: newStatus
      });
      toast({
        title: newStatus ? "Course Published" : "Course Unpublished",
        description: `"${course.title}" is now ${newStatus ? 'visible to learners' : 'a draft'}.`
      });
      loadCourses();
    } catch (error) {
      console.error("Error updating course status:", error);
      toast({
        title: "Error Updating Status",
        description: "Failed to update course status. Please try again.",
        variant: "destructive"
      });
    }
  }, [loadCourses, toast]);

  const duplicateCourse = useCallback(async (course) => {
    try {
      const duplicatedCourse = {
        ...course,
        title: `${course.title} (Copy)`,
        is_published: false
      };
      delete duplicatedCourse.id;
      delete duplicatedCourse.created_date;
      delete duplicatedCourse.updated_date;
      delete duplicatedCourse.created_by;

      await Course.create(duplicatedCourse);
      toast({
        title: "Course Duplicated",
        description: `Created a copy of "${course.title}" as a draft.`
      });
      loadCourses();
    } catch (error) {
      console.error("Error duplicating course:", error);
      toast({
        title: "Error Duplicating Course",
        description: "Failed to duplicate course. Please try again.",
        variant: "destructive"
      });
    }
  }, [loadCourses, toast]);

  const categories = [
    { value: "fundamentals", label: "AI Fundamentals" },
    { value: "machine_learning", label: "Machine Learning" },
    { value: "deep_learning", label: "Deep Learning" },
    { value: "nlp", label: "Natural Language Processing" },
    { value: "computer_vision", label: "Computer Vision" },
    { value: "ethics", label: "AI Ethics" },
    { value: "applications", label: "Applications" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-gray-800/50 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white">
              Manage Courses
            </h1>
            <p className="text-xl text-gray-300">
              Create, edit, and manage your course catalog
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="emerald-gradient emerald-gradient-hover"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>

        {/* Manage Courses Section */}
        <Card className="glass-card border-0">
          <Tabs defaultValue="courses">
            <TabsList className="grid w-full grid-cols-1 bg-gray-800/50">
              <TabsTrigger value="courses">Manage Courses</TabsTrigger>
            </TabsList>

            <TabsContent value="courses">
              {/* Search and Filters */}
              <Card className="glass-card border-0 p-6 mt-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-700 text-white"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-gray-800/50 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all" className="text-white">All Courses</SelectItem>
                      <SelectItem value="published" className="text-white">Published</SelectItem>
                      <SelectItem value="draft" className="text-white">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {/* Create/Edit Form */}
              {showCreateForm && (
                <Card className="glass-card border-0 mt-4">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-white">
                        {editingCourse ? 'Edit Course' : 'Create New Course'}
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={resetForm}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Course Title *</label>
                          <Input
                            required
                            value={courseForm.title}
                            onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Instructor</label>
                          <Input
                            value={courseForm.instructor}
                            onChange={(e) => setCourseForm({...courseForm, instructor: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Difficulty</label>
                          <Select value={courseForm.difficulty} onValueChange={(value) => setCourseForm({...courseForm, difficulty: value})}>
                            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="beginner" className="text-white">Beginner</SelectItem>
                              <SelectItem value="intermediate" className="text-white">Intermediate</SelectItem>
                              <SelectItem value="advanced" className="text-white">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Duration (hours)</label>
                          <Input
                            type="number"
                            min="1"
                            value={courseForm.duration_hours}
                            onChange={(e) => setCourseForm({...courseForm, duration_hours: parseInt(e.target.value) || 1})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Category</label>
                          <Select value={courseForm.category} onValueChange={(value) => setCourseForm({...courseForm, category: value})}>
                            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              {categories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value} className="text-white">
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Cover Image URL</label>
                          <Input
                            value={courseForm.cover_image}
                            onChange={(e) => setCourseForm({...courseForm, cover_image: e.target.value})}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description *</label>
                        <Textarea
                          required
                          value={courseForm.description}
                          onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                          className="bg-gray-800/50 border-gray-700 text-white h-24"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Prerequisites (one per line)</label>
                          <Textarea
                            value={courseForm.prerequisites.join('\n')}
                            onChange={(e) => setCourseForm({...courseForm, prerequisites: e.target.value.split('\n').filter(p => p.trim())})}
                            className="bg-gray-800/50 border-gray-700 text-white h-20"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Learning Outcomes (one per line)</label>
                          <Textarea
                            value={courseForm.learning_outcomes.join('\n')}
                            onChange={(e) => setCourseForm({...courseForm, learning_outcomes: e.target.value.split('\n').filter(o => o.trim())})}
                            className="bg-gray-800/50 border-gray-700 text-white h-20"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="published"
                          checked={courseForm.is_published}
                          onChange={(e) => setCourseForm({...courseForm, is_published: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 bg-gray-800 border-gray-700 rounded"
                        />
                        <label htmlFor="published" className="text-sm font-medium text-gray-300">
                          Publish course immediately
                        </label>
                      </div>

                      <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={resetForm} className="border-gray-700 text-gray-300">
                          Cancel
                        </Button>
                        <Button type="submit" className="emerald-gradient emerald-gradient-hover">
                          <Save className="w-4 h-4 mr-2" />
                          {editingCourse ? 'Update Course' : 'Create Course'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Courses List */}
              <Card className="glass-card border-0 mt-4">
                <CardHeader>
                  <CardTitle className="text-white">
                    Courses ({filteredCourses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
                      <p className="text-gray-400 mb-6">
                        {searchTerm || statusFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "Get started by creating your first course"
                        }
                      </p>
                      {!searchTerm && statusFilter === "all" && (
                        <Button onClick={() => setShowCreateForm(true)} className="emerald-gradient emerald-gradient-hover">
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Course
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredCourses.map((course) => (
                        <div key={course.id} className="p-6 rounded-lg bg-gray-800/30 border border-gray-700/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold text-white">{course.title}</h3>
                                <Badge className={course.is_published
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                }>
                                  {course.is_published ? 'Published' : 'Draft'}
                                </Badge>
                                <Badge className={difficultyConfig[course.difficulty] || difficultyConfig.beginner}>
                                  {course.difficulty}
                                </Badge>
                              </div>

                              <p className="text-gray-400 mb-4 line-clamp-2">{course.description}</p>

                              <div className="flex items-center gap-6 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {course.duration_hours}h
                                </div>
                                <div className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  {course.category?.replace(/_/g, ' ')}
                                </div>
                                {course.instructor && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {course.instructor}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => togglePublished(course)}
                                className="border-gray-700 text-gray-300"
                              >
                                {course.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                                  <DropdownMenuItem onClick={() => handleEdit(course)} className="text-white">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateCourse(course)} className="text-white">
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(course)}
                                    className="text-red-400 focus:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setCourseToDelete(null);
        }}
        title="Delete Course"
        description={courseToDelete ? `Are you sure you want to delete "${courseToDelete.title}"? This action cannot be undone and will remove all associated modules and lessons.` : ''}
        confirmText="Delete Course"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
        icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
      />
    </div>
  );
}