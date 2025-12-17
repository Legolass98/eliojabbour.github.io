/**
 * [MODULE: 3D MODEL VIEWER]
 * Handles loading GLB/GLTF files using Three.js.
 * Features: Orbit controls, lighting setup, and responsive canvas.
 */

const modelViewer = (function() {
    
    // Core Three.js variables
    let scene, camera, renderer, controls, loader;
    let animationId;
    let currentModel = null;
    let isInitialized = false;

    const containerId = 'three-container';

    // Initialize the scene (Run once)
    function init() {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 1. Scene
        scene = new THREE.Scene();
        // scene.background = new THREE.Color(0x0b1015); // Use CSS bg instead for transparency if needed

        // 2. Camera
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(2, 2, 4); // Initial View Position

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // 4. Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true; // Nice portfolio touch
        controls.autoRotateSpeed = 1.0;

        // 5. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        // Optional: Blue/Cyber Rim Light
        const rimLight = new THREE.SpotLight(0x00f2ff, 5);
        rimLight.position.set(-5, 0, -5);
        scene.add(rimLight);

        // 6. Grid Helper (Cyber aesthetic)
        const gridHelper = new THREE.GridHelper(20, 20, 0x00f2ff, 0x2d5b6e);
        gridHelper.position.y = -0.5; // Lower slightly
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        // 7. Loader
        loader = new THREE.GLTFLoader();

        // 8. Handle Resize
        window.addEventListener('resize', onWindowResize, false);

        isInitialized = true;
        animate();
    }

    function onWindowResize() {
        if(!camera || !renderer) return;
        const container = document.getElementById(containerId);
        if (!container) return;
        
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        if(controls) controls.update();
        if(renderer && scene && camera) renderer.render(scene, camera);
    }

    // Public: Load a specific model
    function loadModel(path) {
        if (!isInitialized) init();

        const loadingText = document.getElementById('loading-text');
        if(loadingText) loadingText.style.display = 'block';

        // Remove old model if exists
        if (currentModel) {
            scene.remove(currentModel);
            currentModel = null;
        }

        // Load new model
        loader.load(
            path,
            (gltf) => {
                currentModel = gltf.scene;
                
                // Auto-center and scale
                const box = new THREE.Box3().setFromObject(currentModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Reset Position to center
                currentModel.position.x += (currentModel.position.x - center.x);
                currentModel.position.y += (currentModel.position.y - center.y);
                currentModel.position.z += (currentModel.position.z - center.z);
                
                // Scale to fit nicely
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim; 
                currentModel.scale.set(scale, scale, scale);

                scene.add(currentModel);
                
                if(loadingText) loadingText.style.display = 'none';
                controls.reset();
            },
            (xhr) => {
                // Progress (optional)
                // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened loading the model:', error);
                if(loadingText) loadingText.innerText = "ERROR LOADING MODEL";
            }
        );
    }

    function resize() {
        setTimeout(onWindowResize, 50);
    }

    return {
        load: loadModel,
        resize: resize
    };

})();