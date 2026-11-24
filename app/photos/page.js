'use client';

import TopNav from '@/components/TopNav';
import PhotoLibrary, { usePhotos } from '@/components/PhotoLibrary';

export default function PhotosPage() {
  const lib = usePhotos();
  return (
    <>
      <TopNav />
      <div className="page">
        <div className="row between list-head">
          <h2>Photo library</h2>
          <span className="muted">{lib.photos.length} photos · stored on Cloudinary</span>
        </div>
        <p className="hint">
          Upload customer photos here (or straight from the editor). Use a <b>tag</b> such as the customer name to find them
          quickly. Photos marked <b>!</b> are low resolution and may print blurry.
        </p>
        <PhotoLibrary lib={lib} />
      </div>
    </>
  );
}
