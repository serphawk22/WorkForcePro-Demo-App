"use client";

import React, { useState } from "react";
import { X, Send, Sparkles, TrendingUp, Users, AlertCircle, BarChart3 } from "lucide-react";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "admin" | "employee";
}

export default function AIAssistant({ isOpen, onClose, userRole }: AIAssistantProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: userRole === "admin"
        ? "Hello! I'm your AI workforce assistant. I can help you analyze team performance, generate reports, and provide insights on productivity trends."
        : "Hi! I'm here to help you with your tasks, deadlines, and productivity tips. How can I assist you today?",
    },
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, { role: "user", content: message }]);
    setMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm processing your request. This is a demo response. In production, this would connect to your AI backend.",
        },
      ]);
    }, 1000);
  };

  const quickActions = userRole === "admin"
    ? [
        { icon: <BarChart3 size={16} />, label: "Generate Payroll", subtitle: "Summary report", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
        { icon: <AlertCircle size={16} />, label: "Low Attendance", subtitle: "Alert employees", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
        { icon: <TrendingUp size={16} />, label: "Dept Performance", subtitle: "View analytics", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
      ]
    : [
        { icon: <BarChart3 size={16} />, label: "My Task Summary", subtitle: "View progress", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
        { icon: <AlertCircle size={16} />, label: "Upcoming Deadlines", subtitle: "Check tasks", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
        { icon: <TrendingUp size={16} />, label: "Productivity Tips", subtitle: "Get insights", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
      ];

  const handleQuickAction = (label: string) => {
    setMessages([
      ...messages,
      { role: "user", content: label },
      {
        role: "assistant",
        content: `I'm analyzing ${label.toLowerCase()}. This feature will provide detailed insights in the full version.`,
      },
    ]);
  };

  if (!isOpen) return null;

  // Admin: Centered Modal
  if (userRole === "admin") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200">
        <div className="w-[440px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">AI Assistant</h3>
              <p className="text-purple-100 text-sm">Intelligent workforce insights</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-purple-200 hover:text-white transition-colors rounded-lg p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Welcome Message */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-purple-100">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-purple-100">
              <p className="text-gray-700 text-sm">
                <span className="text-lg mr-2">👋</span>
                Hi! I&apos;m your AI assistant. How can I help you today?
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 max-h-48 min-h-[100px]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.label)}
                  className="w-full p-3 text-left rounded-lg bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${action.bg}`}>
                      <div className={action.color}>
                        {action.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm group-hover:text-purple-700 transition-colors">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-purple-600 transition-colors">
                        {action.subtitle}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask AI anything..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:border-purple-500 bg-gray-50 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
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

  // Employee: Right Slide Panel
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col animate-in slide-in-from-right duration-300`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">AI Assistant</h2>
            <p className="text-purple-100 text-xs mt-1">Your productivity companion</p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition-colors rounded-lg p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Welcome Message */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-purple-100">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-purple-100">
            <p className="text-gray-700 text-sm">
              <span className="text-lg mr-2">👋</span>
              Hi! I&apos;m here to help boost your productivity. What can I do for you?
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-48 min-h-[100px]">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="px-4 pb-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
          <div className="space-y-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.label)}
                className="w-full p-3 text-left rounded-lg bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${action.bg}`}>
                    <div className={action.color}>
                      {action.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm group-hover:text-purple-700 transition-colors">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500 group-hover:text-purple-600 transition-colors">
                      {action.subtitle}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask AI anything..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:border-purple-500 bg-gray-50 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
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
