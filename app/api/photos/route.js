import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { uploadBuffer } from '@/lib/cloudinary';
import Photo from '@/models/Photo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/photos?q=search&tag=customer
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const tag = searchParams.get('tag');
    const filter = {};
    if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { tag: { $regex: q, $options: 'i' } }];
    if (tag) filter.tag = tag;
    const photos = await Photo.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    const tags = await Photo.distinct('tag', { tag: { $ne: '' } });
    return NextResponse.json({ photos, tags });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/photos
//  - JSON { tag, photos: [{ name, url, publicId, width, height, bytes, format }] }  (after direct browser upload)
//  - multipart: files[], tag  (server-side upload fallback)
export async function POST(req) {
  try {
    await connectDB();

    if ((req.headers.get('content-type') || '').includes('application/json')) {
      const body = await req.json();
      const tag = (body.tag || '').toString().trim();
      const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
      const items = (body.photos || []).filter((p) => p && typeof p.url === 'string' && p.url.startsWith(prefix) && p.publicId);
      if (!items.length) return NextResponse.json({ error: 'No valid photos' }, { status: 400 });
      const photos = await Photo.insertMany(
        items.map((p) => ({
          name: String(p.name || ''),
          url: p.url,
          publicId: String(p.publicId),
          width: Number(p.width) || 0,
          height: Number(p.height) || 0,
          bytes: Number(p.bytes) || 0,
          format: String(p.format || ''),
          tag,
        }))
      );
      return NextResponse.json({ photos, errors: [] }, { status: 201 });
    }

    const form = await req.formData();
    const files = form.getAll('files').filter((f) => typeof f === 'object' && f.size > 0);
    const tag = (form.get('tag') || '').toString().trim();
    if (!files.length) return NextResponse.json({ error: 'No files received' }, { status: 400 });

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const r = await uploadBuffer(buffer);
        return Photo.create({
          name: file.name || r.original_filename,
          url: r.secure_url,
          publicId: r.public_id,
          width: r.width,
          height: r.height,
          bytes: r.bytes,
          format: r.format,
          tag,
        });
      })
    );

    const photos = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason?.message || 'Upload failed');
    return NextResponse.json({ photos, errors }, { status: photos.length ? 201 : 500 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
