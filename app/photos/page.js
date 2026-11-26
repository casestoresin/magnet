'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import PhotoLibrary, { usePhotos } from '@/components/PhotoLibrary';
import { api } from '@/lib/api';

export default function PhotosPage() {
  const lib = usePhotos();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api
      .listProjects()
      .then((d) =>
        setOrders(
          d.projects.map((p) => ({
            _id: p._id,
            label: `${p.orderNumber ? `#${p.orderNumber}` : p.name}${p.customer ? ` — ${p.customer}` : ''} (${p.photoCount})`,
          }))
        )
      )
      .catch(() => {});
  }, []);

  return (
    <>
      <TopNav />
      <div className="page">
        <div className="row between list-head">
          <h2>Photo library</h2>
          <span className="muted">{lib.photos.length} photos · stored on Cloudinary</span>
        </div>
        <p className="hint">
          Photos uploaded inside an order belong to that order and only show up there. Upload <b>stickers</b> (transparent PNGs, tag
          “sticker”) here so they can be used on every order. Photos marked <b>!</b> are low resolution.
        </p>
        <PhotoLibrary lib={lib} orders={orders} />
      </div>
    </>
  );
}
