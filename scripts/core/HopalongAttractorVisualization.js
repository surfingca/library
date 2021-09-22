import global from '/library/scripts/core/global.js';
import { createLoadingLock, fullDispose } from '/library/scripts/core/utils.module.js';
import * as THREE from '/library/scripts/three/build/three.module.js';

export default class HopalongAttractorVisualization {
    constructor(params) {
        if(params == null) {
            params = {};
        }
        this._sprite = (params['Sprite'])
            ? params['Sprite']
            : '/library/defaults/default.png';
        this._spriteSize = (params['Sprite Size']) ? params['Sprite Size'] : 1;
        this._scale = (params['Scale']) ? params['Scale'] : 300;
        this._levels = (params['Levels']) ? params['Levels'] : 5;
        this._levelDepth = (params['Level Depth']) ? params['Level Depth'] : 120;
        this._subsets = (params['Subsets']) ? params['Subsets'] : 4;
        this._pointsPerSubset = (params['Points Per Subset'])
            ? params['Points Per Subset']
            : 20000;

        this._pivotPoint = new THREE.Object3D();
        this._timeSinceUpdate = 0;
        this._speedFor1BPM = this._levelDepth / 60;
        this._speed = this._speedFor1BPM;
        this._hueValues = [];
        this._orbit = {
            subsets: [],
            xMin: 0,
            xMax: 0,
            yMin: 0,
            yMax: 0,
            scaleX: 0,
            scaleY: 0
        }
        this._algorithmParams = {
            a: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            A_MIN: -30,
            A_MAX: 30,
            B_MIN: .2,
            B_MAX: 1.8,
            C_MIN: 5,
            C_MAX: 17,
            D_MIN: 0,
            D_MAX: 10,
            E_MIN: 0,
            E_MAX: 12,
        };
        this._audioAnalysis;
        this._currentBarIndex = 0;

        this._pivotPoint.translateZ((this._levels - 1) * this._levelDepth / 2);

        this._createMeshes();
        if("musicVisualizerController" in global) {
            global.musicVisualizerController.registerVisualization(this, "Hopalong Attractor");
        }
    }

    _createMeshes() {
        let lock = createLoadingLock();
        new THREE.TextureLoader().load(
            this._sprite,
            (texture) => {
                this._createMeshes2(lock, texture);
            }
        );
    }
    
    _createMeshes2(lock, texture) {
        for (let i = 0; i < this._subsets; i++) {
            let subsetPoints = (new Float32Array(3 * this._pointsPerSubset)).fill(0);
            this._orbit.subsets.push(subsetPoints);
        }
        this._generateOrbit();
        for (let s = 0; s < this._subsets; s++) {
            this._hueValues[s] = Math.random();
        }

        for (var k = 0; k < this._levels; k++) {
            for (var s = 0; s < this._subsets; s++) {
                let geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(this._orbit.subsets[s], 3));
                geometry.attributes.position.array = this._orbit.subsets[s];
                let material = new THREE.PointsMaterial({
                    map: texture,
                    size: this._spriteSize,
                    blending: THREE.AdditiveBlending,
                    depthTest: false,
                    transparent: true,
                });
                //material.color.setHSV(this._hueValues[s], 0.8, 1);
                material.color.setHSL(this._hueValues[s], 1, 0.6);
                let mesh = new THREE.Points( geometry, material );
                mesh.myMaterial = material;
                mesh.myLevel = k;
                mesh.mySubset = s;
                mesh.position.x = 0;
                mesh.position.y = 0;
                mesh.position.z = -this._levelDepth * k - (s  * this._levelDepth / this._subsets) + this._scale / 2;
                mesh.needsUpdate = true;
                this._pivotPoint.add(mesh);
            }
        }

        global.loadingAssets.delete(lock);
    }

    addToScene(scene, fromController) {
        if(fromController) {
            scene.add(this._pivotPoint);
        }
    }

    removeFromScene() {
        this._pivotPoint.parent.remove(this._pivotPoint);
        fullDispose(this._pivotPoint);
    }

    /////////////////////////////////////////////////////////////
    // Hopalong Orbit Functions                                //
    // Code from: https://iacopoapps.appspot.com/hopalongwebgl //
    /////////////////////////////////////////////////////////////

    _updateOrbit() {
        this._generateOrbit();
        for (let s = 0; s < this._subsets; s++){
            this._hueValues[s] = Math.random();
        }
        for(let i = 0; i < this._pivotPoint.children.length; i++ ) {
            this._pivotPoint.children[i].needsUpdate = true;
        }

    }

    _generateOrbit(){
        let x, y, z, x1;
        let idx = 0;

        this._prepareOrbit();

        // Using local vars should be faster
        let a = this._algorithmParams['a'];
        let b = this._algorithmParams['b'];
        let c = this._algorithmParams['c'];
        let d = this._algorithmParams['d'];
        let e = this._algorithmParams['e'];
        let subsets = this._orbit.subsets;
        let num_points_subset = this._pointsPerSubset;
        let num_points = this._subsets * this._pointsPerSubset;
        let scale_factor = this._scale;

        let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
        let choice;
        choice = Math.random();

        for (let s = 0; s < this._subsets; s++){
            // Use a different starting point for each orbit subset
            x = s * .005 * (0.5-Math.random());
            y = s * .005 * (0.5-Math.random());

            let curSubset = subsets[s];

            for (let i = 0; i < num_points_subset * 3; i += 3){

                // Iteration formula (generalization of the Barry Martin's original one)
                if (choice < 0.5){
                    z = (d + (Math.sqrt(Math.abs(b * x - c))));
                }
                else if (choice < 0.75){
                z = (d + Math.sqrt(Math.sqrt(Math.abs(b * x - c))));

                }
                else {
                    z = (d + Math.log(2+Math.sqrt(Math.abs(b * x - c))));
                }

                if (x > 0) {x1 = y - z;}
                else if (x == 0) {x1 = y;}
                else {x1 = y + z;}
                y = a - x;
                x = x1 + e;

                curSubset[i] = x;
                curSubset[i+1] = y;

                if (x < xMin) {xMin = x;}
                else if (x > xMax) {xMax = x;}
                if (y < yMin) {yMin = y;}
                else if (y > yMax) {yMax = y;}

                idx++;
            }
        }
        let scaleX = 2 * scale_factor / (xMax - xMin);
        let scaleY = 2 * scale_factor / (yMax - yMin);

        this._orbit.xMin = xMin;
        this._orbit.xMax = xMax;
        this._orbit.yMin = yMin;
        this._orbit.yMax = yMax;
        this._orbit.scaleX = scaleX;
        this._orbit.scaleY = scaleY;

        // Normalize and update vertex data
        for (let s = 0; s < this._subsets; s++){
            let curSubset = subsets[s];
            for (let i = 0; i < num_points_subset; i++){
                curSubset[i*3] = scaleX * (curSubset[i*3] - xMin) - scale_factor;
                curSubset[i*3+1] = scaleY * (curSubset[i*3+1] - yMin) - scale_factor;
            }
        }
    }

    _prepareOrbit(){
        this._shuffleParams();
        this._orbit.xMin = 0;
        this._orbit.xMax = 0;
        this._orbit.yMin = 0;
        this._orbit.yMax = 0;
    }

    _shuffleParams() {
        this._algorithmParams['a'] = this._algorithmParams['A_MIN'] + Math.random() * (this._algorithmParams['A_MAX'] - this._algorithmParams['A_MIN']);
        this._algorithmParams['b'] = this._algorithmParams['B_MIN'] + Math.random() * (this._algorithmParams['B_MAX'] - this._algorithmParams['B_MIN']);
        this._algorithmParams['c'] = this._algorithmParams['C_MIN'] + Math.random() * (this._algorithmParams['C_MAX'] - this._algorithmParams['C_MIN']);
        this._algorithmParams['d'] = this._algorithmParams['D_MIN'] + Math.random() * (this._algorithmParams['D_MAX'] - this._algorithmParams['D_MIN']);
        this._algorithmParams['e'] = this._algorithmParams['E_MIN'] + Math.random() * (this._algorithmParams['E_MAX'] - this._algorithmParams['E_MIN']);
    }

    _updateFromAudioAnalysis() {
        if(this._audioAnalysis != global.musicVisualizerController.audioAnalysis) {
            this._audioAnalysis = global.musicVisualizerController.audioAnalysis;
            this._currentBarIndex = 0;
            this._speed = this._speedFor1BPM;
        }
        if(this._audioAnalysis != null) {
            let audioPosition = global.musicVisualizerController.getAudioPosition();
            let response = this._audioAnalysis.getTimeToNextBar(audioPosition, this._currentBarIndex);
            if(response != null) {
                let timeToNextBar = response.timeToNextBar;
                this._currentBarIndex = response.index;
                let distance = -this._pivotPoint.children[0].position.z % this._levelDepth;
                this._speed = distance / timeToNextBar;
            }
        }
    }

    update(timeDelta) {
        this._timeSinceUpdate += timeDelta;
        if(this._timeSinceUpdate > 3) {
            this._updateOrbit();
            this._timeSinceUpdate = 0;
        }
        for(let i = 0; i < this._pivotPoint.children.length; i++ ) {
            let child = this._pivotPoint.children[i];
            child.position.z += this._speed * timeDelta;
            if (child.position.z > 0){
                child.position.z -= (this._levels -1) * this._levelDepth;
                if (child.needsUpdate) {
                    child.geometry.attributes.position.needsUpdate = true;
                    //child.myMaterial.color.setHSV( this._hueValues[child.mySubset], 0.8, 1);
                    child.myMaterial.color.setHSL(this._hueValues[child.mySubset], 1, 0.6);
                    child.needsUpdate = false;
                }
            }
        }
        this._updateFromAudioAnalysis();
    }

    canUpdate() {
        return false;//Well, actually this can be updated, but we won't have it updated by the main class
    }

    static isDeviceTypeSupported(deviceType) {
        return true;
    }

    static getScriptType() {
        return 'ASSET';
    }

    static getFields() {
        return [
            {
                "name": "Sprite",
                "type": "image",
                "default": "/library/defaults/default.png"
            },
            {
                "name": "Sprite Size",
                "type": "integer",
                "default": 1
            },
            {
                "name": "Scale",
                "type": "float",
                "default": 300
            },
            {
                "name": "Levels",
                "type": "integer",
                "default": 5
            },
            {
                "name": "Level Depth",
                "type": "integer",
                "default": 120
            },
            {
                "name": "Subsets",
                "type": "integer",
                "default": 4
            },
            {
                "name": "Points Per Subset",
                "type": "integer",
                "default": 20000
            },
        ];
    }
}
