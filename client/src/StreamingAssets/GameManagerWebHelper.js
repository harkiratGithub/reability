/**
 * Game Manager Web Helper
 * JavaScript helper for integrating Unity WebGL Game Manager with web pages
 * Handles score updates and debug communication
 */

(function() {
    'use strict';

    // Global namespace for Game Manager
    window.GameManager = window.GameManager || {};

    // Current game state
    let currentScore = 0;
    let gameMode = 'patient';
    let unityInstance = null;

    /**
     * Initialize the Game Manager system
     * @param {Object} unityInst - Unity WebGL instance
     */
    GameManager.init = function(unityInst) {
        unityInstance = unityInst;
        console.log('GameManager initialized with Unity instance');
        
        // Set up global callback functions that Unity can call
        setupUnityCallbacks();
    };

    /**
     * Set up communication with Unity
     */
    function setupUnityCallbacks() {
        // Global functions that Unity can call
        window.onScoreChange = function(score) {
            console.log('Received score change from Unity:', score);
            currentScore = score;
            notifyScoreChange(score);
        };

        window.onUnityDebug = function(message) {
            console.log('[Unity Debug]:', message);
            notifyDebugMessage(message);
        };

        // Additional game event callbacks
        window.onGameStart = function() {
            console.log('Game started');
            notifyGameEvent('start');
        };

        window.onGameEnd = function(finalScore) {
            console.log('Game ended with score:', finalScore);
            notifyGameEvent('end', { score: finalScore });
        };

        window.onGamePause = function() {
            console.log('Game paused');
            notifyGameEvent('pause');
        };

        window.onGameResume = function() {
            console.log('Game resumed');
            notifyGameEvent('resume');
        };
    }

    /**
     * Notify external systems of score change
     */
    function notifyScoreChange(score) {
        // Dispatch custom event
        const event = new CustomEvent('gameScoreChange', {
            detail: { score: score, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);

        // Send to parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'GAME_SCORE_CHANGE',
                data: { score: score, timestamp: new Date().toISOString() }
            }, '*');
        }

        // Call callback if registered
        if (GameManager.onScoreChange) {
            GameManager.onScoreChange(score);
        }
    }

    /**
     * Notify external systems of debug message
     */
    function notifyDebugMessage(message) {
        // Dispatch custom event
        const event = new CustomEvent('unityDebugMessage', {
            detail: { message: message, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);

        // Send to parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'UNITY_DEBUG_MESSAGE',
                data: { message: message, timestamp: new Date().toISOString() }
            }, '*');
        }

        // Call callback if registered
        if (GameManager.onDebugMessage) {
            GameManager.onDebugMessage(message);
        }
    }

    /**
     * Notify external systems of game events
     */
    function notifyGameEvent(eventType, data = {}) {
        // Dispatch custom event
        const event = new CustomEvent('gameEvent', {
            detail: { 
                type: eventType, 
                data: data, 
                timestamp: new Date().toISOString() 
            }
        });
        window.dispatchEvent(event);

        // Send to parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'GAME_EVENT',
                data: { 
                    eventType: eventType, 
                    data: data, 
                    timestamp: new Date().toISOString() 
                }
            }, '*');
        }

        // Call callback if registered
        if (GameManager.onGameEvent) {
            GameManager.onGameEvent(eventType, data);
        }
    }

    /**
     * Public API methods
     */

    /**
     * Get current score
     */
    GameManager.getCurrentScore = function() {
        return currentScore;
    };

    /**
     * Get current game mode
     */
    GameManager.getCurrentGameMode = function() {
        return gameMode;
    };

    /**
     * Set game mode
     */
    GameManager.setGameMode = function(mode) {
        gameMode = mode;
        console.log('Game mode set to:', mode);
    };

    /**
     * Send command to Unity
     */
    GameManager.sendCommandToUnity = function(command, data = '') {
        if (!unityInstance || !unityInstance.SendMessage) {
            console.warn('Unity instance not available for sending command');
            return false;
        }

        try {
            unityInstance.SendMessage('LeftHandActionController', 'ReceiveCommandFromWeb', command + ':' + data);
            console.log('Command sent to Unity:', command, data);
            return true;
        } catch (error) {
            console.error('Error sending command to Unity:', error);
            return false;
        }
    };

    /**
     * Send landmark data to Unity
     */
    GameManager.sendLandmarkDataToUnity = function(landmarkData) {
        if (!unityInstance || !unityInstance.SendMessage) {
            console.warn('Unity instance not available for sending landmark data');
            return false;
        }

        try {
            const landmarkJson = JSON.stringify(landmarkData);
            unityInstance.SendMessage('GameManager', 'ReceiveLandmarkData', landmarkJson);
            return true;
        } catch (error) {
            console.error('Error sending landmark data to Unity:', error);
            return false;
        }
    };

    /**
     * Set marker visibility
     */
    GameManager.setMarkerVisibility = function(isVisible) {
        return GameManager.sendCommandToUnity('setMarkerVisibility', isVisible.toString());
    };

    /**
     * Start game
     */
    GameManager.startGame = function() {
        return GameManager.sendCommandToUnity('startGame');
    };

    /**
     * Pause game
     */
    GameManager.pauseGame = function() {
        return GameManager.sendCommandToUnity('pauseGame');
    };

    /**
     * Resume game
     */
    GameManager.resumeGame = function() {
        return GameManager.sendCommandToUnity('resumeGame');
    };

    /**
     * Reset game
     */
    GameManager.resetGame = function() {
        return GameManager.sendCommandToUnity('resetGame');
    };

    /**
     * Callback functions (set by external code)
     */
    GameManager.onScoreChange = null;
    GameManager.onDebugMessage = null;
    GameManager.onGameEvent = null;

    /**
     * Handle messages from parent window (for iframe scenarios)
     */
    window.addEventListener('message', function(event) {
        if (!event.data || typeof event.data !== 'object') return;

        switch (event.data.type) {
            case 'GAME_COMMAND':
                console.log('Received game command from parent:', event.data.data);
                GameManager.sendCommandToUnity(event.data.data.command, event.data.data.data);
                break;

            case 'LANDMARK_DATA':
                console.log('Received landmark data from parent:', event.data.data);
                GameManager.sendLandmarkDataToUnity(event.data.data);
                break;

            case 'SET_MARKER_VISIBILITY':
                console.log('Received marker visibility command from parent:', event.data.data);
                GameManager.setMarkerVisibility(event.data.data.isVisible);
                break;
        }
    });

    // Auto-initialize if Unity instance is already available
    if (typeof unityInstance !== 'undefined' && unityInstance) {
        GameManager.init(unityInstance);
    }

    console.log('GameManager Web Helper loaded');

})();
