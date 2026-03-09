/**
 * AngularJS Unity Integration Service
 * Complete service for integrating Unity WebGL with AngularJS applications
 * 
 * Usage:
 * 1. Include this file in your AngularJS application
 * 2. Inject 'UnityIntegrationService' into your controllers
 * 3. Use the provided methods for Unity communication
 */

angular.module('unityIntegration', [])
    .service('UnityIntegrationService', UnityIntegrationService)
    .factory('UnityEventManager', UnityEventManager)
    .directive('unityGame', UnityGameDirective);

// Main app module that includes unity integration
angular.module('yourApp', ['unityIntegration']);

/**
 * Main Unity Integration Service
 */
function UnityIntegrationService($q, $http, $timeout, UnityEventManager) {
    var service = this;
    
    // Configuration
    var config = {
        unityBuildPath: 'Build/',
        streamingAssetsPath: 'StreamingAssets/',
        apiBaseUrl: '/api/game',
        retryAttempts: 3,
        retryDelay: 1000
    };
    
    // State management
    var state = {
        unityInstance: null,
        isInitialized: false,
        currentScore: 0,
        gameMode: 'patient',
        currentSettings: {},
        isGameRunning: false,
        lastUpdate: null
    };
    
    // Event callbacks
    var callbacks = {
        onScoreChange: null,
        onSettingsUpdate: null,
        onGameEvent: null,
        onDebugMessage: null,
        onUnityReady: null
    };
    
    /**
     * Initialize Unity WebGL instance
     */
    service.initializeUnity = function(unityConfig) {
        var deferred = $q.defer();
        
        // Merge with default config
        var finalConfig = angular.extend({}, config, unityConfig);
        
        // Unity WebGL configuration
        var unityWebGLConfig = {
            dataUrl: finalConfig.unityBuildPath + "Grill_OB.data",
            frameworkUrl: finalConfig.unityBuildPath + "Grill_OB.framework.js",
            codeUrl: finalConfig.unityBuildPath + "Grill_OB.wasm",
            streamingAssetsUrl: finalConfig.streamingAssetsPath,
            companyName: finalConfig.companyName || "YourCompany",
            productName: finalConfig.productName || "Physiotherapy Game",
            productVersion: finalConfig.productVersion || "1.0"
        };
        
        // Load Unity instance
        var container = document.querySelector("#unity-container");
        if (!container) {
            deferred.reject('Unity container not found');
            return deferred.promise;
        }
        
        var canvas = document.querySelector("#unity-canvas");
        var loadingBar = document.querySelector("#unity-loading-bar");
        var progressBarFull = document.querySelector("#unity-progress-bar-full");
        
        try {
            var unityInstance = UnityLoader.instantiate(container, unityWebGLConfig, function(unityInstance) {
                // Unity loaded successfully
                if (loadingBar) loadingBar.style.display = "none";
                
                state.unityInstance = unityInstance;
                state.isInitialized = true;
                
                // Setup Unity callbacks
                setupUnityCallbacks();
                
                // Initialize helper systems
                initializeHelperSystems();
                
                // Notify that Unity is ready
                if (callbacks.onUnityReady) {
                    callbacks.onUnityReady(unityInstance);
                }
                
                UnityEventManager.emit('unityReady', unityInstance);
                
                deferred.resolve(unityInstance);
            });
        } catch (error) {
            deferred.reject('Failed to load Unity: ' + error.message);
        }
        
        return deferred.promise;
    };
    
    /**
     * Setup Unity communication callbacks
     */
    function setupUnityCallbacks() {
        // Score change callback
        window.onScoreChange = function(score) {
            $timeout(function() {
                state.currentScore = score;
                state.lastUpdate = new Date();
                
                if (callbacks.onScoreChange) {
                    callbacks.onScoreChange(score);
                }
                
                UnityEventManager.emit('scoreChange', { score: score });
                
                // Auto-save score to backend
                service.saveScoreToBackend(score);
            });
        };
        
        // Settings update callback
        window.onGrillSettingsUpdate = function(settings) {
            $timeout(function() {
                state.currentSettings = settings;
                state.lastUpdate = new Date();
                
                if (callbacks.onSettingsUpdate) {
                    callbacks.onSettingsUpdate(settings);
                }
                
                UnityEventManager.emit('settingsUpdate', { settings: settings });
                
                // Auto-save settings to backend
                service.saveSettingsToBackend(settings);
            });
        };
        
        // Debug message callback
        window.onUnityDebug = function(message) {
            $timeout(function() {
                if (callbacks.onDebugMessage) {
                    callbacks.onDebugMessage(message);
                }
                
                UnityEventManager.emit('debugMessage', { message: message });
            });
        };
        
        // Game event callbacks
        window.onGameStart = function() {
            $timeout(function() {
                state.isGameRunning = true;
                
                if (callbacks.onGameEvent) {
                    callbacks.onGameEvent('start');
                }
                
                UnityEventManager.emit('gameEvent', { type: 'start' });
            });
        };
        
        window.onGameEnd = function(finalScore) {
            $timeout(function() {
                state.isGameRunning = false;
                
                if (callbacks.onGameEvent) {
                    callbacks.onGameEvent('end', { score: finalScore });
                }
                
                UnityEventManager.emit('gameEvent', { type: 'end', data: { score: finalScore } });
            });
        };
    }
    
    /**
     * Initialize helper systems
     */
    function initializeHelperSystems() {
        // Initialize OpeningSceneManager
        if (window.OpeningSceneManager) {
            window.OpeningSceneManager.init(state.unityInstance);
        }
        
        // Initialize GrillSettings
        if (window.GrillSettings) {
            window.GrillSettings.init(state.unityInstance);
        }
        
        // Initialize GameManager
        if (window.GameManager) {
            window.GameManager.init(state.unityInstance);
        }
    }
    
    /**
     * Start patient mode
     */
    service.startPatientMode = function(settings) {
        if (!state.isInitialized) {
            return $q.reject('Unity not initialized');
        }
        
        var deferred = $q.defer();
        
        // Get patient settings if not provided
        if (!settings) {
            service.getPatientSettings()
                .then(function(patientSettings) {
                    sendModeAndConfigToUnity('patient', patientSettings);
                    deferred.resolve();
                })
                .catch(function(error) {
                    deferred.reject(error);
                });
        } else {
            sendModeAndConfigToUnity('patient', settings);
            deferred.resolve();
        }
        
        return deferred.promise;
    };
    
    /**
     * Start physiotherapy mode
     */
    service.startPhysiotherapyMode = function(settings) {
        if (!state.isInitialized) {
            return $q.reject('Unity not initialized');
        }
        
        var deferred = $q.defer();
        
        // Get current settings if not provided
        if (!settings) {
            settings = state.currentSettings;
        }
        
        sendModeAndConfigToUnity('settings', settings);
        state.gameMode = 'physiotherapy';
        
        deferred.resolve();
        return deferred.promise;
    };
    
    /**
     * Send mode and config to Unity
     */
    function sendModeAndConfigToUnity(mode, config) {
        if (state.unityInstance && state.unityInstance.SendMessage) {
            var modeAndConfig = {
                mode: mode,
                ...config
            };
            var jsonString = JSON.stringify(modeAndConfig);
            state.unityInstance.SendMessage('SimplifiedOpeningSceneManager', 'OnModeAndConfigReceived', jsonString);
        }
    }
    
    /**
     * Send settings to Unity
     */
    service.sendSettingsToUnity = function(settings) {
        if (!state.isInitialized) {
            return $q.reject('Unity not initialized');
        }
        
        if (state.unityInstance && state.unityInstance.SendMessage) {
            var settingsJson = JSON.stringify(settings);
            state.unityInstance.SendMessage('GrillSettingsManager', 'OnSettingsReceivedFromWeb', settingsJson);
            state.currentSettings = settings;
        }
        
        return $q.resolve();
    };
    
    /**
     * Send command to Unity
     */
    service.sendCommandToUnity = function(command, data) {
        if (!state.isInitialized) {
            return $q.reject('Unity not initialized');
        }
        
        if (state.unityInstance && state.unityInstance.SendMessage) {
            var commandString = data ? command + ':' + data : command;
            state.unityInstance.SendMessage('GameManager', 'ReceiveCommandFromWeb', commandString);
        }
        
        return $q.resolve();
    };
    
    /**
     * Send landmark data to Unity
     */
    service.sendLandmarkDataToUnity = function(landmarkData) {
        if (!state.isInitialized) {
            return $q.reject('Unity not initialized');
        }
        
        if (state.unityInstance && state.unityInstance.SendMessage) {
            var landmarkJson = JSON.stringify(landmarkData);
            state.unityInstance.SendMessage('GameManager', 'ReceiveLandmarkData', landmarkJson);
        }
        
        return $q.resolve();
    };
    
    /**
     * Get patient settings from backend
     */
    service.getPatientSettings = function() {
        return $http.get(config.apiBaseUrl + '/settings/patient')
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Failed to get patient settings:', error);
                return service.getDefaultSettings();
            });
    };
    
    /**
     * Save settings to backend
     */
    service.saveSettingsToBackend = function(settings) {
        return $http.post(config.apiBaseUrl + '/settings', settings)
            .then(function(response) {
                console.log('Settings saved to backend:', response.data);
                return response.data;
            })
            .catch(function(error) {
                console.error('Failed to save settings:', error);
                throw error;
            });
    };
    
    /**
     * Save score to backend
     */
    service.saveScoreToBackend = function(score) {
        var scoreData = {
            score: score,
            timestamp: new Date().toISOString(),
            gameMode: state.gameMode
        };
        
        return $http.post(config.apiBaseUrl + '/score', scoreData)
            .then(function(response) {
                console.log('Score saved to backend:', response.data);
                return response.data;
            })
            .catch(function(error) {
                console.error('Failed to save score:', error);
                throw error;
            });
    };
    
    /**
     * Get default settings
     */
    service.getDefaultSettings = function() {
        return {
            SkewerSlots: 3,
            NumberOfSkewers: 5,
            IngredientsPerSkewer: 5,
            Lives: 3,
            OrderTime: 120,
            GrillTemperature: 1,
            Orientation: 1,
            VolumeLevel: 50
        };
    };
    
    /**
     * Get current state
     */
    service.getState = function() {
        return angular.copy(state);
    };
    
    /**
     * Set callbacks
     */
    service.setOnScoreChange = function(callback) {
        callbacks.onScoreChange = callback;
    };
    
    service.setOnSettingsUpdate = function(callback) {
        callbacks.onSettingsUpdate = callback;
    };
    
    service.setOnGameEvent = function(callback) {
        callbacks.onGameEvent = callback;
    };
    
    service.setOnDebugMessage = function(callback) {
        callbacks.onDebugMessage = callback;
    };
    
    service.setOnUnityReady = function(callback) {
        callbacks.onUnityReady = callback;
    };
    
    /**
     * Update configuration
     */
    service.updateConfig = function(newConfig) {
        angular.extend(config, newConfig);
    };
    
    return service;
}

/**
 * Unity Event Manager Factory
 */
function UnityEventManager($rootScope) {
    var eventManager = {
        events: {},
        
        on: function(eventName, callback) {
            if (!this.events[eventName]) {
                this.events[eventName] = [];
            }
            this.events[eventName].push(callback);
        },
        
        off: function(eventName, callback) {
            if (this.events[eventName]) {
                var index = this.events[eventName].indexOf(callback);
                if (index > -1) {
                    this.events[eventName].splice(index, 1);
                }
            }
        },
        
        emit: function(eventName, data) {
            if (this.events[eventName]) {
                this.events[eventName].forEach(function(callback) {
                    callback(data);
                });
            }
            
            // Also emit on root scope for AngularJS integration
            $rootScope.$emit('unity:' + eventName, data);
        }
    };
    
    return eventManager;
}

/**
 * Unity Game Directive
 */
function UnityGameDirective(UnityIntegrationService) {
    return {
        restrict: 'E',
        template: `
            <div id="unity-container">
                <canvas id="unity-canvas"></canvas>
                <div id="unity-loading-bar" ng-show="!unityLoaded">
                    <div id="unity-progress-bar-full"></div>
                </div>
            </div>
        `,
        scope: {
            config: '=',
            onReady: '&',
            onScoreChange: '&',
            onSettingsUpdate: '&'
        },
        link: function(scope, element, attrs) {
            scope.unityLoaded = false;
            
            // Initialize Unity when directive loads
            UnityIntegrationService.initializeUnity(scope.config)
                .then(function(unityInstance) {
                    scope.unityLoaded = true;
                    scope.$apply();
                    
                    if (scope.onReady) {
                        scope.onReady({ unityInstance: unityInstance });
                    }
                })
                .catch(function(error) {
                    console.error('Failed to initialize Unity:', error);
                });
            
            // Set up callbacks
            UnityIntegrationService.setOnScoreChange(function(score) {
                if (scope.onScoreChange) {
                    scope.onScoreChange({ score: score });
                }
            });
            
            UnityIntegrationService.setOnSettingsUpdate(function(settings) {
                if (scope.onSettingsUpdate) {
                    scope.onSettingsUpdate({ settings: settings });
                }
            });
        }
    };
}

/**
 * Game Controller - Main controller for Unity integration
 */
angular.module('yourApp')
    .controller('GameController', GameController);

function GameController($scope, UnityIntegrationService) {
    var vm = this;
    
    vm.currentScore = 0;
    vm.gameMode = 'patient';
    vm.unityReady = false;
    
    // Initialize Unity
    vm.init = function() {
        UnityIntegrationService.initializeUnity({
            apiBaseUrl: '/api/game'
        }).then(function(unityInstance) {
            vm.unityReady = true;
            console.log('Unity ready!');
        });
    };
    
    // Start patient mode
    vm.startPatientMode = function() {
        UnityIntegrationService.startPatientMode();
    };
    
    // Start physiotherapy mode  
    vm.startPhysiotherapyMode = function() {
        UnityIntegrationService.startPhysiotherapyMode();
    };
    
    // Initialize
    vm.init();
}
