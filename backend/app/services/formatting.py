"""Currency formatting helpers for human-readable insights and chat replies."""

CURRENCY_SYMBOLS = {
    "INR": "₹",
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "AED": "AED ",
    "JPY": "¥",
    "CAD": "C$",
    "AUD": "A$",
    "SGD": "S$",
}


def currency_symbol(code: str | None) -> str:
    return CURRENCY_SYMBOLS.get((code or "INR").upper(), f"{code} ")


def format_money(amount: float, currency: str = "INR") -> str:
    symbol = currency_symbol(currency)
    value = float(amount or 0)
    # Indian grouping for INR, standard thousands elsewhere.
    if currency.upper() == "INR":
        formatted = f"{value:,.2f}"
        return f"{symbol}{formatted}"
    return f"{symbol}{value:,.2f}"
