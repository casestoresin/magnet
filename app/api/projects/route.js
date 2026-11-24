import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';
import { defaultProject } from '@/lib/presets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/projects — list (lightweight)
export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find({}).sort({ updatedAt: -1 }).lean();
    const list = projects.map((p) => {
      const filled = (p.slots || []).filter((s) => s && s.photoId);
      return {
        _id: p._id,
        name: p.name,
        customer: p.customer,
        status: p.status,
        unit: p.unit,
        page: p.page,
        frame: p.frame,
        pageCount: p.pageCount,
        magnetCount: filled.length,
        preview: filled.slice(0, 4).map((s) => s.url),
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
      };
    });
    return NextResponse.json({ projects: list });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/projects  — body: project fields, or { duplicateOf: id }
export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    let data;
    if (body.duplicateOf) {
      const src = await Project.findById(body.duplicateOf).lean();
      if (!src) return NextResponse.json({ error: 'Source project not found' }, { status: 404 });
      const { _id, createdAt, updatedAt, __v, ...rest } = src;
      data = { ...rest, name: `${src.name} (copy)`, status: 'draft' };
    } else {
      const base = defaultProject();
      data = {
        ...base,
        ...body,
        page: { ...base.page, ...(body.page || {}) },
        frame: { ...base.frame, ...(body.frame || {}) },
        grid: { ...base.grid, ...(body.grid || {}) },
        marks: { ...base.marks, ...(body.marks || {}) },
      };
    }
    const project = await Project.create(data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
