import GolfNavigation from '@/components/GolfNavigation'

export default function GolfLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GolfNavigation />
      {children}
    </>
  )
}
