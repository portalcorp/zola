import { UIMessage, type LanguageModelUsage } from "ai"

/**
 * Custom metadata for messages in this application
 */
export type MessageMetadata = {
  // Usage information from the model
  totalUsage?: LanguageModelUsage
  // Custom group ID for multi-chat scenarios
  message_group_id?: string
  // Model used to generate this message
  model?: string
}

/**
 * Custom UIMessage type with application-specific metadata
 */
export type AppUIMessage = UIMessage<MessageMetadata>

/**
 * Export as default UIMessage type for convenience
 */
export type { AppUIMessage as UIMessage }
