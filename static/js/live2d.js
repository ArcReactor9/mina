// Live2D model loading and control
let app = null;
let model = null;
let currentMotion = null;

// Motion list
const MOTIONS = {
    // Idle motions
    IDLE: [
        'idle',
        'main_1',
        'main_2',
        'main_3'
    ],
    // Touch reactions
    TOUCH: [
        'touch_head',
        'touch_body',
        'touch_special'
    ],
    // Special motions
    SPECIAL: [
        'login',
        'home',
        'wedding',
        'mail',
        'mission'
    ],
    // Complete motions
    COMPLETE: [
        'complete',
        'mission_complete'
    ]
};

// Control variables
let isTrackingEnabled = true;  // Eye tracking switch
let isInteractionEnabled = true;  // Touch area switch

function clearCanvas() {
    const canvas = document.getElementById('live2d');
    if (canvas) {
        const gl = canvas.getContext('webgl');
        if (gl) {
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
}

// Clean up resources when page unloads
window.addEventListener('beforeunload', () => {
    if (app) {
        app.release();
    }
    clearCanvas();
});

// Initialize when page loads
window.addEventListener('load', () => {
    clearCanvas();
    initLive2D();
});

class IdleAnimationSystem {
    constructor() {
        this.isEnabled = true;
        this.timer = null;
        this.button = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) {
            console.log('[Idle system] Already initialized, skipping');
            return;
        }

        console.log('[Idle system] Initializing');
        this.button = document.getElementById('toggleIdle');
        
        if (this.button) {
            // Set initial state
            this.updateButtonState();
            
            // Bind click event
            this.button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
            
            // If default is enabled, start animation
            if (this.isEnabled) {
                this.start();
            }
            
            this.initialized = true;
            console.log('[Idle system] Initialization complete');
        } else {
            console.error('[Idle system] Button element not found');
        }
    }

    updateButtonState() {
        if (!this.button) return;
        
        this.button.innerText = this.isEnabled ? 'Disable Idle Animation' : 'Enable Idle Animation';
        if (this.isEnabled) {
            this.button.classList.remove('off');
        } else {
            this.button.classList.add('off');
        }
    }

    start() {
        console.log('[Idle system] Starting');
        
        // Clear existing timer
        this.stop();
        
        // If disabled, do not start new timer
        if (!this.isEnabled) {
            console.log('[Idle system] Currently disabled, not starting');
            return;
        }

        const scheduleNext = () => {
            if (!this.isEnabled) {
                console.log('[Idle system] Disabled, stopping scheduling');
                return;
            }

            const delay = 5000 + Math.random() * 5000;
            console.log(`[Idle system] Scheduling next motion, delay: ${delay}ms`);
            
            this.timer = setTimeout(async () => {
                if (this.isEnabled) {
                    console.log('[Idle system] Playing random idle motion');
                    await playRandomMotion(MOTIONS.IDLE);
                    if (this.isEnabled) {
                        scheduleNext();
                    }
                }
            }, delay);
        };
        
        scheduleNext();
    }

    stop() {
        if (this.timer) {
            console.log('[Idle system] Stopping timer');
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    toggle() {
        console.log('[Idle system] Toggling state');
        this.isEnabled = !this.isEnabled;
        console.log('[Idle system] New state:', this.isEnabled ? 'enabled' : 'disabled');
        
        if (this.isEnabled) {
            this.start();
        } else {
            this.stop();
        }
        
        this.updateButtonState();
    }
}

// Create singleton
const idleSystem = new IdleAnimationSystem();

let isModelInitialized = false;  // Add initialization flag

async function initLive2D() {
    if (app) {
        app.release();
        app = null;
    }
    
    clearCanvas();
    
    if (isModelInitialized) {
        console.log('Live2D model already initialized, skipping');
        return;
    }

    try {
        // Set model path
        const modelPath = '/static/live2d/aersasi_2/aersasi_2.model3.json';
        
        // Create PIXI application
        const container = document.getElementById('live2d-container');
        app = new PIXI.Application({
            view: document.getElementById('live2d'),
            transparent: true,
            autoStart: true,
            backgroundAlpha: 0,
            width: container.clientWidth,
            height: container.clientHeight
        });

        // Preload model
        PIXI.live2d.Live2DModel.from(modelPath, {
            onLoad: () => console.log('Model preloading started'),
            onError: (e) => console.error('Model preload error:', e)
        });

        // Load model
        const live2dSprite = await PIXI.live2d.Live2DModel.from(modelPath);
        model = live2dSprite;

        // Output available motion list
        console.log('Model loaded, checking available motions:');
        if (model.internalModel && model.internalModel.motionManager) {
            console.log('Motion manager:', model.internalModel.motionManager);
            console.log('Available motions:', Object.keys(model.internalModel.motionManager.definitions || {}));
            console.log('Motion definitions:', model.internalModel.motionManager.definitions);
        }

        // Adjust model size and position
        const scale = Math.min(
            app.renderer.width / model.width * 0.8,
            app.renderer.height / model.height * 0.8
        );
        
        model.scale.set(scale);
        
        // Center horizontally (bottom aligned)
        model.x = app.renderer.width * 0.5;
        model.y = app.renderer.height * 0.9;
        model.anchor.set(0.5, 1.0);
        
        // Add to stage
        app.stage.addChild(model);
        
        // Add interaction
        model.interactive = true;
        
        // Initialize all features
        initMouseTracking();
        initInteractiveAreas();
        initExpressionSystem();

        console.log('Model loaded successfully');

        // Set initialization flag
        isModelInitialized = true;
    } catch (e) {
        console.error('Error in initLive2D:', e);
        console.error('Error details:', e.message);
        if (e.stack) console.error('Stack trace:', e.stack);
    }
}

// Play specified motion
async function playMotion(motionName, priority = 1) {
    console.log('playMotion called with:', motionName, priority);
    
    if (!model) {
        console.warn('Cannot play motion: model not loaded');
        return;
    }

    try {
        // If there is a currently playing motion, stop it
        if (currentMotion) {
            console.log('Stopping current motion:', currentMotion);
            try {
                await model.internalModel.motionManager.stopAllMotions();
            } catch (e) {
                console.warn('Failed to stop current motion:', e);
            }
            currentMotion = null;
        }

        // Start playing new motion
        console.log('Starting motion:', motionName);
        
        // If motionName is a motion group name, randomly select a motion from that group
        if (typeof motionName === 'string') {
            const motionGroup = model.internalModel.settings.motions[motionName];
            if (!motionGroup || motionGroup.length === 0) {
                console.warn(`Motion group ${motionName} does not exist or is empty`);
                return;
            }
            
            // Get random motion
            const randomMotion = motionGroup[Math.floor(Math.random() * motionGroup.length)];
            
            // Play new motion
            currentMotion = {
                name: motionName,
                priority: priority,
                promise: model.motion(motionName, randomMotion.file, {
                    priority: priority,
                    fadeInTime: 500,
                    fadeOutTime: 500
                })
            };

            await currentMotion.promise;
            console.log('Motion playback complete:', motionName);
        } else {
            // If motionName is a predefined motion name (e.g. 'idle', 'main_1', etc.)
            currentMotion = {
                name: motionName,
                priority: priority,
                promise: model.motion(`motion/${motionName}.motion3.json`, priority)
            };

            await currentMotion.promise;
            console.log('Motion playback complete:', motionName);
        }
    } catch (e) {
        console.error('Failed to play motion:', motionName);
        console.error('Error details:', e.message);
        if (e.stack) console.error('Stack:', e.stack);
        currentMotion = null;
    }
}
window.playMotion = playMotion;

// Play random motion
async function playRandomMotion(motionGroup = null) {
    console.log('playRandomMotion called with motionGroup:', motionGroup);
    
    if (!model) {
        console.warn('Cannot play random motion: model not loaded');
        return;
    }

    try {
        // If an array is passed, randomly select a motion from it
        if (Array.isArray(motionGroup)) {
            console.log('Randomly selecting motion from list');
            const randomIndex = Math.floor(Math.random() * motionGroup.length);
            const motionName = motionGroup[randomIndex];
            console.log('Selected motion:', motionName);
            await playMotion(motionName, 1);
            return;
        }

        // If no motion group is specified, randomly select from all motion groups
        if (!motionGroup) {
            console.log('Randomly selecting motion group');
            // Get all motion group names
            const allMotionGroups = Object.keys(model.internalModel.settings.motions);
            console.log('Available motion groups:', allMotionGroups);
            
            if (allMotionGroups.length === 0) {
                console.warn('No available motion groups');
                return;
            }

            // Randomly select a motion group
            const randomGroupIndex = Math.floor(Math.random() * allMotionGroups.length);
            const randomGroupName = allMotionGroups[randomGroupIndex];
            console.log('Selected motion group:', randomGroupName);

            // Randomly select a motion from the selected group
            await playMotion(randomGroupName, 1);
            return;
        }

        // If a motion group name is specified, play a random motion from that group
        await playMotion(motionGroup, 1);
    } catch (e) {
        console.error('Failed to play random motion:', e);
        console.error('Error details:', e.message);
        if (e.stack) console.error('Stack:', e.stack);
    }
}
window.playRandomMotion = playRandomMotion;

// Toggle eye tracking
function toggleMouseTracking() {
    isTrackingEnabled = !isTrackingEnabled;
    console.log('Eye tracking:', isTrackingEnabled ? 'enabled' : 'disabled');
}
window.toggleMouseTracking = toggleMouseTracking;

// Toggle touch areas
function toggleInteraction() {
    isInteractionEnabled = !isInteractionEnabled;
    console.log('Touch areas:', isInteractionEnabled ? 'enabled' : 'disabled');
}
window.toggleInteraction = toggleInteraction;

// Mouse tracking system
function initMouseTracking() {
    let mouseX = 0;
    let mouseY = 0;

    document.getElementById('live2d-container').addEventListener('mousemove', (event) => {
        if (!model || !isTrackingEnabled) return;
        
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

    app.ticker.add(() => {
        if (!model || !isTrackingEnabled || !model.internalModel || !model.internalModel.coreModel) return;
        
        try {
            const angleX = mouseX * 30;
            const angleY = mouseY * 30;
            
            model.internalModel.coreModel.addParameterValueById('ParamAngleX', angleX);
            model.internalModel.coreModel.addParameterValueById('ParamAngleY', angleY);
            model.internalModel.coreModel.addParameterValueById('ParamEyeBallX', mouseX);
            model.internalModel.coreModel.addParameterValueById('ParamEyeBallY', mouseY);
        } catch (e) {
            console.error('Error updating model parameters:', e);
        }
    });
}

// Add interactive areas
function initInteractiveAreas() {
    const hitAreas = {
        head: { x: [-0.3, 0.3], y: [0.5, 0.9] },
        body: { x: [-0.3, 0.3], y: [0, 0.5] }
    };

    document.getElementById('live2d-container').addEventListener('click', (event) => {
        if (!model || !isInteractionEnabled) return;
        
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Detect clicked area
        if (x >= hitAreas.head.x[0] && x <= hitAreas.head.x[1] && 
            y >= hitAreas.head.y[0] && y <= hitAreas.head.y[1]) {
            playMotion('touch_head', 2);
        } else if (x >= hitAreas.body.x[0] && x <= hitAreas.body.x[1] && 
                   y >= hitAreas.body.y[0] && y <= hitAreas.body.y[1]) {
            playMotion('touch_body', 2);
        }
    });
}

// Expression system
function initExpressionSystem() {
    let lastExpression = null;
    
    // Automatically switch expression based on motion
    model.on('motionStart', (group) => {
        if (group.includes('touch')) {
            setExpression('happy');
        } else if (group.includes('complete')) {
            setExpression('happy');
        }
    });
    
    model.on('motionEnd', () => {
        setExpression(null); // Restore default expression
    });
}

// Set expression
async function setExpression(expressionName) {
    if (!model) return;
    try {
        await model.expression(expressionName);
    } catch (e) {
        console.error('Error setting expression:', e);
    }
}

// Voice sync system
function updateMouthOpen(volume) {
    if (!model) return;
    try {
        const value = Math.min(1, Math.max(0, volume));
        model.internalModel.coreModel.parameters.setValue('ParamMouthOpenY', value);
    } catch (e) {
        console.error('Error updating mouth:', e);
    }
}

// Respond to window size changes
window.addEventListener('resize', () => {
    if (!app || !model) return;
    
    try {
        // Update renderer size
        const container = document.getElementById('live2d-container');
        app.renderer.resize(container.clientWidth, container.clientHeight);
        
        // Recalculate scale
        const scale = Math.min(
            app.renderer.width / model.width * 0.8,
            app.renderer.height / model.height * 0.8
        );
        model.scale.set(scale);
        
        // Reposition
        model.x = app.renderer.width * 0.5;
        model.y = app.renderer.height * 0.9;
    } catch (e) {
        console.error('Error in resize handler:', e);
    }
});

// Initialize all event listeners and auto-motions when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('[Initialization] Starting');
    idleSystem.init();
    console.log('[Initialization] Complete');
});

// Show chat bubble
function showChatBubble(message) {
    // Get Live2D canvas position and size
    const canvas = document.getElementById('live2d');
    const rect = canvas.getBoundingClientRect();
    
    // Create bubble element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip bottom';
    tooltip.textContent = message;
    document.body.appendChild(tooltip);

    // Calculate bubble position
    // Horizontal position offset to the right, vertical position above canvas by 1/4
    const tooltipX = rect.left + (rect.width * 0.58); // Move slightly to the right
    const tooltipY = rect.top + (rect.height / 4);    // Keep vertical position unchanged

    // Ensure tooltip does not exceed screen boundaries
    const tooltipRect = tooltip.getBoundingClientRect();
    let finalX = tooltipX - (tooltipRect.width / 2);
    let finalY = tooltipY - tooltipRect.height - 20; // Move up a bit more

    finalX = Math.max(10, Math.min(finalX, window.innerWidth - tooltipRect.width - 10));
    finalY = Math.max(10, Math.min(finalY, window.innerHeight - tooltipRect.height - 10));

    tooltip.style.left = finalX + 'px';
    tooltip.style.top = finalY + 'px';

    // Automatically remove tooltip
    setTimeout(() => {
        if (tooltip && tooltip.parentNode) {
            tooltip.style.opacity = '0';
            setTimeout(() => tooltip.parentNode.removeChild(tooltip), 300);
        }
    }, 3000);
}

// Export functions
window.showChatBubble = showChatBubble;

WebSocketManager.prototype.handleMessage = function(event) {
    console.log('Received server message:', event.data);
    if (!this.chatMessages) {
        console.error('Chat message container not found, cannot display message');
        return;
    }
    
    try {
        const response = JSON.parse(event.data);
        
        // Add AI message to chat interface
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.textContent = response.message;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Show chat bubble
        console.log('Attempting to show chat bubble, message content:', response.message);
        showChatBubble(response.message);
        
        // Trigger Live2D model expression and motion based on AI response
        if (response.expression) {
            console.log('Setting expression:', response.expression);
            setExpression(response.expression);
        }
        if (response.motion) {
            console.log('Playing motion:', response.motion);
            playRandomMotion();
        }
    } catch (error) {
        console.error('Error handling message:', error);
        // Display error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message system-message';
        errorDiv.textContent = 'Message handling failed';
        this.chatMessages.appendChild(errorDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
};

// Add background related functions
function changeBackground(imagePath) {
    const backgroundImage = document.getElementById('background-image');
    if (backgroundImage) {
        // Set opacity to 0 first
        backgroundImage.style.opacity = '0';
        
        // Change image after transition effect completes
        setTimeout(() => {
            backgroundImage.src = imagePath;
            // Show image after loading
            backgroundImage.onload = () => {
                backgroundImage.style.opacity = '1';
            };
        }, 500);
    }
}

// Set default background
window.addEventListener('load', () => {
    // If you want to set a default background, call here
    // changeBackground('/static/backgrounds/default.jpg');
});

// Export functions for external use
window.changeBackground = changeBackground;
