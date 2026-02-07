'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, Plus, Edit2, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Department } from '@/lib/types';

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    professorId: '',
    specialization: '',
    departmentIds: [] as string[],
  });

  useEffect(() => {
    fetchProfessors();
    fetchDepartments();
  }, []);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/professors');
      const data = await res.json();
      setProfessors(data.professors || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch professors',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingProfessor(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      professorId: '',
      specialization: '',
      departmentIds: [] as string[],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (professor: any) => {
    setEditingProfessor(professor);
    setFormData({
      name: professor.name,
      email: professor.email,
      password: '',
      professorId: professor.professorId || '',
      specialization: professor.specialization || '',
      departmentIds: professor.departmentIds || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || formData.name.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email || formData.email.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    // For new professors, password is required
    if (!editingProfessor && (!formData.password || formData.password.trim() === '')) {
      toast({
        title: 'Validation Error',
        description: 'Password is required for new professors',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const method = editingProfessor ? 'PUT' : 'POST';
      const url = editingProfessor ? `/api/professors/${editingProfessor.id}` : '/api/professors';

      console.log('Submitting professor data:', formData);
      console.log('Method:', method);
      console.log('URL:', url);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log('Response:', data);

      if (data.success) {
        toast({
          title: 'Success',
          description: editingProfessor ? 'Professor updated successfully' : 'Professor created successfully',
        });
        setDialogOpen(false);
        fetchProfessors();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save professor',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: 'Error',
        description: 'Failed to save professor',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this professor?')) return;

    try {
      const res = await fetch(`/api/professors/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Professor deleted successfully',
        });
        fetchProfessors();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete professor',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete professor',
        variant: 'destructive',
      });
    }
  };

  // Filter professors based on search query
  const filteredProfessors = professors.filter((professor) => {
    const query = searchQuery.toLowerCase();

    // Get department names for this professor
    const profDepts = professor.departmentIds
      ? professor.departmentIds.map(id => {
          const dept = departments.find(d => d.id === id);
          return dept ? dept.name.toLowerCase() : '';
        }).join(' ')
      : [];

    const matchesQuery =
      professor.name.toLowerCase().includes(query) ||
      professor.email.toLowerCase().includes(query) ||
      (professor.specialization && professor.specialization.toLowerCase().includes(query)) ||
      profDepts.some(deptName => deptName.includes(query));

    return matchesQuery;
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Professors Management</h1>
              <p className="text-slate-600">Manage faculty and instructor accounts</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200">
            <Plus className="w-4 h-4 mr-2" />
            Add Professor
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search professors by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card className="bg-white/60 backdrop-blur-md border border-emerald-200/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-900">All Professors</CardTitle>
            <CardDescription className="text-slate-600">
              {searchQuery ? (
                <>
                  Showing {filteredProfessors.length} of {professors.length} {professors.length === 1 ? 'professor' : 'professors'}
                  {filteredProfessors.length === 0 && ' matching your search'}
                </>
              ) : (
                <>{professors.length} {professors.length === 1 ? 'professor' : 'professors'} in the system</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredProfessors.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>{searchQuery ? 'No professors found matching your search.' : 'No professors yet. Click "Add Professor" to create one.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfessors.map((professor) => (
                  <Card key={professor.id} className="border border-slate-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={professor.avatar} alt={professor.name} />
                          <AvatarFallback>{professor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(professor)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(professor.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-slate-900">{professor.name}</h3>
                        <p className="text-sm text-slate-600">{professor.email}</p>
                        {professor.professorId && (
                          <p className="text-xs text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded">
                            ID: {professor.professorId}
                          </p>
                        )}
                        {professor.specialization && (
                          <p className="text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded">
                            {professor.specialization}
                          </p>
                        )}
                        {professor.departmentIds && professor.departmentIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {professor.departmentIds.map((deptId) => {
                              const dept = departments.find(d => d.id === deptId);
                              return dept ? (
                                <span key={dept.id} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                                  {dept.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl">
            <DialogHeader>
              <DialogTitle>{editingProfessor ? 'Edit Professor' : 'Add New Professor'}</DialogTitle>
              <DialogDescription>
                {editingProfessor ? 'Update the professor details below' : 'Create a new professor account'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Dr. John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="professorId">Professor ID</Label>
                <Input
                  id="professorId"
                  placeholder="e.g., PROF-2024-001"
                  value={formData.professorId}
                  onChange={(e) => setFormData({ ...formData, professorId: e.target.value })}
                />
                <p className="text-xs text-slate-500">Unique identifier for the professor (editable by admin only)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="professor@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-slate-500">Email address (editable by admin only)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password {editingProfessor && '(leave empty to keep current)'}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g., Algorithms & Data Structures"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departments">Departments</Label>
                <Select
                  value={formData.departmentIds[0] || ''}
                  onValueChange={(value) => {
                    // Toggle the department
                    const existingIndex = formData.departmentIds.indexOf(value);
                    if (existingIndex > -1) {
                      // Remove it
                      setFormData({
                        ...formData,
                        departmentIds: formData.departmentIds.filter(id => id !== value)
                      });
                    } else {
                      // Add it
                      setFormData({
                        ...formData,
                        departmentIds: [...formData.departmentIds, value]
                      });
                    }
                  }}
                >
                  <SelectTrigger id="departments">
                    <SelectValue placeholder="Select departments..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingProfessor ? 'Update Professor' : 'Create Professor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
