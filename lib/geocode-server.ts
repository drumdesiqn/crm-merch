interface LatLng { lat: number; lng: number }

async function nominatimFetch(q: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=be`,
      { headers: { "User-Agent": "MarsmerchApp/1.0" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data: { lat: string; lon: string }[] = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    // silently ignore geocoding errors
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function geocodeAddressServer(
  address: string,
  zip: string,
  city: string
): Promise<LatLng | null> {
  // Try 1: full address
  let result = await nominatimFetch(`${address}, ${zip} ${city}, Belgium`);
  if (result) return result;

  // Try 2: zip + city (more reliable for rural areas)
  await sleep(1100);
  if (zip && city) {
    result = await nominatimFetch(`${zip} ${city}, Belgium`);
    if (result) return result;
  }

  // Try 3: city only (last resort)
  await sleep(1100);
  if (city) {
    result = await nominatimFetch(`${city}, Belgium`);
  }

  return result;
}
