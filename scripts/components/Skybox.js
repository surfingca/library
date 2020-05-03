import { CubeTextureLoader } from '../three/build/three.module.js';

export default class Skybox {
    constructor(params) {
        this._path = params['Path'];
        this._extension = params['File Extension'];
    }

    addToScene(scene) {
        new CubeTextureLoader()
            .setPath(this._path)
            .load([
                "right" + this._extension,
                "left" + this._extension,
                "top" + this._extension,
                "bottom" + this._extension,
                "front" + this._extension,
                "back" + this._extension,
            ], function(texture) {
                scene.background = texture;
            });
    }
}
