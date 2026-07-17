import { exportPostZip } from '@/lib/phase-one/service';

export async function GET(_request, { params }) {
  const result = await exportPostZip(params.postId);

  return new Response(result.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    },
  });
}
