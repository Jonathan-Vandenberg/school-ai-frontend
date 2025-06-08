'use client'

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinueEditing: () => void
  onSaveAndClose?: () => void | Promise<void>
  onDiscardChanges: () => void
  title?: string
  description?: string
  showSaveOption?: boolean
  saveButtonText?: string
  continueButtonText?: string
  discardButtonText?: string
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onContinueEditing,
  onSaveAndClose,
  onDiscardChanges,
  title = "Unsaved Changes",
  description = "You have unsaved changes. Your changes will be lost if you close without saving.",
  showSaveOption = true,
  saveButtonText = "Save & Close",
  continueButtonText = "Continue Editing",
  discardButtonText = "Discard Changes",
}: UnsavedChangesDialogProps) {
  
  const handleSaveAndClose = async () => {
    if (onSaveAndClose) {
      await onSaveAndClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel onClick={onContinueEditing} className="w-full sm:w-auto text-sm">
            {continueButtonText}
          </AlertDialogCancel>
          
          {showSaveOption && onSaveAndClose && (
            <AlertDialogAction 
              onClick={handleSaveAndClose} 
              className="w-full sm:w-auto text-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saveButtonText}
            </AlertDialogAction>
          )}
          
          <AlertDialogAction 
            onClick={onDiscardChanges} 
            className="w-full sm:w-auto text-sm bg-destructive text-primary-foreground hover:bg-destructive/90"
          >
            {discardButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 