class CombatSystem {
    constructor(player, enemies) {
        this.player = player;
        this.enemies = enemies;
    }

    playerAttack(target) {
        const damage = this.player.attack();
        target.takeDamage(damage);
        console.log(`${this.player.name} attacks ${target.name} for ${damage} damage!`);
    }

    castSpell(spell, target) {
        const spellDamage = spell.damage();
        target.takeDamage(spellDamage);
        console.log(`${this.player.name} casts ${spell.name} on ${target.name} for ${spellDamage} damage!`);
    }

    useSkill(skill, target) {
        skill.activate(target);
        console.log(`${this.player.name} uses ${skill.name} on ${target.name}.`);
    }

    ritual(ritual) {
        if (this.player.mana >= ritual.manaCost) {
            ritual.perform(this.player);
            console.log(`${this.player.name} performs the ritual: ${ritual.name}.`);
        } else {
            console.log(`${this.player.name} does not have enough mana to perform the ritual: ${ritual.name}.`);
        }
    }

    defend() {
        this.player.defense = true;
        console.log(`${this.player.name} is defending this turn.`);
    }

    enemyTurn() {
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                const target = this.player; // Simple AI targeting the player
                const damage = enemy.attack();
                target.takeDamage(damage);
                console.log(`${enemy.name} attacks ${target.name} for ${damage} damage!`);
            }
        });
    }
}

class Player {
    constructor(name, health, mana) {
        this.name = name;
        this.health = health;
        this.mana = mana;
        this.defense = false;
    }

    attack() {
        // Implement attack logic here (e.g., damage calculation)
        return Math.floor(Math.random() * 10) + 1; // Example damage calculation
    }

    takeDamage(damage) {
        if (this.defense) {
            damage = Math.floor(damage / 2); // Defense reduces damage by half
        }
        this.health -= damage;
        console.log(`${this.name} has ${this.health} health remaining.`);
    }
}

class Enemy {
    constructor(name, health) {
        this.name = name;
        this.health = health;
        this.alive = true;
    }

    attack() {
        // Implement attack logic here (e.g., damage calculation)
        return Math.floor(Math.random() * 8) + 1; // Example damage calculation
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
            console.log(`${this.name} has been defeated!`);
        }
    }
}

// Example usage
const player = new Player('Hero', 100, 50);
const enemies = [new Enemy('Goblin', 30), new Enemy('Orc', 50)];
const combat = new CombatSystem(player, enemies);