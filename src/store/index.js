import queryString from 'query-string';
import {
    observable,
    computed,
    action,
    reaction
} from 'mobx';

import fps from 'fps';

import raytraceApp from '../raytracer';
import dynamicScene from '../dtos/dynamic-scene';

import {createCamera} from '../camera';
import {resetCanvas} from '../gl';

import {
    defined,
    definedNotNull,
} from '../utils';

const shaderSampleCount = 1;
const defaultMaxSampleCount = 10;

// const defaultSceneUrl = 'assets/scenes/basic-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/example-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/example-volume-fbm-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/normal-map-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/volume-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/aniso-volume-test-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/volume-3d-texture-tileable-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/example-model-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/model-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/material-test-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-displacement-map-scene/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-test-scene-1/index.js.rtr';
const defaultSceneUrl = 'assets/scenes/sdf-test-scene-2/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-test-scene-3/index.js.rtr';

// const defaultSceneUrl = 'assets/scenes/sdf-geometries-test-scene/index.js.rtr';
// const defaultSceneUrl = 'assets/scenes/sdf-displacement-func-test-scene/index.js.rtr';

let instance = null;
class Store {
    appArgs = null;

    @observable _realTimeMode = false;  //true;
    @observable _loadingApp = true;
    @observable _hasLoadingError = false;
    @observable _loadingError = null;
    @observable _renderInProgress = false;

    @observable _editorVisible = true;
    @observable _editorFocused = false;

    @observable _sceneSrc = '';

    @observable _hasSceneEvalError = false;
    @observable _sceneSrcEvalError = [];

    @observable _scene = null;

    @observable _currentFps = 0;
    @observable _currentFrameCount = 0;
    @observable _currentMaxSampleCount = defaultMaxSampleCount;
    @observable _currentRenderTime = 0;

    _activeRenderInstance = null;
    _camera = null;

    fpsTicker = null;
    currentrendererSettings = null;

    constructor() {
        this.appArgs = queryString.parse(window.location.search);

        this.fpsTicker = fps({every: 5});
        this.fpsTicker.on('data', (frameRate) => {
            this._currentFps = frameRate.toFixed(3);
        });
    }

    setupDefaultCamera() {
        this._camera = createCamera({
            lookFrom: [3.1, 1.4, 1.9],
            lookAt: [-0.25, 0.75, -1.5],
            vUp: [0, 1, 0],
            vfov: 45,
            aperture: 0.001,
        });
    }

    // actions

    @action
    async loadScene() {
        const sceneUrl = definedNotNull(this.appArgs.scene)
            ? this.appArgs.scene
            : defaultSceneUrl;

        try {
            let resp = await fetch(sceneUrl, {cache: 'no-store'});

            if(!resp.ok) {
                throw `Could not fetch scene: ${resp.status}`;
            }

            this._sceneSrc = await resp.text();

        } catch(e) {
            this.loadingError = defined(e.message)
                ? e.message
                : e;
            this.hasLoadingError = true;
        }
    }

    @action
    async compileScene() {
        try {
            this._scene = await dynamicScene(this._sceneSrc);

            this.currentrendererSettings = this._scene.rendererSettings;

            resetCanvas();

            this.hasSceneEvalError = false;
            this.sceneSrcEvalError = null;

            if(this._scene.camera) {
                this._camera = createCamera(this._scene.camera);
            } else {
                this.setupDefaultCamera();
            }
        } catch(evalError) {
            const errorStr = evalError.toString();
            const errorLocation = /\((.*):(.*)\)/
                .exec(errorStr.split('\n')[0]);

            if(errorLocation) {
                const row = errorLocation[1];
                const column = errorLocation[2];

                this.sceneSrcEvalError = {
                    row: parseInt(row) - 2,
                    column: parseInt(column) - 2,
                    text: errorStr,
                    type: "error"
                };

            } else {
                this.sceneSrcEvalError = {
                    row: -1,
                    column: -1,
                    text: errorStr,
                    type: "error"
                };
            }

            this.hasSceneEvalError = true;
            this.editorVisible = true;
        }
    }

    @action
    render() {
        this.realTimeMode = false;
        this.trace();
    }

    @action
    realTime() {
        this.realTimeMode = true;
        this.trace();
    }

    @action
    async trace() {
        if(this._activeRenderInstance) {
            this.cancelTrace();
        }

        this._activeRenderInstance = await raytraceApp({
            scene: this._scene,
            camera: this._camera,
            shaderSampleCount: this.realTimeMode
                ? 1
                : shaderSampleCount,
            maxSampleCount: this._currentMaxSampleCount,
            realTime: this.realTimeMode,
            debug: false
        });

    }

    @action
    async regenerateScene() {
        await this.compileScene();
        this.currentMaxSampleCount = defaultMaxSampleCount;
        // this.realTimeMode = true;
        this.trace();
    }

    @action
    cancelTrace() {
        if(this._activeRenderInstance) {
            this._activeRenderInstance.cancel();
            delete this._activeRenderInstance;
            this.renderInProgress = false;
        }
    }

    @action
    updateSceneSrc() {
        if(this.editorFocused) {
            return;
        }

        const indentMatches = /(.*)(camera:)/
            .exec(this.sceneSrc);
        const noOfSpacesBeforeCamera = indentMatches[1].length;

        this.sceneSrc = this.sceneSrc
            .replace(
                /camera:\s*{((\n|.)*?\s+)}/,
                this._camera.getCurrentSceneSrcDefinition({
                    cameraIndent: noOfSpacesBeforeCamera
                })
            );
    }

    @action
    handleUiKeyShortcut = (keyName, e, handle) => {
        switch(keyName) {
            case 'alt+r':
                this.render();
                break;

            case 'alt+e':
                this.realTimeMode = true;
                this.trace();
                break;

            case 'alt+g':
                this.regenerateScene();
                break;

            case 'alt+h':
                this.editorVisible = !this.editorVisible;
                break;

            default:
                break;
        }
    }

    // main state

    @computed
    get loadingApp() {
        return this._loadingApp;
    }

    set loadingApp(val) {
        this._loadingApp = val;
    }

    @computed
    get hasLoadingError() {
        return this._hasLoadingError;
    }

    set hasLoadingError(val) {
        this._hasLoadingError = val;
    }

    @computed
    get loadingError() {
        return this._loadingError;
    }

    set loadingError(val) {
        this._loadingError = val;
    }

    @computed
    get realTimeMode() {
        return this._realTimeMode;
    }

    set realTimeMode(val) {
        this._realTimeMode = val;
    }

    @computed
    get renderInProgress() {
        return this._renderInProgress;
    }

    set renderInProgress(val) {
        this._renderInProgress = val;
    }

    @computed
    get editorVisible() {
        return this._editorVisible;
    }

    set editorVisible(val) {
        this._editorVisible = val;
    }

    @computed
    get editorFocused() {
        return this._editorFocused;
    }

    set editorFocused(val) {
        this._editorFocused = val;
    }

    @computed
    get sceneSrc() {
        return this._sceneSrc;
    }

    set sceneSrc(val) {
        this._sceneSrc = val;
    }

    @computed
    get hasSceneEvalError() {
        return this._hasSceneEvalError;
    }

    set hasSceneEvalError(val) {
        this._hasSceneEvalError = val;
    }

    @computed
    get sceneSrcEvalError() {
        return this._sceneSrcEvalError;
    }

    set sceneSrcEvalError(val) {
        this._sceneSrcEvalError = val;
    }

    // stats

    @computed
    get currentFps() {
        return this._currentFps;
    }

    @computed
    get currentFrameCount() {
        return this._currentFrameCount;
    }

    set currentFrameCount(val) {
        this._currentFrameCount = val;
    }

    @computed
    get currentMaxSampleCount() {
        return this._currentMaxSampleCount;
    }

    set currentMaxSampleCount(val) {
        this._currentMaxSampleCount = val;
    }

    @computed
    get currentRenderTime() {
        return (this._currentRenderTime*0.001).toFixed(2);
    }

    set currentRenderTime(val) {
        this._currentRenderTime = val;
    }

    @computed
    get renderTimeRemaining() {
        const remainSecs = (this.currentMaxSampleCount / this._currentFrameCount)
            * this.currentRenderTime;
        return (remainSecs).toFixed(0);
    }

    @computed
    get renderProgress() {
        return this._currentFrameCount / this._currentMaxSampleCount;
    }
}

export default () => {
    if(!instance) {
        instance = new Store();
    }

    return instance;
}
