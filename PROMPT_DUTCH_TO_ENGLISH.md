## Task: Systematic Dutch → English UI Migration (All Phases)

### Context

The app.isyncso codebase has Dutch-language UI strings throughout the inventory/logistics modules. These crept in because the client (Blueprint) operates in the Netherlands and the build plan used Dutch workflow names. **All user-facing text must be in English** — the app is an international SaaS platform.

This is a **two-part task**:
1. **Part A**: Fix all existing Dutch strings in already-built code (Phase 0 + Phase 1 files)
2. **Part B**: Update `BLUEPRINT_BUILD_PLAN.md` so all future phases (2–5, Email Pool, Shopify) specify English UI labels

### Part A: Fix Existing Code

**IMPORTANT**: Only change **user-facing strings** (JSX text, placeholders, toast messages, button labels, dialog titles). Do NOT rename variables, functions, database columns, or code comments.

#### File 1: `src/components/purchases/ManualPurchaseModal.jsx` (~23 strings)

| Dutch | English |
|-------|---------|
| "Handmatige Inkoop" | "Manual Purchase" |
| "Voeg een nieuwe inkoop handmatig toe met producten, hoeveelheden en prijzen." | "Add a new purchase manually with products, quantities and prices." |
| "Leverancier" | "Supplier" |
| "Selecteer leverancier..." | "Select supplier..." |
| "Selecteer of vul een leverancier in" | "Select or enter a supplier" |
| "Naam nieuwe leverancier" | "New supplier name" |
| "+ Nieuw" | "+ New" |
| "Groepsnaam (optioneel)" | "Group Name (optional)" |
| "Datum" | "Date" |
| "Verkoopkanaal" | "Sales Channel" |
| "Onbepaald" | "Undecided" |
| "Producten" | "Products" |
| "Regel toevoegen" | "Add line" |
| "Regel" | "Line" |
| "Productnaam" | "Product name" |
| "Nieuw product — wordt automatisch aangemaakt!" | "New product — will be created automatically!" |
| "Aantal" | "Quantity" |
| "Prijs (ex BTW)" | "Price (excl. VAT)" |
| "Land" | "Country" |
| "Nederland" | "Netherlands" |
| "Duitsland" | "Germany" |
| "België" | "Belgium" |
| "Subtotaal" | "Subtotal" |
| "Bestel-URL" | "Order URL" |
| "Opmerking" | "Remark" |
| "Notities..." | "Notes..." |
| "producten" | "products" |
| "Totale hoeveelheid:" | "Total quantity:" |
| "Subtotaal (ex BTW)" | "Subtotal (excl. VAT)" |
| "incl. 21% BTW:" | "incl. 21% VAT:" |
| "Annuleren" | "Cancel" |
| "Inkoop Aanmaken" | "Create Purchase" |
| "Aanmaken..." | "Creating..." |
| "Inkoop succesvol aangemaakt!" | "Purchase created successfully!" |

#### File 2: `src/pages/StockPurchases.jsx` (~40 strings)

| Dutch | English |
|-------|---------|
| "Handmatige Inkoop" | "Manual Purchase" |
| "Factuur verzonden naar financiën" | "Invoice sent to finance" |
| "Fout bij verzenden:" | "Error sending:" |
| "Factuur goedgekeurd voor voorraad (niet naar financiën)" | "Invoice approved for inventory (not sent to finance)" |
| "Fout bij goedkeuren:" | "Error approving:" |
| "AI Betrouwbaarheid" | "AI Confidence" |
| "Origineel document" | "Original document" |
| "Open in nieuw tabblad" | "Open in new tab" |
| "Leverancier" | "Supplier" |
| "Subtotaal" | "Subtotal" |
| "BTW" | "VAT" |
| "Opmerkingen" | "Remarks" |
| "Eventuele opmerkingen bij de beoordeling..." | "Any remarks about the review..." |
| "Mogelijk duplicaat gevonden!" | "Possible duplicate found!" |
| "Er bestaat al een factuur met hetzelfde nummer" | "An invoice with the same number already exists" |
| "van" | "from" |
| "op" | "on" |
| "Weet je zeker dat je dit als nieuwe factuur wilt toevoegen?" | "Are you sure you want to add this as a new invoice?" |
| "Annuleren" | "Cancel" |
| "Toch toevoegen" | "Add anyway" |
| "Versturen naar financiën?" | "Send to finance?" |
| "Nee, alleen voorraad" | "No, inventory only" |
| "Ja, naar financiën" | "Yes, to finance" |
| "Onbepaald" | "Undecided" |
| "facturen" | "invoices" |
| "Ongeldig bestandstype. Upload een afbeelding (JPG, PNG, WebP) of PDF." | "Invalid file type. Upload an image (JPG, PNG, WebP) or PDF." |
| "Bestand is te groot. Maximum is 50MB." | "File is too large. Maximum is 50MB." |
| "PDF wordt geconverteerd en tekst wordt geëxtraheerd..." | "Converting PDF and extracting text..." |
| "Geen respons van de server" | "No response from server" |
| "Sleep een bestand hierheen of klik om te selecteren" | "Drag a file here or click to select" |
| "Uploaden..." | "Uploading..." |
| "Verwerken..." | "Processing..." |
| "AI zal automatisch extracten:" | "AI will automatically extract:" |
| "Leveranciersgegevens" | "Supplier details" |
| "Line Items indien beschikbaar" | "Line items if available" |
| "Uploaden & Verwerken" | "Upload & Process" |
| "Onbekend" | "Unknown" |
| "Goedgekeurd maar kon niet naar financiën sturen" | "Approved but could not send to finance" |
| "Total facturen" | "Total invoices" |
| "Total bedrag" | "Total amount" |
| "Alle Groepen" | "All Groups" |
| "Ongegroepeerd" | "Ungrouped" |
| "Alles" | "All" |
| "Geen facturen gevonden" | "No invoices found" |
| "Probeer een andere zoekopdracht" | "Try a different search" |

#### File 3: `src/pages/InventoryReceiving.jsx` (~50 strings)

| Dutch | English |
|-------|---------|
| "Camera toegang geweigerd. Sta camera toegang toe in je browser instellingen." | "Camera access denied. Allow camera access in your browser settings." |
| "Kon camera niet starten. Probeer handmatige invoer." | "Could not start camera. Try manual entry." |
| "Handmatig" | "Manual" |
| "Handmatige invoer" | "Manual entry" |
| "Richt de camera op de barcode" | "Point the camera at the barcode" |
| "Camera stoppen" | "Stop Camera" |
| "Camera starten" | "Start Camera" |
| "Typ EAN-code handmatig in of gebruik de camera" | "Type EAN code manually or use the camera" |
| "Typ EAN-code of scan met een barcode scanner" | "Type EAN code or scan with a barcode scanner" |
| "Verwachte levering gevonden" | "Expected delivery found" |
| "Verwacht:" | "Expected:" |
| "Ontvangen:" | "Received:" |
| "Resterend:" | "Remaining:" |
| "Geen verwachte levering" | "No expected delivery" |
| "Dit product staat niet op de verwachte leveringen lijst." | "This product is not on the expected deliveries list." |
| "Huidige voorraad:" | "Current stock:" |
| "stuks" | "items" |
| "Aantal ontvangen" | "Quantity received" |
| "Conditie" | "Condition" |
| "Goed" | "Good" |
| "Beschadigd" | "Damaged" |
| "Defect" | "Defective" |
| "Locatie (optioneel)" | "Location (optional)" |
| "Opmerkingen beschadiging" | "Damage notes" |
| "Beschrijf de schade..." | "Describe the damage..." |
| "Ontvangen" | "Receive" |
| "Annuleren" | "Cancel" |
| "Product niet gevonden" | "Product not found" |
| "Dit product staat niet in het systeem. Voeg het eerst toe aan de producten." | "This product is not in the system. Add it to products first." |
| "Sluiten" | "Close" |
| "Product toevoegen" | "Add Product" |
| "Nog geen ontvangsten vandaag" | "No receipts yet today" |
| "Ontvangst bevestigd!" | "Receipt confirmed!" |
| "Nog {remainingQty} stuks verwacht" | "Still {remainingQty} items expected" |
| "Volgende scan" | "Next scan" |
| "Geen bedrijf geselecteerd" | "No company selected" |
| "Product gevonden:" | "Product found:" |
| "Product niet gevonden" (toast) | "Product not found" |
| "Scanfout:" | "Scan error:" |
| "Onbekende fout" | "Unknown error" |
| "Fout bij ontvangen:" | "Error receiving:" |
| "Kon gegevens niet laden" | "Could not load data" |
| "Verwachte leveringen" | "Expected Deliveries" |
| "Ontvangen vandaag" | "Received Today" |
| "stuks" (stats) | "items" |
| "Gedeeltelijke leveringen" | "Partial Deliveries" |
| "Recente ontvangsten" | "Recent Receipts" |
| "Verwachte leveringen ({count})" | "Expected Deliveries ({count})" |
| "Geen verwachte leveringen" | "No expected deliveries" |
| "Leverancier" (table header) | "Supplier" |

#### File 4: `src/pages/InventoryShipping.jsx` (~40 strings)

| Dutch | English |
|-------|---------|
| "Anders" | "Other" |
| "Track & trace code is verplicht om te kunnen verzenden" | "Track & trace code is required to ship" |
| "Verzending voltooid!" | "Shipment completed!" |
| "Verzending mislukt" | "Shipment failed" |
| "Verzending voltooien" | "Complete Shipment" |
| "Voer de track & trace code in om de verzending te voltooien." | "Enter the track & trace code to complete the shipment." |
| "Klant:" | "Customer:" |
| "Bijv. 3SJVB123456789" | "E.g. 3SJVB123456789" |
| "Deze code is verplicht voor het voltooien van de verzending" | "This code is required to complete the shipment" |
| "Vervoerder (optioneel)" | "Carrier (optional)" |
| "Selecteer vervoerder..." | "Select carrier..." |
| "Wordt automatisch gedetecteerd als niet opgegeven" | "Auto-detected if not specified" |
| "Annuleren" | "Cancel" |
| "Verzenden" | "Ship" |
| "Onbekende klant" | "Unknown customer" |
| "Gekopieerd!" | "Copied!" |
| "Pakjes" | "Packages" |
| "Vervoerder" | "Carrier" |
| "Verzenden voor" | "Ship by" |
| "Verzonden" | "Shipped" |
| "levering(en) te laat" | "shipment(s) overdue" |
| "Controleer de tracking status en neem actie" | "Check tracking status and take action" |
| "Kon verzendtaken niet laden" | "Could not load shipping tasks" |
| "Te verzenden" | "To Ship" |
| "Onderweg" | "In Transit" |
| "Afgeleverd" | "Delivered" |
| "Te laat" | "Overdue" |
| "Zoek op order, klant of T&T code..." | "Search by order, customer or T&T code..." |
| "Alles" | "All" |
| "Geen verzendtaken gevonden" | "No shipping tasks found" |
| "Probeer een andere zoekopdracht" | "Try a different search" |
| "Er zijn momenteel geen verzendtaken" | "There are currently no shipping tasks" |

#### File 5: `src/components/products/ProductModal.jsx` (~1 string)

| Dutch | English |
|-------|---------|
| "Verkoopkanalen" | "Sales Channels" |

#### File 6: `src/pages/ProductsPhysical.jsx` (~2 strings)

| Dutch | English |
|-------|---------|
| "Alle Kanalen" | "All Channels" |
| "Kanaal" | "Channel" |

---

### Part B: Update BLUEPRINT_BUILD_PLAN.md

After completing Part A, update `BLUEPRINT_BUILD_PLAN.md` to ensure all future phases use **English** UI labels instead of Dutch.

**Search and replace these Dutch UI specifications:**

| Section | Dutch | English |
|---------|-------|---------|
| Phase 1 (line ~321) | "Handmatige Inkoop" button | "Manual Purchase" button |
| Phase 1 (line ~321) | "Upload Factuur" button | "Upload Invoice" button |
| Phase 2A (line ~415) | "Start Ontvangst Sessie" button | "Start Receiving Session" button |
| Phase 2A (line ~416) | session name example "Pallet levering DHL" | "Pallet delivery DHL" |
| Phase 2A (line ~419) | "Sluit Sessie" button | "Close Session" button |
| Phase 3A (line ~483) | "Nieuw Pallet" button | "New Pallet" button |
| Phase 3D (line ~553) | "Verificatie Mode" toggle | "Verification Mode" toggle |
| Phase 3A (line ~501) | "Afronden" button | "Finalize" button |
| Phase 2C (line ~449) | "Exporteer" button | "Export" button |
| Workflow headers | "INKOOP", "ONTVANGST", "INPAKKEN / VERZENDING", "RETOUREN" | Keep Dutch names BUT add English in parentheses: "INKOOP (Purchasing)", "ONTVANGST (Receiving)", etc. |
| Data flow (line ~87) | "Inkoop → Ontvangst → Pallets → Voorraad" | "Purchase → Receiving → Pallets → Stock" |

Also do a **full pass** through every quoted UI string in the blueprint (Phases 2–5, Email Pool, Shopify sections) and ensure any remaining Dutch is translated to English. Pay special attention to:
- Button labels in quotes
- Placeholder text examples
- Dialog titles
- Status labels
- Column headers

### Requirements

1. **Do not break any functionality** — only string literals change
2. **Do not touch database column names** — `sales_channel`, `purchase_group_id`, etc. stay as-is
3. **Do not rename variables or functions** — only JSX text content
4. **Do not change code comments** — only user-visible strings
5. **Preserve formatting** — same Tailwind classes, same JSX structure
6. **Country names in Select dropdowns**: Translate "Nederland" → "Netherlands", "Duitsland" → "Germany", "België" → "Belgium", "Verenigd Koninkrijk" → "United Kingdom", "Frankrijk" → "France", "Spanje" → "Spain", "Italië" → "Italy", "China" → "China", "Japan" → "Japan", "Verenigde Staten" → "United States"

### Verification

After all changes:
1. Run `npx vite build` — must succeed with zero errors
2. Do a final `grep -rn` for common Dutch words across `src/` to catch any stragglers:
   ```bash
   grep -rn "Leverancier\|Verkoopkanaal\|Onbepaald\|factuur\|Factuur\|Inkoop\|inkoop\|Ontvangen\|ontvangen\|Verwacht\|verwacht\|Annuleren\|Sluiten\|stuks\|Beschadigd\|Defect\|Opmerking\|Verzending\|verzending\|Vervoerder\|Gedeeltelijke\|Ontvangst\|Groepsnaam\|hoeveelheid\|Bestand\|bestandstype\|Afgeleverd\|Onderweg\|Geen\|gevonden" --include="*.jsx" --include="*.tsx" src/
   ```
3. If any Dutch strings remain, fix them too
4. Confirm the BLUEPRINT_BUILD_PLAN.md changes don't break any markdown formatting

### Files to Modify
- `src/components/purchases/ManualPurchaseModal.jsx` — ~23 string replacements
- `src/pages/StockPurchases.jsx` — ~40 string replacements
- `src/pages/InventoryReceiving.jsx` — ~50 string replacements
- `src/pages/InventoryShipping.jsx` — ~40 string replacements
- `src/components/products/ProductModal.jsx` — 1 string replacement
- `src/pages/ProductsPhysical.jsx` — 2 string replacements
- `BLUEPRINT_BUILD_PLAN.md` — ~15 UI label updates in Phase 2–5 specs

### Git Commit
After all changes, commit with:
```
fix: migrate all Dutch UI strings to English across inventory modules

Translated ~160 user-facing strings from Dutch to English in:
- ManualPurchaseModal (purchase entry form)
- StockPurchases (invoice management)
- InventoryReceiving (barcode scanning & receiving)
- InventoryShipping (shipping tasks)
- ProductModal (sales channel labels)
- ProductsPhysical (channel filter)
- BLUEPRINT_BUILD_PLAN.md (future phase UI specs)
```
