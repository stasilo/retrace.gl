import React from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';

import getStore from '../../../store';

import './index.scss';

const RenderStatus = observer(() => {
    const store = getStore();

    return (
        <div className="header-item scene-controls">
            <button
                onClick={async () => store.regenerateScene()}
            >
                regenerate scene
            </button>
        </div>
    )
});

export default RenderStatus;
