#!/usr/bin/env python3
"""
Register WatchRugby.xyz (cheapest available TLD ~$9/yr) via Porkbun API.

Porkbun: https://porkbun.com — cheap registrar, public JSON API, no frills.
First-year promos often drop .xyz to ~$1-9.

Prereqs (you do these):
  1. Open a Porkbun account (free) at porkbun.com
  2. Settings → API Key → create a key with "Domains: add/modify" permission
  3. Copy the API key + secret
  4. Pass them via env vars or CLI args

Usage:
  export PORKBUN_API_KEY="pk_..."   # from porkbun.com/settings/api
  export PORKBUN_API_SECRET="redacted..."  # from porkbun.com/settings/api
  python3 register-domain.py

Or:
  python3 register-domain.py --key pk_... --secret redacted...
"""
import argparse, os, sys, json, urllib.request, urllib.parse, ssl, base64

PORKBUN_BASE = "https://api.porkbun.com/api/v3"


def porkbun_call(endpoint, params=None, method="GET"):
    url = f"{PORKBUN_BASE}/{endpoint}"
    data = None
    if params:
        data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if method in ("POST", "PUT", "DELETE"):
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    api_key = os.environ.get("PORKBUN_API_KEY", "")
    api_secret = os.environ.get("PORKBUN_API_SECRET", "")
    if api_key and api_secret:
        creds = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
        req.add_header("Authorization", f"Basic {creds}")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            body = resp.read().decode("utf-8", "replace")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8", "replace"))
        except Exception:
            return e.code, {"error": e.read().decode("utf-8", "replace")}
    except Exception as e:
        return None, {"error": str(e)}


def check_domain(domain):
    """Check availability. Returns True=available, False=registered, None=uncertain."""
    status, resp = porkbun_call("domains/prices", {"domain": domain})
    if status == 200 and isinstance(resp.get("result"), list) and resp["result"]:
        # Has pricing entry → purchasable → available
        return True
    if status == 200 and (resp.get("result") is None or resp.get("result") == []):
        return True
    if status in (404, 400):
        err = resp.get("error", "").lower()
        if "available" in err or "not found" in err or "invalid" in err:
            return True
    # If we got valid JSON with a result that looks like pricing, it's available
    if status == 200 and isinstance(resp.get("result"), list):
        return True
    return None


def register_domain(domain, years=1, nameservers=None):
    status, resp = porkbun_call("domains/register", {
        "domain": domain,
        "years": years,
        "seowhois": "1",
        "ns": nameservers or "porkbun.com",
    }, method="POST")
    return status, resp


def main():
    ap = argparse.ArgumentParser(description="Register WatchRugby domain via Porkbun")
    ap.add_argument("--key", default=os.environ.get("PORKBUN_API_KEY"), help="Porkbun API key")
    ap.add_argument("--secret", default=os.environ.get("PORKBUN_API_SECRET"), help="Porkbun API secret")
    ap.add_argument("--domain", default="watchrugby.xyz", help="Domain to register (default: watchrugby.xyz)")
    ap.add_argument("--years", type=int, default=1, help="Registration years (default: 1)")
    ap.add_argument("--check-only", action="store_true", help="Check availability only, don't register")
    args = ap.parse_args()

    os.environ["PORKBUN_API_KEY"] = args.key or ""
    os.environ["PORKBUN_API_SECRET"] = args.secret or ""

    if not args.key or not args.secret:
        print("ERROR: No Porkbun credentials.")
        print("Get them at https://porkbun.com/settings/api")
        print("Then: export PORKBUN_API_KEY='pk_...' PORKBUN_API_SECRET='redacted...'")
        sys.exit(1)

    domain = args.domain
    print(f"Checking {domain}...")
    avail = check_domain(domain)
    if avail is True:
        print(f"✓ {domain} AVAILABLE")
    elif avail is False:
        print(f"✗ {domain} TAKEN")
        sys.exit(1)
    else:
        print(f"? Unclear from API — trying registration anyway")

    if args.check_only:
        print("Check-only — not registering.")
        sys.exit(0)

    confirm = input(f"Register {domain} ({args.years}yr)? Cost ~$9/yr. [y/N] ")
    if confirm.lower() not in ("y", "yes"):
        print("Cancelled.")
        sys.exit(0)

    print(f"Registering {domain}...")
    status, resp = register_domain(domain, args.years)
    if status == 200 and resp.get("status") == "success":
        print(f"\n✓ Registered {domain}")
        print(f"  Order: {resp.get('orderId', '?')}")
        print(f"  Full response: {json.dumps(resp, indent=2)}")
        print("\nCNAME file already set to watchrugby.xyz in the repo.")
        print("Push the CNAME and GitHub Pages will pick it up on next build.")
    else:
        print(f"\n✗ Failed (HTTP {status}): {json.dumps(resp, indent=2)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
