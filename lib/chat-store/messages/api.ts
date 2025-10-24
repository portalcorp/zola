import { createClient } from "@/lib/supabase/client"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import type { UIMessage } from "ai"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"
import { convertV4MessageToV5, convertV5MessageToV4 } from "@/lib/convert-messages"
import type { Message as V4Message } from "ai-legacy"

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

  // Convert v4 messages from database to v5 format for the application
  return data.map((message, index) => {
    const v4Message: V4Message = {
      id: String(message.id),
      role: message.role as any,
      content: message.content || '',
      parts: message.parts as any || undefined,
      createdAt: message.created_at ? new Date(message.created_at) : undefined,
      experimental_attachments: message.experimental_attachments as any,
    }
    return convertV4MessageToV5(v4Message, index)
  })
}

async function insertMessageToDb(chatId: string, message: UIMessage) {
  const supabase = createClient()
  if (!supabase) return
  
  // Convert v5 message to v4 format for database storage
  const v4Message = convertV5MessageToV4(message as any)
  
  await supabase.from("messages").insert({
    chat_id: chatId,
    content: v4Message.content || null,
    role: v4Message.role === 'data' ? 'assistant' : v4Message.role,
    parts: v4Message.parts ? JSON.parse(JSON.stringify(v4Message.parts)) : null,
    created_at: v4Message.createdAt ? v4Message.createdAt.toISOString() : new Date().toISOString(),
    experimental_attachments: v4Message.experimental_attachments ? JSON.parse(JSON.stringify(v4Message.experimental_attachments)) : null,
    message_group_id: (message as any).metadata?.message_group_id || null,
    model: (message as any).metadata?.model || null,
  });
}

async function insertMessagesToDb(chatId: string, messages: UIMessage[]) {
  const supabase = createClient()
  if (!supabase) return

  const payload = messages.map((message) => {
    // Convert v5 message to v4 format for database storage
    const v4Message = convertV5MessageToV4(message as any)
    
    return {
      chat_id: chatId,
      content: v4Message.content || null,
      role: v4Message.role === 'data' ? 'assistant' : v4Message.role,
      parts: v4Message.parts ? JSON.parse(JSON.stringify(v4Message.parts)) : null,
      created_at: v4Message.createdAt ? v4Message.createdAt.toISOString() : new Date().toISOString(),
      experimental_attachments: v4Message.experimental_attachments ? JSON.parse(JSON.stringify(v4Message.experimental_attachments)) : null,
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

  // V5 messages don't have createdAt property, so we return them as-is
  // They should already be in the correct order from the database
  return entry.messages || []
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
