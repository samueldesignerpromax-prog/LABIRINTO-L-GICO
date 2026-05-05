import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ========== CONFIGURAÇÃO INICIAL ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a2a);
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ========== ILUMINAÇÃO ==========
// Luz ambiente
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

// Luz direcional principal
const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
mainLight.position.set(5, 12, 4);
mainLight.castShadow = true;
mainLight.receiveShadow = true;
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 20;
mainLight.shadow.camera.left = -10;
mainLight.shadow.camera.right = 10;
mainLight.shadow.camera.top = 10;
mainLight.shadow.camera.bottom = -10;
scene.add(mainLight);

// Luz de preenchimento
const fillLight = new THREE.PointLight(0x4466cc, 0.4);
fillLight.position.set(-3, 5, -4);
scene.add(fillLight);

// Luz dinâmica do jogador
const playerLight = new THREE.PointLight(0xff8844, 0.5, 8);
playerLight.castShadow = true;
scene.add(playerLight);

// Luzes nos botões
const buttonLights = [];

// ========== VARIÁVEIS DO JOGO ==========
let player = null;
let walls = [];
let buttons = [];
let doors = [];
let boxes = [];
let exitPortal = null;
let objectives = [];
let level = 1;
let objectivesCompleted = 0;
let totalObjectives = 0;
let gameRunning = true;
let levelComplete = false;
let gameTime = 0;
let timerInterval = null;

// Controles
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if (e.code === 'KeyR') resetLevel();
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// ========== CRIAÇÃO DO JOGADOR ==========
class Player {
    constructor(x, z) {
        this.group = new THREE.Group();
        
        // Corpo
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a90e2, metalness: 0.2, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), bodyMat);
        body.castShadow = true;
        body.position.y = 0.4;
        this.group.add(body);
        
        // Cabeça
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), headMat);
        head.position.y = 0.85;
        head.castShadow = true;
        this.group.add(head);
        
        // Olhos
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeMat);
        leftEye.position.set(-0.15, 0.95, 0.42);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeMat);
        rightEye.position.set(0.15, 0.95, 0.42);
        this.group.add(leftEye, rightEye);
        
        // Pupilas
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), pupilMat);
        leftPupil.position.set(-0.15, 0.93, 0.5);
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), pupilMat);
        rightPupil.position.set(0.15, 0.93, 0.5);
        this.group.add(leftPupil, rightPupil);
        
        // Coroa (detalhe)
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 6), crownMat);
        crown.position.y = 1.1;
        this.group.add(crown);
        
        this.group.position.set(x, 0, z);
        scene.add(this.group);
        
        this.position = { x, z };
        this.size = 0.35;
        this.speed = 5;
    }
    
    update(delta) {
        let moveX = 0, moveZ = 0;
        if (keys.ArrowUp || keys.KeyW) moveZ -= 1;
        if (keys.ArrowDown || keys.KeyS) moveZ += 1;
        if (keys.ArrowLeft || keys.KeyA) moveX -= 1;
        if (keys.ArrowRight || keys.KeyD) moveX += 1;
        
        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.hypot(moveX, moveZ);
            moveX /= len;
            moveZ /= len;
        }
        
        let newX = this.group.position.x + moveX * this.speed * delta;
        let newZ = this.group.position.z + moveZ * this.speed * delta;
        
        // Colisão com paredes
        let canMoveX = true, canMoveZ = true;
        
        for (let wall of walls) {
            if (Math.abs(newX - wall.x) < this.size + wall.size && 
                Math.abs(this.group.position.z - wall.z) < this.size + wall.size) {
                canMoveX = false;
            }
            if (Math.abs(this.group.position.x - wall.x) < this.size + wall.size && 
                Math.abs(newZ - wall.z) < this.size + wall.size) {
                canMoveZ = false;
            }
        }
        
        // Colisão com portas fechadas
        for (let door of doors) {
            if (!door.isOpen) {
                if (Math.abs(newX - door.x) < this.size + door.size && 
                    Math.abs(this.group.position.z - door.z) < this.size + door.size) {
                    canMoveX = false;
                }
                if (Math.abs(this.group.position.x - door.x) < this.size + door.size && 
                    Math.abs(newZ - door.z) < this.size + door.size) {
                    canMoveZ = false;
                }
            }
        }
        
        // Colisão com caixas (empurrar)
        for (let box of boxes) {
            const boxSize = 0.4;
            if (Math.abs(newX - box.x) < this.size + boxSize && 
                Math.abs(this.group.position.z - box.z) < this.size + boxSize) {
                const pushDirX = Math.sign(newX - box.x);
                const newBoxX = box.x + pushDirX * 0.1;
                // Verificar se pode empurrar
                let canPush = true;
                for (let wall of walls) {
                    if (Math.abs(newBoxX - wall.x) < boxSize + wall.size && 
                        Math.abs(box.z - wall.z) < boxSize + wall.size) {
                        canPush = false;
                    }
                }
                if (canPush) {
                    box.x = newBoxX;
                    box.mesh.position.x = box.x;
                    canMoveX = true;
                } else {
                    canMoveX = false;
                }
            }
            if (Math.abs(this.group.position.x - box.x) < this.size + boxSize && 
                Math.abs(newZ - box.z) < this.size + boxSize) {
                const pushDirZ = Math.sign(newZ - box.z);
                const newBoxZ = box.z + pushDirZ * 0.1;
                let canPush = true;
                for (let wall of walls) {
                    if (Math.abs(box.x - wall.x) < boxSize + wall.size && 
                        Math.abs(newBoxZ - wall.z) < boxSize + wall.size) {
                        canPush = false;
                    }
                }
                if (canPush) {
                    box.z = newBoxZ;
                    box.mesh.position.z = box.z;
                    canMoveZ = true;
                } else {
                    canMoveZ = false;
                }
            }
        }
        
        if (canMoveX) this.group.position.x = newX;
        if (canMoveZ) this.group.position.z = newZ;
        
        this.position.x = this.group.position.x;
        this.position.z = this.group.position.z;
        
        // Rotação na direção do movimento
        if (moveX !== 0 || moveZ !== 0) {
            const angle = Math.atan2(moveX, moveZ);
            this.group.rotation.y = angle;
        }
        
        // Luz do jogador
        playerLight.position.copy(this.group.position);
        playerLight.position.y += 0.8;
        
        // Verificar interação com botões
        for (let button of buttons) {
            const dist = Math.hypot(this.position.x - button.x, this.position.z - button.z);
            if (dist < 0.8 && !button.isPressed) {
                button.activate();
                showMessage(`🔘 Botão ${button.id + 1} ativado!`, '#4ade80');
            }
        }
        
        // Verificar portal de saída
        if (exitPortal && !levelComplete) {
            const dist = Math.hypot(this.position.x - exitPortal.x, this.position.z - exitPortal.z);
            if (dist < 0.8 && objectivesCompleted === totalObjectives) {
                completeLevel();
            }
        }
    }
    
    getPosition() {
        return this.group.position;
    }
}

// ========== BOTÃO DE PRESSÃO ==========
class PressureButton {
    constructor(x, z, id, requiredBoxId = null) {
        this.x = x;
        this.z = z;
        this.id = id;
        this.isPressed = false;
        this.requiredBoxId = requiredBoxId;
        
        // Base do botão
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.5 });
        this.base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 16), baseMat);
        this.base.position.set(x, 0.05, z);
        this.base.castShadow = true;
        scene.add(this.base);
        
        // Parte superior (botão)
        this.buttonMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x330000 });
        this.button = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16), this.buttonMat);
        this.button.position.set(x, 0.15, z);
        this.button.castShadow = true;
        scene.add(this.button);
        
        // Luz do botão
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3 });
        this.lightRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 16, 32), lightMat);
        this.lightRing.position.set(x, 0.08, z);
        this.lightRing.rotation.x = Math.PI / 2;
        scene.add(this.lightRing);
        
        buttonLights.push(this.lightRing);
    }
    
    activate() {
        if (this.isPressed) return;
        this.isPressed = true;
        
        // Animação visual
        this.button.position.y = 0.08;
        this.buttonMat.color.setHex(0x44ff44);
        this.buttonMat.emissiveIntensity = 0.5;
        this.lightRing.material.color.setHex(0x44ff44);
        this.lightRing.material.emissiveIntensity = 0.8;
        
        // Efeito de partículas
        createParticleEffect(this.x, this.z, 0x44ff44);
        
        // Abrir portas correspondentes
        for (let door of doors) {
            if (door.buttonId === this.id) {
                door.open();
            }
        }
        
        // Atualizar objetivos
        objectivesCompleted++;
        updateObjectiveDisplay();
        
        // Verificar se todos os objetivos foram completados
        if (objectivesCompleted === totalObjectives) {
            showMessage("✨ TODOS OS BOTÕES ATIVADOS! Vá até a SAÍDA! ✨", "#ffd700");
            if (exitPortal) exitPortal.activate();
        }
    }
}

// ========== PORTA ==========
class Door {
    constructor(x, z, buttonId, rotation = 0) {
        this.x = x;
        this.z = z;
        this.buttonId = buttonId;
        this.isOpen = false;
        this.size = 0.4;
        
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, metalness: 0.3 });
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), doorMat);
        this.mesh.position.set(x, 0.75, z);
        this.mesh.rotation.y = rotation;
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        
        // Maçaneta
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
        this.handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), handleMat);
        this.handle.position.set(x + Math.sin(rotation) * 0.35, 0.85, z + Math.cos(rotation) * 0.35);
        scene.add(this.handle);
    }
    
    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        
        // Animação de abrir (deslizar para cima)
        const startY = this.mesh.position.y;
        let progress = 0;
        const animate = () => {
            progress += 0.1;
            this.mesh.position.y = startY + progress * 1.5;
            this.handle.position.y = 0.85 + progress * 1.5;
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                scene.remove(this.mesh);
                scene.remove(this.handle);
            }
        };
        animate();
        
        createParticleEffect(this.x, this.z, 0xffaa44);
    }
}

// ========== CAIXA MÓVEL ==========
class MovableBox {
    constructor(x, z, id) {
        this.x = x;
        this.z = z;
        this.id = id;
        
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.5 });
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), boxMat);
        this.mesh.position.set(x, 0.35, z);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }
}

// ========== PORTAL DE SAÍDA ==========
class ExitPortal {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.isActive = false;
        
        // Base
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a90e2, metalness: 0.8, emissive: 0x004466 });
        this.base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.1, 16), baseMat);
        this.base.position.set(x, 0.05, z);
        scene.add(this.base);
        
        // Anel flutuante
        this.ringMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.9, emissive: 0x004466 });
        this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 16, 48), this.ringMat);
        this.ring.position.set(x, 0.5, z);
        this.ring.rotation.x = Math.PI / 2;
        scene.add(this.ring);
        
        // Partículas
        this.particles = [];
        for (let i = 0; i < 30; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x0088ff })
            );
            particle.visible = false;
            scene.add(particle);
            this.particles.push(particle);
        }
    }
    
    activate() {
        this.isActive = true;
        this.ringMat.emissiveIntensity = 0.5;
        this.ringMat.color.setHex(0x44ff44);
        
        // Ativar partículas
        this.particleTime = 0;
        const animateParticles = () => {
            if (!this.isActive) return;
            this.particleTime = (this.particleTime + 0.05) % (Math.PI * 2);
            for (let i = 0; i < this.particles.length; i++) {
                const angle = (i / this.particles.length) * Math.PI * 2 + this.particleTime;
                const radius = 0.8;
                this.particles[i].position.x = this.x + Math.cos(angle) * radius;
                this.particles[i].position.z = this.z + Math.sin(angle) * radius;
                this.particles[i].position.y = 0.3 + Math.sin(angle * 3) * 0.2;
                this.particles[i].visible = true;
            }
            if (this.isActive) requestAnimationFrame(animateParticles);
        };
        animateParticles();
    }
}

// ========== NÍVEL 1 - LABIRINTO BÁSICO ==========
function loadLevel1() {
    // Limpar cena anterior
    clearLevel();
    
    // Paredes do labirinto
    const wallPositions = [
        // Bordas externas
        { x: -5, z: -5, w: 10, h: 1, d: 0.3 },
        { x: -5, z: -5, w: 0.3, h: 1, d: 10 },
        { x: 5, z: -5, w: 0.3, h: 1, d: 10 },
        { x: -5, z: 5, w: 10, h: 1, d: 0.3 },
        // Paredes internas
        { x: -2, z: -2, w: 0.3, h: 1, d: 3 },
        { x: 2, z: -1, w: 0.3, h: 1, d: 3 },
        { x: -1, z: 2, w: 4, h: 1, d: 0.3 },
        { x: 0, z: -3, w: 0.3, h: 1, d: 2 },
        { x: 3, z: 1, w: 2, h: 1, d: 0.3 },
        { x: -3, z: 1, w: 2, h: 1, d: 0.3 }
    ];
    
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });
    
    wallPositions.forEach(pos => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(pos.w, pos.h, pos.d), wallMat);
        wall.position.set(pos.x, 0.5, pos.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push({ mesh: wall, x: pos.x, z: pos.z, size: Math.max(pos.w, pos.d) / 2 });
    });
    
    // Botões
    const button1 = new PressureButton(-3, -2, 0);
    const button2 = new PressureButton(3, 2, 1);
    buttons.push(button1, button2);
    
    // Portas
    const door1 = new Door(-1, 0, 0, 0);
    const door2 = new Door(1, 0, 1, 0);
    doors.push(door1, door2);
    
    // Portal de saída
    exitPortal = new ExitPortal(0, -4);
    
    totalObjectives = buttons.length;
    objectivesCompleted = 0;
    updateObjectiveDisplay();
    
    showMessage("🔓 Ative os 2 botões vermelhos para abrir as portas!", "#ffd700");
}

// ========== NÍVEL 2 - COM CAIXAS ==========
function loadLevel2() {
    clearLevel();
    
    // Paredes
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });
    const wallPositions = [
        { x: -5, z: -5, w: 10, h: 1, d: 0.3 },
        { x: -5, z: -5, w: 0.3, h: 1, d: 10 },
        { x: 5, z: -5, w: 0.3, h: 1, d: 10 },
        { x: -5, z: 5, w: 10, h: 1, d: 0.3 },
        { x: -2, z: -1, w: 0.3, h: 1, d: 4 },
        { x: 2, z: -1, w: 0.3, h: 1, d: 4 },
        { x: 0, z: 2, w: 4, h: 1, d: 0.3 }
    ];
    
    wallPositions.forEach(pos => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(pos.w, pos.h, pos.d), wallMat);
        wall.position.set(pos.x, 0.5, pos.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push({ mesh: wall, x: pos.x, z: pos.z, size: Math.max(pos.w, pos.d) / 2 });
    });
    
    // Botão que requer caixa
    const button1 = new PressureButton(-3, 2, 0);
    const button2 = new PressureButton(3, -2, 1);
    buttons.push(button1, button2);
    
    // Caixas móveis
    const box1 = new MovableBox(-1, -2, 0);
    const box2 = new MovableBox(1, -1, 1);
    boxes.push(box1, box2);
    
    // Porta
    const door1 = new Door(0, 3, 0, 0);
    doors.push(door1);
    
    // Portal
    exitPortal = new ExitPortal(0, -4);
    
    totalObjectives = buttons.length;
    objectivesCompleted = 0;
    updateObjectiveDisplay();
    
    showMessage("📦 Empurre as caixas sobre os botões para ativá-los!", "#ffd700");
}

// ========== NÍVEL 3 - SEQUÊNCIA CORRETA ==========
function loadLevel3() {
    clearLevel();
    
    // Paredes complexas
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });
    const wallPositions = [
        { x: -6, z: -6, w: 12, h: 1, d: 0.3 },
        { x: -6, z: -6, w: 0.3, h: 1, d: 12 },
        { x: 6, z: -6, w: 0.3, h: 1, d: 12 },
        { x: -6, z: 6, w: 12, h: 1, d: 0.3 },
        { x: -3, z: -4, w: 0.3, h: 1, d: 3 },
        { x: 3, z: -4, w: 0.3, h: 1, d: 3 },
        { x: -4, z: 0, w: 3, h: 1, d: 0.3 },
        { x: 1, z: 0, w: 3, h: 1, d: 0.3 },
        { x: -2, z: 3, w: 0.3, h: 1, d: 2 },
        { x: 2, z: 3, w: 0.3, h: 1, d: 2 }
    ];
    
    wallPositions.forEach(pos => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(pos.w, pos.h, pos.d), wallMat);
        wall.position.set(pos.x, 0.5, pos.z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
        walls.push({ mesh: wall, x: pos.x, z: pos.z, size: Math.max(pos.w, pos.d) / 2 });
    });
    
    // Botões em sequência
    const button1 = new PressureButton(-4, -3, 0);
    const button2 = new PressureButton(0, -3, 1);
    const button3 = new PressureButton(4, -3, 2);
    buttons.push(button1, button2, button3);
    
    // Portas múltiplas
    const door1 = new Door(-4, 2, 0, 0);
    const door2 = new Door(0, 2, 1, 0);
    const door3 = new Door(4, 2, 2, 0);
    doors.push(door1, door2, door3);
    
    // Portal
    exitPortal = new ExitPortal(0, -5);
    
    totalObjectives = buttons.length;
    objectivesCompleted = 0;
    updateObjectiveDisplay();
    
    showMessage("🔢 Ative todos os 3 botões na sequência que quiser!", "#ffd700");
}

// ========== FUNÇÕES AUXILIARES ==========
function clearLevel() {
    // Remover paredes
    walls.forEach(w => scene.remove(w.mesh));
    walls = [];
    
    // Remover botões
    buttons.forEach(b => {
        scene.remove(b.base);
        scene.remove(b.button);
        scene.remove(b.lightRing);
    });
    buttons = [];
    
    // Remover portas
    doors.forEach(d => {
        scene.remove(d.mesh);
        scene.remove(d.handle);
    });
    doors = [];
    
    // Remover caixas
    boxes.forEach(b => scene.remove(b.mesh));
    boxes = [];
    
    // Remover portal
    if (exitPortal) {
        scene.remove(exitPortal.base);
        scene.remove(exitPortal.ring);
        exitPortal.particles.forEach(p => scene.remove(p));
    }
}

function updateObjectiveDisplay() {
    document.getElementById('objective-counter').innerHTML = `${objectivesCompleted}/${totalObjectives}`;
    if (objectivesCompleted === totalObjectives && exitPortal) {
        document.getElementById('objective-text').innerHTML = "✅ Todos os objetivos concluídos! Vá até a SAÍDA! ✅";
    }
}

function showMessage(msg, color = '#ffd700') {
    const messageArea = document.getElementById('message-area');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'game-message';
    msgDiv.textContent = msg;
    msgDiv.style.borderColor = color;
    msgDiv.style.color = color;
    messageArea.innerHTML = '';
    messageArea.appendChild(msgDiv);
    
    setTimeout(() => {
        if (msgDiv.parentNode) msgDiv.remove();
    }, 3000);
}

function createParticleEffect(x, z, color) {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 4, 4),
            new THREE.MeshStandardMaterial({ color: color, emissive: color })
        );
        particle.position.set(x, 0.3, z);
        scene.add(particle);
        
        const velX = (Math.random() - 0.5) * 2;
        const velZ = (Math.random() - 0.5) * 2;
        const velY = Math.random() * 2;
        
        let life = 0.5;
        const animate = () => {
            life -= 0.02;
            particle.position.x += velX * 0.05;
            particle.position.z += velZ * 0.05;
            particle.position.y += velY * 0.05;
            particle.scale.multiplyScalar(0.95);
            if (life <= 0) {
                scene.remove(particle);
                return;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }
}

function completeLevel() {
    if (levelComplete) return;
    levelComplete = true;
    gameRunning = false;
    
    showMessage(`🎉 NÍVEL ${level} COMPLETO! 🎉`, "#4ade80");
    
    // Efeito de confete
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 2000);
    }
    
    // Próximo nível após delay
    setTimeout(() => {
        level++;
        if (level > 3) {
            showMessage("🏆 PARABÉNS! VOCÊ COMPLETOU TODOS OS NÍVEIS! 🏆", "#ffd700");
            document.getElementById('objective-text').innerHTML = "🏆 JOGO COMPLETO! 🏆";
        } else {
            resetLevel();
        }
    }, 3000);
}

function resetLevel() {
    gameRunning = true;
    levelComplete = false;
    objectivesCompleted = 0;
    
    // Recarregar nível atual
    if (level === 1) loadLevel1();
    else if (level === 2) loadLevel2();
    else if (level === 3) loadLevel3();
    
    // Recriar jogador
    if (player) scene.remove(player.group);
    player = new Player(0, -3);
}

function updateCamera() {
    if (!player) return;
    const playerPos = player.getPosition();
    const targetPos = new THREE.Vector3(
        playerPos.x,
        playerPos.y + 4,
        playerPos.z + 6
    );
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(playerPos);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    gameTime = 0;
    timerInterval = setInterval(() => {
        if (gameRunning && !levelComplete) {
            gameTime++;
            const minutes = Math.floor(gameTime / 60);
            const seconds = gameTime % 60;
            document.getElementById('timer-display').innerHTML = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// ========== LOOP PRINCIPAL ==========
let lastTime = performance.now() / 1000;

function animate() {
    const now = performance.now() / 1000;
    let delta = Math.min(0.033, now - lastTime);
    if (delta <= 0) { lastTime = now; requestAnimationFrame(animate); return; }
    lastTime = now;
    
    if (gameRunning && player && !levelComplete) {
        player.update(delta);
        updateCamera();
    }
    
    // Animar luzes dos botões
    const time = Date.now() * 0.003;
    buttonLights.forEach((light, i) => {
        if (light.material) {
            light.material.emissiveIntensity = 0.3 + Math.sin(time * 2 + i) * 0.2;
        }
    });
    
    // Anel do portal
    if (exitPortal && exitPortal.ring) {
        exitPortal.ring.rotation.z += 0.02;
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ========== INICIALIZAÇÃO ==========
function init() {
    // Carregar nível 1
    loadLevel1();
    
    // Criar jogador
    player = new Player(0, -3);
    
    // Iniciar timer
    startTimer();
    
    // Mostrar UI
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
    }, 1000);
    
    // Botão reiniciar
    document.getElementById('reset-btn').addEventListener('click', () => resetLevel());
    
    // Atualizar display de nível
    document.getElementById('level-display').innerHTML = level;
    
    animate();
}

// Atualizar nível no display
setInterval(() => {
    document.getElementById('level-display').innerHTML = level;
}, 100);

init();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
