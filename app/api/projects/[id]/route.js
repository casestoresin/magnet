import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EDITABLE = ['name', 'customer', 'phone', 'notes', 'status', 'unit', 'page', 'frame', 'grid', 'marks', 'layoutMode', 'items', 'pageCount', 'slots'];

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

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    await Project.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
