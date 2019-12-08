import React, { useState }  from 'react';
import Modal from 'react-modal';

import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';

import getStore from '../../../../store';

import './index.scss';

const ExportSdfControls = observer(() => {
    const store = getStore();

    const [modalOpen, setModalOpen] = useState(false);
    const toggleModal = () =>
        setModalOpen(!modalOpen);

    const handleInputChange = (e) => {
        store.sdfExportSettings[e.target.name] = e.target.value;
    };

    const handleBoundsChange = (type, e) => {
        store.sdfExportSettings[type][e.target.name] = e.target.value;
    };

    const handleExportSdf = (e) => {
        e.preventDefault();
        store.exportSdf();
    }

    const progressLabel = (store.sdfExportProgress * 100).toFixed(1);

    return (
        <>
            <div className="header-item export-sdf-controls">
                <button
                    onClick={toggleModal}
                    disabled={!store.sceneHasSdfGeometries}
                >
                    export sdf
                </button>
            </div>

            <Modal
                isOpen={modalOpen}
                contentLabel="Export sdf as mesh"
                shouldCloseOnOverlayClick={true}
                onRequestClose={toggleModal}
                className="modal"
            >
                <form className="modal__inner" onSubmit={handleExportSdf}>
                    <p>
                        export sdf scene content within bounds as an .stl mesh
                    </p>
                    <p>
                        <label>resolution: </label>
                        <input
                            className="modal__input"
                            type="text"
                            name="resolution"
                            value={store.sdfExportSettings.resolution}
                            onChange={handleInputChange}
                        />
                    </p>

                    <p>
                        <label>min bounds: </label>
                        <input
                            className="modal__input modal__input--bounds"
                            type="text"
                            name="x"
                            value={store.sdfExportSettings.minCoords.x}
                            onChange={(e) => handleBoundsChange('minCoords', e)}
                        />
                        <input
                            className="modal__input modal__input--bounds"
                            type="text"
                            name="y"
                            value={store.sdfExportSettings.minCoords.y}
                            onChange={(e) => handleBoundsChange('minCoords', e)}
                        />
                        <input
                            className="modal__input modal__input--bounds"
                            type="text"
                            name="z"
                            value={store.sdfExportSettings.minCoords.z}
                            onChange={(e) => handleBoundsChange('minCoords', e)}
                        />
                    </p>

                    <p>
                        <label>max bounds: </label>
                        <input
                            className="modal__input modal__input--bounds"
                            type="text"
                            name="x"
                            value={store.sdfExportSettings.maxCoords.x}
                            onChange={(e) => handleBoundsChange('maxCoords', e)}
                        />
                        <input
                            className="modal__input modal__input--bounds"
                            type="text"
                            name="y"
                            value={store.sdfExportSettings.maxCoords.y}
                            onChange={(e) => handleBoundsChange('maxCoords', e)}
                        />
                        <input
                            className="modal__input modal__input--bounds"
                            type="text"
                            name="z"
                            value={store.sdfExportSettings.maxCoords.z}
                            onChange={(e) => handleBoundsChange('maxCoords', e)}
                        />
                    </p>
                    <button onClick={handleExportSdf}>save as .stl</button>
                        {store.sdfExportProgress !== -1 && (
                            <p>
                                exporting: {progressLabel}%
                            </p>
                        )}
                </form>
            </Modal>
        </>
    );
});

export default ExportSdfControls;
