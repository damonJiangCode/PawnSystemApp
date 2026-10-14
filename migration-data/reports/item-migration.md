# Item Migration

Generated: 2026-10-14T02:11:34.661Z

Sources: `WC400INVEN` and `SA110ITEM` in `superpawnconv.mdb`

Target database: `pawnsystemdb`

Mode: commit

## Summary

| Metric | Count |
| --- | ---: |
| WC400INVEN rows | 493,730 |
| SA110ITEM rows | 1,073,918 |
| Items prepared | 494,408 |
| Ticket-item links prepared | 1,075,693 |
| Target item rows after commit | 494,408 |
| Target ticket_item rows after commit | 1,075,693 |
| Blocker types | 0 |

## Rules

- Use `WC400INVEN` as the primary item source.
- Add `SA110ITEM` rows only when their item number does not exist in `WC400INVEN`.
- Build `ticket_item` links from `SA110ITEM`, skipping tickets that were not migrated.
- Generate new item numbers for legacy rows where item number is blank, zero, or invalid.
- Default quantity to `1` when the legacy value is blank, zero, or invalid.
- Default blank descriptions to `Unknown item`.
- Map legacy subcategories using `category-migration.md`; fall back to parent category and then `OTHER / other`.

## Blockers

_none_

### Blocker Samples

_none_

## Item Source Counts

```txt
  493262  WC400INVEN item
    1146  SA110ITEM item fallback
```

## Mapping Reasons

```txt
  411130  subcategory rule
   45689  parent fallback
   20502  global other fallback
   17087  parent category fallback
```

## Top Target Subcategories

```txt
   41147  OTHER / other
   39802  ELECTRONICS / game system
   36401  JEWELRY / ring
   35326  AUDIO EQUIPMENT / stereo
   34346  ELECTRONICS / game
   29751  ELECTRONICS / controller
   27762  ELECTRONICS / dvd
   22614  ELECTRONICS / phone
   20562  ELECTRONICS / other
   18803  HAND TOOLS / other
   18026  ELECTRONICS / tv
   11116  AUDIO EQUIPMENT / speaker
   10654  JEWELRY / watch
   10577  ELECTRONICS / camera accessory
    8497  HAND TOOLS / hand tool
    7379  ELECTRONICS / laptop
    7280  MUSICAL INSTRUMENTS / guitar
    6892  APPAREL / jacket
    6642  POWER TOOLS / drill
    5487  POWER TOOLS / saw
    5205  SPORTS & OUTDOOR / golf
    4591  ELECTRONICS / dvd player
    4249  UTILITY TOOLS / other
    4234  ELECTRONICS / desktop
    4132  JEWELRY / chain
    3568  ELECTRONICS / headphone
    3382  ELECTRONICS / computer accessory
    3128  APPLIANCE / other
    2910  HAND TOOLS / socket
    2898  MUSICAL INSTRUMENTS / amplifier
    2678  APPLIANCE / vacuum
    2533  SPORTS & OUTDOOR / other
    2445  APPAREL / beadwork
    2217  UTILITY TOOLS / battery charger
    2089  AUDIO EQUIPMENT / car audio
    2005  SPORTS & OUTDOOR / knife
    1902  APPLIANCE / microwave
    1691  POWER TOOLS / nailer
    1515  AUDIO EQUIPMENT / subwoofer
    1492  AUDIO EQUIPMENT / cd player
    1471  POWER TOOLS / impact driver
    1385  SPORTS & OUTDOOR / fishing gear
    1363  SPORTS & OUTDOOR / bike
    1355  DRYWALL TOOLS / other
    1348  HAND TOOLS / tool belt
    1251  SPORTS & OUTDOOR / fitness equipment
    1139  BABY & KIDS / other
    1105  APPAREL / boots
    1054  UTILITY TOOLS / air compressor
    1012  ELECTRONICS / monitor
    1009  POWER TOOLS / grinder
     837  MUSICAL INSTRUMENTS / keyboard
     825  POWER TOOLS / sander
     802  APPLIANCE / fan
     800  ELECTRONICS / radar detector
     733  APPAREL / other
     729  SPORTS & OUTDOOR / hockey equipment
     700  COLLECTIBLES / other
     693  JEWELRY / necklace
     679  UTILITY TOOLS / ladder
     648  JEWELRY / bracelet
     643  UTILITY TOOLS / jack
     601  COLLECTIBLES / coin
     586  DRYWALL TOOLS / router
     583  HAND TOOLS / wrench
     569  MUSICAL INSTRUMENTS / other
     568  AUDIO EQUIPMENT / microphone
     551  JEWELRY / earrings
     551  SPORTS & OUTDOOR / hunting gear
     542  SPORTS & OUTDOOR / camping gear
     518  APPLIANCE / heater
     518  APPLIANCE / sewing machine
     506  JEWELRY / pendant
     437  AUDIO EQUIPMENT / receiver
     427  MUSICAL INSTRUMENTS / drum
     412  POWER TOOLS / stapler
     384  APPLIANCE / air conditioner
     361  DRYWALL TOOLS / level
     349  DRYWALL TOOLS / safety gear
     344  APPAREL / sunglasses
```

## Top Other Mappings To Review

```txt
   20644  Other / --- Other --- -> OTHER / other
   18772  Tools / --- Other --- -> HAND TOOLS / other
   16038  7777 / 7777 -> OTHER / other
   10011  Television/Video / VCR -> ELECTRONICS / other
    9051  Television/Video / Video Tape -> ELECTRONICS / other
    4464  7779 / 7779 -> OTHER / other
    3055  Vehicle Accessories / --- Other --- -> UTILITY TOOLS / other
    1355  Tools-Industrial / Drywall-Tool -> DRYWALL TOOLS / other
    1139  Child / Accessory --- Other -> BABY & KIDS / other
    1073  Appliance Large / Furniture -> APPLIANCE / other
     993  Appliance Small / Clock -> APPLIANCE / other
     814  Appliance Small / --- Other --- -> APPLIANCE / other
     496  Television/Video / Converter -> ELECTRONICS / other
     440  Art / Print -> COLLECTIBLES / other
     402  Sporting Goods / Helmet -> SPORTS & OUTDOOR / other
     364  Sporting Goods / Skates -> SPORTS & OUTDOOR / other
     363  Television/Video / VCR & Remote -> ELECTRONICS / other
     293  Personal Items / --- Other --- -> APPAREL / other
     249  Sporting Goods / Pool Cue -> SPORTS & OUTDOOR / other
     240  Vehicle Accessories / Battery Cables -> UTILITY TOOLS / other
     232  Sporting Goods / Sword -> SPORTS & OUTDOOR / other
     227  Sporting Goods / Skateboard -> SPORTS & OUTDOOR / other
     200  Television/Video / Remote Control -> ELECTRONICS / other
     175  Sporting Goods / Bat -> SPORTS & OUTDOOR / other
     155  Sporting Goods / --- Other --- -> SPORTS & OUTDOOR / other
     143  Television/Video / Satellite Dish -> ELECTRONICS / other
     140  Sporting Goods / Ball Glove -> SPORTS & OUTDOOR / other
     130  Television/Video / Media Video Tape -> ELECTRONICS / other
     128  Musical Instrument / --- Other --- -> MUSICAL INSTRUMENTS / other
     125  Tools-Industrial / Scale-Digital -> UTILITY TOOLS / other
     124  Art / --- Other --- -> COLLECTIBLES / other
     123  Tools-Industrial / --- Other --- -> UTILITY TOOLS / other
     121  Personal Items / Ornaments -> APPAREL / other
     110  Music Accessory / --- Other --- -> MUSICAL INSTRUMENTS / other
     110  Stereo/Audio/Radio / Karaoke Machine -> AUDIO EQUIPMENT / other
     100  Personal Items / Shaver -> APPAREL / other
      98  Sporting Goods / Skis -> SPORTS & OUTDOOR / other
      98  Television/Video / --- Other --- -> ELECTRONICS / other
      93  Vehicle / --- Other --- -> UTILITY TOOLS / other
      92  Riding Equipment / Saddle -> SPORTS & OUTDOOR / other
      86  Sporting Goods / Rollerblades -> SPORTS & OUTDOOR / other
      74  Personal Items / Vest -> APPAREL / other
      73  Appliance Small / Iron -> APPLIANCE / other
      73  Tools / Planer -> POWER TOOLS / other
      71  Furniture / --- Other --- -> APPLIANCE / other
      69  Tools-Industrial / Heat Gun -> UTILITY TOOLS / other
      68  Vehicle / Car -> UTILITY TOOLS / other
      62  Sporting Goods / Basketball -> SPORTS & OUTDOOR / other
      58  Tools-Industrial / Welding Helmet -> UTILITY TOOLS / other
      57  Tools-Industrial / Torch -> UTILITY TOOLS / other
      45  Sporting Goods / Ball -> SPORTS & OUTDOOR / other
      43  Art / Wall Hanging -> COLLECTIBLES / other
      43  Stereo/Audio/Radio / --- Other --- -> AUDIO EQUIPMENT / other
      42  Music Accessory / Music Stand -> MUSICAL INSTRUMENTS / other
      39  Tools / Polisher -> POWER TOOLS / other
      38  Musical Instrument / Clarinet -> MUSICAL INSTRUMENTS / other
      38  Sporting Goods / Pool Cue Case -> SPORTS & OUTDOOR / other
      38  Tools-Industrial / Air - Hammer -> POWER TOOLS / other
      36  Tools-Industrial / Pump-Water -> UTILITY TOOLS / other
      34  Musical Instrument / Trumpet -> MUSICAL INSTRUMENTS / other
      34  Tools-Industrial / Air - Chisel -> POWER TOOLS / other
      34  Tools-Industrial / Chain Hoist -> UTILITY TOOLS / other
      33  Riding Equipment / --- Other --- -> SPORTS & OUTDOOR / other
      33  Television/Video / Accessories -Other- -> ELECTRONICS / other
      32  Personal Items / Costume -> APPAREL / other
      32  Tools-Industrial / Pump-Sump -> UTILITY TOOLS / other
      31  Jewellery / Digital Scale -> JEWELRY / other
      30  Music Accessory / Guitar Cord -> MUSICAL INSTRUMENTS / other
      30  Music Accessory / Guitar Stand -> MUSICAL INSTRUMENTS / other
      29  Musical Instrument / Mandolin -> MUSICAL INSTRUMENTS / other
      28  Antiques / Collectibles / Silverware -> COLLECTIBLES / other
      28  Personal Items / Pants -> APPAREL / other
      28  Tools / Converter -> HAND TOOLS / other
      27  Art / Sculpture -> COLLECTIBLES / other
      27  Tools-Industrial / Air Tank -> UTILITY TOOLS / other
      26  Personal Items / Buckle -> APPAREL / other
      25  Music Accessory / Effects pedal -> MUSICAL INSTRUMENTS / other
      25  Sporting Goods / Ski Boots -> SPORTS & OUTDOOR / other
      25  Tools-Industrial / Joiner -> POWER TOOLS / other
      24  Appliance Large / Grill -> APPLIANCE / other
```

### Other Mapping Samples

- WC400 item 783496: Other / --- Other ---
- WC400 item 804629: Other / --- Other ---
- WC400 item 724353: Sporting Goods / Skates
- WC400 item 718151: Other / --- Other ---
- WC400 item 718170: Television/Video / Accessories -Other-
- WC400 item 726051: Other / --- Other ---
- WC400 item 716226: Tools-Industrial / Drywall-Tool
- WC400 item 716249: Other / --- Other ---
- WC400 item 791196: Sporting Goods / Pool Cue
- WC400 item 791197: Sporting Goods / Pool Cue
- WC400 item 791198: Sporting Goods / Skateboard
- WC400 item 791199: Television/Video / --- Other ---
- WC400 item 791201: Vehicle Accessories / Battery Cables
- WC400 item 791216: Other / --- Other ---
- WC400 item 750683: Tools-Industrial / Drywall-Tool
- WC400 item 750684: Tools-Industrial / Drywall-Tool
- WC400 item 750685: Tools-Industrial / Drywall-Tool
- WC400 item 750688: Art / --- Other ---
- WC400 item 750690: Other / --- Other ---
- WC400 item 750696: Sporting Goods / Rollerblades
- WC400 item 715762: Other / --- Other ---
- WC400 item 715767: Tools-Industrial / Drywall-Tool
- WC400 item 880258: Other / --- Other ---
- WC400 item 728774: Other / --- Other ---
- WC400 item 803743: Other / --- Other ---
- WC400 item 725885: Other / --- Other ---
- WC400 item 725897: Sporting Goods / Helmet
- WC400 item 725898: Sporting Goods / Helmet
- WC400 item 725899: Sporting Goods / Helmet
- WC400 item 802207: Other / --- Other ---

## Warnings

```txt
  230233  quantity defaulted to 1
   36078  ticket_item skipped because ticket is not migrated
     468  duplicate WC400 item number skipped after first row
     207  description defaulted to Unknown item
     191  synthetic item number generated for invalid SA110 item number
       1  synthetic item number generated for invalid WC400 item number
```

## Item Photo Export

Generated: 2026-10-14T02:17:51.560Z

Source: `WC405ITEMPIC.WC405ITEMPICTURE` from `Pictureconv.mdb`.

Output directory:

```txt
/app/migration-data/exports/item-photos
```

Naming rule:

```txt
itemnumber.jpg
```

## Summary

```txt
Legacy item photo rows: 38444
Rows with photo: 38434
Rows without photo: 10
Photos exported for migrated items: 38434
Photo rows without migrated item: 0
JPEG files: 38434
Non-JPEG files: 0
Total exported bytes: 1288968917
Updated DB image_path: yes
```

## Missing Migrated Item Samples

_none_

## Samples

- 518057: migration-data/exports/item-photos/518057.jpg
- 521964: migration-data/exports/item-photos/521964.jpg
- 532619: migration-data/exports/item-photos/532619.jpg
- 595472: migration-data/exports/item-photos/595472.jpg
- 629409: migration-data/exports/item-photos/629409.jpg
- 630980: migration-data/exports/item-photos/630980.jpg
- 632485: migration-data/exports/item-photos/632485.jpg
- 635859: migration-data/exports/item-photos/635859.jpg
- 645581: migration-data/exports/item-photos/645581.jpg
- 647435: migration-data/exports/item-photos/647435.jpg

