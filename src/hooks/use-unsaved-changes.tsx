'use client'

import { useState, useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'

interface UseUnsavedChangesProps {
  form: UseFormReturn<any>
  onClose: (open: boolean) => void
  onSave?: () => void | Promise<void>
  isLoading?: boolean
}

interface UseUnsavedChangesReturn {
  showUnsavedChangesDialog: boolean
  setShowUnsavedChangesDialog: (show: boolean) => void
  handleDialogClose: (newOpen: boolean) => void
  handleContinueEditing: () => void
  handleSaveAndClose: () => void | Promise<void>
  handleDiscardChanges: () => void
}

export function useUnsavedChanges({
  form,
  onClose,
  onSave,
  isLoading = false,
}: UseUnsavedChangesProps): UseUnsavedChangesReturn {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)

  // Handle dialog close with unsaved changes check
  const handleDialogClose = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && form.formState.isDirty && !isLoading) {
        // Show confirmation dialog if there are unsaved changes
        setShowUnsavedChangesDialog(true)
      } else {
        // Close normally if no changes or dialog is opening
        onClose(newOpen)
      }
    },
    [form.formState.isDirty, isLoading, onClose]
  )

  // Handle continuing to edit (cancel the close action)
  const handleContinueEditing = useCallback(() => {
    setShowUnsavedChangesDialog(false)
  }, [])

  // Handle discarding changes and closing
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedChangesDialog(false)
    onClose(false)
  }, [onClose])

  // Handle save and close
  const handleSaveAndClose = useCallback(async () => {
    setShowUnsavedChangesDialog(false)
    
    if (onSave) {
      // Trigger form validation first
      const isValid = await form.trigger()
      if (isValid) {
        await onSave()
      }
    } else {
      // If no save function provided, just close
      onClose(false)
    }
  }, [form, onSave, onClose])

  return {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    handleDialogClose,
    handleContinueEditing,
    handleSaveAndClose,
    handleDiscardChanges,
  }
} 