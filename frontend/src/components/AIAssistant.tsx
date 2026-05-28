"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useWorkBot } from "@/hooks/useWorkBot";
import { 
  Loader2, Send, X, Sparkles, MessageSquare, History, 
  Plus, Clock, Trash2 
} from "lucide-react";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  pathname: string;
}

// Custom simple parser for Markdown bold and bullets
function formatMessageText(text: string) {
  if (!text) return "";
  
  // Format bold (**word**) to strong
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Format lists/bullet points (* bullet or - bullet)
  const lines = formatted.split("\n");
  const parsedLines = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      return (
        <li key={idx} className="ml-4 list-disc text-sm my-1 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: trimmed.substring(2) }} />
        </li>
      );
    }
    return (
      <p 
        key={idx} 
        className="text-sm my-1 leading-relaxed min-h-[1rem]" 
        dangerouslySetInnerHTML={{ __html: line }} 
      />
    );
  });
  
  return parsedLines;
}

export default function AIAssistant({
  isOpen,
  onClose,
  userRole,
  pathname,
}: AIAssistantProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Use our dedicated custom state hook
  const {
    conversations,
    activeConvId,
    setActiveConvId,
    messages,
    loading,
    error,
    suggestions,
    quickActions,
    startNewChat,
    deleteConversation,
    sendMessage
  } = useWorkBot(pathname, userRole, isOpen);

  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query) return;

    setInput("");
    const data = await sendMessage(query, user?.name || "there");
    
    // Check if redirection exists in response
    if (data && data.navigation_url) {
      setTimeout(() => {
        router.push(data.navigation_url);
      }, 1800);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleSuggestedActionClick = (action: string) => {
    handleSendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] z-50 rounded-2xl border shadow-2xl bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl flex flex-col transition-all duration-300 ease-out transform animate-in slide-in-from-bottom-5 fade-in duration-200">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-t-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide flex items-center gap-1">
              WorkBot <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">AI</span>
            </h2>
            <p className="text-[10px] text-indigo-100 opacity-90">Online & responsive</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="w-8 h-8 text-white hover:bg-white/10 rounded-lg"
            title="Chat History"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startNewChat(user?.name || "there")}
            className="w-8 h-8 text-white hover:bg-white/10 rounded-lg"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 text-white hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* BODY PANEL */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {showHistory ? (
          /* CONVERSATION HISTORY LIST */
          <div className="absolute inset-0 bg-slate-50 dark:bg-gray-900/50 z-10 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Past Chat Sessions</h3>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => startNewChat(user?.name || "there")}>
                <Plus className="w-3.5 h-3.5" /> Start New
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                  <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs">No active chat sessions found.</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConvId(conv.id);
                        setShowHistory(false);
                      }}
                      className={`group flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 ${
                        activeConvId === conv.id 
                          ? "bg-indigo-50/70 border-indigo-200 dark:bg-slate-800/80 dark:border-indigo-900/50" 
                          : "bg-white border-slate-100 dark:bg-gray-950 dark:border-slate-900"
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs font-medium truncate text-slate-800 dark:text-slate-200">{conv.title}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-opacity duration-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          /* MESSAGE DISPLAY PANEL */
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                  <Sparkles className="w-10 h-10 text-indigo-500 animate-pulse mb-3 opacity-60" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Start conversing with WorkBot</p>
                  <p className="text-xs max-w-xs mt-1 text-slate-500 dark:text-slate-400">
                    Type a message below or click one of the page-aware suggestions below.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.sender_role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                          isUser
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md"
                            : "bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-bl-sm border border-slate-200/50 dark:border-slate-800/50"
                        }`}
                      >
                        {isUser ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="space-y-1">
                            {formatMessageText(message.content)}
                          </div>
                        )}
                        
                        {/* Redirection indicator */}
                        {message.navigation_url && !isUser && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Clock className="w-3.5 h-3.5 animate-spin" /> Redirecting page shortly...
                          </div>
                        )}

                        <span className={`text-[9px] mt-1.5 block text-right opacity-65 ${isUser ? "text-indigo-100" : "text-slate-500"}`}>
                          {message.created_at.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200/50 dark:border-slate-800/50 w-16 flex items-center justify-center">
                    <div className="flex space-x-1 items-center">
                      <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* DYNAMIC SUGGESTIONS AREA */}
      {!showHistory && !loading && suggestions.length > 0 && (
        <div className="px-4 py-2 border-t bg-slate-50/50 dark:bg-gray-900/30 flex flex-wrap gap-1.5 select-none max-h-24 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-[10px] bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-100/30 dark:border-indigo-900/10 cursor-pointer transition-all hover:scale-[1.02]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* ERROR PANEL */}
      {error && (
        <div className="mx-4 my-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-1.5 dark:bg-red-950/30 dark:border-red-900/30 dark:text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" />
          {error}
        </div>
      )}

      {/* INPUT CONTROLS */}
      <div className="p-4 border-t flex gap-2 items-center bg-white dark:bg-gray-950 rounded-b-2xl">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(input);
            }
          }}
          placeholder="Type a message..."
          className="flex-1 h-9 text-xs rounded-xl focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/70"
          disabled={loading}
        />
        <Button
          onClick={() => handleSendMessage(input)}
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-9 h-9 p-0 flex items-center justify-center shrink-0 shadow-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
