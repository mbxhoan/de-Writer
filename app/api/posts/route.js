import { NextResponse } from 'next/server';

import { updatePost } from '@/lib/phase-one/service';

export async function PATCH(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await updatePost(body));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể lưu bài viết.' }, { status: 400 });
  }
}
