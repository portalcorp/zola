import type { Message as MessageAISDK } from "@ai-sdk/react"
import { isToolUIPart, getToolName } from "ai"

export function getSources(parts: MessageAISDK["parts"]) {
  const sources = parts
    ?.filter(
      (part) => part.type === "source" || isToolUIPart(part)
    )
    .map((part) => {
      if (part.type === "source") {
        return part.source
      }

      // Check for tool invocations with results
      if (isToolUIPart(part) && part.state === "output-available") {
        const output = part.output
        const toolName = getToolName(part)

        if (toolName === "summarizeSources" &&
        output?.result?.[0]?.citations) {
          return output.result.flatMap((item: { citations?: unknown[] }) => item.citations || [])
        }

        return Array.isArray(output) ? output.flat() : output
      }

      return null
    })
    .filter(Boolean)
    .flat()

  const validSources =
    sources?.filter(
      (source) =>
        source && typeof source === "object" && source.url && source.url !== ""
    ) || []

  return validSources
}
