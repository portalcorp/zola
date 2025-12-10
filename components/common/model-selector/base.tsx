"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useKeyShortcut } from "@/app/hooks/use-key-shortcut"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useModel } from "@/lib/model-store/provider"
import { getModelSections } from "@/lib/model-store/utils"
import { ModelConfig } from "@/lib/models/types"
import { PROVIDERS } from "@/lib/providers"
import { useUserPreferences } from "@/lib/user-preference-store/provider"
import { cn } from "@/lib/utils"
import {
  CaretDownIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  StarIcon,
} from "@phosphor-icons/react"
import { useRef, useState } from "react"
import { ProModelDialog } from "./pro-dialog"
import { SubMenu } from "./sub-menu"

type ModelSelectorProps = {
  selectedModelId: string
  setSelectedModelId: (modelId: string) => void
  className?: string
  isUserAuthenticated?: boolean
}

export function ModelSelector({
  selectedModelId,
  setSelectedModelId,
  className,
  isUserAuthenticated = true,
}: ModelSelectorProps) {
  const { models, isLoading: isLoadingModels, favoriteModels, recentModels } = useModel()
  const { isModelHidden } = useUserPreferences()

  const currentModel = models.find((model) => model.id === selectedModelId)
  const currentProvider = PROVIDERS.find(
    (provider) => provider.id === currentModel?.icon
  )
  const isMobile = useBreakpoint(768)

  const [hoveredModel, setHoveredModel] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isProDialogOpen, setIsProDialogOpen] = useState(false)
  const [selectedProModel, setSelectedProModel] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Ref for input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  useKeyShortcut(
    (e) => (e.key === "p" || e.key === "P") && e.metaKey && e.shiftKey,
    () => {
      if (isMobile) {
        setIsDrawerOpen((prev) => !prev)
      } else {
        setIsDropdownOpen((prev) => !prev)
      }
    }
  )

  const renderModelItem = (model: ModelConfig) => {
    const isLocked = !model.accessible
    const isPro = model.isPro
    const provider = PROVIDERS.find((provider) => provider.id === model.icon)

    return (
      <div
        key={model.id}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2",
          selectedModelId === model.id && "bg-accent"
        )}
        onClick={() => {
          if (isLocked) {
            setSelectedProModel(model.id)
            setIsProDialogOpen(true)
            return
          }

          setSelectedModelId(model.id)
          if (isMobile) {
            setIsDrawerOpen(false)
          } else {
            setIsDropdownOpen(false)
          }
        }}
      >
        <div className="flex items-center gap-3">
          {provider?.icon && <provider.icon className="size-5" />}
          <div className="flex flex-col gap-0">
            <span className="text-sm">{model.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPro && (
            <div className={cn(
              "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              isLocked
                ? "border-input bg-accent text-muted-foreground border"
                : "bg-primary/10 text-primary"
            )}>
              <StarIcon className="size-2" weight={isLocked ? "regular" : "fill"} />
              <span>PRO</span>
            </div>
          )}
          {isLocked && !isPro && (
            <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
              <StarIcon className="size-2" />
              <span>Locked</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get the hovered model data
  const hoveredModelData = models.find((model) => model.id === hoveredModel)

  // Get models organized by sections
  const { favorites, recent, recommended } = getModelSections(
    models,
    favoriteModels || [],
    recentModels || [],
    searchQuery,
    isModelHidden
  )

  // Check if we have any models to show
  const hasAnyModels = favorites.length > 0 || recent.length > 0 || recommended.length > 0

  const trigger = (
    <Button
      variant="outline"
      className={cn("dark:bg-secondary justify-between", className)}
      disabled={isLoadingModels}
    >
      <div className="flex items-center gap-2">
        {currentProvider?.icon && <currentProvider.icon className="size-5" />}
        <span>{currentModel?.name || "Select model"}</span>
      </div>
      <CaretDownIcon className="size-4 opacity-50" />
    </Button>
  )

  // Handle input change without losing focus
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSearchQuery(e.target.value)
  }

  // For unauthenticated users, locked models require login
  // The `accessible` flag from the API already marks non-free models as locked

  if (isMobile) {
    return (
      <>
        <ProModelDialog
          isOpen={isProDialogOpen}
          setIsOpen={setIsProDialogOpen}
          currentModel={selectedProModel || ""}
        />
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Model</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <MagnifyingGlassIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search models..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-4 pb-6">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Loading models...
                  </p>
                </div>
              ) : hasAnyModels ? (
                <>
                  {/* Favorites Section */}
                  {favorites.length > 0 && (
                    <div className="mb-2">
                      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs font-medium">
                        <StarIcon className="size-3" weight="fill" />
                        Favorites
                      </div>
                      {favorites.map((model) => renderModelItem(model))}
                    </div>
                  )}
                  {/* Recent Section */}
                  {recent.length > 0 && (
                    <div className="mb-2">
                      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs font-medium">
                        <ClockIcon className="size-3" />
                        Recent
                      </div>
                      {recent.map((model) => renderModelItem(model))}
                    </div>
                  )}
                  {/* Recommended Section */}
                  {recommended.length > 0 && (
                    <div className="mb-2">
                      <div className="text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-xs font-medium">
                        <SparkleIcon className="size-3" />
                        Recommended
                      </div>
                      {recommended.map((model) => renderModelItem(model))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    No results found.
                  </p>
                  <a
                    href="https://github.com/ibelick/zola/issues/new?title=Model%20Request%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm underline"
                  >
                    Request a new model
                  </a>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <div>
      <ProModelDialog
        isOpen={isProDialogOpen}
        setIsOpen={setIsProDialogOpen}
        currentModel={selectedProModel || ""}
      />
      <Tooltip>
        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={(open) => {
            setIsDropdownOpen(open)
            if (!open) {
              setHoveredModel(null)
              setSearchQuery("")
            } else {
              if (selectedModelId) setHoveredModel(selectedModelId)
            }
          }}
        >
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Switch model ⌘⇧P</TooltipContent>
          <DropdownMenuContent
            className="flex h-[320px] w-[300px] flex-col space-y-0.5 overflow-visible p-0"
            align="start"
            sideOffset={4}
            forceMount
            side="top"
          >
            <div className="bg-background sticky top-0 z-10 rounded-t-md border-b px-0 pt-0 pb-0">
              <div className="relative">
                <MagnifyingGlassIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search models..."
                  className="dark:bg-popover rounded-b-none border border-none pl-8 shadow-none focus-visible:ring-0"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="flex h-full flex-col space-y-0 overflow-y-auto px-1 pt-0 pb-0">
              {isLoadingModels ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Loading models...
                  </p>
                </div>
              ) : hasAnyModels ? (
                <>
                  {/* Favorites Section */}
                  {favorites.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <StarIcon className="size-3" weight="fill" />
                        Favorites
                      </DropdownMenuLabel>
                      {favorites.map((model) => {
                        const isLocked = !model.accessible
                        const isPro = model.isPro
                        const provider = PROVIDERS.find(
                          (provider) => provider.id === model.icon
                        )
                        return (
                          <DropdownMenuItem
                            key={model.id}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2",
                              selectedModelId === model.id && "bg-accent"
                            )}
                            onSelect={() => {
                              if (isLocked) {
                                setSelectedProModel(model.id)
                                setIsProDialogOpen(true)
                                return
                              }
                              setSelectedModelId(model.id)
                              setIsDropdownOpen(false)
                            }}
                            onFocus={() => {
                              if (isDropdownOpen) setHoveredModel(model.id)
                            }}
                            onMouseEnter={() => {
                              if (isDropdownOpen) setHoveredModel(model.id)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {provider?.icon && <provider.icon className="size-5" />}
                              <span className="text-sm">{model.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isPro && (
                                <div className={cn(
                                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isLocked
                                    ? "border-input bg-accent text-muted-foreground border"
                                    : "bg-primary/10 text-primary"
                                )}>
                                  <StarIcon className="size-2" weight={isLocked ? "regular" : "fill"} />
                                  <span>PRO</span>
                                </div>
                              )}
                              {isLocked && !isPro && (
                                <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                                  <span>Locked</span>
                                </div>
                              )}
                            </div>
                          </DropdownMenuItem>
                        )
                      })}
                      {(recent.length > 0 || recommended.length > 0) && (
                        <DropdownMenuSeparator />
                      )}
                    </>
                  )}
                  {/* Recent Section */}
                  {recent.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <ClockIcon className="size-3" />
                        Recent
                      </DropdownMenuLabel>
                      {recent.map((model) => {
                        const isLocked = !model.accessible
                        const isPro = model.isPro
                        const provider = PROVIDERS.find(
                          (provider) => provider.id === model.icon
                        )
                        return (
                          <DropdownMenuItem
                            key={model.id}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2",
                              selectedModelId === model.id && "bg-accent"
                            )}
                            onSelect={() => {
                              if (isLocked) {
                                setSelectedProModel(model.id)
                                setIsProDialogOpen(true)
                                return
                              }
                              setSelectedModelId(model.id)
                              setIsDropdownOpen(false)
                            }}
                            onFocus={() => {
                              if (isDropdownOpen) setHoveredModel(model.id)
                            }}
                            onMouseEnter={() => {
                              if (isDropdownOpen) setHoveredModel(model.id)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {provider?.icon && <provider.icon className="size-5" />}
                              <span className="text-sm">{model.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isPro && (
                                <div className={cn(
                                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isLocked
                                    ? "border-input bg-accent text-muted-foreground border"
                                    : "bg-primary/10 text-primary"
                                )}>
                                  <StarIcon className="size-2" weight={isLocked ? "regular" : "fill"} />
                                  <span>PRO</span>
                                </div>
                              )}
                              {isLocked && !isPro && (
                                <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                                  <span>Locked</span>
                                </div>
                              )}
                            </div>
                          </DropdownMenuItem>
                        )
                      })}
                      {recommended.length > 0 && <DropdownMenuSeparator />}
                    </>
                  )}
                  {/* Recommended Section */}
                  {recommended.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <SparkleIcon className="size-3" />
                        Recommended
                      </DropdownMenuLabel>
                      {recommended.map((model) => {
                        const isLocked = !model.accessible
                        const isPro = model.isPro
                        const provider = PROVIDERS.find(
                          (provider) => provider.id === model.icon
                        )
                        return (
                          <DropdownMenuItem
                            key={model.id}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2",
                              selectedModelId === model.id && "bg-accent"
                            )}
                            onSelect={() => {
                              if (isLocked) {
                                setSelectedProModel(model.id)
                                setIsProDialogOpen(true)
                                return
                              }
                              setSelectedModelId(model.id)
                              setIsDropdownOpen(false)
                            }}
                            onFocus={() => {
                              if (isDropdownOpen) setHoveredModel(model.id)
                            }}
                            onMouseEnter={() => {
                              if (isDropdownOpen) setHoveredModel(model.id)
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {provider?.icon && <provider.icon className="size-5" />}
                              <span className="text-sm">{model.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isPro && (
                                <div className={cn(
                                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                  isLocked
                                    ? "border-input bg-accent text-muted-foreground border"
                                    : "bg-primary/10 text-primary"
                                )}>
                                  <StarIcon className="size-2" weight={isLocked ? "regular" : "fill"} />
                                  <span>PRO</span>
                                </div>
                              )}
                              {isLocked && !isPro && (
                                <div className="border-input bg-accent text-muted-foreground flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                                  <span>Locked</span>
                                </div>
                              )}
                            </div>
                          </DropdownMenuItem>
                        )
                      })}
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-muted-foreground mb-1 text-sm">
                    No results found.
                  </p>
                  <a
                    href="https://github.com/ibelick/zola/issues/new?title=Model%20Request%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-sm underline"
                  >
                    Request a new model
                  </a>
                </div>
              )}
            </div>

            {/* Submenu positioned absolutely */}
            {hoveredModelData && (
              <div className="absolute top-0 left-[calc(100%+8px)]">
                <SubMenu hoveredModelData={hoveredModelData} />
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </div>
  )
}
