/**
 * WeaponSystem 单元测试
 */

import { createWorld, generateId, addComponent } from '../../src/engine/world';
import { WeaponSystem } from '../../src/engine/systems/WeaponSystem';
import { Transform, Weapon, FireIntent, PlayerTag, EnemyTag, Bullet } from '../../src/engine/components';
import { WeaponId, AmmoType, WeaponPattern, EnemyWeaponId, EnemyId } from '../../src/engine/types';

describe('WeaponSystem', () => {
    let world: ReturnType<typeof createWorld>;

    beforeEach(() => {
        world = createWorld();
        world.width = 800;
        world.height = 600;
        world.playerId = 1;
    });

    describe('基础开火', () => {
        it('应该为有 FireIntent 的玩家实体生成子弹', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 200,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            const beforeBulletCount = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterBulletCount = world.events.filter(e => e.type === 'WeaponFired').length;

            expect(afterBulletCount).toBeGreaterThan(beforeBulletCount);
        });

        it('应该遵循武器冷却时间', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            const weapon = new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 200,
                curCD: 150, // 冷却中
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            });
            addComponent(world, playerId, weapon);
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            // 冷却中不应该开火
            expect(afterEvents).toBe(beforeEvents);
            expect(weapon.curCD).toBeLessThan(150); // 冷却应该减少
        });

        it('应该消耗 FireIntent（一帧一用）', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 200,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            WeaponSystem(world, 0.016);

            // FireIntent 应该被移除
            const comps = world.entities.get(playerId);
            const hasFireIntent = comps?.some(FireIntent.check);
            expect(hasFireIntent).toBe(false);
        });
    });

    describe('弹幕模式', () => {
        it('SPREAD 模式应该发射扇形弹幕', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 5,
                spread: 30, // 30度扩散
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            // 应该产生一次 WeaponFired 事件
            expect(afterEvents - beforeEvents).toBe(1);
        });

        it('RADIAL 模式应该发射径向弹幕', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 300 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.WAVE,
                ammoType: AmmoType.WAVE_PULSE,
                cooldown: 100,
                bulletCount: 8,
                pattern: WeaponPattern.RADIAL
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            expect(afterEvents - beforeEvents).toBe(1);
        });

        it('SPIRAL 模式应该发射螺旋弹幕', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 300 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.LASER,
                ammoType: AmmoType.LASER_BEAM,
                cooldown: 100,
                bulletCount: 4,
                spread: 15,
                pattern: WeaponPattern.SPIRAL
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            expect(afterEvents - beforeEvents).toBe(1);
        });

        it('RANDOM 模式应该发射随机角度弹幕', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.MISSILE,
                ammoType: AmmoType.MISSILE_HOMING,
                cooldown: 100,
                bulletCount: 3,
                spread: 45,
                pattern: WeaponPattern.RANDOM
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            expect(afterEvents - beforeEvents).toBe(1);
        });
    });

    describe('敌人武器', () => {
        it('敌人实体应该能够向下发射', () => {
            const enemyId = generateId();

            world.entities.set(enemyId, []);
            addComponent(world, enemyId, new Transform({ x: 400, y: 100 }));
            addComponent(world, enemyId, new Weapon({
                id: EnemyWeaponId.ENEMY_NORMAL,
                ammoType: AmmoType.ENEMY_ORB_RED,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, enemyId, new EnemyTag({ id: EnemyId.NORMAL }));
            addComponent(world, enemyId, new FireIntent({ firing: true }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            expect(afterEvents - beforeEvents).toBe(1);
        });
    });

    describe('事件生成', () => {
        it('应该生成 WeaponFired 事件', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            WeaponSystem(world, 0.016);

            const firedEvents = world.events.filter(e => e.type === 'WeaponFired');
            expect(firedEvents.length).toBeGreaterThan(0);
            expect(firedEvents[0]).toMatchObject({
                type: 'WeaponFired',
                weaponId: WeaponId.VULCAN,
                owner: playerId
            });
        });
    });

    describe('冷却处理', () => {
        it('开火后应该重置冷却时间', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            const weapon = new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 200,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT,
                fireRateMultiplier: 1.5
            });
            addComponent(world, playerId, weapon);
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            WeaponSystem(world, 0.016);

            // 冷却应该被重置为 cooldown / fireRateMultiplier
            expect(weapon.curCD).toBeCloseTo(200 / 1.5, 1);
        });
    });

    describe('发射偏移 (fireOffset)', () => {
        it('有 fireOffset 时子弹应该从偏移位置生成', () => {
            const playerId = generateId();
            const playerX = 400;
            const playerY = 500;
            const offsetY = -24;  // 向上偏移 24 像素

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: playerX, y: playerY }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT,
                fireOffset: { x: 0, y: offsetY }
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({ firing: true }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; transform: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const transform = comps.find(Transform.check);
                const bullet = comps.find(Bullet.check);
                if (transform && bullet) {
                    bullets.push({ id, transform });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // 子弹应该从偏移后的位置生成
            expect(bullets[0].transform.x).toBe(playerX);
            expect(bullets[0].transform.y).toBe(playerY + offsetY);
        });

        it('没有 fireOffset 时子弹应该从中心位置生成', () => {
            const enemyId = generateId();
            const enemyX = 400;
            const enemyY = 100;

            world.entities.set(enemyId, []);
            addComponent(world, enemyId, new Transform({ x: enemyX, y: enemyY }));
            addComponent(world, enemyId, new Weapon({
                id: EnemyWeaponId.ENEMY_NORMAL,
                ammoType: AmmoType.ENEMY_ORB_RED,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
                // 没有 fireOffset
            }));
            addComponent(world, enemyId, new EnemyTag({ id: EnemyId.NORMAL }));
            addComponent(world, enemyId, new FireIntent({ firing: true }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; transform: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const transform = comps.find(Transform.check);
                const bullet = comps.find(Bullet.check);
                if (transform && bullet) {
                    bullets.push({ id, transform });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // 子弹应该从中心位置生成
            expect(bullets[0].transform.x).toBe(enemyX);
            expect(bullets[0].transform.y).toBe(enemyY);
        });
    });

    describe('子弹精灵图旋转方向', () => {
        /**
         * 精灵图旋转角度计算公式：
         * rotate = (angle + Math.PI / 2) * 180 / Math.PI
         *
         * 精灵图默认朝上（0°旋转时朝上）
         *
         * 验证：
         *   - 向上发射 (angle = -π/2): rotate = (-π/2 + π/2) * 180/π = 0°
         *   - 向下发射 (angle = π/2):  rotate = (π/2 + π/2) * 180/π = 180°
         *   - 向右发射 (angle = 0):     rotate = (0 + π/2) * 180/π = 90°
         *   - 向左发射 (angle = π):     rotate = (π + π/2) * 180/π = 270°
         */

        it('向上发射时，精灵图旋转角度应为 0°', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            // 向上发射，angle = -Math.PI / 2
            addComponent(world, playerId, new FireIntent({
                firing: true,
                angle: -Math.PI / 2
            }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; sprite: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const sprite = comps.find(c => c.constructor.name === 'Sprite');
                const bullet = comps.find(Bullet.check);
                if (sprite && bullet) {
                    bullets.push({ id, sprite });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // 向上发射时，精灵图旋转 0°
            expect(bullets[0].sprite.rotate).toBeCloseTo(0, 1);
        });

        it('向下发射时，精灵图旋转角度应为 180°', () => {
            const enemyId = generateId();

            world.entities.set(enemyId, []);
            addComponent(world, enemyId, new Transform({ x: 400, y: 100 }));
            addComponent(world, enemyId, new Weapon({
                id: EnemyWeaponId.ENEMY_NORMAL,
                ammoType: AmmoType.ENEMY_ORB_RED,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, enemyId, new EnemyTag({ id: EnemyId.NORMAL }));
            // 向下发射，angle = Math.PI / 2
            addComponent(world, enemyId, new FireIntent({
                firing: true,
                angle: Math.PI / 2
            }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; sprite: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const sprite = comps.find(c => c.constructor.name === 'Sprite');
                const bullet = comps.find(Bullet.check);
                if (sprite && bullet) {
                    bullets.push({ id, sprite });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // 向下发射时，精灵图旋转 180°
            expect(bullets[0].sprite.rotate).toBeCloseTo(180, 1);
        });

        it('向右发射时，精灵图旋转角度应为 90°', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 300 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            // 向右发射，angle = 0
            addComponent(world, playerId, new FireIntent({
                firing: true,
                angle: 0
            }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; sprite: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const sprite = comps.find(c => c.constructor.name === 'Sprite');
                const bullet = comps.find(Bullet.check);
                if (sprite && bullet) {
                    bullets.push({ id, sprite });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // 向右发射时，精灵图旋转 90°
            expect(bullets[0].sprite.rotate).toBeCloseTo(90, 1);
        });

        it('向左发射时，精灵图旋转角度应为 270°', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 300 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            // 向左发射，angle = Math.PI
            addComponent(world, playerId, new FireIntent({
                firing: true,
                angle: Math.PI
            }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; sprite: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const sprite = comps.find(c => c.constructor.name === 'Sprite');
                const bullet = comps.find(Bullet.check);
                if (sprite && bullet) {
                    bullets.push({ id, sprite });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // 向左发射时，精灵图旋转 270°
            expect(bullets[0].sprite.rotate).toBeCloseTo(270, 1);
        });

        it('子弹的 Transform.rot 应始终为 0（不参与渲染）', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({
                firing: true,
                angle: Math.PI / 3 // 随机角度
            }));

            WeaponSystem(world, 0.016);

            // 查找生成的子弹
            const bullets: Array<{ id: number; transform: any }> = [];
            for (const [id, comps] of world.entities.entries()) {
                const transform = comps.find(Transform.check);
                const bullet = comps.find(Bullet.check);
                if (transform && bullet) {
                    bullets.push({ id, transform });
                }
            }

            expect(bullets.length).toBeGreaterThan(0);
            // Transform.rot 应为 0，旋转由 Sprite.rotate 控制
            expect(bullets[0].transform.rot).toBe(0);
        });
    });

    describe('STRAIGHT 模式', () => {
        it('应该朝固定方向发射子弹', () => {
            const playerId = generateId();

            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 400, y: 500 }));
            addComponent(world, playerId, new Weapon({
                id: WeaponId.VULCAN,
                ammoType: AmmoType.VULCAN_SPREAD,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.STRAIGHT
            }));
            addComponent(world, playerId, new PlayerTag());
            addComponent(world, playerId, new FireIntent({
                firing: true,
                angle: -Math.PI / 2 // 向上
            }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            expect(afterEvents - beforeEvents).toBe(1);
        });
    });

    describe('AIMED 模式', () => {
        it('应该朝目标方向发射', () => {
            const enemyId = generateId();
            const playerId = generateId();

            // 创建玩家实体作为目标
            world.entities.set(playerId, []);
            addComponent(world, playerId, new Transform({ x: 500, y: 300 }));

            // 创建敌人实体
            world.entities.set(enemyId, []);
            addComponent(world, enemyId, new Transform({ x: 400, y: 100 }));
            addComponent(world, enemyId, new Weapon({
                id: EnemyWeaponId.GENERIC_TARGETED,
                ammoType: AmmoType.ENEMY_ORB_RED,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.AIMED
            }));
            addComponent(world, enemyId, new EnemyTag({ id: EnemyId.NORMAL }));
            addComponent(world, enemyId, new FireIntent({
                firing: true,
                angle: -Math.PI / 2, // 默认向上，但 AIMED 应该忽略
                targetId: playerId
            }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            // 应该产生武器发射事件
            expect(afterEvents - beforeEvents).toBe(1);
        });

        it('无目标时应该降级为 STRAIGHT', () => {
            const enemyId = generateId();

            world.entities.set(enemyId, []);
            addComponent(world, enemyId, new Transform({ x: 400, y: 100 }));
            addComponent(world, enemyId, new Weapon({
                id: EnemyWeaponId.GENERIC_TARGETED,
                ammoType: AmmoType.ENEMY_ORB_RED,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.AIMED
            }));
            addComponent(world, enemyId, new EnemyTag({ id: EnemyId.NORMAL }));
            addComponent(world, enemyId, new FireIntent({
                firing: true,
                angle: -Math.PI / 2,
                // 不传 targetId
            }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            // 应该正常发射（使用 baseAngle）
            expect(afterEvents - beforeEvents).toBe(1);
        });
    });

    describe('FIXED_REAR 模式', () => {
        it('应该朝相反方向发射', () => {
            const enemyId = generateId();

            world.entities.set(enemyId, []);
            addComponent(world, enemyId, new Transform({ x: 400, y: 200 }));
            addComponent(world, enemyId, new Weapon({
                id: EnemyWeaponId.ENEMY_LAYER,
                ammoType: AmmoType.ENEMY_ORB_GREEN,
                cooldown: 100,
                bulletCount: 1,
                pattern: WeaponPattern.FIXED_REAR
            }));
            addComponent(world, enemyId, new EnemyTag({ id: EnemyId.NORMAL }));
            addComponent(world, enemyId, new FireIntent({
                firing: true,
                angle: Math.PI / 2 // 向下
            }));

            const beforeEvents = world.events.filter(e => e.type === 'WeaponFired').length;
            WeaponSystem(world, 0.016);
            const afterEvents = world.events.filter(e => e.type === 'WeaponFired').length;

            // 应该产生武器发射事件（子弹向上，反方向）
            expect(afterEvents - beforeEvents).toBe(1);
        });
    });
});
