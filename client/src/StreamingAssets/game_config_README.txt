GAME CONFIGURATION FILE GUIDE
============================

File: game_config.json
Location: Assets/StreamingAssets/game_config.json

This file contains all the game settings that can be modified externally without rebuilding the game.
Edit the values below to customize your game experience.

TIMER INTEGRATION
================
The TimerController automatically reads the TimeInSeconds setting from this configuration file.
- When set to a specific time (60, 120, 300, 600): Timer counts down from that time
- When set to "infinity": Timer counts up forever with a static green bar
- Changes take effect immediately when the configuration is loaded or modified

VALID VALUES AND RANGES:
========================

1. TimeInSeconds
   - Valid values: "60", "120", "300", "600", "infinity" (case insensitive)
   - Default: "120"
   - Description: Sets the time limit for the game in seconds
   - Timer Behavior:
     * Specific time (60, 120, 300, 600): Timer counts down from that time
     * "infinity": Timer counts up forever with a static green bar
   - Example: "TimeInSeconds": "120" (2 minutes countdown)
   - Example: "TimeInSeconds": "300" (5 minutes countdown)
   - Example: "TimeInSeconds": "infinity" (no time limit, counts up forever)

2. Difficulty
   - Valid values: "Low", "Medium", "High" (case insensitive)
   - Default: "Medium"
   - Description: Sets the game difficulty level
   - Example: "Difficulty": "High"

3. Lives
   - Valid values: "1", "2", "3", "infinity" (case insensitive)
   - Default: "3"
   - Description: Sets the number of player lives
   - Example: "Lives": "infinity" (unlimited lives)

4. MusicVolume
   - Valid values: 0 to 10 (integer)
   - Default: 7
   - Description: Sets the music volume level (0 = mute, 10 = maximum)
   - Example: "MusicVolume": 5

5. Temperature
   - Valid values: "Low", "Medium", "High" (case insensitive)
   - Default: "Medium"
   - Description: Sets the cooking temperature setting
   - Example: "Temperature": "High"

6. Handedness
   - Valid values: "LeftHanded", "RightHanded" (case insensitive)
   - Default: "RightHanded"
   - Description: Sets the player's handedness preference
   - Example: "Handedness": "LeftHanded"

7. IngredientsPerSkewer
   - Valid values: 1, 2, 3 (integer)
   - Default: 5
   - Description: Sets the number of ingredients per skewer
   - Example: "IngredientsPerSkewer": 3

8. ShelfHeight
   - Valid values: "Low", "Medium", "High" (case insensitive)
   - Default: "Medium"
   - Description: Sets the shelf height setting
   - Example: "ShelfHeight": "Low"

9. NumberOfSkewersForPreparation
   - Valid values: 1, 3, 5, 10 (integer)
   - Default: 5
   - Description: Sets the number of skewers for preparation
   - Example: "NumberOfSkewersForPreparation": 3

EXAMPLE CONFIGURATION:
=====================

{
    "TimeInSeconds": "120",
    "Difficulty": "Medium",
    "Lives": "3",
    "MusicVolume": 7,
    "Temperature": "Medium",
    "Handedness": "RightHanded",
    "IngredientsPerSkewer": 5,
    "ShelfHeight": "Medium",
    "NumberOfSkewersForPreparation": 5
}

TIMER CONFIGURATION EXAMPLES:
============================

COUNTDOWN MODE (2 minutes):
{
    "TimeInSeconds": "120"
}
- Timer starts at 2:00 and counts down to 0:00
- Scrollbar shrinks and changes from green to red
- Timer completes when time reaches zero

INFINITE TIME MODE:
{
    "TimeInSeconds": "infinity"
}
- Timer starts at 0:00 and counts up forever
- Scrollbar stays static and green
- No time limit - player can take as long as needed

QUICK SETTINGS EXAMPLES:
========================

EASY MODE:
{
    "TimeInSeconds": "300",
    "Difficulty": "Low",
    "Lives": "infinity",
    "MusicVolume": 8,
    "Temperature": "Low",
    "Handedness": "RightHanded",
    "IngredientsPerSkewer": 3,
    "ShelfHeight": "Low",
    "NumberOfSkewersForPreparation": 5
}
- Timer: 5-minute countdown with green-to-red scrollbar

HARD MODE:
{
    "TimeInSeconds": "60",
    "Difficulty": "High",
    "Lives": "1",
    "MusicVolume": 5,
    "Temperature": "High",
    "Handedness": "RightHanded",
    "IngredientsPerSkewer": 5,
    "ShelfHeight": "High",
    "NumberOfSkewersForPreparation": 5
}
- Timer: 1-minute countdown with rapid green-to-red scrollbar

LEFT-HANDED MODE:
{
    "TimeInSeconds": "120",
    "Difficulty": "Medium",
    "Lives": "3",
    "MusicVolume": 7,
    "Temperature": "Medium",
    "Handedness": "LeftHanded",
    "IngredientsPerSkewer": 5,
    "ShelfHeight": "Medium",
    "NumberOfSkewersForPreparation": 5
}
- Timer: 2-minute countdown with standard green-to-red scrollbar

NO TIME LIMIT MODE:
{
    "TimeInSeconds": "infinity",
    "Difficulty": "Medium",
    "Lives": "3",
    "MusicVolume": 7,
    "Temperature": "Medium",
    "Handedness": "RightHanded",
    "IngredientsPerSkewer": 5,
    "ShelfHeight": "Medium",
    "NumberOfSkewersForPreparation": 5
}
- Timer: Infinite count-up with static green scrollbar

NOTES:
======
- All string values are case-insensitive
- The game will automatically validate values and use defaults if invalid
- Changes take effect when the game loads the configuration file
- The game creates a backup file automatically when saving changes
- You can reset to defaults by deleting this file (a new one will be created)
- TimerController automatically detects configuration changes and updates in real-time
- Timer mode (countdown vs infinite) is determined by the TimeInSeconds value

TROUBLESHOOTING:
===============
- If the game doesn't load your changes, check that the JSON syntax is valid
- Use a JSON validator online to check for syntax errors
- Make sure all quotes and commas are properly placed
- The game will log errors to the console if configuration is invalid

TIMER TROUBLESHOOTING:
======================
- If timer doesn't update: Check that TimerController has "Use Config Time" enabled
- If timer shows wrong mode: Verify TimeInSeconds value in the JSON file
- If scrollbar doesn't change color: Ensure TimerController is properly assigned in the scene
- For infinite time mode: Make sure "infinity" is spelled correctly (case-insensitive)
- Timer changes are applied automatically when configuration is loaded or modified
