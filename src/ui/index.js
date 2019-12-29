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
import ExportSdfControls from './components/controls/export-sdf-controls';
import RenderModeControls from './components/controls/render-mode-controls';
import FileControls from './components/controls/file-controls';

import Editor from './components/editor';
import Error from './components/error';
import ProgressBar from './components/progress-bar';
import CenteredNotice from './components/centered-notice';

import getStore from '../store';

const UI = observer(() => {
    let store = getStore();

    return (
        <Hotkeys
            keyName="alt+r,alt+e,alt+g,alt+h"
            onKeyUp={store.handleUiKeyShortcut}
        >
            <Header>
                <FileControls/>
                <RenderStatus/>
                <RenderModeControls/>
                <RenderControls/>
                <RealtimeControls/>
                <SceneControls/>
                <SaveControls/>
                <ExportSdfControls/>
                <EditorControls/>
            </Header>
            {store.hasLoadingError &&
                <Error message={store.loadingError} />
            }
            <Editor/>
            <ProgressBar
                progress={store.renderProgress}
            />
            {store.sceneCompilationInProgress &&
                <CenteredNotice message="compiling scene shader - this may take a while..."/>
            }
        </Hotkeys>
    );
});

export default UI;
