#!/usr/bin/env python3
"""
Register WatchRugby.top via Porkbun API.

Porkbun (https://porkbun.com) — cheap, no frills, public API.
Pricing (approx): .top ~$59/yr, .xyz ~$9/yr, .site ~$16/yr,
                 .fun ~$24/yr, .space ~$22/yr, .online ~$16/yr

Cheapest sustained: .xyz at ~$9/yr.

Prereqs:
  - Porkbun account (free to open at porkbun.com)
  - Settings → API Key → create a key (needs "domain register/modify")
  - Pass key + secret via env PORKBUN_API_KEY / PORKBUN_API_SECRET, or --key/--secret

Usage:
  export PORKBUN_API_KEY="your-key"
  export PORKBUN_API_SECRET="your-secret"
  python3 register_watchrugby.py

Or:
  python3 register_watchrugby.py --key KEY --secret SECRET
"""
import argparse, os, sys, json, urllib.request, urllib.parse, time, ssl

PORKBUN_BASE = "https://api.porkbun.com/api/v3"

def porkbun_call(endpoint, params=None, method="GET"):
    """Call Porkbun API and return parsed JSON."""
    url = f"{PORKBUN_BASE}/{endpoint}"
    data = None
    if params:
        data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if method in ("POST", "PUT", "DELETE"):
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    # Auth: basic auth with api_key:api_secret
    api_key = os.environ.get("PORKBUN_API_KEY") or ""
    api_secret = os.environ.get("PORKBUN_API_SECRET") or ""
    if api_key and api_secret:
        import base64
        creds = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
        req.add_header("Authorization", f"Basic {creds}")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            body = resp.read().decode("utf-8", "replace")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8", "replace")
            return e.code, json.loads(body)
        except:
            return e.code, {"error": body}
    except Exception as e:
        return None, {"error": str(e)}

def check_domain(domain):
    """Check if domain is available."""
    status, resp = porkbun_call("domains/expiry", {"domain": domain})
    if status == 200 and resp.get("result"):
        # Returns expiry info if registered; empty if not
        return False  # registered
    # If we get an error indicating not found, it's available
    if status == 404 or (isinstance(resp, dict) and "error" in resp):
        return True
    # Fallback: try domains/prices to see if it's purchasable
    status2, resp2 = porkbun_call("domains/prices", {"domain": domain})
    if status2 == 200 and resp2.get("result"):
        return True
    return None  # uncertain

def register_domain(domain, years=1, nameservers=None):
    """Register a domain."""
    status, resp = porkbun_call("domains/register", {
        "domain": domain,
        "years": years,
        "seowhois": "1",  # privacy
        "ns": nameservers or "namecheap.com",  # default nameservers
    }, method="POST")
    return status, resp

def main():
    ap = argparse.ArgumentParser(description="Register WatchRugby domain via Porkbun")
    ap.add_argument("--key", default=os.environ.get("PORKBUN_API_KEY"), help="Porkbun API key")
    ap.add_argument("--secret", default=os.environ.get("PORKBUN_API_SECRET"), help="Porkbun API secret")
    ap.add_argument("--domain", default="watchrugby.xyz", help="Domain to register (default: watchrugby.xyz — cheapest)")
    ap.add_argument("--years", type=int, default=1, help="Registration years (default: 1)")
    ap.add_argument("--nameservers", default="porkbun.com", help="Nameservers (default: porkbun.com free DNS)")
    ap.add_argument("--check-only", action="store_true", help="Just check availability, don't register")
    args = ap.parse_args()

    os.environ["PORKBUN_API_KEY"] = args.key or ""
    os.environ["PORKBUN_API_SECRET"] = args.secret or ""

    if not args.key or not args.secret:
        print("ERROR: No Porkbun credentials. Set PORKBUN_API_KEY and PORKBUN_API_SECRET env vars, or pass --key/--secret.")
        print("Get them at: https://porkbun.com/settings/api")
        sys.exit(1)

    domain = args.domain
    print(f"Checking availability of {domain}...")
    available = check_domain(domain)
    if available is True:
        print(f"✓ {domain} is AVAILABLE")
    elif available is False:
        print(f"✗ {domain} is ALREADY REGISTERED — pick another TLD")
        sys.exit(1)
    else:
        print(f"? Uncertain whether {domain} is available (API response unclear)")
        print("Proceeding anyway...")

    if args.check_only:
        print("Check-only mode — not registering.")
        sys.exit(0)

    confirm = input(f"Register {domain} for {args.years} year(s)? Cost approx ${9 if domain.endswith('.xyz') else 59 if domain.endswith('.top') else 16} / year. [y/N] ")
    if confirm.lower() not in ("y", "yes"):
        print("Cancelled.")
        sys.exit(0)

    print(f"Registering {domain}...")
    status, resp = register_domain(domain, args.years, args.nameservers)
    
    if status == 200 and resp.get("status") == "success":
        print(f"\n✓ Registration submitted for {domain}")
        print(f"  Order ID: {resp.get('orderId', 'see response')}")
        print(f"  Response: {json.dumps(resp, indent=2)}")
        print("\nCheck your Porkbun dashboard for confirmation.")
        print(f"Once registered, point DNS at your hosting provider.")
    else:
        print(f"\n✗ Registration failed (HTTP {status})")
        print(f"  Response: {json.dumps(resp, indent=2)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
