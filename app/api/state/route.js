import { NextResponse } from 'next/server';

import {
  getHydratedState,
  saveProviderCredential,
  updateWorkspace,
} from '@/lib/phase-one/service';

export async function GET() {
  return NextResponse.json(await getHydratedState());
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    if (body.action === 'workspace') {
      return NextResponse.json(await updateWorkspace(body.payload));
    }

    if (body.action === 'credential') {
      return NextResponse.json(await saveProviderCredential(body.payload));
    }

    return NextResponse.json({ error: 'Action không hợp lệ.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể cập nhật workspace.' }, { status: 400 });
  }
}
