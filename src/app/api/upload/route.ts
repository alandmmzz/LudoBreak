import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const MAX_PDF_SIZE = 20 * 1024 * 1024
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const isRules = formData.get('kind') === 'rules'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: isRules ? 'Selecciona un PDF' : 'Selecciona una imagen' }, { status: 400 })
    }

    if (isRules) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Las reglas deben ser un archivo PDF' }, { status: 400 })
      }
      if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: 'El PDF no puede superar 20 MB' }, { status: 400 })
      }
      const blob = await put(`rules/${crypto.randomUUID()}.pdf`, file, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/pdf',
      })
      return NextResponse.json({ url: blob.url })
    }

    if (!imageTypes.has(file.type)) {
      return NextResponse.json({ error: 'Usa JPG, PNG o WebP' }, { status: 400 })
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 8 MB' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const blob = await put(`games/${crypto.randomUUID()}.${extension}`, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('[v0] Upload failed:', error)
    return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500 })
  }
}
