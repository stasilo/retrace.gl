// import queryString from 'query-string';
import {
    observable,
    computed,
    action,
    reaction
} from 'mobx';

import fps from 'fps';

import raytraceApp from '../raytracer';

import {createCamera} from '../camera';
import {getGlInstances} from '../gl';

import {defined} from '../utils';

// import createIsoFogScene from '../scenes/generative-iso-fog-test';
// import createAnisoFogScene from '../scenes/generative-aniso-fog-test';
// import createDynEvalScene from '../scenes/dyn-eval-test-scene';

import dynamicScene from '../dtos/dynamic-scene';

import introSceneSrc from '../scenes/example-scene/index.js.rtr';
import basicSceneSrc from '../scenes/basic-scene/index.js.rtr';
import volumeTestSceneSrc from '../scenes/volume-test-scene/index.js.rtr';
import anisoVolumeTestSceneSrc from '../scenes/aniso-volume-test-scene/index.js.rtr';

const shaderSampleCount = 1;
const defaultMaxSampleCount = 10;


let instance = null;
class Store {
    @observable _realTimeMode = true;
    @observable _loadingApp = true;
    @observable _renderInProgress = false;

    @observable _editorVisible = false;
    @observable _editorFocused = false;

    // @observable _sceneSrc = anisoVolumeTestSceneSrc;
    // @observable _sceneSrc = volumeTestSceneSrc;
    @observable _sceneSrc = introSceneSrc;

    @observable _scene = null;

    @observable _currentFps = 0;
    @observable _currentFrameCount = 0;
    @observable _currentMaxSampleCount = defaultMaxSampleCount;
    @observable _currentRenderTime = 0;

    _activeRenderInstance = null;
    _camera = null;

    fpsTicker = null;

    constructor() {
        this.fpsTicker = fps({every: 10});

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
        this._scene = await dynamicScene(this._sceneSrc);

        if(this._scene.camera) {
            this._camera = this._scene.camera;
        } else {
            this.setupDefaultCamera();
        }
    }

    @action
    render() {
        this.realTimeMode = false;
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
        await this.loadScene();
        this.currentMaxSampleCount = defaultMaxSampleCount;
        this.realTimeMode = true;
        this.trace();
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
                /camera\({((\n|.)*?)}\)/,
                this._camera.getCurrentSceneSrcDefinition({
                    cameraIndent: noOfSpacesBeforeCamera
                })
            );
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
    handleUiKeyShortcut = (keyName, e, handle) => {
        switch(keyName) {
            case 'alt+r':
                this.render();
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
