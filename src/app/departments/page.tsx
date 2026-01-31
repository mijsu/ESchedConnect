'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Department, Program } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Building2, Plus, Pencil, Trash2, Users, BookOpen } from 'lucide-react';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [professors, setProfessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      fetchDepartments();
      fetchPrograms();
    }
  }, [mounted, user]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const [departmentsRes, programsRes, professorsRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/programs'),
        fetch('/api/professors')
      ]);

      const departmentsData = await departmentsRes.json();
      const programsData = await programsRes.json();
      const professorsData = await professorsRes.json();

      setDepartments(departmentsData.departments || []);
      setPrograms(programsData.programs || []);
      setProfessors(professorsData.professors || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch departments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs');
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    setFormData({ name: '', code: '', description: '' });
    setDialogOpen(true);
  };

  const openEditModal = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || ''
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (department: Department) => {
    setDeletingDepartment(department);
    setDeleteDialogOpen(true);
  };

  const saveDepartment = async () => {
    if (!formData.name || !formData.code) {
      toast({
        title: 'Validation Error',
        description: 'Name and code are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingDepartment) {
        // Update existing department
        const res = await fetch('/api/departments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDepartment.id,
            ...formData
          }),
        });

        if (res.ok) {
          setDepartments(prev =>
            prev.map(dept =>
              dept.id === editingDepartment.id
                ? { ...dept, ...formData }
                : dept
            )
          );
          toast({
            title: 'Success',
            description: 'Department updated successfully',
          });
        }
      } else {
        // Create new department
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (data.department) {
          setDepartments(prev => [...prev, data.department]);
          toast({
            title: 'Success',
            description: 'Department created successfully',
          });
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving department:', error);
      toast({
        title: 'Error',
        description: 'Failed to save department',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!deletingDepartment) return;

    try {
      const res = await fetch(`/api/departments?id=${deletingDepartment.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDepartments(prev =>
          prev.filter(dept => dept.id !== deletingDepartment.id)
        );
        toast({
          title: 'Success',
          description: 'Department deleted successfully',
        });
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete department',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingDepartment(null);
    }
  };

  const getDepartmentPrograms = (departmentId: string) => {
    return programs.filter(p => p.departmentId === departmentId);
  };

  const getDepartmentProfessors = (departmentId: string) => {
    // Filter professors who are assigned to this department
    return professors.filter(prof =>
      prof.departmentIds && prof.departmentIds.includes(departmentId)
    );
  };

  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <div className="h-8 w-48 sm:w-64 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 sm:w-48 bg-slate-200 rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6">
        {/* Departments Grid Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Academic Departments
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Manage academic departments and their assigned programs and professors
          </p>
        </div>

        {/* Create Department Button */}
        {user?.role === 'admin' && (
          <Button
            onClick={openCreateModal}
            className="mb-6 sm:mb-8 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Department
          </Button>
        )}

        {/* Departments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
                <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <Alert className="border-emerald-200 bg-emerald-50">
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              No departments found. Create your first academic department to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {departments.map((department) => {
              const deptPrograms = getDepartmentPrograms(department.id);
              const profCount = getDepartmentProfessors(department.id).length;

              return (
                <div
                  key={department.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-lg hover:z-10 transition-all duration-200 relative"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                        {department.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {department.code}
                      </Badge>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(department)}
                          className="h-8 w-8 text-slate-600 hover:text-emerald-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(department)}
                          className="h-8 w-8 text-slate-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {department.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {department.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    {/* Programs Count */}
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">
                          {deptPrograms.length} {deptPrograms.length === 1 ? 'Program' : 'Programs'}
                        </div>
                        <div className="text-xs text-slate-600">
                          {deptPrograms.length > 0
                            ? deptPrograms.map(p => p.name).join(', ')
                            : 'No programs assigned yet'}
                        </div>
                      </div>
                    </div>

                    {/* Professors Count */}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <div className="text-sm font-semibold text-slate-900">
                        {profCount} {profCount === 1 ? 'Professor' : 'Professors'} Assigned
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Edit Department' : 'Create Department'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? 'Update department information'
                : 'Create a new academic department'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-hidden">
            <div>
              <Label htmlFor="code">Department Code *</Label>
              <Input
                id="code"
                placeholder="e.g., IICT, IBOA"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="uppercase truncate"
                maxLength={10}
              />
            </div>

            <div>
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Institute of Information and Communication Technology"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="truncate"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the department..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                maxLength={500}
                className="resize-none overflow-y-auto"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveDepartment}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              {editingDepartment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingDepartment?.name}&quot;?
              This action cannot be undone and may affect assigned programs and professors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
