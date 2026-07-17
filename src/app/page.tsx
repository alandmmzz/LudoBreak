import VoteForm from '@/components/VoteForm'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <VoteForm />
      </div>
    </main>
  )
}
