// import queryString from 'query-string';

import {
    observable,
    computed,
    action,
} from 'mobx';

import raytraceApp from '../raytracer';

// import createIsoFogScene from '../scenes/generative-iso-fog-test';
// import createAnisoFogScene from '../scenes/generative-aniso-fog-test';
// import createDynEvalScene from '../scenes/dyn-eval-test-scene';

import dynamicScene from '../dtos/dynamic-scene';

import introSceneSrc from '../scenes/example-scene/index.js.rtr';
import basicSceneSrc from '../scenes/basic-scene/index.js.rtr';

const shaderSampleCount = 1;
const defaultMaxSampleCount = 10;

let instance = null;
class Store {
    @observable _loadingApp = true;
    @observable _renderInProgress = false;
    @observable _editorVisible = false;

    @observable _sceneSrc = introSceneSrc;
    @observable _scene = null;

    @observable _currentFrameCount = 0;
    @observable _currentMaxSampleCount = defaultMaxSampleCount;
    @observable _currentRenderTime = 0;

    _activeRenderInstance = null;

    constructor() {
        //
    }

    // actions

    @action
    async loadScene() {
        this._scene = await dynamicScene(this._sceneSrc);
    }

    @action async regenerateScene() {
        await this.loadScene();
        this.currentMaxSampleCount = defaultMaxSampleCount;
        this.trace();
    }

    @action
    async trace() {
        // this._activeRenderInstance = await raytraceApp({
        //     scene: this._scene,
        //     shaderSampleCount,
        //     maxSampleCount: this._currentMaxSampleCount,
        //     realTime: false,
        //     debug: false
        // });

        this._activeRenderInstance = await raytraceApp({
            scene: this._scene,
            shaderSampleCount: 1, //shaderSampleCount,
            maxSampleCount: this._currentMaxSampleCount,
            realTime: true,
            debug: false
        });

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

    finishLoad() {
        let loader = document.querySelector('.loader');
        loader.remove();

        // loader.style.display = 'none';

        this._loadingApp = false;
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
    get sceneSrc() {
        return this._sceneSrc;
    }

    set sceneSrc(val) {
        this._sceneSrc = val;
    }

    // stats

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
