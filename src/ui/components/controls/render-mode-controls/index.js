import React from 'react';
import ReactDOM from 'react-dom';

import {observer} from 'mobx-react-lite';

import getStore from '../../../../store';

import './index.scss';

const RenderModeControls = observer(() => {
    const store = getStore();

    const handleChange = (e) => {
        store.renderMode = e.target.value;
    };

    return (
        <div className="header-item render-mode-controls">
            <form>
                <label>render mode:</label>
                <select value={store.renderMode} onChange={handleChange}>
                    <option value="raytrace">raytrace</option>
                    <option value="sdf">sdf only</option>
                </select>
            </form>
        </div>
    );
});

export default RenderModeControls;
