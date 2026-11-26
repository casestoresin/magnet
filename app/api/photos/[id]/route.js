import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import cloudinary from '@/lib/cloudinary';
import Photo from '@/models/Photo';

export const runtime = 'nodejs';

// PATCH /api/photos/:id  { name?, tag? }
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    const update = {};
    if (typeof body.name === 'string') update.name = body.name;
    if (typeof body.tag === 'string') update.tag = body.tag.trim();
    if (body.project === null || (typeof body.project === 'string' && /^[a-f0-9]{24}$/i.test(body.project))) update.project = body.project;
    const photo = await Photo.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ photo });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/photos/:id  — removes from Cloudinary and MongoDB
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const photo = await Photo.findById(id);
    if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    try {
      await cloudinary.uploader.destroy(photo.publicId);
    } catch (err) {
      console.error('Cloudinary delete failed', err);
    }
    await photo.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
