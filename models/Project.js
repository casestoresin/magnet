import mongoose from 'mongoose';

const Mixed = mongoose.Schema.Types.Mixed;

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Untitled magnet sheet' },
    customer: { type: String, default: '' },
    phone: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, default: 'draft' }, // draft | ready | printed | delivered
    unit: { type: String, default: 'mm' },
    page: { type: Mixed, default: {} },
    frame: { type: Mixed, default: {} },
    grid: { type: Mixed, default: {} },
    marks: { type: Mixed, default: {} },
    pageCount: { type: Number, default: 1 },
    slots: { type: [Mixed], default: [] },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
