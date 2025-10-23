import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import type { UIMessage } from "ai"
import type { Message as V4Message } from "ai-legacy"
import { convertV4MessageToV5, convertV5MessageToV4 } from "@/lib/convert-messages"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"

export async function getMessagesFromDb(
  chatId: string
): Promise<UIMessage[]> {
  // fallback to local cache only
  if (!isSupabaseEnabled) {
    const cached = await getCachedMessages(chatId)
    return cached
  }

  const supabase = createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, content, role, experimental_attachments, created_at, parts, message_group_id, model"
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (!data || error) {
    console.error("Failed to fetch messages:", error)
    return []
  }

  // Convert v4 messages from database to v5 format
  return data.map((message) => {
    const v4Message: V4Message = {
      ...message,
      id: String(message.id),
      content: message.content ?? "",
      createdAt: new Date(message.created_at || ""),
      parts: (message?.parts as V4Message["parts"]) || undefined,
      experimental_attachments: message.experimental_attachments,
    }
    const v5Message = convertV4MessageToV5(v4Message)
    // Add custom metadata
    return {
      ...v5Message,
      metadata: {
        message_group_id: message.message_group_id,
        model: message.model,
      },
    } as UIMessage
  })
}

async function insertMessageToDb(chatId: string, message: UIMessage) {
  const supabase = createClient()
  if (!supabase) return

  // Convert v5 message to v4 format for database storage
  const v4Message = convertV5MessageToV4(message)
  
  await supabase.from("messages").insert({
    chat_id: chatId,
    role: v4Message.role,
    content: v4Message.content,
    experimental_attachments: v4Message.experimental_attachments,
    parts: v4Message.parts,
    created_at: v4Message.createdAt?.toISOString() || new Date().toISOString(),
    message_group_id: (message as any).metadata?.message_group_id || null,
    model: (message as any).metadata?.model || null,
  });
}

async function insertMessagesToDb(chatId: string, messages: UIMessage[]) {
  const supabase = createClient()
  if (!supabase) return

  // Convert v5 messages to v4 format for database storage
  const payload = messages.map((message) => {
    const v4Message = convertV5MessageToV4(message)
    return {
      chat_id: chatId,
      role: v4Message.role,
      content: v4Message.content,
      experimental_attachments: v4Message.experimental_attachments,
      parts: v4Message.parts,
      created_at: v4Message.createdAt?.toISOString() || new Date().toISOString(),
      message_group_id: (message as any).metadata?.message_group_id || null,
      model: (message as any).metadata?.model || null,
    }
  })

  await supabase.from("messages").insert(payload)
}

async function deleteMessagesFromDb(chatId: string) {
  const supabase = createClient()
  if (!supabase) return

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("chat_id", chatId)

  if (error) {
    console.error("Failed to clear messages from database:", error)
  }
}

type ChatMessageEntry = {
  id: string
  messages: UIMessage[]
}

export async function getCachedMessages(
  chatId: string
): Promise<UIMessage[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  )
}

export async function cacheMessages(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function addMessage(
  chatId: string,
  message: UIMessage
): Promise<void> {
  await insertMessageToDb(chatId, message)
  const current = await getCachedMessages(chatId)
  const updated = [...current, message]

  await writeToIndexedDB("messages", { id: chatId, messages: updated })
}

export async function setMessages(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  await insertMessagesToDb(chatId, messages)
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  await deleteMessagesFromDb(chatId)
  await clearMessagesCache(chatId)
}
