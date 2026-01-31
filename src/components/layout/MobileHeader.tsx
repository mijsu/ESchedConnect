'use client';

import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export function MobileHeader() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] z-[100] bg-gradient-to-r from-emerald-600/95 to-emerald-700/95 backdrop-blur-xl border-b border-emerald-400/30 shadow-lg will-change-transform mt-0">
      <div className="flex items-center justify-between h-full px-4 pt-0">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20 shadow-lg shrink-0">
            <img src="/logo.png" alt="PTC Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-bold text-lg text-white/95 shrink-0">UniScheduler</span>
        </div>

        {/* User Avatar (Visual Only) */}
        <Avatar className="w-9 h-9 ring-2 ring-white/20 shadow-lg shrink-0">
          <AvatarImage src={user?.avatar} alt={user?.name || ''} />
          <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-emerald-900 font-semibold">
            {mounted && user?.name?.charAt(0) ? (
              user.name.charAt(0)
            ) : (
              <User className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
