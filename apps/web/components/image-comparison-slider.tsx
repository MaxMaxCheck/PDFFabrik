"use client"

import React, { useCallback, useRef, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"

type ComparisonSliderProps = {
  before: React.ReactNode
  after: React.ReactNode
  className?: string
}

export function ComparisonSlider({ before, after, className }: ComparisonSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const afterRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const setPosition = useCallback((position: number) => {
    const clippedRight = 100 - position
    if (afterRef.current) {
      afterRef.current.style.clipPath = `inset(0 ${clippedRight}% 0 0)`
    }
    if (handleRef.current) {
      handleRef.current.style.left = `calc(${position}% - 0.1875rem)`
    }
  }, [])

  const moveToClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const next = ((clientX - rect.left) / rect.width) * 100
      const clamped = Math.max(0, Math.min(100, next))
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setPosition(clamped)
        rafRef.current = null
      })
    },
    [setPosition],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDragging(true)
      moveToClientX(event.clientX)
    },
    [moveToClientX],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      event.preventDefault()
      moveToClientX(event.clientX)
    },
    [isDragging, moveToClientX],
  )

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full touch-none select-none overflow-hidden bg-background",
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="absolute inset-0">{before}</div>
      <div
        ref={afterRef}
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: "inset(0 50% 0 0)", willChange: "clip-path" }}
      >
        {after}
      </div>
      <div
        ref={handleRef}
        className="absolute top-0 bottom-0 z-10 flex w-1.5 cursor-ew-resize items-center justify-center bg-white/80 shadow-sm"
        style={{ left: "calc(50% - 0.1875rem)", willChange: "left" }}
        onPointerDown={handlePointerDown}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition-transform",
            isDragging && "scale-110",
          )}
        >
          <span className="text-lg font-semibold" aria-hidden>
            ↔
          </span>
        </div>
      </div>
    </div>
  )
}

type ImageComparisonProps = {
  beforeImage: string
  afterImage: string
  altBefore?: string
  altAfter?: string
}

export function ImageComparison({
  beforeImage,
  afterImage,
  altBefore = "Before",
  altAfter = "After",
}: ImageComparisonProps) {
  return (
    <ComparisonSlider
      className="mx-auto max-w-4xl rounded-xl shadow-2xl"
      before={
        <img
          src={beforeImage}
          alt={altBefore}
          className="block h-full w-full object-cover object-left"
          draggable="false"
        />
      }
      after={
        <img
          src={afterImage}
          alt={altAfter}
          className="h-full w-full object-cover object-left"
          draggable="false"
        />
      }
    />
  )
}
