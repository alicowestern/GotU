import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// In-memory geocode cache to respect OpenStreetMap Nominatim rate limits (max 1 req/sec)
const geocodeCache = new Map<string, { address: string; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
let lastRequestTime = 0;

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: 'Latitude and longitude parameters required.' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid coordinate range.' }, { status: 400 });
    }

    // Cache key rounded to ~100 meters (3 decimal places) for rate limiting & privacy
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = geocodeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          address: cached.address,
          cached: true,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Rate limit check: ensure 1 sec delay between upstream Nominatim requests
    const now = Date.now();
    if (now - lastRequestTime < 1000) {
      const delay = 1000 - (now - lastRequestTime);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    lastRequestTime = Date.now();

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`;

    const upstreamRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'GotU-LiveMap/1.0 (privacy-location-sharing-app)',
        'Accept-Language': 'en',
      },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { success: false, address: 'Approximate address unavailable' },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const data = await upstreamRes.json();
    const displayName = data.display_name;

    if (!displayName) {
      return NextResponse.json(
        { success: false, address: 'Approximate address unavailable' },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Format as "Approximate address"
    const formattedAddress = `Approximate address: ${displayName}`;
    geocodeCache.set(cacheKey, { address: formattedAddress, timestamp: Date.now() });

    return NextResponse.json(
      {
        success: true,
        address: formattedAddress,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return NextResponse.json(
      { success: false, address: 'Approximate address unavailable' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
