/**
 * [MODULE: 3D MODEL VIEWER]
 * Updated with "Fit-To-Screen" camera logic.
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

        // 2. Camera (Initial temporary position)
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(0, 0, 10); 

        // 3. Renderer
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // 4. Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true; 
        controls.autoRotateSpeed = 1.0;

        // 5. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const rimLight = new THREE.SpotLight(0x00f2ff, 5);
        rimLight.position.set(-5, 0, -5);
        scene.add(rimLight);

        // 6. Grid Helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x00f2ff, 0x2d5b6e);
        gridHelper.position.y = -2; // Push grid down slightly
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

    // --- NEW: Smart Camera Fitting ---
    function fitCameraToObject(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Get the max side of the bounding box (width, height, or depth)
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2)); // Basic trigonometry to fit object

        // Multiplier to zoom out slightly (1.5 = tight, 3 = far)
        cameraZ *= 2.0; 

        // Update Camera Position
        const direction = new THREE.Vector3(1, 1, 1).normalize(); // View from corner
        const position = direction.multiplyScalar(cameraZ).add(center);
        
        camera.position.copy(position);
        camera.lookAt(center);
        
        // Update Controls Target to the center of the model
        controls.target.copy(center);
        controls.update();
    }

    // Public: Load a specific model
    function loadModel(path) {
        if (!isInitialized) init();

        const loadingText = document.getElementById('loading-text');
        if(loadingText) {
            loadingText.style.display = 'block';
            loadingText.innerText = "LOADING...";
            loadingText.style.color = "var(--primary)";
        }

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
                scene.add(currentModel);
                
                // --- DEBUG BOX HELPER (Optional: Helps see if box is huge) ---
                // const boxHelper = new THREE.BoxHelper(currentModel, 0xff0000);
                // scene.add(boxHelper);

                // FIT CAMERA
                fitCameraToObject(currentModel);
                
                if(loadingText) loadingText.style.display = 'none';
            },
            (xhr) => {
                if(loadingText) loadingText.innerText = Math.round(xhr.loaded / xhr.total * 100) + '%';
            },
            (error) => {
                console.error('Model Error:', error);
                if(loadingText) {
                    loadingText.innerText = "ERROR LOADING MODEL";
                    loadingText.style.color = "#ff4757";
                }
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