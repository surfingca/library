import * as THREE from '../three/build/three.module.js';
import { GLTFLoader } from '../three/examples/jsm/loaders/GLTFLoader.js';

export default class GLTFAsset {
    constructor(params) {
        this._gltfScene;
        this._pivotPoint = new THREE.Object3D();
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
}
