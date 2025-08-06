export const fetchXRPPriceApi = async () => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    return data.ripple.usd;
  } catch (error) {
    console.error("Error fetching XRP price:", error);
    throw error;
  }
}