/**
 * Grill Settings Web Helper
 * JavaScript helper for integrating Unity WebGL Grill Settings with web pages
 * Include this script in your web page for easy integration
 */

(function() {
    'use strict';

    // Global namespace for Grill Settings
    window.GrillSettings = window.GrillSettings || {};

    // Default settings structure
    const DEFAULT_SETTINGS = {
        SkewerSlots: 3,
        NumberOfSkewers: 5,
        IngredientsPerSkewer: 5,
        Lives: -1, // Infinity
        OrderTime: -1, // Infinity
        GrillTemperature: 1, // High
        Orientation: 1, // Right
        VolumeLevel: 50 // Medium
    };

    // Current settings storage
    let currentSettings = { ...DEFAULT_SETTINGS };

    // Unity instance reference
    let unityInstance = null;

    /**
     * Initialize the Grill Settings system
     * @param {Object} unityInst - Unity WebGL instance
     */
    GrillSettings.init = function(unityInst) {
        unityInstance = unityInst;
        console.log('GrillSettings initialized with Unity instance');
        
        // Set up message listeners for iframe communication
        if (window.parent !== window) {
            window.addEventListener('message', handleParentMessage);
        }
        
        // Set up Unity communication
        setupUnityCommunication();
    };

    /**
     * Set up communication with Unity
     */
    function setupUnityCommunication() {
        // Global functions that Unity can call
        window.onGrillSettingsUpdate = function(settings) {
            console.log('Received settings update from Unity:', settings);
            currentSettings = { ...settings };
            notifySettingsUpdate(settings);
        };

        window.onGrillSettingsRequest = function() {
            console.log('Unity requested current settings');
            sendSettingsToUnity();
        };

        window.onGrillSettingsChanged = function(settings) {
            console.log('Received settings change notification from Unity:', settings);
            currentSettings = { ...settings };
            notifySettingsChange(settings);
        };

        // Global functions for Unity to call
        window.getGrillSettings = function() {
            return { ...currentSettings };
        };

        window.setGrillSettings = function(settings) {
            currentSettings = { ...settings };
            if (unityInstance && unityInstance.SendMessage) {
                const settingsJson = JSON.stringify(settings);
                unityInstance.SendMessage('GrillSettingsManager', 'OnSettingsReceivedFromWeb', settingsJson);
            }
        };
    }

    /**
     * Handle messages from parent window (for iframe scenarios)
     */
    function handleParentMessage(event) {
        if (!event.data || typeof event.data !== 'object') return;

        switch (event.data.type) {
            case 'GRILL_SETTINGS_UPDATE':
                console.log('Received settings update from parent:', event.data.data);
                currentSettings = { ...event.data.data };
                notifySettingsUpdate(event.data.data);
                break;

            case 'GRILL_SETTINGS_REQUEST':
                console.log('Parent requested current settings');
                sendSettingsToParent();
                break;

            case 'GRILL_SETTINGS_CHANGED':
                console.log('Received settings change from parent:', event.data.data);
                currentSettings = { ...event.data.data };
                notifySettingsChange(event.data.data);
                break;

            case 'GRILL_SETTINGS_SEND_TO_UNITY':
                console.log('Parent wants to send settings to Unity:', event.data.data);
                sendSettingsToUnity(event.data.data);
                break;
        }
    }

    /**
     * Send current settings to Unity
     */
    function sendSettingsToUnity(settings = null) {
        if (!unityInstance || !unityInstance.SendMessage) {
            console.warn('Unity instance not available for sending settings');
            return;
        }

        const settingsToSend = settings || currentSettings;
        const settingsJson = JSON.stringify(settingsToSend);
        
        try {
            unityInstance.SendMessage('GrillSettingsManager', 'OnSettingsReceivedFromWeb', settingsJson);
            console.log('Settings sent to Unity:', settingsToSend);
        } catch (error) {
            console.error('Error sending settings to Unity:', error);
        }
    }

    /**
     * Send current settings to parent window
     */
    function sendSettingsToParent() {
        if (window.parent === window) return;

        try {
            window.parent.postMessage({
                type: 'GRILL_SETTINGS_RESPONSE',
                data: { ...currentSettings }
            }, '*');
            console.log('Settings sent to parent:', currentSettings);
        } catch (error) {
            console.error('Error sending settings to parent:', error);
        }
    }

    /**
     * Notify external systems of settings update
     */
    function notifySettingsUpdate(settings) {
        // Dispatch custom event
        const event = new CustomEvent('grillSettingsUpdate', {
            detail: { ...settings }
        });
        window.dispatchEvent(event);

        // Call callback if registered
        if (GrillSettings.onSettingsUpdate) {
            GrillSettings.onSettingsUpdate(settings);
        }
    }

    /**
     * Notify external systems of settings change
     */
    function notifySettingsChange(settings) {
        // Dispatch custom event
        const event = new CustomEvent('grillSettingsChange', {
            detail: { ...settings }
        });
        window.dispatchEvent(event);

        // Call callback if registered
        if (GrillSettings.onSettingsChange) {
            GrillSettings.onSettingsChange(settings);
        }
    }

    /**
     * Public API methods
     */

    /**
     * Get current settings
     */
    GrillSettings.getCurrentSettings = function() {
        return { ...currentSettings };
    };

    /**
     * Set settings and send to Unity
     */
    GrillSettings.setSettings = function(settings) {
        currentSettings = { ...settings };
        sendSettingsToUnity();
        notifySettingsUpdate(settings);
    };

    /**
     * Update a specific setting
     */
    GrillSettings.updateSetting = function(key, value) {
        if (currentSettings.hasOwnProperty(key)) {
            currentSettings[key] = value;
            sendSettingsToUnity();
            notifySettingsUpdate(currentSettings);
        } else {
            console.warn('Unknown setting key:', key);
        }
    };

    /**
     * Reset settings to defaults
     */
    GrillSettings.resetToDefaults = function() {
        currentSettings = { ...DEFAULT_SETTINGS };
        sendSettingsToUnity();
        notifySettingsUpdate(currentSettings);
    };

    /**
     * Request settings from Unity
     */
    GrillSettings.requestSettingsFromUnity = function() {
        if (unityInstance && unityInstance.SendMessage) {
            unityInstance.SendMessage('GrillSettingsManager', 'RequestSettingsFromWebGL', '');
        }
    };

    /**
     * Set callback for settings updates
     */
    GrillSettings.onSettingsUpdate = null;

    /**
     * Set callback for settings changes
     */
    GrillSettings.onSettingsChange = null;

    /**
     * Utility function to convert enum values to human-readable strings
     */
    GrillSettings.getSettingDisplayValue = function(key, value) {
        const displayValues = {
            SkewerSlots: { 1: '1', 2: '2', 3: '3' },
            NumberOfSkewers: { 1: '1', 3: '3', 5: '5', 10: '10' },
            IngredientsPerSkewer: { 3: '3', 4: '4', 5: '5' },
            Lives: { 1: '1', 2: '2', 3: '3', '-1': '∞' },
            OrderTime: { 5: '5', 10: '10', 30: '30', '-1': '∞' },
            GrillTemperature: { 0: 'LOW', 1: 'HIGH' },
            Orientation: { 0: 'LEFT', 1: 'RIGHT' },
            VolumeLevel: { 0: '0', 25: '25', 50: '50', 75: '75', 100: '100' }
        };

        return displayValues[key] && displayValues[key][value] ? displayValues[key][value] : value.toString();
    };

    // Auto-initialize if Unity instance is already available
    if (typeof unityInstance !== 'undefined' && unityInstance) {
        GrillSettings.init(unityInstance);
    }

    console.log('GrillSettings Web Helper loaded');

})();
