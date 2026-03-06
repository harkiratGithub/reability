# Unity WebGL with AngularJS Integration Guide

## Overview

This guide provides a complete implementation for integrating Unity WebGL games with AngularJS applications, specifically designed for the Reability physiotherapy platform.

## File Structure

```
your-angularjs-app/
├── index.html
├── js/
│   └── AngularJS_Unity_Service.js
├── Build/                    # Unity WebGL build files
│   ├── Grill_OB.data
│   ├── Grill_OB.framework.js
│   ├── Grill_OB.wasm
│   └── Grill_OB.loader.js
└── StreamingAssets/          # Unity helper files
    ├── OpeningSceneWebHelper.js
    ├── GrillSettingsWebHelper.js
    └── GameManagerWebHelper.js
```

## Quick Setup

### 1. Include Required Files in index.html

```html
<!DOCTYPE html>
<html ng-app="yourApp">
<head>
    <!-- AngularJS -->
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
    
    <!-- Unity WebGL Files -->
    <script src="Build/Grill_OB.loader.js"></script>
    
    <!-- Unity Helper Files -->
    <script src="StreamingAssets/OpeningSceneWebHelper.js"></script>
    <script src="StreamingAssets/GrillSettingsWebHelper.js"></script>
    <script src="StreamingAssets/GameManagerWebHelper.js"></script>
    
    <!-- AngularJS Unity Integration Service -->
    <script src="js/AngularJS_Unity_Service.js"></script>
</head>
<body>
    <!-- Your app content -->
</body>
</html>
```

### 2. Basic AngularJS Setup

The `AngularJS_Unity_Service.js` file includes:

- **UnityIntegrationService**: Main service for Unity communication
- **UnityEventManager**: Event management system
- **UnityGameDirective**: AngularJS directive for Unity integration
- **GameController**: Example controller implementation

### 3. HTML Template

```html
<div ng-controller="GameController as gameCtrl">
    <!-- Unity Game Container -->
    <div id="unity-container">
        <canvas id="unity-canvas"></canvas>
        <div id="unity-loading-bar" ng-show="!gameCtrl.unityReady">
            <div id="unity-progress-bar-full"></div>
        </div>
    </div>
    
    <!-- Game Controls -->
    <div class="controls">
        <button ng-click="gameCtrl.startPatientMode()" 
                ng-disabled="!gameCtrl.unityReady">
            Start Patient Mode
        </button>
        <button ng-click="gameCtrl.startPhysiotherapyMode()" 
                ng-disabled="!gameCtrl.unityReady">
            Start Physiotherapy Mode
        </button>
    </div>
    
    <!-- Score Display -->
    <div class="score">
        <h3>Score: {{gameCtrl.currentScore}}</h3>
    </div>
</div>
```

## Backend API Endpoints

The integration requires these API endpoints:

### GET /api/game/settings/patient
Returns patient-specific game settings:

```javascript
{
    "SkewerSlots": 3,
    "NumberOfSkewers": 5,
    "IngredientsPerSkewer": 5,
    "Lives": 3,
    "OrderTime": 300,
    "GrillTemperature": 1,
    "Orientation": 1,
    "VolumeLevel": 50
}
```

### POST /api/game/settings
Saves game settings to the backend.

### POST /api/game/score
Saves game score data:

```javascript
{
    "score": 150,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "gameMode": "patient"
}
```

## Communication Flow

### Patient Mode
1. User clicks "Start Patient Mode"
2. AngularJS fetches patient settings from backend
3. Settings sent to Unity via `SendMessage`
4. Unity starts game with patient settings
5. During gameplay, Unity sends score updates to AngularJS
6. AngularJS saves scores to backend

### Physiotherapy Mode
1. User clicks "Start Physiotherapy Mode"
2. Unity opens settings interface
3. User modifies settings in Unity
4. Unity sends updated settings to AngularJS
5. AngularJS saves settings to backend

## Service Methods

### UnityIntegrationService

#### initializeUnity(config)
Initializes the Unity WebGL instance.

```javascript
UnityIntegrationService.initializeUnity({
    apiBaseUrl: '/api/game'
}).then(function(unityInstance) {
    console.log('Unity ready!');
});
```

#### startPatientMode()
Starts the game in patient mode with default settings.

#### startPhysiotherapyMode()
Starts the game in physiotherapy mode with settings interface.

#### sendCommandToUnity(command, data)
Sends commands to Unity.

```javascript
UnityIntegrationService.sendCommandToUnity('startGame');
UnityIntegrationService.sendCommandToUnity('setMarkerVisibility', 'true');
```

#### sendLandmarkDataToUnity(landmarkData)
Sends pose detection data to Unity.

```javascript
UnityIntegrationService.sendLandmarkDataToUnity({
    landmarks: [...],
    timestamp: Date.now()
});
```

## Unity Callbacks

The service sets up these global callback functions that Unity can call:

- `onScoreChange(score)` - Called when score changes
- `onGrillSettingsUpdate(settings)` - Called when settings are updated
- `onUnityDebug(message)` - Called for debug messages
- `onGameStart()` - Called when game starts
- `onGameEnd(finalScore)` - Called when game ends

## Event System

The integration includes an event system for communication:

```javascript
// Listen for Unity events
UnityEventManager.on('scoreChange', function(data) {
    console.log('Score changed:', data.score);
});

UnityEventManager.on('settingsUpdate', function(data) {
    console.log('Settings updated:', data.settings);
});
```

## Testing

Use the provided test file `unity-integration-test.html` to verify the integration:

1. Open the test file in a browser
2. Check that Unity loads successfully
3. Test the API connection
4. Verify patient and physiotherapy modes work
5. Check score updates and settings synchronization

## Troubleshooting

### Common Issues

#### Unity not loading
- Check file paths in UnityLoader configuration
- Ensure all Unity build files are accessible
- Check browser console for errors
- Verify CORS settings if loading from different domain

#### Communication not working
- Verify Unity instance is loaded before sending messages
- Check that callback functions are properly defined
- Ensure AngularJS digest cycle is triggered
- Check Unity GameObject names match SendMessage calls

#### Settings not updating
- Verify JSON format is correct
- Check Unity scripts are properly attached
- Ensure Unity SendMessage calls use correct method names

### Debug Commands

```javascript
// Check Unity state
console.log(UnityIntegrationService.getState());

// Send test command to Unity
UnityIntegrationService.sendCommandToUnity('testCommand', 'testData');

// Check if Unity is ready
console.log('Unity ready:', vm.unityReady);
```

## Integration with Existing Angular Application

To integrate with your existing Angular application:

1. Include the Unity integration files in your build process
2. Add the `unityIntegration` module as a dependency
3. Update your existing game components to use the new service
4. Modify your routing to include Unity game pages
5. Update your backend to include the new API endpoints

## Security Considerations

- Validate all data sent to Unity
- Sanitize settings before saving to database
- Implement proper authentication for API endpoints
- Use HTTPS for all communications
- Validate Unity build files integrity

## Performance Optimization

- Lazy load Unity when needed
- Implement proper error handling and retry logic
- Use Web Workers for heavy computations
- Optimize Unity build size
- Implement proper caching strategies

## Next Steps

1. Customize the game settings structure for your needs
2. Implement user authentication and session management
3. Add error handling and retry logic
4. Implement real-time score tracking
5. Add analytics and reporting features
6. Integrate with existing patient management system

## Support

For issues or questions regarding this integration:

1. Check the browser console for error messages
2. Verify all files are properly included
3. Test API endpoints independently
4. Check Unity build configuration
5. Review the troubleshooting section above

## Version History

- **v1.0**: Initial implementation with basic Unity-AngularJS integration
- **v1.1**: Added comprehensive event system and error handling
- **v1.2**: Added pose detection integration and enhanced debugging
