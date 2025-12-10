"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-store/provider"
import { useMutation } from "@tanstack/react-query"
import Image from "next/image"
import Link from "next/link"

type ProModelDialogProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  currentModel: string
}

export function ProModelDialog({
  isOpen,
  setIsOpen,
  currentModel,
}: ProModelDialogProps) {
  const { user } = useUser()
  const isAuthenticated = !!user?.id
  const isMobile = useBreakpoint(768)
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Missing user")

      const supabase = await createClient()
      if (!supabase) throw new Error("Missing supabase")
      const { error } = await supabase.from("feedback").insert({
        message: `I want access to ${currentModel}`,
        user_id: user.id,
      })

      if (error) throw new Error(error.message)
    },
  })

  const renderUnauthenticatedContent = () => (
    <div className="flex max-h-[70vh] flex-col" key={currentModel}>
      <div className="relative">
        <Image
          src="/banner_ocean.jpg"
          alt={`calm paint generate by ${APP_NAME}`}
          width={400}
          height={128}
          className="h-32 w-full object-cover"
        />
      </div>

      <div className="px-6 pt-4 text-center text-lg leading-tight font-medium">
        Sign in to access this model
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="px-6 py-4">
          <p className="text-muted-foreground">
            Create a free account to unlock access to more AI models, including
            this one.
          </p>

          <div className="mt-5 flex justify-center">
            <Button asChild className="w-full" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAuthenticatedContent = () => (
    <div className="flex max-h-[70vh] flex-col" key={currentModel}>
      <div className="relative">
        <Image
          src="/banner_ocean.jpg"
          alt={`calm paint generate by ${APP_NAME}`}
          width={400}
          height={128}
          className="h-32 w-full object-cover"
        />
      </div>

      <div className="px-6 pt-4 text-center text-lg leading-tight font-medium">
        This is a PRO model
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="px-6 py-4">
          <p className="text-muted-foreground">
            PRO models require a subscription or your own API key to use.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Option 1: Subscribe to PRO</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Get unlimited access to all PRO models with a subscription.
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-sm font-medium">Option 2: Bring Your Own Key</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Go to{" "}
                <span className="text-primary font-medium">
                  Settings → API Keys
                </span>{" "}
                to add your own API key and enable &quot;Use for chat&quot;.
              </p>
            </div>
          </div>

          <p className="text-muted-foreground mt-5 text-sm">
            Have questions about PRO?
          </p>
          {mutation.isSuccess ? (
            <div className="mt-3 flex justify-center gap-3">
              <Badge className="bg-green-600 text-white">
                Thanks! We&apos;ll keep you updated
              </Badge>
            </div>
          ) : (
            <div className="mt-3 flex justify-center gap-3">
              <Button
                className="w-full"
                onClick={() => mutation.mutate()}
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Sending..." : "Contact us"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderContent = () =>
    isAuthenticated ? renderAuthenticatedContent() : renderUnauthenticatedContent()

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="px-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Pro Model Access Required</DrawerTitle>
          </DrawerHeader>
          {renderContent()}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="[&>button:last-child]:bg-background gap-0 overflow-hidden rounded-3xl p-0 shadow-xs sm:max-w-md [&>button:last-child]:rounded-full [&>button:last-child]:p-1">
        <DialogHeader className="sr-only">
          <DialogTitle>Pro Model Access Required</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
