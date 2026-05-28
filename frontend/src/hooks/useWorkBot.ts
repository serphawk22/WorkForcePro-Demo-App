"use client";

import { useState, useEffect, useCallback } from "react";

export interface Message {
  id: string;
  sender_role: "user" | "assistant";
  content: string;
  intent?: string;
  navigation_url?: string;
  created_at: Date;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useWorkBot(pathname: string, userRole: string, isOpen: boolean) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quickActions, setQuickActions] = useState<Array<{ label: string; action: string }>>([]);

  // Get Auth Headers with JWT Token
  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token || ""}`
    };
  }, []);

  // Fetch past conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/chatbot/conversations", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.status === 401) {
        console.warn("[WorkBot] 401 on conversations – skipping");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        if (data.length > 0 && !activeConvId) {
          setActiveConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, [activeConvId, getAuthHeaders]);

  // Load chat messages inside a conversation session
  const loadMessages = useCallback(async (convId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chatbot/conversations/${convId}/messages`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.status === 401) {
        console.warn("[WorkBot] 401 on messages – skipping");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        const formatted: Message[] = data.map((m: any) => ({
          id: String(m.id),
          sender_role: m.sender_role,
          content: m.content,
          intent: m.intent,
          navigation_url: m.navigation_url,
          created_at: new Date(m.created_at)
        }));
        setMessages(formatted);
      }
    } catch (err) {
      setError("Failed to load chat history.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch page-specific suggestions dynamically
  const fetchPageContext = useCallback(async () => {
    try {
      const response = await fetch("/api/chatbot/context", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ current_page: pathname, user_role: userRole })
      });
      if (response.status === 401) {
        console.warn("[WorkBot] 401 on context – skipping");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setQuickActions(data.quick_actions || []);
      }
    } catch (err) {
      console.error("Failed to load page suggestions", err);
    }
  }, [pathname, userRole, getAuthHeaders]);

  // Start new conversation session
  const startNewChat = async (userName: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/chatbot/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          title: `Chat Session - ${new Date().toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
        })
      });
      if (response.status === 401) {
        setError("Session expired. Please refresh and login again.");
        return null;
      }
      if (response.ok) {
        const newConv = await response.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        setMessages([
          {
            id: "greeting",
            sender_role: "assistant",
            content: `Hi **${userName || "there"}**! I am **WorkBot**, your intelligent workforce assistant. \n\nI can help you:\n* **Clock In/Out** for work\n* Query pending **Tasks** and write task logs\n* Apply for and manage **Leaves**\n* View **Payroll** information\n\nWhat can I do for you today?`,
            created_at: new Date()
          }
        ]);
        return newConv.id;
      }
    } catch (err) {
      setError("Failed to start new chat.");
    } finally {
      setLoading(false);
    }
    return null;
  };

  // Delete chat conversation
  const deleteConversation = async (convId: number) => {
    try {
      const response = await fetch(`/api/chatbot/conversations/${convId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (activeConvId === convId) {
          setMessages([]);
          setActiveConvId(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  // Send message to the active session
  const sendMessage = async (text: string, userName: string) => {
    const query = text.trim();
    if (!query) return;

    let convId = activeConvId;
    if (!convId) {
      convId = await startNewChat(userName);
      if (!convId) return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender_role: "user",
      content: query,
      created_at: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chatbot/conversations/${convId}/messages`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ content: query })
      });

      if (!response.ok) {
        throw new Error("I had trouble communicating with the server. Please try again.");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender_role: "assistant",
        content: data.response_text,
        intent: data.intent,
        navigation_url: data.navigation_url,
        created_at: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      fetchConversations();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to assistant.");
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender_role: "assistant",
          content: "Oops! I encountered an issue processing your request. Please try again in a few seconds.",
          created_at: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Re-run dependencies when floating panel is opened
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchPageContext();
    }
  }, [isOpen, fetchConversations, fetchPageContext]);

  // Load chat items when active conversation switches
  useEffect(() => {
    if (activeConvId && isOpen) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, isOpen, loadMessages]);

  return {
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
    sendMessage,
    fetchConversations,
    fetchPageContext
  };
}
