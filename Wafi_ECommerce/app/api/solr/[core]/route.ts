import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { core: string } }) {
  const SOLR_URL = process.env.SOLR_URL;
  const SOLR_USERNAME = process.env.SOLR_USERNAME;
  const SOLR_PASSWORD = process.env.SOLR_PASSWORD;

  if (!SOLR_URL || !SOLR_USERNAME || !SOLR_PASSWORD) {
    return NextResponse.json(
      { error: 'Solr environment variables are not configured' },
      { status: 500 }
    );
  }

  const { core } = params;
  if (!core) {
    return NextResponse.json({ error: 'Core is required' }, { status: 400 });
  }

  const searchParams = req.nextUrl.searchParams;
  const solrEndpoint = `${SOLR_URL}/${core}/select?${searchParams.toString()}`;

  const auth = Buffer.from(`${SOLR_USERNAME}:${SOLR_PASSWORD}`).toString('base64');

  try {
    const resp = await fetch(solrEndpoint, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      // Avoid caching in API route; upstream caching can be handled in server components if needed
      cache: 'no-store',
    });

    const body = await resp.text();

    // Pass-through status and JSON content
    const out = new NextResponse(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return out;
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to reach Solr', details: e?.message || String(e) },
      { status: 502 }
    );
  }
}
