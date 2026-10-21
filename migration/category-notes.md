# Item Category Mapping

## Decision

The new system stays simple:

```txt
item_category
item_subcategory
```

Do not copy the old system's full category tree.

Migration should map from the most specific legacy value first:

```txt
WC520SUBCAT.WC520DESC -> new item_category / item_subcategory
```

Only when the legacy bottom-level subcategory is not meaningful, such as `--- Other ---`, blank, or unknown, fall back to the legacy parent category:

```txt
WC510CATEGORY.WC510DESCRIPTION -> new item_category / item_subcategory
```

## Added Target Subcategories

Target subcategories used by the conversion rules:

```txt
APPAREL / jacket
APPAREL / sunglasses
APPAREL / belt
APPAREL / handcuffs
APPAREL / hat

APPLIANCE / air conditioner
APPLIANCE / barbecue
APPLIANCE / dryer
APPLIANCE / fan
APPLIANCE / heater
APPLIANCE / sewing machine
APPLIANCE / humidifier
APPLIANCE / stove
APPLIANCE / toaster
APPLIANCE / washer

AUDIO EQUIPMENT / car audio
AUDIO EQUIPMENT / cd player
AUDIO EQUIPMENT / stereo

ELECTRONICS / camera accessory
ELECTRONICS / computer accessory
ELECTRONICS / game system
ELECTRONICS / printer
ELECTRONICS / radar detector

HAND TOOLS / tool belt
HAND TOOLS / hammer
HAND TOOLS / ratchet
HAND TOOLS / socket
HAND TOOLS / wrench

BABY & KIDS / car seat

COLLECTIBLES / painting
COLLECTIBLES / picture
COLLECTIBLES / stamp

DRYWALL TOOLS / level
DRYWALL TOOLS / router
DRYWALL TOOLS / safety gear
DRYWALL TOOLS / sprayer
DRYWALL TOOLS / taping tool

MUSICAL INSTRUMENTS / harmonica

OTHER / other

SPORTS & OUTDOOR / snowboard
SPORTS & OUTDOOR / air gun

UTILITY TOOLS / battery charger
UTILITY TOOLS / carpet kicker
UTILITY TOOLS / soldering gun
```

## Mapping Priority

Apply rules in this order:

```txt
1. Normalize legacy subcategory text.
2. If subcategory is specific, map by subcategory rule.
3. If subcategory is other/blank/unknown, map by legacy parent category.
4. If no rule matches, map to the parent category's `other`.
5. If no parent category is usable, map to OTHER / other.
```

Normalize text by trimming, lowercasing, and ignoring punctuation/case where needed.

Executable rules live in `mappings/category-mapping.json`. Scripts do not read this explanatory document.
