/**
 * Mobile RPG Engine - Core Module
 * Provides fundamental game engine functionality including:
 * - Game state management
 * - Entity and character system
 * - Combat mechanics
 * - Inventory system
 * - Event handling
 * 
 * @version 1.0.0
 * @author RPG Engine Team
 */

// ============================================================================
// CORE GAME ENGINE CLASS
// ============================================================================

class RPGEngine {
  constructor(config = {}) {
    this.version = '1.0.0';
    this.isRunning = false;
    this.isPaused = false;
    this.deltaTime = 0;
    this.gameTime = 0;
    this.frameCount = 0;
    
    // Game configuration
    this.config = {
      fps: config.fps || 60,
      maxEntities: config.maxEntities || 1000,
      screenWidth: config.screenWidth || 800,
      screenHeight: config.screenHeight || 600,
      ...config
    };
    
    // Core systems
    this.entities = new Map();
    this.scenes = new Map();
    this.currentScene = null;
    this.eventBus = new EventBus();
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();
    this.dataManager = new DataManager();
    
    // Game state
    this.gameState = {
      player: null,
      inventory: null,
      quests: [],
      stats: {}
    };
    
    this.lastFrameTime = Date.now();
  }

  /**
   * Initialize the game engine
   */
  init() {
    console.log(`Initializing RPG Engine v${this.version}`);
    
    this.inputManager.init();
    this.audioManager.init();
    this.dataManager.init();
    this.eventBus.emit('engine:init');
    
    return true;
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) {
      console.warn('Engine is already running');
      return;
    }
    
    this.isRunning = true;
    this.lastFrameTime = Date.now();
    this.eventBus.emit('engine:start');
    
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    this.eventBus.emit('engine:stop');
  }

  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    this.deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    
    // Cap deltaTime to prevent large jumps
    if (this.deltaTime > 0.1) {
      this.deltaTime = 0.1;
    }
    
    if (!this.isPaused) {
      this.update(this.deltaTime);
      this.lateUpdate(this.deltaTime);
    }
    
    this.render();
    
    this.frameCount++;
    this.gameTime += this.deltaTime;
    
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Update game logic
   */
  update(delta) {
    // Update input
    this.inputManager.update();
    
    // Update current scene
    if (this.currentScene) {
      this.currentScene.update(delta);
    }
    
    // Update all entities
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.update(delta);
      }
    });
    
    this.eventBus.emit('engine:update', { delta, gameTime: this.gameTime });
  }

  /**
   * Late update - runs after all updates
   */
  lateUpdate(delta) {
    if (this.currentScene) {
      this.currentScene.lateUpdate(delta);
    }
    
    this.entities.forEach(entity => {
      if (entity.active && entity.lateUpdate) {
        entity.lateUpdate(delta);
      }
    });
  }

  /**
   * Render the game
   */
  render() {
    if (this.currentScene) {
      this.currentScene.render();
    }
    
    this.eventBus.emit('engine:render');
  }

  /**
   * Pause the game
   */
  pause() {
    this.isPaused = true;
    this.eventBus.emit('engine:pause');
  }

  /**
   * Resume the game
   */
  resume() {
    this.isPaused = false;
    this.eventBus.emit('engine:resume');
  }

  /**
   * Create a new scene
   */
  createScene(name, SceneClass) {
    const scene = new SceneClass(name, this);
    this.scenes.set(name, scene);
    return scene;
  }

  /**
   * Load a scene
   */
  loadScene(name) {
    if (!this.scenes.has(name)) {
      console.error(`Scene '${name}' not found`);
      return false;
    }
    
    const newScene = this.scenes.get(name);
    
    if (this.currentScene) {
      this.currentScene.unload();
    }
    
    this.currentScene = newScene;
    this.currentScene.load();
    this.eventBus.emit('engine:sceneLoaded', { sceneName: name });
    
    return true;
  }

  /**
   * Add an entity to the engine
   */
  addEntity(entity) {
    if (this.entities.size >= this.config.maxEntities) {
      console.warn('Maximum entity limit reached');
      return false;
    }
    
    this.entities.set(entity.id, entity);
    entity.engine = this;
    this.eventBus.emit('entity:added', { entity });
    
    return true;
  }

  /**
   * Remove an entity from the engine
   */
  removeEntity(entityId) {
    if (this.entities.has(entityId)) {
      const entity = this.entities.get(entityId);
      this.entities.delete(entityId);
      this.eventBus.emit('entity:removed', { entity });
      return true;
    }
    
    return false;
  }

  /**
   * Get an entity by ID
   */
  getEntity(entityId) {
    return this.entities.get(entityId);
  }

  /**
   * Get the current FPS
   */
  getFPS() {
    return Math.round(1 / this.deltaTime);
  }
}

// ============================================================================
// BASE ENTITY CLASS
// ============================================================================

class Entity {
  constructor(id, name = '', x = 0, y = 0) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.active = true;
    this.visible = true;
    this.engine = null;
    this.components = new Map();
    this.tags = new Set();
  }

  update(delta) {
    this.components.forEach(component => {
      if (component.enabled) {
        component.update(delta);
      }
    });
  }

  lateUpdate(delta) {
    this.components.forEach(component => {
      if (component.enabled && component.lateUpdate) {
        component.lateUpdate(delta);
      }
    });
  }

  addComponent(name, component) {
    component.entity = this;
    this.components.set(name, component);
    if (component.init) {
      component.init();
    }
    return component;
  }

  getComponent(name) {
    return this.components.get(name);
  }

  removeComponent(name) {
    const component = this.components.get(name);
    if (component && component.destroy) {
      component.destroy();
    }
    this.components.delete(name);
  }

  addTag(tag) {
    this.tags.add(tag);
  }

  hasTag(tag) {
    return this.tags.has(tag);
  }

  destroy() {
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
  }
}

// ============================================================================
// CHARACTER CLASS
// ============================================================================

class Character extends Entity {
  constructor(id, name = '', config = {}) {
    super(id, name, config.x || 0, config.y || 0);
    
    // Character stats
    this.level = config.level || 1;
    this.experience = config.experience || 0;
    this.health = config.health || 100;
    this.maxHealth = config.maxHealth || 100;
    this.mana = config.mana || 50;
    this.maxMana = config.maxMana || 50;
    
    // Base attributes
    this.stats = {
      strength: config.strength || 10,
      dexterity: config.dexterity || 10,
      constitution: config.constitution || 10,
      intelligence: config.intelligence || 10,
      wisdom: config.wisdom || 10,
      charisma: config.charisma || 10
    };
    
    // Combat stats
    this.attack = config.attack || 5;
    this.defense = config.defense || 5;
    this.attackSpeed = config.attackSpeed || 1;
    this.movementSpeed = config.movementSpeed || 100;
    
    // Equipment and inventory
    this.equipment = {
      head: null,
      chest: null,
      hands: null,
      legs: null,
      feet: null,
      mainHand: null,
      offHand: null
    };
    
    this.inventory = new Inventory();
    
    // State
    this.isAlive = true;
    this.isInCombat = false;
    this.statusEffects = [];
  }

  takeDamage(amount) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      if (this.engine) {
        this.engine.eventBus.emit('character:died', { character: this });
      }
    }
    
    return this.health;
  }

  heal(amount) {
    this.health = Math.min(this.health + amount, this.maxHealth);
    return this.health;
  }

  addExperience(amount) {
    this.experience += amount;
    
    // Simple level up calculation: 100 exp per level
    const newLevel = Math.floor(this.experience / 100) + 1;
    
    if (newLevel > this.level) {
      this.levelUp(newLevel);
    }
  }

  levelUp(newLevel) {
    const levelDifference = newLevel - this.level;
    
    this.level = newLevel;
    this.maxHealth += 10 * levelDifference;
    this.maxMana += 5 * levelDifference;
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    
    if (this.engine) {
      this.engine.eventBus.emit('character:levelUp', { 
        character: this, 
        newLevel: newLevel 
      });
    }
  }

  equipItem(item, slot) {
    if (this.equipment.hasOwnProperty(slot)) {
      const previousItem = this.equipment[slot];
      this.equipment[slot] = item;
      return previousItem;
    }
    
    return null;
  }

  unequipItem(slot) {
    const item = this.equipment[slot];
    this.equipment[slot] = null;
    return item;
  }

  addStatusEffect(effect) {
    this.statusEffects.push(effect);
    if (this.engine) {
      this.engine.eventBus.emit('character:statusEffectApplied', { 
        character: this, 
        effect: effect 
      });
    }
  }

  removeStatusEffect(effectName) {
    this.statusEffects = this.statusEffects.filter(e => e.name !== effectName);
  }

  calculateTotalAttack() {
    let total = this.attack;
    
    if (this.equipment.mainHand) {
      total += this.equipment.mainHand.attack || 0;
    }
    
    return total;
  }

  calculateTotalDefense() {
    let total = this.defense;
    
    Object.keys(this.equipment).forEach(slot => {
      const item = this.equipment[slot];
      if (item && item.defense) {
        total += item.defense;
      }
    });
    
    return total;
  }

  move(dx, dy, delta) {
    this.x += dx * this.movementSpeed * delta;
    this.y += dy * this.movementSpeed * delta;
  }

  update(delta) {
    super.update(delta);
    
    // Update status effects
    this.statusEffects = this.statusEffects.filter(effect => {
      effect.duration -= delta;
      return effect.duration > 0;
    });
  }
}

// ============================================================================
// INVENTORY SYSTEM
// ============================================================================

class Inventory {
  constructor(maxSlots = 20) {
    this.maxSlots = maxSlots;
    this.items = [];
  }

  addItem(item, quantity = 1) {
    // Try to stack with existing item
    const existingItem = this.items.find(i => i.id === item.id && i.stackable);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      return true;
    }
    
    // Add as new item
    if (this.items.length < this.maxSlots) {
      this.items.push({ ...item, quantity });
      return true;
    }
    
    return false;
  }

  removeItem(itemId, quantity = 1) {
    const item = this.items.find(i => i.id === itemId);
    
    if (item) {
      item.quantity -= quantity;
      
      if (item.quantity <= 0) {
        this.items = this.items.filter(i => i.id !== itemId);
      }
      
      return true;
    }
    
    return false;
  }

  getItem(itemId) {
    return this.items.find(i => i.id === itemId);
  }

  getItemsByType(type) {
    return this.items.filter(i => i.type === type);
  }

  isFull() {
    return this.items.length >= this.maxSlots;
  }

  getSize() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

// ============================================================================
// COMBAT SYSTEM
// ============================================================================

class CombatSystem {
  static calculateDamage(attacker, defender, baseMultiplier = 1) {
    const attackPower = attacker.calculateTotalAttack() * baseMultiplier;
    const defenseReduction = defender.calculateTotalDefense() * 0.5;
    const variance = Math.random() * 0.2 - 0.1; // ±10% variance
    
    let damage = Math.max(1, (attackPower - defenseReduction) * (1 + variance));
    
    return Math.round(damage);
  }

  static performAttack(attacker, defender) {
    const hitChance = Math.min(0.95, 0.5 + (attacker.stats.dexterity - defender.stats.dexterity) * 0.01);
    
    if (Math.random() > hitChance) {
      return {
        hit: false,
        damage: 0,
        critical: false
      };
    }
    
    const isCritical = Math.random() < (attacker.stats.dexterity / 100);
    const multiplier = isCritical ? 1.5 : 1;
    const damage = this.calculateDamage(attacker, defender, multiplier);
    
    defender.takeDamage(damage);
    
    return {
      hit: true,
      damage: damage,
      critical: isCritical
    };
  }

  static calculateExperienceReward(defeatedCharacter, level = 1) {
    const baseExp = 50;
    const levelBonus = baseExp * (defeatedCharacter.level - 1) * 1.5;
    return Math.round((baseExp + levelBonus) * (1 + level * 0.1));
  }
}

// ============================================================================
// EVENT SYSTEM
// ============================================================================

class EventBus {
  constructor() {
    this.events = {};
  }

  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    this.events[eventName].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(eventName, callback);
    };
  }

  once(eventName, callback) {
    const wrappedCallback = (data) => {
      callback(data);
      this.off(eventName, wrappedCallback);
    };
    
    this.on(eventName, wrappedCallback);
  }

  off(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }
  }

  emit(eventName, data = {}) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for '${eventName}':`, error);
        }
      });
    }
  }

  clear(eventName) {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
}

// ============================================================================
// INPUT MANAGER
// ============================================================================

class InputManager {
  constructor() {
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDown = false;
    this.touches = [];
  }

  init() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    // Touch support for mobile
    document.addEventListener('touchstart', (e) => this.onTouchStart(e));
    document.addEventListener('touchmove', (e) => this.onTouchMove(e));
    document.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  update() {
    // Update input state each frame
  }

  onKeyDown(event) {
    this.keys[event.key] = true;
  }

  onKeyUp(event) {
    this.keys[event.key] = false;
  }

  onMouseMove(event) {
    this.mousePosition = { x: event.clientX, y: event.clientY };
  }

  onMouseDown(event) {
    this.mouseDown = true;
  }

  onMouseUp(event) {
    this.mouseDown = false;
  }

  onTouchStart(event) {
    this.touches = Array.from(event.touches);
  }

  onTouchMove(event) {
    this.touches = Array.from(event.touches);
  }

  onTouchEnd(event) {
    this.touches = Array.from(event.touches);
  }

  isKeyPressed(key) {
    return this.keys[key] || false;
  }

  getMousePosition() {
    return { ...this.mousePosition };
  }

  isMouseDown() {
    return this.mouseDown;
  }

  getTouches() {
    return [...this.touches];
  }
}

// ============================================================================
// AUDIO MANAGER
// ============================================================================

class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.volume = 1;
    this.musicVolume = 0.7;
  }

  init() {
    // Initialize audio context if needed
  }

  loadSound(name, url) {
    const audio = new Audio(url);
    this.sounds.set(name, audio);
    return audio;
  }

  playSound(name, loop = false) {
    if (this.sounds.has(name)) {
      const audio = this.sounds.get(name);
      audio.loop = loop;
      audio.volume = this.volume;
      audio.play().catch(err => console.warn(`Could not play sound: ${name}`, err));
    }
  }

  stopSound(name) {
    if (this.sounds.has(name)) {
      const audio = this.sounds.get(name);
      audio.pause();
      audio.currentTime = 0;
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(audio => {
      audio.volume = this.volume;
    });
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }
}

// ============================================================================
// DATA MANAGER
// ============================================================================

class DataManager {
  constructor() {
    this.data = {};
    this.saveSlots = new Map();
  }

  init() {
    // Load saved data from localStorage if available
    this.loadFromStorage();
  }

  set(key, value) {
    this.data[key] = value;
  }

  get(key, defaultValue = null) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  save(slotName) {
    this.saveSlots.set(slotName, {
      data: { ...this.data },
      timestamp: Date.now()
    });
  }

  load(slotName) {
    if (this.saveSlots.has(slotName)) {
      this.data = { ...this.saveSlots.get(slotName).data };
      return true;
    }
    
    return false;
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('rpg-engine-data');
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Could not load data from storage:', error);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('rpg-engine-data', JSON.stringify(this.data));
    } catch (error) {
      console.warn('Could not save data to storage:', error);
    }
  }

  clear() {
    this.data = {};
  }
}

// ============================================================================
// SCENE BASE CLASS
// ============================================================================

class Scene {
  constructor(name, engine) {
    this.name = name;
    this.engine = engine;
    this.entities = [];
    this.isLoaded = false;
  }

  load() {
    this.isLoaded = true;
    console.log(`Scene '${this.name}' loaded`);
  }

  unload() {
    this.isLoaded = false;
    this.entities.forEach(entity => entity.destroy());
    this.entities = [];
    console.log(`Scene '${this.name}' unloaded`);
  }

  update(delta) {
    this.entities.forEach(entity => {
      if (entity.active) {
        entity.update(delta);
      }
    });
  }

  lateUpdate(delta) {
    this.entities.forEach(entity => {
      if (entity.active && entity.lateUpdate) {
        entity.lateUpdate(delta);
      }
    });
  }

  render() {
    // Override in subclasses
  }

  addEntity(entity) {
    this.entities.push(entity);
    this.engine.addEntity(entity);
  }

  removeEntity(entity) {
    this.entities = this.entities.filter(e => e.id !== entity.id);
    this.engine.removeEntity(entity.id);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RPGEngine,
    Entity,
    Character,
    Inventory,
    CombatSystem,
    EventBus,
    InputManager,
    AudioManager,
    DataManager,
    Scene
  };
}
