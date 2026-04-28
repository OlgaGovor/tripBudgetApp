import { useState, useEffect } from 'react'

/**
 * Returns a count that starts at min(initial, total) and increases by 10 every frame
 * until it reaches total. Useful for progressive rendering of long lists.
 */
export function useProgressiveCount(total: number, initial: number): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(c => Math.max(c, Math.min(initial, total)))
  }, [initial, total])

  useEffect(() => {
    if (count >= total || total === 0) return
    const id = setTimeout(() => setCount(c => Math.min(c + 10, total)), 16)
    return () => clearTimeout(id)
  }, [count, total])

  return count
}
