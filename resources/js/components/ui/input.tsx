import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          // Base styles
          "flex h-10 w-full min-w-0 rounded-lg border-2 bg-white px-4 py-2 text-base shadow-sm",
          // Border and outline
          "border-gray-200 outline-none transition-all duration-200",
          // Focus states
          "focus:border-blue-500 focus:ring-0 focus:ring-blue-500/90 focus:shadow-md focus:shadow-blue-500/20",
          // Hover states
          "hover:border-gray-300",
          // Placeholder
          "placeholder:text-gray-400",
          // Text selection
          "selection:bg-blue-500 selection:text-white",
          // File input
          "file:mr-4 file:inline-flex file:h-8 file:items-center file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:text-sm file:font-medium file:text-gray-700 file:transition-colors hover:file:bg-gray-200",
          // Disabled states
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          // Dark mode support
          "dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500",
          "dark:focus:border-blue-400 dark:focus:ring-blue-400/20",
          "dark:hover:border-gray-600 dark:disabled:bg-gray-800",
          "dark:file:bg-gray-800 dark:file:text-gray-300 dark:hover:file:bg-gray-700",
          // Responsive text size
          "md:text-sm",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }