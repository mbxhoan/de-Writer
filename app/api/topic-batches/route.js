import { NextResponse } from 'next/server';

import { createTopicBatch, materializeTopics } from '@/lib/phase-one/service';

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createTopicBatch(body));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể tạo batch chủ đề.' }, { status: 400 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await materializeTopics(body));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể lưu chủ đề thành bài viết.' }, { status: 400 });
  }
}
