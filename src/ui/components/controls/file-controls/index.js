import React, {
    useState,
    useEffect,
    useRef
} from 'react';

import Modal from 'react-modal';

import fileSaver from 'filesaver.js';

import {observer} from 'mobx-react-lite';
import saveCanvas from "save-canvas-to-image";

import getStore from '../../../../store';

import './index.scss';

const FileControls = observer(() => {
    const store = getStore();

    const sceneUrlRef = useRef(null);
    const [sceneUrl, setSceneUrl] = useState('');
    const handleSceneUrlInputChange = (e) =>
        setSceneUrl(e.target.value);

    const sceneNameRef = useRef(null);
    const [sceneName, setSceneName] = useState(store.currentSceneName || '');
    const handleSceneNameInputChange = (e) =>
        setSceneName(e.target.value);

    const [scenes, setAvailableScenes] = useState([]);

    const [openModalOpen, setOpenModalOpen] = useState(false);
    const toggleOpenModal = () =>
        setOpenModalOpen(!openModalOpen);

    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const toggleSaveModal = () =>
        setSaveModalOpen(!saveModalOpen);

    useEffect(() => {
        (async () => {
            const scenes = await store.sceneStorage.getAvailableScenes();
            setAvailableScenes(scenes);
        })();
    });

    const handleSceneSaveAs = async (e) => {
        e.preventDefault();

        const existingScene = await store.sceneStorage.getScene(sceneName);

        if(existingScene) {
            if(confirm(`scene '${sceneName}' already exists - overwrite it?`)) {
                await store.sceneStorage.deleteScene(store.sceneName);
                store.saveCurrentScene(sceneName);
                toggleSaveModal();
            }
        } else {
            store.saveCurrentScene(sceneName);
            toggleSaveModal();
        }

    };

    const handleOpenSceneFromUrl = async (e) => {
        e.preventDefault();

        if(store.sceneName
            && confirm(`save scene '${store.sceneName}' before opening new scene?`))
        {
            await store.sceneStorage.deleteScene(store.sceneName);
            await store.saveCurrentScene(store.sceneName);
        }

        if(!store.sceneName
            && confirm(`current scene hasn't been saved - discard changes and load scene from url?`))
        {
            await store.loadSceneFromUrl(sceneUrl);
            await store.compileScene();

            store.trace();
        }

        toggleOpenModal();
    };

    const handleDropdownMenuClick = async (action, ...args) => {
        switch(action) {
            case 'new': {
                if(confirm('Create new scene?\nUnsaved changes will be lost')) {
                    await store.newScene();
                    store.trace();
                }
                break;
            }

            case 'save': {
                if(store.sceneName) {
                    await store.sceneStorage.deleteScene(store.sceneName);
                    store.saveCurrentScene(store.sceneName);
                    break;
                }

                action = 'saveas';
            }

            case 'saveas': {
                toggleSaveModal();
                break;
            }

            case 'open': {
                const sceneName = args[0];

                if(store.sceneName
                    && confirm(`save scene '${store.sceneName}' before opening new scene?`))
                {
                    await store.saveCurrentScene(store.sceneName);
                }

                if(!store.sceneName
                    && confirm(`current scene hasn't been saved - discard changes and open '${sceneName}'?`))
                {
                    await store.loadScene(sceneName);
                    await store.compileScene();

                    store.trace();
                } else {

                }

                break;
            }

            case 'openurl': {
                toggleOpenModal();
                break;
            }

            case 'delete': {
                if(confirm('delete scene?')) {
                    await store.deleteCurrentScene();
                    await store.newScene();

                    store.trace();
                }

                break;
            }

            case 'export': {
                const blob = new Blob([store.sceneSrc], {
                    type: 'text/plain;charset=utf-8'
                });

                const sceneName = store.sceneName
                    ? `${store.sceneName}.rtr.js`
                    : 'retrace-scene.rtr.js';

                fileSaver.saveAs(blob, sceneName);
                break;
            }

            default:
                break;
        }
    }

    return (
        <div className="file-controls">
            <div className="dropdown">
                <button>file</button>
                <div className="dropdown__content">
                    <button onClick={() => handleDropdownMenuClick('new')}>
                        new scene
                    </button>
                    <button onClick={() => handleDropdownMenuClick('save')}>
                        save
                    </button>
                    <button onClick={() => handleDropdownMenuClick('saveas')}>
                        save as
                    </button>
                    <div className="dropdown dropdown--inner">
                        <button>open</button>
                        <div className="dropdown__content--inner">
                            {scenes.length === 0 &&
                                <span>no saved scenes</span>
                            }
                            {scenes.map((scene, i) => (
                                <button
                                    onClick={() => handleDropdownMenuClick('open', scene)}
                                    key={i}
                                >
                                    {scene}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => handleDropdownMenuClick('openurl')}>
                        open from url
                    </button>
                    <button
                        disabled={!store.sceneName}
                        onClick={() => handleDropdownMenuClick('delete')}
                    >
                        delete scene
                    </button>
                    <button onClick={() => handleDropdownMenuClick('export')}>
                        export as file
                    </button>
                </div>
            </div>

            <Modal
                isOpen={saveModalOpen}
                shouldCloseOnOverlayClick={true}
                onRequestClose={toggleSaveModal}
                onAfterOpen={() => sceneNameRef.current.focus()}
                className="save-modal"
            >
                <form className="save-modal__inner" onSubmit={handleSceneSaveAs}>
                    <label htmlFor="scenename">
                        scene name:
                    </label>
                    <input
                        className="save-modal__input"
                        type="text"
                        name="scenename"
                        onChange={handleSceneNameInputChange}
                        value={sceneName}
                        ref={sceneNameRef}
                    />
                    <button onClick={handleSceneSaveAs}>
                        save
                    </button>
                </form>
            </Modal>

            <Modal
                isOpen={openModalOpen}
                shouldCloseOnOverlayClick={true}
                onRequestClose={toggleOpenModal}
                className="open-modal"
                onAfterOpen={() => sceneUrlRef.current.focus()}
            >
                <form className="open-modal__inner" onSubmit={handleOpenSceneFromUrl}>
                    <label htmlFor="sceneurl">
                        scene url:
                    </label>
                    <input
                        className="open-modal__input"
                        type="text"
                        name="sceneurl"
                        onChange={handleSceneUrlInputChange}
                        value={sceneUrl}
                        ref={sceneUrlRef}
                    />
                    <button onClick={handleOpenSceneFromUrl}>
                        open
                    </button>
                </form>
            </Modal>
        </div>
    );
});

export default FileControls;
