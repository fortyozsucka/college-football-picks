import { Suspense } from 'react'
import ChakraGolfFieldPage from './ChakraGolfFieldPage'

export default function FieldPage() {
  return (
    <Suspense>
      <ChakraGolfFieldPage />
    </Suspense>
  )
}
