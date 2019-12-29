import localforage from 'localforage';

class SceneStorage {
    lastEditedKey = '__retrace__last_edit_name';

    constructor() {
        localforage.config({
            name: 'retrace',
            storeName: 'retrace_scene_store',
            description: 'Retrace scene storage'
        });
    }

    async saveScene(name, scene) {
        await localforage.setItem(this.lastEditedKey, name);
        return await localforage.setItem(name, scene);
    }

    async deleteScene(name) {
        return await localforage.removeItem(name);
    }

    async getLastEditedScene() {
        const lastEditedScene = await localforage.getItem(this.lastEditedKey);
        return await this.getScene(lastEditedScene);
    }

    async getScene(name) {
        return await localforage.getItem(name);
    }

    async getAvailableScenes() {
        return (await localforage.keys())
            .filter(key => key.indexOf('__retrace__') == -1);
    }

    async getAllScenes() {
        const sceneNames = await this.getAvailableScenes();
        let scenes = {};

        for(const sceneName of sceneNames) {
            const scene = await this.getScene(sceneName);
            scenes[sceneName] = scene;
        }

        return scenes;
    }
}

export default SceneStorage;
