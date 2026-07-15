from fastapi import APIRouter

from app.schemas import MarketTicker

router = APIRouter(prefix="/markets", tags=["markets"])

# Seed market data — replace with exchange feeds later
_MARKETS: list[MarketTicker] = [
    MarketTicker(symbol="BTC-USD", name="Bitcoin", price=68420.55, change_24h=2.14, volume_24h=28_400_000_000),
    MarketTicker(symbol="ETH-USD", name="Ethereum", price=3521.80, change_24h=-0.86, volume_24h=12_100_000_000),
    MarketTicker(symbol="SOL-USD", name="Solana", price=178.42, change_24h=4.52, volume_24h=3_200_000_000),
    MarketTicker(symbol="XRP-USD", name="XRP", price=0.6124, change_24h=1.05, volume_24h=1_800_000_000),
    MarketTicker(symbol="AVAX-USD", name="Avalanche", price=36.91, change_24h=-1.72, volume_24h=540_000_000),
]


@router.get("/tickers", response_model=list[MarketTicker])
def list_tickers() -> list[MarketTicker]:
    return _MARKETS
