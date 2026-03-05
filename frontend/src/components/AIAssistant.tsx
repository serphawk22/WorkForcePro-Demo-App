"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Sparkles, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatAction {
  label: string;
  route: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
}

interface ChatbotResponse {
  reply: string;
  actions: ChatAction[];
  navigate_to?: string | null;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "admin" | "employee";
  pathname: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

async function callChatbot(
  endpoint: "query" | "context",
  message: string,
  current_page: string
): Promise<ChatbotResponse> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/chatbot/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, current_page }),
  });
  if (!res.ok) throw new Error(`Chatbot API error: ${res.status}`);
  return res.json();
}

function formatReply(text: string): React.ReactNode {
  const lines = text.split("\n\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={i > 0 ? "mt-2" : ""}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center space-x-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ─── Action Buttons (inline in messages) ─────────────────────────────────────

function InlineActions({
  actions,
  onNavigate,
}: {
  actions: ChatAction[];
  onNavigate: (route: string) => void;
}) {
  if (!actions?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onNavigate(action.route)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-xs text-gray-800 hover:text-purple-700 transition-all group shadow-sm"
        >
          <span className="font-medium">{action.label}</span>
          <ChevronRight size={12} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
        </button>
      ))}
    </div>
  );
}

// ─── Message List ─────────────────────────────────────────────────────────────

function MessageList({
  messages,
  isTyping,
  onNavigate,
  scrollRef,
}: {
  messages: Message[];
  isTyping: boolean;
  onNavigate: (route: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[120px] max-h-56">
      {messages.map((msg, index) => (
        <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
          <div
            className={`max-w-[85%] rounded-2xl p-3 text-sm ${
              msg.role === "user" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-800"
            }`}
          >
            {msg.role === "assistant" ? formatReply(msg.content) : msg.content}
          </div>
          {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
            <div className="w-full max-w-[85%] mt-1">
              <InlineActions actions={msg.actions} onNavigate={onNavigate} />
            </div>
          )}
        </div>
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIAssistant({
  isOpen,
  onClose,
  userRole,
  pathname,
}: AIAssistantProps) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentActions, setCurrentActions] = useState<ChatAction[]>([]);
  const [contextLoaded, setContextLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages or typing state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load page context when chatbot first opens
  useEffect(() => {
    if (!isOpen || contextLoaded) return;
    let cancelled = false;

    (async () => {
      setIsTyping(true);
      try {
        const data = await callChatbot("context", "", pathname);
        if (cancelled) return;
        setMessages([{ role: "assistant", content: data.reply, actions: data.actions }]);
        setCurrentActions(data.actions);
        setContextLoaded(true);
      } catch {
        if (cancelled) return;
        setMessages([{
          role: "assistant",
          content: "Hi! I can help you navigate this platform. Type a question or use the quick actions below.",
          actions: [],
        }]);
        setContextLoaded(true);
      } finally {
        if (!cancelled) setIsTyping(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, pathname, contextLoaded]);

  // Reload context when pathname changes while chatbot is open
  useEffect(() => {
    if (isOpen && contextLoaded) setContextLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleNavigate = useCallback(
    (route: string) => { router.push(route); onClose(); },
    [router, onClose]
  );

  const handleSendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isTyping) return;

    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setIsTyping(true);

    try {
      const data = await callChatbot("query", trimmed, pathname);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, actions: data.actions }]);
      setCurrentActions(data.actions);
      if (data.navigate_to) {
        setTimeout(() => handleNavigate(data.navigate_to!), 600);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't connect to the assistant right now. Please try again.",
        actions: currentActions,
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [message, isTyping, pathname, currentActions, handleNavigate]);

  if (!isOpen) return null;

  // ── Admin: Centered Modal ──────────────────────────────────────────────────
  if (userRole === "admin") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200">
        <div className="w-[440px] max-h-[640px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles size={18} className="text-purple-200" />
                AI Assistant
              </h3>
              <p className="text-purple-100 text-sm">Intelligent workforce navigator</p>
            </div>
            <button onClick={onClose} className="text-purple-200 hover:text-white transition-colors rounded-lg p-1">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <MessageList messages={messages} isTyping={isTyping} onNavigate={handleNavigate} scrollRef={scrollRef} />

          {/* Quick Navigation */}
          {currentActions.length > 0 && (
            <div className="px-4 pb-2 border-t border-gray-100 pt-3 flex-shrink-0">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Navigation</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {currentActions.slice(0, 4).map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleNavigate(action.route)}
                    className="px-3 py-2 text-left rounded-xl bg-purple-50 border border-purple-200 hover:border-purple-400 hover:bg-purple-100 text-xs text-purple-700 font-medium transition-all truncate"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-100 flex-shrink-0">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder='Ask anything or type "go to payroll"…'
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:border-purple-500 bg-gray-50 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isTyping}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Employee: Right Slide Panel ────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={onClose} />

      {/* Slide Panel */}
      <div className="fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-purple-200" />
              AI Assistant
            </h2>
            <p className="text-purple-100 text-xs mt-1">Your navigation companion</p>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white transition-colors rounded-lg p-1">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <MessageList messages={messages} isTyping={isTyping} onNavigate={handleNavigate} scrollRef={scrollRef} />

        {/* Quick Navigation */}
        {currentActions.length > 0 && (
          <div className="px-4 pb-3 border-t border-gray-100 pt-3 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Navigation</p>
            <div className="space-y-1.5">
              {currentActions.slice(0, 4).map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleNavigate(action.route)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:border-purple-400 hover:bg-purple-100 text-sm text-purple-700 font-medium transition-all group"
                >
                  <span>{action.label}</span>
                  <ChevronRight size={14} className="text-purple-400 group-hover:text-purple-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder='Ask anything or type "go to tasks"…'
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:border-purple-500 bg-gray-50 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isTyping}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

