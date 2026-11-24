'use client';

import { useParams } from 'next/navigation';
import Editor from '@/components/editor/Editor';

export default function EditorPage() {
  const { id } = useParams();
  return <Editor id={id} />;
}
