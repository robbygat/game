import * as Phaser from '//cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';

// --- Constants ---
// Game Display
const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 768;
const RENDER_WIDTH = 512; // For camera logic if using zoom
const RENDER_HEIGHT = 384; // For camera logic if using zoom
const GAME_ZOOM = 2; //SCREEN_WIDTH / RENDER_WIDTH; // Effectively renders at RENDER_WIDTH/HEIGHT

// Game Mechanics
const PLAYER_BASE_SPEED = 160; // Physics speed (pixels/sec) ~ Pygame speed 4 * 60fps / 1.5? Adjust needed
const PROJECTILE_SPEED = 400; // Physics speed
const CHARGED_PROJECTILE_SPEED = 560; // Physics speed
const ENEMY_BASE_SPEED = 80.0; // Physics speed
const BULLET_SPEED = 320; // Physics speed

// Sizes (used for physics body sizing and scaling)
const PLAYER_SIZE = { width: 45, height: 65 };
const ENEMY_SIZE = { width: 60, height: 60 };
const BOSS_SIZE = { width: 120, height: 100 };
const ARTIST_BOSS_SIZE = { width: 100, height: 120 };
const BULLET_SIZE = { width: 15, height: 15 };
const PROJECTILE_SIZE = { width: 30, height: 20 };
const CHARGED_PROJECTILE_SIZE = { width: 50, height: 35 };
const HEALTH_PICKUP_SIZE = { width: 30, height: 30 };

// Map & World
const MAP_SIZE = 3500;
const WALL_THICKNESS = 50;
const TILE_SIZE = 50;
const HOUSE_WIDTH = 250;
const HOUSE_HEIGHT = 200;
const DOOR_WIDTH = 70;
const MAX_ENEMIES = 30;

// Leveling
const XP_PER_KILL = 15;
const XP_PER_BOSS_KILL = 100;
const XP_PER_ARTIST_KILL = 250;
const XP_BASE_NEXT_LEVEL = 100;
const XP_SCALING_FACTOR = 1.5;

// Charged Shot
const KILLS_FOR_CHARGED_SHOT = 10;
const CHARGED_SHOT_DAMAGE_MULTIPLIER = 3;

// Boss Settings
const BOSS_HEALTH = 2000;
const BOSS_SHOOT_INTERVAL = 7 * 1000; // milliseconds
const BOSS_BULLET_COUNT = 20;
const BOSS_BULLET_SPREAD = 45; // degrees
const BOSS_HEALTH_DROP_CHANCE = 0.6; // 60%

// Artist Boss Settings
const ARTIST_HEALTH = 1200;
const ARTIST_SPEED_MULTIPLIER = 1.3;
const ARTIST_REVIVE_DELAY = 5 * 1000; // milliseconds
const ARTIST_REVIVES_MAX = 1;
const ARTIST_HEALTH_DROP_CHANCE = 0.3;

// Colors (Hex for Phaser) - Use integer values for Graphics fills
const COLOR = {
    DARKER_GRAY: 0x19191e,
    DARK_GRAY: 0x2d2d37,
    STONE_GRAY: 0x50505a,
    STONE_GRAY_DARK: 0x3c3c46,
    TORCH_YELLOW: 0xffbe32,
    DARK_BROWN: 0x553c1e,
    LIGHT_BROWN: 0x6e5032,
    BLACK: 0x000000,
    WHITE: 0xffffff,
    PURPLE: 0xa01e_dc,
    MOSS_GREEN: 0x3c6e28,
    LAVA_RED: 0xc8460a,
    DARK_RED: 0x820000,
    BLOOD_RED: 0x960000,
    HEALTH_GREEN: 0x00b400,
    XP_COLOR: 0x3296ff,
    UI_BACKGROUND_ALPHA: [30, 30, 40, 200], // Keep for potential Graphics alpha
    SAND_LIGHT: 0xf0dcc0,
    SAND_DARK: 0xd2bf96,
    WATER_SHALLOW: 0x64b4ff,
    WATER_DEEP: 0x1e64c8,
    PALM_GREEN: 0x28a046,
    PALM_TRUNK: 0x785a3c,
    PURPLE_BORDER: 0xa01edc,
};

// Font Style (Adjust as needed)
const FONT_FAMILY = "'PressStart2P', Arial, sans-serif"; // Use loaded font first
const FONT_STYLE_SMALL = { font: `10px ${FONT_FAMILY}`, fill: '#ffffff' };
const FONT_STYLE_NORMAL = { font: `16px ${FONT_FAMILY}`, fill: '#ffffff' };
const FONT_STYLE_LARGE = { font: `36px ${FONT_FAMILY}`, fill: '#ffffff' };
const FONT_STYLE_BUTTON = { font: `10px ${FONT_FAMILY}`, fill: '#000000' };
const FONT_STYLE_DIALOGUE = { font: `16px ${FONT_FAMILY}`, fill: '#ffffff', wordWrap: { width: SCREEN_WIDTH * 0.8 - 40 } };

// Asset Keys (match filenames without extension)
const KEYS = {
    PLAYER_ATLAS: 'player_atlas', // Assuming you combine frames into an atlas later
    PLAYER_FRAME_: 'frame', // Prefix for individual frames if not using atlas
    PLAYER_CAST_FRAME: '8frame',
    PLAYER_UP_FRAME: '10frame',
    PLAYER_DOWN_FRAME: '9frame',
    ENEMY_NORMAL_1: '1enemy',
    ENEMY_NORMAL_2: '2enemy',
    ENEMY_CRAB: '1crab',
    BOSS_1: '1boss',
    BOSS_2: '2boss',
    ARTIST_1: '1artist',
    ARTIST_2: '2artist',
    PROJECTILE_NORMAL: 'spell',
    PROJECTILE_CHARGED: 'charged_spell',
    PROJECTILE_BULLET: 'bullet',
    PICKUP_HEALTH: 'health_pickup',
    HUD_ICON: '1hud',
    // Sounds (add later)
};

// --- Helper Functions ---
// (Phaser provides scale/size setting directly, load_image_scaled not directly needed)
function setSpriteSize(sprite, sizeData) {
    sprite.setDisplaySize(sizeData.width, sizeData.height);
    if (sprite.body) {
        sprite.body.setSize(sizeData.width, sizeData.height);
    }
}

// --- Game Object Classes ---

class Torch extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);

        this.baseRadius = Phaser.Math.Between(60, 80);
        this.radiusVariation = Phaser.Math.Between(10, 20);
        this.baseAlpha = Phaser.Math.Between(70, 100) / 255; // Phaser alpha 0-1
        this.alphaVariation = Phaser.Math.Between(30, 50) / 255;
        this.flickerTimer = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.flickerSpeed = Phaser.Math.FloatBetween(0.05, 0.15);
        this.currentRadius = this.baseRadius;
        this.currentAlpha = this.baseAlpha;

        // Simple representation: Flame sprite + Light effect
        // Base (optional, can be drawn on map layer)
        // this.base = scene.add.rectangle(0, 0, 8, 12, COLOR.DARK_BROWN).setOrigin(0.5, 0);
        // this.add(this.base);

        // Flame
        this.flame = scene.add.ellipse(0, -6, 10, 10, COLOR.TORCH_YELLOW).setOrigin(0.5);
        this.flameCenter = scene.add.ellipse(0, -7, 4, 4, COLOR.WHITE).setOrigin(0.5);
        this.add([this.flame, this.flameCenter]);

        // Light effect (simple additive blend circle)
        this.light = scene.add.graphics();
        this.add(this.light);
        this.light.setBlendMode(Phaser.BlendModes.ADD);

        // Start update loop
        scene.events.on('update', this.update, this);
        scene.events.on('shutdown', () => scene.events.off('update', this.update, this), this); // Cleanup
        scene.events.on('destroy', () => scene.events.off('update', this.update, this), this); // Cleanup
    }

    update(time, delta) {
        this.flickerTimer += this.flickerSpeed * (delta / 16.667); // Adjust speed based on delta
        if (this.flickerTimer > Math.PI * 2) {
            this.flickerTimer -= Math.PI * 2;
        }
        this.currentRadius = this.baseRadius + this.radiusVariation * Math.sin(this.flickerTimer);
        this.currentAlpha = this.baseAlpha + this.alphaVariation * Math.abs(Math.sin(this.flickerTimer * 0.7));
        this.currentAlpha = Phaser.Math.Clamp(this.currentAlpha, 0, 1);

        // Update flame size
        const flameRadius = 5 + 2 * Math.abs(Math.sin(this.flickerTimer * 2.0));
        this.flame.setSize(flameRadius * 2, flameRadius * 2);
        this.flameCenter.setSize(flameRadius * 0.8, flameRadius * 0.8);

        // Update light graphics
        this.light.clear();
        if (this.currentRadius > 0) {
            // Simple gradient approximation
            for (let r = Math.floor(this.currentRadius); r > 0; r -= 4) {
                const alpha = Math.max(0, this.currentAlpha * (1 - (r / this.currentRadius) ** 1.5)); // Tweak exponent for falloff
                 this.light.fillStyle(COLOR.TORCH_YELLOW, alpha * 0.8); // Adjust multiplier for intensity
                 this.light.fillCircle(0, 0, r);
            }
            // Brighter center?
             this.light.fillStyle(COLOR.TORCH_YELLOW, this.currentAlpha * 0.5);
             this.light.fillCircle(0,0, this.currentRadius * 0.3);
        }
    }

    // Override destroy to clean up event listeners
    destroy(fromScene) {
        this.scene.events.off('update', this.update, this);
        super.destroy(fromScene);
    }
}


class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, { direction = 0, damage = 10, speed = PROJECTILE_SPEED, penetrating = false, size = PROJECTILE_SIZE }) {
        super(scene, x, y, texture);
        scene.physics.world.enable(this);
        scene.add.existing(this);

        this.damage = damage;
        this.speed = speed;
        this.penetrating = penetrating;
        this.direction = direction; // 0=R, 1=D, 2=L, 3=U

        setSpriteSize(this, size);
        this.setOrigin(0.5); // Center origin for rotation

        this.setAngle(this.direction * 90); // Phaser uses degrees, 0 is right

        // Set initial velocity based on direction
        const velocity = new Phaser.Math.Vector2();
        switch (this.direction) {
            case 0: velocity.x = this.speed; break; // Right
            case 1: velocity.y = this.speed; break; // Down
            case 2: velocity.x = -this.speed; break; // Left
            case 3: velocity.y = -this.speed; break; // Up
        }
        this.body.setVelocity(velocity.x, velocity.y);

        this.body.onWorldBounds = true; // Enable world bounds collision check
        this.body.setCollideWorldBounds(true, 0, 0, true); // Bounce 0, destroy on exit

        // Automatically destroy if it goes far out of bounds (fallback)
        this.lifespan = 5000; // 5 seconds
        this.scene.time.delayedCall(this.lifespan, () => {
            if (this.active) this.destroy();
        });
    }

    // No separate update needed usually, physics handles movement.
    // Could add particle trails here in a preUpdate method if desired.
}


class Bullet extends Projectile {
     constructor(scene, x, y, targetX, targetY) {
        // Calculate angle and initial direction for constructor
        const angleRad = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        const angleDeg = Phaser.Math.RadToDeg(angleRad);

        // Determine dominant direction for sprite angle (approximate)
        let direction = 0;
        if (angleDeg > 45 && angleDeg <= 135) direction = 1; // Down
        else if (angleDeg > 135 || angleDeg <= -135) direction = 2; // Left
        else if (angleDeg > -135 && angleDeg <= -45) direction = 3; // Up
        else direction = 0; // Right

         super(scene, x, y, KEYS.PROJECTILE_BULLET, {
            direction: direction, // For initial angle approx
            damage: 10,
            speed: BULLET_SPEED,
            penetrating: false,
            size: BULLET_SIZE
        });

        this.setAngle(angleDeg); // Set precise angle

        // Set velocity using the calculated angle
        scene.physics.velocityFromRotation(angleRad, BULLET_SPEED, this.body.velocity);
     }
}


class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, { target, health, speed, xpValue, size, facingTextureLeft = null, isBoss = false }) {
        super(scene, x, y, texture);
        scene.physics.world.enable(this);
        scene.add.existing(this);

        this.targetPlayer = target;
        this.maxHealth = health;
        this.health = health;
        this.baseSpeed = speed; // Store base speed separate from current speed
        this.currentSpeed = speed; // Current movement speed
        this.xpValue = xpValue;
        this.isBoss = isBoss;
        this.facingDirection = 0; // 0=R, 2=L
        this.textureRight = texture;
        this.textureLeft = facingTextureLeft || texture; // Use same texture if no left specific one
        this.spriteSize = size;

        setSpriteSize(this, size);
        this.body.setCollideWorldBounds(true); // Prevent going out of map
        this.body.setBounce(0.1); // Slight bounce off walls/each other
        this.body.setDrag(200); // Some friction

        // Wobble/Movement AI Timers
        this.moveWobbleTimer = null;
        this.wobbleVector = new Phaser.Math.Vector2(0, 0);

        // Health Bar
        this.healthBar = scene.add.graphics();
        this.healthBarWidth = size.width * 0.8;
        this.healthBarHeight = 6;
        this.add(this.healthBar); // Add health bar as child of enemy

        // State
        this.isDying = false; // Prevent updates/damage during death effect
    }

    // Pre-update runs before physics simulation step
    preUpdate(time, delta) {
        super.preUpdate(time, delta); // Call sprite preUpdate

        if (!this.active || this.isDying || !this.targetPlayer?.active) {
             if (this.body) this.body.setVelocity(0,0); // Stop if inactive/dying/no target
             this.updateHealthBar(); // Update bar visibility
            return;
        }

        // -- Movement AI ---
        const targetVector = new Phaser.Math.Vector2(
            this.targetPlayer.x - this.x,
            this.targetPlayer.y - this.y
        );
        const distance = targetVector.length();

        let moveVector = new Phaser.Math.Vector2(0, 0);
        if (distance > (this.spriteSize.width / 2)) { // Only move if not too close
            moveVector = targetVector.normalize().scale(this.currentSpeed);
        }

        // --- Wobble (Example for standard Enemy) ---
        // Specific enemies like Crab will override this in their own preUpdate
        if (!(this instanceof Crab) && !(this instanceof Boss) && !(this instanceof ArtistBoss)) {
            if (!this.moveWobbleTimer || !this.moveWobbleTimer.hasDispatched) { // Timer expired or doesn't exist
                const wobbleAngle = Phaser.Math.FloatBetween(-35, 35);
                const wobbleStrength = Phaser.Math.FloatBetween(0.4, 0.8);
                this.wobbleVector = moveVector.clone().rotate(Phaser.Math.DegToRad(wobbleAngle)).scale(wobbleStrength);

                this.moveWobbleTimer = this.scene.time.addEvent({
                    delay: Phaser.Math.Between(330, 830), // ~20-50 frames at 60fps
                    callback: () => { /* Timer expired, will reset next update */ },
                });
            }

            // Apply wobble most of the time
            if (this.moveWobbleTimer.getRemaining() > 160) { // Apply for first part of timer
                moveVector.add(this.wobbleVector);
                // Speed cap
                 if (moveVector.length() > this.currentSpeed * 1.5) {
                      moveVector.normalize().scale(this.currentSpeed * 1.5);
                 }
            }
        }
        // --- End Wobble ---

        // Apply velocity
        this.body.setVelocity(moveVector.x, moveVector.y);


        // --- Update Facing Direction ---
        if (Math.abs(this.body.velocity.x) > 5) { // Check velocity instead of intended move
            this.facingDirection = this.body.velocity.x > 0 ? 0 : 2;
        } else if (distance > 5) { // If not moving horizontally, face player
            this.facingDirection = this.targetPlayer.x > this.x ? 0 : 2;
        }
        this.setTexture(this.facingDirection === 2 ? this.textureLeft : this.textureRight);


        // --- Update Health Bar Position ---
        this.updateHealthBar();
    }

    updateHealthBar() {
        this.healthBar.clear();
        if (!this.active || this.isDying || this.health >= this.maxHealth || !this.body) return;

        // Position relative to the top-center of the sprite
        const barX = -this.healthBarWidth / 2; // Centered because it's a child
        const barY = -(this.spriteSize.height / 2) - this.healthBarHeight - 4;

        const healthRatio = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        const currentHealthWidth = this.healthBarWidth * healthRatio;

        // Background
        this.healthBar.fillStyle(COLOR.BLOOD_RED, 0.8);
        this.healthBar.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);

        // Foreground
        this.healthBar.fillStyle(COLOR.HEALTH_GREEN, 1);
        this.healthBar.fillRect(barX, barY, currentHealthWidth, this.healthBarHeight);

        // Border
        this.healthBar.lineStyle(1, COLOR.BLACK, 1);
        this.healthBar.strokeRect(barX, barY, this.healthBarWidth, this.healthBarHeight);
    }

    takeDamage(amount) {
        if (this.isDying || !this.active) return false;

        this.health -= amount;
        this.updateHealthBar();

        // Flash effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeInOut',
            onStart: () => { if (this.active) this.setTint(0xff0000); }, // Red tint
            onComplete: () => { if (this.active) this.clearTint().setAlpha(1); }
        });


        if (this.health <= 0) {
            this.die();
            return true; // Dead
        }
        return false; // Still alive
    }

    die() {
        if (this.isDying || !this.active) return;
        this.isDying = true;
        this.body?.setEnable(false); // Disable physics body immediately

        // Remove health bar explicitly
        if (this.healthBar) {
            this.healthBar.destroy();
            this.healthBar = null;
        }

        // Death effect (e.g., fade out and shrink)
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 0.5,
            duration: 400,
            ease: 'Power2',
            onComplete: () => {
                this.destroy(); // Remove from scene completely after animation
            }
        });

        // Drop health chance (handled in GameScene collision callback)
    }

     // Override destroy to clean up graphics
    destroy(fromScene) {
        if (this.healthBar) {
            this.healthBar.destroy();
        }
        // Ensure timers specific to derived classes are cleared if any
        super.destroy(fromScene);
    }
}


class Enemy extends BaseEnemy {
    constructor(scene, x, y, targetPlayer) {
        super(scene, x, y, KEYS.ENEMY_NORMAL_1, {
            target: targetPlayer,
            health: 120,
            speed: ENEMY_BASE_SPEED * Phaser.Math.FloatBetween(0.9, 1.1),
            xpValue: XP_PER_KILL,
            size: ENEMY_SIZE,
            facingTextureLeft: KEYS.ENEMY_NORMAL_2,
            isBoss: false
        });
         // Specific wobble init handled in BaseEnemy for standard enemies
    }
}


class Crab extends BaseEnemy {
    constructor(scene, x, y, targetPlayer) {
        super(scene, x, y, KEYS.ENEMY_CRAB, { // Assume 1crab.png is used for both directions
            target: targetPlayer,
            health: 85,
            speed: ENEMY_BASE_SPEED * 1.3,
            xpValue: XP_PER_KILL * 1.2,
            size: ENEMY_SIZE,
            facingTextureLeft: KEYS.ENEMY_CRAB, // Use same image
            isBoss: false
        });
        this.strafeTimer = null;
    }

    preUpdate(time, delta) {
        // Need to manually call parent preUpdate IF we want the base facing/health bar logic
        // But we override movement completely
        if (!this.active || this.isDying || !this.targetPlayer?.active) {
            if (this.body) this.body.setVelocity(0,0);
            this.updateHealthBar();
            return;
       }


        // --- Crab Movement ---
        const targetVector = new Phaser.Math.Vector2(
            this.targetPlayer.x - this.x,
            this.targetPlayer.y - this.y
        );
        const distance = targetVector.length();

        let moveVector = new Phaser.Math.Vector2(0, 0);

        // Decide whether to strafe or move towards player
        if (!this.strafeTimer || !this.strafeTimer.hasDispatched) {
            this.strafeTimer = this.scene.time.addEvent({
                 delay: Phaser.Math.Between(500, 1500), // ~30-90 frames
                 callback: () => {},
             });
        }

        // Strafe condition
        if (distance > 50 && Math.random() < 0.4 && this.strafeTimer.getElapsedPercentage() < 0.5) { // Strafe more often when timer is fresh
             // Get perpendicular vector
             let perpVector = new Phaser.Math.Vector2(targetVector.y, -targetVector.x).normalize();
             if (Math.random() < 0.5) {
                 perpVector.negate(); // Randomize strafe direction
             }
             moveVector = perpVector.scale(this.currentSpeed * 0.9); // Strafe slightly slower
         } else {
             // Normal movement towards player
             if (distance > (this.spriteSize.width / 2)) {
                 moveVector = targetVector.normalize().scale(this.currentSpeed);
             }
         }

         this.body.setVelocity(moveVector.x, moveVector.y);

         // --- Update Facing Direction ---
         // Crabs might just always use the same image, or face player
          if (distance > 5) { // Face player
              this.facingDirection = this.targetPlayer.x > this.x ? 0 : 2; // (Doesn't visually change if using same texture)
          }
         // Crabs likely don't visually turn left/right if using one texture
         // this.setTexture(this.facingDirection === 2 ? this.textureLeft : this.textureRight);


        // --- Update Health Bar ---
        this.updateHealthBar(); // Call base method
    }
}


class Boss extends BaseEnemy {
     constructor(scene, x, y, targetPlayer, bulletsGroup) {
        super(scene, x, y, KEYS.BOSS_2, { // BOSS_2 is right-facing
            target: targetPlayer,
            health: BOSS_HEALTH,
            speed: ENEMY_BASE_SPEED * 0.6,
            xpValue: XP_PER_BOSS_KILL,
            size: BOSS_SIZE,
            facingTextureLeft: KEYS.BOSS_1,
            isBoss: true
        });

        this.bulletsGroup = bulletsGroup; // Group to add bullets to
        this.shootTimer = scene.time.addEvent({
            delay: Phaser.Math.Between(BOSS_SHOOT_INTERVAL / 2, BOSS_SHOOT_INTERVAL), // Initial random delay
            callback: this.prepareShoot,
            callbackScope: this,
            loop: false // Will restart itself
        });
        this.isShooting = false;
        this.bulletsFiredInBurst = 0;
        this.burstTimer = null;
        this.healthDropChance = BOSS_HEALTH_DROP_CHANCE;
    }

    prepareShoot() {
        if (!this.active || this.isDying) return;
        this.isShooting = true;
        this.bulletsFiredInBurst = 0;

        // Create a timer for the burst duration/firing rate
        this.burstTimer = this.scene.time.addEvent({
            delay: 85, // Approx 5 frames at 60fps
            callback: this.fireBulletSpread,
            callbackScope: this,
            repeat: BOSS_BULLET_COUNT - 1 // Fire total of BOSS_BULLET_COUNT bullets
        });

         // Restart the main shoot interval timer AFTER the burst completes
         this.scene.time.delayedCall(this.burstTimer.delay * BOSS_BULLET_COUNT + 200, () => {
             this.isShooting = false;
              if (this.active && !this.isDying) {
                this.shootTimer = this.scene.time.addEvent({
                     delay: BOSS_SHOOT_INTERVAL,
                     callback: this.prepareShoot,
                     callbackScope: this,
                     loop: false
                 });
             }
         });
    }

    fireBulletSpread() {
         if (!this.active || this.isDying || !this.targetPlayer?.active) return;

        const targetX = this.targetPlayer.x;
        const targetY = this.targetPlayer.y;
        const baseAngleRad = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);

        // Add spread
        const spreadRad = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-BOSS_BULLET_SPREAD / 2, BOSS_BULLET_SPREAD / 2));
        const fireAngleRad = baseAngleRad + spreadRad;

        // Spawn bullet slightly offset
        const spawnOffsetX = Math.cos(fireAngleRad) * (this.spriteSize.width * 0.6);
        const spawnOffsetY = Math.sin(fireAngleRad) * (this.spriteSize.height * 0.6);
        const spawnX = this.x + spawnOffsetX;
        const spawnY = this.y + spawnOffsetY;

        // Create bullet targeting a point along the fire angle
        const targetPointX = this.x + Math.cos(fireAngleRad) * 100;
        const targetPointY = this.y + Math.sin(fireAngleRad) * 100;

        const bullet = new Bullet(this.scene, spawnX, spawnY, targetPointX, targetPointY);
        this.bulletsGroup.add(bullet); // Add to the bullets group for collisions

        this.bulletsFiredInBurst++;

         // This check isn't strictly needed due to 'repeat' in timer, but for clarity:
         if (this.bulletsFiredInBurst >= BOSS_BULLET_COUNT) {
            // Burst timer will stop itself
         }
    }

    // Override die to stop timers
    die() {
        this.isShooting = false;
        if (this.shootTimer) this.shootTimer.remove();
        if (this.burstTimer) this.burstTimer.remove();
        this.shootTimer = null;
        this.burstTimer = null;
        super.die(); // Call parent die effect
    }

     // Override destroy for safety
     destroy(fromScene) {
         if (this.shootTimer) this.shootTimer.remove();
         if (this.burstTimer) this.burstTimer.remove();
         super.destroy(fromScene);
     }
}


class ArtistBoss extends BaseEnemy {
     constructor(scene, x, y, targetPlayer) {
        super(scene, x, y, KEYS.ARTIST_2, { // ARTIST_2 is right-facing
            target: targetPlayer,
            health: ARTIST_HEALTH,
            speed: ENEMY_BASE_SPEED * ARTIST_SPEED_MULTIPLIER,
            xpValue: XP_PER_ARTIST_KILL,
            size: ARTIST_BOSS_SIZE,
            facingTextureLeft: KEYS.ARTIST_1,
            isBoss: true
        });

        this.revivesLeft = ARTIST_REVIVES_MAX;
        this.isDeadTemporarily = false;
        this.reviveTimerEvent = null;
        this.reviveTimerGfx = scene.add.graphics(); // Graphics for timer arc
        this.add(this.reviveTimerGfx); // Add as child

        this.healthDropChance = ARTIST_HEALTH_DROP_CHANCE;
    }

    preUpdate(time, delta) {
        if (this.isDeadTemporarily) {
            // Stop moving while dead/reviving
             this.body?.setVelocity(0,0);
             this.updateReviveTimerGfx(); // Draw the timer circle
            return; // Skip normal update
        }
         super.preUpdate(time, delta); // Run normal enemy update logic if alive
    }

    updateReviveTimerGfx() {
        this.reviveTimerGfx.clear();
        if (!this.reviveTimerEvent || this.reviveTimerEvent.getRemaining() <= 0) return;

        const timerRadius = 10;
        const gfxX = 0; // Relative to parent center
        const gfxY = -(this.spriteSize.height / 2) - 15; // Above head

        // Background circle
        this.reviveTimerGfx.fillStyle(COLOR.PURPLE, 0.7);
        this.reviveTimerGfx.fillCircle(gfxX, gfxY, timerRadius);
        this.reviveTimerGfx.lineStyle(2, COLOR.DARK_GRAY);
        this.reviveTimerGfx.strokeCircle(gfxX, gfxY, timerRadius);

        // Arc for timer progress
        const progress = this.reviveTimerEvent.getOverallProgress(); // 0 to 1
        const startAngle = -90; // Start at top
        const endAngle = startAngle + progress * 360;

        this.reviveTimerGfx.lineStyle(3, COLOR.WHITE);
        // arc(x, y, radius, startAngle, endAngle, anticlockwise)
        this.reviveTimerGfx.beginPath();
        this.reviveTimerGfx.arc(gfxX, gfxY, timerRadius, Phaser.Math.DegToRad(startAngle), Phaser.Math.DegToRad(endAngle), false);
        this.reviveTimerGfx.strokePath();
    }

    takeDamage(amount) {
        if (this.isDeadTemporarily || this.isDying || !this.active) return false;

        // Normal damage application handled by parent's super call
        const died = super.takeDamage(amount); // This returns true if health <= 0

        if (died) { // Health reached 0 or below
             if (this.revivesLeft > 0) {
                console.log("Artist Boss defeated... temporarily!");
                this.revivesLeft--;
                this.isDeadTemporarily = true;
                this.health = 0; // Keep health at 0
                this.isDying = false; // Override dying state from parent

                this.body?.setEnable(false); // Disable physics temporarily
                this.setAlpha(0.6); // Visual indicator
                this.setTint(0xaaaaaa); // Grayish tint

                this.reviveTimerGfx.setVisible(true);
                this.updateReviveTimerGfx(); // Draw initial state

                this.reviveTimerEvent = this.scene.time.delayedCall(
                    ARTIST_REVIVE_DELAY,
                    this.revive,
                    [],
                    this
                );
                return false; // NOT truly dead yet (won't give XP/drop now)
            } else {
                 console.log("Artist Boss truly defeated!");
                 this.isDeadTemporarily = true; // Still mark as temp dead to prevent immediate destruction
                 this.isDying = true; // Now truly dying
                 // Parent class's takeDamage already initiated the death sequence if health <= 0
                 // but we prevented it visually if revives > 0. Now let it proceed.
                 // Ensure physics is off and call the final visual death effect
                 this.body?.setEnable(false);
                 this.reviveTimerGfx.setVisible(false);
                 this.die(); // Trigger the final visual death effect
                 return true; // Truly dead
             }
        }
        return false; // Still alive or temp dead
    }

    revive() {
        if (!this.active) return; // Check if it was destroyed meanwhile
        console.log("Artist Boss Revived!");
        this.isDeadTemporarily = false;
        this.isDying = false;
        this.health = this.maxHealth * 0.75; // Partial health
        this.body?.setEnable(true); // Re-enable physics
        this.clearTint();
        this.setAlpha(1);
        this.reviveTimerEvent = null;
        this.reviveTimerGfx.setVisible(false);
        this.updateHealthBar();
    }

    // Override die to prevent the base effect unless truly dead
    die() {
        // Only trigger the visual fade/shrink if isDying is true (meaning no revives left)
        if (this.isDying) {
             if (this.reviveTimerEvent) this.reviveTimerEvent.remove();
             this.reviveTimerEvent = null;
             this.reviveTimerGfx.setVisible(false);
             super.die(); // Call parent visual effect
        } else {
            // If die() was called but not truly dying (e.g., from base takeDamage),
            // just ensure health is 0 and the revive process takes over.
            this.health = 0;
        }
    }

    // Override destroy for safety
     destroy(fromScene) {
         if (this.reviveTimerEvent) this.reviveTimerEvent.remove();
         if (this.reviveTimerGfx) this.reviveTimerGfx.destroy();
         super.destroy(fromScene);
     }
}


class HealthPickup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, KEYS.PICKUP_HEALTH);
        scene.physics.world.enable(this, Phaser.Physics.Arcade.STATIC_BODY); // Static body for overlap checks
        scene.add.existing(this);

        setSpriteSize(this, HEALTH_PICKUP_SIZE);
        this.setOrigin(0.5);

        this.healAmount = 35;
        this.lifespan = 15 * 1000; // ms
        this.bobAmount = 3;
        this.bobSpeed = 0.05;
        this.baseY = y;

        // Start bobbing tween
        this.bobTween = scene.tweens.add({
            targets: this,
            y: y + this.bobAmount,
            duration: (Math.PI / this.bobSpeed) * (1000/60) * 2, // Duration for full cycle
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 // Repeat indefinitely
        });

        // Destroy after lifespan
        this.destroyTimer = scene.time.delayedCall(this.lifespan, () => {
            this.pickupDestroy();
        });
    }

    pickupDestroy() {
        if (this.bobTween) this.bobTween.stop();
        if (this.destroyTimer) this.destroyTimer.remove();
        this.destroy();
    }

    // Override destroy to stop tween
    destroy(fromScene) {
        if (this.bobTween) this.bobTween.stop();
        if (this.destroyTimer) this.destroyTimer.remove(); // Just in case
        super.destroy(fromScene);
    }
}


class Player extends Phaser.Physics.Arcade.Sprite {
     constructor(scene, x, y) {
        super(scene, x, y, KEYS.PLAYER_FRAME_ + '1'); // Start with frame 1
        scene.physics.world.enable(this);
        scene.add.existing(this);

        this.spriteSize = PLAYER_SIZE;
        setSpriteSize(this, this.spriteSize);
        this.body.setCollideWorldBounds(true);
        this.body.setDrag(800); // Higher drag for snappier stops
        this.body.setMaxVelocity(PLAYER_BASE_SPEED * 1.5); // Speed cap

        // Movement & Facing
        this.moveDirection = 0; // 0=R, 2=L (visual only)
        this.shootDirection = 0; // 0=R, 1=D, 2=L, 3=U (spell direction)
        this.currentSpeed = PLAYER_BASE_SPEED;

        // Animation
        this.isCasting = false;
        this.castAnimTimer = null;
        this.castAnimDuration = 6 * (1000/60); // ms approx
        this.createAnimations();

        // Shooting
        this.castCooldown = 20 * (1000/60); // ms approx
        this.lastCastTime = 0;

        // Stats & Leveling
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.level = 1;
        this.xp = 0;
        this.xpNextLevel = XP_BASE_NEXT_LEVEL;
        this.baseDamage = Phaser.Math.Between(40, 55);
        this.kills = 0;

        // Charged Shot
        this.chargedShotUnlocked = false;
        this.lastDamageTime = 0;
        this.invulnerabilityDuration = 500; // ms
        this.isInvulnerable = false;

        // References
        this.projectilesGroup = null; // Will be set by the scene

        // Emit initial stats update for UI
         this.scene.events.emit('playerStatsChanged', this.getStats());
    }

    createAnimations() {
        const animSpeed = 10; // Frames per second for animation playback
        // --- Walking ---
        // Need individual frames: 1frame, 2frame, ... 6frame
        // If using Texture Atlas later, this definition changes.
        // Right Walk (assuming frames 1-6 exist as separate images)
        let walkRightFrames = [];
        for (let i = 1; i <= 6; i++) {
            walkRightFrames.push({ key: KEYS.PLAYER_FRAME_ + i });
        }
        this.anims.create({
            key: 'walk_right',
            frames: walkRightFrames,
            frameRate: animSpeed,
            repeat: -1
        });

        // Left Walk (using flipped frames) - needs atlas or modified frame keys
        // For now, just reuse right frames; flipX will handle direction visually
         let walkLeftFrames = [];
        for (let i = 1; i <= 6; i++) {
            walkLeftFrames.push({ key: KEYS.PLAYER_FRAME_ + i });
        }
        this.anims.create({
             key: 'walk_left',
             frames: walkLeftFrames, // Same frames, flipX handles direction
             frameRate: animSpeed,
             repeat: -1
         });

         // --- Idle --- (Using first frame)
         this.anims.create({ key: 'idle_right', frames: [{ key: KEYS.PLAYER_FRAME_ + '1'}], frameRate: 1 });
         this.anims.create({ key: 'idle_left', frames: [{ key: KEYS.PLAYER_FRAME_ + '1'}], frameRate: 1 });

        // --- Casting --- (Using 8frame)
        this.anims.create({ key: 'cast_right', frames: [{ key: KEYS.PLAYER_CAST_FRAME }], frameRate: 1 });
        this.anims.create({ key: 'cast_left', frames: [{ key: KEYS.PLAYER_CAST_FRAME }], frameRate: 1 });

        // --- Up/Down --- (Optional - use if you have specific sprites)
         // this.anims.create({ key: 'face_up', frames: [{ key: KEYS.PLAYER_UP_FRAME }], frameRate: 1 });
         // this.anims.create({ key: 'face_down', frames: [{ key: KEYS.PLAYER_DOWN_FRAME }], frameRate: 1 });
    }

    update(cursors, keys, time) {
        if (!this.active) return;

        const currentVelocity = this.body.velocity.clone();
        let targetVelX = 0;
        let targetVelY = 0;
        let isMoving = false;

        // --- Movement Input (WASD) ---
        if (keys.a.isDown) {
            targetVelX = -this.currentSpeed;
            this.moveDirection = 2;
            isMoving = true;
        } else if (keys.d.isDown) {
            targetVelX = this.currentSpeed;
            this.moveDirection = 0;
            isMoving = true;
        }

        if (keys.w.isDown) {
            targetVelY = -this.currentSpeed;
            isMoving = true;
        } else if (keys.s.isDown) {
            targetVelY = this.currentSpeed;
            isMoving = true;
        }

        // Normalize diagonal speed
        if (targetVelX !== 0 && targetVelY !== 0) {
            const vec = new Phaser.Math.Vector2(targetVelX, targetVelY).normalize().scale(this.currentSpeed);
            targetVelX = vec.x;
            targetVelY = vec.y;
        }

        // Apply velocity directly (physics engine handles movement/collision)
        this.body.setVelocityX(targetVelX);
        this.body.setVelocityY(targetVelY);

        // --- Shooting Input (Arrow Keys / Space) ---
        let shootInput = -1; // 0=R, 1=D, 2=L, 3=U
        if (cursors.right.isDown) shootInput = 0;
        else if (cursors.down.isDown) shootInput = 1;
        else if (cursors.left.isDown) shootInput = 2;
        else if (cursors.up.isDown) shootInput = 3;

        const chargedShotTriggered = keys.space.isDown && this.chargedShotUnlocked;

        // --- Shooting Logic ---
        const canCast = (time > this.lastCastTime + this.castCooldown);

        if ((shootInput !== -1 || chargedShotTriggered) && !this.isCasting && canCast) {
             let fireDirection = this.shootDirection; // Default for charged shot
             let isCharged = chargedShotTriggered;

             if (!isCharged && shootInput !== -1) {
                 fireDirection = shootInput;
                 this.shootDirection = fireDirection; // Remember last arrow direction
             }

            this.fireProjectile(fireDirection, isCharged, time);
        }

        // --- Animation Handling ---
         if (this.isCasting) {
             this.play(this.moveDirection === 0 ? 'cast_right' : 'cast_left', true);
              this.setFlipX(this.moveDirection === 2); // Flip sprite if facing left during cast
         } else if (isMoving) {
            this.play(this.moveDirection === 0 ? 'walk_right' : 'walk_left', true);
             this.setFlipX(this.moveDirection === 2); // Flip sprite if facing left
         } else {
            this.play(this.moveDirection === 0 ? 'idle_right' : 'idle_left', true);
             this.setFlipX(this.moveDirection === 2); // Flip sprite if facing left
         }

          // Reset invulnerability after duration
         if (this.isInvulnerable && time > this.lastDamageTime + this.invulnerabilityDuration) {
            this.isInvulnerable = false;
            this.clearTint(); // Optional: visual cue ends
            this.setAlpha(1.0);
        }
    }

    fireProjectile(direction, isCharged, time) {
        if (!this.projectilesGroup) {
            console.error("Player doesn't have projectilesGroup set!");
            return;
        }
        this.isCasting = true;
        this.lastCastTime = time;

        // Stop player movement briefly during cast? (Optional)
        // this.body.setVelocity(0, 0);

         // Schedule end of cast animation state
         if (this.castAnimTimer) this.castAnimTimer.remove(); // Remove previous if any
         this.castAnimTimer = this.scene.time.delayedCall(this.castAnimDuration, () => {
             this.isCasting = false;
         });

         // Calculate projectile settings
        const projTexture = isCharged ? KEYS.PROJECTILE_CHARGED : KEYS.PROJECTILE_NORMAL;
        const projSpeed = isCharged ? CHARGED_PROJECTILE_SPEED : PROJECTILE_SPEED;
        const projDamage = isCharged ? this.getCurrentDamage() * CHARGED_SHOT_DAMAGE_MULTIPLIER : this.getCurrentDamage();
        const projSize = isCharged ? CHARGED_PROJECTILE_SIZE : PROJECTILE_SIZE;
        const penetrating = isCharged;

        // Calculate number of shots based on level
         const numShots = this.level >= 5 ? Math.max(1, Math.floor(this.level / 5) + 1) : 1;
         const shotSpread = 20; // pixels spread for multi-shot

        // Determine spawn offset based on direction
        let offsetX = 0;
        let offsetY = 0;
        if (direction === 0) offsetX = this.spriteSize.width * 0.5 + projSize.width * 0.5;
        else if (direction === 2) offsetX = -(this.spriteSize.width * 0.5 + projSize.width * 0.5);
        else if (direction === 3) offsetY = -(this.spriteSize.height * 0.5 + projSize.height * 0.5);
        else if (direction === 1) offsetY = this.spriteSize.height * 0.5 + projSize.height * 0.5;


        for (let i = 0; i < numShots; i++) {
            let spawnX = this.x + offsetX;
            let spawnY = this.y + offsetY;

            // Apply spread for multi-shot (only if not charged)
            if (!isCharged && numShots > 1) {
                 const spreadAmount = shotSpread * (i - (numShots - 1) / 2);
                 if (direction === 0 || direction === 2) { // Horizontal shots, spread vertically
                    spawnY += spreadAmount;
                } else { // Vertical shots, spread horizontally
                    spawnX += spreadAmount;
                }
            }

             // Create and add projectile
            const proj = new Projectile(this.scene, spawnX, spawnY, projTexture, {
                 direction: direction,
                 damage: projDamage,
                 speed: projSpeed,
                 penetrating: penetrating,
                 size: projSize
             });
             this.projectilesGroup.add(proj);
        }
    }

    getCurrentDamage() {
        return this.baseDamage + (this.level - 1) * 5;
    }

    gainXP(amount) {
        if (!this.active || this.health <= 0) return;
        this.xp += amount;
        console.log(`Gained ${amount} XP. Total: ${this.xp}/${this.xpNextLevel}`);
        let leveledUp = false;
        while (this.xp >= this.xpNextLevel) {
            this.levelUp();
            leveledUp = true;
        }
         if (leveledUp) {
            // Optional: Visual/Sound effect for level up
            this.scene.events.emit('playerLeveledUp', this.level);
         }
         this.scene.events.emit('playerStatsChanged', this.getStats()); // Update UI
    }

    levelUp() {
        console.log(`LEVEL UP! Reached Level ${this.level + 1}`);
        this.xp -= this.xpNextLevel;
        this.level++;
        this.xpNextLevel = Math.floor(XP_BASE_NEXT_LEVEL * (XP_SCALING_FACTOR ** (this.level - 1)));

        // Stat increases
        this.maxHealth += 15;
        this.health = this.maxHealth; // Full heal
        this.baseDamage += 3;
        this.currentSpeed = Math.min(PLAYER_BASE_SPEED * 1.5, this.currentSpeed + PLAYER_BASE_SPEED * 0.025); // Increase speed slightly, cap

        console.log(`  Max HP: ${this.maxHealth}, Base Damage: ${this.baseDamage}, Speed: ${this.currentSpeed.toFixed(1)}`);
        console.log(`  XP for next level: ${this.xpNextLevel}`);
    }

    checkChargedShotUnlock(totalKills) {
         this.kills = totalKills;
         if (!this.chargedShotUnlocked && this.kills >= KILLS_FOR_CHARGED_SHOT) {
             this.chargedShotUnlocked = true;
             console.log("Charged Shot Unlocked! Press SPACE to fire.");
             // TODO: Trigger UI notification
             this.scene.events.emit('chargedShotUnlocked');
         }
          this.scene.events.emit('playerStatsChanged', this.getStats()); // Update kills display
    }

    takeDamage(amount, time) {
         if (this.isInvulnerable || !this.active || this.health <= 0) {
             return false; // Player cannot take damage
         }

        this.health -= amount;
        this.lastDamageTime = time;
        this.isInvulnerable = true; // Start invulnerability

        console.log(`Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);

        // Visual feedback for damage
        this.setAlpha(0.5);
        this.setTint(0xff0000); // Red tint
        // Invulnerability reset handled in update()

        this.scene.events.emit('playerStatsChanged', this.getStats()); // Update health bar

        if (this.health <= 0) {
            this.health = 0;
            this.die();
            return true; // Player died
        }
        return false; // Player survived
    }

     getStats() {
         // Helper to get all relevant stats for UI updates
         return {
             health: this.health,
             maxHealth: this.maxHealth,
             level: this.level,
             xp: this.xp,
             xpNextLevel: this.xpNextLevel,
             kills: this.kills,
             chargedShotUnlocked: this.chargedShotUnlocked,
             castCooldownProgress: this.scene ? Phaser.Math.Clamp((this.scene.time.now - this.lastCastTime) / this.castCooldown, 0, 1) : 0,
         };
     }

     die() {
         console.log("Player Died!");
         this.body.setEnable(false); // Disable physics
         this.setActive(false);
         // Add a death animation/effect
         this.scene.tweens.add({
             targets: this,
             alpha: 0,
             angle: 90, // Spin out
             scale: 0.1,
             duration: 500,
             ease: 'Power2',
             onComplete: () => {
                 // Possibly hide or keep visually dead?
             }
         });
         this.scene.events.emit('playerDied'); // Signal game over to the scene
     }
}


class Wall extends Phaser.Physics.Arcade.Image {
    // Use Image for static walls as they don't need animation methods of Sprite
     constructor(scene, x, y, width, height, textureType = 'stone') {
         // Walls don't strictly need a texture if just drawn with Graphics,
         // but using an Image base allows for potential texture use later.
         // We'll use a dummy pixel texture initially and draw graphics over it.
        super(scene, x + width / 2, y + height / 2, '__WHITE'); // Use default white pixel, position by center

        scene.physics.world.enable(this, Phaser.Physics.Arcade.STATIC_BODY);
        scene.add.existing(this);

        this.setSize(width, height); // Set physics body size
        this.setDisplaySize(width, height); // Set visual size

        this.textureType = textureType;
        this.wallColor = (textureType === 'wood') ? COLOR.DARK_BROWN : COLOR.STONE_GRAY;
        this.darkColor = (textureType === 'wood') ? 0x372814 : COLOR.STONE_GRAY_DARK;
        this.mossy = (textureType === 'stone' && Math.random() < 0.10);

        // Walls are usually drawn once on a Graphics layer or Tilemap Layer for performance
        // Adding individual draw logic here is less efficient for many walls.
        // For simplicity now, we just set the tint. A better approach uses Graphics or Tilemap.
         this.setTint(this.wallColor);
         if (this.mossy) {
             // Add moss effect visually (e.g., another small tinted sprite on top?)
         }

         // No update needed for static walls
    }
}


class Water extends Phaser.Physics.Arcade.Image {
     constructor(scene, x, y, width, height, isDeep = false) {
        super(scene, x + width / 2, y + height / 2, '__WHITE'); // Position by center

        scene.physics.world.enable(this, Phaser.Physics.Arcade.STATIC_BODY);
        scene.add.existing(this);

        this.setSize(width, height);
        this.setDisplaySize(width, height);

        this.isDeep = isDeep;
        this.baseColor = isDeep ? COLOR.WATER_DEEP : COLOR.WATER_SHALLOW;
        this.waveColor = isDeep ? COLOR.WATER_SHALLOW : COLOR.WHITE;
        this.waveAlpha = isDeep ? 0.2 : 0.1; // Low alpha for subtle waves

        this.setTint(this.baseColor);
        this.setAlpha(0.9); // Make water slightly transparent

        // --- Animation Setup ---
        // We can simulate waves by tweening the tint or adding graphic overlays
        this.waveTimer = scene.time.addEvent({
            delay: 150,
            callback: this.updateWaves,
            callbackScope: this,
            loop: true
        });
        // Store the original tint
        this.originalTint = this.tintTopLeft; // Use tint property

    }

    updateWaves() {
        if (!this.active) return;
        // Simple tint pulsing effect for waves
        const waveTint = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(this.baseColor), // From base
            Phaser.Display.Color.ValueToColor(this.waveColor), // To wave color
            100, // Range 100
            Phaser.Math.Clamp(Math.sin(this.scene.time.now / 300) * 50 + 50, 0, 100) // Sin wave, range 0-100
        );
        this.setTint(Phaser.Display.Color.GetColor(waveTint.r, waveTint.g, waveTint.b));

        // More complex: Add a Graphics object and draw animated wave shapes
    }

     destroy(fromScene) {
         if (this.waveTimer) this.waveTimer.remove();
         super.destroy(fromScene);
     }
}


// --- Main Game Scene ---
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        // Core Game Objects & Groups
        this.player = null;
        this.walls = null; // Static group for collision walls
        this.water = null; // Static group for water obstacles
        this.enemies = null; // Group for active enemies
        this.projectiles = null; // Group for player projectiles
        this.bullets = null; // Group for enemy bullets
        this.pickups = null; // Group for health pickups
        this.torches = null; // Group for torch objects

        // Input
        this.cursors = null;
        this.keys = null; // WASD + Space

        // Map & Camera
        this.mapGraphics = null; // For drawing floor tiles
        this.worldBounds = null;

        // Spawning
        this.enemySpawnTimer = null;
        this.baseSpawnInterval = 110 * (1000 / 60); // ms approx
        this.minSpawnInterval = 40 * (1000 / 60); // ms approx
        this.currentSpawnInterval = this.baseSpawnInterval;

        // Game State
        this.isGameOver = false;
        this.isPaused = false;
        this.totalKills = 0;

        // Dialogue
        this.dialogueActive = false;
        this.dialogueSpeaker = '';
        this.dialogueText = '';
        this.dialogueBox = null; // Container for dialogue graphics/text
        this.dialogueTimerEvent = null;

        // UI Refs (managed by UIScene ideally, but keeping here for now)
        this.restartButton = null;

         // Boss Refs (optional, if needed for specific logic)
         this.bossInstance = null;
         this.artistBossInstance = null;
    }

    preload() {
        // Normally done in a dedicated PreloadScene
        // Load Player Frames (individual or atlas)
        for (let i = 1; i <= 6; i++) { this.load.image(KEYS.PLAYER_FRAME_ + i, `assets/${i}frame.png`); }
        this.load.image(KEYS.PLAYER_CAST_FRAME, 'assets/8frame.png');
        this.load.image(KEYS.PLAYER_UP_FRAME, 'assets/10frame.png'); // If used
        this.load.image(KEYS.PLAYER_DOWN_FRAME, 'assets/9frame.png'); // If used

        // Load Enemy Textures
        this.load.image(KEYS.ENEMY_NORMAL_1, 'assets/1enemy.png');
        this.load.image(KEYS.ENEMY_NORMAL_2, 'assets/2enemy.png');
        this.load.image(KEYS.ENEMY_CRAB, 'assets/1crab.png');
        this.load.image(KEYS.BOSS_1, 'assets/1boss.png');
        this.load.image(KEYS.BOSS_2, 'assets/2boss.png');
        this.load.image(KEYS.ARTIST_1, 'assets/1artist.png');
        this.load.image(KEYS.ARTIST_2, 'assets/2artist.png');

        // Load Projectiles
        this.load.image(KEYS.PROJECTILE_NORMAL, 'assets/spell.png');
        this.load.image(KEYS.PROJECTILE_CHARGED, 'assets/charged_spell.png');
        this.load.image(KEYS.PROJECTILE_BULLET, 'assets/bullet.png');

        // Load Pickups
        this.load.image(KEYS.PICKUP_HEALTH, 'assets/health_pickup.png');
        // this.load.image(KEYS.PICKUP_SHIELD, 'assets/shield_pickup.png'); // If you add shields

        // Load UI
        this.load.image(KEYS.HUD_ICON, 'assets/1hud.png');

        // Load default texture (for walls etc. if needed)
        this.load.image('__WHITE', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAwAB/AL+f4MAAAAASUVORK5CYII='); // 1x1 white pixel
    }

    create() {
        this.isGameOver = false;
        this.isPaused = false;
        this.totalKills = 0;
        this.currentSpawnInterval = this.baseSpawnInterval;
         this.bossInstance = null;
         this.artistBossInstance = null;


        // --- World and Camera Setup ---
        this.worldBounds = new Phaser.Geom.Rectangle(0, 0, MAP_SIZE, MAP_SIZE);
        this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
        this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
        this.cameras.main.setZoom(GAME_ZOOM); // Apply retro zoom
        this.cameras.main.setBackgroundColor(COLOR.DARKER_GRAY);

        // --- Input Setup ---
        this.cursors = this.input.keyboard.createCursorKeys(); // Arrow keys + shift/space/ctrl
        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            f: Phaser.Input.Keyboard.KeyCodes.F,     // Fullscreen
            esc: Phaser.Input.Keyboard.KeyCodes.ESC, // Pause/Exit Fullscreen
            r: Phaser.Input.Keyboard.KeyCodes.R,     // Restart
            p: Phaser.Input.Keyboard.KeyCodes.P,     // Pause alternative
            tab: Phaser.Input.Keyboard.KeyCodes.TAB, // Toggle Retro Filter (Zoom)
        });

        // --- Map Graphics Layer ---
        this.mapGraphics = this.add.graphics();

        // --- Create Groups ---
        // Walls need to be static for performance
        this.walls = this.physics.add.staticGroup({ classType: Wall });
        this.water = this.physics.add.staticGroup({ classType: Water });
        // Enemies, projectiles, etc., are dynamic
        this.enemies = this.physics.add.group({ classType: BaseEnemy, runChildUpdate: false }); // We run update via loop
        this.projectiles = this.physics.add.group({ classType: Projectile, runChildUpdate: false });
        this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: false });
        this.pickups = this.physics.add.group({ classType: HealthPickup, runChildUpdate: false });
        this.torches = this.add.group({classType: Torch, runChildUpdate: false }); // Torches aren't physics objects

        // --- Generate Level ---
        this.generateSimpleLevel(); // Call the level generation

        // --- Create Player ---
        // Place player near center initially (or based on map gen)
        const spawnX = MAP_SIZE / 2;
        const spawnY = MAP_SIZE / 2;
        this.player = new Player(this, spawnX, spawnY);
        this.player.projectilesGroup = this.projectiles; // Give player ref to group

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Smooth follow


        // --- Setup Physics Collisions ---
        this.setupCollisions();

        // --- Spawn Initial Enemies ---
        for (let i = 0; i < 5; i++) {
             this.spawnEnemy();
        }

        // --- Enemy Spawning Timer ---
        this.enemySpawnTimer = this.time.addEvent({
             delay: this.currentSpawnInterval,
             callback: this.spawnEnemyLoop,
             callbackScope: this,
             loop: true
        });

         // --- Start UI Scene ---
         // Best Practice: Move UI drawing to a separate scene launched here.
         // For now, UI drawing happens in this scene's post-render or update step.
         this.scene.launch('UIScene', { gameScene: this }); // Pass reference if needed

        // --- Input Handlers ---
        this.keys.f.on('down', this.toggleFullscreen, this);
        this.keys.esc.on('down', this.handleEscape, this);
        this.keys.r.on('down', this.handleRestart, this);
        this.keys.p.on('down', () => { if (!this.isGameOver) this.togglePause(); }, this);
        this.keys.tab.on('down', this.toggleRetroFilter, this);
        this.keys.space.on('down', this.handleSpaceDialogue, this); // For skipping dialogue

         // Handle click on restart button (event comes from UIScene)
         this.events.on('restartClicked', this.restartGame, this);

         // --- Event Listeners from Player/Enemies ---
         this.events.on('playerDied', () => { this.isGameOver = true; }, this);
         this.events.on('chargedShotUnlocked', () => { /* TODO: UI popup? */ }, this);
         this.events.on('playerLeveledUp', (level) => { /* TODO: Level up effect? */ }, this);

         // --- Initial Dialogue ---
         this.showDialogue("TUTORIAL", "You've washed up on a strange beach. Defeat enemies and survive!");

         console.log("GameScene Created");
    }

     generateSimpleLevel() {
         // --- Border Walls ---
         // Top
         this.walls.add(new Wall(this, 0, 0, MAP_SIZE, WALL_THICKNESS), true);
         // Bottom
         this.walls.add(new Wall(this, 0, MAP_SIZE - WALL_THICKNESS, MAP_SIZE, WALL_THICKNESS), true);
         // Left
         this.walls.add(new Wall(this, 0, WALL_THICKNESS, WALL_THICKNESS, MAP_SIZE - 2 * WALL_THICKNESS), true);
         // Right
         this.walls.add(new Wall(this, MAP_SIZE - WALL_THICKNESS, WALL_THICKNESS, WALL_THICKNESS, MAP_SIZE - 2 * WALL_THICKNESS), true);

          // --- Example Water Feature ---
          this.water.add(new Water(this, MAP_SIZE * 0.2, MAP_SIZE * 0.5, 400, 150, false)); // Shallow
          this.water.add(new Water(this, MAP_SIZE * 0.7, MAP_SIZE * 0.3, 200, 300, true)); // Deep

          // --- Example Torches ---
          this.torches.add(new Torch(this, MAP_SIZE * 0.3, MAP_SIZE * 0.3));
          this.torches.add(new Torch(this, MAP_SIZE * 0.7, MAP_SIZE * 0.7));
          this.torches.add(new Torch(this, MAP_SIZE * 0.3, MAP_SIZE * 0.7));
          this.torches.add(new Torch(this, MAP_SIZE * 0.7, MAP_SIZE * 0.3));

         // Floor is drawn dynamically in update based on camera view
         // Refresh static bodies in groups
         this.walls.refresh();
         this.water.refresh();
     }

    setupCollisions() {
        // Player vs Walls/Water
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.water);

        // Enemies vs Walls/Water/Each other
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.enemies, this.water);
        this.physics.add.collider(this.enemies, this.enemies); // Enemies push each other

        // Projectiles vs Walls/Enemies
        this.physics.add.collider(this.projectiles, this.walls, this.handleProjectileWallCollision, null, this);
        this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileEnemyCollision, null, this);

        // Bullets vs Walls/Player
        this.physics.add.collider(this.bullets, this.walls, this.handleBulletWallCollision, null, this);
        this.physics.add.overlap(this.bullets, this.player, this.handleBulletPlayerCollision, null, this);

        // Enemies vs Player (Touch Damage)
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyTouchCollision, null, this);

        // Player vs Pickups
        this.physics.add.overlap(this.player, this.pickups, this.handlePlayerPickupCollision, null, this);
    }

    // --- Collision Handlers ---
    handleProjectileWallCollision(projectile, wall) {
        projectile.destroy(); // Destroy projectile on wall hit
        // Add particle effect?
    }

     handleProjectileEnemyCollision(projectile, enemy) {
        if (!projectile.active || !enemy.active || enemy.isDying || enemy.isDeadTemporarily) return; // Ignore inactive/dying/reviving

        const enemyDied = enemy.takeDamage(projectile.damage); // Apply damage

        if (enemyDied) { // takeDamage returns true if this hit killed it (and it wasn't reviving)
            this.player.gainXP(enemy.xpValue);
            this.totalKills++;
            this.player.checkChargedShotUnlock(this.totalKills);

            // Chance to drop health pickup from bosses
            if (enemy.isBoss && enemy.healthDropChance && Math.random() < enemy.healthDropChance) {
                const pickup = new HealthPickup(this, enemy.x, enemy.y);
                this.pickups.add(pickup);
            }
             // Check if this was the boss instance
             if (enemy === this.bossInstance) this.bossInstance = null;
             if (enemy === this.artistBossInstance) this.artistBossInstance = null;
        }

        // Destroy projectile unless it penetrates
        if (projectile.active && !projectile.penetrating) {
            projectile.destroy();
        }
    }

     handleBulletWallCollision(bullet, wall) {
         bullet.destroy();
         // Add particle effect?
     }

     handleBulletPlayerCollision(player, bullet) {
         if (!player.active || !bullet.active || player.isInvulnerable) return;
         player.takeDamage(bullet.damage, this.time.now); // Apply damage, pass current time
         bullet.destroy();
     }

    handlePlayerEnemyTouchCollision(player, enemy) {
         if (!player.active || !enemy.active || player.isInvulnerable || enemy.isDying || enemy.isDeadTemporarily) return;
         player.takeDamage(1, this.time.now); // Apply 1 touch damage
         // Apply small knockback to player?
         const knockback = 50;
         const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
         this.player.body.velocity.x += Math.cos(angle) * knockback;
         this.player.body.velocity.y += Math.sin(angle) * knockback;
     }

     handlePlayerPickupCollision(player, pickup) {
         if (!player.active || !pickup.active) return;
         player.health = Math.min(player.maxHealth, player.health + pickup.healAmount);
         console.log(`Picked up health: +${pickup.healAmount} HP`);
         this.events.emit('playerStatsChanged', this.player.getStats()); // Update UI
         pickup.pickupDestroy(); // Special destroy to handle tween/timer cleanup
     }

    // --- Spawning Logic ---
    spawnEnemyLoop() {
         // This is called by the timer event
         this.spawnEnemy();

         // Gradually decrease spawn interval
         if (this.currentSpawnInterval > this.minSpawnInterval) {
             this.currentSpawnInterval = Math.max(this.minSpawnInterval, this.currentSpawnInterval - 50); // Decrease by 50ms
             // Update timer delay
             if (this.enemySpawnTimer) {
                 this.enemySpawnTimer.delay = this.currentSpawnInterval;
             }
         }
    }

    spawnEnemy() {
        if (this.enemies.getLength() >= MAX_ENEMIES || !this.player?.active) {
             return; // Don't spawn if max reached or player is gone
         }

        const minSpawnDist = 400 * GAME_ZOOM; // Min distance from player (adjust for zoom)
        const padding = 100; // Padding from map edges
        let spawnPos = null;
        let attempts = 0;
        const maxAttempts = 20;

        while (!spawnPos && attempts < maxAttempts) {
             attempts++;
             const x = Phaser.Math.Between(padding, MAP_SIZE - padding);
             const y = Phaser.Math.Between(padding, MAP_SIZE - padding);

             // Check distance from player
             const distSq = Phaser.Math.Distance.Squared(x, y, this.player.x, this.player.y);
             if (distSq < minSpawnDist * minSpawnDist) {
                 continue; // Too close
             }

             // Simplistic check: Ensure not spawning directly inside a wall/water center
             // A better check uses physics queries (overlapRect) but is slower.
             let invalidPosition = false;
             // Check Walls (assuming walls group only contains Wall instances)
             this.walls.children.iterate(wall => {
                 if (Phaser.Geom.Rectangle.Contains(wall.getBounds(), x, y)) {
                     invalidPosition = true;
                     return false; // Stop iteration
                 }
             });
             if (invalidPosition) continue;
             // Check Water
             this.water.children.iterate(w => {
                 if (Phaser.Geom.Rectangle.Contains(w.getBounds(), x, y)) {
                     invalidPosition = true;
                     return false; // Stop iteration
                 }
             });
             if (invalidPosition) continue;

             // Position seems okay
             spawnPos = { x, y };
        }

         if (!spawnPos) {
             console.warn("Could not find valid spawn position for enemy.");
             return; // Failed to find a spot
         }

         // --- Determine Enemy Type ---
         let enemyType = 'normal';
         const difficultyScaling = 1.0 + (this.player.level * 0.1);
         const crabChance = Phaser.Math.Clamp(0.2 + (this.player.level * 0.05), 0, 0.7);
         const bossChance = Phaser.Math.Clamp(0.02 + (this.player.level * 0.01), 0, 0.2);
         const randVal = Math.random();

         let spawnedEnemy = null;

         // Decide type based on chances
         // Add Boss logic - only one boss at a time?
         if (!this.bossInstance && !this.artistBossInstance && this.player.level >= 5 && randVal < bossChance) {
             if (Math.random() < 0.5 && !this.artistBossInstance) { // Chance for Artist Boss if main boss slot is free
                 enemyType = 'artist';
             } else if (!this.bossInstance) {
                 enemyType = 'boss';
             } else { // If only artist boss can spawn but its taken, default to crab/normal
                  if (randVal < crabChance) enemyType = 'crab';
                  else enemyType = 'normal';
             }
         } else if (randVal < crabChance) {
             enemyType = 'crab';
         } else {
             enemyType = 'normal';
         }


         // --- Instantiate Enemy ---
         switch (enemyType) {
             case 'crab':
                 spawnedEnemy = new Crab(this, spawnPos.x, spawnPos.y, this.player);
                 break;
             case 'boss':
                  if (!this.bossInstance) {
                    spawnedEnemy = new Boss(this, spawnPos.x, spawnPos.y, this.player, this.bullets);
                    this.bossInstance = spawnedEnemy; // Track boss instance
                  } else { // Fallback if boss already exists
                     spawnedEnemy = new Enemy(this, spawnPos.x, spawnPos.y, this.player);
                  }
                 break;
              case 'artist':
                  if (!this.artistBossInstance) {
                     spawnedEnemy = new ArtistBoss(this, spawnPos.x, spawnPos.y, this.player);
                     this.artistBossInstance = spawnedEnemy; // Track instance
                  } else { // Fallback if artist already exists
                      spawnedEnemy = new Enemy(this, spawnPos.x, spawnPos.y, this.player);
                  }
                 break;
             case 'normal':
             default:
                 spawnedEnemy = new Enemy(this, spawnPos.x, spawnPos.y, this.player);
                 break;
         }

        // Apply difficulty scaling (adjust health/speed/damage after creation)
         if (spawnedEnemy) {
            spawnedEnemy.maxHealth *= difficultyScaling;
            spawnedEnemy.health = spawnedEnemy.maxHealth;
            // spawnedEnemy.damage *= difficultyScaling; // If enemies had direct damage value
            spawnedEnemy.baseSpeed *= Math.min(1.5, 1.0 + (this.player.level * 0.02));
            spawnedEnemy.currentSpeed = spawnedEnemy.baseSpeed;
            spawnedEnemy.xpValue *= difficultyScaling;

            this.enemies.add(spawnedEnemy);
         }
    }

    // --- Input Handlers ---
    toggleFullscreen() {
        if (this.scale.isFullscreen) {
            this.scale.stopFullscreen();
        } else {
            this.scale.startFullscreen();
        }
    }

    handleEscape() {
        if (this.scale.isFullscreen) {
            this.scale.stopFullscreen();
        } else if (!this.isGameOver) {
             // Toggle pause if not in fullscreen and game not over
            this.togglePause();
        } else {
            // If game over and Esc pressed, maybe go to a main menu?
             // For now, just logs it.
            console.log("Exiting (Placeholder - Implement Menu or Quit)");
            // In a real build, you might close the window or go to another state.
        }
    }

    handleRestart() {
         if (this.isGameOver || this.isPaused) {
             this.restartGame();
         }
    }

     restartGame() {
         console.log("Restarting game...");
          // Stop UI scene if running
         this.scene.stop('UIScene');
         // Restart this scene
         this.scene.restart();
     }

     togglePause() {
         this.isPaused = !this.isPaused;
         if (this.isPaused) {
             this.physics.pause();
             // Pause animations and timers
             this.tweens.pauseAll();
             this.time.pauseAll();
             this.enemies.getChildren().forEach(enemy => enemy.anims?.pause());
             this.player.anims?.pause();
             this.scene.pause('UIScene'); // Pause UI updates
             this.events.emit('gamePaused', true); // Signal UI
             console.log("Game Paused");
         } else {
             this.physics.resume();
             this.tweens.resumeAll();
             this.time.resumeAll();
             this.enemies.getChildren().forEach(enemy => enemy.anims?.resume());
             this.player.anims?.resume();
             this.scene.resume('UIScene');
             this.events.emit('gamePaused', false); // Signal UI
             console.log("Game Resumed");
         }
     }

    toggleRetroFilter() {
         let currentZoom = this.cameras.main.zoom;
         let newZoom = (currentZoom === GAME_ZOOM) ? 1 : GAME_ZOOM;
         this.cameras.main.setZoom(newZoom);
         console.log("Toggled Retro Zoom to:", newZoom);
          // If zoom is 1, pixelArt might look worse depending on original assets
         // this.cameras.main.pixelArt = (newZoom > 1); // Toggle pixel art based on zoom
    }

     handleSpaceDialogue() {
         // Only acts if dialogue is currently active
         if (this.dialogueActive) {
            this.hideDialogue(true); // Force hide
         }
     }

    // --- Dialogue System ---
     showDialogue(speaker, text) {
         if (this.dialogueActive) { // Don't overlap dialogues
             this.hideDialogue(true); // Force hide previous one first
         }

         this.dialogueActive = true;
         this.dialogueSpeaker = speaker;
         this.dialogueText = text;

         // Signal UI to show dialogue
         this.events.emit('showDialogue', { speaker, text });

          // Auto-hide timer
          const duration = text.length * 50 + 2000; // Adjust timing
          if(this.dialogueTimerEvent) this.dialogueTimerEvent.remove(); // Clear previous timer
          this.dialogueTimerEvent = this.time.delayedCall(duration, () => {
              this.hideDialogue();
          });
     }

      hideDialogue(force = false) {
          if (!this.dialogueActive && !force) return; // Already hidden

          this.dialogueActive = false;
          if(this.dialogueTimerEvent) {
             this.dialogueTimerEvent.remove();
             this.dialogueTimerEvent = null;
          }
          // Signal UI to hide dialogue
          this.events.emit('hideDialogue');
      }

    // --- Update Loop ---
    update(time, delta) {
         if (this.isGameOver) {
             // Game over logic handled by UI Scene display
             return;
         }
         if (this.isPaused) {
             // Paused logic handled by UI Scene display
             return;
         }
         if (this.dialogueActive) {
             // Pause player/enemy updates during dialogue? Optional
              this.player?.body.setVelocity(0,0); // Stop player
              // Prevent enemies from moving during dialogue too?
             // this.enemies.getChildren().forEach(e => e.body.setVelocity(0,0));
         }


        // --- Update Game Objects ---
         if (this.player?.active && !this.dialogueActive) {
             this.player.update(this.cursors, this.keys, time);
         }

         // Update enemies (only if they need specific logic beyond physics)
         // runChildUpdate is false, so manual update call if needed. BaseEnemy uses preUpdate.
         this.enemies.getChildren().forEach(enemy => {
              if (enemy.active && typeof enemy.preUpdate === 'function' && !this.dialogueActive) {
                  // preUpdate handles movement/AI for BaseEnemy and derived classes
                  // enemy.preUpdate(time, delta); // This is called automatically by Phaser if runChildUpdate=true
              } else if (enemy.active && typeof enemy.update === 'function' && !this.dialogueActive){
                  // Use 'update' if preUpdate isn't the main logic place
                  enemy.update(time, delta);
              }
         });

        // Update pickups (bobbing etc.) - done via tween mostly
         this.pickups.getChildren().forEach(pickup => {
             if (pickup.active && typeof pickup.update === 'function') {
                 pickup.update(time, delta);
             }
         });

         // Update torches - done via event listener

        // --- Draw Dynamic Floor ---
        this.drawFloorTiles();

        // --- Send player stats to UI continuously ---
         // More efficient: Use events only when stats change
         // Less efficient but simpler for now: Send every frame
         if (this.player?.active) {
             this.events.emit('playerStatsUpdate', this.player.getStats());
         }

    }

    // --- Dynamic Floor Drawing ---
    drawFloorTiles() {
        this.mapGraphics.clear();
        const cam = this.cameras.main;
        const bounds = cam.worldView; // Get the visible area in world coordinates

        const startCol = Math.floor(bounds.x / TILE_SIZE);
        const endCol = Math.ceil(bounds.right / TILE_SIZE);
        const startRow = Math.floor(bounds.y / TILE_SIZE);
        const endRow = Math.ceil(bounds.bottom / TILE_SIZE);

         // Draw base sand background for visible area (needed?)
         // mapGraphics.fillStyle(COLOR.SAND_DARK);
         // mapGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

         for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                 const tileX = col * TILE_SIZE;
                 const tileY = row * TILE_SIZE;

                 // Check if this tile is considered "floor" (inside map, outside walls)
                 // For simple map, anything not a wall is floor.
                 const isFloor = (tileX >= WALL_THICKNESS && tileX < MAP_SIZE - WALL_THICKNESS &&
                                 tileY >= WALL_THICKNESS && tileY < MAP_SIZE - WALL_THICKNESS);

                // Rough check to exclude water areas - TODO: Needs better check if water isn't rectangular
                 let isWater = false;
                 this.water.children.iterate(w => {
                     if (Phaser.Geom.Rectangle.Overlaps(w.getBounds(), new Phaser.Geom.Rectangle(tileX, tileY, TILE_SIZE, TILE_SIZE))) {
                         isWater = true;
                         return false; // Stop check
                     }
                 });


                 if (isFloor && !isWater) {
                    // Determine color (simple checkerboard sand for now)
                    const color = (row + col) % 2 === 0 ? COLOR.SAND_LIGHT : COLOR.SAND_DARK;
                    this.mapGraphics.fillStyle(color);
                    this.mapGraphics.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

                    // Add sand texture dots (optional, performance impact)
                    if (Math.random() < 0.05) {
                        const dotColor = (color === COLOR.SAND_LIGHT) ? COLOR.SAND_DARK : COLOR.SAND_LIGHT;
                        this.mapGraphics.fillStyle(dotColor, 0.5);
                        this.mapGraphics.fillCircle(
                             tileX + Phaser.Math.Between(5, TILE_SIZE - 5),
                             tileY + Phaser.Math.Between(5, TILE_SIZE - 5),
                             Phaser.Math.Between(1, 2)
                         );
                     }
                }
                 // Don't draw anything if it's wall or water (let those sprites handle visuals)
            }
        }
    }

     shutdown() {
         // Clean up timers and event listeners when scene stops
         console.log("GameScene Shutting Down");
         if (this.enemySpawnTimer) this.enemySpawnTimer.remove();
         if (this.dialogueTimerEvent) this.dialogueTimerEvent.remove();

         // Remove specific listeners added with 'this.events.on'
         this.events.off('restartClicked', this.restartGame, this);
         this.events.off('playerDied');
         this.events.off('chargedShotUnlocked');
         this.events.off('playerLeveledUp');
          this.events.off('playerStatsChanged'); // If used
          this.events.off('playerStatsUpdate'); // If used
          this.events.off('showDialogue');
          this.events.off('hideDialogue');
          this.events.off('gamePaused');

          // Stop keyboard listeners created with 'key.on'
          Object.values(this.keys).forEach(key => {
            if(key && typeof key.removeAllListeners === 'function') {
                key.removeAllListeners();
            }
          });

           // Nullify references (optional, helps garbage collection)
           this.player = null;
           this.walls = null;
           this.water = null;
           this.enemies = null;
           this.projectiles = null;
           this.bullets = null;
           this.pickups = null;
           this.torches = null;
           this.cursors = null;
           this.keys = null;
           this.mapGraphics = null;
           this.worldBounds = null;
           this.enemySpawnTimer = null;
           this.dialogueBox = null;
           this.dialogueTimerEvent = null;
           this.restartButton = null;
           this.bossInstance = null;
           this.artistBossInstance = null;
     }
}

// --- UI Scene ---
class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.gameScene = null; // Reference to the main game scene

        // UI Elements
        this.hpBarBg = null;
        this.hpBarFg = null;
        this.hpText = null;
        this.xpBarBg = null;
        this.xpBarFg = null;
        this.levelText = null;
        this.killsText = null;
        this.chargedShotText = null;
        this.hudIcon = null;
        this.hudPanel = null;
        this.statsPanel = null;
        this.multiShotText = null;

        // Dialogue Elements
        this.dialogueGroup = null; // Group holds all dialogue elements
        this.dialogueBg = null;
        this.dialogueSpeakerText = null;
        this.dialogueMessageText = null;
        this.dialoguePrompt = null;

        // Pause/Game Over Screens
        this.pauseOverlay = null;
        this.pauseText = null;
        this.gameOverOverlay = null;
        this.gameOverText = null;
    }

    init(data) {
         // Get reference to the GameScene if passed
         this.gameScene = data.gameScene;
     }

    create() {
        // Create semi-transparent panels for HUD areas
        const hudHeight = 90;
        const hudWidth = 90;
        const statsWidth = 160;

        // HUD Icon Panel (Top Left)
        this.hudPanel = this.add.graphics()
            .fillStyle(COLOR.BLACK, 0.7)
            .fillRoundedRect(10, 10, hudWidth, hudHeight, 5)
            .lineStyle(3, COLOR.PURPLE_BORDER)
            .strokeRoundedRect(10, 10, hudWidth, hudHeight, 5);
        this.hudIcon = this.add.image(10 + hudWidth/2, 10 + hudHeight/2, KEYS.HUD_ICON).setDisplaySize(80, 80);

        // Stats Panel (Right of HUD)
        const statsPanelX = 10 + hudWidth + 10;
        this.statsPanel = this.add.graphics()
            .fillStyle(COLOR.BLACK, 0.7)
            .fillRoundedRect(statsPanelX, 10, statsWidth, hudHeight, 5)
            .lineStyle(3, COLOR.PURPLE_BORDER)
            .strokeRoundedRect(statsPanelX, 10, statsWidth, hudHeight, 5);

        // --- Health Bar ---
        const barWidth = 140;
        const hpBarHeight = 16;
        const barX = statsPanelX + 10;
        const hpBarY = 10 + 25;
        this.hpBarBg = this.add.graphics().fillStyle(COLOR.BLOOD_RED).fillRect(barX, hpBarY, barWidth, hpBarHeight);
        this.hpBarFg = this.add.graphics().fillStyle(COLOR.HEALTH_GREEN).fillRect(barX, hpBarY, barWidth, hpBarHeight); // Initial full width
        this.add.graphics().lineStyle(1, COLOR.BLACK).strokeRect(barX, hpBarY, barWidth, hpBarHeight); // Border
        this.hpText = this.add.text(barX + barWidth - 5, hpBarY + 1, '100/100', FONT_STYLE_SMALL).setOrigin(1, 0);

        // --- XP Bar ---
        const xpBarHeight = 10;
        const xpBarY = hpBarY + hpBarHeight + 10;
        this.xpBarBg = this.add.graphics().fillStyle(0x282846).fillRect(barX, xpBarY, barWidth, xpBarHeight); // Dark BG
        this.xpBarFg = this.add.graphics().fillStyle(COLOR.XP_COLOR).fillRect(barX, xpBarY, 0, xpBarHeight); // Initial empty width
        this.add.graphics().lineStyle(1, COLOR.BLACK).strokeRect(barX, xpBarY, barWidth, xpBarHeight); // Border

        // --- Text Elements ---
        this.levelText = this.add.text(barX, hpBarY + hpBarHeight/2, 'LVL 1', FONT_STYLE_SMALL).setOrigin(0, 0.5);
        this.killsText = this.add.text(barX, 10 + hudHeight - 10, 'Kills: 0', FONT_STYLE_SMALL).setOrigin(0, 1);
        this.chargedShotText = this.add.text(statsPanelX + statsWidth / 2, 10 + hudHeight - 10, '', FONT_STYLE_SMALL).setOrigin(0.5, 1).setColor('#808080'); // Initially hidden/grey
        this.multiShotText = this.add.text(statsPanelX + 10, 10 + hudHeight + 5, 'Shots: 1', FONT_STYLE_SMALL).setColor('#FFBE32');

        // --- Restart Button ---
        const btnWidth = 80;
        const btnHeight = 25;
        const btnX = SCREEN_WIDTH - btnWidth - 10; // Top Right
        const btnY = 10 + (hudHeight - btnHeight) / 2;
        const btnBg = this.add.graphics().fillStyle(0x646464).fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 5); // Button BG
        const btnBorder = this.add.graphics().lineStyle(2, COLOR.BLACK).strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 5); // Button Border
        const btnText = this.add.text(btnX + btnWidth/2, btnY + btnHeight/2, 'RESTART', FONT_STYLE_BUTTON).setOrigin(0.5);
        // Make the background interactive
         btnBg.setInteractive(new Phaser.Geom.Rectangle(btnX, btnY, btnWidth, btnHeight), Phaser.Geom.Rectangle.Contains);
         btnBg.on('pointerdown', () => {
             console.log("Restart Clicked UI");
             // Emit event back to GameScene
             this.gameScene?.events.emit('restartClicked');
         });
          btnBg.on('pointerover', () => btnBg.clear().fillStyle(COLOR.TORCH_YELLOW).fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 5));
          btnBg.on('pointerout', () => btnBg.clear().fillStyle(0x646464).fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 5));
          this.restartButton = btnBg; // Store interactive part


        // --- Dialogue Box Elements (Initially Hidden) ---
        this.dialogueGroup = this.add.container(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 80).setVisible(false).setDepth(100); // Positioned bottom-center
        const boxWidth = SCREEN_WIDTH * 0.8;
        const boxHeight = 120;
        this.dialogueBg = this.add.graphics()
            .fillStyle(COLOR.BLACK, 0.85)
            .fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8)
            .lineStyle(2, COLOR.WHITE)
            .strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);

        // Speaker Name Background (relative to dialogue container)
         const speakerPadding = 10;
         const speakerBgHeight = 25; // Approximate height for small font
         this.dialogueSpeakerBg = this.add.graphics(); // Will be updated
         this.dialogueSpeakerText = this.add.text(-boxWidth/2 + 20, -boxHeight/2 - speakerBgHeight/2 + 5 , '', FONT_STYLE_SMALL).setOrigin(0, 0.5);

        this.dialogueMessageText = this.add.text(-boxWidth / 2 + 20, -boxHeight/2 + 30, '', FONT_STYLE_DIALOGUE);
        this.dialoguePrompt = this.add.text(boxWidth / 2 - 20, boxHeight / 2 - 15, 'Press SPACE', FONT_STYLE_SMALL).setOrigin(1, 1).setColor('#b0b0b0');
        this.dialogueGroup.add([this.dialogueBg, this.dialogueSpeakerBg, this.dialogueSpeakerText, this.dialogueMessageText, this.dialoguePrompt]);

        // --- Pause/Game Over Elements (Initially Hidden) ---
        this.pauseOverlay = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, COLOR.BLACK, 0.75).setOrigin(0).setVisible(false).setDepth(150);
        this.pauseText = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 50, 'PAUSED', FONT_STYLE_LARGE).setOrigin(0.5).setColor('#FFBE32').setVisible(false).setDepth(151);
        this.pauseResumeText = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 30, 'Press P or ESC to Resume', FONT_STYLE_NORMAL).setOrigin(0.5).setVisible(false).setDepth(151);
        this.pauseRestartText = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 70, 'Press R to Restart', FONT_STYLE_NORMAL).setOrigin(0.5).setVisible(false).setDepth(151);

        this.gameOverOverlay = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, COLOR.DARK_RED, 0.85).setOrigin(0).setVisible(false).setDepth(150);
        this.gameOverTitle = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 80, 'YOU DIED', FONT_STYLE_LARGE).setOrigin(0.5).setColor('#960000').setVisible(false).setDepth(151);
        this.gameOverKills = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 0, 'Kills: 0', FONT_STYLE_NORMAL).setOrigin(0.5).setVisible(false).setDepth(151);
        this.gameOverLevel = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 40, 'Level: 1', FONT_STYLE_NORMAL).setOrigin(0.5).setVisible(false).setDepth(151);
        this.gameOverRestart = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 90, 'Press R to Restart', FONT_STYLE_NORMAL).setOrigin(0.5).setColor('#FFBE32').setVisible(false).setDepth(151);
        this.gameOverExit = this.add.text(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 130, 'Press ESC to Exit', FONT_STYLE_NORMAL).setOrigin(0.5).setVisible(false).setDepth(151);


        // --- Listen for Events from GameScene ---
        this.gameScene?.events.on('playerStatsUpdate', this.updateStatsUI, this);
        this.gameScene?.events.on('showDialogue', this.displayDialogue, this);
        this.gameScene?.events.on('hideDialogue', this.clearDialogue, this);
        this.gameScene?.events.on('gamePaused', this.showPauseScreen, this);
        this.gameScene?.events.on('playerDied', this.showGameOverScreen, this);

         // Handle shutdown cleanup
         this.events.on('shutdown', this.cleanUpListeners, this);
    }

    updateStatsUI(stats) {
        if (!this.hpBarFg || !this.hpText) return; // Ensure elements exist

        // Health
        const hpRatio = Phaser.Math.Clamp(stats.health / stats.maxHealth, 0, 1);
        const hpBarWidth = 140;
        this.hpBarFg.clear().fillStyle(COLOR.HEALTH_GREEN).fillRect(this.hpBarBg.x, this.hpBarBg.y, hpBarWidth * hpRatio, 16);
        this.hpText.setText(`${Math.floor(stats.health)}/${Math.floor(stats.maxHealth)}`);

        // XP
        const xpRatio = (stats.xpNextLevel > 0) ? Phaser.Math.Clamp(stats.xp / stats.xpNextLevel, 0, 1) : 1;
        const xpBarWidth = 140;
        this.xpBarFg.clear().fillStyle(COLOR.XP_COLOR).fillRect(this.xpBarBg.x, this.xpBarBg.y, xpBarWidth * xpRatio, 10);

        // Text Stats
        this.levelText.setText(`LVL ${stats.level}`);
        this.killsText.setText(`Kills: ${stats.kills}`);
         const numShots = stats.level >= 5 ? Math.max(1, Math.floor(stats.level / 5) + 1) : 1;
         this.multiShotText.setText(`Shots: ${numShots}`);

        // Charged Shot Indicator
        if (stats.chargedShotUnlocked) {
            const canFireCharged = stats.castCooldownProgress >= 1;
             this.chargedShotText.setText(canFireCharged ? 'Charged: SPACE' : 'Charging...');
             this.chargedShotText.setColor(canFireCharged ? '#FFBE32' : '#808080');
             // Optional: Add cooldown progress visualization
             // const cooldownBarWidth = 50;
             // chargeBarFg.clear().fillStyle(COLOR.TORCH_YELLOW).fillRect(x, y, cooldownBarWidth * stats.castCooldownProgress, 5);
        } else {
             this.chargedShotText.setText(''); // Hide if not unlocked
        }
    }

    displayDialogue({ speaker, text }) {
        if (!this.dialogueGroup) return;
        this.dialogueMessageText.setText(text);
        this.dialogueSpeakerText.setText(speaker);

        // Update speaker background size dynamically
        const speakerWidth = this.dialogueSpeakerText.width;
        const speakerPadding = 10;
        const speakerBgWidth = speakerWidth + speakerPadding * 2;
        const speakerBgHeight = 25; // From create()
        this.dialogueSpeakerBg.clear()
            .fillStyle(COLOR.BLACK, 0.9)
            .fillRoundedRect(this.dialogueSpeakerText.x - speakerPadding, this.dialogueSpeakerText.y - speakerBgHeight / 2, speakerBgWidth, speakerBgHeight, 4)
            .lineStyle(1, COLOR.WHITE)
            .strokeRoundedRect(this.dialogueSpeakerText.x - speakerPadding, this.dialogueSpeakerText.y - speakerBgHeight / 2, speakerBgWidth, speakerBgHeight, 4);

        this.dialogueGroup.setVisible(true);
    }

    clearDialogue() {
        if (this.dialogueGroup) {
             this.dialogueGroup.setVisible(false);
        }
    }

     showPauseScreen(isPaused) {
        this.pauseOverlay.setVisible(isPaused);
        this.pauseText.setVisible(isPaused);
        this.pauseResumeText.setVisible(isPaused);
        this.pauseRestartText.setVisible(isPaused);
    }

    showGameOverScreen() {
        // Fetch final stats if needed (e.g., get kills directly from player one last time)
         const finalStats = this.gameScene?.player?.getStats() || { kills: this.gameScene?.totalKills || 0, level: this.gameScene?.player?.level || 1 };

        this.gameOverOverlay.setVisible(true);
        this.gameOverTitle.setVisible(true);
        this.gameOverKills.setText(`Kills: ${finalStats.kills}`).setVisible(true);
        this.gameOverLevel.setText(`Level: ${finalStats.level}`).setVisible(true);
        this.gameOverRestart.setVisible(true);
        this.gameOverExit.setVisible(true); // If exit functionality is added

         // Disable restart button interaction visually if needed
         // this.restartButton.disableInteractive(); // Or change color
    }

     cleanUpListeners() {
         console.log("UIScene Shutting Down");
         // Remove listeners added with 'this.gameScene.events.on'
         if(this.gameScene?.events) {
            this.gameScene.events.off('playerStatsUpdate', this.updateStatsUI, this);
            this.gameScene.events.off('showDialogue', this.displayDialogue, this);
            this.gameScene.events.off('hideDialogue', this.clearDialogue, this);
            this.gameScene.events.off('gamePaused', this.showPauseScreen, this);
            this.gameScene.events.off('playerDied', this.showGameOverScreen, this);
         }

          // Clean up interactive elements
         if(this.restartButton) {
            this.restartButton.removeAllListeners();
         }
     }
}


// --- Phaser Game Configuration ---
const config = {
    type: Phaser.AUTO, // AUTO tries WebGL first, then Canvas
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    parent: null, // Let Phaser create canvas in body
    pixelArt: true, // Render crisp pixels for retro look when zooming
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Top-down game
             // debug: true // Set true to see physics bodies/velocities
            debug: false
        }
    },
    scene: [GameScene, UIScene] // Load GameScene first, UIScene runs in parallel
};

// --- Start the Game ---
const game = new Phaser.Game(config);
