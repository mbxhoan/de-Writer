import { NextResponse } from 'next/server';

import { removeProduct, upsertProduct } from '@/lib/phase-one/service';

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await upsertProduct(body));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể lưu sản phẩm.' }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await removeProduct(searchParams.get('productId')));
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Không thể xoá sản phẩm.' }, { status: 400 });
  }
}
