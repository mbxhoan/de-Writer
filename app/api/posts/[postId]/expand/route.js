import { NextResponse } from 'next/server';

import { expandPost } from '@/lib/phase-one/service';

export async function POST(_request, { params }) {
  try {
    return NextResponse.json(await expandPost(params.postId));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể mở rộng bài viết.' }, { status: 400 });
  }
}
