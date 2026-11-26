import mongoose from 'mongoose';

const Mixed = mongoose.Schema.Types.Mixed;

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Untitled magnet sheet' },
    orderNumber: { type: String, default: '', index: true },
    customer: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    platform: { type: String, default: '' },
    courier: { type: String, default: '' },
    awb: { type: String, default: '' },
    payment: { type: String, default: '' },
    codAmount: { type: String, default: '' },
    label: { type: Mixed, default: null }, // { url, publicId, format, preview }
    notes: { type: String, default: '' },
    status: { type: String, default: 'draft' }, // draft | ready | printed | delivered
    unit: { type: String, default: 'mm' },
    page: { type: Mixed, default: {} },
    frame: { type: Mixed, default: {} },
    grid: { type: Mixed, default: {} },
    marks: { type: Mixed, default: {} },
    layoutMode: { type: String, default: 'grid' },
    items: { type: [Mixed], default: [] },
    pageCount: { type: Number, default: 1 },
    slots: { type: [Mixed], default: [] },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
