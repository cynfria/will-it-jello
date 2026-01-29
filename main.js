import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Remove.bg API key (get free key at https://www.remove.bg/api)
const REMOVE_BG_API_KEY = 'YOUR_API_KEY_HERE';  // Replace with actual key or leave as-is for fallback

// Global variables for object in jello
let jellyObject = null;
let objectOriginalPos = { x: 0, y: 0.5, z: 0.15 };  // Higher and more forward for visibility

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);  // Very light gray for better transparency visibility

const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 3, 6);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // High DPI support
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.useLegacyLights = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.sortObjects = true;  // Proper transparency sorting

document.getElementById('canvas-container').appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 1.0, 0);
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = false;  // Disable zooming
controls.minDistance = 3;
controls.maxDistance = 12;
controls.update();

// Lighting - multiple soft lights for smooth appearance
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3, 4, 2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;  // High quality shadows
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -8;
keyLight.shadow.bias = -0.0001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-2, 2, -2);
scene.add(fillLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const backLight = new THREE.PointLight(0xffffff, 1.2);  // Brighter
backLight.position.set(0, 0.5, -1.5);  // Behind jello
scene.add(backLight);

// Add a light INSIDE the jello position to show translucency
const innerLight = new THREE.PointLight(0xffdddd, 0.8);  // Warm glow
innerLight.position.set(0, 0.8, 0);  // Inside jello
scene.add(innerLight);

// Add light for object visibility
const objectLight = new THREE.PointLight(0xffffff, 0.8);
objectLight.position.set(0, 1, 2);  // In front and above
scene.add(objectLight);

// Add rim light to highlight object edges
const rimLight = new THREE.DirectionalLight(0xffffcc, 0.5);
rimLight.position.set(-2, 1, -2);
scene.add(rimLight);

// Ground - gray circle for shadow receiving
const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 64),
    new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.8
    })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// White plate under jello
const plateGeometry = new THREE.CylinderGeometry(
    2.5,    // radius (wider than jello base)
    2.5,    // same radius (flat plate)
    0.15,   // thin height
    64      // smooth edges
);

// Create plate texture with radial gradient
const plateCanvas = document.createElement('canvas');
plateCanvas.width = 512;
plateCanvas.height = 512;
const ctx = plateCanvas.getContext('2d');

// Radial gradient from center
const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
gradient.addColorStop(0, '#ffffff');
gradient.addColorStop(0.7, '#f8f8f8');
gradient.addColorStop(1, '#e8e8e8');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 512, 512);

const plateTexture = new THREE.CanvasTexture(plateCanvas);

const plateMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plateTexture,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide
});

const plate = new THREE.Mesh(plateGeometry, plateMaterial);
plate.position.set(0, 0.075, 0);  // Half height to sit on ground
plate.receiveShadow = true;
plate.castShadow = false;
scene.add(plate);

// Add slight rim/edge to plate
const rimGeometry = new THREE.TorusGeometry(
    2.5,    // radius
    0.08,   // tube radius (thickness of rim)
    16,     // radial segments
    64      // tubular segments
);
const rim = new THREE.Mesh(rimGeometry, plateMaterial);
rim.rotation.x = Math.PI / 2;  // Horizontal
rim.position.set(0, 0.15, 0);  // Top of plate
rim.receiveShadow = true;
scene.add(rim);

// Simple cylinder jello cup geometry
const jelloGeometry = new THREE.CylinderGeometry(
    1.1,   // top radius (narrower at top)
    1.5,   // bottom radius (wider at bottom)
    2,     // height
    64,    // radial segments
    32,    // height segments
    false  // not open ended
);

jelloGeometry.computeVertexNormals();

// Custom shader material with height-based wobble
const jelloMaterial = new THREE.ShaderMaterial({
    uniforms: {
        color: { value: new THREE.Color(0xdc1e32) },
        wobbleTilt: { value: new THREE.Vector2(0, 0) },
        wobbleSquash: { value: 0.0 }
    },
    vertexShader: `
        uniform vec2 wobbleTilt;
        uniform float wobbleSquash;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
            vec3 pos = position;

            // Calculate height factor for cylinder
            // Cylinder with height=2: y ranges from -1 to 1
            float heightFactor = (pos.y + 1.0) / 2.0;  // 0 at bottom, 1 at top
            heightFactor = heightFactor * heightFactor;  // Quadratic

            // Apply wobble deformations
            pos.x += wobbleTilt.x * heightFactor * 0.5;
            pos.z += wobbleTilt.y * heightFactor * 0.5;

            float squashScale = 1.0 + wobbleSquash * heightFactor * 0.15;
            pos.x *= squashScale;
            pos.z *= squashScale;

            // Transform normal properly
            vNormal = normalMatrix * normal;
            vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
            vec3 normal = normalize(vNormal);

            // Lighting
            vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
            vec3 lightDir2 = normalize(vec3(-0.5, 0.5, -1.0));

            float diffuse1 = max(dot(normal, lightDir1), 0.0);
            float diffuse2 = max(dot(normal, lightDir2), 0.0) * 0.3;

            // Add height-based color variation
            float worldY = (vPosition.y + 1.0) / 2.0;  // 0 at bottom, 1 at top
            vec3 darkColor = color * 0.85;  // Darker
            vec3 lightColor = color * 1.1;  // Lighter
            vec3 gradientColor = mix(darkColor, lightColor, worldY);

            // Use gradientColor in final calculation
            vec3 ambient = gradientColor * 0.6;
            vec3 diffuseColor = gradientColor * (diffuse1 + diffuse2) * 0.4;
            vec3 finalColor = ambient + diffuseColor;

            // Fresnel - edges more opaque
            vec3 viewDir = normalize(-vPosition);
            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

            // Transparent with good visibility
            float alpha = 0.6 + fresnel * 0.2;  // 60% base opacity

            gl_FragColor = vec4(finalColor, alpha);
        }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,  // CRITICAL for transparent objects
    blending: THREE.NormalBlending  // Proper alpha blending
});

const jelloMesh = new THREE.Mesh(jelloGeometry, jelloMaterial);
jelloMesh.position.set(0, 1.15, 0);  // Adjusted to sit on plate (was 1.0)
jelloMesh.castShadow = true;
jelloMesh.receiveShadow = true;
scene.add(jelloMesh);

// Add tiny bubbles for extra realism
const bubbleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
const bubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3
});

const bubbles = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, 20);

// Store original bubble positions - positioned inside cylinder
const bubblePositions = [];
for (let i = 0; i < 20; i++) {
    bubblePositions.push({
        x: (Math.random() - 0.5) * 2,
        y: Math.random() * 1.5 - 0.5,
        z: (Math.random() - 0.5) * 2,
        scale: 0.5 + Math.random() * 0.5
    });
}

bubbles.position.set(0, 1.15, 0);  // Match jello position
scene.add(bubbles);

// Multiple wobble modes with independent spring systems
const wobbleState = {
    // Tilt wobble (x and z rotation) - slow rocking
    tiltX: { position: 0, velocity: 0, stiffness: 25 },
    tiltZ: { position: 0, velocity: 0, stiffness: 25 },

    // Squash wobble (y scale oscillation) - medium speed
    squash: { position: 0, velocity: 0, stiffness: 45 },

    // Twist wobble (y rotation) - very slow
    twist: { position: 0, velocity: 0, stiffness: 15 }
};

const dampingFactor = 0.97; // Controls decay rate

function updateSpring(spring, deltaTime) {
    // Spring force: velocity += -position * stiffness
    spring.velocity += -spring.position * spring.stiffness * deltaTime;

    // Damping: velocity *= dampingFactor
    spring.velocity *= dampingFactor;

    // Update position: position += velocity * deltaTime
    spring.position += spring.velocity * deltaTime;
}

// Click handler for wobble
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onJelloClick(event) {
    // Convert mouse position to normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(jelloMesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const localPoint = jelloMesh.worldToLocal(point.clone());

        // Add random impulses to all wobble modes
        // Tilt wobble: based on where clicked (stronger impulse)
        wobbleState.tiltX.velocity += (localPoint.z / 1.5) * 5.0;
        wobbleState.tiltZ.velocity += -(localPoint.x / 1.5) * 5.0;

        // Squash wobble: always squash down when clicked (much stronger)
        wobbleState.squash.velocity += -8.0;

        // Twist wobble: random rotation (stronger)
        wobbleState.twist.velocity += (Math.random() - 0.5) * 4.0;
    }
}

window.addEventListener('click', onJelloClick);

// Background removal using Remove.bg API
async function removeBackground(imageFile) {
    // Check if API key is set
    if (REMOVE_BG_API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('Remove.bg API key not set, using fallback method');
        return simpleBackgroundRemoval(imageFile);
    }

    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');

    try {
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': REMOVE_BG_API_KEY
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Background removal failed');
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Remove.bg error:', error);
        // Fallback to simple removal
        return simpleBackgroundRemoval(imageFile);
    }
}

// Fallback: Simple background removal without API
function simpleBackgroundRemoval(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Sample background color from corners
            const bgColor = {
                r: (data[0] + data[(canvas.width - 1) * 4]) / 2,
                g: (data[1] + data[(canvas.width - 1) * 4 + 1]) / 2,
                b: (data[2] + data[(canvas.width - 1) * 4 + 2]) / 2
            };

            // Remove similar colors
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const diff = Math.abs(r - bgColor.r) +
                            Math.abs(g - bgColor.g) +
                            Math.abs(b - bgColor.b);

                if (diff < 80) {  // Threshold for background detection
                    data[i + 3] = 0;  // Make transparent
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };

        img.src = URL.createObjectURL(imageFile);
    });
}

// File upload handler
document.getElementById('imageUpload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        const statusDiv = document.getElementById('upload-status');
        statusDiv.textContent = '✗ Please upload an image file';
        statusDiv.style.color = '#cc0000';
        return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        const statusDiv = document.getElementById('upload-status');
        statusDiv.textContent = '✗ Image too large (max 5MB)';
        statusDiv.style.color = '#cc0000';
        return;
    }

    // Update status
    const statusDiv = document.getElementById('upload-status');
    statusDiv.innerHTML = '<span class="loading-spin">⏳</span> Processing image...';
    statusDiv.style.color = '#dc1e32';

    try {
        // CRITICAL: Properly remove old object and all its children
        if (jellyObject) {
            // Remove from parent
            if (jellyObject.parent) {
                jellyObject.parent.remove(jellyObject);
            }

            // Dispose of all geometries and materials (including children)
            jellyObject.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });

            // Clear reference
            jellyObject = null;
        }

        // Remove background
        const imageUrlNoBg = await removeBackground(file);

        // Load processed image as texture
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(imageUrlNoBg, function(texture) {

            // Improve texture quality (prevent blurriness)
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();  // Maximum quality
            texture.generateMipmaps = false;  // Disable mipmaps for sharper image

            // Calculate size maintaining aspect ratio
            const aspect = texture.image.width / texture.image.height;
            let width, height;

            const maxSize = 1.8;  // Increased from 1.0 to 1.8 for bigger objects

            if (aspect > 1) {
                // Landscape - limit width
                width = maxSize;
                height = maxSize / aspect;
            } else {
                // Portrait - limit height
                height = maxSize;
                width = maxSize * aspect;
            }

            // Create plane geometry for object with more segments for deformation
            const geometry = new THREE.PlaneGeometry(width, height, 32, 32);

            // Create material with physically-based properties for realistic lighting
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                alphaTest: 0.05,

                // Add physical properties for realistic lighting
                roughness: 0.7,
                metalness: 0.1,

                // Better depth handling
                depthWrite: true,
                depthTest: true,

                // Color adjustments for visibility through jello
                emissive: new THREE.Color(0x331111),  // Slight red glow
                emissiveIntensity: 0.2
            });

            // Slightly brighten for better visibility
            material.color.setRGB(1.15, 1.15, 1.15);

            jellyObject = new THREE.Mesh(geometry, material);

            // Store original vertices for deformation
            const originalVertices = [];
            const positions = geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                originalVertices.push({
                    x: positions.getX(i),
                    y: positions.getY(i),
                    z: positions.getZ(i)
                });
            }
            jellyObject.userData.originalVertices = originalVertices;

            // Enable shadows
            jellyObject.castShadow = true;
            jellyObject.receiveShadow = false;

            // Position inside jello
            jellyObject.position.set(
                objectOriginalPos.x,
                objectOriginalPos.y,
                objectOriginalPos.z
            );

            // Set render order for proper transparency
            jellyObject.renderOrder = 1;
            jelloMesh.renderOrder = 2;

            // Add subtle subsurface effect
            const backPlane = jellyObject.clone();
            backPlane.position.z = -0.05;  // Slightly behind
            backPlane.material = material.clone();
            backPlane.material.opacity = 0.3;
            backPlane.material.emissiveIntensity = 0.1;
            jellyObject.add(backPlane);

            // Add improved outline/glow for better visibility through jello
            const outlineGeometry = geometry.clone();
            const outlineScale = 1.08;  // 8% larger
            outlineGeometry.scale(outlineScale, outlineScale, outlineScale);

            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.25,  // More visible
                side: THREE.BackSide,
                depthTest: true,
                blending: THREE.AdditiveBlending  // Glow effect
            });

            const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);

            // Store original vertices for outline too
            const outlineOriginalVertices = [];
            const outlinePositions = outlineGeometry.attributes.position;
            for (let i = 0; i < outlinePositions.count; i++) {
                outlineOriginalVertices.push({
                    x: outlinePositions.getX(i),
                    y: outlinePositions.getY(i),
                    z: outlinePositions.getZ(i)
                });
            }
            outline.userData.originalVertices = outlineOriginalVertices;

            jellyObject.add(outline);

            // Ensure only one object is created - clean up any old plane meshes
            jelloMesh.children = jelloMesh.children.filter(child => {
                // Keep bubbles but remove any old plane meshes
                if (child !== jellyObject && child.type === 'Mesh' && child.geometry && child.geometry.type === 'PlaneGeometry') {
                    child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                    return false;
                }
                return true;
            });

            // Make it child of jello so it inherits base transforms
            jelloMesh.add(jellyObject);

            // Update status
            statusDiv.textContent = '✓ Object added to jello!';
            statusDiv.style.color = '#00aa00';

            console.log('Object successfully added to jello');
        });

    } catch (error) {
        console.error('Upload error:', error);
        statusDiv.textContent = '✗ Upload failed. Try again.';
        statusDiv.style.color = '#cc0000';
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Update status message
const physicsStatus = document.getElementById('physics-status');
if (physicsStatus) {
    physicsStatus.textContent = 'Ready! Click to jiggle.';
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = Math.min(clock.getDelta(), 0.016); // Cap at 60fps

    // Update all spring systems
    updateSpring(wobbleState.tiltX, deltaTime);
    updateSpring(wobbleState.tiltZ, deltaTime);
    updateSpring(wobbleState.squash, deltaTime);
    updateSpring(wobbleState.twist, deltaTime);

    // Update shader uniforms instead of mesh transforms
    jelloMaterial.uniforms.wobbleTilt.value.set(
        wobbleState.tiltX.position,
        wobbleState.tiltZ.position
    );
    jelloMaterial.uniforms.wobbleSquash.value = wobbleState.squash.position;

    // Update bubble positions to match jello deformation
    for (let i = 0; i < bubblePositions.length; i++) {
        const bubble = bubblePositions[i];

        // Calculate height factor for this bubble (same as jello shader)
        const heightFactor = (bubble.y + 1.0) / 2.0;
        const heightFactorSquared = heightFactor * heightFactor;

        // Apply same wobble deformation
        const wobbledX = bubble.x + wobbleState.tiltX.position * heightFactorSquared * 0.5;
        const wobbledZ = bubble.z + wobbleState.tiltZ.position * heightFactorSquared * 0.5;
        const squashScale = 1.0 + wobbleState.squash.position * heightFactorSquared * 0.15;

        // Update instance matrix
        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(
            wobbledX * squashScale,
            bubble.y,
            wobbledZ * squashScale
        );
        matrix.scale(new THREE.Vector3(bubble.scale, bubble.scale, bubble.scale));
        bubbles.setMatrixAt(i, matrix);
    }

    bubbles.instanceMatrix.needsUpdate = true;

    // Update object position to match jello deformation
    if (jellyObject) {
        // Calculate height factor for object's Y position
        // Must match shader calculation: (pos.y + 1.0) / 2.0
        const heightFactor = (objectOriginalPos.y + 1.0) / 2.0;
        const heightFactorSquared = heightFactor * heightFactor;

        // Apply same wobble transformation as vertices
        const wobbledX = objectOriginalPos.x + wobbleState.tiltX.position * heightFactorSquared * 0.5;
        const wobbledZ = objectOriginalPos.z + wobbleState.tiltZ.position * heightFactorSquared * 0.5;
        const squashScale = 1.0 + wobbleState.squash.position * heightFactorSquared * 0.15;

        // Update object position
        jellyObject.position.set(
            wobbledX * squashScale,
            objectOriginalPos.y,
            wobbledZ * squashScale
        );

        // Add slight rotation for more realistic wobble
        jellyObject.rotation.x = wobbleState.tiltZ.position * 0.3;
        jellyObject.rotation.z = -wobbleState.tiltX.position * 0.3;

        // Check if there's active wobble for performance
        const isWobbling = Math.abs(wobbleState.tiltX.position) > 0.01 ||
                           Math.abs(wobbleState.tiltZ.position) > 0.01 ||
                           Math.abs(wobbleState.squash.position) > 0.01;

        // Apply vertex-level deformation for realistic distortion
        if (isWobbling && jellyObject.geometry && jellyObject.userData.originalVertices) {
            const positions = jellyObject.geometry.attributes.position;
            const originals = jellyObject.userData.originalVertices;

            for (let i = 0; i < positions.count; i++) {
                const orig = originals[i];

                // Calculate vertex position in world space
                const worldY = orig.y + objectOriginalPos.y;

                // Height factor matching jello shader
                const heightFactor = (worldY + 1.0) / 2.0;
                const heightFactorSquared = heightFactor * heightFactor;

                // Apply wobble deformation
                let x = orig.x;
                let y = orig.y;
                let z = orig.z;

                // Tilt wobble (horizontal displacement)
                x += wobbleState.tiltX.position * heightFactorSquared * 0.3;
                z += wobbleState.tiltZ.position * heightFactorSquared * 0.3;

                // Squash wobble (scale)
                const squashScale = 1.0 + wobbleState.squash.position * heightFactorSquared * 0.12;
                x *= squashScale;
                z *= squashScale;

                // Add subtle wave distortion for more organic feel
                const time = Date.now() * 0.001;
                const wave = Math.sin(time * 2 + orig.x * 3) * wobbleState.squash.position * 0.02;
                y += wave;

                positions.setXYZ(i, x, y, z);
            }

            positions.needsUpdate = true;
            jellyObject.geometry.computeVertexNormals();  // Recalculate normals for lighting
        }

        // Apply distortion to outline
        const outline = jellyObject.children.find(child =>
            child.material && child.material.side === THREE.BackSide
        );

        if (isWobbling && outline && outline.geometry && outline.userData.originalVertices) {
            const outlinePos = outline.geometry.attributes.position;
            const originals = outline.userData.originalVertices;

            for (let i = 0; i < outlinePos.count; i++) {
                const orig = originals[i];
                const worldY = (orig.y / 1.08) + objectOriginalPos.y;  // Adjusted for 1.08 scale
                const heightFactor = (worldY + 1.0) / 2.0;
                const heightFactorSquared = heightFactor * heightFactor;

                let x = orig.x;
                let y = orig.y;
                let z = orig.z;

                x += wobbleState.tiltX.position * heightFactorSquared * 0.3 * 1.08;
                z += wobbleState.tiltZ.position * heightFactorSquared * 0.3 * 1.08;

                const squashScale = 1.0 + wobbleState.squash.position * heightFactorSquared * 0.12;
                x *= squashScale;
                z *= squashScale;

                outlinePos.setXYZ(i, x, y, z);
            }

            outlinePos.needsUpdate = true;
            outline.geometry.computeVertexNormals();
        }
    }

    // Keep mesh transform at identity (wobble happens in shader)
    jelloMesh.position.set(0, 1.15, 0);  // Match updated position
    jelloMesh.rotation.set(0, 0, 0);
    jelloMesh.scale.set(1, 1, 1);

    controls.update();
    renderer.render(scene, camera);
}

animate();
