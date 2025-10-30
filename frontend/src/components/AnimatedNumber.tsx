'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  className?: string
}

export default function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value)
  const springValue = useSpring(motionValue, {
    damping: 10,
    stiffness: 100,
  })
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    motionValue.set(value)
  }, [motionValue, value])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latestValue) => {
      setDisplayValue(Math.round(latestValue))
    })
    return unsubscribe
  }, [springValue])

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  )
}

