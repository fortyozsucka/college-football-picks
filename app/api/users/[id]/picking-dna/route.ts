import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface RecordData {
  wins: number
  losses: number
  pushes: number
  total: number
  pct: number
}

function buildRecord(picks: Array<{ result: string | null }>): RecordData {
  const wins = picks.filter(p => p.result === 'WIN').length
  const losses = picks.filter(p => p.result === 'LOSS').length
  const pushes = picks.filter(p => p.result === 'PUSH').length
  const decided = wins + losses
  return { wins, losses, pushes, total: picks.length, pct: decided > 0 ? (wins / decided) * 100 : 0 }
}

function fmt(r: RecordData) {
  return r.pushes > 0 ? `${r.wins}-${r.losses}-${r.pushes}` : `${r.wins}-${r.losses}`
}

function getCurrentSeason(): number {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 7 ? year : year - 1
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const seasonParam = searchParams.get('season')
    const season = seasonParam ? parseInt(seasonParam) : null

    // Try to fetch with conference/rank fields (requires migration). Fall back without them.
    let picks: Array<any>
    try {
      picks = await db.pick.findMany({
        where: {
          userId: params.id,
          result: { in: ['WIN', 'LOSS', 'PUSH'] },
          ...(season !== null ? { game: { season } } : {}),
        },
        include: {
          game: {
            select: {
              homeTeam: true,
              awayTeam: true,
              gameType: true,
              season: true,
              homeConference: true,
              awayConference: true,
              homeRank: true,
              awayRank: true,
            }
          }
        }
      })
    } catch {
      // Columns not yet migrated in this environment — fall back to base fields
      picks = await db.pick.findMany({
        where: {
          userId: params.id,
          result: { in: ['WIN', 'LOSS', 'PUSH'] },
          ...(season !== null ? { game: { season } } : {}),
        },
        include: {
          game: {
            select: {
              homeTeam: true,
              awayTeam: true,
              gameType: true,
              season: true,
            }
          }
        }
      })
    }

    if (picks.length < 5) {
      return NextResponse.json({ insufficient: true, totalPicks: picks.length })
    }

    // Classify each pick
    const annotated = picks.map(pick => {
      const spread = pick.lockedSpread
      const isHome = pick.pickedTeam === pick.game.homeTeam
      const abs = Math.abs(spread)

      // spread < 0 → home team favored; spread > 0 → away team favored
      let situation: 'home_fav' | 'home_dog' | 'road_fav' | 'road_dog' | 'pickem'
      if (abs < 0.5) situation = 'pickem'
      else if (isHome && spread < 0) situation = 'home_fav'
      else if (isHome && spread > 0) situation = 'home_dog'
      else if (!isHome && spread < 0) situation = 'road_dog'
      else situation = 'road_fav'

      let bucket: '0-3' | '3.5-7' | '7.5-10' | '10+'
      if (abs <= 3) bucket = '0-3'
      else if (abs <= 7) bucket = '3.5-7'
      else if (abs <= 10) bucket = '7.5-10'
      else bucket = '10+'

      const isFav = situation === 'home_fav' || situation === 'road_fav'

      // Conference of the team they picked
      const pickedConference = isHome
        ? pick.game.homeConference
        : pick.game.awayConference

      // Rank of the team they picked (null = unranked)
      const pickedRank = isHome ? pick.game.homeRank : pick.game.awayRank
      const isRanked = pickedRank !== null

      return { ...pick, situation, bucket, isHome, isFav, pickedConference, pickedRank, isRanked }
    })

    const overall = buildRecord(picks)
    const byHomeFav   = buildRecord(annotated.filter(p => p.situation === 'home_fav'))
    const byRoadFav   = buildRecord(annotated.filter(p => p.situation === 'road_fav'))
    const byHomeDog   = buildRecord(annotated.filter(p => p.situation === 'home_dog'))
    const byRoadDog   = buildRecord(annotated.filter(p => p.situation === 'road_dog'))
    const byFavorite  = buildRecord(annotated.filter(p => p.isFav))
    const byUnderdog  = buildRecord(annotated.filter(p => !p.isFav && p.situation !== 'pickem'))
    const byRanked    = buildRecord(annotated.filter(p => p.isRanked))
    const byUnranked  = buildRecord(annotated.filter(p => !p.isRanked))

    const bucketLabels = ['0-3', '3.5-7', '7.5-10', '10+'] as const
    const bySpreadBucket = bucketLabels.map(label => ({
      label,
      ...buildRecord(annotated.filter(p => p.bucket === label))
    }))

    const byGameType = {
      REGULAR:      buildRecord(picks.filter(p => p.game.gameType === 'REGULAR')),
      BOWL:         buildRecord(picks.filter(p => p.game.gameType === 'BOWL')),
      PLAYOFF:      buildRecord(picks.filter(p => p.game.gameType === 'PLAYOFF')),
      CHAMPIONSHIP: buildRecord(picks.filter(p => p.game.gameType === 'CHAMPIONSHIP')),
    }

    // Conference breakdown — only for picks with conference data
    const conferencePicks = annotated.filter(p => p.pickedConference)
    const conferenceMap = new Map<string, typeof annotated>()
    conferencePicks.forEach(p => {
      const conf = p.pickedConference!
      if (!conferenceMap.has(conf)) conferenceMap.set(conf, [])
      conferenceMap.get(conf)!.push(p)
    })

    const MIN = 3
    const byConference = Array.from(conferenceMap.entries())
      .map(([conference, picks]) => ({ conference, ...buildRecord(picks) }))
      .filter(c => c.total >= MIN)
      .sort((a, b) => b.total - a.total)

    // Kryptonite conference (worst win rate, min 5 picks)
    const kryptoniteConference = byConference.length > 0
      ? [...byConference].sort((a, b) => a.pct - b.pct)[0]
      : null

    // Superpower conference (best win rate, min 5 picks)
    const superpowerConference = byConference.length > 0
      ? [...byConference].sort((a, b) => b.pct - a.pct)[0]
      : null

    // Narrative: evaluate all situational + spread-bucket candidates
    const candidates = [
      { key: 'home_fav',  label: 'Home favorites',  rec: byHomeFav },
      { key: 'road_fav',  label: 'Road favorites',  rec: byRoadFav },
      { key: 'home_dog',  label: 'Home underdogs',  rec: byHomeDog },
      { key: 'road_dog',  label: 'Road underdogs',  rec: byRoadDog },
      ...bySpreadBucket.map(b => ({
        key: `bucket_${b.label}`,
        label: `${b.label}-point spreads`,
        rec: b,
      })),
    ].filter(c => c.rec.total >= MIN)

    const ranked = [...candidates].sort((a, b) => b.rec.pct - a.rec.pct)

    const superpower = ranked.length > 0 ? {
      label: ranked[0].label,
      record: fmt(ranked[0].rec),
      pct: ranked[0].rec.pct,
      wins: ranked[0].rec.wins,
      losses: ranked[0].rec.losses,
    } : null

    // Kryptonite: worst conference (needs conference data from sync)
    const kryptonite = kryptoniteConference ? {
      label: kryptoniteConference.conference,
      record: fmt(kryptoniteConference),
      pct: kryptoniteConference.pct,
      wins: kryptoniteConference.wins,
      losses: kryptoniteConference.losses,
    } : null

    // Biggest leak: whatever category has the most actual losses (all situations + spread buckets)
    const leakCandidates = [
      { label: 'Home favorites',              rec: byHomeFav },
      { label: 'Road favorites',              rec: byRoadFav },
      { label: 'Home underdogs',              rec: byHomeDog },
      { label: 'Road underdogs',              rec: byRoadDog },
      ...bySpreadBucket.map(b => ({ label: `${b.label}-point spreads`, rec: b })),
    ]
      .filter(c => c.rec.total >= MIN && c.rec.losses > 0)
      .sort((a, b) => (b.rec.losses - a.rec.losses) || (a.rec.pct - b.rec.pct))

    const leakTop = leakCandidates[0]
    const biggestLeak = leakTop ? {
      label: leakTop.label,
      record: fmt(leakTop.rec),
      pct: leakTop.rec.pct,
      wins: leakTop.rec.wins,
      losses: leakTop.rec.losses,
    } : null

    return NextResponse.json({
      overall,
      byHomeFav,
      byRoadFav,
      byHomeDog,
      byRoadDog,
      byFavorite,
      byUnderdog,
      byRanked,
      byUnranked,
      bySpreadBucket,
      byGameType,
      byConference,
      kryptoniteConference: kryptoniteConference
        ? { conference: kryptoniteConference.conference, record: fmt(kryptoniteConference), pct: kryptoniteConference.pct, wins: kryptoniteConference.wins, losses: kryptoniteConference.losses }
        : null,
      superpowerConference: superpowerConference
        ? { conference: superpowerConference.conference, record: fmt(superpowerConference), pct: superpowerConference.pct, wins: superpowerConference.wins, losses: superpowerConference.losses }
        : null,
      superpower,
      kryptonite,
      biggestLeak,
      totalPicks: picks.length,
      hasConferenceData: byConference.length > 0,
      hasRankData: byRanked.total > 0 || byUnranked.total > 0,
    })
  } catch (error) {
    console.error('Error computing picking DNA:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
