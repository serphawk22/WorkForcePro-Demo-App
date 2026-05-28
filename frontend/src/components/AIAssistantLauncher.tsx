"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import AIAssistant from "./AIAssistant";
import { useAuth } from "./AuthProvider";
import { Bot, Sparkles, MessageSquare } from "lucide-react";

export default function AIAssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname() || "";

  if (!user) return null;

  return (
    <>
      {/* Premium Floating Bot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 overflow-hidden border-2 bg-gradient-to-tr ${
            isOpen 
              ? "from-rose-500 to-orange-500 border-rose-300 shadow-rose-500/20" 
              : "from-indigo-600 via-purple-600 to-pink-500 border-indigo-300 shadow-indigo-500/20 hover:shadow-indigo-500/40"
          }`}
          title={isOpen ? "Close Assistant" : "Ask WorkBot"}
        >
          {/* Subtle rotating glow ring on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-center justify-center w-full h-full text-white relative">
            {isOpen ? (
              <span className="text-xl font-semibold leading-none transform transition-transform duration-300 rotate-90">✕</span>
            ) : (
              <>
                <Bot className="w-6 h-6 transition-transform duration-300 group-hover:scale-95" />
                <Sparkles className="w-3 h-3 absolute top-2 right-2 text-yellow-300 animate-pulse" />
              </>
            )}
          </div>
          
          {/* Ambient outer pulsing ring */}
          {!isOpen && (
            <div className="absolute -inset-1 bg-indigo-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
          )}
        </button>
      </div>

      {/* AI Assistant Panel/Modal */}
      <AIAssistant
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userRole={user.role}
        pathname={pathname ?? "/"}
      />
    </>
  );
}
