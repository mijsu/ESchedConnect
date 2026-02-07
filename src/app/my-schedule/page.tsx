'use client';

import React, { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScheduleItem, DAYS, TIME_MAP, SLOT_HEIGHT, HEADER_HEIGHT, MAX_START_SLOT } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Check, AlertCircle, Calendar, Clock, Loader2, Search } from 'lucide-react';
import { formatYear, formatSemester } from '@/lib/utils';

export default function MySchedulePage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [viewingItem, setViewingItem] = useState<ScheduleItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<{ academicYear: string; currentSemester: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [user, mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    fetchSettings();
    fetchSchedule();
  }, [mounted, user]);

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

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schedule?type=professor&professorId=${user?.id}`);
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

  const openViewModal = (item: ScheduleItem) => {
    setViewingItem(item);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Fixed Mobile Header with Filters and Date/Time */}
      <div className="fixed top-[64px] left-0 right-0 lg:hidden z-[99] bg-white/95 backdrop-blur-xl border-b border-emerald-200/50 shadow-sm px-2 sm:px-3 py-2">
        <div className="flex flex-row justify-between items-center gap-1.5">
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

          {mounted && (
            <div className="flex flex-col items-end gap-1">
              {/* Semester Info - Separate Container */}
              <div className="bg-white/60 backdrop-blur-md border-emerald-200/50 rounded-lg px-2 py-1 shadow-sm">
                <div className="text-[11px] font-semibold text-emerald-700 leading-tight">
                  SY {settings?.academicYear || '2024-2025'} - {settings?.currentSemester ? formatSemester(settings.currentSemester) : formatSemester(1)}
                </div>
              </div>
              {/* Date and Time - Separate Container */}
              <div className="flex flex-row items-center gap-1.5 bg-white/60 backdrop-blur-md border-emerald-200/50 rounded-lg px-2 py-0.5 shadow-sm">
                <div className="flex items-center gap-0.5 text-emerald-700">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[10px] font-medium">
                    {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="w-px h-3.5 bg-emerald-200 rounded-full"></div>
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
            <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-600">
                My Teaching Schedule
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-center">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search schedule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 text-sm bg-white/60 backdrop-blur-md border-emerald-200/50 focus:border-emerald-400 w-full"
                />
              </div>
            </div>

            {mounted && (
              <div className="flex flex-col items-end gap-2">
                {/* Semester Info - Separate Container */}
                <div className="bg-white/60 backdrop-blur-md border-emerald-200/50 rounded-lg px-3 py-1 shadow-sm">
                  <div className="text-xs font-semibold text-emerald-700 leading-tight">
                    SY {settings?.academicYear || '2024-2025'} - {settings?.currentSemester ? formatSemester(settings.currentSemester) : formatSemester(1)}
                  </div>
                  </div>
                  {/* Date and Time - Separate Container */}
                  <div className="flex flex-row items-center gap-2 bg-white/60 backdrop-blur-md border-emerald-200/50 rounded-lg px-3 py-0.5 shadow-sm">
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-medium">
                        {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-emerald-200 rounded-full"></div>
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

              {/* Events Layer - Grouped by Subject Code */}
              <div className="absolute inset-0 pointer-events-none" style={{ minWidth: '60px' }}>
                {schedule.length === 0 && !loading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <p className="text-sm text-slate-600 mb-2">No schedule items found</p>
                      <p className="text-xs text-slate-500">
                        Try adjusting filters or contact administrator
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Group schedule items by subject code */}
              {Array.from({ length: 15 }, (_, i) => i + 1).map((hour) => {
                const itemsAtSlot = schedule.filter((item) =>
                  item.day === DAYS[hour - 1] &&
                  item.startSlot === (hour + 1) // Adjusted: Slot 1 starts at 7AM
                );

                return (
                  <React.Fragment key={hour}>
                    {itemsAtSlot.length > 0 && itemsAtSlot.every(item => item.day === DAYS[hour - 1] && item.startSlot === (hour + 1)) && (
                      <div
                        key={hour}
                        className={`border-b border-dashed border-r border-slate-100`}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                      >
                        {itemsAtSlot.map((item) => {
                          const containerWidth = containerRef.current?.offsetWidth || 800;
                          const dayWidth = containerWidth / 5;
                          const topPos = HEADER_HEIGHT + (item.startSlot - 1) * SLOT_HEIGHT;
                          const heightPos = (item.duration + 1) * SLOT_HEIGHT;
                          const leftPx = item.dayIndex * dayWidth;
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
                              } hover:shadow-lg hover:scale-[1.005] hover:-translate-y-0.5 hover:!z-20 active:shadow-lg active:scale-[1.005] active:-translate-y-0.5 active:!z-20`}
                              style={{
                                top: `${topPos}px`,
                                height: `${heightPos}px`,
                                left: `${leftPx}px`,
                                width: `${dayWidth - 10}px`,
                              }}
                              onClick={() => openViewModal(item)}
                            >
                              <div className="flex justify-between items-start mb-0.5">
                                <span className="font-bold text-slate-900 text-[0.75rem] truncate leading-tight">
                                  {item.subjectCode} - {item.subjectName}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0 text-[0.65rem] text-slate-600 leading-tight">
                                <span>{item.sectionName}</span>
                                <span>{timeStr}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
                    <p className="text-sm text-slate-600 mt-2">Loading schedule...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Details Dialog */}
      {viewingItem && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="z-[9999] bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Details</DialogTitle>
              <DialogDescription>
                View full schedule information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Subject Information */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-4 border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={viewingItem.type === 'lecture' ? 'default' : 'secondary'} 
                    className={viewingItem.type === 'lecture' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-pink-600 hover:bg-pink-700'}
                  >
                    {viewingItem.type === 'lecture' ? 'Lecture' : 'Lab'}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {viewingItem.subjectCode}
                </h3>
                <p className="text-sm text-slate-700">
                  {viewingItem.subjectName}
                </p>

                <div className="grid grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-lg p-2 flex-shrink-0">
                        <Calendar className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Day</p>
                        <p className="text-sm font-semibold text-slate-900">{viewingItem.day}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-lg p-2 flex-shrink-0">
                        <Clock className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Time</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {TIME_MAP[viewingItem.startSlot]} - {TIME_MAP[viewingItem.startSlot + viewingItem.duration]}
                        </p>
                      </div>
                    </div>
                  </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-lg p-2 flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Duration</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {viewingItem.duration} hour{viewingItem.duration > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-lg p-2 flex-shrink-0">
                        <Check className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Section</p>
                        <p className="text-sm font-semibold text-slate-900">{viewingItem.sectionName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {viewingItem.type === 'combined' && viewingItem.lectureHours !== undefined && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-sm text-slate-500 mb-2">
                        <span className="font-semibold text-slate-900">Lecture Hours</span>
                      </p>
                      <p className="text-slate-700">{viewingItem.lectureHours}</p>
                    </div>
                    </div>
                  )}

                {viewingItem.type === 'combined' && viewingItem.labHours !== undefined && (
                  <div className="space-y-2">
                    <div className="bg-slate-50 rounded-lg p-3 border-slate-200">
                      <p className="text-sm text-slate-500 mb-2">
                        <span className="font-semibold text-slate-900">Lab Hours</span>
                      </p>
                      <p className="text-slate-700">{viewingItem.labHours}</p>
                    </div>
                    </div>
                  )}
              </div>
          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => {
                setDialogOpen(false);
                setViewingItem(null);
              }} 
              variant="outline"
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </DashboardLayout>
  );
}
