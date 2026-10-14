# Static Migration

Generated: 2026-10-14T01:50:57.948Z

No data was written to PostgreSQL.

Target database:

```txt
pawnsystemdb:5432/pawnsystemdb as moneyexpress
```

## Source Counts

```txt
AR400ID          28
BW010HAIRCODE    32
BW015EYECODE     20
WC450LOCATION    1466
WC510CATEGORY    37
WC520SUBCAT      639
MF100CITY        26348
MF110PROVINCE    65
MF120COUNTRY     4
EM200EMPLOYEE    101
```

## ID Types: AR400ID -> id_type

Source rows: 28
Unique source values after normalization: 10
Existing target values: 12
Already present: 10
Would insert: 0

Would insert sample:
_none_


## ID Type Mapping Applied

Legacy ID descriptions are short labels. Approved mappings are applied before comparing to the target table.

- SIN (S.I.N.) -> Social Insurance Number
- DRL (DRIVER L) -> Driver's License
- HCD (HEALTH C) -> Health Card
- TRD (TREATY C) -> Indian Status Card
- FAC (FIRE ARM) -> Firearms License
- BAR (BAR CARD) -> Other
- M/M (MONEY MA) -> Other
- BCD (BIRTH C.) -> Birth Certificate
- OTH (OTHERS) -> Other
- MAN (MAN. D/L) -> Driver's License
- ONT (ONT D/L) -> Driver's License
- BRI (B.C. D/L) -> Driver's License
- PAS (PASSPORT) -> Canadian Passport
- ALT (ALT D/L.) -> Provincial ID
- REM (REMARKS) -> Other
- CAS (CASH PLA) -> Other
- ROY (ROYAL BK) -> Other
- CIT (CITIZEN) -> Citizenship Card
- LIB (LIBRARY) -> Other
- CRE (CREDIT U) -> Other
- BCI (BC ID) -> Provincial ID
- CIB (CIBC BAN) -> Other
- ALI (ALT I.D.) -> Provincial ID
- AHC (ALT H/C) -> Health Card
- NTD (N. T. DL) -> Driver's License
- SAI (SASKID) -> Provincial ID
- NSD (N.S. D/L) -> Driver's License


## Hair Colors: BW010HAIRCODE -> hair_color

Source rows: 32
Unique source values after normalization: 7
Existing target values: 12
Already present: 7
Would insert: 0

Would insert sample:
_none_


## Hair Color Mapping Applied

- UNKNOWN -> OTHER
- AUBURN -> OTHER
- DARK BROWN -> BROWN
- DYED -> OTHER
- GRAYING -> GRAY
- LIGHT BROWN -> BROWN
- SANDY -> OTHER


## Eye Colors: BW015EYECODE -> eye_color

Source rows: 20
Unique source values after normalization: 7
Existing target values: 11
Already present: 7
Would insert: 0

Would insert sample:
_none_


## Eye Color Mapping Applied

- GREY -> GRAY


## Locations: WC450LOCATION -> location

Source rows: 1466
Unique source values after normalization: 1465
Existing target values: 774
Already present: 734
Would insert: 731

Would insert sample:
- RR14
- C'6
- C'7
- AB77
- AB78
- AB79
- AB87
- AB88
- AB89
- AB97
- AB98
- AB99
- AC18
- AC19
- AC28
- AC29
- AC38
- AC39
- AC44
- AC45
- ... 711 more


## Item Categories: WC510CATEGORY -> item_category

Source rows: 37
Unique source values after normalization: 37
Existing target values: 14
Already present: 1
Would insert: 36

Would insert sample:
- ANTIQUES / COLLECTIBLES
- APPLIANCE LARGE
- APPLIANCE SMALL
- ART
- BICYCLE
- CAMERA / OPTICS
- CAMERA ACCESSORIES
- CHILD
- COINS
- DEMO
- FARM IMPLEMENTS
- FIREARM ACCESSORIES
- FIREARMS
- FURNITURE
- GAME CARTRIDGES/ACCESSORIES
- GAME SYSTEMS
- GOLF EQUIPMENT
- JEWELLERY
- LAWN & GARDEN
- MARINE EQUIPMENT
- ... 16 more


## Item Subcategories: WC520SUBCAT -> item_subcategory

Source rows: 639
Unique source values after normalization: 638
Existing target values: 145
Already present: 0
Would insert: 638

Would insert sample:
- ANTIQUES / COLLECTIBLES / stamps - used
- ANTIQUES / COLLECTIBLES / award
- ANTIQUES / COLLECTIBLES / trophy
- ANTIQUES / COLLECTIBLES / memorabilia
- ANTIQUES / COLLECTIBLES / war medal
- ANTIQUES / COLLECTIBLES / silverware
- ANTIQUES / COLLECTIBLES / vase
- ANTIQUES / COLLECTIBLES / figurine
- ANTIQUES / COLLECTIBLES / stamps - postage ne
- ANTIQUES / COLLECTIBLES / stamps - sub-mint
- ANTIQUES / COLLECTIBLES / --- other ---
- ANTIQUES / COLLECTIBLES / ceramics
- APPLIANCE LARGE / dryer
- APPLIANCE LARGE / stove
- APPLIANCE LARGE / washer
- APPLIANCE LARGE / freezer
- APPLIANCE LARGE / fridge - bar
- APPLIANCE LARGE / grill
- APPLIANCE LARGE / furniture
- APPLIANCE LARGE / --- other ---
- ... 618 more


## Cities: MF100/MF110/MF120 -> city

Source rows: 26348
Unique source values after normalization: 26348
Existing target values: 2136
Already present: 0
Would insert: 26348

Would insert sample:
- Rockport / Arkansas / USA
- Rocky / Arkansas / USA
- Roe / Arkansas / USA
- Rogers / Arkansas / USA
- Rohwer / Arkansas / USA
- Roland / Arkansas / USA
- Rolla / Arkansas / USA
- Romance / Arkansas / USA
- Rosboro / Arkansas / USA
- Rose Bud / Arkansas / USA
- Rosie / Arkansas / USA
- Rosston / Arkansas / USA
- Round Mountain / Arkansas / USA
- Round Pond / Arkansas / USA
- Rover / Arkansas / USA
- Rowell / Arkansas / USA
- Royal / Arkansas / USA
- Royal Oak / Arkansas / USA
- Rudd / Arkansas / USA
- Rudy / Arkansas / USA
- ... 26328 more


## Employees: EM200EMPLOYEE -> employee

Source rows: 101
Existing target employees: 0
Would insert by employee id: 101
Missing password: 0
Missing birthdate: 2
Missing nickname: 0

Would insert employee ids sample:
- 19
- 20
- 21
- 22
- 23
- 24
- 25
- 26
- 27
- 28
- 29
- 30
- 31
- 32
- 33
- 34
- 35
- 2
- 3
- 4
- ... 81 more

Employee migration needs a default strategy for required app fields: date_of_birth, gender, nickname, and password.


## Current Decision Status

- ID type and hair/eye color mapping is approved in `reports/static-migration.md`.
- Location mapping is approved in `reports/location-migration.md`; unresolved legacy locations map to `UNKNOWN`.
- Item category simplification is approved in `reports/category-migration.md`.
- Employee migration is still pending; password/nickname/default DOB rules are not finalized.
