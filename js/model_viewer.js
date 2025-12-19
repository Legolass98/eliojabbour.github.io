/**
 * [MODULE: 3D MODEL VIEWER]
 * Updated with robust error reporting.
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

        // 2. Camera
        const aspect = container.clientWidth / container.clientHeight;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(2, 2, 4); 

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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const rimLight = new THREE.SpotLight(0x00f2ff, 5);
        rimLight.position.set(-5, 0, -5);
        scene.add(rimLight);

        // 6. Grid Helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x00f2ff, 0x2d5b6e);
        gridHelper.position.y = -0.5; 
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
        if(loadingText) {
            loadingText.style.display = 'block';
            loadingText.innerText = "LOADING: " + path;
            loadingText.style.color = "var(--primary)";
        }

        // Remove old model if exists
        if (currentModel) {
            scene.remove(currentModel);
            currentModel = null;
        }

        console.log("Attempting to load model from:", path);

        // Load new model
        loader.load(
            path,
            (gltf) => {
                currentModel = gltf.scene;
                
                // Auto-center and scale
                const box = new THREE.Box3().setFromObject(currentModel);
                const size = box.getSize(new THREE.Vector3());
                
                // Center
                const center = box.getCenter(new THREE.Vector3());
                currentModel.position.x += (currentModel.position.x - center.x);
                currentModel.position.y += (currentModel.position.y - center.y);
                currentModel.position.z += (currentModel.position.z - center.z);
                
                // Scale (Fit into a 2x2x2 box approx)
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2.5 / maxDim; 
                currentModel.scale.set(scale, scale, scale);

                scene.add(currentModel);
                
                if(loadingText) loadingText.style.display = 'none';
                controls.reset();
            },
            (xhr) => {
                // Progress
                if(loadingText) loadingText.innerText = Math.round(xhr.loaded / xhr.total * 100) + '%';
            },
            (error) => {
                console.error('Detailed Model Error:', error);
                
                let errorMsg = "ERROR LOADING MODEL";
                
                // Try to detect the type of error for the user
                if(error.target && error.target.status) {
                    if(error.target.status === 404) errorMsg = "FILE NOT FOUND (404)";
                    else errorMsg = `HTTP ERROR ${error.target.status}`;
                } else if(error instanceof SyntaxError) {
                    errorMsg = "FILE CORRUPTED (GIT LFS/TEXT ISSUE)";
                }

                if(loadingText) {
                    loadingText.innerText = errorMsg + "\nCheck Console for Path";
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