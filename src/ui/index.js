import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {observer} from 'mobx-react-lite';

import {Header} from './layout';

import RenderStatus from './components/render-status';
import RenderControls from './components/render-controls';
import SceneControls from './components/scene-controls';
import SaveControls from './components/save-controls';

import ProgressBar from './components/progress-bar';

import getStore from '../store';

const UI = observer(() => {
    let store = getStore();

    return (
        <Fragment>
            <Header>
                <RenderStatus/>
                <RenderControls/>
                <SceneControls/>
                <SaveControls/>
            </Header>
            <ProgressBar
                progress={store.renderProgress}
            />
        </Fragment>
    );
});

export default UI;
