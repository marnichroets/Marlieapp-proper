# Reusable photo fetcher/verifier for bird-library batches.
# Reads {commonName: wikipediaTitle} from batch_input.json, fetches each page's
# image via the Wikipedia API, HEAD-checks it returns 200/image, and writes the
# verified URLs to batch_photos.json. Polite delays + retries avoid 429s.
import json, time, urllib.request, urllib.parse, sys

inp = json.load(open("batch_input.json", encoding="utf-8"))
UA = {"User-Agent": "MarlieApp/1.0 (bird library; contact marnichroets@gmail.com)"}

def thumb(title):
    q = urllib.parse.urlencode({"action": "query", "titles": title, "prop": "pageimages",
                                "format": "json", "pithumbsize": "500", "redirects": "1"})
    req = urllib.request.Request(f"https://en.wikipedia.org/w/api.php?{q}", headers=UA)
    page = next(iter(json.load(urllib.request.urlopen(req, timeout=30))["query"]["pages"].values()))
    return page.get("thumbnail", {}).get("source")

def head_ok(u):
    req = urllib.request.Request(u, method="HEAD", headers=UA)
    r = urllib.request.urlopen(req, timeout=30)
    return r.status, r.headers.get("Content-Type")

out = {}
failed = []
for common, title in inp.items():
    ok = False
    for attempt in range(5):
        try:
            u = thumb(title)
            time.sleep(1.5)
            if not u:
                print(f"NO IMAGE  {common} ({title})"); break
            st, ct = head_ok(u)
            if st == 200 and str(ct).startswith("image"):
                out[common] = u; print(f"OK   {common}"); ok = True; break
            print(f"retry {common} {st} {ct}"); time.sleep(4)
        except Exception as e:
            print(f"retry {common}: {e}"); time.sleep(5)
    if not ok:
        failed.append(common)
    time.sleep(1.0)

json.dump(out, open("batch_photos.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"\nverified {len(out)}/{len(inp)} -> batch_photos.json")
if failed:
    print("FAILED:", ", ".join(failed)); sys.exit(1)
