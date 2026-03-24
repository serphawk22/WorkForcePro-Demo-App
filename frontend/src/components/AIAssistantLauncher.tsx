"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AIAssistant from "./AIAssistant";
import { useAuth } from "./AuthProvider";

export default function AIAssistantLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <>
      {/* Floating Bot Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group w-16 h-16 rounded-full shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center transition-all duration-500 hover:scale-110 overflow-hidden bg-white dark:bg-gray-900 border-2 border-purple-500/20 hover:border-purple-500/50"
          title="AI Assistant"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Image
            src="/ai-bot-icon.png"
            alt="AI Assistant"
            width={48}
            height={48}
            className="rounded-full object-cover transition-all duration-500 group-hover:rotate-6"
          />
          <div className="absolute -inset-1 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
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
