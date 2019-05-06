import React from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';

import './index.scss';

const ProgressBar = observer(({progress}) => {
    const progressStyle = {
        width: `${progress * 100}%`
    }

    return (
        <div className="progress-bar">
            <div
                className="progress-bar__inner"
                style={progressStyle}
            >
            </div>
        </div>
    )
});

export default ProgressBar;
