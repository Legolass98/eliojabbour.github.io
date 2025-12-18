/**
 * [MODULE: 3D MODEL VIEWER]
 * Updated with FIXED "Fit-To-Screen" math.
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
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000); // Increased far plane
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
        gridHelper.position.y = -2; 
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

    // --- MATH FIX: Smart Camera Fitting ---
    function fitCameraToObject(object) {
        const box = new THREE.Box3().setFromObject(object);
        
        if (box.isEmpty()) {
            console.warn("Model has no geometry bounds. Camera unchanged.");
            return;
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Get the max dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Convert FOV to radians
        const fov = camera.fov * (Math.PI / 180);
        
        // Calculate distance: (ObjectSize / 2) / tan(FOV / 2)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        // Add a safety buffer (1.5x zoom out)
        cameraZ *= 1.5;

        // Safety fallback if calculation fails
        if (!cameraZ || cameraZ === Infinity) cameraZ = 5;

        // Position camera along a diagonal vector
        const direction = new THREE.Vector3(1, 1, 1).normalize(); 
        const position = direction.multiplyScalar(cameraZ).add(center);
        
        camera.position.copy(position);
        camera.lookAt(center);
        
        // Update clipping planes to ensure model isn't cut off
        camera.near = maxDim / 100;
        camera.far = maxDim * 100;
        camera.updateProjectionMatrix();
        
        // Center the orbit controls
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
                
                // FIT CAMERA
                try {
                    fitCameraToObject(currentModel);
                } catch (e) {
                    console.error("Camera Fit Error:", e);
                }
                
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