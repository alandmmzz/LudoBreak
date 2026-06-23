import { Suspense } from 'react'
import AuthForm from './AuthForm'

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>
      <AuthForm />
    </Suspense>
  )
}
