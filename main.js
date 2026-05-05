import * as THREE from 'three';

// ========== CONFIGURAÇÃO ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a2a);
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 6, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== LUZES ==========
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
mainLight.position.set(5, 12, 4);
mainLight.castShadow = true;
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x4466cc, 0.4);
fillLight.position.set(-3, 5, -4);
scene.add(fillLight);

// ========== CHÃO ==========
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.8 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);

// Grade de referência
const gridHelper = new THREE.GridHelper(20, 20, 0x88aa88, 0x446644);
gridHelper.position.y = -0.45;
scene.add(gridHelper);

// ========== PAREDES DO LABIRINTO ==========
const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });

// Array de paredes: { x, z, width, depth }
const wallsData = [
    // Bordas externas
    { x: 0, z: -7, width: 14, depth: 0.3 },
    { x: 0, z: 7, width: 14, depth: 0.3 },
    { x: -7, z: 0, width: 0.3, depth: 14 },
    { x: 7, z: 0, width: 0.3, depth: 14 },
    // Paredes internas
    { x: -3, z: -3, width: 0.3, depth: 4 },
    { x: 3, z: -2, width: 0.3, depth: 4 },
    { x: -2, z: 3, width: 5, depth: 0.3 },
    { x: 2, z: 0, width: 5, depth: 0.3 },
    { x: -4, z: 1, width: 0.3, depth: 3 },
    { x: 4, z: 1, width: 0.3, depth: 3 }
];

const walls = [];
wallsData.forEach(data => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(data.width, 1, data.depth), wallMat);
    wall.position.set(data.x, 0.5, data.z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    walls.push({
        mesh: wall,
        x: data.x,
        z: data.z,
        sizeX: data.width / 2,
        sizeZ: data.depth / 2
    });
});

// ========== BOTÕES ==========
const buttonMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x330000 });
const buttonLightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });

const buttons = [
    { x: -4, z: -3, id: 0, pressed: false, mesh: null, light: null },
    { x: 4, z: 3, id: 1, pressed: false, mesh: null, light: null }
];

buttons.forEach(btn => {
    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x666666 }));
    base.position.set(btn.x, 0.05, btn.z);
    base.castShadow = true;
    scene.add(base);
    
    // Botão
    btn.mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 16), buttonMat.clone());
    btn.mesh.position.set(btn.x, 0.15, btn.z);
    btn.mesh.castShadow = true;
    scene.add(btn.mesh);
    
    // Luz
    btn.light = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 16, 32), buttonLightMat.clone());
    btn.light.position.set(btn.x, 0.08, btn.z);
    btn.light.rotation.x = Math.PI / 2;
    scene.add(btn.light);
});

// ========== PORTAS ==========
const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const doors = [
    { x: -1.5, z: 0, buttonId: 0, isOpen: false, mesh: null, size: 0.4 },
    { x: 1.5, z: 0, buttonId: 1, isOpen: false, mesh: null, size: 0.4 }
];

doors.forEach(door => {
    door.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), doorMat);
    door.mesh.position.set(door.x, 0.75, door.z);
    door.mesh.castShadow = true;
    scene.add(door.mesh);
});

// ========== PORTAL DE SAÍDA ==========
const exitPortal = {
    x: 0,
    z: -5,
    active: false,
    mesh: null,
    ring: null
};

const portalBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x4a90e2, emissive: 0x004466 }));
portalBase.position.set(exitPortal.x, 0.05, exitPortal.z);
scene.add(portalBase);

exitPortal.ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 16, 48), new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x004466 }));
exitPortal.ring.position.set(exitPortal.x, 0.5, exitPortal.z);
exitPortal.ring.rotation.x = Math.PI / 2;
scene.add(exitPortal.ring);

// ========== JOGADOR ==========
const playerGroup = new THREE.Group();

// Corpo
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), bodyMat);
body.castShadow = true;
body.position.y = 0.4;
playerGroup.add(body);

// Cabeça
const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), headMat);
head.position.y = 0.85;
head.castShadow = true;
playerGroup.add(head);

// Olhos
const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeMat);
leftEye.position.set(-0.15, 0.95, 0.42);
const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), eyeMat);
rightEye.position.set(0.15, 0.95, 0.42);
playerGroup.add(leftEye, rightEye);

// Pupilas
const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), pupilMat);
leftPupil.position.set(-0.15, 0.93, 0.5);
const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), pupilMat);
rightPupil.position.set(0.15, 0.93, 0.5);
playerGroup.add(leftPupil, rightPupil);

playerGroup.position.set(0, 0, 4);
scene.add(playerGroup);

// Luz do jogador
const playerLight = new THREE.PointLight(0xff8844, 0.5, 8);
playerLight.castShadow = true;
playerGroup.add(playerLight);

// ========== ESTADO DO JOGO ==========
let objectivesCompleted = 0;
const totalObjectives = buttons.length;
let gameRunning = true;
let levelComplete = false;
let level = 1;

// Atualizar UI
function updateUI() {
    document.getElementById('objective-counter').innerHTML = `${objectivesCompleted}/${totalObjectives}`;
    document.getElementById('level-display').innerHTML = level;
    
    const healthPercent = (objectivesCompleted / totalObjectives) * 100;
    document.getElementById('player-health-fill').style.width = `${healthPercent}%`;
    
    if (objectivesCompleted === totalObjectives) {
        document.getElementById('objective-text').innerHTML = "✅ Vá até o PORTAL AZUL! ✅";
        // Ativar portal
        exitPortal.ring.material.color.setHex(0x44ff44);
        exitPortal.ring.material.emissiveIntensity = 0.5;
        exitPortal.active = true;
    }
}

function showMessage(msg) {
    const messageArea = document.getElementById('message-area');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'game-message';
    msgDiv.textContent = msg;
    messageArea.innerHTML = '';
    messageArea.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
}

// ========== CONTROLES - VERSÃO TESTADA ==========
// Usando window.event e keyCode para compatibilidade máxima
const keysPressed = {};

document.addEventListener('keydown', function(event) {
    const key = event.key;
    console.log('Tecla pressionada:', key); // Debug no console
    
    // Mapear teclas
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        event.preventDefault();
        keysPressed[key] = true;
    }
    if (key === 'w' || key === 'W') {
        event.preventDefault();
        keysPressed['ArrowUp'] = true;
    }
    if (key === 's' || key === 'S') {
        event.preventDefault();
        keysPressed['ArrowDown'] = true;
    }
    if (key === 'a' || key === 'A') {
        event.preventDefault();
        keysPressed['ArrowLeft'] = true;
    }
    if (key === 'd' || key === 'D') {
        event.preventDefault();
        keysPressed['ArrowRight'] = true;
    }
    if (key === 'r' || key === 'R') {
        event.preventDefault();
        resetLevel();
    }
});

document.addEventListener('keyup', function(event) {
    const key = event.key;
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        keysPressed[key] = false;
    }
    if (key === 'w' || key === 'W') keysPressed['ArrowUp'] = false;
    if (key === 's' || key === 'S') keysPressed['ArrowDown'] = false;
    if (key === 'a' || key === 'A') keysPressed['ArrowLeft'] = false;
    if (key === 'd' || key === 'D') keysPressed['ArrowRight'] = false;
});

// Verificar se está se movendo
function isMoving() {
    return keysPressed['ArrowUp'] || keysPressed['ArrowDown'] || 
           keysPressed['ArrowLeft'] || keysPressed['ArrowRight'];
}

// ========== MOVIMENTO DO JOGADOR ==========
function updateMovement(delta) {
    let moveX = 0, moveZ = 0;
    
    if (keysPressed['ArrowUp']) moveZ -= 1;
    if (keysPressed['ArrowDown']) moveZ += 1;
    if (keysPressed['ArrowLeft']) moveX -= 1;
    if (keysPressed['ArrowRight']) moveX += 1;
    
    if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        moveX /= len;
        moveZ /= len;
    }
    
    const speed = 5;
    let newX = playerGroup.position.x + moveX * speed * delta;
    let newZ = playerGroup.position.z + moveZ * speed * delta;
    
    const playerSize = 0.35;
    
    // Colisão com paredes
    let canMoveX = true, canMoveZ = true;
    
    for (let wall of walls) {
        // Colisão X
        if (Math.abs(newX - wall.x) < playerSize + wall.sizeX && 
            Math.abs(playerGroup.position.z - wall.z) < playerSize + wall.sizeZ) {
            canMoveX = false;
        }
        // Colisão Z
        if (Math.abs(playerGroup.position.x - wall.x) < playerSize + wall.sizeX && 
            Math.abs(newZ - wall.z) < playerSize + wall.sizeZ) {
            canMoveZ = false;
        }
    }
    
    // Colisão com portas fechadas
    for (let door of doors) {
        if (!door.isOpen) {
            if (Math.abs(newX - door.x) < playerSize + 0.4 && 
                Math.abs(playerGroup.position.z - door.z) < playerSize + 0.4) {
                canMoveX = false;
            }
            if (Math.abs(playerGroup.position.x - door.x) < playerSize + 0.4 && 
                Math.abs(newZ - door.z) < playerSize + 0.4) {
                canMoveZ = false;
            }
        }
    }
    
    if (canMoveX) playerGroup.position.x = newX;
    if (canMoveZ) playerGroup.position.z = newZ;
    
    // Rotação
    if (moveX !== 0 || moveZ !== 0) {
        const angle = Math.atan2(moveX, moveZ);
        playerGroup.rotation.y = angle;
    }
    
    // Verificar botões
    for (let btn of buttons) {
        if (!btn.pressed) {
            const dist = Math.hypot(playerGroup.position.x - btn.x, playerGroup.position.z - btn.z);
            if (dist < 0.8) {
                btn.pressed = true;
                btn.mesh.position.y = 0.08;
                btn.mesh.material.color.setHex(0x44ff44);
                btn.light.material.color.setHex(0x44ff44);
                objectivesCompleted++;
                updateUI();
                showMessage(`🔘 Botão ${btn.id + 1} ativado!`);
                
                // Abrir porta correspondente
                for (let door of doors) {
                    if (door.buttonId === btn.id) {
                        door.isOpen = true;
                        // Animação da porta subindo
                        let progress = 0;
                        const startY = door.mesh.position.y;
                        const animateDoor = () => {
                            progress += 0.1;
                            door.mesh.position.y = startY + progress * 1.5;
                            if (progress < 1) requestAnimationFrame(animateDoor);
                        };
                        animateDoor();
                    }
                }
            }
        }
    }
    
    // Verificar portal de saída
    if (exitPortal.active && !levelComplete) {
        const dist = Math.hypot(playerGroup.position.x - exitPortal.x, playerGroup.position.z - exitPortal.z);
        if (dist < 0.8) {
            levelComplete = true;
            gameRunning = false;
            showMessage(`🎉 NÍVEL ${level} COMPLETO! 🎉`);
            
            // Confetes
            for (let i = 0; i < 30; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * window.innerWidth + 'px';
                confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 2000);
            }
            
            setTimeout(() => {
                level++;
                if (level > 3) {
                    showMessage("🏆 PARABÉNS! VOCÊ COMPLETOU TODOS OS NÍVEIS! 🏆");
                } else {
                    resetLevel();
                }
            }, 3000);
        }
    }
}

// ========== RESETAR NÍVEL ==========
function resetLevel() {
    gameRunning = true;
    levelComplete = false;
    objectivesCompleted = 0;
    exitPortal.active = false;
    exitPortal.ring.material.color.setHex(0x00aaff);
    exitPortal.ring.material.emissiveIntensity = 0;
    
    // Resetar botões
    buttons.forEach(btn => {
        btn.pressed = false;
        btn.mesh.position.y = 0.15;
        btn.mesh.material.color.setHex(0xff4444);
        btn.light.material.color.setHex(0xff0000);
    });
    
    // Resetar portas
    doors.forEach(door => {
        door.isOpen = false;
        door.mesh.position.y = 0.75;
    });
    
    // Resetar posição do jogador
    playerGroup.position.set(0, 0, 4);
    playerGroup.rotation.y = 0;
    
    updateUI();
    showMessage(`🔄 Nível ${level} reiniciado!`);
}

// ========== CÂMERA ==========
function updateCamera() {
    const targetPos = new THREE.Vector3(
        playerGroup.position.x,
        playerGroup.position.y + 4,
        playerGroup.position.z + 7
    );
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(playerGroup.position);
}

// ========== CRONOMETRO ==========
let gameTime = 0;
setInterval(() => {
    if (gameRunning && !levelComplete) {
        gameTime++;
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        document.getElementById('timer-display').innerHTML = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}, 1000);

// ========== LOOP PRINCIPAL ==========
let lastTime = performance.now() / 1000;

function animate() {
    const now = performance.now() / 1000;
    let delta = Math.min(0.033, now - lastTime);
    if (delta <= 0) { lastTime = now; requestAnimationFrame(animate); return; }
    lastTime = now;
    
    if (gameRunning && !levelComplete) {
        updateMovement(delta);
        updateCamera();
    }
    
    // Girar anel do portal
    if (exitPortal.ring) {
        exitPortal.ring.rotation.z += 0.02;
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ========== INICIALIZAR ==========
function init() {
    updateUI();
    showMessage("🔓 Use WASD ou SETAS para se mover! Ative os botões vermelhos!");
    
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('ui').style.display = 'block';
    }, 1000);
    
    document.getElementById('reset-btn').addEventListener('click', () => resetLevel());
    
    animate();
    
    console.log('🎮 Jogo iniciado! Pressione WASD ou as setas do teclado!');
    console.log('Teclas detectadas:', keysPressed);
}

init();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
