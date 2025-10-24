import { isToolUIPart, getToolName, type UIMessage } from "ai"

type Source = {
  url: string
  title?: string
  id?: string
}

export function getSources(parts: UIMessage["parts"]): Source[] {
  const sources = parts
    ?.filter(
      (part) => part.type === "source-url" || isToolUIPart(part)
    )
    .map((part): Source | Source[] | null => {
      if (part.type === "source-url") {
        return {
          url: part.url,
          title: part.title,
          id: part.sourceId,
        }
      }

      // Check for tool invocations with results
      if (isToolUIPart(part) && part.state === "output-available") {
        const output = part.output as {
          result?: Array<{ citations?: Source[] }>
        } | Source[] | Source | null
        const toolName = getToolName(part)

        if (toolName === "summarizeSources" && 
            output && 
            typeof output === "object" && 
            "result" in output &&
            Array.isArray(output.result) &&
            output.result[0]?.citations) {
          return output.result.flatMap((item) => item.citations || [])
        }

        if (Array.isArray(output)) {
          return output.flat()
        }
        
        if (output && typeof output === "object" && "url" in output) {
          return output as Source
        }

        return null
      }

      return null
    })
    .filter((item): item is Source | Source[] => item !== null)
    .flat()

  const validSources =
    sources?.filter(
      (source): source is Source =>
        source !== null && 
        typeof source === "object" && 
        "url" in source &&
        typeof source.url === "string" &&
        source.url !== ""
    ) || []

  return validSources
}
