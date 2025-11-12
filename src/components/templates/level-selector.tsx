'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'
import { CEFRLevel, GradeLevel, LevelType } from '@prisma/client'

export interface TemplateLevel {
  levelType: LevelType
  cefrLevel?: CEFRLevel
  gradeLevel?: GradeLevel
}

interface LevelSelectorProps {
  value?: TemplateLevel[]
  selectedLevels?: TemplateLevel[]
  onChange: (levels: TemplateLevel[]) => void
  className?: string
}

const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const GRADE_LEVELS: GradeLevel[] = [
  'PRE_K',
  'KINDERGARTEN',
  'GRADE_1',
  'GRADE_2',
  'GRADE_3',
  'GRADE_4',
  'GRADE_5',
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'GRADE_12',
]

const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  PRE_K: 'Pre-K',
  KINDERGARTEN: 'Kindergarten',
  GRADE_1: 'Grade 1',
  GRADE_2: 'Grade 2',
  GRADE_3: 'Grade 3',
  GRADE_4: 'Grade 4',
  GRADE_5: 'Grade 5',
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
  GRADE_12: 'Grade 12',
}

export function LevelSelector({ value, selectedLevels, onChange, className }: LevelSelectorProps) {
  // Use value prop if provided, otherwise use selectedLevels (for backwards compatibility)
  const levels = value ?? selectedLevels ?? []
  
  const isCEFRSelected = (level: CEFRLevel) => {
    return levels.some(
      l => l.levelType === 'CEFR' && l.cefrLevel === level
    )
  }

  const isGradeSelected = (level: GradeLevel) => {
    return levels.some(
      l => l.levelType === 'GRADE' && l.gradeLevel === level
    )
  }

  const toggleCEFRLevel = (level: CEFRLevel) => {
    if (isCEFRSelected(level)) {
      // Remove
      onChange(
        levels.filter(
          l => !(l.levelType === 'CEFR' && l.cefrLevel === level)
        )
      )
    } else {
      // Add
      onChange([
        ...levels,
        { levelType: 'CEFR', cefrLevel: level }
      ])
    }
  }

  const toggleGradeLevel = (level: GradeLevel) => {
    if (isGradeSelected(level)) {
      // Remove
      onChange(
        levels.filter(
          l => !(l.levelType === 'GRADE' && l.gradeLevel === level)
        )
      )
    } else {
      // Add
      onChange([
        ...levels,
        { levelType: 'GRADE', gradeLevel: level }
      ])
    }
  }

  const removeLevel = (level: TemplateLevel) => {
    onChange(
      levels.filter(l => {
        if (l.levelType !== level.levelType) return true
        if (l.levelType === 'CEFR') {
          return l.cefrLevel !== level.cefrLevel
        }
        return l.gradeLevel !== level.gradeLevel
      })
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Assignment Levels</CardTitle>
          <CardDescription>
            Select the appropriate CEFR and/or grade levels for this template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Levels */}
          {levels.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Selected Levels</label>
              <div className="flex flex-wrap gap-2">
                {levels.map((level, index) => (
                  <Badge
                    key={`${level.levelType}-${level.cefrLevel || level.gradeLevel}-${index}`}
                    variant="default"
                    className="gap-1"
                  >
                    {level.levelType === 'CEFR' 
                      ? level.cefrLevel 
                      : GRADE_LEVEL_LABELS[level.gradeLevel as GradeLevel]}
                    <button
                      type="button"
                      onClick={() => removeLevel(level)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* CEFR Levels */}
          <div>
            <label className="text-sm font-medium mb-2 block">CEFR Levels (A1-C2)</label>
            <div className="flex flex-wrap gap-2">
              {CEFR_LEVELS.map(level => (
                <Button
                  key={level}
                  type="button"
                  variant={isCEFRSelected(level) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCEFRLevel(level)}
                  className="min-w-[60px]"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Grade Levels */}
          <div>
            <label className="text-sm font-medium mb-2 block">Grade Levels</label>
            <div className="flex flex-wrap gap-2">
              {GRADE_LEVELS.map(level => (
                <Button
                  key={level}
                  type="button"
                  variant={isGradeSelected(level) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleGradeLevel(level)}
                >
                  {GRADE_LEVEL_LABELS[level]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

