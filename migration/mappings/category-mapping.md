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

## Specific Subcategory Rules

### Jewelry

```txt
Ring
Ringset
Band
-> JEWELRY / ring

Necklace
-> JEWELRY / necklace

Bracelet
Bangle
-> JEWELRY / bracelet

Chain
-> JEWELRY / chain

Earrings
-> JEWELRY / earrings

Pendant / Charm
Locket
-> JEWELRY / pendant

Watch
Watch-Mens
Watch-Ladies
Watch-Pocket
-> JEWELRY / watch

Scrap Gold
-> JEWELRY / gold scrap
```

### Electronics

```txt
Phone
Phone-Cellular
Phone-Cordless
-> ELECTRONICS / phone

Laptop Computer
-> ELECTRONICS / laptop

Computer
-> ELECTRONICS / desktop

Monitor
-> ELECTRONICS / monitor

Computer Accessories
Hard Drive
-> ELECTRONICS / computer accessory

Printer
-> ELECTRONICS / printer

Television
TV & Remote
TV/DVD Unit
TV/VCR Unit
-> ELECTRONICS / tv

DVD Disk
Media DVD Disc
-> ELECTRONICS / dvd

DVD Player
VCR/DVD Unit
-> ELECTRONICS / dvd player

VCR
VCR & Remote
Video Tape
Remote Control
-> ELECTRONICS / other

System
XBox
Sony Playstation
Sony Playstation 2
Nintendo
Nintendo 64
Nintendo GameCube
Gameboy
Gameboy Advance
Dreamcast
Super Nintendo
Sega Genesis
Sega Game Gear
Sega Saturn
-> ELECTRONICS / game system

XBox Game
Sony Playstation Game
Sony Playstation 2 GAME
Nintendo Game
Nintendo 64 Game
Nintendo GameCube Game
Gameboy Game
-Other Games-
-> ELECTRONICS / game

Controller
Memory Card
Accessories
-> ELECTRONICS / controller

Radar Detector
GPS Receiver
-> ELECTRONICS / radar detector
```

### Camera

```txt
35MM Camera
Digital Camera
Point & Shoot Camera
Camcorder
8MM Video Camera
Digital Video Camera
Hi 8 Video Camera
Instant Camera
Polaroid Camera
Disposable Camera
Rangefinder
APS Camera
-> ELECTRONICS / camera accessory

Lens
Telephoto Lens
Projector / Lens
Tri-Pods
Studio Light
Flash
Binoculars
-> ELECTRONICS / camera accessory
```

### Audio

```txt
Speaker
Loud Speakers
-> AUDIO EQUIPMENT / speaker

Subwoofer
-> AUDIO EQUIPMENT / subwoofer

Receiver
-> AUDIO EQUIPMENT / receiver

Microphone
-> AUDIO EQUIPMENT / microphone

Amp
Guitar Amp
Mixer/Amp
-> MUSICAL INSTRUMENTS / amplifier

CD Player
-> AUDIO EQUIPMENT / cd player

Stereo
Stereo - Mini
Stereo Component
Tape Deck
Ghetto Blaster
Ghetto/CD Unit
Walkman
Discman
MP3 Player
Radio
Recorder
Turntable
Mini Disc Player
Tuner
Equalizer
Pre-Amp
Microcassette Rec.
Clock Radio
Cassette Recorder
Clock/Cassette
-> AUDIO EQUIPMENT / stereo

Karaoke Machine
-> AUDIO EQUIPMENT / other

Car Amp
Car CD Player
Car Tape Player
Car Subwoofer
Car Speakers
-> AUDIO EQUIPMENT / car audio

Headphone
Headphones
-> ELECTRONICS / headphone
```

### Tools

```txt
Drill
Drill-Cordless
Drill-Power
Drill-Hammer
Drill-Hand
Drill Press
-> POWER TOOLS / drill

Impact
Air - Impacts
-> POWER TOOLS / impact driver

Saw
Saw - Circular
Saw - Jigsaw
Saw - Mitre
Sawzall
Saw - Reciprocating
Saw - Chain
Chainsaw
Saw - Table Saw
Saw - Table
Saw - Compound
Saw - Scroll
Saw-Trim
Saw- Band
Saw - Bandsaw
Saw - Cement
Saw - Radial Arm
-> POWER TOOLS / saw

Grinder
Bench Grinder
-> POWER TOOLS / grinder

Sander
Belt Sander
Air - Sander
-> POWER TOOLS / sander

Air - Nailer
Percussion Nailer
-> POWER TOOLS / nailer

Air - Stapler
Stapler
Carpet Tacker
-> POWER TOOLS / stapler

Planer
Polisher
Moto-Tool
Buffer
Air - Hammer
Air - Chisel
Joiner
Shaper
-> POWER TOOLS / other

Socket Set
-> HAND TOOLS / socket

Wrenches
-> HAND TOOLS / wrench

Hammer
-> HAND TOOLS / hammer

Ratchet
Air - Ratchet
-> HAND TOOLS / ratchet

Tool Box
Tool Set
Tool Misc.
Drill Bits
Screw Drivers
Dremel
Bit Set
Tap & Die Set
Bolt Cutter
Level-Carpenter
Multimeter
Torque Wrench
Tile Cutter
Screwdriver (Electric)
Glue Gun
Fish Tape
Micrometer
-> HAND TOOLS / hand tool

Tool Belt
-> HAND TOOLS / tool belt

Air Compressor
Compressor
12 Volt Compressor
-> UTILITY TOOLS / air compressor

Pressure Washer
-> UTILITY TOOLS / pressure washer

Generator
-> UTILITY TOOLS / generator

Welder
-> UTILITY TOOLS / welder

Ladder
-> UTILITY TOOLS / ladder

Battery Charger
-> UTILITY TOOLS / battery charger

Jack - Car
Jackall
Jack - Hydraulic
-> UTILITY TOOLS / jack

Mower
Riding Mower
-> UTILITY TOOLS / lawn mower

Snow Blower
-> UTILITY TOOLS / snow blower

Weed Eater
Hedger
Edger
-> UTILITY TOOLS / trimmer

Leaf Blower
Blower
-> UTILITY TOOLS / leaf blower

Winch
Chain Hoist
Hoist
Pump-Sump
Pump-Water
Heat Gun
Torch
Air Tank
-> UTILITY TOOLS / other

Carpet Kicker
-> UTILITY TOOLS / carpet kicker

Solder Gun
-> UTILITY TOOLS / soldering gun

Powder Activated - Nailer
Gas Nailer (Airless)
-> POWER TOOLS / nailer
```

### Drywall Tools

```txt
Screw Gun
-> DRYWALL TOOLS / screw gun

Drywall-Stilts
-> DRYWALL TOOLS / stilts

Drywall-Tool
-> DRYWALL TOOLS / other

Bazooka/For Taping
-> DRYWALL TOOLS / taping tool

Level-Lazer
-> DRYWALL TOOLS / level

Safety Gear
-> DRYWALL TOOLS / safety gear

Router
Drywall-Cutout Tool
-> DRYWALL TOOLS / router

Sprayer
Air - Sprayer
-> DRYWALL TOOLS / sprayer
```

Use exact existing drywall subcategories when the source clearly matches:

```txt
Stilts -> DRYWALL TOOLS / stilts
Pump -> DRYWALL TOOLS / pump
Tube -> DRYWALL TOOLS / tube
Handle -> DRYWALL TOOLS / handle
Flusher -> DRYWALL TOOLS / flusher
Roller -> DRYWALL TOOLS / roller
```

### Musical Instruments

```txt
Guitar
Guitar-Acoustic
Guitar-Electric
Guitar-Steel
-> MUSICAL INSTRUMENTS / guitar

Bass
Bass Guitar
-> MUSICAL INSTRUMENTS / bass

Keyboard
-> MUSICAL INSTRUMENTS / keyboard

Drums
Drum Machine
Drum Stand
Drum Throne
Snare Stand
Hi-Hat
Hi-Hat Stand
-> MUSICAL INSTRUMENTS / drum

Cymbal
-> MUSICAL INSTRUMENTS / cymbal

Harmonica
Mouth Harp
-> MUSICAL INSTRUMENTS / harmonica

Violin, Bow & Case
-> MUSICAL INSTRUMENTS / violin

Flute
-> MUSICAL INSTRUMENTS / flute

Saxophone
Saxaphone
-> MUSICAL INSTRUMENTS / saxophone

Microphone
-> AUDIO EQUIPMENT / microphone
```

### Sports & Outdoor

```txt
Golf Clubs
Drivers
Putter
Golfset
Irons
Golf Cart
-> SPORTS & OUTDOOR / golf

Fishing Rod
Fishing Reel
Rod & Reel
Tackle Box
Ice Auger-Power
Ice Auger-Hand
-> SPORTS & OUTDOOR / fishing gear

Knife
-> SPORTS & OUTDOOR / knife

Hockey Equipment
-> SPORTS & OUTDOOR / hockey equipment

Weights
Weight Belt
Dumbbell
Weight Bench
Exercise Equipment
Treadmill
Sparing Gloves
Rowing Machine
-> SPORTS & OUTDOOR / fitness equipment

Punching Bag
-> SPORTS & OUTDOOR / punching bag

Tent
Camping Equipment
Sleeping Bag
Propane Camp Stove
Propane Lantern
-> SPORTS & OUTDOOR / camping gear

Snowboard
Snowboard Boots
Snowboard Bindings
-> SPORTS & OUTDOOR / snowboard

Air Gun
Air Guns
-> SPORTS & OUTDOOR / air gun

Paintball Gun
Bow - Compound
Bow - Recurve
Bow - Arrows
Rifle
Shotgun
Hand Gun
Gun Case
Gun Powder
Laser Sight
Scope
Spotting Scope
Monocular
-> SPORTS & OUTDOOR / hunting gear

Helmet
Pool Cue
Skates
Skateboard
Sword
Bat
Ball Glove
-> SPORTS & OUTDOOR / other
```

Note: skates are intentionally not added as a target subcategory.

### Appliances

```txt
Vacuum
-> APPLIANCE / vacuum

Microwave
-> APPLIANCE / microwave

Blender
Food Mixer
-> APPLIANCE / blender

Fridge
Fridge - Bar
-> APPLIANCE / fridge

Freezer
-> APPLIANCE / freezer

Coffee Maker
-> APPLIANCE / coffee machine

Sewing Machine
-> APPLIANCE / sewing machine

Fan
-> APPLIANCE / fan

Heater
-> APPLIANCE / heater

Air Conditioner
-> APPLIANCE / air conditioner

Toaster
-> APPLIANCE / toaster

Humidifier
-> APPLIANCE / humidifier

Barbeque
-> APPLIANCE / barbecue

Washer
-> APPLIANCE / washer

Dryer
-> APPLIANCE / dryer

Stove
-> APPLIANCE / stove

Iron
Food Processor
Breadmaker
Electric Cooler
Pasta Machine
Clock
Grill
Furniture
Coffee Table
Dresser
-> APPLIANCE / other
```

### Apparel / Personal Items

```txt
Beadwork
-> APPAREL / beadwork

Boots
-> APPAREL / boots

Muks
-> APPAREL / mukluk

Mitts
-> APPAREL / mitten

Jacket
Coat - Leather
Coat - Fur
-> APPAREL / jacket

Sunglasses
-> APPAREL / sunglasses

Belt
-> APPAREL / belt

Hat
-> APPAREL / hat

Handcuffs
-> APPAREL / handcuffs

Shaver
-> APPAREL / other
```

Note: `Tool Belt` maps to `HAND TOOLS / tool belt`; regular `Belt` maps to `APPAREL / belt`.

### Collectibles / Art

```txt
Coin Set
-> COLLECTIBLES / coin

Bill
-> COLLECTIBLES / bill

Picture
-> COLLECTIBLES / picture

Painting
-> COLLECTIBLES / painting

Stamps - Postage Ne
Stamps - Used
Stamps - Sub-mint
-> COLLECTIBLES / stamp

Print
Wall Hanging
Sculpture
-> COLLECTIBLES / other
```

### Bicycle / Baby / Toys

```txt
Bicycle
Mountain Bike
BMX Bike
Child Bike
Scooter
Bicycle Light
-> SPORTS & OUTDOOR / bike

Accessory Stroller
-> BABY & KIDS / stroller

Baby Monitor
-> BABY & KIDS / baby monitor

Toy
Remote Control Vehicle
Doll
-> BABY & KIDS / toy

Accessory Car Seat
-> BABY & KIDS / car seat
```

### Vehicle Accessories

```txt
Car Amp
Car CD Player
Car Tape Player
Car Subwoofer
Car Speakers
-> AUDIO EQUIPMENT / car audio

Radar Detector
-> ELECTRONICS / radar detector

Battery Charger
-> UTILITY TOOLS / battery charger

Battery Cables
Battery Warmer
-> UTILITY TOOLS / other
```

## Other / Unknown Rules

When legacy bottom-level subcategory is:

```txt
--- Other ---
-Other-
Other
blank
```

Use the legacy parent category:

```txt
Jewellery -> JEWELRY / other
Tools -> HAND TOOLS / other
Tools-Industrial -> UTILITY TOOLS / other
Television/Video -> ELECTRONICS / other
Game Systems -> ELECTRONICS / game system
Game Cartridges/Accessories -> ELECTRONICS / game
Stereo/Audio/Radio -> AUDIO EQUIPMENT / other
Telecommunications -> ELECTRONICS / phone
Office / Computer Equipment -> ELECTRONICS / computer accessory
Camera / Optics -> ELECTRONICS / camera accessory
Camera Accessories -> ELECTRONICS / camera accessory
Sporting Goods -> SPORTS & OUTDOOR / other
Golf Equipment -> SPORTS & OUTDOOR / golf
Riding Equipment -> SPORTS & OUTDOOR / other
Marine Equipment -> SPORTS & OUTDOOR / other
Musical Instrument -> MUSICAL INSTRUMENTS / other
Music Accessory -> MUSICAL INSTRUMENTS / other
Music Media -> AUDIO EQUIPMENT / stereo
Appliance Small -> APPLIANCE / other
Appliance Large -> APPLIANCE / other
Personal Items -> APPAREL / other
Bicycle -> SPORTS & OUTDOOR / bike
Child -> BABY & KIDS / other
Toys -> BABY & KIDS / toy
Vehicle Accessories -> UTILITY TOOLS / other
Vehicle -> UTILITY TOOLS / other
Lawn & Garden -> UTILITY TOOLS / other
Art -> COLLECTIBLES / other
Coins -> COLLECTIBLES / coin
Antiques / Collectibles -> COLLECTIBLES / other
Furniture -> APPLIANCE / other
Vacuum -> APPLIANCE / vacuum
Firearms -> SPORTS & OUTDOOR / hunting gear
Firearm Accessories -> SPORTS & OUTDOOR / hunting gear
Farm Implements -> UTILITY TOOLS / other
Demo -> OTHER / other
Other -> OTHER / other
```

Unknown legacy subcategory codes:

```txt
7777 -> OTHER / other
7779 -> OTHER / other
```

These unknown codes use the generic OTHER / other fallback.
