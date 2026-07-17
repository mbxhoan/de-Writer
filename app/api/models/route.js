import { NextResponse } from 'next/server';

import { loadProviderModels } from '@/lib/phase-one/service';

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await loadProviderModels(body.provider));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể tải danh sách model.' }, { status: 400 });
  }
}
