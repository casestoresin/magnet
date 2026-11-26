import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import Photo from '@/models/Photo';
import cloudinary from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EDITABLE = [
  'orderNumber', 'address', 'city', 'state', 'pincode', 'platform', 'courier', 'awb', 'payment', 'codAmount', 'label',
  'name', 'customer', 'phone', 'notes', 'status', 'unit', 'page', 'frame', 'grid', 'marks', 'layoutMode', 'items', 'pageCount', 'slots'];

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const project = await Project.findById(id).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const body = await req.json();
    const update = {};
    for (const key of EDITABLE) if (key in body) update[key] = body[key];
    const project = await Project.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, updatedAt: project.updatedAt });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/projects/:id?photos=1  — also delete this order's photos (and label) from Cloudinary
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const withPhotos = new URL(req.url).searchParams.get('photos') === '1';
    const project = await Project.findByIdAndDelete(id).lean();
    let removed = 0;
    if (withPhotos && project) {
      const photos = await Photo.find({ project: id }).lean();
      const ids = photos.map((p) => p.publicId);
      if (project.label?.publicId) ids.push(project.label.publicId);
      for (let i = 0; i < ids.length; i += 100) {
        await cloudinary.api.delete_resources(ids.slice(i, i + 100)).catch((e) => console.error('Cloudinary delete failed', e));
      }
      removed = (await Photo.deleteMany({ project: id })).deletedCount;
    } else {
      // keep the photos but unlink them from the deleted order
      await Photo.updateMany({ project: id }, { $set: { project: null } });
    }
    return NextResponse.json({ ok: true, removedPhotos: removed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
