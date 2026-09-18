import * as THREE from 'https://esm.sh/three@0.180.0';

import { OrbitControls }
    from 'https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js';

import { GLTFLoader }
    from 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';



// ========================================
// 1. ELEMENTO HTML ONDE O MODELO APARECE
// ========================================

const container = document.getElementById('model-3d');


// ========================================
// 2. CRIA A CENA
// ========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x192841);


// ========================================
// 3. CRIA A CÂMERA
// ========================================

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    10000
);

camera.position.set(0, 100, 170);


// ========================================
// 4. CRIA O RENDERIZADOR
// ========================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    container.clientWidth,
    container.clientHeight
);

renderer.setPixelRatio(window.devicePixelRatio);

container.appendChild(renderer.domElement);


// ========================================
// 5. ILUMINAÇÃO
// ========================================

// Luz ambiente
const ambientLight = new THREE.AmbientLight(
    0x48a2da,
    4
);

scene.add(ambientLight);


// Luz direcional
const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    3
);

directionalLight.position.set(5, 5, 5);

scene.add(directionalLight);


// ========================================
// 6. CONTROLES DO MODELO
// ========================================

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.05;

controls.enableZoom = true;

controls.enablePan = true;


// ========================================
// 7. CARREGAR O MODELO .GLB
// ======================================


let model;
const loader = new GLTFLoader();
loader.load(

    '/models/modelRegister.glb',

    function (gltf) {

        model = gltf.scene;
        scene.add(model);

        const box = new THREE.Box3().setFromObject(model);

        const size = box.getSize(
            new THREE.Vector3()
        );

        const center = box.getCenter(
            new THREE.Vector3()
        );

        model.position.sub(center);

        const maxSize = Math.max(
            size.x,
            size.y,
            size.z
        );

        camera.position.set(
            0,
            maxSize * 0.5,
            maxSize * 2
        );

        camera.far = maxSize * 20;
        camera.updateProjectionMatrix();

        controls.target.set(
            0,
            0,
            0
        );

        controls.update();

        console.log("Tamanho:", size);

        positionRegisterModel();

        // NOVO: sombra suave projetada no chão (depende do tamanho do modelo)
        createContactShadow(maxSize, box.min.y - center.y);
    },

    function (progress) {

        console.log(
            'Carregando modelo:',
            (progress.loaded / progress.total * 100).toFixed(2),
            '%'
        );

    },

    function (error) {

        console.error(
            'Erro ao carregar o modelo:',
            error
        );

    }
);


// ========================================
// 8. REDIMENSIONAMENTO DA TELA
// ========================================

window.addEventListener('resize', function () {

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;

    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

});

// ========================================
// 9. TROCA DE TEMA 
// ========================================

const THEME_STORAGE_KEY = "app-theme";

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

// Aplica o tema salvo assim que a página carrega
// (ou deixa o CSS decidir pela preferência do SO, se nada foi salvo ainda)
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
if (savedTheme === "light" || savedTheme === "dark") {
    applyTheme(savedTheme);
}

// Função que efetivamente alterna o tema — é ela que precisa ser CHAMADA,
// e não apenas declarada, para a troca acontecer.
function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme")
        || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
}

// Mantém disponível globalmente, caso algum botão no HTML também
// queira chamar onclick="toggleTheme()"
window.toggleTheme = toggleTheme;

//============

//Carregamento da cor salva no localStorage
function getCurrentTheme() {
    let tema = document.documentElement.getAttribute("data-theme")
        || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    return tema
}

function positionRegisterModel() {
    if (!model) return;

    const bulbMesh = model.getObjectByName("Line01_1");
    if (!bulbMesh) return;

    const worldPos = new THREE.Vector3();
    bulbMesh.getWorldPosition(worldPos);
}

// ========================================
// SOMBRA SUAVE NO CHÃO (contact shadow fake)
// ========================================

let contactShadowMesh;

function createShadowTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

// minY = ponto mais baixo do modelo relativo ao centro (box.min.y - center.y)
function createContactShadow(maxSize, minY) {
    const shadowTexture = createShadowTexture();

    const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
    });

    const shadowSize = maxSize * 1.6; // ajuste a área da sombra aqui
    const shadowGeometry = new THREE.PlaneGeometry(shadowSize, shadowSize);
    contactShadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);

    contactShadowMesh.rotation.x = -Math.PI / 2; // deitar no chão
    contactShadowMesh.position.y = minY + 0.05;  // um pouco acima da base, evita z-fighting

    scene.add(contactShadowMesh);
}


// ========================================
// 11. LOOP DE RENDERIZAÇÃO
// ========================================

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    if (model) {
        model.rotation.y += 0.001;

        // mantém glow e sombra acompanhando a rotação/posição da lâmpada
        positionRegisterModel();

    }

    renderer.render(
        scene,
        camera
    );
}

animate();