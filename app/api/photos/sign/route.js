import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/photos/sign — signature so the browser can upload straight to Cloudinary
// (avoids hosting body-size limits like Vercel's 4.5 MB)
// body { kind: 'label' } puts the file in the labels sub-folder
export async function POST(req) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const timestamp = Math.round(Date.now() / 1000);
  const base = process.env.CLOUDINARY_FOLDER || 'custom-magnets';
  const folder = body.kind === 'label' ? `${base}/labels` : base;
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET);
  return NextResponse.json({ timestamp, folder, signature, apiKey: CLOUDINARY_API_KEY, cloudName: CLOUDINARY_CLOUD_NAME });
}
