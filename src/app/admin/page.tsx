'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/components/providers/tenant-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Palette, Image as ImageIcon, Save, RefreshCw, Upload, X, School } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const { tenant } = useTenant()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    display_name: '',
    logo_url: '',
    primary_hex: '#4f46e5',
    secondary_hex: '#0ea5e9', 
    accent_hex: '#22c55e'
  })

  // Initialize form with current tenant data
  useEffect(() => {
    if (tenant) {
      const logoUrl = tenant.branding?.logo_url || ''
      setFormData({
        display_name: tenant.display_name || '',
        logo_url: logoUrl,
        primary_hex: tenant.branding?.primary_hex || '#4f46e5',
        secondary_hex: tenant.branding?.secondary_hex || '#0ea5e9',
        accent_hex: tenant.branding?.accent_hex || '#22c55e'
      })
      
      // Set preview URL if logo exists
      if (logoUrl) {
        setPreviewUrl(logoUrl)
      }
    }
  }, [tenant])

  // File selection handler (no upload yet)
  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      
      // Create preview URL from file
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear the logo_url since we now have a new file to upload
      setFormData(prev => ({ ...prev, logo_url: '' }))
      setMessage(null)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const removeSelectedFile = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setFormData(prev => ({ ...prev, logo_url: '' }))
  }

  // Check if user is admin
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>
            Access denied. Admin role required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      let logoUrl = formData.logo_url

      // Step 1: Upload logo to S3 if there's a selected file
      if (selectedFile) {
        console.log('Uploading logo to S3...', selectedFile.name)
        
        const uploadFormData = new FormData()
        uploadFormData.append('logo', selectedFile)

        const uploadResponse = await fetch('/api/admin/upload-logo', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json()
          console.error('Upload API error:', error)
          const errorMsg = error.details 
            ? `${error.error}: ${error.details}` 
            : error.error || 'Upload failed'
          throw new Error(`Logo upload failed: ${errorMsg}`)
        }

        const uploadResult = await uploadResponse.json()
        console.log('Logo upload successful:', uploadResult)
        logoUrl = uploadResult.url
      }

      // Step 2: Update tenant branding in database
      console.log('Updating tenant branding in database...', {
        logo_url: logoUrl,
        display_name: formData.display_name,
        primary_hex: formData.primary_hex,
        secondary_hex: formData.secondary_hex,
        accent_hex: formData.accent_hex
      })

      const brandingResponse = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: formData.display_name,
          logo_url: logoUrl,
          primary_hex: formData.primary_hex,
          secondary_hex: formData.secondary_hex,
          accent_hex: formData.accent_hex
        }),
      })

      if (!brandingResponse.ok) {
        const error = await brandingResponse.json()
        console.error('Branding API error:', error)
        throw new Error(error.error || 'Failed to update branding')
      }

      console.log('Branding update successful')

      // Update local state
      setFormData(prev => ({ ...prev, logo_url: logoUrl }))
      setSelectedFile(null)
      
      setMessage({ 
        type: 'success', 
        text: 'Branding updated successfully! Refreshing page...' 
      })
      
      // Auto-refresh page after 1 second to show the new branding
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Form submission error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update branding' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleColorChange = (field: string, value: string) => {
    // Ensure the color starts with #
    const colorValue = value.startsWith('#') ? value : `#${value}`
    setFormData(prev => ({ ...prev, [field]: colorValue }))
  }

  const resetToDefaults = () => {
    setFormData({
      display_name: '',
      logo_url: '/jis-logo.png',
      primary_hex: '#4f46e5',
      secondary_hex: '#0ea5e9',
      accent_hex: '#22c55e'
    })
    setPreviewUrl('/jis-logo.png')
    setSelectedFile(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-2">
          Manage tenant branding and appearance settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branding Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Tenant Branding
            </CardTitle>
            <CardDescription>
              Customize the logo and color scheme for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* School Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display_name" className="flex items-center gap-2">
                  <School className="h-4 w-4" />
                  School Display Name
                </Label>
                <Input
                  id="display_name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Enter your school name (e.g. Japanese International School)"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear in the login page header and sidebar
                </p>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Logo Upload
                </Label>
                
                {previewUrl ? (
                  /* Current Logo Display */
                  <div className="space-y-3">
                    <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={previewUrl} 
                          alt="Current logo" 
                          className="h-16 w-16 object-contain rounded border"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {selectedFile ? 'New Logo (Preview)' : 'Current Logo'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedFile ? (
                              <>
                                {selectedFile.name}
                                <span className="text-amber-600 dark:text-amber-400 block">
                                  Will be uploaded when you save
                                </span>
                              </>
                            ) : (
                              'Currently applied logo'
                            )}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeSelectedFile}
                          className="h-8 w-8 p-0"
                          title="Remove logo"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Change Logo */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer hover:bg-muted/50 ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('logo-file-input')?.click()}
                    >
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                      <p className="text-sm font-medium">Change Logo</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose a different logo
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Initial Upload Area */
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:bg-muted/50 ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('logo-file-input')?.click()}
                  >
                    <div className="space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Choose Logo</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Drag & drop your logo here, or click to browse
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  id="logo-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, SVG, WebP (max 5MB) • Files are uploaded when you save changes
                </p>
              </div>

              {/* Color Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_hex">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_hex"
                      type="color"
                      value={formData.primary_hex}
                      onChange={(e) => handleColorChange('primary_hex', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={formData.primary_hex}
                      onChange={(e) => handleColorChange('primary_hex', e.target.value)}
                      placeholder="#4f46e5"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_hex">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_hex"
                      type="color"
                      value={formData.secondary_hex}
                      onChange={(e) => handleColorChange('secondary_hex', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={formData.secondary_hex}
                      onChange={(e) => handleColorChange('secondary_hex', e.target.value)}
                      placeholder="#0ea5e9"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accent_hex">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent_hex"
                      type="color"
                      value={formData.accent_hex}
                      onChange={(e) => handleColorChange('accent_hex', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={formData.accent_hex}
                      onChange={(e) => handleColorChange('accent_hex', e.target.value)}
                      placeholder="#22c55e"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {loading ? 'Saving Changes...' : 'Save & Apply Changes'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted/30 rounded border">
                <p>
                  <strong>Preview your changes above</strong> - Your logo and colors will be saved and applied to your tenant when you click "Save & Apply Changes".
                  {selectedFile && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                      ⚠️ New logo selected: <strong>{selectedFile.name}</strong> will be uploaded when you save.
                    </span>
                  )}
                </p>
              </div>

              {/* Message Display */}
              {message && (
                <Alert className={message.type === 'error' ? 'border-destructive' : 'border-green-500'}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview how your changes will look before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Preview */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                Logo Preview
                {selectedFile && (
                  <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                    New logo pending
                  </span>
                )}
              </Label>
              <div className="border rounded p-4 bg-muted/50 flex items-center justify-center h-20">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={previewUrl} 
                    alt="Logo preview" 
                    className="max-h-16 object-contain"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">No logo selected</span>
                )}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-4">
              <Label>Color Preview</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div 
                    className="w-full h-16 rounded border mb-2"
                    style={{ backgroundColor: formData.primary_hex }}
                  />
                  <p className="text-sm font-medium">Primary</p>
                  <p className="text-xs text-muted-foreground">{formData.primary_hex}</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-full h-16 rounded border mb-2"
                    style={{ backgroundColor: formData.secondary_hex }}
                  />
                  <p className="text-sm font-medium">Secondary</p>
                  <p className="text-xs text-muted-foreground">{formData.secondary_hex}</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-full h-16 rounded border mb-2"
                    style={{ backgroundColor: formData.accent_hex }}
                  />
                  <p className="text-sm font-medium">Accent</p>
                  <p className="text-xs text-muted-foreground">{formData.accent_hex}</p>
                </div>
              </div>
            </div>

            {/* Sample Buttons */}
            <div className="space-y-3">
              <Label>Button Preview</Label>
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  style={{ 
                    backgroundColor: formData.primary_hex,
                    borderColor: formData.primary_hex
                  }}
                >
                  Primary Button
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  style={{ 
                    borderColor: formData.secondary_hex,
                    color: formData.secondary_hex
                  }}
                >
                  Secondary Button
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
