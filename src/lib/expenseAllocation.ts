// lib/expenseAllocation.ts

import type { Expense, Accommodation } from '../db/schema'

export function buildSpentByDate(
    expenses: Expense[],
    accommodations: Accommodation[]
): Record<string, number> {

    const accommodationById = Object.fromEntries(
        accommodations.map(a => [a.id, a])
    )

    const result: Record<string, number> = {}

    for (const e of expenses) {
        if (
            e.categoryId === 'cat-accommodation' &&
            e.accommodationId
        ) {
            const accommodation =
                accommodationById[e.accommodationId]

            if (accommodation) {
                const checkIn = new Date(
                    accommodation.checkIn + 'T00:00:00Z'
                )

                const checkOut = new Date(
                    accommodation.checkOut + 'T00:00:00Z'
                )

                const nights = Math.round(
                    (checkOut.getTime() - checkIn.getTime()) /
                    (1000 * 60 * 60 * 24)
                )

                if (nights > 0) {
                    const dailyAmount =
                        e.amountConverted / nights

                    for (let i = 0; i < nights; i++) {
                        const date = new Date(checkIn)

                        date.setUTCDate(
                            date.getUTCDate() + i
                        )

                        const key =
                            date.toISOString().slice(0, 10)

                        result[key] =
                            (result[key] ?? 0) + dailyAmount
                    }

                    continue
                }
            }
        }

        result[e.date] =
            (result[e.date] ?? 0) + e.amountConverted
    }

    return result
}