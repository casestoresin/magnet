import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: Number,
    height: Number,
    bytes: Number,
    format: String,
    tag: { type: String, default: '' }, // e.g. customer / order name
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true }, // order it belongs to
  },
  { timestamps: true }
);

export default mongoose.models.Photo || mongoose.model('Photo', PhotoSchema);
