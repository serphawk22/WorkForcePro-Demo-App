"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Hash, AtSign, Plus, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import {
  getChannels,
  getChannelMessages,
  sendChannelMessage,
  markChannelRead,
  createChannel,
  getChatSocketUrl,
  ChatChannel,
  ChatMessage,
} from "@/lib/api";

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeIdRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));

  const selectChannel = useCallback(async (channelId: number) => {
    setActiveId(channelId);
    activeIdRef.current = channelId;
    setLoadingMsgs(true);
    const res = await getChannelMessages(channelId);
    setMessages(res.data || []);
    setLoadingMsgs(false);
    scrollToBottom();
    markChannelRead(channelId);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c)));
  }, []);

  const loadChannels = useCallback(async () => {
    const res = await getChannels();
    if (res.data) {
      setChannels(res.data);
      if (activeIdRef.current == null && res.data.length > 0) {
        selectChannel(res.data[0].id);
      }
    }
  }, [selectChannel]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Best-effort WebSocket for live delivery (falls back to REST silently).
  useEffect(() => {
    const url = getChatSocketUrl();
    if (!url) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.message) {
          const msg: ChatMessage = data.message;
          if (msg.channel_id === activeIdRef.current) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            scrollToBottom();
            markChannelRead(msg.channel_id);
          } else {
            setChannels((prev) =>
              prev.map((c) => (c.id === msg.channel_id ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c)),
            );
          }
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onerror = () => ws?.close();
    return () => ws?.close();
  }, []);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || activeId == null) return;
    setText("");
    const res = await sendChannelMessage(activeId, body);
    if (res.data) {
      setMessages((prev) => (prev.some((m) => m.id === res.data!.id) ? prev : [...prev, res.data!]));
      scrollToBottom();
    }
  };

  const handleCreateChannel = async () => {
    const name = window.prompt("New channel name");
    if (!name || !name.trim()) return;
    setCreating(true);
    const res = await createChannel({ name: name.trim() });
    setCreating(false);
    if (res.data) {
      await loadChannels();
      selectChannel(res.data.id);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeId) || null;

  return (
    <ProtectedRoute>
      <DashboardLayout
        role={(user?.role as "admin" | "employee") || "employee"}
        userName={user?.name || "User"}
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
        noPadding
      >
        <div className="flex h-[calc(100dvh-3.5rem)]">
          {/* Channel list */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Channels</h2>
              <button
                type="button"
                onClick={handleCreateChannel}
                disabled={creating}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="New channel"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {channels.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground">No channels yet.</p>
              ) : (
                channels.map((c) => {
                  const isDm = c.channel_type === "direct";
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectChannel(c.id)}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        activeId === c.id
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      {isDm ? <AtSign size={14} className="shrink-0" /> : <Hash size={14} className="shrink-0" />}
                      <span className="flex-1 truncate">{c.name || "Direct message"}</span>
                      {!!c.unread_count && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {c.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Messages */}
          <section className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              {activeChannel?.channel_type === "direct" ? <AtSign size={16} /> : <Hash size={16} />}
              <h3 className="text-sm font-semibold text-foreground">{activeChannel?.name || "Select a channel"}</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingMsgs ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : !activeChannel ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Select a channel to start messaging.
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No messages yet. Say hello.
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.map((m) => (
                    <li key={m.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {(m.sender_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-foreground">{m.sender_name || "User"}</span>
                          <span className="text-[11px] text-muted-foreground">{fmtTime(m.created_at)}</span>
                          {m.edited_at && <span className="text-[10px] text-muted-foreground">(edited)</span>}
                        </div>
                        <p className={`whitespace-pre-wrap break-words text-sm ${m.deleted_at ? "italic text-muted-foreground" : "text-foreground"}`}>
                          {m.body}
                        </p>
                      </div>
                    </li>
                  ))}
                  <div ref={bottomRef} />
                </ul>
              )}
            </div>

            {activeChannel && (
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Message ${activeChannel.name || ""}`}
                    className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!text.trim()}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    <Send size={15} /> Send
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
