'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScheduleItem, DAYS, TIME_MAP, SLOT_HEIGHT, HEADER_HEIGHT, ScheduleFilter } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Lock, Check, AlertCircle, Sparkles, Filter, Calendar, Clock, AlertTriangle, Search } from 'lucide-react';
import { formatSemester, formatYear } from '@/lib/utils';

export default function SchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<ScheduleFilter>('master');
  const [filterValue, setFilterValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<{ academicYear: string; currentSemester: number } | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect professors away from admin dashboard
  useEffect(() => {
    if (mounted && user && user.role === 'professor') {
      router.push('/my-schedule');
    }
  }, [mounted, user, router]);

  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    sections: { id: string; name: string }[];
    professors: { id: string; name: string }[];
    years: number[];
  }>({
    sections: [],
    professors: [],
    years: [],
  });

  // Form state
  const [formData, setFormData] = useState({
    day: '',
    startSlot: 0,
    duration: 1,
    professorId: '',
  });
  const [validation, setValidation] = useState({ valid: false, message: '' });

  const containerRef = useRef<HTMLDivElement>(null);

  // Update time every second
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Fetch schedule, filter options, and settings on mount
  useEffect(() => {
    if (mounted && user) {
      fetchSchedule();
      fetchFilterOptions();
      fetchSettings();
    }
  }, [user, mounted, filterType, filterValue]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings({
          academicYear: data.settings.academicYear,
          currentSemester: data.settings.currentSemester
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch sections
      const sectionsRes = await fetch('/api/programs');
      const sectionsData = await sectionsRes.json();
      
      // Fetch professors
      const profRes = await fetch('/api/professors');
      const profData = await profRes.json();

      // Get unique years from sections
      const uniqueYears = [...new Set(sectionsData.sections?.map((s: any) => s.year) || [])].sort((a, b) => a - b);

      setFilterOptions({
        sections: sectionsData.sections?.map((s: any) => ({ id: s.id, name: s.sectionName })) || [],
        professors: profData.professors?.map((p: any) => ({ id: p.id, name: p.name })) || [],
        years: uniqueYears,
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      let url = '/api/schedule';

      // Add filter parameters
      if (filterType !== 'master' && filterValue) {
        const params = new URLSearchParams();
        params.append('type', filterType);
        if (filterType === 'section') params.append('sectionId', filterValue);
        if (filterType === 'professor') params.append('professorId', filterValue);
        if (filterType === 'year') params.append('year', filterValue);
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setSchedule(data.schedule || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: settings?.academicYear || '2024-2025',
          semester: settings?.currentSemester || 1
        }),
      });

      const data = await res.json();

      if (data.schedule) {
        setSchedule(data.schedule);
        toast({
          title: 'Schedule Generated',
          description: `Successfully generated ${data.schedule.length} schedule items.`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate schedule',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowGenerateConfirm(false);
    }
  };

  const handleGenerateClick = () => {
    setShowGenerateConfirm(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormData({
      day: item.day,
      startSlot: item.startSlot,
      duration: item.duration,
      professorId: item.professorId,
    });
    setValidation({ valid: true, message: 'Slot is available' });
    setDialogOpen(true);
  };

  const saveChanges = async () => {
    if (!editingItem || !validation.valid) return;

    try {
      const res = await fetch(`/api/schedule/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.valid) {
        setSchedule((prev) =>
          prev.map((item) => (item.id === editingItem.id ? data.item : item))
        );
        setDialogOpen(false);
        toast({
          title: 'Success',
          description: 'Changes saved successfully',
        });
      } else {
        setValidation({ valid: false, message: data.error || 'Failed to save' });
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    }
  };

  const getGridMetrics = () => {
    return { slotH: SLOT_HEIGHT, headerH: HEADER_HEIGHT };
  };

  // Filter schedule by search query
  const visibleItems = searchQuery
    ? schedule.filter((item) =>
        item.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.professorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sectionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.day.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : schedule;

  // Don't render until mounted on client to prevent hydration mismatch
  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
            <div className="w-full sm:w-auto">
              <div className="h-8 w-48 sm:w-64 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-32 sm:w-48 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-10 w-28 sm:w-32 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-[400px] sm:h-[565px] bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Fixed Mobile Header with Filters and Date/Time */}
      <div className="fixed top-[64px] left-0 right-0 lg:hidden z-[99] bg-white/95 backdrop-blur-xl border-b border-emerald-200/50 shadow-sm px-2 sm:px-3 py-2">
        <div className="flex flex-row justify-between items-center gap-1.5">
          {/* Left Section: Filters and Generate Button */}
          <div className="flex flex-row items-center gap-1 flex-1 min-w-0">
            {user?.role === 'admin' && (
              <>
                <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md border border-emerald-200/50 rounded-lg p-0.5 flex-shrink-0 shadow-sm">
                  <Filter className="w-3 h-3 text-emerald-600 ml-1 flex-shrink-0" />
                  <Select value={filterType} onValueChange={(v: ScheduleFilter) => setFilterType(v)}>
                    <SelectTrigger className="w-[50px] border-0 bg-transparent focus:ring-0 h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[150]">
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="section">Section</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                  {filterType !== 'master' && (
                    <Select value={filterValue} onValueChange={setFilterValue}>
                      <SelectTrigger className="w-[55px] border-0 bg-transparent focus:ring-0 h-7 text-[10px]">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="z-[150]">
                        {filterType === 'section' && filterOptions.sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                        {filterType === 'professor' && filterOptions.professors.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                        {filterType === 'year' && filterOptions.years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {formatYear(year)}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    onClick={handleGenerateClick}
                    disabled={loading}
                    className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold h-7 px-1.5 text-[10px] flex-shrink-0 backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200"
                  >
                    <Sparkles className="w-3 h-3 mr-0.5" />
                    <span>Generate</span>
                  </Button>
                </>
              )}
          </div>

          {/* Compact Search Bar */}
          <div className="relative flex-1 max-w-[100px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-[10px] bg-white/60 backdrop-blur-md border border-emerald-200/50 focus:border-emerald-400 w-full"
            />
          </div>

          {/* Right Section: Date, Time, and Semester */}
          {mounted && (
            <div className="flex flex-col items-end gap-1">
              {/* Semester Info - Separate Container */}
              <div className="bg-white/60 backdrop-blur-md border border-emerald-200/50 rounded-lg px-2 py-1 shadow-sm">
                <div className="text-[11px] font-semibold text-emerald-700 leading-tight">
                  SY {settings?.academicYear || '2024-2025'} - {settings?.currentSemester ? formatSemester(settings.currentSemester) : formatSemester(1)}
                </div>
              </div>
              {/* Date and Time - Separate Container */}
              <div className="flex flex-row items-center gap-1 bg-white/60 backdrop-blur-md border border-emerald-200/50 rounded-lg px-2 py-0.5 shadow-sm">
                <div className="flex items-center gap-0.5 text-emerald-700">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[10px] font-medium">
                    {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="w-px h-3.5 bg-emerald-200/50"></div>
                <div className="flex items-center gap-0.5 text-emerald-700">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[10px] font-medium">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 pt-4 lg:pt-6 lg:pt-8 mt-[72px] lg:mt-0">
        {/* Desktop Only Sticky Header */}
        <div className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur-xl -mx-8 px-8 py-3 mb-4 border-b border-emerald-200/50 shadow-sm">
          <div className="flex flex-row justify-between items-center gap-3">
            {/* Left Section: Filters and Generate Button */}
            <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
              {user?.role === 'admin' && (
                <>
                  <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-emerald-200/50 rounded-lg p-1 flex-shrink-0 shadow-sm">
                    <Filter className="w-4 h-4 text-emerald-600 ml-1 flex-shrink-0" />
                    <Select value={filterType} onValueChange={(v: ScheduleFilter) => setFilterType(v)}>
                      <SelectTrigger className="w-[120px] border-0 bg-transparent focus:ring-0 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[150]">
                        <SelectItem value="master">Master</SelectItem>
                        <SelectItem value="section">Section</SelectItem>
                        <SelectItem value="professor">Professor</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {filterType !== 'master' && (
                      <Select value={filterValue} onValueChange={setFilterValue}>
                        <SelectTrigger className="w-[130px] border-0 bg-transparent focus:ring-0 h-8 text-xs">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="z-[150]">
                          {filterType === 'section' && filterOptions.sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))}
                          {filterType === 'professor' && filterOptions.professors.map((prof) => (
                            <SelectItem key={prof.id} value={prof.id}>
                              {prof.name}
                            </SelectItem>
                          ))}
                          {filterType === 'year' && filterOptions.years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {formatYear(year)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    onClick={handleGenerateClick}
                    className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold h-8 px-3 text-xs flex-shrink-0 backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200"
                    disabled={loading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span>Generate</span>
                  </Button>
                </>
              )}
            </div>

            {/* Middle Section: Current Semester and Search */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              <span className="text-sm font-medium text-slate-600">
                SY {settings?.academicYear || '2024-2025'} - {settings?.currentSemester ? formatSemester(settings.currentSemester) : formatSemester(1)}
              </span>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search schedule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 text-xs bg-white/60 backdrop-blur-md border border-emerald-200/50 focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Right Section: Date and Time */}
            {mounted && (
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div className="flex flex-row items-center gap-3 bg-white/60 backdrop-blur-md border border-emerald-200/50 rounded-lg px-3 py-1.5 shadow-sm">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">
                      {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-emerald-200/50"></div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="flex gap-0 -mx-4 sm:mx-0">
          {/* Fixed Time Column */}
          <div
            className="flex flex-col bg-white border border-slate-200 rounded-l-xl"
            style={{ width: '60px', height: `calc(${HEADER_HEIGHT}px + (15 * ${SLOT_HEIGHT}px))` }}
          >
            {/* Time Header */}
            <div
              className="bg-slate-50 border-b border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              Time
            </div>
            {/* Time Labels */}
            {Array.from({ length: 15 }, (_, i) => i + 1).map((hour) => (
              <div
                key={hour}
                className="bg-white border-b border-dashed border-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium"
                style={{ height: `${SLOT_HEIGHT}px` }}
              >
                {TIME_MAP[hour]}
              </div>
            ))}
          </div>

          {/* Scrollable Days Grid */}
          <div className="flex-1 overflow-x-auto px-4 sm:px-0">
            <div
              ref={containerRef}
              className="bg-white border-r border-t border-b border-slate-200 rounded-r-xl relative overflow-hidden"
              style={{
                height: `calc(${HEADER_HEIGHT}px + (15 * ${SLOT_HEIGHT}px))`,
                minWidth: `${(60 * 5) + 800}px`,
              }}
            >
              {/* Background Grid for Days */}
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gridTemplateRows: `${HEADER_HEIGHT}px repeat(15, ${SLOT_HEIGHT}px)`,
                  minWidth: `${60 * 5}px`,
                }}
              >
                {/* Day Headers */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="bg-slate-50 border-b border-slate-200 border-r border-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {day}
                  </div>
                ))}

                {/* Day Cells */}
                {Array.from({ length: 15 }, (_, i) => i + 1).map((hour) => (
                  <React.Fragment key={hour}>
                    {DAYS.map((day) => (
                      <div
                        key={`${day}-${hour}`}
                        className="bg-white border-r border-slate-100 border-b border-dashed border-slate-100"
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>

              {/* Events Layer */}
              <div className="absolute inset-0 pointer-events-none" style={{ minWidth: '60px' }}>
                {visibleItems.map((item) => {
                  const { slotH, headerH } = getGridMetrics();
                  const containerWidth = containerRef.current?.offsetWidth || 800;
                  const dayWidth = containerWidth / 5;
                  const dayIndex = DAYS.indexOf(item.day);

                  const topPos = headerH + (item.startSlot - 1) * slotH;
                  const heightPos = (item.duration + 1) * slotH;
                  const leftPx = dayIndex * dayWidth;

                  const endTimeSlot = item.startSlot + item.duration;
                  const timeStr = `${TIME_MAP[item.startSlot]} - ${TIME_MAP[endTimeSlot]}`;

                  const isLecture = item.type === 'lecture';

                  return (
                    <div
                      key={item.id}
                      className={`absolute p-1 rounded-md text-xs cursor-pointer transition-all duration-150 pointer-events-auto z-10 select-none ${
                        isLecture
                          ? 'bg-indigo-50 border-l-4 border-indigo-600'
                          : 'bg-pink-50 border-l-4 border-pink-600'
                      } ${user?.role === 'professor' ? 'opacity-70' : 'hover:shadow-lg hover:scale-[1.005] hover:-translate-y-0.5 hover:!z-20 active:shadow-lg active:scale-[1.005] active:-translate-y-0.5 active:!z-20'}`}
                      style={{
                        top: `${topPos}px`,
                        height: `${heightPos}px`,
                        left: `${leftPx}px`,
                        width: `${dayWidth - 10}px`,
                      }}
                      onClick={() => user?.role === 'admin' && openEditModal(item)}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="font-bold text-slate-900 text-[0.75rem] truncate leading-tight">
                          {item.subjectCode} - {item.subjectName}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0 text-[0.65rem] text-slate-600 leading-tight">
                        <span>{item.sectionName}</span>
                        <span>{item.professorName}</span>
                        <span>{timeStr}</span>
                      </div>
                      {user?.role === 'professor' && (
                        <Badge variant="secondary" className="mt-0.5 text-[0.55rem] py-0 px-1 h-4">
                          <Lock className="w-2 h-2 mr-0.5" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="z-[9999] sm:max-w-[450px] max-w-[95vw] bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            {editingItem && (
              <div className="space-y-1 mt-1.5">
                <div className="font-medium text-slate-900">
                  {editingItem.subjectCode} - {editingItem.subjectName}
                </div>
                <div className="text-sm text-slate-500">
                  Section: {editingItem.sectionName}
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day">Day</Label>
                <Select
                  value={formData.day}
                  onValueChange={(value) => setFormData({ ...formData, day: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startSlot">Start Time</Label>
                <Select
                  value={formData.startSlot.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, startSlot: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {TIME_MAP[hour]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, duration: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} Hour{d > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <Alert
              variant={validation.valid ? 'default' : 'destructive'}
              className={validation.valid ? 'bg-green-50 border-green-200' : ''}
            >
              {validation.valid ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription className={validation.valid ? 'text-green-700' : ''}>
                {validation.message}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveChanges}
              disabled={!validation.valid}
              className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Schedule Confirmation Dialog */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent className="z-[9999] bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate New Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new schedule for all sections. Any existing schedule data will be overwritten.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/60 backdrop-blur-md border border-emerald-200/50 hover:bg-white/80">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generateSchedule} className="bg-gradient-to-r from-yellow-400/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-600 text-emerald-900 font-semibold backdrop-blur-md border border-yellow-300/50 shadow-lg shadow-yellow-500/20 transition-all duration-200">
              Generate Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
