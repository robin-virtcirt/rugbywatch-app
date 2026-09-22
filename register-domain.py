#!/usr/bin/env python3
"""
Manage WatchRugby.app via Porkbun API (already registered).

Porkbun API — base URL: https://api.porkbun.com/api/json/v3
Auth: X-API-Key + X-Secret-API-Key headers. Docs: https://porkbun.com/api/json/v3/documentation

Usage:
  export PORKBUN_API_KEY='pk_...'
  export PORKBUN_API_SECRET='sk1_...'
  python3 register-domain.py --check            # verify domain is registered
  python3 register-domain.py --list             # list all domains
  python3 register-domain.py --domain foo.app   # check a different domain
"""
import argparse, os, sys, json, urllib.request, urllib.parse, ssl

PORKBUN_BASE = "https://api.porkbun.com/api/json/v3"


def porkbun_call(endpoint, body=None, method=None):
    """Call Porkbun API. GET if body is None, else POST."""
    url = f"{PORKBUN_BASE}/{endpoint}"
    if method is None:
        method = "POST" if body is not None else "GET"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    else:
        data = None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    api_key = os.environ.get("PORKBUN_API_KEY", "")
    api_secret = os.environ.get("PORKBUN_API_SECRET", "")
    if api_key and api_secret:
        req.add_header("X-API-Key", api_key)
        req.add_header("X-Secret-API-Key", api_secret)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            raw = resp.read().decode("utf-8", "replace")
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw_err = e.read()
        try:
            return e.code, json.loads(raw_err.decode("utf-8", "replace"))
        except Exception:
            return e.code, {"error": raw_err.decode("utf-8", "replace")[:300]}
    except Exception as e:
        return None, {"error": str(e)}


def check_domain(domain):
    """Check availability. Returns (available: bool, price: str, currency: str)."""
    for ep, body in [("domains/check", {"domain": domain}), ("pricing/get", {})] :
        status, resp = porkbun_call(ep, body)
        if status != 200:
            continue
        if ep == "domains/check":
            result = resp.get("result", {})
            available = result.get("available") == "yes" or result.get("available") is True
            price = result.get("price") or result.get("registration") or result.get("regPrice") or "?"
            currency = result.get("currency", "USD")
            return available, str(price), currency
        elif ep == "pricing/get":
            pricing = resp.get("pricing", {})
            tld = domain.split(".")[-1].lower()
            tld_info = pricing.get(tld, {})
            price = tld_info.get("registration", "?")
            currency = "USD"
            # If the check endpoint didn't give availability, use pricing as fallback
            # (registered domains still show pricing, so this is heuristic)
    return None, None, None


def list_domains():
    """List all domains in the account."""
    status, resp = porkbun_call("domains/list", {"limit": 100})
    if status != 200:
        return []
    return resp.get("result", [])


def register(domain, years=1, agree_to_terms="yes", whois_privacy=1, dry_run=False):
    """Register a domain. Returns (success: bool, response: dict)."""
    body = {
        "domain": domain,
        "years": years,
        "agreeToTerms": agree_to_terms,
        "whoisPrivacy": whois_privacy,
    }
    if dry_run:
        body["dryRun"] = True
    status, resp = porkbun_call("domains/create", body)
    return status == 200 and resp.get("status") == "SUCCESS", resp


def get_expiry(domain):
    """Get expiry date for a domain."""
    domains = list_domains()
    for d in domains:
        if d.get("domain", "").lower() == domain.lower():
            return d.get("expiryDate"), d.get("autoRenew"), d.get("price") or d.get("registration")
    return None, None, None


def main():
    ap = argparse.ArgumentParser(description="Manage WatchRugby.app via Porkbun API")
    ap.add_argument("--key", default=os.environ.get("PORKBUN_API_KEY"), help="Porkbun API key")
    ap.add_argument("--secret", default=os.environ.get("PORKBUN_API_SECRET"), help="Porkbun API secret")
    ap.add_argument("--domain", default="WatchRugby.app", help="Domain (default: WatchRugby.app)")
    ap.add_argument("--years", type=int, default=1, help="Years for registration (default: 1)")
    ap.add_argument("--check", action="store_true", help="Check availability + price only")
    ap.add_argument("--register", action="store_true", help="Register the domain")
    ap.add_argument("--list", action="store_true", help="List all domains in account")
    ap.add_argument("--dry-run", action="store_true", help="Dry-run registration (no charge)")
    args = ap.parse_args()

    os.environ["PORKBUN_API_KEY"] = args.key or ""
    os.environ["PORKBUN_API_SECRET"] = args.secret or ""

    if not args.key or not args.secret:
        print("ERROR: No Porkbun credentials. Set:")
        print("  export PORKBUN_API_KEY='pk_...'")
        print("  export PORKBUN_API_SECRET='sk1_...'")
        sys.exit(1)

    domain = args.domain

    if args.list:
        print(f"Domains in account ({domain}):")
        domains = list_domains()
        if not domains:
            print("  (none)")
        else:
            for d in domains:
                expiry = d.get("expiryDate", "?")
                auto = d.get("autoRenew", "?")
                price = d.get("price") or d.get("registration") or "?"
                print(f"  {d['domain']:30s} expiry={expiry}  autoRenew={auto}  price={price}")
        return

    if args.check:
        available, price, currency = check_domain(domain)
        if available is None:
            print(f"Could not check {domain} — API error")
            sys.exit(1)
        if available:
            print(f"✓ {domain} AVAILABLE — {currency} {price}/yr")
        else:
            print(f"✗ {domain} TAKEN — already registered")
            # Show expiry if known
            expiry, auto, _ = get_expiry(domain)
            if expiry:
                print(f"  Expires: {expiry}, auto-renew: {auto}")
        return

    if args.register:
        available, price, currency = check_domain(domain)
        if available is None:
            print(f"Could not check {domain} — API error")
            sys.exit(1)
        if not available:
            print(f"✗ {domain} is already registered — cannot register again")
            sys.exit(1)
        total = float(price) * args.years
        print(f"Registering {domain} for {args.years} year(s): {currency} {total:.2f}")
        if args.dry_run:
            print("Dry run — no charge. Add --register to actually register.")
            sys.exit(0)
        confirm = input(f"Confirm registration of {domain}? [y/N] ")
        if confirm.lower() not in ("y", "yes"):
            print("Cancelled.")
            sys.exit(0)
        success, resp = register(domain, args.years)
        if success:
            print(f"✓ Registered {domain}")
            print(f"  Order ID: {resp.get('orderId', '?')}")
            print(f"  Expires: {resp.get('expires') or resp.get('expiryDate') or 'see Porkbun dashboard'}")
        else:
            print(f"✗ Failed: {json.dumps(resp, indent=2)}")
            sys.exit(1)
        return

    # Default: just check
    print(f"Domain: {domain}")
    available, price, currency = check_domain(domain)
    if available is None:
        print("Could not check — API error")
        sys.exit(1)
    if available:
        print(f"  Status: AVAILABLE")
        print(f"  Price: {currency} {price}/yr")
    else:
        print(f"  Status: REGISTERED")
        expiry, auto, _ = get_expiry(domain)
        if expiry:
            print(f"  Expires: {expiry}")
            print(f"  Auto-renew: {auto}")


if __name__ == "__main__":
    main()
