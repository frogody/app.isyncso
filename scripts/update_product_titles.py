#!/usr/bin/env python3
"""Update product titles from bol.com placement URLs"""
import json, urllib.request, re, time, sys

SUPABASE_URL = 'https://sfxpmzicgpaxfntqleig.supabase.co'
SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU'
COMPANY_ID = '2c32e328-e47c-434d-8f0e-78dcfb745837'

def call_bolcom(action, **kwargs):
    payload = json.dumps({'action': action, 'companyId': COMPANY_ID, **kwargs}).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/functions/v1/bolcom-api',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {SERVICE_KEY}'},
        method='POST'
    )
    resp = urllib.request.urlopen(req, timeout=60)
    return json.loads(resp.read().decode())

def extract_title_from_url(url):
    """Extract and format product title from bol.com URL slug"""
    match = re.search(r'/p/([^/]+)/', url)
    if not match:
        return None
    slug = match.group(1)
    title = slug.replace('-', ' ')

    # Fix known brand names
    title = re.sub(r'\byo no\b', 'YO&NO', title, flags=re.IGNORECASE)
    title = re.sub(r'\bsparkle14\b', 'Sparkle14', title, flags=re.IGNORECASE)

    # Fix decimal numbers before units: "0 8 mm" -> "0.8 mm", "2 8 mm" -> "2.8 mm"
    title = re.sub(r'(\d+) (\d+) ?(mm|cm|gr|g)\b', r'\1.\2 \3', title)
    # Also: "8 5mm" -> "8.5 mm", "5 6mm" -> "5.6 mm"
    title = re.sub(r'(\d+) (\d+)(mm|cm|gr|g)\b', r'\1.\2 \3', title)
    # And standalone: "19cm" -> "19 cm"
    title = re.sub(r'(\d+)(mm|cm|gr|g)\b', r'\1 \2', title)

    # Title case each word
    words = title.split()
    result = []
    units = {'mm', 'cm', 'm', 'gr', 'g', 'kg', 'ml', 'l'}
    for i, word in enumerate(words):
        if word.upper() == word and len(word) > 1 and not word.isdigit():
            result.append(word)  # Keep already-uppercase like "YO&NO"
        elif word.lower() in units:
            result.append(word.lower())  # Units lowercase
        elif re.match(r'^[\d.]+$', word):
            result.append(word)  # Keep numbers as-is
        else:
            result.append(word.capitalize())

    return ' '.join(result)

def fetch_products(offset=0, limit=1000):
    url = f'{SUPABASE_URL}/rest/v1/products?select=id,name,ean&company_id=eq.{COMPANY_ID}&ean=not.is.null&ean=neq.&offset={offset}&limit={limit}'
    req = urllib.request.Request(url, headers={
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
    })
    return json.loads(urllib.request.urlopen(req).read().decode())

def main():
    print("=== Product Title Update from bol.com ===", flush=True)

    # Step 1: Fetch ALL products with EANs
    all_products = []
    offset = 0
    while True:
        batch = fetch_products(offset)
        if not batch:
            break
        all_products.extend(batch)
        offset += len(batch)
        if len(batch) < 1000:
            break

    # Step 2: Filter to products with old-style names
    needs_update = []
    for p in all_products:
        name = p.get('name', '') or ''
        # Products with code-style names: "YO&NO - 1328286" or "YO&NO - 10.02231/10.05394"
        if re.match(r'^YO&NO\s*-\s*[\d./]+$', name):
            needs_update.append(p)
        # Also very short non-descriptive: "YO&NO - XXXX" under 25 chars
        elif re.match(r'^YO&NO\s*-\s*\S+$', name) and len(name) < 25:
            needs_update.append(p)

    print(f"Total products: {len(all_products)}", flush=True)
    print(f"Products needing title update: {len(needs_update)}", flush=True)

    # Step 3: Fetch bol.com titles and update
    updated = 0
    errors = 0
    not_on_bolcom = 0
    already_good = 0

    for i, product in enumerate(needs_update):
        ean = product['ean'].strip()
        current_name = product['name']

        try:
            result = call_bolcom('enrichProduct', ean=ean)
            placement = result.get('data', {}).get('placement', {})
            url = placement.get('url', '')

            if not url:
                not_on_bolcom += 1
                continue

            new_title = extract_title_from_url(url)
            if not new_title or new_title == current_name:
                already_good += 1
                continue

            # Update the product name
            update_url = f'{SUPABASE_URL}/rest/v1/products?id=eq.{product["id"]}'
            update_data = json.dumps({'name': new_title}).encode()
            update_req = urllib.request.Request(update_url, data=update_data, headers={
                'apikey': SERVICE_KEY,
                'Authorization': f'Bearer {SERVICE_KEY}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            }, method='PATCH')
            urllib.request.urlopen(update_req)
            updated += 1

            if updated <= 20:
                print(f'  Updated: "{current_name}" -> "{new_title}"', flush=True)

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f'  Error for EAN {ean}: {e}', flush=True)

        # Progress every 25
        if (i + 1) % 25 == 0:
            print(f'  [{i+1}/{len(needs_update)}] updated={updated} not_on_bol={not_on_bolcom} errors={errors}', flush=True)

        # Rate limiting
        time.sleep(0.8)

    print(f'\n=== Done! ===', flush=True)
    print(f'  Updated: {updated}', flush=True)
    print(f'  Not on bol.com: {not_on_bolcom}', flush=True)
    print(f'  Already good: {already_good}', flush=True)
    print(f'  Errors: {errors}', flush=True)

if __name__ == '__main__':
    main()
