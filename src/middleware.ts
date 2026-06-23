import { type NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: [],
}

export async function middleware(request: NextRequest) {
  return NextResponse.next()
}
