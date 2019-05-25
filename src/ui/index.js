import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import Hotkeys from 'react-hot-keys';

import {observer} from 'mobx-react-lite';

import {Header} from './layout';

import RenderStatus from './components/controls/render-status';
import RenderControls from './components/controls/render-controls';
import RealtimeControls from './components/controls/realtime-controls';

import SceneControls from './components/controls/scene-controls';
import SaveControls from './components/controls/save-controls';
import EditorControls from './components/controls/editor-controls';

import Editor from './components/editor';

import ProgressBar from './components/progress-bar';

import getStore from '../store';

const UI = observer(() => {
    let store = getStore();

    return (
        <Fragment>
            <Hotkeys
                keyName="alt+r,alt+e,alt+g,alt+h"
                onKeyDown={store.handleUiKeyShortcut}
            >
                <Header>
                    <RenderStatus/>
                    <RenderControls/>
                    <RealtimeControls/>
                    <SceneControls/>
                    <SaveControls/>
                    <EditorControls/>
                </Header>
                <Editor/>
                <ProgressBar
                    progress={store.renderProgress}
                />
            </Hotkeys>
        </Fragment>
    );
});

export default UI;
