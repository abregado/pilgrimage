Pilgrimage

A multiplayer game
Node server
Web client (mobile and desktop)
websockets, html, css and vanilla javascript only
as few dependancies as possible, if possible, NONE

Data Structures
Beacon
* CoreIdeals (list of Ideals that can be collected here)
* Current Altars
Altar
* A Ideal variable
* Believers (a list of Pilgrims that have chosen this Altar)
* last change tick
Paths
* 2 Beacons in a list
Pilgrim
* state: Praying (inside ALTAR_CHANGE_TIME, at a Beacon and cannot move or change another altar), Sleeping (hasent been active for 6 hours), Travelling (on a Path), Waiting (At a Beacon and did an action in the last 6 hours)
* Path (null if not Travelling)
* Beacon (null if Travelling)
* carriedIdeal (IdealPrototypeId)
* beleifStructure (a calculated value, which lists the top 3 Ideals from the list of Altars that the Pilgrim is a Beleiver of.)
* passport (list of Beacons the pilgrim has visited)
* seen Ideals (list of Ideals the Pilgrim has seen, either from other Pilgrims, Altars or core Ideals from Beacons)
Client
* which Pilgrim are they controlling
* lastState (Beacon or Path)
* hardwareUUID

Ideals
* IdealPrototypeId
* name-tag (string)
* image (png)
* color (rgb)

Enums
IdealPrototypeId

Constants
A list of Ideals
MOVEMENT_SPEED (metres per tick)
ALTAR_PROTECTION_TIME (how many ticks is an Altar safe for after it is changed)
ALTAR_CHANGE_TIME (how long is a Pilgrim locked out of moving after changing an Altar)



Screens

There are two Tabbed screens. The tabs are at the bottom of the screen. The first one Shows either the Beacon display, the Path display or the Arrival screen, based on the state of the Clients Pilgrim. The second tab shows information about the Clients Pilgrim, the list of Beacons visited (and their core Ideals) and Ideals seen (sorted by the number of Altars in which the Pilgrim is contained as a believer. The number of kms walked by the pilgrim is shown. The age of the Pilgrim (time since created) is shown.

If the Clients Pilgrim is at a Beacon, then show them the Beacon screen.
Beacon display. 
Shows:
* how many Altars and which Ideals are placed into them, and if they are the strongest Ideal.
* Shows how many Pilgrims are here now
* Shows how many Pilgrims are awake (were active in the last 6 hours)
Player can:
* Change the Ideal in an Altar, if it is not the strongest Altar, no longer Safe. The Ideal that the Pilgrim is carrying is placed in the Altar, and they no longer count as carrying it. When an Altar is changed, its Believers list is cleared.
* Take a core Ideal from this Beacon, replacing the one the Pilgrim is carrying.
* Pray at an Altar, adding this Pilgrim to its beleiver list (and removing the Pilgrim from all other Altars at this Beacon)
* Begin down a Path. The Pilgrim begins travelling to another Beacon.

If the Clients Pilgrim is on a Path, then show them:
* their progress along it
* the name of the Beacon at each end of the Path.
* Which Ideal the Pilgrim is carrying
* A list of all Ideals carried by other Pilgrims that this Pilgrim has passed on their journey
* how many Pilgrims you passed going the other way so far
* Show the core ideals of both Beacons on the Path IF the Pilgrim has visited that Beacon before.
The Player can
* reverse their direction along the path
* select of the Ideals of other Pilgrims and swap the one they are carrying for it.

If the Client has lastState Path and on the latest update it should show the Beacon display (because the Pilgrim arrived), we show an Arrival screen. The lastState is only changed to Beacon once the user clicks OK. On the arrival screen, show how many Pilgrims you passed and give the user one last chance to change their carried Ideal based on the Pilgrims they passed. In the arrival screen The user does not a last change to change direction. Use a heading in the Arrival screen saying ARRIVING AT [BEACON NAME]. Show the core Ideals from this Beacon if the Pilgrim has vistited here before.


We will use node.js for the server, and a web app for the client. The Client must have css styling for using on a phone in protrait mode, and on the desktop. The app must be able to be installed as a PWA. The deviceID is stored in localStorage and transmitted to the server to tell it which Client is joining/playing.

We will use a system of networkActions. Actions get queued up by the server and then processed. Each action sent has a tickStamp, the tick that the client thinks is current is used. After sending an action, the client will request an update every 2 seconds for a minute, and then go down to once every 60 seconds. We want to limit the amount of traffic the game generates. We can also store important expected future events on the client as a list of timeStamps, and do a request when these happen. Numbers on the client should count down based on expected action trigger times, so the user sees them changing every frame without requesting updates every frame.

For the Ideals, generate 12 names for philosophical virtues, suitable colors, and placeholder images 256x256. I will replace the images after we are done.

For the Beacons, start with 4 Beacons, each with 3 Altars and 3 Core Ideals each. Make sure all 12 Ideals are placed in these beacons as core ideals. To start with, the 3 Altars will have the same Ideals set as the Core Ideals in the beacons.

Generate 2-3 Paths from each Beacon. Give them different lengths in metres (from 1000 to 5000).

The simulation is completly server side. The client can save data to local storage if it helps us display it locally.