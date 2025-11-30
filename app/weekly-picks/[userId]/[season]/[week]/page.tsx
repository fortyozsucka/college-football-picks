import WeeklyPicksPage from './WeeklyPicksPage'

export default function Page({
  params
}: {
  params: { userId: string; season: string; week: string }
}) {
  return <WeeklyPicksPage params={params} />
}
