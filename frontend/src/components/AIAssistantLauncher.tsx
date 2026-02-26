"use client";

import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import AIAssistant from "./AIAssistant";
import { useAuth } from "./AuthProvider";

export default function AIAssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-xl hover:shadow-2xl flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
          title="AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </div>

      {/* AI Assistant Panel/Modal */}
      <AIAssistant
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userRole={user.role}
      />
    </>
  );
}
