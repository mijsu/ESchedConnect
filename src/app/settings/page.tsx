'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Settings, Database, Loader2, CheckCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from '@/hooks/use-toast';

interface SystemSettings {
  id: string;
  systemName: string;
  academicYear: string;
  currentSemester: number;
}

export default function SettingsPage() {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  const [formData, setFormData] = useState({
    systemName: '',
    academicYear: '',
    currentSemester: 1,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setFormData({
          systemName: data.settings.systemName,
          academicYear: data.settings.academicYear,
          currentSemester: data.settings.currentSemester,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setSeeded(true);
        setSeedResult(data.data);
        toast({
          title: 'Database Seeded',
          description: `Added ${data.data.subjects} subjects, ${data.data.programs} programs, ${data.data.sections} sections, and ${data.data.professors} professors.`,
        });
      } else if (data.hasData) {
        toast({
          title: 'Database Already Seeded',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to seed database',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
      setShowSeedConfirm(false);
    }
  };

  const handleSeedClick = () => {
    setShowSeedConfirm(true);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setSettings(data.settings);
        toast({
          title: 'Settings Saved',
          description: 'System settings updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
            <p className="text-slate-600">Configure system preferences and manage data</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Seed Database Card */}
          <Card className="bg-white/60 backdrop-blur-md border border-emerald-200/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Database className="w-5 h-5 text-emerald-600" />
                Database Management
              </CardTitle>
              <CardDescription className="text-slate-600">
                Populate the database with sample subjects, programs, sections, and professors for testing the auto-generate schedule feature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    Seed Sample Data
                  </p>
                  <p className="text-xs text-slate-600">
                    This will add sample data to Firestore (20 subjects, 3 programs, 24 sections, 5 professors)
                  </p>
                  {seeded && seedResult && (
                    <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Seeded: {seedResult.subjects} subjects, {seedResult.programs} programs, {seedResult.sections} sections, {seedResult.professors} professors
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSeedClick}
                  disabled={seeding || seeded}
                  className={seeded ? 'bg-emerald-600/90 hover:bg-emerald-700 backdrop-blur-md border border-emerald-400/50 text-white font-semibold' : 'bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200'}
                >
                  {seeding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Seeding...
                    </>
                  ) : seeded ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Seeded Successfully
                    </>
                  ) : (
                    'Seed Database'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Configuration Card */}
          <Card className="bg-white/60 backdrop-blur-md border border-emerald-200/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-900">System Configuration</CardTitle>
              <CardDescription className="text-slate-600">
                Configure global system settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name</Label>
                    <Input
                      id="systemName"
                      placeholder="e.g., UniScheduler"
                      value={formData.systemName}
                      onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academicYear">Academic Year</Label>
                      <Input
                        id="academicYear"
                        placeholder="e.g., 2024-2025"
                        value={formData.academicYear}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentSemester">Current Semester</Label>
                      <Select
                        value={formData.currentSemester.toString()}
                        onValueChange={(value) => setFormData({ ...formData, currentSemester: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">First Semester</SelectItem>
                          <SelectItem value="2">Second Semester</SelectItem>
                          <SelectItem value="3">Summer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seed Database Confirmation Dialog */}
        <AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
          <AlertDialogContent className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Seed Database with Sample Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will add sample data to Firestore including 20 subjects, 3 programs, 24 sections, and 5 professors.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/60 backdrop-blur-md border border-emerald-200/50 hover:bg-white/80">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSeedDatabase} className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200">
                Seed Database
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
