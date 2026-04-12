import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/golf/settings — returns public settings needed for picks page (admin Venmo handle)
export async function GET() {
  try {
    const admin = await db.user.findFirst({
      where: { isAdmin: true },
      select: { venmoHandle: true },
    })

    return NextResponse.json({
      venmoHandle: admin?.venmoHandle ?? null,
    })
  } catch (error) {
    console.error('Error fetching golf settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
