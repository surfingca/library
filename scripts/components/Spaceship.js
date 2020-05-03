import global from '../core/global.js';
import * as THREE from '../three/build/three.module.js';
import { GLTFLoader } from '../three/examples/jsm/loaders/GLTFLoader.js';

export default class Spaceship {
    constructor(params) {
        this._gltfScene;
        this._pivotPoint = new THREE.Object3D();
        this._speed = (params['Speed']) ? params['Speed'] : 1;
        this._scale = (params['Scale']) ? params['Scale'] : 1;
        this._position = (params['Position']) ? params['Position'] : [0,0,0];
        this._rotation = (params['Rotation']) ? params['Rotation'] : [0,0,0];

        this._pivotPoint.scale.set(this._scale, this._scale, this._scale);
        this._pivotPoint.position.fromArray(this._position);
        this._pivotPoint.rotation.fromArray(this._rotation);

        this._createMesh(params['Filename']);
    }

    _createMesh(filename) {
        let gltfLoader = new GLTFLoader();
        gltfLoader.load(filename, (gltf) => {
            this._pivotPoint.add(gltf.scene);
        });
    }

    addToScene(parent) {
        parent.add(this._pivotPoint);
    }

    update(timeDelta) {
        if(global.sessionActive) {
            if(global.deviceType == "XR") {
                let controller = global.inputHandler.getXRController("RIGHT", "targetRay");
                this._pivotPoint.rotation.copy(controller.rotation);
            }
            let inputSource = global.inputHandler.getXRInputSource("RIGHT");
            if((inputSource != null && inputSource.gamepad.buttons[0].pressed)
                || global.inputHandler.isScreenTouched()
                || global.inputHandler.isKeyPressed("KeyW"))
            {
                this._pivotPoint.translateZ(-this._speed * timeDelta);
            }
            if(global.inputHandler.isKeyPressed("KeyS")) {
                this._pivotPoint.translateZ(this._speed * timeDelta);
            }
            if(global.inputHandler.isKeyPressed("KeyD")) {
                this._pivotPoint.translateX(this._speed * timeDelta);
            }
            if(global.inputHandler.isKeyPressed("KeyA")) {
                this._pivotPoint.translateX(-this._speed * timeDelta);
            }
        }
    }
}
