// OpeningSceneWebHelper.js
// This script provides helper functions for the web page to interact with Unity's OpeningScene.

window.OpeningSceneManager = {
    unityInstance: null, // Will be set by the web page after Unity loads

    // Call this after your Unity instance is loaded
    init: function (unityInstance) {
        this.unityInstance = unityInstance;
        console.log("OpeningSceneWebHelper: Initialized with Unity instance.");
    },

    // Function to send mode and config from the web page to Unity
    sendModeAndConfigToUnity: function (mode, config) {
        if (this.unityInstance) {
            const modeAndConfig = {
                mode: mode,
                ...config
            };
            const jsonString = JSON.stringify(modeAndConfig);
            this.unityInstance.SendMessage('SimplifiedOpeningSceneManager', 'OnModeAndConfigReceived', jsonString);
            // Log without the transient 'mode' key
            try {
                const { mode: _ignored, ...logNoMode } = modeAndConfig || {};
                console.log("OpeningSceneWebHelper: Sent mode and config to Unity: " + JSON.stringify(logNoMode));
            } catch (e) {
                // Fallback to minimal log if sanitization fails
                console.log("OpeningSceneWebHelper: Sent mode and config to Unity");
            }
        } else {
            console.error("OpeningSceneWebHelper: Unity instance not initialized. Cannot send mode and config.");
        }
    },

    // Callback function to receive config from Unity (when settings are saved)
    onConfigSent: function (configJson) {
        console.log("OpeningSceneWebHelper: Received config from Unity: " + configJson);
        const config = JSON.parse(configJson);
        
        // You can now save this config to your backend or local storage
        // Example: Save to localStorage
        localStorage.setItem('grillGameConfig', configJson);
        
        // Or send to your backend
        // this.saveConfigToBackend(config);
        
        // Notify your Angular app or other systems
        if (window.angularApp && window.angularApp.onGrillConfigUpdated) {
            window.angularApp.onGrillConfigUpdated(config);
        }
    },

    // Callback function to receive mode and config from Unity (when Unity requests it)
    onModeAndConfigReceived: function (modeAndConfigJson) {
        console.log("OpeningSceneWebHelper: Unity requested mode and config: " + modeAndConfigJson);
        // This is called when Unity requests the current mode and config
        // You should respond by calling sendModeAndConfigToUnity with the current values
    },

    // Callback function when Unity requests to quit
    onQuitRequested: function () {
        console.log("OpeningSceneWebHelper: Unity requested to quit");
        // Handle the quit request (e.g., close the Unity container, redirect, etc.)
        // Example: Close the Unity iframe or redirect to another page
        // window.close(); // or window.location.href = '/some-other-page';
    },

    // Example function to get current config from localStorage or backend
    getCurrentConfig: function () {
        // Try to get from localStorage first
        const savedConfig = localStorage.getItem('grillGameConfig');
        if (savedConfig) {
            return JSON.parse(savedConfig);
        }
        
        // Return default config if none found
        return {
            "m_TimeInSeconds": "300",
            "m_Lives": "3",
            "m_Temperature": "High",
            "m_Handedness": "RightHanded",
            "m_IngredientsPerSkewer": 5,
            "m_NumberOfSkewersForPreparation": 5,
            "mode": "patient"
        };
    },

    // Example function to determine the current mode
    getCurrentMode: function () {
        // This could be determined by URL parameters, user preferences, etc.
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        if (mode === 'settings') {
            return 'settings';
        } else {
            return 'patient';
        }
    },

    // Function to initialize the opening scene with current mode and config
    initializeOpeningScene: function () {
        const mode = this.getCurrentMode();
        const config = this.getCurrentConfig();
        
        // Remove mode from config since it's passed separately
        const configWithoutMode = { ...config };
        delete configWithoutMode.mode;
        
        // Send to Unity
        this.sendModeAndConfigToUnity(mode, configWithoutMode);
    },

    // Example function to save config to backend
    saveConfigToBackend: function (config) {
        // Example using fetch API
        fetch('/api/grill-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Config saved to backend:', data);
        })
        .catch(error => {
            console.error('Error saving config to backend:', error);
        });
    }
};

// Example usage in your HTML page:
/*
// After Unity loads:
window.OpeningSceneManager.init(unityInstance);

// Initialize the opening scene:
window.OpeningSceneManager.initializeOpeningScene();

// Example of how to change mode via URL:
// patient mode: your-page.html
// settings mode: your-page.html?mode=settings
*/
