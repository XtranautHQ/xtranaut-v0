const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd';
const ONE_MINUTE_MS = 60_000;

type PriceCache = {
  price: number;
  updatedAt: number; // epoch ms
};

declare global {
  // eslint-disable-next-line no-var
  var __xrpPriceCache: PriceCache | undefined;
}

function getNow(): number {
  return Date.now();
}

async function fetchXrpPriceFromCoinGecko(): Promise<number> {
  const res = await fetch(
    COINGECKO_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY!
      } 
    }
  );
  
  if (!res.ok) {
    throw new Error(`CoinGecko error: ${res.status}`);
  }
  const data = await res.json();
  const price = data?.ripple?.usd;
  if (typeof price !== 'number') {
    throw new Error('Invalid CoinGecko response');
  }
  return price;
}

async function updateCache(): Promise<PriceCache> {
  try {
    const price = await fetchXrpPriceFromCoinGecko();
    const cache: PriceCache = { price, updatedAt: getNow() };
    globalThis.__xrpPriceCache = cache;
    return cache;
  } catch (err) {
    console.log('.................', err);
    // On failure, fall back to previous cache if present; otherwise default
    if (globalThis.__xrpPriceCache) {
      return globalThis.__xrpPriceCache;
    }
    const fallback: PriceCache = { price: 0.52, updatedAt: getNow() };
    globalThis.__xrpPriceCache = fallback;
    return fallback;
  }
}

export async function getXrpPriceCached(): Promise<number> {
  const cache = globalThis.__xrpPriceCache;
  if (cache && getNow() - cache.updatedAt < ONE_MINUTE_MS) {
    return cache.price;
  }
  const updated = await updateCache();
  return updated.price;
}

export async function refreshXrpPrice(): Promise<PriceCache> {
  return updateCache();
}

export function getXrpPriceCacheInfo(): PriceCache | undefined {
  return globalThis.__xrpPriceCache;
}

// Optional proactive refresh every minute in server environment
if (typeof window === 'undefined') {
  if (!globalThis.__xrpPriceCache) {
    // initialize lazily without blocking
    updateCache().catch(() => {});
  }
  setInterval(() => {
    updateCache().catch(() => {});
  }, ONE_MINUTE_MS);
}


