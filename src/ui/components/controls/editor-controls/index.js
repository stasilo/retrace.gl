import React from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';
import saveCanvas from "save-canvas-to-image";

import getStore from '../../../../store';

import './index.scss';

const EditorControls = observer(() => {
    const store = getStore();

    return (
        <div className="header-item edit-controls">
            <button
                onClick={() => store.editorVisible = !store.editorVisible}
            >
                {store.editorVisible
                    ? '(h)ide editor'
                    : 'show editor'
                }
            </button>
        </div>
    )
});

export default EditorControls;
